/* =====================================================================
   04_seed.sql — data contoh (dummy) untuk pengujian, bukan data asli warga.
   Jalankan sekali setelah 03_security.sql (berisi INSERT, tidak untuk dijalankan ulang).

   Bagian A. Data contoh kelompok: petugas, faskes, KK, warga, akun, pemeriksaan, layanan, jadwal.
   Bagian B. Contoh nilai ambang aturan_kategori (untuk uji, bukan standar resmi).
   Bagian C. Password uji: semua akun Koordinator/Kader menjadi Posyandu#2026.
   Bagian D. Satu kader tanpa akun, untuk mencoba Tambah Akun dari kader terdaftar.
   ===================================================================== */
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO
/* ===================== Bagian A. Data contoh kelompok ===================== */
USE posyandu_db;
GO
SET NOCOUNT ON;

/* Petugas: kader posyandu dan tenaga kesehatan (data layanan) */
INSERT INTO dbo.petugas (petugas_id, nama, jenis_kelamin, kontak, instansi_asal) VALUES
('A0000000-0000-0000-0000-000000000001','Ibu Novita','Perempuan','081200000001',N'Posyandu RW 05'),
('A0000000-0000-0000-0000-000000000002','Ibu Endah','Perempuan','081200000002',N'Posyandu RW 05'),
('A0000000-0000-0000-0000-000000000003','Ibu Listiyani','Perempuan','081200000003',N'PPosyandu RW 05'),
('A0000000-0000-0000-0000-000000000004','Ibu Suwanti','Perempuan','081200000004',N'Posyandu RW 05'),
('A0000000-0000-0000-0000-000000000005','Ibu Titin','Perempuan','081200000005',N'Posyandu RW 05'),
('A0000000-0000-0000-0000-000000000006','Ibu Utari','Perempuan','081200000006',N'Puskesmas Purwokerta Selatan'),
('A0000000-0000-0000-0000-000000000007','Ibu Desi','Perempuan','081200000007',N'Puskesmas Purwokerto Selatan');
INSERT INTO dbo.kader (petugas_id, jabatan_kader, tanggal_bergabung) VALUES
('A0000000-0000-0000-0000-000000000001',N'Kader','2020-01-15'),
('A0000000-0000-0000-0000-000000000002',N'Kader','2021-03-01'),
('A0000000-0000-0000-0000-000000000003',N'Kader','2022-05-11'),
('A0000000-0000-0000-0000-000000000004',N'Kader','2022-06-13'),
('A0000000-0000-0000-0000-000000000005',N'Kader','2022-07-18');
INSERT INTO dbo.tenaga_kesehatan (petugas_id, profesi, jenis_instansi) VALUES
('A0000000-0000-0000-0000-000000000006','Bidan','Puskesmas'),
('A0000000-0000-0000-0000-000000000007','Lainnya','Puskesmas');

INSERT INTO dbo.faskes (faskes_id, nama_faskes, jenis_faskes, alamat, mitra_bpjs) VALUES
('D0000000-0000-0000-0000-000000000001',N'Puskesmas Purwokerto Selatan','Puskesmas',N'Kecamatan Purwokerto Selatan',1),
('D0000000-0000-0000-0000-000000000002',N'Klinik Pratama Rawat Jalan Soedirman','Klinik',N'Kecamatan Purwokerto Selatan',1),
('D0000000-0000-0000-0000-000000000003',N'Klinik Utama Rawat Inap Amanda','Klinik',N'Kecamatan Purwokerto Selatan',1);

/* Ambang contoh — nilai resmi */
INSERT INTO dbo.ref_kategori_penghasilan VALUES
(1, 0,          530000, 'Rendah'),
(2, 1850000,    9000000, 'Menengah'),
(3, 9000000,    NULL,    'Tinggi');

INSERT INTO dbo.kartu_keluarga (no_kk, alamat, dusun, rt, rw, desa, kecamatan, status_desil,
       kepemilikan_toilet, kondisi_rumah, sumber_air_bersih, penghasilan_total) VALUES
