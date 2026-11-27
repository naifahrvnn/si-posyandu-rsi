/* =====================================================================
   03_security.sql — keamanan basis data. Jalankan setelah 02_objects.sql.
   Aman dijalankan ulang (login, user, role, dan kebijakan diperiksa dulu sebelum dibuat).
   Kata sandi di bawah hanya contoh lingkungan uji; ganti di produksi.

   Bagian A. Role basis data kelompok: role_super_user dan role_user_kader (GRANT/REVOKE/DENY),
             dipakai skrip uji 05_uji_hak_akses.sql.
   Bagian B. Login aplikasi web: posyandu_app (dipakai backend Node.js, isi DB_PASSWORD di .env).
   Bagian C. Row-Level Security: DELETE hanya Koordinator (Super User).
   Bagian D. Row-Level Security: tambah/ubah akun hanya Super User; Kader hanya akunnya sendiri.
   Bagian E. Penyesuaian database lama: jenis log 'Ditolak'.
   ===================================================================== */
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

/* ===================== Bagian A. Role basis data kelompok ===================== */
USE master;
GO
IF SUSER_ID(N'app_super_user') IS NULL CREATE LOGIN app_super_user WITH PASSWORD = 'SuperUser2026!', CHECK_POLICY = ON;
IF SUSER_ID(N'app_user_kader') IS NULL CREATE LOGIN app_user_kader WITH PASSWORD = 'UserKader2026!', CHECK_POLICY = ON;
GO

USE posyandu_db;
GO

IF USER_ID(N'usr_super_user') IS NULL CREATE USER usr_super_user FOR LOGIN app_super_user;
IF USER_ID(N'usr_user_kader') IS NULL CREATE USER usr_user_kader FOR LOGIN app_user_kader;
GO

/* ---------- Admin 1: Super Admin / Koordinator ---------- */
IF DATABASE_PRINCIPAL_ID(N'role_super_user') IS NULL CREATE ROLE role_super_user;
GRANT CONTROL ON SCHEMA::dbo TO role_super_user;          -- setara ALL PRIVILEGES pada skema
DENY  UPDATE, DELETE ON dbo.log_aktivitas TO role_super_user; -- log tetap append-only
ALTER ROLE role_super_user ADD MEMBER usr_super_user;
GO

/* ---------- Admin 2: Admin Kader Kesehatan (SELECT, INSERT, UPDATE) ---------- */
IF DATABASE_PRINCIPAL_ID(N'role_user_kader') IS NULL CREATE ROLE role_user_kader;
GRANT SELECT, INSERT, UPDATE ON dbo.kartu_keluarga       TO role_user_kader;
GRANT SELECT, INSERT, UPDATE ON dbo.warga                TO role_user_kader;
GRANT SELECT, INSERT, UPDATE ON dbo.balita               TO role_user_kader;
GRANT SELECT, INSERT, UPDATE ON dbo.ibu                  TO role_user_kader;
GRANT SELECT, INSERT, UPDATE ON dbo.lansia               TO role_user_kader;
GRANT SELECT, INSERT, UPDATE ON dbo.jadwal_kegiatan      TO role_user_kader;
GRANT SELECT, INSERT, UPDATE ON dbo.partisipasi_kegiatan TO role_user_kader;
GRANT SELECT, INSERT, UPDATE ON dbo.pemeriksaan_balita   TO role_user_kader;
GRANT SELECT, INSERT, UPDATE ON dbo.pemeriksaan_ibu      TO role_user_kader;
GRANT SELECT, INSERT, UPDATE ON dbo.pemeriksaan_lansia   TO role_user_kader;
GRANT SELECT, INSERT, UPDATE ON dbo.isian_pendukung      TO role_user_kader;
GRANT SELECT, INSERT, UPDATE ON dbo.layanan              TO role_user_kader;
GRANT SELECT, INSERT         ON dbo.rujukan              TO role_user_kader;  -- validasi oleh Admin 1
GRANT SELECT, INSERT, UPDATE ON dbo.petugas_kegiatan     TO role_user_kader;
GRANT SELECT ON dbo.petugas                  TO role_user_kader;
GRANT SELECT ON dbo.kader                    TO role_user_kader;
GRANT SELECT ON dbo.tenaga_kesehatan         TO role_user_kader;
GRANT SELECT ON dbo.faskes                   TO role_user_kader;
GRANT SELECT ON dbo.master_logistik          TO role_user_kader;
GRANT SELECT ON dbo.aturan_kategori          TO role_user_kader;
GRANT SELECT ON dbo.ref_kategori_penghasilan TO role_user_kader;
GRANT SELECT ON dbo.v_profil_desil_keluarga  TO role_user_kader;
GRANT SELECT (user_id, peran, petugas_id) ON dbo.pengguna TO role_user_kader; -- tabel sistem: tanpa password_hash
GRANT EXECUTE ON dbo.sp_catat_vitamin_bayi   TO role_user_kader;
GRANT EXECUTE ON dbo.fn_hitung_usia_bulan    TO role_user_kader;
GRANT EXECUTE ON dbo.fn_kategori_penghasilan TO role_user_kader;
/* Stok hanya boleh berubah lewat SP (ownership chaining), tidak lewat UPDATE langsung */
REVOKE UPDATE ON dbo.master_logistik FROM role_user_kader;
ALTER ROLE role_user_kader ADD MEMBER usr_user_kader;
GO

