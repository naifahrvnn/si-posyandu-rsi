/* =====================================================================
   02_objects.sql — function, view, stored procedure, trigger
   Jalankan setelah 01_schema.sql. Aman dijalankan ulang (CREATE OR ALTER / DROP IF EXISTS).
   Bagian akhir: pembersihan trigger audit versi lama, karena log aktivitas kini ditulis backend.
   ===================================================================== */
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO
USE posyandu_db;
GO
/* =====================================================================
   OBJEK PENDUKUNG: function, view, stored procedure, trigger (T-SQL)
   ===================================================================== */

/* ---------- Function: umur dalam bulan penuh (setara TIMESTAMPDIFF MONTH) ---------- */
CREATE OR ALTER FUNCTION dbo.fn_hitung_usia_bulan (@tgl_lahir DATE, @tgl_acuan DATE)
RETURNS INT
AS
BEGIN
    RETURN DATEDIFF(MONTH, @tgl_lahir, @tgl_acuan)
         - CASE WHEN DAY(@tgl_acuan) < DAY(@tgl_lahir) THEN 1 ELSE 0 END;
END;
GO

/* ---------- Function: kategori penghasilan dari tabel acuan ---------- */
CREATE OR ALTER FUNCTION dbo.fn_kategori_penghasilan (@penghasilan DECIMAL(12,2))
RETURNS VARCHAR(30)
AS
BEGIN
    DECLARE @label VARCHAR(30);
    SELECT @label = label
    FROM dbo.ref_kategori_penghasilan
    WHERE @penghasilan >= batas_bawah
      AND (batas_atas IS NULL OR @penghasilan < batas_atas);
    RETURN COALESCE(@label, 'Belum tersedia');
END;
GO

/* ---------- View: profil desil & sanitasi per KK ---------- */
CREATE OR ALTER VIEW dbo.v_profil_desil_keluarga
AS
SELECT kk.no_kk,
       kk.dusun, kk.rt, kk.rw, kk.desa,
       kk.status_desil,
       kk.kepemilikan_toilet,
       kk.kondisi_rumah,
       kk.sumber_air_bersih,
       kk.penghasilan_total,
       dbo.fn_kategori_penghasilan(kk.penghasilan_total) AS kategori_penghasilan,
       kepala.nama      AS nama_kepala_keluarga,
       kepala.pekerjaan AS pekerjaan_kepala_keluarga,
       (SELECT COUNT(*) FROM dbo.warga w WHERE w.no_kk = kk.no_kk) AS jumlah_anggota
FROM dbo.kartu_keluarga kk
LEFT JOIN dbo.warga kepala
       ON kepala.no_kk = kk.no_kk AND kepala.hubungan_keluarga = 'Kepala Keluarga';
GO

/* ---------- View Naive User: jadwal kegiatan mendatang ---------- */
CREATE OR ALTER VIEW dbo.v_jadwal_mendatang
AS
SELECT j.jadwal_id,
       j.nama_kegiatan,
       j.jenis_kegiatan,
       j.tanggal_pelaksanaan,
       j.lokasi,
       pt.nama AS petugas_penanggung_jawab,
       j.keterangan
FROM dbo.jadwal_kegiatan j
JOIN dbo.petugas pt ON pt.petugas_id = j.penanggung_jawab
WHERE j.tanggal_pelaksanaan >= CAST(SYSDATETIME() AS DATE);
GO

/* ---------- View Naive User: riwayat layanan keluarga sendiri ----------
   Baris difilter oleh SESSION_CONTEXT('no_kk') yang di-set backend (read-only)
   setelah warga login. Tanpa konteks → hasil kosong. NIK tidak ditampilkan. */
