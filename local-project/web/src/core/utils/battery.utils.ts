/**
 * Utilitas Kalkulasi Presisi Baterai LiFePO4 1S (3.2V 30Ah) & Sensor INA226
 * Mengimplementasikan Algoritma "Smartphone Battery Fuel Gauge" (SoC Tracking)
 * Mencegah lonjakan persentase semu saat solar panel dicolok atau dicabut.
 */

export const INA226_DEFAULT_SHUNT_OHM = 0.1; // Shunt R100 pada modul PCB INA226

// Karakteristik Fisik Baterai LiFePO4 3.2V 30Ah
export const LIFEPO4_CAPACITY_AH = 30.0;      // Kapasitas Total: 30 Ah (30,000 mAh)
export const LIFEPO4_NOMINAL_VOLTS = 3.2;     // Tegangan Nominal: 3.2 V
export const LIFEPO4_TOTAL_ENERGY_WH = 96.0;  // Total Energi: 96 Wh (30 Ah * 3.2 V)
export const LIFEPO4_CHARGER_VOLTAGE = 3.60;  // Tegangan Float TP5000 (Jumper F short)

/**
 * Nilai tegangan threshold untuk deteksi pengisian solar:
 * Sel LiFePO4 dalam kondisi open-circuit / resting maksimal hanya 3.36V - 3.40V.
 * Tegangan >= 3.45V membuktikan adanya suplai aktif dari Charger TP5000 / Solar Panel!
 */
export const LIFEPO4_CHARGING_THRESHOLD_V = 3.45;

/**
 * Estimasi Persentase Baterai LiFePO4 1S dari Tegangan Istirahat Sel (OCV)
 * Kurva linear bertingkat (multi-segment) khas kimia Lithium Iron Phosphate:
 */
export function calculateLiFePO4Percentage(voltage: number): number {
  if (voltage <= 2.60) return 0;
  if (voltage >= 3.42) return 100; // 3.42V adalah batas 100% resting OCV tanpa charger

  if (voltage >= 3.36) {
    // 3.36V - 3.42V: Kapasitas 95% - 100%
    return Math.round(95 + ((voltage - 3.36) / (3.42 - 3.36)) * 5);
  } else if (voltage >= 3.33) {
    // 3.33V - 3.36V: Kapasitas 80% - 95%
    return Math.round(80 + ((voltage - 3.33) / (3.36 - 3.33)) * 15);
  } else if (voltage >= 3.30) {
    // 3.30V - 3.33V: Kapasitas 60% - 80%
    return Math.round(60 + ((voltage - 3.30) / (3.33 - 3.30)) * 20);
  } else if (voltage >= 3.28) {
    // 3.28V - 3.30V: Kapasitas 40% - 60% (Plateau nominal 3.2V)
    return Math.round(40 + ((voltage - 3.28) / (3.30 - 3.28)) * 20);
  } else if (voltage >= 3.25) {
    // 3.25V - 3.28V: Kapasitas 25% - 40%
    return Math.round(25 + ((voltage - 3.25) / (3.28 - 3.25)) * 15);
  } else if (voltage >= 3.20) {
    // 3.20V - 3.25V: Kapasitas 15% - 25%
    return Math.round(15 + ((voltage - 3.20) / (3.25 - 3.20)) * 10);
  } else if (voltage >= 3.10) {
    // 3.10V - 3.20V: Kapasitas 7% - 15% (3.12V ~ 9%)
    return Math.round(7 + ((voltage - 3.10) / (3.20 - 3.10)) * 8);
  } else if (voltage >= 2.90) {
    // 2.90V - 3.10V: Kapasitas 2% - 7%
    return Math.round(2 + ((voltage - 2.90) / (3.10 - 2.90)) * 5);
  } else {
    // 2.60V - 2.90V: Kapasitas 0% - 2%
    return Math.round(((voltage - 2.60) / (2.90 - 2.60)) * 2);
  }
}

