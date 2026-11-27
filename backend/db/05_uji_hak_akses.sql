/* =====================================================================
   05_uji_hak_akses.sql — OPSIONAL, skrip uji hak akses basis data (laporan SMBD).
   Jalankan setelah 04_seed.sql. Tidak dibutuhkan aplikasi web.
   Bagian A. Skenario Super User (usr_super_user, role_super_user).
   Bagian B. Skenario User Kader (usr_user_kader, role_user_kader).
   Catatan: skenario ini ikut menambah data uji (mis. pemberian vitamin A), jadi jalankan sekali saja.
   ===================================================================== */
/* ===================== Bagian A. Super User ===================== */
SET QUOTED_IDENTIFIER ON;
GO
USE posyandu_db;
GO

EXECUTE AS USER = 'usr_super_user';

EXEC sp_set_session_context
    @key = N'app_user_id',
    @value = 'B9000000-0000-0000-0000-000000000001';

PRINT '--- SU1-Q1: Rekap ibu hamil & bayi berisiko / dirujuk (Nov 2026)';

DECLARE @bulan INT = 11, @tahun INT = 2026;

WITH kasus AS (
    SELECT 'Bayi' AS kelompok, w.nama, kk.no_kk, kk.dusun, pb.tanggal_periksa,
           CONCAT(dbo.fn_hitung_usia_bulan(w.tanggal_lahir, pb.tanggal_periksa), ' bln') AS usia,
           CONCAT('TB/U ', pb.kategori_stunting, '; BB/TB ', pb.kategori_bb_tb,
                  '; status BB ', pb.status_berat_badan) AS indikasi,
           ip.isian_id, COALESCE(ip.status_rujukan, 0) AS status_rujukan,
           pt.nama AS petugas
    FROM dbo.pemeriksaan_balita pb
    JOIN dbo.balita b               ON b.warga_id = pb.balita_id
    JOIN dbo.petugas pt             ON pt.petugas_id = pb.dicatat_oleh
    JOIN dbo.warga w                ON w.warga_id = b.warga_id
    JOIN dbo.kartu_keluarga kk      ON kk.no_kk = w.no_kk
    LEFT JOIN dbo.isian_pendukung ip ON ip.pemeriksaan_balita_id = pb.pemeriksaan_balita_id
    WHERE pb.tanggal_periksa >= DATEFROMPARTS(@tahun, @bulan, 1)
      AND pb.tanggal_periksa < DATEADD(MONTH, 1, DATEFROMPARTS(@tahun, @bulan, 1))
      AND dbo.fn_hitung_usia_bulan(w.tanggal_lahir, pb.tanggal_periksa) < 12
      AND (ip.status_rujukan = 1 OR pb.kategori_stunting IN ('Pendek','Sangat Pendek')
           OR pb.status_berat_badan = 'T')

    UNION ALL

    SELECT 'Ibu Hamil', w.nama, kk.no_kk, kk.dusun, pi.tanggal_periksa,
           CONCAT(pi.usia_kehamilan_minggu, ' mgg'),
           CONCAT('LILA ', pi.lila, ' cm (', pi.status_kek, '); TD ', pi.tekanan_darah_sistolik, '/',
                  pi.tekanan_darah_diastolik, COALESCE('; ' + pi.status_anemia, '')),
           ip.isian_id, COALESCE(ip.status_rujukan, 0), pt.nama
    FROM dbo.pemeriksaan_ibu pi
    JOIN dbo.ibu i                  ON i.warga_id = pi.ibu_id
    JOIN dbo.petugas pt             ON pt.petugas_id = pi.dicatat_oleh
    JOIN dbo.warga w                ON w.warga_id = i.warga_id
    JOIN dbo.kartu_keluarga kk      ON kk.no_kk = w.no_kk
    LEFT JOIN dbo.isian_pendukung ip ON ip.pemeriksaan_ibu_id = pi.pemeriksaan_ibu_id
    WHERE pi.tanggal_periksa >= DATEFROMPARTS(@tahun, @bulan, 1)
      AND pi.tanggal_periksa < DATEADD(MONTH, 1, DATEFROMPARTS(@tahun, @bulan, 1))
      AND i.status_ibu = 'Hamil'
      AND (ip.status_rujukan = 1 OR pi.status_kek = 'Berisiko KEK' OR pi.status_anemia LIKE 'Anemia%')
)
SELECT k.kelompok, k.nama, k.dusun, k.usia, k.indikasi, k.petugas,
       r.tanggal_rujukan, r.status_tindak_lanjut,
       CASE WHEN k.status_rujukan = 0 THEN 'Berisiko - belum dirujuk'
            WHEN r.rujukan_id IS NULL THEN 'Dirujuk - data rujukan belum dibuat'
            WHEN r.divalidasi_oleh IS NULL THEN 'Menunggu validasi'
            ELSE 'Tervalidasi' END AS status_validasi
