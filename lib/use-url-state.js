"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * state ที่เก็บไว้ใน query string แทน React state
 *
 * ปัญหาที่แก้: คำค้นหรือตัวกรองที่เก็บใน useState จะหายทันทีที่เปลี่ยนหน้า
 * เพราะคอมโพเนนต์ถูก unmount กดย้อนกลับมาก็ได้ของว่างเปล่า ต้องเลือกใหม่ทุกครั้ง
 * พอย้ายมาไว้ใน URL เบราว์เซอร์จะคืนค่าให้เองตอนกด back และก๊อปลิงก์ส่งต่อได้ด้วย
 *
 * ใช้ replace ไม่ใช่ push — พิมพ์ค้นหาไม่ควรสร้างประวัติใหม่ทุกตัวอักษร
 * ไม่งั้นกด back ทีเดียวจะได้แค่ลบตัวอักษรทีละตัว ไม่ได้ออกจากหน้า
 */
export function useUrlState(key, defaultValue = "") {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [value, setValue] = useState(() => searchParams.get(key) ?? defaultValue);

  useEffect(() => {
    // หน่วงไว้ก่อน ไม่งั้นพิมพ์ทีละตัวจะยิง replace รัวจนหน่วง
    const timer = setTimeout(() => {
      // อ่านจาก window ตรง ๆ ไม่ใช่จาก searchParams ที่ปิดทับไว้ตอน render
      // เพราะหน้าหนึ่งอาจมีหลายคีย์ ต้องรวมกับค่าล่าสุดของคีย์อื่นไม่ให้ลบกันเอง
      const next = new URLSearchParams(window.location.search);
      if (value && value !== defaultValue) next.set(key, value);
      else next.delete(key);

      const qs = next.toString();
      const target = qs ? `${pathname}?${qs}` : pathname;
      if (target === window.location.pathname + window.location.search) return;

      router.replace(target, { scroll: false });
    }, 300);

    return () => clearTimeout(timer);
  }, [value, key, defaultValue, pathname, router]);

  return [value, setValue];
}
