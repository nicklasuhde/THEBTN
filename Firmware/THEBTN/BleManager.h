#pragma once
#include <NimBLEDevice.h>

// LED command callback type
typedef void (*LedCommandCallback)(uint8_t buttonId, bool ledOn);

class BleManager {
public:
  void begin();
  void loop();
  void notifyButtonPress(uint8_t buttonId);
  
  // Set callback for when LED commands are received from app
  void setLedCommandCallback(LedCommandCallback callback);
  
  // Control local LED (for master device)
  void setLocalLed(bool on);
};

extern BleManager Ble;