FROM kasus k
LEFT JOIN dbo.rujukan r ON r.isian_id = k.isian_id
ORDER BY status_validasi, k.kelompok, k.nama;


PRINT '--- SU1-Q2: Validasi rujukan (SP)';

DECLARE @hasil VARCHAR(30);

EXEC dbo.sp_validasi_rujukan
     @rujukan_id   = '40000000-0000-0000-0000-000000000002',
     @validator_id = 'A0000000-0000-0000-0000-000000000001',
     @status_baru  = 'Proses',
     @catatan      = N'Dijadwalkan pemeriksaan Hb ulang di Puskesmas',
     @hasil        = @hasil OUTPUT;

SELECT @hasil AS hasil_validasi;

SELECT r.rujukan_id, f.nama_faskes, r.status_tindak_lanjut,
       pt.nama AS divalidasi_oleh, r.tanggal_validasi
FROM dbo.rujukan r
JOIN dbo.faskes f ON f.faskes_id = r.faskes_id
LEFT JOIN dbo.petugas pt ON pt.petugas_id = r.divalidasi_oleh
WHERE r.rujukan_id = '40000000-0000-0000-0000-000000000002';


PRINT '--- SU1-Q3: Korelasi desil & kepemilikan jamban terhadap stunting balita (pemeriksaan terakhir)';

WITH terakhir AS (
    SELECT pb.balita_id, pb.kategori_stunting,
           ROW_NUMBER() OVER (PARTITION BY pb.balita_id ORDER BY pb.tanggal_periksa DESC, pb.created_at DESC) AS rn
    FROM dbo.pemeriksaan_balita pb
)
SELECT kk.status_desil,
       CASE kk.kepemilikan_toilet WHEN 1 THEN 'Ada jamban' WHEN 0 THEN 'Tidak ada jamban'
            ELSE 'Belum didata' END AS jamban,
       COUNT(*) AS jumlah_balita,
       SUM(CASE WHEN t.kategori_stunting IN ('Pendek','Sangat Pendek') THEN 1 ELSE 0 END) AS jumlah_stunting,
       CAST(100.0 * SUM(CASE WHEN t.kategori_stunting IN ('Pendek','Sangat Pendek') THEN 1 ELSE 0 END)
            / COUNT(*) AS DECIMAL(5,1)) AS persen_stunting
FROM terakhir t
JOIN dbo.balita b          ON b.warga_id = t.balita_id
JOIN dbo.warga w           ON w.warga_id = b.warga_id
JOIN dbo.kartu_keluarga kk ON kk.no_kk = w.no_kk
WHERE t.rn = 1
GROUP BY kk.status_desil, kk.kepemilikan_toilet
ORDER BY kk.status_desil;


PRINT '--- SU1-Q4: Pekerjaan kepala keluarga & kategori penghasilan vs kondisi bumil/balita';

