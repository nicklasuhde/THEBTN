#include "EspNowManager.h"
#include "BleManager.h"

#define BUTTON_PIN 25
#define LED_PIN    26

enum Role { ROLE_INIT, ROLE_MASTER, ROLE_CLIENT };
Role role = ROLE_INIT;

bool otaMode = false;
unsigned long lastMasterSeen = 0;

void blink(int ms) {
  digitalWrite(LED_PIN, HIGH);
  delay(ms);
  digitalWrite(LED_PIN, LOW);
}

void blinkStartup() {
  // Blink 3 times to indicate startup complete
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(100);
    digitalWrite(LED_PIN, LOW);
    delay(100);
  }
}

void goToSleep() {
  esp_sleep_enable_ext0_wakeup((gpio_num_t)BUTTON_PIN, 0);
  esp_deep_sleep_start();
}

void setup() {
  Serial.begin(115200);

  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);

  EspNow.begin();
  EspNow.broadcastMasterAnnounce(3000);

  if (!EspNow.masterDetected()) {
    role = ROLE_MASTER;
    Serial.println("ROLE = MASTER");
    Ble.begin();
    Serial.println("BLE advertising started");
  } else {
    role = ROLE_CLIENT;
    Serial.println("ROLE = CLIENT");
  }

  // Blink LED to indicate startup complete
  blinkStartup();
  Serial.println("Setup complete!");
}

void loop() {
  EspNow.loop();

  if (role == ROLE_MASTER) {
    Ble.loop();
    EspNow.sendMasterHeartbeat();

    // Check for button presses from ESP-NOW clients
    if (EspNow.hasButtonPress()) {
      uint8_t buttonId = EspNow.getLastButtonId();
      Serial.print("Forwarding button press to BLE: ");
      Serial.println(buttonId);
      Ble.notifyButtonPress(buttonId);
      blink(50);
    }

    // Also handle local button press on MASTER (for single-device testing)
    static unsigned long lastButtonCheck = 0;
    static bool lastButtonState = HIGH;
    
    if (millis() - lastButtonCheck > 50) {  // Debounce
      bool currentState = digitalRead(BUTTON_PIN);
      if (currentState == LOW && lastButtonState == HIGH) {
        Serial.println("Local button pressed on MASTER");
        uint8_t myId = (uint8_t)(ESP.getEfuseMac() & 0xFF);
        Ble.notifyButtonPress(myId);
        blink(100);
      }
      lastButtonState = currentState;
      lastButtonCheck = millis();
    }
  }

  if (role == ROLE_CLIENT) {
    if (millis() - EspNow.lastMasterSeen() > 5000) {
      ESP.restart(); // master försvann
    }

    if (digitalRead(BUTTON_PIN) == LOW && !otaMode) {
      EspNow.sendButtonPress();
      blink(100);
      goToSleep();
    }
  }

  if (EspNow.otaRequested()) {
    otaMode = true;
    EspNow.startOTA();
  }
}