/* ===================== Bagian B. Login aplikasi web (backend) ===================== */
USE master;
GO
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'posyandu_app')
    CREATE LOGIN posyandu_app WITH PASSWORD = N'GantiPasswordKuat_2026', CHECK_POLICY = ON;
GO
USE posyandu_db;
GO
IF USER_ID(N'posyandu_app') IS NULL
    CREATE USER posyandu_app FOR LOGIN posyandu_app;
GO
/* Backend melayani Kader dan Super User, jadi perlu baca/tulis data (termasuk sesi dan log login) */
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO posyandu_app;
DENY UPDATE, DELETE ON dbo.log_aktivitas TO posyandu_app;   -- BR-07
GO

/* ===================== Bagian C. RLS: DELETE hanya Koordinator (BLOCK PREDICATE ... BEFORE DELETE) =====================
   Backend mengisi SESSION_CONTEXT('app_peran') di setiap transaksi (Database.transaksi()).
   - Login backend posyandu_app: DELETE hanya diizinkan bila app_peran = 'Super User' (Koordinator).
     Tanpa konteks peran (NULL) atau peran Kader -> DELETE ditolak basis data (0 baris terhapus / error).
   - Login lain (mis. sa/admin di SSMS dan skrip uji 05/06) tidak dibatasi kebijakan ini. */
IF EXISTS (SELECT 1 FROM sys.security_policies WHERE name = N'kebijakan_hapus_koordinator')
    DROP SECURITY POLICY dbo.kebijakan_hapus_koordinator;
GO
CREATE OR ALTER FUNCTION dbo.fn_rls_boleh_hapus()
RETURNS TABLE
WITH SCHEMABINDING
AS
RETURN
    SELECT 1 AS boleh
     WHERE USER_NAME() <> N'posyandu_app'
        OR CAST(SESSION_CONTEXT(N'app_peran') AS VARCHAR(20)) = 'Super User';
GO
CREATE SECURITY POLICY dbo.kebijakan_hapus_koordinator
    ADD BLOCK PREDICATE dbo.fn_rls_boleh_hapus() ON dbo.warga BEFORE DELETE,
    ADD BLOCK PREDICATE dbo.fn_rls_boleh_hapus() ON dbo.kartu_keluarga BEFORE DELETE,
    ADD BLOCK PREDICATE dbo.fn_rls_boleh_hapus() ON dbo.balita BEFORE DELETE,
    ADD BLOCK PREDICATE dbo.fn_rls_boleh_hapus() ON dbo.ibu BEFORE DELETE,
    ADD BLOCK PREDICATE dbo.fn_rls_boleh_hapus() ON dbo.lansia BEFORE DELETE,
    ADD BLOCK PREDICATE dbo.fn_rls_boleh_hapus() ON dbo.pemeriksaan_balita BEFORE DELETE,
    ADD BLOCK PREDICATE dbo.fn_rls_boleh_hapus() ON dbo.pemeriksaan_ibu BEFORE DELETE,
    ADD BLOCK PREDICATE dbo.fn_rls_boleh_hapus() ON dbo.pemeriksaan_lansia BEFORE DELETE,
    ADD BLOCK PREDICATE dbo.fn_rls_boleh_hapus() ON dbo.isian_pendukung BEFORE DELETE,
    ADD BLOCK PREDICATE dbo.fn_rls_boleh_hapus() ON dbo.rujukan BEFORE DELETE,
    ADD BLOCK PREDICATE dbo.fn_rls_boleh_hapus() ON dbo.layanan BEFORE DELETE,
    ADD BLOCK PREDICATE dbo.fn_rls_boleh_hapus() ON dbo.jadwal_kegiatan BEFORE DELETE,
    ADD BLOCK PREDICATE dbo.fn_rls_boleh_hapus() ON dbo.partisipasi_kegiatan BEFORE DELETE,
    ADD BLOCK PREDICATE dbo.fn_rls_boleh_hapus() ON dbo.petugas_kegiatan BEFORE DELETE
    WITH (STATE = ON);
