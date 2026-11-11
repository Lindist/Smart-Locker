'use client';

import React, { useState, useEffect } from 'react';
import { LockerState } from '@/lib/types';
import { Cpu, Power, CheckCircle, Wifi, Lock, Unlock, AlertTriangle, Code, Terminal } from 'lucide-react';

interface HardwareSimulatorProps {
  locker: LockerState;
  onRefresh: () => void;
}

export default function HardwareSimulator({ locker, onRefresh }: HardwareSimulatorProps) {
  const [activeTab, setActiveTab] = useState<'visual' | 'code' | 'logs'>('visual');
  const [loading, setLoading] = useState(false);
  const [relayFired, setRelayFired] = useState(false);
  const [hardwareLogs, setHardwareLogs] = useState<string[]>([]);

  useEffect(() => {
    setHardwareLogs([
      `[${new Date().toLocaleTimeString()}] ESP32 Booted: Connected to Wi-Fi`,
      `[${new Date().toLocaleTimeString()}] Solenoid Lock initialized: LOCKED`,
    ]);
  }, []);

  // When backend sends "UNLOCK" command, simulate ESP32 executing it
  useEffect(() => {
    if (locker.hardwareCommand === 'UNLOCK') {
      setRelayFired(true);
      const timeStr = new Date().toLocaleTimeString();
      setHardwareLogs((prev) => [
        `[${timeStr}] ⚡ [ESP32] Hardware command received: UNLOCK!`,
        `[${timeStr}] 🔌 [Relay] GPIO 23 set HIGH -> Solenoid 12V Retracted!`,
        ...prev.slice(0, 20),
      ]);

      // Acknowledge hardware command
      fetch('/api/hardware', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ACK_UNLOCK' }),
      }).then(() => {
        onRefresh();
      });

      // Keep relay triggered for 3 seconds then turn off
      const timer = setTimeout(() => {
        setRelayFired(false);
        setHardwareLogs((prev) => [
          `[${new Date().toLocaleTimeString()}] 🔌 [Relay] GPIO 23 set LOW -> Solenoid locked`,
          ...prev.slice(0, 20),
        ]);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [locker.hardwareCommand, onRefresh]);

  // Simulate physical door sensor (Reed switch) opening / closing
  const handleToggleDoor = async (targetState: 'OPEN' | 'CLOSED') => {
    setLoading(true);
    try {
      await fetch('/api/hardware', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doorState: targetState }),
      });
      const timeStr = new Date().toLocaleTimeString();
      setHardwareLogs((prev) => [
        `[${timeStr}] 🧲 [Reed Sensor] GPIO 18: Door is now ${targetState}`,
        ...prev.slice(0, 20),
      ]);
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const sampleArduinoCode = `// ESP32 Arduino Code for Smart Parcel Locker (Single Compartment)
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "https://your-app.vercel.app/api/hardware";

const int RELAY_PIN = 23;      // Connected to Relay Module (controls 12V Solenoid)
const int REED_SENSOR_PIN = 18; // Connected to Door Magnetic Switch (Reed switch)

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW); // Solenoid Locked
  pinMode(REED_SENSOR_PIN, INPUT_PULLUP);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nWiFi Connected!");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    int httpResponseCode = http.GET();

    if (httpResponseCode == 200) {
      String payload = http.getString();
      StaticJsonDocument<256> doc;
      deserializeJson(doc, payload);

      const char* command = doc["command"]; // "UNLOCK" or "IDLE"

      if (strcmp(command, "UNLOCK") == 0) {
        Serial.println(">>> UNLOCK COMMAND RECEIVED! Triggering Solenoid...");
        digitalWrite(RELAY_PIN, HIGH); // Unlock
        delay(3000);                   // Keep open 3 sec
        digitalWrite(RELAY_PIN, LOW);  // Lock

        // Acknowledge command to server
        http.begin(serverUrl);
        http.addHeader("Content-Type", "application/json");
        http.POST("{\\"action\\":\\"ACK_UNLOCK\\"}");
      }
    }
    http.end();
  }
  delay(1500); // Poll every 1.5 seconds
}
`;

  return (
    <div className="bg-slate-900 text-white rounded-3xl shadow-2xl border-4 border-slate-700 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-slate-800/90 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-purple-500/30">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-base text-white">IoT Hardware & Locker Simulator</h2>
            <p className="text-xs text-slate-400">จำลองการทำงานของบอร์ด ESP32 และกลอนไฟฟ้าจริง</p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveTab('visual')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'visual' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Power className="w-3.5 h-3.5" /> เครื่องจำลอง (Live)
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'code' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code className="w-3.5 h-3.5" /> โค้ด ESP32 (Arduino)
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'logs' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" /> Hardware Logs
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="p-6">
        {activeTab === 'visual' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Box 1: Physical Locker Visual */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col items-center justify-center">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                มุมมองตู้พัสดุ (Physical Box Visual)
              </h3>

              {/* Graphic Representation of Locker Door */}
              <div className="relative w-48 h-56 rounded-2xl border-4 border-slate-600 bg-slate-900 shadow-2xl flex flex-col items-center justify-center overflow-hidden">
                {/* Inside compartment view */}
                <div className="text-center p-3">
                  {locker.status === 'OCCUPIED' ? (
                    <div className="animate-pulse">
                      <div className="w-16 h-16 rounded-xl bg-amber-600/30 border-2 border-amber-500 flex items-center justify-center mx-auto mb-2 text-2xl shadow-lg">
                        📦
                      </div>
                      <span className="text-[10px] text-amber-300 font-mono font-semibold">
                        มีพัสดุอยู่ข้างใน
                      </span>
                    </div>
                  ) : (
                    <div>
                      <div className="w-16 h-16 rounded-xl bg-slate-800 border-2 border-dashed border-slate-700 flex items-center justify-center mx-auto mb-2 text-xl text-slate-500">
                        ว่าง
                      </div>
                      <span className="text-[10px] text-slate-500">ช่องตู้ว่าง</span>
                    </div>
                  )}
                </div>

                {/* Door Overlay (Simulating Door Open / Closed) */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-800 border-r-4 border-slate-600 p-4 flex flex-col justify-between transition-all duration-700 origin-left ${
                    locker.doorState === 'OPEN'
                      ? 'transform -rotate-y-90 scale-x-20 opacity-40 translate-x-32'
                      : 'opacity-100'
                  }`}
                >
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span className="font-bold">LOCKER #01</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  </div>

                  <div className="flex flex-col items-center my-auto">
                    {locker.doorState === 'OPEN' ? (
                      <Unlock className="w-8 h-8 text-rose-400" />
                    ) : (
                      <Lock className="w-8 h-8 text-emerald-400" />
                    )}
                    <span className="text-xs font-bold mt-1 text-white">
                      {locker.doorState === 'OPEN' ? 'OPEN' : 'LOCKED'}
                    </span>
                  </div>

                  <div className="h-6 w-2 rounded-full bg-slate-500 self-end"></div>
                </div>
              </div>

              {/* Door controls */}
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => handleToggleDoor('OPEN')}
                  disabled={loading || locker.doorState === 'OPEN'}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl border border-slate-700 text-slate-200 disabled:opacity-40 transition"
                >
                  🚪 ง้างเปิดประตู
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleDoor('CLOSED')}
                  disabled={loading || locker.doorState === 'CLOSED'}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl border border-slate-700 text-slate-200 disabled:opacity-40 transition"
                >
                  🔒 ดันปิดประตูให้สนิท
                </button>
              </div>
            </div>

            {/* Box 2: Electronic Circuit & Status */}
            <div className="space-y-4">
              {/* ESP32 Status Card */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-white">Microcontroller: ESP32-WROOM-32</span>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Wifi className="w-3 h-3" /> Online
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <div>
                    <span className="text-slate-500">Wi-Fi IP:</span> 192.168.1.142
                  </div>
                  <div>
                    <span className="text-slate-500">Ping:</span> 24 ms
                  </div>
                  <div>
                    <span className="text-slate-500">Relay Pin:</span> GPIO 23
                  </div>
                  <div>
                    <span className="text-slate-500">Sensor Pin:</span> GPIO 18
                  </div>
                </div>
              </div>

              {/* Relay & Solenoid Status */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-white">🔌 1-Channel Relay & Solenoid 12V</span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full transition ${
                      relayFired || locker.doorState === 'OPEN'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    }`}
                  >
                    {relayFired || locker.doorState === 'OPEN' ? '⚡ TRIGGERED (UNLOCKED)' : '💤 IDLE (LOCKED)'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-3.5 h-3.5 rounded-full ${
                        relayFired ? 'bg-rose-500 shadow-lg shadow-rose-500/50' : 'bg-slate-700'
                      }`}
                    ></div>
                    <span className="text-slate-300">Relay Coils State:</span>
                  </div>
                  <span className="font-mono font-bold text-white">{relayFired ? 'HIGH (Active)' : 'LOW (Off)'}</span>
                </div>
              </div>

              {/* Door Sensor Reed Switch */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white block">🧲 Magnetic Reed Switch Sensor</span>
                  <span className="text-[11px] text-slate-400">ตรวจจับการปิดประตูตู้สนิท</span>
                </div>
                <span
                  className={`px-3 py-1 rounded-full font-bold ${
                    locker.doorState === 'CLOSED'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {locker.doorState === 'CLOSED' ? 'ประตูปิดสนิท' : 'ประตูเปิดอ้า'}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'code' && (
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
              <span>โค้ดภาษา C++ สำหรับ Flash ลงบอร์ด ESP32 โดยตรง:</span>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(sampleArduinoCode)}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
              >
                คัดลอกโค้ด
              </button>
            </div>
            <pre className="text-xs font-mono text-emerald-400 bg-slate-900 p-4 rounded-xl overflow-x-auto max-h-96 leading-relaxed">
              {sampleArduinoCode}
            </pre>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <div className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-purple-400" />
              ESP32 Serial & Event Monitor:
            </div>
            <div className="font-mono text-xs text-slate-300 space-y-1.5 max-h-72 overflow-y-auto">
              {hardwareLogs.map((log, i) => (
                <div key={i} className="py-1 border-b border-slate-900">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
