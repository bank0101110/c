import { siteConfig } from "@/lib/site-config";

// ไฟล์นี้ถูกเสิร์ฟที่ /manifest.webmanifest และ Next ใส่ <link rel="manifest"> ให้เอง
// ไม่ต้องประกาศใน metadata ของ layout ซ้ำ
export default function manifest() {
  return {
    // id ตรึงตัวตนของแอปไว้ ต่อให้วันหลังย้าย start_url เครื่องที่ติดตั้งไว้แล้วจะอัปเดตทับของเดิม
    // ไม่ใช่ขึ้นเป็นแอปใหม่อีกตัว
    id: "/",
    name: `${siteConfig.name} — ${siteConfig.tagline}`,
    short_name: siteConfig.name,
    description: siteConfig.description,
    lang: "th",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    // standalone = เปิดจากไอคอนแล้วไม่มีแถบ URL ของเบราว์เซอร์ เหมือนแอปติดเครื่อง
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["business", "productivity", "utilities"],
    icons: [
      // any = ใช้ทั้งใบตามที่วาด (มีมุมโค้งมาในรูปแล้ว)
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // maskable = Android ครอบทรงของตัวเองทับ เลยต้องพื้นเต็มใบและโลโก้เล็กลงให้อยู่ในเขตปลอดภัย
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // เมนูลัดตอนกดค้างที่ไอคอนแอป
    shortcuts: [
      {
        name: "จัดการสต็อก",
        short_name: "จัดการ",
        url: "/manage",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
