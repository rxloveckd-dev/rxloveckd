# Love CKD — Renal PharmCare (คลินิกรักษ์ไต รพ.เขาชัยสน)

ระบบช่วยเภสัชกรดูแลผู้ป่วยโรคไตเรื้อรังก่อนบำบัดทดแทนไต: ทะเบียนผู้ป่วย, บันทึกการติดตามแทนฟอร์มกระดาษ,
ผลแล็บพร้อม % เปลี่ยนแปลงของ GFR และระยะโรค, สีความเร่งด่วน แดง/ส้ม/เหลือง ที่เภสัชกรระบุเอง, นัดหมาย, DRP,
dashboard และสรุปรายเดือนเป็น Excel

> ระบบนี้เป็นเครื่องมือช่วยงานคลินิก ไม่ได้แทน HOSxP XE หรือการตัดสินใจของบุคลากร และไม่สั่ง/หยุดยาเอง
> ค่าเกณฑ์ทางคลินิกทั้งหมดเป็นค่าเริ่มต้นสำหรับทดลองใช้ จนกว่าทีมคลินิกจะอนุมัติ

## เริ่มใช้งาน (โหมดทดลอง)

ต้องมี Node.js 22 ขึ้นไป

```bash
npm install
copy backend\.env.example backend\.env   # แล้วเปลี่ยน SESSION_SECRET เป็นค่าสุ่มยาว
npm run db:setup                          # สร้างฐานข้อมูล SQLite + ข้อมูลสมมติ 30 ราย
npm run dev                               # API :4000, เว็บ http://localhost:5173
```

บัญชีทดลอง (รหัสผ่าน `demo1234`): `pharm1`, `pharm2` (เภสัชกร), `super1` (เภสัชคลินิก),
`admin1` (ผู้ดูแลระบบ ดูข้อมูลผู้ป่วยไม่ได้)

## เวอร์ชันทดลองออนไลน์ (GitHub Pages + Google Sheets)

ใช้สาธิตด้วยข้อมูลสมมติเท่านั้น หน้าเว็บคำนวณทุกอย่างในเบราว์เซอร์ และบันทึกข้อมูลลง Google Sheet ผ่าน Apps Script
ลิงก์ Apps Script เปิดสาธารณะ ใครมีลิงก์ก็อ่าน/เขียน Sheet ได้ **ห้ามใส่ข้อมูลผู้ป่วยจริง**

1. เปิด Google Sheet > ส่วนขยาย > Apps Script > วางโค้ดจาก `apps-script/Code.gs` > บันทึก > เลือกฟังก์ชัน `setup` > เรียกใช้
2. การทำให้ใช้งานได้ > การทำให้ใช้งานได้รายการใหม่ > เว็บแอป (ดำเนินการในฐานะ: ฉัน, ผู้มีสิทธิ์เข้าถึง: ทุกคน) > คัดลอก URL
3. Build และ deploy:
   ```bash
   set SHEETS_API_URL=https://script.google.com/macros/s/.../exec
   npm run build:pages -w frontend
   ```
   แล้ว push โฟลเดอร์ `frontend/dist-pages` ขึ้น branch `gh-pages`

ถ้าไม่ตั้ง `SHEETS_API_URL` เว็บจะเก็บข้อมูลในเบราว์เซอร์แทน

## ทดสอบ

```bash
npm test          # domain rules (shared) + date field and Enter key (frontend) + API tests (backend)
npm run typecheck
```

## สำรองข้อมูลอัตโนมัติ (Google Sheet ของคลินิก)

`apps-script-backup/Backup.gs` คัดลอก Sheet ทุกคืนเวลาประมาณ 02:00 น. ไว้ในโฟลเดอร์ Drive ชื่อ "Love CKD สำรองข้อมูล" และเก็บไว้ 30 วัน
แยกจากตัวแอปเพราะต้องใช้สิทธิ์ Drive ถ้าเพิ่มในแอป ผู้ใช้ทุกคนจะต้องกดอนุญาตใหม่

ตั้งค่าครั้งเดียว ใช้บัญชีเจ้าของ Sheet:

1. เปิด https://script.google.com > โครงการใหม่ > วางโค้ดจาก `apps-script-backup/Backup.gs`
2. แก้ `SHEET_ID` เป็น ID ของ Sheet (ส่วนระหว่าง `/d/` กับ `/edit` ใน URL) อย่า commit ID นี้เข้า repo เพราะ repo เป็นสาธารณะ
3. เลือกฟังก์ชัน `installDailyBackup` > เรียกใช้ > กดอนุญาต
4. เปิดโฟลเดอร์ใน Drive ดูว่ามีไฟล์สำรองของวันนี้ และอย่าแชร์โฟลเดอร์นี้ เพราะมีข้อมูลผู้ป่วย

กู้คืน: เปิดไฟล์สำรองของวันที่ต้องการ แล้วคัดลอกข้อมูลกลับไปที่ Sheet จริง ถ้าสำรองไม่สำเร็จ Google จะส่งอีเมลแจ้งเจ้าของ

## โครงสร้าง

| โฟลเดอร์ | เนื้อหา |
|---|---|
| `shared/` | กฎทางคลินิกทั้งหมด (eGFR CKD-EPI 2021, ระยะ CKD, สีความเร่งด่วน, ตรวจเลขบัตรประชาชน) และ schema ที่ใช้ร่วมกัน |
| `backend/` | Express 5 + Prisma, ตรวจสิทธิ์ทุก route, audit log |
| `frontend/` | React + Vite หน้าจอภาษาไทย |
| `apps-script/` | ระบบคลินิกบน Google Apps Script |
| `apps-script-backup/` | สคริปต์สำรอง Google Sheet ทุกคืน |
| `specs/001-renal-pharmcare/` | spec, plan, tasks (Spec Kit) |
| `data/LoveCKD_Database.xlsx` | ไฟล์ Excel ชั่วคราวสำหรับบันทึกระหว่างรอระบบ |

## ก่อนใช้งานจริง

ยังไม่พร้อมใช้กับข้อมูลผู้ป่วยจริงจนกว่าจะผ่าน: อนุมัติเกณฑ์ทางคลินิก, ประเมินความปลอดภัยและ PDPA,
เปลี่ยนเป็น MySQL/MariaDB บน server ของโรงพยาบาล (`provider` ใน `backend/prisma/schema.prisma`),
ตั้ง `NODE_ENV=production` และ `DEMO_MODE=false`, ระบบสำรองข้อมูล และ UAT กับเภสัชกร
(ดู checklist ใน spec และ constitution)

สำรองข้อมูลโหมดทดลอง: คัดลอกไฟล์ `backend/prisma/dev.db` ขณะปิดระบบ