('3302240101010001','Jl. Beringin','Perum Berkoh Indah','01','05','Berkoh','Purwokerto Selatan',9,0,'Layak','PDAM',2500000),
('3302240101010002','Jl. Beringin','Perum Berkoh Indah','02','05','Berkoh','Purwokerto Selatan',9,1,'Layak','Sumur gali tertutup',5000000),
('3302240101010003','Jl. Beringin','Perum Berkoh Indah','05','05','Berkoh','Purwokerto Selatan',8,0,'Layak','PDAM',6500000),
('3302240101010004','Jl. Beringin','Perum Berkoh Indah','04','05','Berkoh','Purwokerto Selatan',9,1,'Semi Layak','Sumur gali terbuka',900000),
('3301210101010005','Jl. Beringin','Perum Berkoh Indah','03','05','Berkoh','Purwokerto Selatan',10,1,'Layak','PDAM',20500000),
('3313010101010006','Jl. Beringin','Perum Berkoh Indah','06','05','Berkoh','Purwokerto Selatan',NULL,NULL,NULL,NULL,NULL);

INSERT INTO dbo.warga (warga_id, no_kk, nik, nama, tanggal_lahir, jenis_kelamin, hubungan_keluarga, pekerjaan, penghasilan_individu) VALUES
('C0000000-0000-0000-0000-000000000101','3302240101010001','3313010000000101','Hermawan','1990-02-11','Laki-laki','Kepala Keluarga','Pegawai Negeri Sipil',2500000),
('C0000000-0000-0000-0000-000000000102','3302240101010001','3313010000000102','Ratna','1995-07-21','Perempuan','Istri','Ibu rumah tangga',0),
('C0000000-0000-0000-0000-000000000103','3302240101010001','3313010000000103','Ceisya','2023-05-10','Perempuan','Anak',NULL,NULL),

('C0000000-0000-0000-0000-000000000201','3302240101010002','3313010000000201','Rizki Yulianto','1988-04-02','Laki-laki','Kepala Keluarga','Wiraswasta',5000000),
('C0000000-0000-0000-0000-000000000202','3302240101010002','3313010000000202','Aisyah Putri','1993-01-30','Perempuan','Istri','Ibu rumah tangga',0),
('C0000000-0000-0000-0000-000000000203','3302240101010002','3313010000000203','Jazzy Tasbiha','2022-02-10','Perempuan','Anak',NULL,NULL),

('C0000000-0000-0000-0000-000000000301','3302240101010003','3313010000000301','Mahendra','1987-09-09','Laki-laki','Kepala Keluarga','Karyawan swasta',4000000),
('C0000000-0000-0000-0000-000000000302','3302240101010003','3313010000000302','Dina Astri','1992-12-12','Perempuan','Istri','Guru', 2500000),
('C0000000-0000-0000-0000-000000000303','3302240101010003','3313010000000303','Kinnas Prasa','2026-08-01','Perempuan','Anak',NULL,NULL),

('C0000000-0000-0000-0000-000000000401','3302240101010004','3313010000000401','Berli Irfando','1985-03-03','Laki-laki','Kepala Keluarga','Buruh tani',900000),
('C0000000-0000-0000-0000-000000000402','3302240101010004','3313010000000402','Citra Anggun','1998-06-06','Perempuan','Istri','Ibu rumah tangga',0),
('C0000000-0000-0000-0000-000000000403','3302240101010004','3313010000000403','Shareen Shafza','2023-06-01','Perempuan','Anak',NULL,NULL),

('C0000000-0000-0000-0000-000000000501','3301210101010005','3313010000000501','Latief','1995-10-10','Laki-laki','Kepala Keluarga','Karyawan BUMN',12000000),
('C0000000-0000-0000-0000-000000000503','3301210101010005','3313010000000503','Arfian Putri','1996-03-15','Perempuan','Istri','Akuntan',8500000),

('C0000000-0000-0000-0000-000000000104','3302240101010001','3313010000000104','Sumarni','1955-04-17','Perempuan','Famili Lain',NULL,NULL),
('C0000000-0000-0000-0000-000000000404','3302240101010004','3313010000000404','Karto Susilo','1950-08-20','Laki-laki','Famili Lain','Petani',300000);

