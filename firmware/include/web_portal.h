#ifndef WEB_PORTAL_H
#define WEB_PORTAL_H

#include <Arduino.h>
#if defined(ESP32)
  #include <WebServer.h>
  typedef WebServer WebServerType;
#else
  #include <ESP8266WebServer.h>
  typedef ESP8266WebServer WebServerType;
#endif
#include "device_config.h"
#include "config.h"

extern DeviceConfig deviceConfig;
extern WebServerType webServer;
extern bool dhtOk;
extern bool rtcOk;
extern bool sdOk;
extern bool bh1750Ok;
extern bool inaOk;
extern volatile uint32_t anemoPulseCount;
extern SensorSample latestReading;

// HTML page generator for ESP8266 Local Web Settings Portal
inline String generateSettingsHtml(const DeviceConfig& cfg, const String& clientMsg = "") {
  String html = F("<!DOCTYPE html><html lang='id'><head><meta charset='UTF-8'>"
  "<meta name='viewport' content='width=device-width,initial-scale=1'>"
  "<title>Agrinex Node Settings</title><style>"
  "body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#e2e8f0;color:#1e293b;padding:16px;margin:0}"
  ".card{max-width:540px;margin:0 auto 20px;background:#e2e8f0;border-radius:20px;box-shadow:8px 8px 16px #cbd5e1,-8px -8px 16px #ffffff;padding:24px}"
  "h1{font-size:20px;font-weight:800;color:#0f172a;margin:0 0 4px}"
  "p.sub{font-size:12px;color:#64748b;margin:0 0 20px}"
  ".badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;margin-bottom:12px}"
  ".badge-on{background:#dcfce7;color:#15803d}.badge-off{background:#fee2e2;color:#b91c1c}"
  "fieldset{border:none;padding:0;margin:0 0 20px}"
  "legend{font-size:13px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px}"
  ".row{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:12px;background:#e2e8f0;box-shadow:inset 3px 3px 6px #cbd5e1,inset -3px -3px 6px #ffffff;margin-bottom:8px}"
  ".row label{font-size:13px;font-weight:600;color:#334155;cursor:pointer}"
  "input[type=checkbox]{width:18px;height:18px;accent-color:#0284c7;cursor:pointer}"
  "input[type=text],input[type=number],select{width:100%;box-sizing:border-box;padding:10px 12px;border:none;border-radius:10px;background:#e2e8f0;box-shadow:inset 3px 3px 6px #cbd5e1,inset -3px -3px 6px #ffffff;font-size:13px;color:#0f172a;margin-top:4px}"
  ".field{margin-bottom:12px}"
  ".field label{font-size:12px;font-weight:700;color:#475569}"
  "button{width:100%;padding:14px;border:none;border-radius:14px;background:#0284c7;color:#ffffff;font-weight:800;font-size:14px;cursor:pointer;box-shadow:4px 4px 10px #cbd5e1,-4px -4px 10px #ffffff;transition:transform 0.1s}"
  "button:active{transform:scale(0.98);background:#0369a1}"
  ".alert{background:#e0f2fe;color:#0369a1;padding:12px;border-radius:10px;font-size:12px;font-weight:600;margin-bottom:16px}"
  ".proto-box{display:none}.proto-box.active{display:block}"
  "</style></head><body><div class='card'>"
  "<h1>Agrinex Weather Station</h1>"
  "<p class='sub'>Konfigurasi Hardware Modul & Protokol Ingestion</p>");

  if (clientMsg.length() > 0) {
    html += F("<div class='alert'>");
    html += clientMsg;
    html += F("</div>");
  }

  html += F("<form method='POST' action='/settings'>");

  // --- 1. MODUL HARDWARE TOGGLE ---
  html += F("<fieldset><legend>1. Modul Sensor & Hardware</legend>");
  
  html += F("<div class='row'><label for='mod_sd'>MicroSD Card Module</label>"
            "<input type='checkbox' id='mod_sd' name='mod_sd' value='1'");
  if (cfg.modules.sd_card) html += F(" checked");
  html += F("></div>");

  html += F("<div class='row'><label for='mod_rtc'>RTC DS3231 (I2C 0x68)</label>"
            "<input type='checkbox' id='mod_rtc' name='mod_rtc' value='1'");
  if (cfg.modules.rtc_ds3231) html += F(" checked");
  html += F("></div>");

  html += F("<div class='row'><label for='mod_dht'>DHT22 (Suhu & Hum)</label>"
            "<input type='checkbox' id='mod_dht' name='mod_dht' value='1'");
  if (cfg.modules.dht22) html += F(" checked");
  html += F("></div>");

  html += F("<div class='row'><label for='mod_bh'>BH1750 (Lux Cahaya)</label>"
            "<input type='checkbox' id='mod_bh' name='mod_bh' value='1'");
  if (cfg.modules.bh1750) html += F(" checked");
  html += F("></div>");

  html += F("<div class='row'><label for='mod_anemo'>Zhafira Anemometer v1.3</label>"
            "<input type='checkbox' id='mod_anemo' name='mod_anemo' value='1'");
  if (cfg.modules.anemometer) html += F(" checked");
  html += F("></div>");

  html += F("<div class='row'><label for='mod_sleep'>Mode Hemat Daya Deep Sleep (15 Menit)</label>"
            "<input type='checkbox' id='mod_sleep' name='mod_sleep' value='1'");
  if (cfg.enable_deep_sleep) html += F(" checked");
  html += F("></div></fieldset>");

  // --- 2. PIN CONFIGURATION ---
  html += F("<fieldset><legend>2. Konfigurasi Pin GPIO & Bus I2C</legend>"
            "<div class='field'><label>DHT22 Pin (Default ESP32: GPIO4, ESP8266: D4/GPIO2)</label>"
            "<input type='number' name='pin_dht' value='");
  html += String(cfg.pins.dht_pin);
  html += F("'></div><div class='field'><label>Anemometer Pulse Pin (Default ESP32: GPIO27, ESP8266: D3/GPIO0)</label>"
            "<input type='number' name='pin_anemo' value='");
  html += String(cfg.pins.anemo_pin);
  html += F("'></div><div class='field'><label>I2C SDA Pin (Default ESP32: GPIO21, ESP8266: D2/GPIO4)</label>"
            "<input type='number' name='pin_sda' value='");
  html += String(cfg.pins.i2c_sda);
  html += F("'></div><div class='field'><label>I2C SCL Pin (Default ESP32: GPIO22, ESP8266: D1/GPIO5)</label>"
            "<input type='number' name='pin_scl' value='");
  html += String(cfg.pins.i2c_scl);
  html += F("'></div><div class='field'><label>Alamat I2C BH1750 (0x23 = 35 GND, 0x5C = 92 VCC)</label>"
            "<select name='bh_addr'>"
            "<option value='35'");
  if (cfg.pins.bh1750_addr == 0x23 || cfg.pins.bh1750_addr == 35) html += F(" selected");
  html += F(">0x23 (ADDR pin ke GND - Default)</option>"
            "<option value='92'");
  if (cfg.pins.bh1750_addr == 0x5C || cfg.pins.bh1750_addr == 92) html += F(" selected");
  html += F(">0x5C (ADDR pin ke VCC 3.3V)</option>"
            "</select></div>"
            "<div class='field'><label>SD Card CS Pin (Default ESP32: GPIO5, ESP8266: D8/GPIO15)</label>"
            "<input type='number' name='pin_sd_cs' value='");
  html += String(cfg.pins.sd_cs_pin);
  html += F("'></div></fieldset>");

  // --- 3. BACKEND PROTOCOL ---
  html += F("<fieldset><legend>3. Protokol Ingestion Backend</legend>"
            "<div class='field'><label>Pilih Protokol</label>"
            "<select name='protocol' id='protocol_select' onchange='switchProto(this.value)'>"
            "<option value='firebase'");
  if (cfg.protocol == BackendProtocol::FIREBASE) html += F(" selected");
  html += F(">Cloud Firestore (Firebase)</option>"
            "<option value='supabase'");
  if (cfg.protocol == BackendProtocol::SUPABASE) html += F(" selected");
  html += F(">Supabase Database (PostgREST)</option>"
            "<option value='mqtt'");
  if (cfg.protocol == BackendProtocol::MQTT) html += F(" selected");
  html += F(">MQTT Broker</option>"
            "<option value='http_rest'");
  if (cfg.protocol == BackendProtocol::HTTP_REST) html += F(" selected");
  html += F(">Custom HTTPS Webhook / REST</option>"
            "</select></div>");

  // Firebase Box
  html += F("<div id='box_firebase' class='proto-box");
  if (cfg.protocol == BackendProtocol::FIREBASE) html += F(" active");
  html += F("'><div class='field'><label>Firebase Project ID</label>"
            "<input type='text' name='fb_project' value='");
  html += String(cfg.firebase.project_id);
  html += F("'></div><div class='field'><label>Collection Name</label>"
            "<input type='text' name='fb_coll' value='");
  html += String(cfg.firebase.collection);
  html += F("'></div></div>");

  // Supabase Box
  html += F("<div id='box_supabase' class='proto-box");
  if (cfg.protocol == BackendProtocol::SUPABASE) html += F(" active");
  html += F("'><div class='field'><label>Supabase URL (misal: https://xyz.supabase.co)</label>"
            "<input type='text' name='supa_url' value='");
  html += String(cfg.supabase.url);
  html += F("'></div><div class='field'><label>Supabase Anon Key</label>"
            "<input type='text' name='supa_key' value='");
  html += String(cfg.supabase.api_key);
  html += F("'></div><div class='field'><label>Table Name</label>"
            "<input type='text' name='supa_table' value='");
  html += String(cfg.supabase.table);
  html += F("'></div></div>");

  // MQTT Box
  html += F("<div id='box_mqtt' class='proto-box");
  if (cfg.protocol == BackendProtocol::MQTT) html += F(" active");
  html += F("'><div class='field'><label>MQTT Broker Host</label>"
            "<input type='text' name='mqtt_broker' value='");
  html += String(cfg.mqtt.broker);
  html += F("'></div><div class='field'><label>Port</label>"
            "<input type='number' name='mqtt_port' value='");
  html += String(cfg.mqtt.port);
  html += F("'></div><div class='field'><label>Topic</label>"
            "<input type='text' name='mqtt_topic' value='");
  html += String(cfg.mqtt.topic);
  html += F("'></div><div class='field'><label>Client ID</label>"
            "<input type='text' name='mqtt_cid' value='");
  html += String(cfg.mqtt.client_id);
  html += F("'></div></div>");

  // HTTP REST Box
  html += F("<div id='box_http_rest' class='proto-box");
  if (cfg.protocol == BackendProtocol::HTTP_REST) html += F(" active");
  html += F("'><div class='field'><label>Webhook URL (HTTPS POST)</label>"
            "<input type='text' name='rest_url' value='");
  html += String(cfg.http_rest.url);
  html += F("'></div><div class='field'><label>Authorization Header (Opsional)</label>"
            "<input type='text' name='rest_auth' value='");
  html += String(cfg.http_rest.auth_header);
  html += F("'></div></div>");

  html += F("</fieldset><button type='submit'>Simpan & Restart Perangkat</button></form>"
            "<script>"
            "function switchProto(val){"
            "document.querySelectorAll('.proto-box').forEach(b => b.classList.remove('active'));"
            "const target = document.getElementById('box_' + val);"
            "if(target) target.classList.add('active');"
            "}"
            "</script></div></body></html>");

  return html;
}

