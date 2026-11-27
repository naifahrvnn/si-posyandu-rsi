SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF DB_ID('posyandu_db') IS NULL CREATE DATABASE posyandu_db;
GO
USE posyandu_db;
GO

/* ---------- 1. pengguna (TABEL SISTEM: akun login, terpisah dari data petugas/warga) ---------- */
CREATE TABLE dbo.pengguna (
    user_id        UNIQUEIDENTIFIER NOT NULL CONSTRAINT df_pengguna_id DEFAULT NEWID(),
    user_name      VARCHAR(50)      NOT NULL,
    password_hash  VARCHAR(255)     NOT NULL,
    peran          VARCHAR(20)      NOT NULL CONSTRAINT df_pengguna_peran DEFAULT 'User (Kader)',
    status_akun    VARCHAR(10)      NOT NULL CONSTRAINT df_pengguna_status DEFAULT 'Aktif',
    last_login     DATETIME2(0)     NULL,
    created_at     DATETIME2(0)     NOT NULL CONSTRAINT df_pengguna_created DEFAULT SYSDATETIME(),
    update_at      DATETIME2(0)     NULL,
    petugas_id     UNIQUEIDENTIFIER NULL,   -- akun milik petugas (memiliki_akun)
    warga_id       UNIQUEIDENTIFIER NULL,   -- akun milik warga (memiliki_akun)
    CONSTRAINT pk_pengguna PRIMARY KEY (user_id),
    CONSTRAINT uq_pengguna_user_name UNIQUE (user_name),
    CONSTRAINT ck_pengguna_peran  CHECK (peran IN ('User (Kader)', 'Super User', 'Warga')),
    /* akun milik tepat satu pihak: petugas (Super User / User (Kader)) atau warga (Warga) */
    CONSTRAINT ck_pengguna_pemilik CHECK (
        (peran = 'Warga' AND warga_id IS NOT NULL AND petugas_id IS NULL) OR
        (peran <> 'Warga' AND petugas_id IS NOT NULL AND warga_id IS NULL)),
    CONSTRAINT ck_pengguna_status CHECK (status_akun IN ('Aktif', 'Nonaktif'))
);

/* ---------- 2. sesi ---------- */
CREATE TABLE dbo.sesi (
    id_sesi          CHAR(64)         NOT NULL,
    user_id          UNIQUEIDENTIFIER NOT NULL,
    kedaluwarsa_pada DATETIME2(0)     NOT NULL,
    created_at       DATETIME2(0)     NOT NULL CONSTRAINT df_sesi_created DEFAULT SYSDATETIME(),
    CONSTRAINT pk_sesi PRIMARY KEY (id_sesi),
    CONSTRAINT fk_sesi_pengguna FOREIGN KEY (user_id) REFERENCES dbo.pengguna(user_id) ON DELETE CASCADE
);
CREATE INDEX idx_sesi_kedaluwarsa ON dbo.sesi(kedaluwarsa_pada);

/* ---------- 3. log_aktivitas (append-only) ---------- */
CREATE TABLE dbo.log_aktivitas (
    log_id          UNIQUEIDENTIFIER NOT NULL CONSTRAINT df_log_id DEFAULT NEWID(),
    waktu_aktivitas DATETIME2(0)     NOT NULL CONSTRAINT df_log_waktu DEFAULT SYSDATETIME(),
    jenis_aktivitas VARCHAR(10)      NOT NULL,
    entitas_terkait VARCHAR(50)      NOT NULL,
    id_data_terkait VARCHAR(36)      NOT NULL,   -- menampung UUID maupun no_kk (CHAR 16)
    keterangan      NVARCHAR(255)    NULL,
    user_id         UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT pk_log_aktivitas PRIMARY KEY (log_id),
    CONSTRAINT fk_log_pengguna FOREIGN KEY (user_id) REFERENCES dbo.pengguna(user_id),
    CONSTRAINT ck_log_jenis CHECK (jenis_aktivitas IN ('Login','Logout','Input','Edit','Delete','Ditolak'))  -- Ditolak: percobaan akses tanpa hak (ERR-AUTH-03)
);
CREATE INDEX idx_log_waktu ON dbo.log_aktivitas(waktu_aktivitas DESC);

/* ---------- 4. aturan_kategori (tabel acuan) ---------- */
CREATE TABLE dbo.aturan_kategori (
    aturan_id     UNIQUEIDENTIFIER NOT NULL CONSTRAINT df_aturan_id DEFAULT NEWID(),
    indikator     VARCHAR(50)      NOT NULL,
    jenis_kelamin VARCHAR(10)      NULL,
    usia_min      INT              NULL,
    usia_max      INT              NULL,
    nilai_min     DECIMAL(6,2)     NULL,
    nilai_max     DECIMAL(6,2)     NULL,
    kategori      VARCHAR(50)      NOT NULL,
    CONSTRAINT pk_aturan_kategori PRIMARY KEY (aturan_id),
    CONSTRAINT ck_aturan_jk CHECK (jenis_kelamin IS NULL OR jenis_kelamin IN ('Laki-laki','Perempuan')),
    CONSTRAINT ck_aturan_usia  CHECK (usia_min IS NULL OR usia_max IS NULL OR usia_min <= usia_max),
    CONSTRAINT ck_aturan_nilai CHECK (nilai_min IS NULL OR nilai_max IS NULL OR nilai_min <= nilai_max)
);