CREATE OR ALTER VIEW dbo.v_riwayat_layanan_keluarga
AS
WITH anggota AS (
    SELECT w.warga_id, w.nama
    FROM dbo.warga w
    WHERE w.no_kk = CAST(SESSION_CONTEXT(N'no_kk') AS CHAR(16))
)
SELECT a.nama AS nama_anggota, 'Balita' AS kelompok, pb.tanggal_periksa AS tanggal,
       'Pemeriksaan tumbuh kembang' AS jenis_riwayat,
       CONCAT('BB ', pb.berat_badan, ' kg; TB/PB ', pb.tinggi_panjang_badan,
              ' cm; TB/U: ', pb.kategori_stunting) AS rincian,
       j.nama_kegiatan
FROM anggota a
JOIN dbo.balita b             ON b.warga_id = a.warga_id
JOIN dbo.pemeriksaan_balita pb ON pb.balita_id = b.warga_id
LEFT JOIN dbo.jadwal_kegiatan j ON j.jadwal_id = pb.jadwal_id
UNION ALL
SELECT a.nama, 'Ibu', pi.tanggal_periksa, 'Pemeriksaan ibu',
       CONCAT('BB ', pi.berat_badan, ' kg; LILA ', pi.lila, ' cm; ', pi.status_kek),
       j.nama_kegiatan
FROM anggota a
JOIN dbo.ibu i              ON i.warga_id = a.warga_id
JOIN dbo.pemeriksaan_ibu pi ON pi.ibu_id = i.warga_id
LEFT JOIN dbo.jadwal_kegiatan j ON j.jadwal_id = pi.jadwal_id
UNION ALL
SELECT a.nama, 'Lansia', pl.tanggal_periksa, 'Pemeriksaan lansia',
       CONCAT('IMT ', pl.imt, '; TD ', pl.tekanan_darah_sistolik, '/', pl.tekanan_darah_diastolik,
              '; gula darah ', pl.gula_darah), j.nama_kegiatan
FROM anggota a
JOIN dbo.lansia ls             ON ls.warga_id = a.warga_id
JOIN dbo.pemeriksaan_lansia pl ON pl.lansia_id = ls.warga_id
LEFT JOIN dbo.jadwal_kegiatan j ON j.jadwal_id = pl.jadwal_id
UNION ALL
SELECT a.nama, CASE WHEN l.balita_id IS NOT NULL THEN 'Balita' ELSE 'Ibu' END,
       l.tanggal_layanan, CONCAT('Layanan: ', l.jenis_layanan),
       COALESCE(l.keterangan, ''), j.nama_kegiatan
FROM anggota a
JOIN dbo.layanan l     ON l.balita_id = a.warga_id OR l.ibu_id = a.warga_id
LEFT JOIN dbo.jadwal_kegiatan j ON j.jadwal_id = l.jadwal_id
UNION ALL
SELECT a.nama, 'Warga', CAST(pk.waktu_hadir AS DATE), CONCAT('Kegiatan: ', j.jenis_kegiatan),
       COALESCE(pk.keterangan, ''), j.nama_kegiatan
FROM anggota a
JOIN dbo.partisipasi_kegiatan pk ON pk.warga_id = a.warga_id
JOIN dbo.jadwal_kegiatan j       ON j.jadwal_id = pk.jadwal_id
WHERE j.jenis_kegiatan = 'Sosialisasi Prokes';   -- kehadiran Posyandu sudah tercermin di pemeriksaan/layanan
GO