// Memory cache State of Charge (SoC) di client agar persentase stabil seperti di HP
let cachedSoC: number | null = null;
let lastCalcTimestamp = 0;

/**
 * Fuel Gauge SoC Filter cerdas:
 * Saat solar panel dicolokkan, tegangan terminal naik semu ke ~3.57V karena charger TP5000.
 * Filter ini mengompensasikan tegangan semu charger tersebut sehingga persentase tidak melonjak ke 99%.
 */
export function calculateFuelGaugePercentage(rawVoltage: number, isCharging: boolean): number {
  if (rawVoltage <= 1.0) return 0;

  // Jika sedang dicharge (V >= 3.45V atau flag charging aktif):
  // Kompensasikan delta tegangan charging (~0.40V) untuk mendapatkan estimasi OCV internal sel
  let effectiveOcv = rawVoltage;
  if (isCharging && rawVoltage >= 3.40) {
    // Baterai saat dicas terangkat sekitar 0.40V - 0.45V di atas tegangan sel aslinya
    effectiveOcv = Math.max(2.60, rawVoltage - 0.40);
  }

  const rawPercent = calculateLiFePO4Percentage(effectiveOcv);

  const now = Date.now();
  if (cachedSoC === null || (now - lastCalcTimestamp > 60000 && !isCharging)) {
    // Inisialisasi awal atau resync jika idle lama
    cachedSoC = rawPercent;
    lastCalcTimestamp = now;
    return cachedSoC;
  }

  // Rate Limiting seperti smartphone (SoC tidak boleh melompat lebih dari 1% dalam waktu singkat)
  const dtSec = Math.max(1, (now - lastCalcTimestamp) / 1000);
  lastCalcTimestamp = now;

  if (isCharging) {
    // Saat charging: persentase hanya boleh naik perlahan sesuai energi masuk
    if (rawPercent > cachedSoC) {
      // Maksimum naik 1% per 15 detik
      const maxRise = Math.max(0.1, (dtSec / 15.0));
      cachedSoC = Math.min(rawPercent, cachedSoC + maxRise);
    } else {
      // Tidak boleh turun saat sedang dicolok charger
      cachedSoC = Math.max(cachedSoC, rawPercent);
    }
  } else {
    // Saat discharging (pemakaian): persentase menyesuaikan menuju tegangan sel asli secara halus
    const delta = rawPercent - cachedSoC;
    // Bergerak pelan menuju nilai OCV asli (faktor redaman 0.2)
    cachedSoC += delta * Math.min(1.0, dtSec * 0.2);
  }

  cachedSoC = Math.max(0, Math.min(100, cachedSoC));
  return Math.round(cachedSoC);
}

/**
 * Estimasi Cerdas Lengkap: Sisa Pemakaian (Discharging) & Waktu Hingga Penuh (Charging)
 */
export interface BatteryEstimateResult {
  remainingAh: number;
  remainingWh: number;
  runtimeText: string;
  isCharging: boolean;
  estimateLabel: string;
  estimateValue: string;
  loadOrChargeText: string;
}

