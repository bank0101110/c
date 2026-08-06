/** @type {import('next').NextConfig} */
const nextConfig = {
  // เปิดให้เครื่องอื่นในวง LAN (มือถือ) โหลด asset ของ dev server ได้
  // ไม่ใส่ = Next บล็อก JS chunk ทั้งหมด หน้าเว็บขึ้นแต่ hydrate ไม่ได้ ปุ่มเลยกดไม่ติด
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],

  experimental: {
    serverActions: {
      // อัปโหลดรูปส่งผ่าน Server Action ซึ่ง default จำกัดที่ 1MB
      // ตั้ง 6mb เผื่อ overhead ของ multipart (ตัวไฟล์จริงจำกัด 5MB ในโค้ดอีกที)
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