/* ---------- SP User Kader: catat pemberian vitamin bayi pada suatu event ---------- */
CREATE OR ALTER PROCEDURE dbo.sp_catat_vitamin_bayi
    @jadwal_id    UNIQUEIDENTIFIER,
    @balita_id    UNIQUEIDENTIFIER,
    @logistik_id  UNIQUEIDENTIFIER,
    @jumlah       INT = 1,
    @dicatat_oleh UNIQUEIDENTIFIER,
    @hasil        VARCHAR(30)      OUTPUT,
    @layanan_id   UNIQUEIDENTIFIER OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @tgl DATE, @tgl_lahir DATE, @warga_id UNIQUEIDENTIFIER;

    SELECT @tgl = tanggal_pelaksanaan FROM dbo.jadwal_kegiatan WHERE jadwal_id = @jadwal_id;
    IF @tgl IS NULL BEGIN SET @hasil = 'JADWAL_TIDAK_ADA'; RETURN; END;

    SELECT @tgl_lahir = w.tanggal_lahir, @warga_id = w.warga_id
    FROM dbo.balita b JOIN dbo.warga w ON w.warga_id = b.warga_id   -- atribut warisan dari superclass
    WHERE b.warga_id = @balita_id;
    IF @tgl_lahir IS NULL BEGIN SET @hasil = 'BALITA_TIDAK_ADA'; RETURN; END;

    /* bayi = 0–11 bulan (BRD Lampiran: Vitamin A kapsul biru) */
    IF dbo.fn_hitung_usia_bulan(@tgl_lahir, @tgl) NOT BETWEEN 0 AND 11
    BEGIN SET @hasil = 'LAYANAN_TIDAK_SESUAI_UMUR'; RETURN; END;

    IF NOT EXISTS (SELECT 1 FROM dbo.master_logistik WHERE logistik_id = @logistik_id AND kategori = 'Vitamin')
    BEGIN SET @hasil = 'LOGISTIK_BUKAN_VITAMIN'; RETURN; END;

    IF EXISTS (SELECT 1 FROM dbo.layanan WHERE balita_id = @balita_id AND jadwal_id = @jadwal_id
                                         AND jenis_layanan = 'Vitamin A')
    BEGIN SET @hasil = 'SUDAH_DIBERIKAN'; RETURN; END;

    BEGIN TRY
        BEGIN TRANSACTION;
            UPDATE dbo.master_logistik WITH (UPDLOCK, ROWLOCK)
               SET stok_tersedia = stok_tersedia - @jumlah, updated_at = SYSDATETIME()
             WHERE logistik_id = @logistik_id AND stok_tersedia >= @jumlah;
            IF @@ROWCOUNT = 0
            BEGIN
                ROLLBACK TRANSACTION; SET @hasil = 'STOK_TIDAK_CUKUP'; RETURN;
            END;

            SET @layanan_id = NEWID();
            INSERT INTO dbo.layanan (layanan_id, balita_id, jadwal_id, logistik_id, jumlah_diberikan,
                                     tanggal_layanan, jenis_layanan, keterangan, dicatat_oleh)
            VALUES (@layanan_id, @balita_id, @jadwal_id, @logistik_id, @jumlah,
                    @tgl, 'Vitamin A', 'Vitamin A bayi (kapsul biru)', @dicatat_oleh);

            IF @warga_id IS NOT NULL AND NOT EXISTS
               (SELECT 1 FROM dbo.partisipasi_kegiatan WHERE jadwal_id = @jadwal_id AND warga_id = @warga_id)
                INSERT INTO dbo.partisipasi_kegiatan (jadwal_id, warga_id, waktu_hadir, dicatat_oleh)
                VALUES (@jadwal_id, @warga_id, CAST(@tgl AS DATETIME2(0)), @dicatat_oleh);
        COMMIT TRANSACTION;
        SET @hasil = 'SUCCESS';
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SET @hasil = 'ERROR_SISTEM';
    END CATCH;
END;
GO