WITH status_terakhir AS (
    SELECT w.no_kk, 'Balita' AS kelompok,
           CASE WHEN x.kategori_stunting IN ('Pendek','Sangat Pendek') THEN 1 ELSE 0 END AS berisiko
    FROM (
        SELECT pb.*,
               ROW_NUMBER() OVER (PARTITION BY pb.balita_id
                   ORDER BY pb.tanggal_periksa DESC, pb.created_at DESC) rn
        FROM dbo.pemeriksaan_balita pb
    ) x
    JOIN dbo.balita b ON b.warga_id = x.balita_id
    JOIN dbo.warga w  ON w.warga_id = b.warga_id
    WHERE x.rn = 1

    UNION ALL

    SELECT w.no_kk, 'Ibu Hamil',
           CASE WHEN x.status_kek = 'Berisiko KEK' THEN 1 ELSE 0 END
    FROM (
        SELECT pi.*,
               ROW_NUMBER() OVER (PARTITION BY pi.ibu_id
                   ORDER BY pi.tanggal_periksa DESC, pi.created_at DESC) rn
        FROM dbo.pemeriksaan_ibu pi
    ) x
    JOIN dbo.ibu i   ON i.warga_id = x.ibu_id AND i.status_ibu = 'Hamil'
    JOIN dbo.warga w ON w.warga_id = i.warga_id
    WHERE x.rn = 1
)
SELECT v.kategori_penghasilan, v.pekerjaan_kepala_keluarga,
       COUNT(*) AS jumlah_sasaran,
       SUM(s.berisiko) AS jumlah_berisiko,
       CAST(100.0 * SUM(s.berisiko) / COUNT(*) AS DECIMAL(5,1)) AS persen_berisiko
FROM status_terakhir s
JOIN dbo.v_profil_desil_keluarga v ON v.no_kk = s.no_kk
GROUP BY v.kategori_penghasilan, v.pekerjaan_kepala_keluarga
ORDER BY persen_berisiko DESC, jumlah_sasaran DESC;


PRINT '--- SU1-Q5: Audit kelengkapan & konsistensi data desil KK';

SELECT kk.no_kk, kk.status_desil,
       CASE WHEN kk.status_desil IS NULL OR kk.kepemilikan_toilet IS NULL OR kk.kondisi_rumah IS NULL
                 OR kk.sumber_air_bersih IS NULL OR kk.penghasilan_total IS NULL
            THEN 'Indikator belum lengkap' ELSE 'Lengkap' END AS kelengkapan,
       kk.penghasilan_total,
       SUM(w.penghasilan_individu) AS total_penghasilan_anggota,
       CASE
            WHEN kk.penghasilan_total IS NULL
                 OR SUM(w.penghasilan_individu) IS NULL
                THEN 'Belum dapat dibandingkan'
            WHEN kk.penghasilan_total <> SUM(w.penghasilan_individu)
                THEN 'Tidak sama - cek ulang'
            ELSE 'Sesuai'
       END AS konsistensi_penghasilan,
       COUNT(w.warga_id) AS jumlah_anggota_terdata,
       COUNT(w.penghasilan_individu) AS jumlah_penghasilan_terdata
FROM dbo.kartu_keluarga kk
LEFT JOIN dbo.warga w ON w.no_kk = kk.no_kk
GROUP BY kk.no_kk, kk.status_desil, kk.kepemilikan_toilet, kk.kondisi_rumah,
         kk.sumber_air_bersih, kk.penghasilan_total
ORDER BY kelengkapan, kk.no_kk;   -- yang belum lengkap tampil lebih dulu

REVERT;
GO

/* ===================== Bagian B. User Kader ===================== */

EXECUTE AS USER = 'usr_user_kader';

EXEC sp_set_session_context
    @key = N'app_user_id',
    @value = 'B9000000-0000-0000-0000-000000000002';

PRINT '--- A2-Q1: Transaksi pemberian vitamin A bayi pada event Posyandu November';

SELECT nama_barang, stok_tersedia AS stok_sebelum
FROM dbo.master_logistik
WHERE logistik_id = 'F0000000-0000-0000-0000-000000000001';

DECLARE @hasil VARCHAR(30), @layanan_id UNIQUEIDENTIFIER;