/* ---------- 5. ref_kategori_penghasilan ---------- */
CREATE TABLE dbo.ref_kategori_penghasilan (
    kategori_id  TINYINT        NOT NULL,
    batas_bawah  DECIMAL(12,2)  NOT NULL,
    batas_atas   DECIMAL(12,2)  NULL,          -- NULL = tanpa batas atas
    label        VARCHAR(30)    NOT NULL,
    CONSTRAINT pk_ref_kategori_penghasilan PRIMARY KEY (kategori_id),
    CONSTRAINT uq_ref_kategori_label UNIQUE (label),
    CONSTRAINT ck_ref_kategori_batas CHECK (batas_atas IS NULL OR batas_bawah < batas_atas)
);

/* ---------- 6. kartu_keluarga (indikator desil & sanitasi) ---------- */
CREATE TABLE dbo.kartu_keluarga (
    no_kk              CHAR(16)       NOT NULL,
    alamat             NVARCHAR(255)  NOT NULL,
    dusun              NVARCHAR(50)   NOT NULL,
    rt                 VARCHAR(5)     NOT NULL,
    rw                 VARCHAR(5)     NOT NULL,
    desa               NVARCHAR(50)   NOT NULL,
    kecamatan          NVARCHAR(50)   NOT NULL,
    status_desil       TINYINT        NULL,
    kepemilikan_toilet BIT            NULL,
    kondisi_rumah      VARCHAR(15)    NULL,
    sumber_air_bersih  NVARCHAR(100)  NULL,
    penghasilan_total  DECIMAL(12,2)  NULL,
    created_at         DATETIME2(0)   NOT NULL CONSTRAINT df_kk_created DEFAULT SYSDATETIME(),
    updated_at         DATETIME2(0)   NULL,
    CONSTRAINT pk_kartu_keluarga PRIMARY KEY (no_kk),
    CONSTRAINT ck_kk_no_kk  CHECK (LEN(no_kk) = 16 AND no_kk NOT LIKE '%[^0-9]%'),
    CONSTRAINT ck_kk_desil  CHECK (status_desil BETWEEN 1 AND 10),
    CONSTRAINT ck_kk_rumah  CHECK (kondisi_rumah IN ('Layak','Semi Layak','Tidak Layak')),
    CONSTRAINT ck_kk_hasil  CHECK (penghasilan_total >= 0)
);

/* ---------- 7. warga ---------- */
CREATE TABLE dbo.warga (
    warga_id              UNIQUEIDENTIFIER NOT NULL CONSTRAINT df_warga_id DEFAULT NEWID(),
    no_kk                 CHAR(16)         NOT NULL,
    nik                   CHAR(16)         NOT NULL,
    nama                  NVARCHAR(100)    NOT NULL,
    tanggal_lahir         DATE             NOT NULL,
    jenis_kelamin         VARCHAR(10)      NOT NULL,
    hubungan_keluarga     VARCHAR(20)      NOT NULL,   
    pekerjaan             NVARCHAR(100)    NULL,
    penghasilan_individu  INT              NULL,
    kontak                VARCHAR(15)      NULL,
    created_at            DATETIME2(0)     NOT NULL CONSTRAINT df_warga_created DEFAULT SYSDATETIME(),
    CONSTRAINT pk_warga PRIMARY KEY (warga_id),
    CONSTRAINT uq_warga_nik UNIQUE (nik),
    CONSTRAINT fk_warga_kk FOREIGN KEY (no_kk) REFERENCES dbo.kartu_keluarga(no_kk),
    CONSTRAINT ck_warga_nik CHECK (LEN(nik) = 16 AND nik NOT LIKE '%[^0-9]%'),
    CONSTRAINT ck_warga_jk  CHECK (jenis_kelamin IN ('Laki-laki','Perempuan')),
    CONSTRAINT ck_warga_hub CHECK (hubungan_keluarga IN ('Kepala Keluarga','Istri','Anak','Famili Lain')),
    CONSTRAINT ck_warga_kontak CHECK (kontak IS NULL OR kontak NOT LIKE '%[^0-9]%'),
    CONSTRAINT ck_warga_hasil  CHECK (penghasilan_individu IS NULL OR penghasilan_individu >= 0)
);
CREATE INDEX idx_warga_no_kk ON dbo.warga(no_kk);
/* Satu KK hanya punya satu Kepala Keluarga (filtered unique index) */
CREATE UNIQUE INDEX uq_warga_kepala_kk ON dbo.warga(no_kk) WHERE hubungan_keluarga = 'Kepala Keluarga';