/* ---------- SP Super User: validasi rujukan ke faskes ---------- */
CREATE OR ALTER PROCEDURE dbo.sp_validasi_rujukan
    @rujukan_id   UNIQUEIDENTIFIER,
    @validator_id UNIQUEIDENTIFIER,
    @status_baru  VARCHAR(10),
    @catatan      NVARCHAR(MAX) = NULL,
    @hasil        VARCHAR(30) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    /* @validator_id = petugas_id; petugas harus aktif dan punya akun Super User yang aktif */
    IF NOT EXISTS (SELECT 1 FROM dbo.petugas pt JOIN dbo.pengguna u ON u.petugas_id = pt.petugas_id
                   WHERE pt.petugas_id = @validator_id AND pt.status_aktif = 1
                     AND u.peran = 'Super User' AND u.status_akun = 'Aktif')
    BEGIN SET @hasil = 'BUKAN_SUPER_USER'; RETURN; END;

    UPDATE dbo.rujukan
       SET status_tindak_lanjut = @status_baru,
           catatan_faskes       = COALESCE(@catatan, catatan_faskes),
           divalidasi_oleh      = @validator_id,
           tanggal_validasi     = SYSDATETIME()
     WHERE rujukan_id = @rujukan_id;
    SET @hasil = CASE WHEN @@ROWCOUNT = 1 THEN 'SUCCESS' ELSE 'RUJUKAN_TIDAK_ADA' END;
END;
GO

/* ---------- Trigger: log_aktivitas append-only (BR-07) ---------- */
CREATE OR ALTER TRIGGER dbo.trg_log_aktivitas_no_update_delete
ON dbo.log_aktivitas
INSTEAD OF UPDATE, DELETE
AS
BEGIN
    THROW 50001, N'Log aktivitas tidak dapat diubah atau dihapus', 1;
END;
GO

/* ---------- Trigger audit: layanan  ---------- */
CREATE OR ALTER TRIGGER dbo.trg_audit_layanan_insert
ON dbo.layanan
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.log_aktivitas (jenis_aktivitas, entitas_terkait, id_data_terkait, keterangan, user_id)
    SELECT 'Input', 'layanan', CAST(i.layanan_id AS VARCHAR(36)), N'Input layanan',
           COALESCE(CAST(SESSION_CONTEXT(N'app_user_id') AS UNIQUEIDENTIFIER), u.user_id)
    FROM inserted i
    LEFT JOIN dbo.pengguna u ON u.petugas_id = i.dicatat_oleh;   -- akun milik petugas pencatat
END;
GO

/* ---------- Trigger audit: perubahan indikator desil KK ---------- */
CREATE OR ALTER TRIGGER dbo.trg_audit_kk_update
ON dbo.kartu_keluarga
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF TRIGGER_NESTLEVEL(OBJECT_ID('dbo.trg_audit_kk_update')) > 1 RETURN;
    UPDATE kk SET updated_at = SYSDATETIME()
    FROM dbo.kartu_keluarga kk JOIN inserted i ON i.no_kk = kk.no_kk;

    INSERT INTO dbo.log_aktivitas (jenis_aktivitas, entitas_terkait, id_data_terkait, keterangan, user_id)
    SELECT 'Edit', 'kartu_keluarga', i.no_kk, N'Ubah indikator desil/sanitasi',
           CAST(SESSION_CONTEXT(N'app_user_id') AS UNIQUEIDENTIFIER)   -- wajib di-set backend
    FROM inserted i;
END;
GO

/* ---------- Trigger audit: validasi rujukan ---------- */
CREATE OR ALTER TRIGGER dbo.trg_audit_rujukan_update
ON dbo.rujukan
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.log_aktivitas (jenis_aktivitas, entitas_terkait, id_data_terkait, keterangan, user_id)
    SELECT 'Edit', 'rujukan', CAST(i.rujukan_id AS VARCHAR(36)),
           CONCAT(N'Status rujukan: ', i.status_tindak_lanjut),
           COALESCE(CAST(SESSION_CONTEXT(N'app_user_id') AS UNIQUEIDENTIFIER), u.user_id)
    FROM inserted i
    LEFT JOIN dbo.pengguna u ON u.petugas_id = i.divalidasi_oleh;
END;
GO

/* =====================================================================
   ATURAN SPECIALIZATION (disjoint, partial) — ditegakkan dengan trigger
   ===================================================================== */
/* Disjoint: satu warga hanya boleh menjadi salah satu subclass;
   IBU wajib berjenis kelamin Perempuan */
