import { headers } from "next/headers";

/**
 * URL ต้นทางของเว็บ (protocol + host) สำหรับใส่ลง metadata ตอนแชร์ลิงก์
 *
 * og:url กับ og:image ต้องเป็น URL เต็มเสมอ ใส่ path เปล่า ๆ ตัวรีดลิงก์ของ LINE/Facebook
 * จะหารูปไม่เจอแล้วพรีวิวขึ้นเป็นลิงก์เปล่าเหมือนเดิม
 *
 * อ่านจาก header ของ request แทนที่จะ hardcode โดเมนไว้ ย้ายเครื่อง/เปลี่ยนโดเมนแล้ว
 * ไม่ต้องมาแก้โค้ด (ทุกหน้าที่ใช้ตัวนี้เป็น force-dynamic อยู่แล้ว เลยอ่าน header ได้)
 * ถ้าอยู่หลัง proxy ที่ไม่ส่ง x-forwarded-* มา ให้ตั้ง NEXT_PUBLIC_SITE_URL ทับได้
 */
export async function siteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) return "http://localhost:3000";

  // เครื่อง dev ไม่มี TLS ส่วนโดเมนจริงถือว่า https ไว้ก่อน
  const protocol =
    headerList.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return `${protocol}://${host}`;
}
