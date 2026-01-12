#pragma once
#include <esp_now.h>
#include <WiFi.h>

enum MsgType {
  MSG_MASTER,
  MSG_BUTTON,
  MSG_PREPARE_OTA,
  MSG_LED_CONTROL  // New message type for LED control
};

struct EspMsg {
  MsgType type;
  uint8_t sender;
  uint8_t data;  // Additional data (e.g., LED state: 0=off, 1=on)
};

class EspNowManager {
public:
  void begin();
  void loop();

  void broadcastMasterAnnounce(uint32_t ms);
  void sendMasterHeartbeat();
  void sendButtonPress();
  
  // LED control - send command to specific button or all buttons
  void sendLedCommand(uint8_t targetId, bool ledOn);
  void broadcastLedOff();  // Turn off all LEDs

  bool masterDetected();
  unsigned long lastMasterSeen();

  bool otaRequested();
  void startOTA();

  // Check if a button press was received from a client
  bool hasButtonPress();
  uint8_t getLastButtonId();
  
  // Check if LED command was received (for clients)
  bool hasLedCommand();
  bool getLedState();
  
  // Get this device's button ID
  uint8_t getMyButtonId();

private:
  static void onReceive(const esp_now_recv_info_t* info,
  const uint8_t* data,
  int len);

  static unsigned long _lastMasterSeen;
  static bool _otaFlag;
  static bool _buttonPressReceived;
  static uint8_t _lastButtonId;
  static bool _ledCommandReceived;
  static bool _ledState;
  static uint8_t _myButtonId;
};

extern EspNowManager EspNow;
