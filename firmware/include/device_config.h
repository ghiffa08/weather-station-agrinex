#ifndef DEVICE_CONFIG_H
#define DEVICE_CONFIG_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include <LittleFS.h>

#define CONFIG_FILE_PATH "/config.json"

// Hardware modules toggle flags
struct ModuleToggles {
  bool dht22 = true;
  bool bh1750 = true;
  bool anemometer = true;
  bool rtc_ds3231 = true;
  bool sd_card = false;       // Default false / unchecked as requested by user
};

// GPIO Pin assignments (ESP32 / ESP8266 dynamic numbering)
struct PinConfig {
#if defined(ESP32)
  uint8_t dht_pin = 4;        // GPIO4
  uint8_t anemo_pin = 27;     // GPIO27
  uint8_t i2c_sda = 21;       // GPIO21
  uint8_t i2c_scl = 22;       // GPIO22
  uint8_t sd_cs_pin = 5;      // GPIO5
#else
  uint8_t dht_pin = 2;        // D4 / GPIO2
  uint8_t anemo_pin = 0;      // D3 / GPIO0
  uint8_t i2c_sda = 4;        // D2 / GPIO4
  uint8_t i2c_scl = 5;        // D1 / GPIO5
  uint8_t sd_cs_pin = 15;     // D8 / GPIO15
#endif
  uint8_t bh1750_addr = 0x23; // 0x23 (default, ADDR GND) or 0x5C (ADDR VCC)
};

// Backend Protocol Configurations
enum class BackendProtocol {
  FIREBASE,
  SUPABASE,
  MQTT,
  HTTP_REST
};

struct FirebaseConfig {
  char project_id[64] = "agrinex-f5ef8";
  char collection[64] = "telemetry";
};

struct SupabaseConfig {
  char url[128] = "https://your-project.supabase.co";
  char api_key[256] = "";
  char table[64] = "telemetry";
};

struct MqttConfig {
  char broker[128] = "broker.emqx.io";
  uint16_t port = 1883;
  char topic[128] = "agrinex/weather/telemetry";
  char username[64] = "";
  char password[64] = "";
  char client_id[64] = "agrinex-esp8266";
};

struct HttpRestConfig {
  char url[160] = "https://weatherstation.agrinex.io/api/telemetry";
  char auth_header[160] = "";
};

struct DeviceConfig {
  ModuleToggles modules;
  PinConfig pins;
  
  BackendProtocol protocol = BackendProtocol::FIREBASE;
  FirebaseConfig firebase;
  SupabaseConfig supabase;
  MqttConfig mqtt;
  HttpRestConfig http_rest;

  uint32_t sensor_read_ms = 2000;
  uint32_t publish_interval_ms = 900000;
  bool enable_deep_sleep = false;
};

inline const char* protocolToString(BackendProtocol proto) {
  switch (proto) {
    case BackendProtocol::FIREBASE: return "firebase";
    case BackendProtocol::SUPABASE: return "supabase";
    case BackendProtocol::MQTT: return "mqtt";
    case BackendProtocol::HTTP_REST: return "http_rest";
    default: return "firebase";
  }
}

inline BackendProtocol stringToProtocol(const char* str) {
  if (strcmp(str, "supabase") == 0) return BackendProtocol::SUPABASE;
  if (strcmp(str, "mqtt") == 0) return BackendProtocol::MQTT;
  if (strcmp(str, "http_rest") == 0 || strcmp(str, "https") == 0 || strcmp(str, "rest") == 0) return BackendProtocol::HTTP_REST;
  return BackendProtocol::FIREBASE;
}