/* Akun sistem (tabel sistem) — terpisah dari data petugas/warga */
INSERT INTO dbo.pengguna (user_id, user_name, password_hash, peran, petugas_id, warga_id)
VALUES
('B9000000-0000-0000-0000-000000000001','kaderNovita01','$2b$12$03l4KZp6X1bfHd.GMTrWBOx6qBSp/OiQ/2Wjmh0fDEXvEdswSloAa','Super User','A0000000-0000-0000-0000-000000000001',NULL),
('B9000000-0000-0000-0000-000000000002','kaderEndah02',' $2b$12$6/B3kq9uzOMk2LhJ4dW1AO8GGZ03lEuNqctqqk1o3Qo5XzPzOlM0C','User (Kader)','A0000000-0000-0000-0000-000000000002',NULL),
('B9000000-0000-0000-0000-000000000003', 'kaderListiyani03',' $2b$12$6/B3kq9uzOMk2LhJ4dW1AO8GGZ03lEuNqctqqk1o3Qo5XzPzOlM0C','User (Kader)','A0000000-0000-0000-0000-000000000003',NULL),
('B9000000-0000-0000-0000-000000000004','kaderSuwanti04',' $2b$12$6/B3kq9uzOMk2LhJ4dW1AO8GGZ03lEuNqctqqk1o3Qo5XzPzOlM0C','User (Kader)','A0000000-0000-0000-0000-000000000004',NULL),
('B9000000-0000-0000-0000-000000000005','kaderTitin03',' $2b$12$6/B3kq9uzOMk2LhJ4dW1AO8GGZ03lEuNqctqqk1o3Qo5XzPzOlM0C','User (Kader)','A0000000-0000-0000-0000-000000000005',NULL);

/* Subclass: hanya atribut khusus; identitas diwarisi dari WARGA */
INSERT INTO dbo.balita (warga_id, nama_orang_tua, berat_badan_lahir, panjang_badan_lahir) VALUES
('C0000000-0000-0000-0000-000000000103','Ratna',3.30,49.0),
('C0000000-0000-0000-0000-000000000203','Aisyah Putri',3.00,48.0),
('C0000000-0000-0000-0000-000000000303','Dina Astri',3.20,48.0),
('C0000000-0000-0000-0000-000000000403','Citra Anggun',2.59,46.0);

INSERT INTO dbo.ibu (warga_id, status_ibu, nama_suami, kehamilan_ke) VALUES
('C0000000-0000-0000-0000-000000000102','Hamil','Hermawan',2),
('C0000000-0000-0000-0000-000000000202','Hamil','Rizki Yulianto',2),
('C0000000-0000-0000-0000-000000000302','Menyusui','Mahendra',1),
('C0000000-0000-0000-0000-000000000402','Hamil','Berli Irfando',2);

INSERT INTO dbo.lansia (warga_id, status_perkawinan) VALUES
('C0000000-0000-0000-0000-000000000104','Cerai Mati'),
('C0000000-0000-0000-0000-000000000404','Cerai Mati');

INSERT INTO dbo.master_logistik (logistik_id, nama_barang, kategori, stok_tersedia, satuan) VALUES
('F0000000-0000-0000-0000-000000000001','Vitamin A Biru 100.000 IU','Vitamin',20,'Kapsul'),
('F0000000-0000-0000-0000-000000000002','Vitamin A Merah 200.000 IU','Vitamin',30,'Kapsul'),
('F0000000-0000-0000-0000-000000000003','Tablet Tambah Darah','Suplemen',100,'Tablet');

