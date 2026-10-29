import sys

def process():
    with open('src/main.cpp', 'r') as f:
        content = f.read()

    # Add LittleFS include
    content = content.replace('#include <ArduinoJson.h>', '#include <ArduinoJson.h>\n#include <LittleFS.h>')

    # Add LittleFS init
    init_code = """
  // --- LittleFS Init ---
  if (!LittleFS.begin()) {
    Serial.println(F("[INIT] LittleFS Mount Failed! Memformat..."));
    LittleFS.format();
    LittleFS.begin();
  }
  Serial.println(F("[INIT] LittleFS ✓"));
  if (!LittleFS.exists("/q")) {
    LittleFS.mkdir("/q");
  }
"""
    content = content.replace('  // --- Init buffer ---', init_code + '\n  // --- Init buffer ---')

    # Update getIso8601Timestamp
    content = content.replace('return String("1970-01-01T00:00:00+07:00");', 'return "";')

    # Modify postToFirestoreDirect signature and return type
    content = content.replace('void postToFirestoreDirect(const String& isoTime, float temp, float hum, float wind, float lux) {',
                              'bool postToFirestoreDirect(const String& isoTime, float temp, float hum, float wind, float lux) {')
    content = content.replace('if (WiFi.status() != WL_CONNECTED) return;', 'if (WiFi.status() != WL_CONNECTED) return false;')
    
    old_post_firebase = """    int httpCode = http.POST(jsonBody);
    if (httpCode >= 200 && httpCode < 300) {
      Serial.printf("[FIREBASE] ✓ Firestore Direct Save success (code %d)\\n", httpCode);
      digitalWrite(LED_PIN, LOW);   // Blink LED indicator on success
      delay(100);
      digitalWrite(LED_PIN, HIGH);
      firstPublishDone = true;
    } else {
      Serial.printf("[FIREBASE] ✗ Firestore Direct Save error (code %d)\\n", httpCode);
    }
    http.end();
  }
}"""
    new_post_firebase = """    int httpCode = http.POST(jsonBody);
    bool success = false;
    if (httpCode >= 200 && httpCode < 300) {
      Serial.printf("[FIREBASE] ✓ Firestore Direct Save success (code %d)\\n", httpCode);
      digitalWrite(LED_PIN, LOW);   // Blink LED indicator on success
      delay(100);
      digitalWrite(LED_PIN, HIGH);
      firstPublishDone = true;
      success = true;
    } else {
      Serial.printf("[FIREBASE] ✗ Firestore Direct Save error (code %d)\\n", httpCode);
    }
    http.end();
    return success;
  }
  return false;
}"""
    content = content.replace(old_post_firebase, new_post_firebase)

    with open('src/main.cpp', 'w') as f:
        f.write(content)

process()