// Serialization to JSON string
inline String serializeDeviceConfig(const DeviceConfig& cfg) {
  JsonDocument doc;

  JsonObject mod = doc["modules"].to<JsonObject>();
  mod["dht22"] = cfg.modules.dht22;
  mod["bh1750"] = cfg.modules.bh1750;
  mod["anemometer"] = cfg.modules.anemometer;
  mod["rtc_ds3231"] = cfg.modules.rtc_ds3231;
  mod["sd_card"] = cfg.modules.sd_card;

  JsonObject pins = doc["pins"].to<JsonObject>();
  pins["dht_pin"] = cfg.pins.dht_pin;
  pins["anemo_pin"] = cfg.pins.anemo_pin;
  pins["i2c_sda"] = cfg.pins.i2c_sda;
  pins["i2c_scl"] = cfg.pins.i2c_scl;
  pins["sd_cs_pin"] = cfg.pins.sd_cs_pin;
  pins["bh1750_addr"] = cfg.pins.bh1750_addr;

  JsonObject backend = doc["backend"].to<JsonObject>();
  backend["protocol"] = protocolToString(cfg.protocol);

  JsonObject fb = backend["firebase"].to<JsonObject>();
  fb["project_id"] = cfg.firebase.project_id;
  fb["collection"] = cfg.firebase.collection;

  JsonObject supa = backend["supabase"].to<JsonObject>();
  supa["url"] = cfg.supabase.url;
  supa["api_key"] = cfg.supabase.api_key;
  supa["table"] = cfg.supabase.table;

  JsonObject mq = backend["mqtt"].to<JsonObject>();
  mq["broker"] = cfg.mqtt.broker;
  mq["port"] = cfg.mqtt.port;
  mq["topic"] = cfg.mqtt.topic;
  mq["username"] = cfg.mqtt.username;
  mq["password"] = cfg.mqtt.password;
  mq["client_id"] = cfg.mqtt.client_id;

  JsonObject rest = backend["http_rest"].to<JsonObject>();
  rest["url"] = cfg.http_rest.url;
  rest["auth_header"] = cfg.http_rest.auth_header;

  JsonObject timing = doc["timing"].to<JsonObject>();
  timing["sensor_read_ms"] = cfg.sensor_read_ms;
  timing["publish_interval_ms"] = cfg.publish_interval_ms;
  timing["enable_deep_sleep"] = cfg.enable_deep_sleep;

  String output;
  serializeJsonPretty(doc, output);
  return output;
}

// Deserialization from JSON string
inline bool deserializeDeviceConfig(const String& jsonStr, DeviceConfig& cfg) {
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, jsonStr);
  if (err) {
    Serial.printf("[CONFIG] JSON parse error: %s\n", err.c_str());
    return false;
  }

  if (doc["modules"].is<JsonObject>()) {
    JsonObject mod = doc["modules"];
    if (mod["dht22"].is<bool>()) cfg.modules.dht22 = mod["dht22"];
    if (mod["bh1750"].is<bool>()) cfg.modules.bh1750 = mod["bh1750"];
    if (mod["anemometer"].is<bool>()) cfg.modules.anemometer = mod["anemometer"];
    if (mod["rtc_ds3231"].is<bool>()) cfg.modules.rtc_ds3231 = mod["rtc_ds3231"];
    if (mod["sd_card"].is<bool>()) cfg.modules.sd_card = mod["sd_card"];
  }

  if (doc["pins"].is<JsonObject>()) {
    JsonObject p = doc["pins"];
    if (p["dht_pin"].is<uint8_t>()) cfg.pins.dht_pin = p["dht_pin"];
    if (p["anemo_pin"].is<uint8_t>()) cfg.pins.anemo_pin = p["anemo_pin"];
    if (p["i2c_sda"].is<uint8_t>()) cfg.pins.i2c_sda = p["i2c_sda"];
    if (p["i2c_scl"].is<uint8_t>()) cfg.pins.i2c_scl = p["i2c_scl"];
    if (p["sd_cs_pin"].is<uint8_t>()) cfg.pins.sd_cs_pin = p["sd_cs_pin"];
    if (p["bh1750_addr"].is<uint8_t>()) cfg.pins.bh1750_addr = p["bh1750_addr"];
  }

  if (doc["backend"].is<JsonObject>()) {
    JsonObject b = doc["backend"];
    if (b["protocol"].is<const char*>()) {
      cfg.protocol = stringToProtocol(b["protocol"]);
    }

    if (b["firebase"].is<JsonObject>()) {
      JsonObject fb = b["firebase"];
      if (fb["project_id"].is<const char*>()) strncpy(cfg.firebase.project_id, fb["project_id"], sizeof(cfg.firebase.project_id) - 1);
      if (fb["collection"].is<const char*>()) strncpy(cfg.firebase.collection, fb["collection"], sizeof(cfg.firebase.collection) - 1);
    }

    if (b["supabase"].is<JsonObject>()) {
      JsonObject supa = b["supabase"];
      if (supa["url"].is<const char*>()) strncpy(cfg.supabase.url, supa["url"], sizeof(cfg.supabase.url) - 1);
      if (supa["api_key"].is<const char*>()) strncpy(cfg.supabase.api_key, supa["api_key"], sizeof(cfg.supabase.api_key) - 1);
      if (supa["table"].is<const char*>()) strncpy(cfg.supabase.table, supa["table"], sizeof(cfg.supabase.table) - 1);
    }

    if (b["mqtt"].is<JsonObject>()) {
      JsonObject mq = b["mqtt"];
      if (mq["broker"].is<const char*>()) strncpy(cfg.mqtt.broker, mq["broker"], sizeof(cfg.mqtt.broker) - 1);
      if (mq["port"].is<uint16_t>()) cfg.mqtt.port = mq["port"];
      if (mq["topic"].is<const char*>()) strncpy(cfg.mqtt.topic, mq["topic"], sizeof(cfg.mqtt.topic) - 1);
      if (mq["username"].is<const char*>()) strncpy(cfg.mqtt.username, mq["username"], sizeof(cfg.mqtt.username) - 1);
      if (mq["password"].is<const char*>()) strncpy(cfg.mqtt.password, mq["password"], sizeof(cfg.mqtt.password) - 1);
      if (mq["client_id"].is<const char*>()) strncpy(cfg.mqtt.client_id, mq["client_id"], sizeof(cfg.mqtt.client_id) - 1);
    }

    if (b["http_rest"].is<JsonObject>()) {
      JsonObject rest = b["http_rest"];
      if (rest["url"].is<const char*>()) strncpy(cfg.http_rest.url, rest["url"], sizeof(cfg.http_rest.url) - 1);
      if (rest["auth_header"].is<const char*>()) strncpy(cfg.http_rest.auth_header, rest["auth_header"], sizeof(cfg.http_rest.auth_header) - 1);
    }
  }

  if (doc["timing"].is<JsonObject>()) {
    JsonObject t = doc["timing"];
    if (t["sensor_read_ms"].is<uint32_t>()) cfg.sensor_read_ms = t["sensor_read_ms"];
    if (t["publish_interval_ms"].is<uint32_t>()) cfg.publish_interval_ms = t["publish_interval_ms"];
    cfg.enable_deep_sleep = false; // Always keep deep sleep OFF so local web server & WiFi stay active
  }

  return true;
}

