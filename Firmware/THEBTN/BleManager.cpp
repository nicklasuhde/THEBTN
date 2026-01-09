#include "BleManager.h"

#define SERVICE_UUID "12345678-1234-1234-1234-1234567890ab"
#define CMD_UUID     "abcd"
#define STATUS_UUID  "dcba"

BleManager Ble;
NimBLECharacteristic* statusChar;

class CmdCallback : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c, NimBLEConnInfo& connInfo) override {
    std::string cmd = c->getValue();
  
    if (cmd == "UPDATE") {
      // TODO: trigga OTA
    }
  }
};

void BleManager::begin() {
  NimBLEDevice::init("QUIZ_MASTER");
  NimBLEServer* server = NimBLEDevice::createServer();
  NimBLEService* service = server->createService(SERVICE_UUID);

  NimBLECharacteristic* cmd =
    service->createCharacteristic(CMD_UUID, NIMBLE_PROPERTY::WRITE);

  statusChar =
    service->createCharacteristic(STATUS_UUID, NIMBLE_PROPERTY::NOTIFY);

  cmd->setCallbacks(new CmdCallback());
  service->start();

  NimBLEDevice::getAdvertising()->start();
}

void BleManager::loop() {
  // framtida status-notifier
}
