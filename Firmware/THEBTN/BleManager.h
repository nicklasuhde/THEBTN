#pragma once
#include <NimBLEDevice.h>

class BleManager {
public:
  void begin();
  void loop();
};

extern BleManager Ble;