// Setup handlers for ESP8266WebServer
inline void setupWebServerRoutes() {
  // CORS Headers for API
  webServer.enableCORS(true);

  // Status root
  webServer.on("/", HTTP_GET, []() {
    String json = F("{\"device\":\"Agrinex Weather Station\",\"status\":\"online\",\"protocol\":\"");
    json += protocolToString(deviceConfig.protocol);
    json += F("\",\"settings_url\":\"/settings\",\"api_config\":\"/api/config\",\"api_sensors\":\"/api/sensors\"}");
    webServer.send(200, "application/json", json);
  });

  // REST API GET: /api/sensors (Real-time local HTTP sensor stream)
  webServer.on("/api/sensors", HTTP_GET, []() {
    webServer.sendHeader("Access-Control-Allow-Origin", "*");
    webServer.sendHeader("Cache-Control", "no-cache");
    webServer.sendHeader("Connection", "close");

    JsonDocument doc;
    doc["temperature"] = (double)((int)(latestReading.temperature * 10)) / 10.0;
    doc["humidity"]    = (double)((int)(latestReading.humidity * 10)) / 10.0;
    doc["wind_speed"]  = (double)((int)(latestReading.windSpeed * 10)) / 10.0;
    doc["light_lux"]   = (int)latestReading.lightLux;
    doc["raw_pulses"]  = (uint32_t)anemoPulseCount;
    doc["wifi_rssi"]   = WiFi.RSSI();
    doc["uptime_sec"]  = millis() / 1000;

    doc["battery_voltage"]    = (double)((int)(latestReading.batteryVolts * 100)) / 100.0;
    doc["battery_current"]    = (double)((int)(latestReading.batteryCurrent * 10)) / 10.0;
    doc["battery_power"]      = (double)((int)(latestReading.batteryPower * 10)) / 10.0;
    doc["battery_percentage"] = latestReading.batteryPct;

    JsonObject bat = doc["battery"].to<JsonObject>();
    bat["voltage"]    = (double)((int)(latestReading.batteryVolts * 100)) / 100.0;
    bat["current_ma"] = (double)((int)(latestReading.batteryCurrent * 10)) / 10.0;
    bat["power_mw"]   = (double)((int)(latestReading.batteryPower * 10)) / 10.0;
    bat["percentage"] = latestReading.batteryPct;
    bat["ok"]         = (latestReading.batteryVolts > 0.5f);

    JsonObject st = doc["status"].to<JsonObject>();
    st["dht22"]      = dhtOk;
    st["bh1750"]     = bh1750Ok;
    st["anemometer"] = deviceConfig.modules.anemometer;
    st["ina226"]     = inaOk;
    st["rtc_ds3231"] = rtcOk;
    st["sd_card"]    = sdOk;

    String resp;
    serializeJson(doc, resp);
    webServer.send(200, "application/json", resp);
  });

  // REST API GET: /api/ping
  webServer.on("/api/ping", HTTP_GET, []() {
    webServer.sendHeader("Access-Control-Allow-Origin", "*");
    webServer.sendHeader("Cache-Control", "no-cache");
    webServer.sendHeader("Connection", "close");
    webServer.send(200, "application/json", "{\"pong\":true,\"time\":" + String(millis()) + "}");
  });

  // REST API GET: /api/diagnostics
  webServer.on("/api/diagnostics", HTTP_GET, []() {
    webServer.sendHeader("Access-Control-Allow-Origin", "*");
    webServer.sendHeader("Cache-Control", "no-cache");
    webServer.sendHeader("Connection", "close");

    // Re-verify I2C devices
    Wire.beginTransmission(INA226_I2C_ADDR);
    bool inaFound = (Wire.endTransmission() == 0);

    Wire.beginTransmission(0x23);
    bool bhFound = (Wire.endTransmission() == 0);
    if (!bhFound) {
      Wire.beginTransmission(0x5C);
      bhFound = (Wire.endTransmission() == 0);
    }

    Wire.beginTransmission(0x68);
    bool rtcFound = (Wire.endTransmission() == 0);

    JsonDocument doc;
    doc["all_ok"] = (dhtOk && (bh1750Ok || bhFound) && (inaOk || inaFound));
    doc["timestamp_ms"] = millis();

    JsonObject mods = doc["modules"].to<JsonObject>();

    // INA226
    JsonObject mIna = mods["ina226"].to<JsonObject>();
    mIna["name"] = "INA226 Battery & Power Monitor";
    mIna["bus"] = "I2C (SDA 21, SCL 22)";
    mIna["address"] = "0x40";
    mIna["connected"] = (inaOk || inaFound);
    mIna["voltage"] = (double)((int)(latestReading.batteryVolts * 100)) / 100.0;
    mIna["current_ma"] = (double)((int)(latestReading.batteryCurrent * 10)) / 10.0;
    mIna["power_mw"] = (double)((int)(latestReading.batteryPower * 10)) / 10.0;
    mIna["percentage"] = latestReading.batteryPct;
    mIna["charging"] = (latestReading.batteryCurrent > 10.0f || latestReading.batteryVolts >= 3.45f);
    mIna["message"] = (inaOk || inaFound) ? "Sensor INA226 terdeteksi & membaca tegangan bus LiFePO4" : "INA226 tidak merespon pada alamat 0x40";

    // DHT22
    JsonObject mDht = mods["dht22"].to<JsonObject>();
    mDht["name"] = "DHT22 Suhu & Kelembapan";
    mDht["pin"] = "GPIO" + String(deviceConfig.pins.dht_pin);
    mDht["connected"] = dhtOk;
    mDht["temperature"] = (double)((int)(latestReading.temperature * 10)) / 10.0;
    mDht["humidity"] = (double)((int)(latestReading.humidity * 10)) / 10.0;
    mDht["message"] = dhtOk ? "DHT22 membaca suhu & kelembapan normal" : "DHT22 gagal membaca / checksum error";

    // BH1750
    JsonObject mBh = mods["bh1750"].to<JsonObject>();
    mBh["name"] = "BH1750 Lux Sensor";
    mBh["bus"] = "I2C (SDA 21, SCL 22)";
    mBh["address"] = bhFound ? "0x23 / 0x5C" : "0x23";
    mBh["connected"] = (bh1750Ok || bhFound);
    mBh["light_lux"] = (int)latestReading.lightLux;
    mBh["message"] = (bh1750Ok || bhFound) ? "BH1750 terdeteksi pada bus I2C" : "BH1750 tidak merespon pada I2C 0x23 / 0x5C. Periksa kabel SDA/SCL.";

    // Anemometer
    JsonObject mAnemo = mods["anemometer"].to<JsonObject>();
    mAnemo["name"] = "Anemometer Pulse Counter";
    mAnemo["pin"] = "GPIO" + String(deviceConfig.pins.anemo_pin);
    mAnemo["connected"] = deviceConfig.modules.anemometer;
    mAnemo["pulses"] = (uint32_t)anemoPulseCount;
    mAnemo["wind_speed"] = (double)((int)(latestReading.windSpeed * 10)) / 10.0;
    mAnemo["message"] = "Interrupt aktif pada pin D27. Putar mangkok anemometer untuk uji pulsa.";

    // RTC DS3231
    JsonObject mRtc = mods["rtc_ds3231"].to<JsonObject>();
    mRtc["name"] = "RTC DS3231";
    mRtc["bus"] = "I2C (SDA 21, SCL 22)";
    mRtc["connected"] = (rtcOk || rtcFound);
    mRtc["message"] = (rtcOk || rtcFound) ? "RTC DS3231 terdeteksi pada 0x68" : "RTC tidak terdeteksi (Waktu memakai NTP)";

    // MicroSD
    JsonObject mSd = mods["sd_card"].to<JsonObject>();
    mSd["name"] = "MicroSD Card";
    mSd["bus"] = "SPI (CS Pin 5)";
    mSd["connected"] = sdOk;
    mSd["message"] = sdOk ? "MicroSD Card terpasang & dapat menulis log" : "MicroSD Card tidak terpasang";

    // System
    JsonObject sys = doc["system"].to<JsonObject>();
    sys["ip"] = WiFi.localIP().toString();
    sys["ssid"] = WiFi.SSID();
    sys["rssi"] = WiFi.RSSI();
    #if defined(ESP32)
    sys["free_heap"] = ESP.getFreeHeap();
    #endif
    sys["uptime_sec"] = millis() / 1000;

    String resp;
    serializeJson(doc, resp);
    webServer.send(200, "application/json", resp);
  });

  // CORS Preflight Options Handlers
  auto handleCorsOptions = []() {
    webServer.sendHeader("Access-Control-Allow-Origin", "*");
    webServer.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    webServer.sendHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    webServer.send(204);
  };
  webServer.on("/api/sensors", HTTP_OPTIONS, handleCorsOptions);
  webServer.on("/api/ping", HTTP_OPTIONS, handleCorsOptions);
  webServer.on("/api/diagnostics", HTTP_OPTIONS, handleCorsOptions);

  // Settings Web Page GET
  webServer.on("/settings", HTTP_GET, []() {
    webServer.send(200, "text/html", generateSettingsHtml(deviceConfig));
  });

  // Settings Web Form POST
  webServer.on("/settings", HTTP_POST, []() {
    deviceConfig.modules.sd_card = webServer.hasArg("mod_sd");
    deviceConfig.modules.rtc_ds3231 = webServer.hasArg("mod_rtc");
    deviceConfig.modules.dht22 = webServer.hasArg("mod_dht");
    deviceConfig.modules.bh1750 = webServer.hasArg("mod_bh");
    deviceConfig.modules.anemometer = webServer.hasArg("mod_anemo");
    deviceConfig.enable_deep_sleep = webServer.hasArg("mod_sleep");

    if (webServer.hasArg("pin_dht")) deviceConfig.pins.dht_pin = webServer.arg("pin_dht").toInt();
    if (webServer.hasArg("pin_anemo")) deviceConfig.pins.anemo_pin = webServer.arg("pin_anemo").toInt();
    if (webServer.hasArg("pin_sda")) deviceConfig.pins.i2c_sda = webServer.arg("pin_sda").toInt();
    if (webServer.hasArg("pin_scl")) deviceConfig.pins.i2c_scl = webServer.arg("pin_scl").toInt();
    if (webServer.hasArg("bh_addr")) deviceConfig.pins.bh1750_addr = webServer.arg("bh_addr").toInt();
    if (webServer.hasArg("pin_sd_cs")) deviceConfig.pins.sd_cs_pin = webServer.arg("pin_sd_cs").toInt();

    if (webServer.hasArg("protocol")) {
      deviceConfig.protocol = stringToProtocol(webServer.arg("protocol").c_str());
    }

    if (webServer.hasArg("fb_project")) strncpy(deviceConfig.firebase.project_id, webServer.arg("fb_project").c_str(), sizeof(deviceConfig.firebase.project_id) - 1);
    if (webServer.hasArg("fb_coll")) strncpy(deviceConfig.firebase.collection, webServer.arg("fb_coll").c_str(), sizeof(deviceConfig.firebase.collection) - 1);

    if (webServer.hasArg("supa_url")) strncpy(deviceConfig.supabase.url, webServer.arg("supa_url").c_str(), sizeof(deviceConfig.supabase.url) - 1);
    if (webServer.hasArg("supa_key")) strncpy(deviceConfig.supabase.api_key, webServer.arg("supa_key").c_str(), sizeof(deviceConfig.supabase.api_key) - 1);
    if (webServer.hasArg("supa_table")) strncpy(deviceConfig.supabase.table, webServer.arg("supa_table").c_str(), sizeof(deviceConfig.supabase.table) - 1);

    if (webServer.hasArg("mqtt_broker")) strncpy(deviceConfig.mqtt.broker, webServer.arg("mqtt_broker").c_str(), sizeof(deviceConfig.mqtt.broker) - 1);
    if (webServer.hasArg("mqtt_port")) deviceConfig.mqtt.port = webServer.arg("mqtt_port").toInt();
    if (webServer.hasArg("mqtt_topic")) strncpy(deviceConfig.mqtt.topic, webServer.arg("mqtt_topic").c_str(), sizeof(deviceConfig.mqtt.topic) - 1);
    if (webServer.hasArg("mqtt_cid")) strncpy(deviceConfig.mqtt.client_id, webServer.arg("mqtt_cid").c_str(), sizeof(deviceConfig.mqtt.client_id) - 1);

    if (webServer.hasArg("rest_url")) strncpy(deviceConfig.http_rest.url, webServer.arg("rest_url").c_str(), sizeof(deviceConfig.http_rest.url) - 1);
    if (webServer.hasArg("rest_auth")) strncpy(deviceConfig.http_rest.auth_header, webServer.arg("rest_auth").c_str(), sizeof(deviceConfig.http_rest.auth_header) - 1);

    saveDeviceConfig(deviceConfig);

    String resp = generateSettingsHtml(deviceConfig, "✓ Konfigurasi berhasil disimpan! Perangkat sedang merestart...");
    webServer.send(200, "text/html", resp);

    delay(1000);
    ESP.restart();
  });

  // REST API GET: /api/config
  webServer.on("/api/config", HTTP_GET, []() {
    webServer.send(200, "application/json", serializeDeviceConfig(deviceConfig));
  });

  // REST API POST: /api/config
  webServer.on("/api/config", HTTP_POST, []() {
    if (!webServer.hasArg("plain")) {
      webServer.send(400, "application/json", "{\"error\":\"Missing body\"}");
      return;
    }
    String body = webServer.arg("plain");
    if (deserializeDeviceConfig(body, deviceConfig)) {
      saveDeviceConfig(deviceConfig);
      webServer.send(200, "application/json", "{\"status\":\"ok\",\"message\":\"Config updated. Device will restart.\"}");
      delay(1000);
      ESP.restart();
    } else {
      webServer.send(400, "application/json", "{\"error\":\"Invalid JSON format\"}");
    }
  });
}

#endif // WEB_PORTAL_H
