import serial
import matplotlib.pyplot as plt
import matplotlib.animation as animation
import sys

# Ganti ini dengan port serial ESP8266 (misalnya /dev/ttyUSB0 atau /dev/ttyACM0)
SERIAL_PORT = '/dev/ttyUSB0'
BAUD_RATE = 115200

try:
    ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
    print(f"Berhasil terhubung ke {SERIAL_PORT} pada baud rate {BAUD_RATE}")
except serial.SerialException as e:
    print(f"Error membuka port serial: {e}")
    print("Pastikan ESP8266 terhubung dan memiliki izin untuk mengakses port (contoh: sudo chmod a+rw /dev/ttyUSB0).")
    sys.exit(1)

# Inisialisasi array data
times = []
temperatures = []
humidities = []
wind_speeds = []

fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(10, 8))
fig.suptitle('Dashboard Visualisasi Data Weather Station', fontsize=16)

# Setup label aksis
ax1.set_ylabel('Suhu (°C)')
ax2.set_ylabel('Kelembapan (%)')
ax3.set_ylabel('Kecepatan Angin (km/h)')
ax3.set_xlabel('Waktu Aktif (detik)')

line_temp, = ax1.plot([], [], 'r-', marker='o', label='Suhu')
line_hum, = ax2.plot([], [], 'b-', marker='o', label='Kelembapan')
line_wind, = ax3.plot([], [], 'g-', marker='o', label='Kecepatan Angin')

ax1.legend(loc="upper right")
ax2.legend(loc="upper right")
ax3.legend(loc="upper right")

# Teks untuk menampilkan nilai real-time
text_temp = ax1.text(0.02, 0.85, 'Menunggu data...', transform=ax1.transAxes, fontsize=12, fontweight='bold', bbox=dict(facecolor='white', alpha=0.8, edgecolor='none'))
text_hum = ax2.text(0.02, 0.85, 'Menunggu data...', transform=ax2.transAxes, fontsize=12, fontweight='bold', bbox=dict(facecolor='white', alpha=0.8, edgecolor='none'))
text_wind = ax3.text(0.02, 0.85, 'Menunggu data...', transform=ax3.transAxes, fontsize=12, fontweight='bold', bbox=dict(facecolor='white', alpha=0.8, edgecolor='none'))

ax1.grid(True)
ax2.grid(True)
ax3.grid(True)

def update(frame):
    if ser.in_waiting > 0:
        line = ser.readline().decode('utf-8', errors='ignore').strip()
        
        # Melewati header atau log lain
        if not line or "time" in line or "Weather" in line or "Failed" in line:
            return line_temp, line_hum, line_wind, text_temp, text_hum, text_wind
        
        try:
            # Format yang dikirim ESP8266: time_ms,temperature,humidity,wind_speed
            parts = line.split(',')
            if len(parts) == 4:
                time_sec = int(parts[0]) / 1000.0
                temp = float(parts[1])
                hum = float(parts[2])
                wind = float(parts[3])
                
                times.append(time_sec)
                temperatures.append(temp)
                humidities.append(hum)
                wind_speeds.append(wind)
                
                # Simpan 30 data terakhir untuk visualisasi yang rapi
                if len(times) > 30:
                    times.pop(0)
                    temperatures.pop(0)
                    humidities.pop(0)
                    wind_speeds.pop(0)
                
                # Update data plot
                line_temp.set_data(times, temperatures)
                line_hum.set_data(times, humidities)
                line_wind.set_data(times, wind_speeds)
                
                # Update text angka
                text_temp.set_text(f'Saat ini: {temp} °C')
                text_hum.set_text(f'Saat ini: {hum} %')
                text_wind.set_text(f'Saat ini: {wind:.2f} km/h')
                
                # Mengatur skala agar dinamis
                for ax, y_data in [(ax1, temperatures), (ax2, humidities), (ax3, wind_speeds)]:
                    ax.relim()
                    ax.autoscale_view()
                    
                    if len(times) > 0:
                        # Set sumbu x agar bergerak maju
                        ax.set_xlim(max(0, times[-1] - 65), times[-1] + 5)
                        
                        # Atur rentang y sedikit melebihi min/max
                        min_y, max_y = min(y_data), max(y_data)
                        margin = max(abs(max_y - min_y) * 0.1, 1.0)
                        ax.set_ylim(min_y - margin, max_y + margin)
                        
        except ValueError as e:
            print(f"Data tidak dapat diparse: {line} - Error: {e}")
            
    return line_temp, line_hum, line_wind, text_temp, text_hum, text_wind

ani = animation.FuncAnimation(fig, update, interval=1000, blit=False, cache_frame_data=False)

plt.tight_layout()
plt.show()

# Jika ditutup dengan GUI (tombol X)
ser.close()