// Load config from LittleFS file
inline bool loadDeviceConfig(DeviceConfig& cfg) {
  if (!LittleFS.begin()) {
    Serial.println(F("[CONFIG] LittleFS mount failed, using defaults"));
    return false;
  }

  if (!LittleFS.exists(CONFIG_FILE_PATH)) {
    Serial.println(F("[CONFIG] /config.json not found, saving default config..."));
    File f = LittleFS.open(CONFIG_FILE_PATH, "w");
    if (f) {
      f.print(serializeDeviceConfig(cfg));
      f.close();
      Serial.println(F("[CONFIG] Default config created successfully"));
    }
    return false;
  }

  File f = LittleFS.open(CONFIG_FILE_PATH, "r");
  if (!f) {
    Serial.println(F("[CONFIG] Failed to open /config.json for reading"));
    return false;
  }

  String content = f.readString();
  f.close();

  bool success = deserializeDeviceConfig(content, cfg);
  if (success) {
    Serial.println(F("[CONFIG] ✓ /config.json loaded successfully"));
    Serial.printf("[CONFIG] Backend: %s\n", protocolToString(cfg.protocol));
    Serial.printf("[CONFIG] Modules: SD=%d, RTC=%d, DHT=%d, BH=%d, Anemo=%d\n",
                  cfg.modules.sd_card, cfg.modules.rtc_ds3231, cfg.modules.dht22,
                  cfg.modules.bh1750, cfg.modules.anemometer);
  }
  return success;
}

// Save config to LittleFS file
inline bool saveDeviceConfig(const DeviceConfig& cfg) {
  if (!LittleFS.begin()) return false;
  File f = LittleFS.open(CONFIG_FILE_PATH, "w");
  if (!f) {
    Serial.println(F("[CONFIG] Failed to open /config.json for writing"));
    return false;
  }
  f.print(serializeDeviceConfig(cfg));
  f.close();
  Serial.println(F("[CONFIG] ✓ /config.json saved successfully"));
  return true;
}

#endif // DEVICE_CONFIG_H
