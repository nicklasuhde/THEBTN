#pragma once
#include <esp_now.h>
#include <WiFi.h>

enum MsgType {
  MSG_MASTER,
  MSG_BUTTON,
  MSG_PREPARE_OTA
};

struct EspMsg {
  MsgType type;
  uint8_t sender;
};

class EspNowManager {
public:
  void begin();
  void loop();

  void broadcastMasterAnnounce(uint32_t ms);
  void sendMasterHeartbeat();
  void sendButtonPress();

  bool masterDetected();
  unsigned long lastMasterSeen();

  bool otaRequested();
  void startOTA();

private:
  static void onReceive(const esp_now_recv_info_t* info,
  const uint8_t* data,
  int len);

  static unsigned long _lastMasterSeen;
  static bool _otaFlag;
};

extern EspNowManager EspNow;