INSERT INTO dbo.jadwal_kegiatan (jadwal_id, nama_kegiatan, jenis_kegiatan, tanggal_pelaksanaan, lokasi, penanggung_jawab) VALUES
('E0000000-0000-0000-0000-000000000001','Posyandu Balita RW 05 - Oktober','Posyandu','2026-10-15','Balai RW 05','A0000000-0000-0000-0000-000000000001'),
('E0000000-0000-0000-0000-000000000002','Posyandu Balita RW 05 - November','Posyandu','2026-11-12','Balai RW 05','A0000000-0000-0000-0000-000000000001'),
('E0000000-0000-0000-0000-000000000003','Sosialisasi Penyakit Anak','Penyuluhan Kesehatan','2026-11-16','Kantor Kelurahan Berkoh','A0000000-0000-0000-0000-000000000006'),
('E0000000-0000-0000-0000-000000000004','Sosialisasi Isi Piringku','Penyuluhan Kesehatan','2026-11-20','Kantor Kelurahan Berkoh','A0000000-0000-0000-0000-000000000007'),
('E0000000-0000-0000-0000-000000000005','Posyandu Balita RW 05 - Desember','Posyandu','2026-12-10','Balai RW 05','A0000000-0000-0000-0000-000000000001'),
('E0000000-0000-0000-0000-000000000006','Posyandu Lansia RW 05 - Desember','Posyandu','2026-12-13','Balai RW 05','A0000000-0000-0000-0000-000000000003');


INSERT INTO dbo.pemeriksaan_balita
(pemeriksaan_balita_id, balita_id, jadwal_id, tanggal_periksa, berat_badan, tinggi_panjang_badan, lila, lika,
 status_berat_badan, kategori_stunting, kategori_bbu, kategori_bb_tb, kategori_lila, kategori_lika, dicatat_oleh)
VALUES
-- Ceisya, Oktober: 41 bulan
('10000000-0000-0000-0000-000000000001','C0000000-0000-0000-0000-000000000103','E0000000-0000-0000-0000-000000000001','2026-10-15',12.5,91.0,14.0,48.5,'B','Normal','Berat badan normal','Gizi baik','Normal','Normal','A0000000-0000-0000-0000-000000000002'),
-- Ceisya, November: 42 bulan
('10000000-0000-0000-0000-000000000002','C0000000-0000-0000-0000-000000000103','E0000000-0000-0000-0000-000000000002','2026-11-12',12.7,92.0,14.0,48.5,'B','Normal','Berat badan normal','Gizi baik','Normal','Normal','A0000000-0000-0000-0000-000000000002'),
-- Jazzy Tasbiha: 57 bulan
('10000000-0000-0000-0000-000000000003','C0000000-0000-0000-0000-000000000203','E0000000-0000-0000-0000-000000000002','2026-11-12',14.0,100.0,14.5,50.0,'B','Normal','Berat badan normal','Gizi baik','Normal','Normal','A0000000-0000-0000-0000-000000000002'),
-- Kinnas Prasa: 3 bulan
('10000000-0000-0000-0000-000000000004','C0000000-0000-0000-0000-000000000303','E0000000-0000-0000-0000-000000000002','2026-11-12',5.8,60.0,12.5,40.0,'B','Normal','Berat badan normal','Gizi baik','Normal','Normal','A0000000-0000-0000-0000-000000000002'),
-- Shareen Shafza: 41 bulan, perlu pemantauan
('10000000-0000-0000-0000-000000000005','C0000000-0000-0000-0000-000000000403','E0000000-0000-0000-0000-000000000002','2026-11-12',11.0,88.0,13.0,48.0,'B','Pendek','Berat badan kurang','Gizi baik','Normal','Normal','A0000000-0000-0000-0000-000000000003');


INSERT INTO dbo.pemeriksaan_ibu
(pemeriksaan_ibu_id, ibu_id, jadwal_id, tanggal_periksa, berat_badan, lila, tekanan_darah_sistolik,
 tekanan_darah_diastolik, usia_kehamilan_minggu, bb_sesuai_kurva_kia, td_sesuai_kurva_kia, hb, status_kek, status_anemia, dicatat_oleh)