CREATE OR ALTER TRIGGER dbo.trg_balita_disjoint ON dbo.balita AFTER INSERT, UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i WHERE EXISTS (SELECT 1 FROM dbo.ibu x WHERE x.warga_id = i.warga_id)
                                           OR EXISTS (SELECT 1 FROM dbo.lansia x WHERE x.warga_id = i.warga_id))
        THROW 50010, N'Specialization disjoint: warga sudah terdaftar sebagai subclass lain', 1;
END;
GO
CREATE OR ALTER TRIGGER dbo.trg_ibu_disjoint ON dbo.ibu AFTER INSERT, UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i WHERE EXISTS (SELECT 1 FROM dbo.balita x WHERE x.warga_id = i.warga_id)
                                           OR EXISTS (SELECT 1 FROM dbo.lansia x WHERE x.warga_id = i.warga_id))
        THROW 50010, N'Specialization disjoint: warga sudah terdaftar sebagai subclass lain', 1;
    IF EXISTS (SELECT 1 FROM inserted i JOIN dbo.warga w ON w.warga_id = i.warga_id WHERE w.jenis_kelamin <> 'Perempuan')
        THROW 50011, N'Subclass IBU hanya untuk warga berjenis kelamin Perempuan', 1;
END;
GO
CREATE OR ALTER TRIGGER dbo.trg_lansia_disjoint ON dbo.lansia AFTER INSERT, UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i WHERE EXISTS (SELECT 1 FROM dbo.balita x WHERE x.warga_id = i.warga_id)
                                           OR EXISTS (SELECT 1 FROM dbo.ibu x WHERE x.warga_id = i.warga_id))
        THROW 50010, N'Specialization disjoint: warga sudah terdaftar sebagai subclass lain', 1;
END;
GO

/* Specialization PETUGAS → KADER / TENAGA_KESEHATAN: disjoint */
CREATE OR ALTER TRIGGER dbo.trg_kader_disjoint ON dbo.kader AFTER INSERT, UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN dbo.tenaga_kesehatan t ON t.petugas_id = i.petugas_id)
        THROW 50012, N'Specialization disjoint: petugas sudah terdaftar sebagai tenaga kesehatan', 1;
END;
GO
CREATE OR ALTER TRIGGER dbo.trg_nakes_disjoint ON dbo.tenaga_kesehatan AFTER INSERT, UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted i JOIN dbo.kader k ON k.petugas_id = i.petugas_id)
        THROW 50012, N'Specialization disjoint: petugas sudah terdaftar sebagai kader', 1;
END;
GO

/* Hapus superclass ikut menghapus subclass (aturan EER).
   Dibuat dengan INSTEAD OF DELETE karena SQL Server menolak beberapa jalur
   ON DELETE CASCADE yang bertemu di tabel yang sama (layanan, isian_pendukung).
   Semua tabel yang merujuk warga memakai NO ACTION; penghapusannya diatur di sini. */
CREATE OR ALTER TRIGGER dbo.trg_warga_hapus ON dbo.warga INSTEAD OF DELETE AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM dbo.pengguna             WHERE warga_id IN (SELECT warga_id FROM deleted);  -- akun warga ikut dihapus
    DELETE FROM dbo.partisipasi_kegiatan WHERE warga_id IN (SELECT warga_id FROM deleted);
    DELETE FROM dbo.balita WHERE warga_id IN (SELECT warga_id FROM deleted);
    DELETE FROM dbo.ibu    WHERE warga_id IN (SELECT warga_id FROM deleted);
    DELETE FROM dbo.lansia WHERE warga_id IN (SELECT warga_id FROM deleted);
    DELETE FROM dbo.warga  WHERE warga_id IN (SELECT warga_id FROM deleted);
END;
GO
CREATE OR ALTER TRIGGER dbo.trg_kartu_keluarga_hapus ON dbo.kartu_keluarga INSTEAD OF DELETE AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM dbo.warga          WHERE no_kk IN (SELECT no_kk FROM deleted);
    DELETE FROM dbo.kartu_keluarga WHERE no_kk IN (SELECT no_kk FROM deleted);
