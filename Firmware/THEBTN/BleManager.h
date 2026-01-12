#pragma once
#include <NimBLEDevice.h>

class BleManager {
public:
  void begin();
  void loop();
  void notifyButtonPress(uint8_t buttonId);
};

extern BleManager Ble;
