import sqlite3
import csv
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", ".."))

DB_FILE = os.path.join(BASE_DIR, "database_eto.db")
SCHEMA_FILE = os.path.join(BASE_DIR, "schema_database.sql")
DATA_DIR = os.path.join(PROJECT_ROOT, "data")

def init_db():
    print(f"Menginisialisasi database SQLite: {DB_FILE}...")
    
    if os.path.exists(DB_FILE):
        os.remove(DB_FILE)

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    if os.path.exists(SCHEMA_FILE):
        with open(SCHEMA_FILE, "r", encoding="utf-8") as f:
            sql_script = f.read()
        cursor.executescript(sql_script)
        print("Schema database berhasil dibuat.")
    else:
        print(f"Error: File schema {SCHEMA_FILE} tidak ditemukan.")
        return

    # Load CSV Sample Data using standard csv module
    csv_mappings = [
        ("data_node_sensor.csv", "data_node_sensor", ["id", "timestamp", "suhu_c", "rh_persen", "radiasi_lux", "status_daya", "catatan"]),
        ("data_bmkg_harian.csv", "data_bmkg_harian", ["id", "tanggal", "tmax_c", "tmin_c", "tmean_c", "rh_persen", "lama_penyinaran_jam", "angin_ms", "rs_mjm2hari", "catatan"]),
        ("deployment_log.csv", "deployment_log", ["id", "tanggal", "jam", "jenis_kejadian", "durasi_menit", "deskripsi", "berdampak_pada"])
    ]

    for csv_name, table_name, columns in csv_mappings:
        csv_path = os.path.join(DATA_DIR, csv_name)
        if os.path.exists(csv_path):
            with open(csv_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                rows = []
                for row in reader:
                    vals = []
                    for col in columns:
                        val = row.get(col, None)
                        if val == "" or val is None:
                            vals.append(None)
                        else:
                            vals.append(val)
                    rows.append(vals)
                
                placeholders = ", ".join(["?"] * len(columns))
                col_names = ", ".join(columns)
                query = f"INSERT INTO {table_name} ({col_names}) VALUES ({placeholders})"
                cursor.executemany(query, rows)
                print(f"Berhasil mengimpor {len(rows)} baris dari {csv_name} ke tabel '{table_name}'.")

    conn.commit()
    conn.close()
    print(f"Database {DB_FILE} siap digunakan!")

if __name__ == "__main__":
    init_db()
