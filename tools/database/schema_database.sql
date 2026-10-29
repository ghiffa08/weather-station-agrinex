-- ====================================================================
-- Schema Database SQLite / PostgreSQL - Validasi ETo Weather Station IoT
-- Studi Pendahuluan Validasi ETo (ESP32 + DHT22 + BH1750 vs BMKG)
-- ====================================================================

PRAGMA foreign_keys = ON;

-- --------------------------------------------------------------------
-- 1. Tabel Data Node Sensor IoT (Interval 15 Menit = 96 baris/hari)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS data_node_sensor (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL UNIQUE,          -- Format ISO 8601 WIB: YYYY-MM-DD HH:MM:SS
    suhu_c REAL NOT NULL CHECK (suhu_c BETWEEN 10.0 AND 45.0),
    rh_persen REAL NOT NULL CHECK (rh_persen BETWEEN 0.0 AND 100.0),
    radiasi_lux REAL NOT NULL CHECK (radiasi_lux >= 0.0),
    status_daya TEXT NOT NULL DEFAULT 'ok' CHECK (status_daya IN ('ok', 'low_battery', 'restart')),
    catatan TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sensor_timestamp ON data_node_sensor(timestamp);

-- --------------------------------------------------------------------
-- 2. Tabel Data Cuaca Harian BMKG (Stasiun Kertajati 96791)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS data_bmkg_harian (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanggal TEXT NOT NULL UNIQUE,            -- Format ISO Date: YYYY-MM-DD
    tmax_c REAL NOT NULL,
    tmin_c REAL NOT NULL,
    tmean_c REAL NOT NULL,
    rh_persen REAL NOT NULL CHECK (rh_persen BETWEEN 0.0 AND 100.0),
    lama_penyinaran_jam REAL CHECK (lama_penyinaran_jam BETWEEN 0.0 AND 12.0),
    angin_ms REAL CHECK (angin_ms >= 0.0),
    rs_mjm2hari REAL DEFAULT NULL,          -- Radiasi surya hasil konversi Angstrom-Prescott (a=0.25, b=0.50)
    catatan TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bmkg_tanggal ON data_bmkg_harian(tanggal);

-- --------------------------------------------------------------------
-- 3. Tabel Log Deployment & Incident Node IoT
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deployment_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanggal TEXT NOT NULL,                  -- Format ISO Date: YYYY-MM-DD
    jam TEXT NOT NULL,                      -- Format HH:MM
    jenis_kejadian TEXT NOT NULL CHECK (jenis_kejadian IN ('restart', 'maintenance', 'anomali', 'catatan')),
    durasi_menit INTEGER DEFAULT NULL CHECK (durasi_menit IS NULL OR durasi_menit >= 0),
    deskripsi TEXT NOT NULL,
    berdampak_pada TEXT NOT NULL,           -- Kolom/sensor terdampak
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deploy_tanggal ON deployment_log(tanggal);
