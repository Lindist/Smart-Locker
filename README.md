# 📦 Intelligent Parcel Locker System (ระบบตู้ไปรษณีย์อัจฉริยะ)
ระบบตู้ล็อกเกอร์พัสดุอัจฉริยะแบบ 1 ช่อง (Single Compartment) ทำงานผ่านเว็บ Full Stack (Next.js + TypeScript + Tailwind CSS) รองรับการแจ้งเตือนผ่าน LINE และปลดล็อกตู้ด้วย QR Code หรือ PIN Code

---

## 🌟 จุดเด่นของระบบ (Key Features)

1. **หน้าจอตู้ Kiosk (จอสัมผัส):**
   * **เมื่อตู้ว่าง (AVAILABLE):** ผู้ส่งแตะปุ่มเพื่อสั่งเปิดตู้ นำพัสดุใส่ และกรอกข้อมูลผู้รับ (หรือเลือกจากสมุดรายชื่อผู้พักอาศัย)
   * **เมื่อมีพัสดุ (OCCUPIED):** ตู้ล็อกอัตโนมัติ แสดง Dynamic QR Code ให้ผู้รับสแกนผ่านมือถือ หรือแป้นกดรหัส PIN 6 หลักบนหน้าจอ
2. **ระบบแจ้งเตือนเข้า LINE อัตโนมัติ:**
   * ทันทีที่ผู้ส่งฝากพัสดุเสร็จ ระบบจะส่งการ์ด **LINE Flex Message** เข้ามือถือของผู้รับโดยตรง พร้อมระบุรหัส PIN 6 หลัก และปุ่มกดเปิดตู้ผ่านเว็บ
3. **เว็บปลดล็อกสำหรับผู้รับ (Mobile Web):**
   * ผู้รับสแกน QR Code หน้าตู้ หรือแตะลิงก์จาก LINE เพื่อเปิดหน้าเว็บปลดล็อกได้ทันทีจากมือถือ ไม่ต้องดาวน์โหลดแอป
4. **เครื่องจำลองฮาร์ดแวร์ & ESP32 (Hardware Simulator):**
   * มีหน้าจำลองตู้จริงในระบบ แสดงสถานะกลอนแม่เหล็กไฟฟ้า (Solenoid Lock 12V), โมดูล Relay, และเซนเซอร์ตรวจจับประตูปิดสนิท (Magnetic Reed Switch) พร้อมโค้ดภาษา C++ สำหรับ Flash ลง ESP32 จริง
5. **Admin Management Dashboard:**
   * สั่งปลดล็อกตู้ฉุกเฉิน (Force Unlock), ดูประวัติการฝาก/รับพัสดุย้อนหลัง (Audit Logs), และรีเซ็ตสถานะระบบ

---

## 🚀 วิธีเปิดใช้งานโปรเจกต์ในเครื่อง (Local Development)

เปิด Terminal ในโฟลเดอร์โปรเจกต์แล้วรันคำสั่ง:

```bash
# รันเซิร์ฟเวอร์แบบ Development
npm run dev
```

เปิด Browser ไปที่: [http://localhost:3000](http://localhost:3000)

---

## 🛠️ โครงสร้างระบบ (Tech Stack & Architecture)

* **Frontend & Backend:** Next.js (App Router, TypeScript, React 19)
* **Styling & UI:** Tailwind CSS, Lucide Icons, QR Code Generator (`qrcode.react`)
* **API Endpoints:**
  * `GET  /api/locker/status` - ตรวจสอบสถานะตู้, พัสดุ, และประวัติ
  * `POST /api/locker/deposit` - สั่งเปิดตู้เพื่อฝาก / บันทึกการฝากพัสดุและส่ง LINE
  * `POST /api/locker/unlock` - สั่งปลดล็อกตู้ผ่านรหัส PIN หรือ QR Token
  * `POST /api/locker/complete` - ปิดประตูปิดงานตู้ พร้อมรับพัสดุชิ้นถัดไป
  * `GET/POST /api/hardware` - สำหรับบอร์ด ESP32 Polling รับคำสั่งปลดล็อก
  * `POST /api/admin` - สั่งปลดล็อกฉุกเฉิน / รีเซ็ตระบบ

---

## 📟 วงจรและอุปกรณ์ฮาร์ดแวร์ (IoT ESP32 Wiring)

| อุปกรณ์ | การเชื่อมต่อกับ ESP32 |
| :--- | :--- |
| **บอร์ด ESP32** | เชื่อมต่อ Wi-Fi ในพื้นที่ |
| **Relay Module (1-Channel)** | ขา Signal ต่อเข้า **GPIO 23** |
| **Solenoid Lock 12V** | ต่อผ่านหน้าสัมผัส COM / NO ของ Relay เข้ากับแหล่งจ่ายไฟ 12V |
| **Magnetic Reed Sensor** | ขาหนึ่งต่อ **GPIO 18** (INPUT_PULLUP) อีกขาต่อ **GND** |

*โค้ด ESP32 (Arduino C++) สามารถเปิดดูและคัดลอกจากแท็บ **"โค้ด ESP32 (Arduino)"** ในระบบได้ทันที*

---

## ☁️ แนวทางการ Deploy สู่ระบบจริง (ฟรี 100%)

1. **Web Server:** Deploy ขึ้น **Vercel** (ฟรีตลอดชีพ) จะได้ URL ที่มี HTTPS เช่น `https://smart-parcel-locker.vercel.app`
2. **LINE Messaging API:** 
   * สร้าง Provider และ Messaging API Channel ใน [LINE Developers Console](https://developers.line.biz)
   * นำ **Channel Access Token** มาใส่ใน `.env.local`
3. **ESP32:** เปลี่ยน `serverUrl` ในโค้ด ESP32 ให้ชี้ไปยัง Domain ของ Vercel ที่ Deploy แล้ว