EXEC dbo.sp_catat_vitamin_bayi                     -- Kirana, 3 bulan → berhasil
     @jadwal_id = 'E0000000-0000-0000-0000-000000000002',
     @balita_id = 'C0000000-0000-0000-0000-000000000303',
     @logistik_id = 'F0000000-0000-0000-0000-000000000001',
     @dicatat_oleh = 'A0000000-0000-0000-0000-000000000002',
     @hasil = @hasil OUTPUT, @layanan_id = @layanan_id OUTPUT;

SELECT 'Kirana (3 bln)' AS kasus, @hasil AS hasil;

EXEC dbo.sp_catat_vitamin_bayi                     -- dicatat ulang → ditolak
     @jadwal_id = 'E0000000-0000-0000-0000-000000000002',
     @balita_id = 'C0000000-0000-0000-0000-000000000303',
     @logistik_id = 'F0000000-0000-0000-0000-000000000001',
     @dicatat_oleh = 'A0000000-0000-0000-0000-000000000002',
     @hasil = @hasil OUTPUT, @layanan_id = @layanan_id OUTPUT;

SELECT 'Kirana dicatat ulang' AS kasus, @hasil AS hasil;

EXEC dbo.sp_catat_vitamin_bayi                     -- Nadia, 33 bulan → bukan bayi
     @jadwal_id = 'E0000000-0000-0000-0000-000000000002',
     @balita_id = 'C0000000-0000-0000-0000-000000000203',
     @logistik_id = 'F0000000-0000-0000-0000-000000000001',
     @dicatat_oleh = 'A0000000-0000-0000-0000-000000000002',
     @hasil = @hasil OUTPUT, @layanan_id = @layanan_id OUTPUT;

SELECT 'Nadia (33 bln)' AS kasus, @hasil AS hasil;

SELECT nama_barang, stok_tersedia AS stok_sesudah
FROM dbo.master_logistik
WHERE logistik_id = 'F0000000-0000-0000-0000-000000000001';


PRINT '--- A2-Q2: Rekap jumlah warga yang dilayani per petugas per bulan';

WITH aktivitas AS (
    /* balita_id, ibu_id, lansia_id berisi warga_id (PK subclass = PK superclass),
       sehingga satu orang dihitung sekali di semua sumber */
    SELECT dicatat_oleh AS kader_id, balita_id AS orang_id, tanggal_periksa AS tanggal, 'Pemeriksaan' AS jenis
    FROM dbo.pemeriksaan_balita

    UNION ALL

    SELECT dicatat_oleh, ibu_id, tanggal_periksa, 'Pemeriksaan'
    FROM dbo.pemeriksaan_ibu

    UNION ALL

    SELECT dicatat_oleh, lansia_id, tanggal_periksa, 'Pemeriksaan'
    FROM dbo.pemeriksaan_lansia

    UNION ALL

    SELECT dicatat_oleh, COALESCE(balita_id, ibu_id), tanggal_layanan, 'Layanan'
    FROM dbo.layanan

    UNION ALL

    SELECT pk.dicatat_oleh, pk.warga_id, CAST(pk.waktu_hadir AS DATE), 'Kegiatan'
    FROM dbo.partisipasi_kegiatan pk
)
SELECT pt.nama AS petugas,
       FORMAT(a.tanggal, 'yyyy-MM') AS bulan,
       COUNT(DISTINCT a.orang_id) AS jumlah_warga_dilayani,
       SUM(CASE WHEN a.jenis = 'Pemeriksaan' THEN 1 ELSE 0 END) AS transaksi_pemeriksaan,
       SUM(CASE WHEN a.jenis = 'Layanan'     THEN 1 ELSE 0 END) AS transaksi_layanan,
       SUM(CASE WHEN a.jenis = 'Kegiatan'    THEN 1 ELSE 0 END) AS kehadiran_kegiatan
FROM aktivitas a
JOIN dbo.petugas pt ON pt.petugas_id = a.kader_id
GROUP BY pt.nama, FORMAT(a.tanggal, 'yyyy-MM')
ORDER BY bulan, jumlah_warga_dilayani DESC;


