"use client";

// รูปจากกล้องมือถือทุกวันนี้อยู่ที่ 12-50 MP ไฟล์ละ 5-15 MB ซึ่งใหญ่เกินความจำเป็นมาก
// สำหรับรูป "จุดวางของ" ที่ดูบนจอมือถือ — ย่อฝั่ง client ก่อนส่งจึงดีกว่าไปขยายเพดาน
// ฝั่งเซิร์ฟเวอร์อย่างเดียว: อัปเร็วกว่า เปลืองเน็ตน้อยกว่า และเปิดดูทีหลังก็ไวกว่า

/** ด้านที่ยาวที่สุดหลังย่อ — 2000px ยังซูมอ่านป้ายชั้นวางได้สบาย */
const MAX_EDGE = 2000;
const QUALITY = 0.82;

// ต่ำกว่านี้ไม่ต้องแตะ ย่อไปก็ไม่ได้อะไรและอาจได้ไฟล์ใหญ่กว่าเดิมด้วยซ้ำ
const SKIP_UNDER_BYTES = 600 * 1024;

// GIF เคลื่อนไหว วาดลง canvas แล้วเหลือเฟรมเดียว ปล่อยผ่านไปทั้งไฟล์
const SKIP_TYPES = new Set(["image/gif"]);

function toCanvas(width, height) {
  if (typeof OffscreenCanvas === "function") return new OffscreenCanvas(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function toBlob(canvas, type, quality) {
  if (typeof canvas.convertToBlob === "function") {
    return canvas.convertToBlob({ type, quality });
  }
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * ย่อ + แปลงเป็น WebP ก่อนอัปโหลด — คืนไฟล์เดิมถ้าย่อแล้วไม่คุ้มหรือทำไม่ได้
 *
 * ทุกทางที่ผิดพลาด (เบราว์เซอร์เก่า ไฟล์เสีย หน่วยความจำไม่พอ) จะคืนไฟล์ต้นฉบับกลับไป
 * ให้เซิร์ฟเวอร์ตัดสินอีกที ดีกว่าทำให้อัปโหลดล้มทั้งที่ไฟล์ใช้ได้
 */
export async function compressImage(file) {
  if (!file?.type?.startsWith("image/") || SKIP_TYPES.has(file.type)) return file;

  try {
    // imageOrientation: "from-image" ให้เบราว์เซอร์หมุนตาม EXIF ให้ ไม่งั้นรูปที่ถ่ายแนวตั้ง
    // จากมือถือจะกลายเป็นนอนหลังวาดลง canvas
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));

    // เล็กอยู่แล้วทั้งขนาดภาพและขนาดไฟล์ — ไม่ต้องเข้ารหัสใหม่ให้เสียคุณภาพฟรี ๆ
    if (scale === 1 && file.size <= SKIP_UNDER_BYTES) {
      bitmap.close?.();
      return file;
    }

    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = toCanvas(width, height);
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close?.();
      return file;
    }

    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await toBlob(canvas, "image/webp", QUALITY);
    // ย่อแล้วดันใหญ่กว่าเดิม (เจอได้กับ PNG กราฟิกเรียบ ๆ) ก็ใช้ของเดิมไป
    if (!blob || blob.size >= file.size) return file;

    const name = `${file.name.replace(/\.[^.]+$/, "")}.webp`;
    return new File([blob], name, { type: "image/webp", lastModified: Date.now() });
  } catch {
    return file;
  }
}
