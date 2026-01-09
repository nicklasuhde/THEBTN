#include "EspNowManager.h"
#include <ArduinoOTA.h>

EspNowManager EspNow;
unsigned long EspNowManager::_lastMasterSeen = 0;
bool EspNowManager::_otaFlag = false;

void EspNowManager::begin() {
  WiFi.mode(WIFI_STA);
  esp_now_init();
  esp_now_register_recv_cb(onReceive);
}

void EspNowManager::broadcastMasterAnnounce(uint32_t ms) {
  EspMsg msg{MSG_MASTER, (uint8_t)(ESP.getEfuseMac() & 0xFF)};
  unsigned long start = millis();
  while (millis() - start < ms) {
    esp_now_send(NULL, (uint8_t*)&msg, sizeof(msg));
    delay(300);
  }
}

void EspNowManager::sendMasterHeartbeat() {
  static unsigned long last = 0;
  if (millis() - last > 1000) {
    EspMsg msg{MSG_MASTER, 0};
    esp_now_send(NULL, (uint8_t*)&msg, sizeof(msg));
    last = millis();
  }
}

void EspNowManager::sendButtonPress() {
  EspMsg msg{MSG_BUTTON, (uint8_t)(ESP.getEfuseMac() & 0xFF)};
  esp_now_send(NULL, (uint8_t*)&msg, sizeof(msg));
}

void EspNowManager::onReceive(const esp_now_recv_info_t* info,
  const uint8_t* data,
  int len) {
  EspMsg msg;
  memcpy(&msg, data, sizeof(msg));

  if (msg.type == MSG_MASTER) {
  _lastMasterSeen = millis();
  }

  if (msg.type == MSG_PREPARE_OTA) {
  _otaFlag = true;
  }
}

bool EspNowManager::masterDetected() {
  return _lastMasterSeen != 0;
}

unsigned long EspNowManager::lastMasterSeen() {
  return _lastMasterSeen;
}

bool EspNowManager::otaRequested() {
  return _otaFlag;
}

void EspNowManager::startOTA() {
  WiFi.begin("QUIZ_UPDATE");
  ArduinoOTA.begin();
  while (true) {
    ArduinoOTA.handle();
    delay(10);
  }
}

void EspNowManager::loop() {}
