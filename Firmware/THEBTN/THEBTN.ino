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
  } else {
    role = ROLE_CLIENT;
    Serial.println("ROLE = CLIENT");
  }
}

void loop() {
  EspNow.loop();

  if (role == ROLE_MASTER) {
    Ble.loop();
    EspNow.sendMasterHeartbeat();
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
