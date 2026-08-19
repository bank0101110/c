/** @type {import('next').NextConfig} */
const nextConfig = {
  // เปิดให้เครื่องอื่นในวง LAN (มือถือ) โหลด asset ของ dev server ได้
  // ไม่ใส่ = Next บล็อก JS chunk ทั้งหมด หน้าเว็บขึ้นแต่ hydrate ไม่ได้ ปุ่มเลยกดไม่ติด
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],

  experimental: {
    serverActions: {
      // อัปโหลดรูปส่งผ่าน Server Action ซึ่ง default จำกัดที่ 1MB
      // ตั้ง 12mb เผื่อ overhead ของ multipart (ตัวไฟล์จริงจำกัด 10MB ในโค้ดอีกที)
      // รูปจากกล้องถูกย่อฝั่ง client ก่อนส่งอยู่แล้ว ปกติจึงไม่เข้าใกล้เพดานนี้
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