VALUES
-- Ratna: hamil 20 minggu
('20000000-0000-0000-0000-000000000001','C0000000-0000-0000-0000-000000000102','E0000000-0000-0000-0000-000000000002','2026-11-12',50.0,24.5,110,70,20,1,1,11.5,'Tidak Berisiko','Tidak Anemia','A0000000-0000-0000-0000-000000000002'),
-- Aisyah: hamil 28 minggu
('20000000-0000-0000-0000-000000000002','C0000000-0000-0000-0000-000000000202','E0000000-0000-0000-0000-000000000002','2026-11-12',58.0,26.0,115,75,28,1,1,12.0,'Tidak Berisiko','Tidak Anemia','A0000000-0000-0000-0000-000000000002'),
-- Dina: menyusui, bukan ibu hamil
('20000000-0000-0000-0000-000000000003','C0000000-0000-0000-0000-000000000302','E0000000-0000-0000-0000-000000000002','2026-11-12',55.0,25.0,120,80,NULL,NULL,NULL,NULL,'Tidak Berisiko',NULL,'A0000000-0000-0000-0000-000000000003'),
-- Citra: hamil 32 minggu
('20000000-0000-0000-0000-000000000004','C0000000-0000-0000-0000-000000000402','E0000000-0000-0000-0000-000000000002','2026-11-12',52.0,24.0,120,80,32,1,1,12.0,'Tidak Berisiko','Tidak Anemia','A0000000-0000-0000-0000-000000000003');


INSERT INTO dbo.pemeriksaan_lansia
(pemeriksaan_lansia_id, lansia_id, jadwal_id, tanggal_periksa, berat_badan, tinggi_badan, lingkar_perut, imt, tekanan_darah_sistolik, tekanan_darah_diastolik, gula_darah,
 hitung_jari_kanan, hitung_jari_kiri, berbisik_kanan, berbisik_kiri, merokok, bungkus_per_tahun, puma_gejala_1, puma_gejala_2, puma_gejala_3, puma_gejala_4,
 kategori_imt, kategori_tekanan_darah, kategori_gula_darah, skor_puma, dicatat_oleh)
VALUES
-- Sumarni: 71 tahun
('50000000-0000-0000-0000-000000000001','C0000000-0000-0000-0000-000000000104','E0000000-0000-0000-0000-000000000006','2026-12-13',52.0,150.0,82.0,23.1,125,80,110.0,
'Normal','Normal','Normal','Normal',0,NULL,0,0,0,0,'Normal','Normal','Normal',0,'A0000000-0000-0000-0000-000000000003'),

-- Karto: 76 tahun
('50000000-0000-0000-0000-000000000002','C0000000-0000-0000-0000-000000000404','E0000000-0000-0000-0000-000000000006','2026-12-13',55.0,160.0,85.0,21.5,130,80,115.0,
 'Normal','Normal','Normal','Normal',0,NULL,0,0,0,0,'Normal','Normal','Normal',0,'A0000000-0000-0000-0000-000000000003');

INSERT INTO dbo.isian_pendukung (isian_id, pemeriksaan_lansia_id, tbc_batuk, tbc_demam, tbc_bb_tidak_naik, tbc_kontak_erat, status_rujukan, catatan_edukasi) VALUES
('30000000-0000-0000-0000-000000000005','50000000-0000-0000-0000-000000000001',0,0,0,0,0,N'Edukasi diet rendah garam dan gula'),
('30000000-0000-0000-0000-000000000006','50000000-0000-0000-0000-000000000002',1,0,1,0,1,N'Batuk lebih dari 2 minggu, perokok aktif');

INSERT INTO dbo.isian_pendukung (isian_id, pemeriksaan_balita_id, pemeriksaan_ibu_id, status_rujukan, catatan_edukasi) VALUES
('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002',NULL,1,N'Edukasi MP-ASI'),
('30000000-0000-0000-0000-000000000002',NULL,'20000000-0000-0000-0000-000000000001',1,N'Edukasi gizi ibu hamil'),
('30000000-0000-0000-0000-000000000003',NULL,'20000000-0000-0000-0000-000000000004',1,N'Tekanan darah tinggi'),
('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000005', NULL, 0, N'Edukasi gizi seimbang dan pemantauan pertumbuhan balita');


