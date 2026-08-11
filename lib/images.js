// รูปสินค้าที่นำเข้าจาก Shopee ชี้ไปที่ไฟล์ต้นฉบับ ซึ่งใหญ่ระดับ 70-300 KB ต่อรูป
// หน้าแรกมีการ์ดเป็นร้อย ถ้าโหลดต้นฉบับหมดคือหลักสิบ MB
//
// CDN ของ Shopee รับ suffix ต่อท้ายชื่อไฟล์เพื่อขอขนาดย่อได้:
//   <hash>           ต้นฉบับ      ~68 KB
//   <hash>_tn        ย่อ JPEG     ~19 KB
//   <hash>_tn.webp   ย่อ WebP     ~13 KB   <- ใช้ตัวนี้
//
// รูปที่มาจากที่อื่น (เช่น Supabase Storage ที่ผู้ใช้อัปโหลดเอง) ต้องปล่อยไว้เหมือนเดิม
// ไม่งั้น URL จะพังเพราะมันไม่รู้จัก suffix นี้

const SHOPEE_CDN = /(^https?:\/\/[^/]*\.susercontent\.com\/file\/)([^/?#]+)$/;

/** ขนาดย่อสำหรับการ์ด/ภาพตัวอย่าง — ไม่ใช่ URL ของ Shopee จะคืนค่าเดิม */
export function thumbnailUrl(url) {
  if (!url) return url;
  const match = SHOPEE_CDN.exec(url);
  if (!match) return url;

  const [, prefix, hash] = match;
  // กันเติมซ้ำถ้าเผลอเรียกสองรอบ
  if (hash.endsWith("_tn.webp") || hash.endsWith("_tn")) return url;
  return `${prefix}${hash}_tn.webp`;
}
