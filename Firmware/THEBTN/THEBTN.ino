#include "EspNowManager.h"
#include "BleManager.h"

#define BUTTON_PIN 25
#define LED_PIN    26

enum Role { ROLE_INIT, ROLE_MASTER, ROLE_CLIENT };
Role role = ROLE_INIT;

bool otaMode = false;
unsigned long lastMasterSeen = 0;

// LED state tracking
bool ledPersistentState = false;  // Controlled by app commands

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

void setLed(bool on) {
  ledPersistentState = on;
  digitalWrite(LED_PIN, on ? HIGH : LOW);
}

void goToSleep() {
  // Turn off LED before sleep
  digitalWrite(LED_PIN, LOW);
  esp_sleep_enable_ext0_wakeup((gpio_num_t)BUTTON_PIN, 0);
  esp_deep_sleep_start();
}

// Callback for LED commands from BLE (app)
void onLedCommand(uint8_t buttonId, bool ledOn) {
  Serial.print("LED command received for button ");
  Serial.print(buttonId);
  Serial.print(" - ");
  Serial.println(ledOn ? "ON" : "OFF");
  
  uint8_t myId = EspNow.getMyButtonId();
  
  // Check if this command is for us (buttonId == 0 means all buttons)
  if (buttonId == 0 || buttonId == myId) {
    // Control local LED (master's own LED)
    setLed(ledOn);
  }
  
  // Forward the command to all clients via ESP-NOW
  EspNow.sendLedCommand(buttonId, ledOn);
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
    
    // Set up LED command callback
    Ble.setLedCommandCallback(onLedCommand);
    
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
        uint8_t myId = EspNow.getMyButtonId();
        Ble.notifyButtonPress(myId);
        blink(100);
      }
      lastButtonState = currentState;
      lastButtonCheck = millis();
    }
    
    // Keep LED state based on app commands
    if (ledPersistentState) {
      digitalWrite(LED_PIN, HIGH);
    }
  }

  if (role == ROLE_CLIENT) {
    if (millis() - EspNow.lastMasterSeen() > 5000) {
      ESP.restart(); // master försvann
    }

    // Check for LED commands from master
    if (EspNow.hasLedCommand()) {
      bool ledState = EspNow.getLedState();
      setLed(ledState);
      Serial.print("Client LED set to: ");
      Serial.println(ledState ? "ON" : "OFF");
    }
    
    // Keep LED state based on received commands
    if (ledPersistentState) {
      digitalWrite(LED_PIN, HIGH);
    }

    if (digitalRead(BUTTON_PIN) == LOW && !otaMode) {
      EspNow.sendButtonPress();
      blink(100);
      // Don't go to sleep if LED should be on
      if (!ledPersistentState) {
        goToSleep();
      }
    }
  }

  if (EspNow.otaRequested()) {
    otaMode = true;
    EspNow.startOTA();
  }
}