/* ---------- 8–10. SPECIALIZATION WARGA → BALITA, IBU, LANSIA ----------
   EER: disjoint (d), partial. Pemetaan Option 8A (superclass + subclass):
   PK subclass = PK superclass (warga_id) sekaligus FK ke warga.
   Atribut warisan (nik, nama, tanggal_lahir, jenis_kelamin, kontak, alamat via KK)
   tidak disimpan ulang di subclass. */
CREATE TABLE dbo.balita (
    warga_id            UNIQUEIDENTIFIER NOT NULL,
    nama_orang_tua      NVARCHAR(100)    NOT NULL,
    berat_badan_lahir   DECIMAL(5,2)     NOT NULL,
    panjang_badan_lahir DECIMAL(5,2)     NOT NULL,
    created_at          DATETIME2(0)     NOT NULL CONSTRAINT df_balita_created DEFAULT SYSDATETIME(),
    update_at           DATETIME2(0)     NULL,
    CONSTRAINT pk_balita PRIMARY KEY (warga_id),
    CONSTRAINT fk_balita_warga FOREIGN KEY (warga_id) REFERENCES dbo.warga(warga_id),
    CONSTRAINT ck_balita_lahir CHECK (berat_badan_lahir > 0 AND panjang_badan_lahir > 0)
);

CREATE TABLE dbo.ibu (
    warga_id     UNIQUEIDENTIFIER NOT NULL,
    status_ibu   VARCHAR(10)      NOT NULL,
    nama_suami   NVARCHAR(100)    NOT NULL,
    kehamilan_ke INT              NULL,
    created_at   DATETIME2(0)     NOT NULL CONSTRAINT df_ibu_created DEFAULT SYSDATETIME(),
    update_at    DATETIME2(0)     NULL,
    CONSTRAINT pk_ibu PRIMARY KEY (warga_id),
    CONSTRAINT fk_ibu_warga FOREIGN KEY (warga_id) REFERENCES dbo.warga(warga_id),
    CONSTRAINT ck_ibu_status CHECK (status_ibu IN ('Hamil','Nifas','Menyusui')),
    CONSTRAINT ck_ibu_hamil_ke CHECK (kehamilan_ke IS NULL OR kehamilan_ke > 0)
);

CREATE TABLE dbo.lansia (
    warga_id          UNIQUEIDENTIFIER NOT NULL,
    status_perkawinan VARCHAR(20)      NULL,
    created_at        DATETIME2(0)     NOT NULL CONSTRAINT df_lansia_created DEFAULT SYSDATETIME(),
    update_at         DATETIME2(0)     NULL,
    CONSTRAINT pk_lansia PRIMARY KEY (warga_id),
    CONSTRAINT fk_lansia_warga FOREIGN KEY (warga_id) REFERENCES dbo.warga(warga_id)
);

/* ---------- PETUGAS (kader & tenaga kesehatan) — specialization disjoint, total ---------- */
CREATE TABLE dbo.petugas (
    petugas_id     UNIQUEIDENTIFIER NOT NULL CONSTRAINT df_petugas_id DEFAULT NEWID(),
    nama           NVARCHAR(100)    NOT NULL,
    nik            CHAR(16)         NULL,
    jenis_kelamin  VARCHAR(10)      NOT NULL,
    kontak         VARCHAR(15)      NULL,
    instansi_asal  NVARCHAR(150)    NULL,
    status_aktif   BIT              NOT NULL CONSTRAINT df_petugas_aktif DEFAULT 1,
    created_at     DATETIME2(0)     NOT NULL CONSTRAINT df_petugas_created DEFAULT SYSDATETIME(),
    CONSTRAINT pk_petugas PRIMARY KEY (petugas_id),
    CONSTRAINT ck_petugas_nik CHECK (nik IS NULL OR (LEN(nik) = 16 AND nik NOT LIKE '%[^0-9]%')),
    CONSTRAINT ck_petugas_jk  CHECK (jenis_kelamin IN ('Laki-laki','Perempuan')),
    CONSTRAINT ck_petugas_kontak CHECK (kontak IS NULL OR kontak NOT LIKE '%[^0-9]%')
);
CREATE UNIQUE INDEX uq_petugas_nik ON dbo.petugas(nik) WHERE nik IS NOT NULL;

CREATE TABLE dbo.kader (
    petugas_id        UNIQUEIDENTIFIER NOT NULL,
    jabatan_kader     NVARCHAR(50)     NOT NULL,
    tanggal_bergabung DATE             NULL,
    CONSTRAINT pk_kader PRIMARY KEY (petugas_id),
    CONSTRAINT fk_kader_petugas FOREIGN KEY (petugas_id) REFERENCES dbo.petugas(petugas_id) ON DELETE CASCADE
);

