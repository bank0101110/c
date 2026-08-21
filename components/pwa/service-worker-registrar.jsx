"use client";

import { useEffect } from "react";

/**
 * ลงทะเบียน /sw.js — ตัวที่ทำให้แอปติดตั้งลงเครื่องได้และมีหน้า offline
 *
 * ใส่ไว้ใน layout ตัวเดียวพอ ไม่ต้องแสดงผลอะไร
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // ตอน dev ห้ามลง: sw จะเก็บ chunk ของ build เก่าค้างไว้ แก้โค้ดแล้วหน้าไม่เปลี่ยน
    // แถมต้องถอนตัวที่ค้างจากการทดสอบ production build บนพอร์ตเดียวกันออกด้วย
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => registrations.forEach((registration) => registration.unregister()))
        .catch(() => {});
      return;
    }

    // รอให้หน้าโหลดเสร็จก่อน จะได้ไม่ไปแย่ง bandwidth กับ chunk ที่หน้าแรกต้องใช้จริง
    const register = () => {
      navigator.serviceWorker
        // updateViaCache: "none" กัน HTTP cache ของเบราว์เซอร์กั๊กไฟล์ sw เวอร์ชันเก่าไว้
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {});
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