INSERT INTO dbo.layanan
(balita_id, ibu_id, jadwal_id, logistik_id, jumlah_diberikan, tanggal_layanan, jenis_layanan, jumlah_tablet, konsumsi_harian, keterangan, dicatat_oleh)
VALUES
-- Vitamin A untuk Jazzy
('C0000000-0000-0000-0000-000000000203',NULL,'E0000000-0000-0000-0000-000000000002','F0000000-0000-0000-0000-000000000002',1, '2026-11-12', 'Vitamin A', NULL, NULL,N'Vitamin A merah','A0000000-0000-0000-0000-000000000002'),
-- TTD untuk Ratna
(NULL,'C0000000-0000-0000-0000-000000000102','E0000000-0000-0000-0000-000000000002','F0000000-0000-0000-0000-000000000003',30, '2026-11-12', 'TTD', 30, 1,N'TTD 30 tablet','A0000000-0000-0000-0000-000000000002'),
-- TTD untuk Aisyah
(NULL,'C0000000-0000-0000-0000-000000000202','E0000000-0000-0000-0000-000000000002','F0000000-0000-0000-0000-000000000003',30, '2026-11-12', 'TTD', 30, 1,N'TTD 30 tablet','A0000000-0000-0000-0000-000000000002'),
-- TTD untuk Citra
(NULL,'C0000000-0000-0000-0000-000000000402','E0000000-0000-0000-0000-000000000002','F0000000-0000-0000-0000-000000000003',30, '2026-11-12', 'TTD', 30, 1,N'TTD 30 tablet','A0000000-0000-0000-0000-000000000003');


INSERT INTO dbo.partisipasi_kegiatan
(jadwal_id, warga_id, waktu_hadir, dicatat_oleh, keterangan)
VALUES
('E0000000-0000-0000-0000-000000000003','C0000000-0000-0000-0000-000000000401','2026-11-16 09:00:00','A0000000-0000-0000-0000-000000000003',N'Mengikuti sosialisasi penyakit anak');


/* bertugas: petugas yang bertugas pada tiap kegiatan */
INSERT INTO dbo.petugas_kegiatan (jadwal_id, petugas_id, peran_tugas) VALUES
('E0000000-0000-0000-0000-000000000001','A0000000-0000-0000-0000-000000000001','Penanggung Jawab'),
('E0000000-0000-0000-0000-000000000001','A0000000-0000-0000-0000-000000000002','Pemeriksa'),
('E0000000-0000-0000-0000-000000000001','A0000000-0000-0000-0000-000000000003','Pencatat'),

('E0000000-0000-0000-0000-000000000002','A0000000-0000-0000-0000-000000000001','Penanggung Jawab'),
('E0000000-0000-0000-0000-000000000002','A0000000-0000-0000-0000-000000000004','Pemeriksa'),
('E0000000-0000-0000-0000-000000000002','A0000000-0000-0000-0000-000000000005','Pencatat'),

('E0000000-0000-0000-0000-000000000003','A0000000-0000-0000-0000-000000000003','Penanggung Jawab'),
('E0000000-0000-0000-0000-000000000003','A0000000-0000-0000-0000-000000000006','Penyuluh'),

('E0000000-0000-0000-0000-000000000004','A0000000-0000-0000-0000-000000000002','Penanggung Jawab'),
('E0000000-0000-0000-0000-000000000004','A0000000-0000-0000-0000-000000000007','Penyuluh'),

('E0000000-0000-0000-0000-000000000005','A0000000-0000-0000-0000-000000000001','Penanggung Jawab'),
('E0000000-0000-0000-0000-000000000005','A0000000-0000-0000-0000-000000000002','Pemeriksa'),
('E0000000-0000-0000-0000-000000000005','A0000000-0000-0000-0000-000000000003','Pencatat'),

('E0000000-0000-0000-0000-000000000006','A0000000-0000-0000-0000-000000000001','Penanggung Jawab'),
('E0000000-0000-0000-0000-000000000006','A0000000-0000-0000-0000-000000000004','Pemeriksa'),
('E0000000-0000-0000-0000-000000000006','A0000000-0000-0000-0000-000000000005','Pencatat');
GO

/* ===================== Bagian B. Contoh nilai ambang aturan_kategori (bukan standar resmi, untuk uji) =====================
   Kategori balita TB/U (stunting), BB/U, BB/PB-TB, dan lingkar kepala TIDAK memakai tabel ini:
   dihitung di backend dengan z-score WHO sesuai Permenkes No. 2 Tahun 2020 (StandarAntropometri.ts). */