CREATE TABLE dbo.tenaga_kesehatan (
    petugas_id     UNIQUEIDENTIFIER NOT NULL,
    profesi        VARCHAR(30)      NOT NULL,
    jenis_instansi VARCHAR(30)      NOT NULL,
    CONSTRAINT pk_tenaga_kesehatan PRIMARY KEY (petugas_id),
    CONSTRAINT fk_nakes_petugas FOREIGN KEY (petugas_id) REFERENCES dbo.petugas(petugas_id) ON DELETE CASCADE,
    CONSTRAINT ck_nakes_profesi CHECK (profesi IN ('Dokter','Bidan','Perawat','Mahasiswa Keperawatan','Penyuluh','Lainnya')),
    CONSTRAINT ck_nakes_instansi CHECK (jenis_instansi IN ('Puskesmas','Swasta','Institusi Pendidikan','Lainnya'))
);

/* ---------- FASKES (tujuan rujukan: tidak harus Puskesmas) ---------- */
CREATE TABLE dbo.faskes (
    faskes_id    UNIQUEIDENTIFIER NOT NULL CONSTRAINT df_faskes_id DEFAULT NEWID(),
    nama_faskes  NVARCHAR(150)    NOT NULL,
    jenis_faskes VARCHAR(20)      NOT NULL,
    alamat       NVARCHAR(255)    NULL,
    kontak       VARCHAR(15)      NULL,
    mitra_bpjs   BIT              NOT NULL CONSTRAINT df_faskes_bpjs DEFAULT 0,
    CONSTRAINT pk_faskes PRIMARY KEY (faskes_id),
    CONSTRAINT uq_faskes_nama UNIQUE (nama_faskes),
    CONSTRAINT ck_faskes_jenis CHECK (jenis_faskes IN ('Puskesmas','Pustu','Klinik','Rumah Sakit','Lainnya')),
    CONSTRAINT ck_faskes_kontak CHECK (kontak IS NULL OR kontak NOT LIKE '%[^0-9]%')
);

/* ---------- 11. master_logistik ---------- */
CREATE TABLE dbo.master_logistik (
    logistik_id   UNIQUEIDENTIFIER NOT NULL CONSTRAINT df_logistik_id DEFAULT NEWID(),
    nama_barang   NVARCHAR(100)    NOT NULL,
    kategori      VARCHAR(30)      NOT NULL,
    stok_tersedia INT              NOT NULL CONSTRAINT df_logistik_stok DEFAULT 0,
    satuan        VARCHAR(20)      NOT NULL,
    updated_at    DATETIME2(0)     NOT NULL CONSTRAINT df_logistik_upd DEFAULT SYSDATETIME(),
    CONSTRAINT pk_master_logistik PRIMARY KEY (logistik_id),
    CONSTRAINT uq_logistik_nama UNIQUE (nama_barang),
    CONSTRAINT ck_logistik_stok CHECK (stok_tersedia >= 0),
    CONSTRAINT ck_logistik_kat  CHECK (kategori IN ('Vitamin','Obat','Suplemen','Vaksin'))
);

/* ---------- 12. jadwal_kegiatan (event) ---------- */
CREATE TABLE dbo.jadwal_kegiatan (
    jadwal_id           UNIQUEIDENTIFIER NOT NULL CONSTRAINT df_jadwal_id DEFAULT NEWID(),
    nama_kegiatan       NVARCHAR(150)    NOT NULL,
    jenis_kegiatan      VARCHAR(30)      NOT NULL, 
    tanggal_pelaksanaan DATE             NOT NULL,
    lokasi              NVARCHAR(150)    NOT NULL,
    penanggung_jawab    UNIQUEIDENTIFIER NOT NULL,      -- FK petugas
    keterangan          NVARCHAR(MAX)    NULL,
    created_at          DATETIME2(0)     NOT NULL CONSTRAINT df_jadwal_created DEFAULT SYSDATETIME(),
    CONSTRAINT pk_jadwal_kegiatan PRIMARY KEY (jadwal_id),
    CONSTRAINT fk_jadwal_pj FOREIGN KEY (penanggung_jawab) REFERENCES dbo.petugas(petugas_id),
    CONSTRAINT ck_jadwal_jenis CHECK (jenis_kegiatan IN
        ('Posyandu','Penyuluhan Kesehatan','Imunisasi/Pemeriksaan','Distribusi Vitamin'))
);
CREATE INDEX idx_jadwal_tanggal ON dbo.jadwal_kegiatan(tanggal_pelaksanaan);