GO

/* ===================== Bagian D. RLS akun (FSD-2.3, FSD-2.4, BR-04, BR-05) =====================
   - pengguna: tambah akun hanya Super User; ubah hanya Super User atau pemilik akun itu sendiri
     (app_user_id = user_id), mis. Ganti Password dan pencatatan last_login saat login.
   - petugas dan kader: tambah/ubah hanya Super User (Tambah Akun dengan petugas baru, ubah nama akun).
   Login lain (sa/admin di SSMS) tidak dibatasi. */
IF EXISTS (SELECT 1 FROM sys.security_policies WHERE name = N'kebijakan_kelola_akun')
    DROP SECURITY POLICY dbo.kebijakan_kelola_akun;
GO
CREATE OR ALTER FUNCTION dbo.fn_rls_boleh_kelola_akun()
RETURNS TABLE
WITH SCHEMABINDING
AS
RETURN
    SELECT 1 AS boleh
     WHERE USER_NAME() <> N'posyandu_app'
        OR CAST(SESSION_CONTEXT(N'app_peran') AS VARCHAR(20)) = 'Super User';
GO
CREATE OR ALTER FUNCTION dbo.fn_rls_boleh_ubah_akun(@user_id UNIQUEIDENTIFIER)
RETURNS TABLE
WITH SCHEMABINDING
AS
RETURN
    SELECT 1 AS boleh
     WHERE USER_NAME() <> N'posyandu_app'
        OR CAST(SESSION_CONTEXT(N'app_peran') AS VARCHAR(20)) = 'Super User'
        OR @user_id = TRY_CAST(CAST(SESSION_CONTEXT(N'app_user_id') AS NVARCHAR(36)) AS UNIQUEIDENTIFIER);
GO
CREATE SECURITY POLICY dbo.kebijakan_kelola_akun
    ADD BLOCK PREDICATE dbo.fn_rls_boleh_kelola_akun() ON dbo.pengguna AFTER INSERT,
    ADD BLOCK PREDICATE dbo.fn_rls_boleh_ubah_akun(user_id) ON dbo.pengguna BEFORE UPDATE,
    ADD BLOCK PREDICATE dbo.fn_rls_boleh_ubah_akun(user_id) ON dbo.pengguna AFTER UPDATE,
    ADD BLOCK PREDICATE dbo.fn_rls_boleh_kelola_akun() ON dbo.petugas AFTER INSERT,
    ADD BLOCK PREDICATE dbo.fn_rls_boleh_kelola_akun() ON dbo.petugas BEFORE UPDATE,
    ADD BLOCK PREDICATE dbo.fn_rls_boleh_kelola_akun() ON dbo.kader AFTER INSERT,
    ADD BLOCK PREDICATE dbo.fn_rls_boleh_kelola_akun() ON dbo.kader BEFORE UPDATE
    WITH (STATE = ON);
GO

/* ===================== Bagian E. Penyesuaian database lama =====================
   Jenis aktivitas 'Ditolak' (percobaan akses tanpa hak, ERR-AUTH-03) sudah ada di 01_schema.sql.
   Database yang dibuat sebelum versi ini disesuaikan di sini tanpa menghapus data. */
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints
                WHERE name = N'ck_log_jenis' AND definition LIKE N'%Ditolak%')
BEGIN
    ALTER TABLE dbo.log_aktivitas DROP CONSTRAINT ck_log_jenis;
    ALTER TABLE dbo.log_aktivitas ADD CONSTRAINT ck_log_jenis
        CHECK (jenis_aktivitas IN ('Login','Logout','Input','Edit','Delete','Ditolak'));
END;
GO
