#include "BleManager.h"

#define SERVICE_UUID "12345678-1234-1234-1234-1234567890ab"
#define CMD_UUID     "abcd"
#define STATUS_UUID  "dcba"
#define LED_PIN      26

BleManager Ble;
NimBLECharacteristic* statusChar;
NimBLEServer* pServer;
bool deviceConnected = false;
LedCommandCallback ledCallback = nullptr;

class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer* server, NimBLEConnInfo& connInfo) override {
    deviceConnected = true;
    Serial.println("BLE Client connected!");
  }

  void onDisconnect(NimBLEServer* server, NimBLEConnInfo& connInfo, int reason) override {
    deviceConnected = false;
    Serial.println("BLE Client disconnected, restarting advertising...");
    NimBLEDevice::startAdvertising();
  }
};

class CmdCallback : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c, NimBLEConnInfo& connInfo) override {
    std::string cmd = c->getValue();
    Serial.print("Received command: ");
    Serial.println(cmd.c_str());
  
    if (cmd == "UPDATE") {
      // TODO: trigga OTA
      return;
    }
    
    // LED command format: "LED:buttonId:state"
    // Examples: "LED:123:1" (turn on LED for button 123)
    //           "LED:123:0" (turn off LED for button 123)
    //           "LED:0:0"   (turn off all LEDs)
    if (cmd.rfind("LED:", 0) == 0) {
      // Parse the command
      int firstColon = cmd.find(':', 4);
      if (firstColon != std::string::npos) {
        std::string buttonIdStr = cmd.substr(4, firstColon - 4);
        std::string stateStr = cmd.substr(firstColon + 1);
        
        uint8_t buttonId = (uint8_t)atoi(buttonIdStr.c_str());
        bool ledOn = (stateStr == "1" || stateStr == "ON" || stateStr == "on");
        
        Serial.print("LED command parsed - Button: ");
        Serial.print(buttonId);
        Serial.print(", State: ");
        Serial.println(ledOn ? "ON" : "OFF");
        
        // Call the callback if set
        if (ledCallback != nullptr) {
          ledCallback(buttonId, ledOn);
        }
      }
      return;
    }
  }
};

void BleManager::begin() {
  Serial.println("Initializing BLE...");
  
  NimBLEDevice::init("THEBTN");
  NimBLEDevice::setPower(ESP_PWR_LVL_P9);  // Max power for better range
  
  pServer = NimBLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());
  
  NimBLEService* service = pServer->createService(SERVICE_UUID);

  NimBLECharacteristic* cmd =
    service->createCharacteristic(CMD_UUID, NIMBLE_PROPERTY::WRITE);

  statusChar =
    service->createCharacteristic(STATUS_UUID, NIMBLE_PROPERTY::NOTIFY);

  cmd->setCallbacks(new CmdCallback());
  service->start();

  // Configure advertising
  NimBLEAdvertising* pAdvertising = NimBLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setName("THEBTN");
  pAdvertising->start();
  
  Serial.println("BLE advertising started - Device name: THEBTN");
}

void BleManager::loop() {
  // framtida status-notifier
}

void BleManager::notifyButtonPress(uint8_t buttonId) {
  if (deviceConnected && statusChar != nullptr) {
    char msg[32];
    snprintf(msg, sizeof(msg), "BTN%d", buttonId);
    statusChar->setValue((uint8_t*)msg, strlen(msg));
    statusChar->notify();
    Serial.print("BLE notification sent: ");
    Serial.println(msg);
  } else {
    Serial.println("Cannot notify - no BLE client connected");
  }
}

void BleManager::setLedCommandCallback(LedCommandCallback callback) {
  ledCallback = callback;
}

void BleManager::setLocalLed(bool on) {
  digitalWrite(LED_PIN, on ? HIGH : LOW);
}