/* ---------- 13–15. transaksi pemeriksaan ---------- */
CREATE TABLE dbo.pemeriksaan_balita (
    pemeriksaan_balita_id  UNIQUEIDENTIFIER NOT NULL CONSTRAINT df_pb_id DEFAULT NEWID(),
    balita_id              UNIQUEIDENTIFIER NOT NULL,
    jadwal_id              UNIQUEIDENTIFIER NULL, 
    tanggal_periksa        DATE             NOT NULL,
    berat_badan            DECIMAL(5,2)     NOT NULL,
    tinggi_panjang_badan   DECIMAL(5,2)     NOT NULL,
    lila                   DECIMAL(5,2)     NOT NULL,
    lika                   DECIMAL(5,2)     NOT NULL,
    status_berat_badan     CHAR(1)          NOT NULL,
    kategori_stunting      VARCHAR(50)      NOT NULL,
    kategori_bbu           VARCHAR(50)      NOT NULL,
    kategori_bb_tb         VARCHAR(50)      NOT NULL,
    kategori_lila          VARCHAR(50)      NOT NULL,
    kategori_lika          VARCHAR(50)      NOT NULL,
    dicatat_oleh           UNIQUEIDENTIFIER NOT NULL,
    created_at             DATETIME2(0)     NOT NULL CONSTRAINT df_pb_created DEFAULT SYSDATETIME(),
    CONSTRAINT pk_pemeriksaan_balita PRIMARY KEY (pemeriksaan_balita_id),
    CONSTRAINT fk_pb_balita  FOREIGN KEY (balita_id) REFERENCES dbo.balita(warga_id) ON DELETE CASCADE,
    CONSTRAINT fk_pb_jadwal  FOREIGN KEY (jadwal_id) REFERENCES dbo.jadwal_kegiatan(jadwal_id),
    CONSTRAINT fk_pb_kader   FOREIGN KEY (dicatat_oleh) REFERENCES dbo.petugas(petugas_id),
    CONSTRAINT ck_pb_ukur    CHECK (berat_badan > 0 AND tinggi_panjang_badan > 0 AND lila > 0 AND lika > 0),
    CONSTRAINT ck_pb_status  CHECK (status_berat_badan IN ('N','T','B'))
);
CREATE INDEX idx_pb_balita_tanggal ON dbo.pemeriksaan_balita(balita_id, tanggal_periksa DESC);

CREATE TABLE dbo.pemeriksaan_ibu (
    pemeriksaan_ibu_id      UNIQUEIDENTIFIER NOT NULL CONSTRAINT df_pi_id DEFAULT NEWID(),
    ibu_id                  UNIQUEIDENTIFIER NOT NULL,
    jadwal_id               UNIQUEIDENTIFIER NULL,
    tanggal_periksa         DATE             NOT NULL,
    berat_badan             DECIMAL(5,2)     NOT NULL,
    lila                    DECIMAL(5,2)     NOT NULL,
    tekanan_darah_sistolik  SMALLINT         NOT NULL,
    tekanan_darah_diastolik SMALLINT         NOT NULL,
    usia_kehamilan_minggu   INT              NULL,
    bb_sesuai_kurva_kia     BIT              NULL,
    td_sesuai_kurva_kia     BIT              NULL,
    hb                      DECIMAL(4,1)     NULL,
    status_kek              VARCHAR(20)      NOT NULL,
    status_anemia           VARCHAR(50)      NULL,
    dicatat_oleh            UNIQUEIDENTIFIER NOT NULL,
    created_at              DATETIME2(0)     NOT NULL CONSTRAINT df_pi_created DEFAULT SYSDATETIME(),
    CONSTRAINT pk_pemeriksaan_ibu PRIMARY KEY (pemeriksaan_ibu_id),
    CONSTRAINT fk_pi_ibu    FOREIGN KEY (ibu_id) REFERENCES dbo.ibu(warga_id) ON DELETE CASCADE,
    CONSTRAINT fk_pi_jadwal FOREIGN KEY (jadwal_id) REFERENCES dbo.jadwal_kegiatan(jadwal_id),
    CONSTRAINT fk_pi_kader  FOREIGN KEY (dicatat_oleh) REFERENCES dbo.petugas(petugas_id),
    CONSTRAINT ck_pi_ukur   CHECK (berat_badan > 0 AND lila > 0
                                   AND tekanan_darah_sistolik > 0 AND tekanan_darah_diastolik > 0),
    CONSTRAINT ck_pi_kek    CHECK (status_kek IN ('Berisiko KEK','Tidak Berisiko','Belum tersedia')),
    CONSTRAINT ck_pi_anemia CHECK (hb IS NOT NULL OR status_anemia IS NULL)
);
CREATE INDEX idx_pi_ibu_tanggal ON dbo.pemeriksaan_ibu(ibu_id, tanggal_periksa DESC);