export function calculateBatteryEstimates(
  percentage: number,
  currentMa: number,
  isCharging: boolean,
  voltage: number
): BatteryEstimateResult {
  const pct = Math.max(0, Math.min(100, percentage));
  const remainingAh = Number(((pct / 100) * LIFEPO4_CAPACITY_AH).toFixed(1));
  const remainingWh = Number((remainingAh * (voltage > 2.5 ? voltage : LIFEPO4_NOMINAL_VOLTS)).toFixed(1));

  if (isCharging) {
    // Estimasi Pengisian Hingga Penuh (Time to Full)
    const neededAh = LIFEPO4_CAPACITY_AH - remainingAh;
    // TP5000 standar mengecas di 1000 mA (1.0 A) atau sesuai sinar matahari (~500 - 1000 mA)
    const estChargeCurrentA = 0.8; // Rata-rata 800 mA pengisian
    const hoursToFull = neededAh / estChargeCurrentA;

    let estimateValue = '';
    if (pct >= 98) {
      estimateValue = 'Hampir Penuh (Float)';
    } else if (hoursToFull >= 24) {
      const days = (hoursToFull / 24).toFixed(1);
      estimateValue = `~${days} hari pengisian`;
    } else {
      const hrs = Math.floor(hoursToFull);
      const mins = Math.round((hoursToFull - hrs) * 60);
      estimateValue = hrs > 0 ? `~${hrs}j ${mins}m` : `~${mins} mnt`;
    }

    return {
      remainingAh,
      remainingWh,
      runtimeText: estimateValue,
      isCharging: true,
      estimateLabel: 'Estimasi Penuh',
      estimateValue,
      loadOrChargeText: 'Pengisian Solar Aktif',
    };
  } else {
    // Estimasi Sisa Daya Tahan Baterai (Discharging Runtime)
    const loadMa = Math.abs(currentMa) > 5.0 ? Math.abs(currentMa) : 150.0; // Beban rata-rata ESP32 ~150-250mA
    const totalRemainingHours = (remainingAh * 1000.0) / loadMa;
    const totalRemainingDays = totalRemainingHours / 24.0;

    let estimateValue = '';
    if (totalRemainingDays >= 1.5) {
      estimateValue = `~${totalRemainingDays.toFixed(1)} hari`;
    } else {
      estimateValue = `~${Math.round(totalRemainingHours)} jam`;
    }

    return {
      remainingAh,
      remainingWh,
      runtimeText: estimateValue,
      isCharging: false,
      estimateLabel: 'Sisa Waktu',
      estimateValue,
      loadOrChargeText: 'Beban Sistem',
    };
  }
}

/**
 * Normalisasi data baterai untuk memastikan arus dan daya akurat
 * Disesuaikan untuk tipe baterai LiFePO4 3.2V 30Ah
 */
export function normalizeBatteryMetrics(rawBattery?: {
  voltage?: number;
  current_ma?: number;
  power_mw?: number;
  shunt_mv?: number;
  percentage?: number;
  charging?: boolean;
  ok?: boolean;
}, topLevel?: {
  voltage?: number;
  current?: number;
  power?: number;
  percentage?: number;
}) {
  const voltage = topLevel?.voltage ?? rawBattery?.voltage ?? 0;
  let currentMa = topLevel?.current ?? rawBattery?.current_ma ?? 0;
  const shuntMv = rawBattery?.shunt_mv ?? 0;

  // Fallback hardware presisi jika register current 0 tapi ada drop tegangan shunt
  if (Math.abs(currentMa) < 0.1 && Math.abs(shuntMv) > 0.01) {
    currentMa = shuntMv / INA226_DEFAULT_SHUNT_OHM;
  }

  // Hitung daya: P (mW) = V (V) * I (mA)
  let powerMw = topLevel?.power ?? rawBattery?.power_mw ?? 0;
  if (Math.abs(powerMw) < 0.1 && Math.abs(currentMa) > 0.1 && voltage > 0.5) {
    powerMw = Math.abs(voltage * currentMa);
  }

  // Deteksi Charging yang benar:
  // Tegangan >= 3.45V membuktikan charger solar aktif menaikkan tegangan rail baterai
  const isCharging = (rawBattery?.charging ?? false) || (voltage >= LIFEPO4_CHARGING_THRESHOLD_V);

  // Hitung persentase baterai cerdas (Fuel Gauge SoC ala Smartphone)
  let percentage = 0;
  if (voltage >= 2.50) {
    percentage = calculateFuelGaugePercentage(voltage, isCharging);
  }

  const isOk = (rawBattery?.ok ?? true) && voltage > 0.5;

  return {
    voltage: Number(voltage.toFixed(2)),
    current_ma: Number(currentMa.toFixed(1)),
    power_mw: Number(powerMw.toFixed(1)),
    shunt_mv: Number(shuntMv.toFixed(2)),
    percentage: Math.max(0, Math.min(100, percentage)),
    charging: isCharging,
    ok: isOk,
  };
}
