#include "EspNowManager.h"
#include <ArduinoOTA.h>

EspNowManager EspNow;
unsigned long EspNowManager::_lastMasterSeen = 0;
bool EspNowManager::_otaFlag = false;
bool EspNowManager::_buttonPressReceived = false;
uint8_t EspNowManager::_lastButtonId = 0;
bool EspNowManager::_ledCommandReceived = false;
bool EspNowManager::_ledState = false;
uint8_t EspNowManager::_myButtonId = 0;

void EspNowManager::begin() {
  WiFi.mode(WIFI_STA);
  esp_now_init();
  esp_now_register_recv_cb(onReceive);
  
  // Store our button ID
  _myButtonId = (uint8_t)(ESP.getEfuseMac() & 0xFF);
}

void EspNowManager::broadcastMasterAnnounce(uint32_t ms) {
  EspMsg msg{MSG_MASTER, (uint8_t)(ESP.getEfuseMac() & 0xFF), 0};
  unsigned long start = millis();
  while (millis() - start < ms) {
    esp_now_send(NULL, (uint8_t*)&msg, sizeof(msg));
    delay(300);
  }
}

void EspNowManager::sendMasterHeartbeat() {
  static unsigned long last = 0;
  if (millis() - last > 1000) {
    EspMsg msg{MSG_MASTER, 0, 0};
    esp_now_send(NULL, (uint8_t*)&msg, sizeof(msg));
    last = millis();
  }
}

void EspNowManager::sendButtonPress() {
  EspMsg msg{MSG_BUTTON, _myButtonId, 0};
  esp_now_send(NULL, (uint8_t*)&msg, sizeof(msg));
}

void EspNowManager::sendLedCommand(uint8_t targetId, bool ledOn) {
  // targetId = 0 means broadcast to all, otherwise specific button
  EspMsg msg{MSG_LED_CONTROL, targetId, ledOn ? (uint8_t)1 : (uint8_t)0};
  esp_now_send(NULL, (uint8_t*)&msg, sizeof(msg));
  Serial.print("ESP-NOW: Sending LED command to ");
  Serial.print(targetId == 0 ? "ALL" : String(targetId).c_str());
  Serial.print(" - LED ");
  Serial.println(ledOn ? "ON" : "OFF");
}

void EspNowManager::broadcastLedOff() {
  sendLedCommand(0, false);  // 0 = all buttons, false = LED off
}

void EspNowManager::onReceive(const esp_now_recv_info_t* info,
  const uint8_t* data,
  int len) {
  EspMsg msg;
  memcpy(&msg, data, sizeof(msg));

  if (msg.type == MSG_MASTER) {
    _lastMasterSeen = millis();
  }

  if (msg.type == MSG_BUTTON) {
    _buttonPressReceived = true;
    _lastButtonId = msg.sender;
    Serial.print("ESP-NOW: Button press received from client ");
    Serial.println(msg.sender);
  }

  if (msg.type == MSG_PREPARE_OTA) {
    _otaFlag = true;
  }
  
  if (msg.type == MSG_LED_CONTROL) {
    // Check if this command is for us (targetId == 0 means all, or matches our ID)
    if (msg.sender == 0 || msg.sender == _myButtonId) {
      _ledCommandReceived = true;
      _ledState = (msg.data == 1);
      Serial.print("ESP-NOW: LED command received - ");
      Serial.println(_ledState ? "ON" : "OFF");
    }
  }
}

bool EspNowManager::hasButtonPress() {
  if (_buttonPressReceived) {
    _buttonPressReceived = false;
    return true;
  }
  return false;
}

uint8_t EspNowManager::getLastButtonId() {
  return _lastButtonId;
}

bool EspNowManager::hasLedCommand() {
  if (_ledCommandReceived) {
    _ledCommandReceived = false;
    return true;
  }
  return false;
}

bool EspNowManager::getLedState() {
  return _ledState;
}

uint8_t EspNowManager::getMyButtonId() {
  return _myButtonId;
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