PRINT '--- A2-Q3: Catat kehadiran sosialisasi prokes (kepala keluarga & istri Dusun Ngasem)';

BEGIN TRANSACTION;
    INSERT INTO dbo.partisipasi_kegiatan
        (jadwal_id, warga_id, waktu_hadir, dicatat_oleh, keterangan)
    SELECT 'E0000000-0000-0000-0000-000000000003',
           w.warga_id,
           '2026-11-05 09:00',
           'A0000000-0000-0000-0000-000000000003',
           N'Edukasi cuci tangan & jamban sehat'
    FROM dbo.warga w
    JOIN dbo.kartu_keluarga kk ON kk.no_kk = w.no_kk
    WHERE kk.dusun = N'Ngasem'
      AND w.hubungan_keluarga IN ('Kepala Keluarga','Istri')
      AND NOT EXISTS (
          SELECT 1
          FROM dbo.partisipasi_kegiatan pk
          WHERE pk.jadwal_id = 'E0000000-0000-0000-0000-000000000003'
            AND pk.warga_id = w.warga_id
      );

    SELECT @@ROWCOUNT AS kehadiran_baru_dicatat;
COMMIT TRANSACTION;


PRINT '--- A2-Q4: Perbarui indikator sanitasi/desil KK (trigger mencatat log)';

UPDATE dbo.kartu_keluarga
   SET status_desil = 2,
       kepemilikan_toilet = 1,
       kondisi_rumah = 'Semi Layak',
       sumber_air_bersih = N'Sumur bor',
       penghasilan_total = 2300000
 WHERE no_kk = '3313010101010006';

REVERT;   -- verifikasi log dilihat sebagai pemilik DB (kader tidak punya akses ke log)

SELECT TOP 1 jenis_aktivitas, entitas_terkait, id_data_terkait, keterangan
FROM dbo.log_aktivitas
WHERE entitas_terkait = 'kartu_keluarga'
ORDER BY waktu_aktivitas DESC;
GO


EXECUTE AS USER = 'usr_user_kader';

PRINT '--- A2-Q5: Rekap pemeriksaan lansia dan skrining TBC pada Posyandu Lansia November';

SELECT w.nama,
       dbo.fn_hitung_usia_bulan(w.tanggal_lahir, pl.tanggal_periksa) / 12 AS usia_tahun,
       pl.imt, pl.kategori_imt,
       CONCAT(pl.tekanan_darah_sistolik, '/', pl.tekanan_darah_diastolik) AS tekanan_darah,
       pl.kategori_tekanan_darah, pl.gula_darah, pl.kategori_gula_darah, pl.skor_puma,
       COALESCE(CAST(ip.tbc_batuk AS INT), 0)
         + COALESCE(CAST(ip.tbc_demam AS INT), 0)
         + COALESCE(CAST(ip.tbc_bb_tidak_naik AS INT), 0)
         + COALESCE(CAST(ip.tbc_kontak_erat AS INT), 0) AS jumlah_gejala_tbc,
       CASE WHEN ip.status_rujukan = 1
            THEN CONCAT('Dirujuk ke ', f.nama_faskes)
            ELSE 'Tidak dirujuk'
       END AS rujukan,
       r.status_tindak_lanjut
FROM dbo.pemeriksaan_lansia pl
JOIN dbo.lansia ls ON ls.warga_id = pl.lansia_id
JOIN dbo.warga w   ON w.warga_id = ls.warga_id      -- atribut warisan superclass
LEFT JOIN dbo.isian_pendukung ip ON ip.pemeriksaan_lansia_id = pl.pemeriksaan_lansia_id
LEFT JOIN dbo.rujukan r ON r.isian_id = ip.isian_id
LEFT JOIN dbo.faskes f  ON f.faskes_id = r.faskes_id
WHERE pl.jadwal_id = 'E0000000-0000-0000-0000-000000000006'
ORDER BY jumlah_gejala_tbc DESC, w.nama;

REVERT;
GO