IF NOT EXISTS (SELECT 1 FROM dbo.aturan_kategori)
INSERT INTO dbo.aturan_kategori (indikator, jenis_kelamin, usia_min, usia_max, nilai_min, nilai_max, kategori) VALUES
('LILA balita',    NULL, 6, 59, NULL,  11.49, 'Gizi buruk'),
('LILA balita',    NULL, 6, 59, 11.50, 12.49, 'Gizi kurang'),
('LILA balita',    NULL, 6, 59, 12.50, NULL,  'Normal'),
('LILA ibu hamil', NULL, NULL, NULL, NULL,  23.49, 'Berisiko KEK'),
('LILA ibu hamil', NULL, NULL, NULL, 23.50, NULL,  'Tidak Berisiko'),
('Hb',             NULL, NULL, NULL, NULL,  10.99, 'Anemia'),
('Hb',             NULL, NULL, NULL, 11.00, NULL,  'Tidak Anemia'),
('IMT lansia',     NULL, NULL, NULL, NULL,  16.99, 'Sangat kurus'),
('IMT lansia',     NULL, NULL, NULL, 17.00, 18.49, 'Kurus'),
('IMT lansia',     NULL, NULL, NULL, 18.50, 25.00, 'Normal'),
('IMT lansia',     NULL, NULL, NULL, 25.01, 27.00, 'Gemuk'),
('IMT lansia',     NULL, NULL, NULL, 27.01, NULL,  'Obesitas'),
('Tekanan darah',  NULL, NULL, NULL, NULL,  89.99, 'Rendah'),
('Tekanan darah',  NULL, NULL, NULL, 90.00, 139.99,'Normal'),
('Tekanan darah',  NULL, NULL, NULL, 140.00, NULL, 'Tinggi'),
('Gula darah',     NULL, NULL, NULL, NULL,  69.99, 'Rendah'),
('Gula darah',     NULL, NULL, NULL, 70.00, 199.99,'Normal'),
('Gula darah',     NULL, NULL, NULL, 200.00, NULL, 'Tinggi');
GO

/* ===================== Bagian C. Password uji =====================
   Hash di Bagian A tidak diketahui password-nya, dan sebagian diawali spasi.
   Semua akun Koordinator (Super User) dan Kader diberi password Posyandu#2026 (bcrypt cost 12).
   Lewati bagian ini bila password asli kelompok masih dipakai. */
UPDATE dbo.pengguna
   SET password_hash = '$2a$12$XaAodngambveEz10LzTbN.8KHXTRu8N1fUIIK2flfDPwwzLWw/8re',
       update_at = SYSDATETIME()
 WHERE peran IN ('Super User', 'User (Kader)')
   AND EXISTS (SELECT 1 FROM dbo.kader kd WHERE kd.petugas_id = dbo.pengguna.petugas_id);  -- hanya Koordinator dan Kader
GO

/* ===================== Bagian D. Kader tanpa akun (dummy) =====================
   Semua kader di Bagian A sudah punya akun, sehingga pilihan "kader terdaftar" di SCR-18 akan kosong.
   Satu kader dummy ini dipakai untuk mencoba Tambah Akun dari kader terdaftar. */
IF NOT EXISTS (SELECT 1 FROM dbo.petugas WHERE petugas_id = 'A0000000-0000-0000-0000-000000000008')
BEGIN
    INSERT INTO dbo.petugas (petugas_id, nama, jenis_kelamin, kontak, instansi_asal)
    VALUES ('A0000000-0000-0000-0000-000000000008', 'Ibu Sari', 'Perempuan', '081200000008', N'Posyandu RW 05');
    INSERT INTO dbo.kader (petugas_id, jabatan_kader, tanggal_bergabung)
    VALUES ('A0000000-0000-0000-0000-000000000008', N'Kader', '2026-11-01');
END;
GO

/* ===================== Ringkasan akun untuk login aplikasi ===================== */
SELECT u.user_name, u.peran, p.nama AS nama_petugas, 'Posyandu#2026' AS password_uji
  FROM dbo.pengguna u JOIN dbo.petugas p ON p.petugas_id = u.petugas_id
 WHERE EXISTS (SELECT 1 FROM dbo.kader kd WHERE kd.petugas_id = p.petugas_id)
 ORDER BY u.peran DESC, u.user_name;
PRINT 'Seed selesai';
GO