CREATE TABLE dbo.pemeriksaan_lansia (
    pemeriksaan_lansia_id   UNIQUEIDENTIFIER NOT NULL CONSTRAINT df_pl_id DEFAULT NEWID(),
    lansia_id               UNIQUEIDENTIFIER NOT NULL,
    jadwal_id               UNIQUEIDENTIFIER NULL,
    tanggal_periksa         DATE             NOT NULL,
    berat_badan             DECIMAL(5,2)     NOT NULL,
    tinggi_badan            DECIMAL(5,2)     NOT NULL,
    lingkar_perut           DECIMAL(5,2)     NOT NULL,
    imt                     DECIMAL(4,1)     NOT NULL,
    tekanan_darah_sistolik  SMALLINT         NULL,     -- diisi pada langkah 2 (FSD-2.21)
    tekanan_darah_diastolik SMALLINT         NULL,
    gula_darah              DECIMAL(5,1)     NULL,
    hitung_jari_kanan       VARCHAR(10)      NULL,
    hitung_jari_kiri        VARCHAR(10)      NULL,
    berbisik_kanan          VARCHAR(10)      NULL,
    berbisik_kiri           VARCHAR(10)      NULL,
    merokok                 BIT              NULL,
    bungkus_per_tahun       DECIMAL(5,1)     NULL,
    puma_gejala_1           BIT              NULL,
    puma_gejala_2           BIT              NULL,
    puma_gejala_3           BIT              NULL,
    puma_gejala_4           BIT              NULL,
    kategori_imt            VARCHAR(25)      NULL,
    kategori_tekanan_darah  VARCHAR(25)      NULL,
    kategori_gula_darah     VARCHAR(25)      NULL,
    skor_puma               TINYINT          NULL,
    dicatat_oleh            UNIQUEIDENTIFIER NOT NULL,
    created_at              DATETIME2(0)     NOT NULL CONSTRAINT df_pl_created DEFAULT SYSDATETIME(),
    CONSTRAINT pk_pemeriksaan_lansia PRIMARY KEY (pemeriksaan_lansia_id),
    CONSTRAINT fk_pl_lansia FOREIGN KEY (lansia_id) REFERENCES dbo.lansia(warga_id) ON DELETE CASCADE,
    CONSTRAINT fk_pl_jadwal FOREIGN KEY (jadwal_id) REFERENCES dbo.jadwal_kegiatan(jadwal_id),
    CONSTRAINT fk_pl_kader  FOREIGN KEY (dicatat_oleh) REFERENCES dbo.petugas(petugas_id),
    CONSTRAINT ck_pl_ukur   CHECK (berat_badan > 0 AND tinggi_badan > 0 AND lingkar_perut > 0),
    CONSTRAINT ck_pl_indera CHECK (
        COALESCE(hitung_jari_kanan,'Normal') IN ('Normal','Gangguan') AND
        COALESCE(hitung_jari_kiri,'Normal')  IN ('Normal','Gangguan') AND
        COALESCE(berbisik_kanan,'Normal')    IN ('Normal','Gangguan') AND
        COALESCE(berbisik_kiri,'Normal')     IN ('Normal','Gangguan'))
);
CREATE INDEX idx_pl_lansia_tanggal ON dbo.pemeriksaan_lansia(lansia_id, tanggal_periksa DESC);

/* ---------- 16. isian_pendukung (skrining TBC & status rujukan) ---------- */
CREATE TABLE dbo.isian_pendukung (
    isian_id              UNIQUEIDENTIFIER NOT NULL CONSTRAINT df_isian_id DEFAULT NEWID(),
    pemeriksaan_balita_id UNIQUEIDENTIFIER NULL,
    pemeriksaan_ibu_id    UNIQUEIDENTIFIER NULL,
    pemeriksaan_lansia_id UNIQUEIDENTIFIER NULL,
    tbc_batuk             BIT NOT NULL CONSTRAINT df_isian_batuk  DEFAULT 0,
    tbc_demam             BIT NOT NULL CONSTRAINT df_isian_demam  DEFAULT 0,
    tbc_bb_tidak_naik     BIT NOT NULL CONSTRAINT df_isian_bb     DEFAULT 0,
    tbc_kontak_erat       BIT NOT NULL CONSTRAINT df_isian_kontak DEFAULT 0,
    status_rujukan        BIT NOT NULL CONSTRAINT df_isian_rujuk  DEFAULT 0,
    catatan_edukasi       NVARCHAR(500)    NULL,
    created_at            DATETIME2(0)     NOT NULL CONSTRAINT df_isian_created DEFAULT SYSDATETIME(),
    CONSTRAINT pk_isian_pendukung PRIMARY KEY (isian_id),
    CONSTRAINT fk_isian_pb FOREIGN KEY (pemeriksaan_balita_id) REFERENCES dbo.pemeriksaan_balita(pemeriksaan_balita_id) ON DELETE CASCADE,
    CONSTRAINT fk_isian_pi FOREIGN KEY (pemeriksaan_ibu_id)    REFERENCES dbo.pemeriksaan_ibu(pemeriksaan_ibu_id)       ON DELETE CASCADE,
    CONSTRAINT fk_isian_pl FOREIGN KEY (pemeriksaan_lansia_id) REFERENCES dbo.pemeriksaan_lansia(pemeriksaan_lansia_id) ON DELETE CASCADE,
    /* tepat satu induk pemeriksaan */
    CONSTRAINT ck_isian_satu_induk CHECK (
        (CASE WHEN pemeriksaan_balita_id IS NULL THEN 0 ELSE 1 END
       + CASE WHEN pemeriksaan_ibu_id    IS NULL THEN 0 ELSE 1 END
       + CASE WHEN pemeriksaan_lansia_id IS NULL THEN 0 ELSE 1 END) = 1)
);
CREATE UNIQUE INDEX uq_isian_pb ON dbo.isian_pendukung(pemeriksaan_balita_id) WHERE pemeriksaan_balita_id IS NOT NULL;
CREATE UNIQUE INDEX uq_isian_pi ON dbo.isian_pendukung(pemeriksaan_ibu_id)    WHERE pemeriksaan_ibu_id    IS NOT NULL;
CREATE UNIQUE INDEX uq_isian_pl ON dbo.isian_pendukung(pemeriksaan_lansia_id) WHERE pemeriksaan_lansia_id IS NOT NULL;

