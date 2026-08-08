import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * รอให้ครบเวลาขั้นต่ำก่อนคืนผล เพื่อให้สปินเนอร์ทันได้ถูกมองเห็น
 *
 * DB ตอบใน ~40ms งานบันทึกทั้งชุดจบใน ~100ms ซึ่งเร็วกว่าที่ตาจะจับได้
 * สปินเนอร์เลยกระพริบ 1-2 เฟรมแล้วหาย ผู้ใช้ไม่รู้ว่ากดติดหรือเปล่า
 * ถ้างานใช้เวลานานกว่าเวลาขั้นต่ำอยู่แล้ว จะไม่ถ่วงเพิ่มเลย
 *
 * 200ms คือจุดที่ยังเห็นสปินเนอร์ทันแต่ยังไม่รู้สึกว่าหน่วง — ต่ำกว่านี้จะกลับไปกระพริบ
 */
export function withMinDuration(promise, ms = 200) {
  return Promise.all([
    promise,
    new Promise((resolve) => setTimeout(resolve, ms)),
  ]).then(([value]) => value);
}