END;
GO

/* =====================================================================
   TAMBAHAN APLIKASI WEB: pembersihan trigger audit versi lama
   ===================================================================== */
/* ---------- Audit trail dicatat backend ----------
   Log Input/Edit/Delete/Login/Logout beserta detail perubahan (sebelum → sesudah) ditulis BACKEND
   di transaksi yang sama dengan perubahan datanya (src/core/audit/PencatatAudit.ts), sehingga
   bila log gagal, perubahan ikut batal (FSD-2.5 EF-3).
   Trigger audit versi lama (skrip tambahan aplikasi sebelumnya) dihapus agar log tidak tercatat ganda.
   Trigger milik 02_objects.sql (layanan, kartu_keluarga, validasi rujukan) tetap dipakai. */
DROP TRIGGER IF EXISTS dbo.trg_audit_balita_insert;
DROP TRIGGER IF EXISTS dbo.trg_audit_balita_update;
DROP TRIGGER IF EXISTS dbo.trg_audit_balita_delete;
DROP TRIGGER IF EXISTS dbo.trg_audit_ibu_insert;
DROP TRIGGER IF EXISTS dbo.trg_audit_ibu_update;
DROP TRIGGER IF EXISTS dbo.trg_audit_ibu_delete;
DROP TRIGGER IF EXISTS dbo.trg_audit_lansia_insert;
DROP TRIGGER IF EXISTS dbo.trg_audit_lansia_update;
DROP TRIGGER IF EXISTS dbo.trg_audit_lansia_delete;
DROP TRIGGER IF EXISTS dbo.trg_audit_pemeriksaan_balita_insert;
DROP TRIGGER IF EXISTS dbo.trg_audit_pemeriksaan_ibu_insert;
DROP TRIGGER IF EXISTS dbo.trg_audit_pemeriksaan_lansia_insert;
DROP TRIGGER IF EXISTS dbo.trg_audit_isian_pendukung_insert;
DROP TRIGGER IF EXISTS dbo.trg_audit_isian_pendukung_update;
DROP TRIGGER IF EXISTS dbo.trg_audit_rujukan_insert;
GO

/* =====================================================================
   TAMBAHAN APLIKASI WEB: hitung ulang status berat badan balita (BR-19)
   ===================================================================== */
/* ---------- SP: status N/T/B dihitung ulang dari urutan tanggal_periksa lalu created_at ----------
   B = belum ada penimbangan sebelumnya, N = BB naik, T = BB tidak naik.
   Memperbaiki data lama: penimbangan kedua pada tanggal yang sama, dan pemeriksaan yang diisi mundur.
   Hanya baris yang statusnya berbeda yang diubah, jadi aman dijalankan berulang. */
CREATE OR ALTER PROCEDURE dbo.sp_hitung_ulang_status_bb
AS
BEGIN
    SET NOCOUNT ON;
    WITH urut AS (
        SELECT pemeriksaan_balita_id,
               berat_badan,
               LAG(berat_badan) OVER (PARTITION BY balita_id
                                      ORDER BY tanggal_periksa, created_at, pemeriksaan_balita_id) AS bb_lalu
          FROM dbo.pemeriksaan_balita
    ), hasil AS (
        SELECT pemeriksaan_balita_id,
               CASE WHEN bb_lalu IS NULL THEN 'B'
                    WHEN berat_badan > bb_lalu THEN 'N'
                    ELSE 'T' END AS status_baru
          FROM urut
    )
    UPDATE p
       SET p.status_berat_badan = h.status_baru
      FROM dbo.pemeriksaan_balita p
      JOIN hasil h ON h.pemeriksaan_balita_id = p.pemeriksaan_balita_id
     WHERE p.status_berat_badan <> h.status_baru;

    SELECT @@ROWCOUNT AS jumlah_status_diperbaiki;
END;
GO

EXEC dbo.sp_hitung_ulang_status_bb;
GO