/* ---------- 17. layanan (transaksi riwayat layanan) ---------- */
CREATE TABLE dbo.layanan (
    layanan_id       UNIQUEIDENTIFIER NOT NULL CONSTRAINT df_layanan_id DEFAULT NEWID(),
    balita_id        UNIQUEIDENTIFIER NULL,
    ibu_id           UNIQUEIDENTIFIER NULL,
    jadwal_id        UNIQUEIDENTIFIER NULL,    
    logistik_id      UNIQUEIDENTIFIER NULL,    
    jumlah_diberikan INT              NULL,    
    tanggal_layanan  DATE             NOT NULL,
    jenis_layanan    VARCHAR(15)      NOT NULL,
    jumlah_tablet    INT              NULL,
    konsumsi_harian  BIT              NULL,
    komposisi_mt     NVARCHAR(MAX)    NULL,
    porsi_mt         NVARCHAR(MAX)    NULL,
    konsumsi_mt      BIT              NULL,
    keterangan       NVARCHAR(MAX)    NULL,
    dicatat_oleh     UNIQUEIDENTIFIER NOT NULL,
    created_at       DATETIME2(0)     NOT NULL CONSTRAINT df_layanan_created DEFAULT SYSDATETIME(),
    CONSTRAINT pk_layanan PRIMARY KEY (layanan_id),
    CONSTRAINT fk_layanan_balita   FOREIGN KEY (balita_id)   REFERENCES dbo.balita(warga_id) ON DELETE CASCADE,
    CONSTRAINT fk_layanan_ibu      FOREIGN KEY (ibu_id)      REFERENCES dbo.ibu(warga_id)       ON DELETE CASCADE,
    CONSTRAINT fk_layanan_jadwal   FOREIGN KEY (jadwal_id)   REFERENCES dbo.jadwal_kegiatan(jadwal_id),
    CONSTRAINT fk_layanan_logistik FOREIGN KEY (logistik_id) REFERENCES dbo.master_logistik(logistik_id),
    CONSTRAINT fk_layanan_kader    FOREIGN KEY (dicatat_oleh) REFERENCES dbo.petugas(petugas_id),
    CONSTRAINT ck_layanan_satu_sasaran CHECK (
        (balita_id IS NOT NULL AND ibu_id IS NULL) OR (balita_id IS NULL AND ibu_id IS NOT NULL)),
    CONSTRAINT ck_layanan_jenis CHECK (jenis_layanan IN
        ('Vitamin A','Obat Cacing','Imunisasi','TTD','MT','Imunisasi TT')),
    CONSTRAINT ck_layanan_jumlah CHECK (
        (logistik_id IS NULL AND jumlah_diberikan IS NULL) OR (logistik_id IS NOT NULL AND jumlah_diberikan IS NOT NULL AND jumlah_diberikan > 0)),
    CONSTRAINT ck_layanan_ttd CHECK (jumlah_tablet IS NULL OR jumlah_tablet > 0)
);
CREATE INDEX idx_layanan_balita ON dbo.layanan(balita_id, tanggal_layanan);
CREATE INDEX idx_layanan_ibu    ON dbo.layanan(ibu_id, tanggal_layanan);
CREATE INDEX idx_layanan_jadwal ON dbo.layanan(jadwal_id);

/* ---------- 18. rujukan (ke FASKES mana pun) ---------- */
CREATE TABLE dbo.rujukan (
    rujukan_id           UNIQUEIDENTIFIER NOT NULL CONSTRAINT df_rujukan_id DEFAULT NEWID(),
    isian_id             UNIQUEIDENTIFIER NOT NULL,
    tanggal_rujukan      DATE             NOT NULL,
    faskes_id            UNIQUEIDENTIFIER NOT NULL,
    alasan_rujukan       NVARCHAR(MAX)    NOT NULL,
    status_tindak_lanjut VARCHAR(10)      NOT NULL CONSTRAINT df_rujukan_status DEFAULT 'Belum',
    catatan_faskes       NVARCHAR(MAX)    NULL,
    divalidasi_oleh      UNIQUEIDENTIFIER NULL,        -- petugas koordinator
    tanggal_validasi     DATETIME2(0)     NULL,
    created_at           DATETIME2(0)     NOT NULL CONSTRAINT df_rujukan_created DEFAULT SYSDATETIME(),
    CONSTRAINT pk_rujukan PRIMARY KEY (rujukan_id),
    CONSTRAINT uq_rujukan_isian UNIQUE (isian_id),
    CONSTRAINT fk_rujukan_isian FOREIGN KEY (isian_id) REFERENCES dbo.isian_pendukung(isian_id) ON DELETE CASCADE,
    CONSTRAINT fk_rujukan_validator FOREIGN KEY (divalidasi_oleh) REFERENCES dbo.petugas(petugas_id),
    CONSTRAINT fk_rujukan_faskes FOREIGN KEY (faskes_id) REFERENCES dbo.faskes(faskes_id),
    CONSTRAINT ck_rujukan_status CHECK (status_tindak_lanjut IN ('Belum','Proses','Selesai')),
    CONSTRAINT ck_rujukan_validasi CHECK (
        (divalidasi_oleh IS NULL AND tanggal_validasi IS NULL) OR
        (divalidasi_oleh IS NOT NULL AND tanggal_validasi IS NOT NULL))
);

/* ---------- 19. partisipasi_kegiatan (M:N warga–jadwal) ---------- */
CREATE TABLE dbo.partisipasi_kegiatan (
    jadwal_id    UNIQUEIDENTIFIER NOT NULL,
    warga_id     UNIQUEIDENTIFIER NOT NULL,
    waktu_hadir  DATETIME2(0)     NOT NULL CONSTRAINT df_partisipasi_waktu DEFAULT SYSDATETIME(),
    dicatat_oleh UNIQUEIDENTIFIER NOT NULL,
    keterangan   NVARCHAR(255)    NULL,
    CONSTRAINT pk_partisipasi_kegiatan PRIMARY KEY (jadwal_id, warga_id),
    CONSTRAINT fk_partisipasi_jadwal FOREIGN KEY (jadwal_id) REFERENCES dbo.jadwal_kegiatan(jadwal_id) ON DELETE CASCADE,
    CONSTRAINT fk_partisipasi_warga  FOREIGN KEY (warga_id)  REFERENCES dbo.warga(warga_id),   -- dihapus lewat trg_warga_hapus
    CONSTRAINT fk_partisipasi_kader  FOREIGN KEY (dicatat_oleh) REFERENCES dbo.petugas(petugas_id)
);
CREATE INDEX idx_partisipasi_warga ON dbo.partisipasi_kegiatan(warga_id);

/* ---------- 20. petugas_kegiatan (relationship bertugas, M:N petugas–jadwal) ---------- */
CREATE TABLE dbo.petugas_kegiatan (
    jadwal_id   UNIQUEIDENTIFIER NOT NULL,
    petugas_id  UNIQUEIDENTIFIER NOT NULL,
    peran_tugas VARCHAR(20)      NOT NULL,
    CONSTRAINT pk_petugas_kegiatan PRIMARY KEY (jadwal_id, petugas_id),
    CONSTRAINT fk_pk_jadwal  FOREIGN KEY (jadwal_id)  REFERENCES dbo.jadwal_kegiatan(jadwal_id) ON DELETE CASCADE,
    CONSTRAINT fk_pk_petugas FOREIGN KEY (petugas_id) REFERENCES dbo.petugas(petugas_id),
    CONSTRAINT ck_pk_peran CHECK (peran_tugas IN ('Penanggung Jawab','Pemeriksa','Penyuluh','Pencatat'))
);
CREATE INDEX idx_petugas_kegiatan_petugas ON dbo.petugas_kegiatan(petugas_id);

/* ---------- memiliki_akun: pengguna (tabel sistem) → petugas / warga (1:1, partial) ---------- */
ALTER TABLE dbo.pengguna ADD
    CONSTRAINT fk_pengguna_petugas FOREIGN KEY (petugas_id) REFERENCES dbo.petugas(petugas_id),
    CONSTRAINT fk_pengguna_warga   FOREIGN KEY (warga_id)   REFERENCES dbo.warga(warga_id);
CREATE UNIQUE INDEX uq_pengguna_petugas ON dbo.pengguna(petugas_id) WHERE petugas_id IS NOT NULL;
CREATE UNIQUE INDEX uq_pengguna_warga   ON dbo.pengguna(warga_id)   WHERE warga_id   IS NOT NULL;
GO
