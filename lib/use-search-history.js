"use client";

import { useCallback, useSyncExternalStore } from "react";

// เก็บไว้ที่เครื่องผู้ใช้เท่านั้น ไม่ได้ส่งขึ้น server — ประวัติการค้นเป็นเรื่องส่วนตัว
// และไม่ต้องผูกกับบัญชี ใครเปิดเครื่องเดิมก็ได้คำค้นเดิมของตัวเอง
const STORAGE_KEY = "check-stock:search-history";
const LIMIT = 8;

// ฝั่ง server ไม่มี localStorage ให้อ่าน ต้องคืน array ตัวเดิมทุกครั้ง ไม่ใช่ [] ก้อนใหม่
// ไม่งั้น useSyncExternalStore จะเห็นว่า snapshot เปลี่ยนทุก render แล้ววนไม่จบ
const EMPTY = [];

const listeners = new Set();

// snapshot ต้องเป็น object เดิมจนกว่าค่าใน localStorage จะเปลี่ยนจริง เลย cache คู่กับ
// ข้อความดิบที่ parse มา ถ้าข้อความยังเหมือนเดิมก็คืน array ก้อนเดิมกลับไป
let cachedRaw = null;
let cachedList = EMPTY;

function parseHistory(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    const clean = parsed.filter((item) => typeof item === "string" && item.trim());
    return clean.length > 0 ? clean.slice(0, LIMIT) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function getSnapshot() {
  let raw;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY) ?? "[]";
  } catch {
    // localStorage ถูกปิด (โหมดส่วนตัวบางเบราว์เซอร์) — ถือว่ายังไม่มีประวัติ
    return EMPTY;
  }

  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedList = parseHistory(raw);
  }
  return cachedList;
}

function getServerSnapshot() {
  return EMPTY;
}

function subscribe(onChange) {
  listeners.add(onChange);
  // แท็บอื่นแก้ประวัติ แท็บนี้ต้องเห็นตาม (storage ยิงเฉพาะข้ามแท็บ ไม่ยิงให้ตัวเอง)
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function writeHistory(terms) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(terms));
  } catch {
    // เขียนไม่ได้ก็ปล่อยไป ประวัติหายได้ ไม่ควรทำให้ช่องค้นหาพัง
  }
  for (const listener of listeners) listener();
}

/**
 * คำค้นล่าสุดของผู้ใช้ เก็บใน localStorage
 *
 * อ่านผ่าน useSyncExternalStore แทน useState + useEffect เพราะ localStorage เป็น
 * external store จริง ๆ — ได้ทั้ง snapshot ฝั่ง server ที่ไม่ทำ hydration พัง
 * และประวัติที่ตรงกันทุกแท็บโดยไม่ต้องรีเฟรช
 */
export function useSearchHistory() {
  const history = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  /** จำคำที่ "ค้นจริง" (กด Enter หรือเลือกจากรายการ) ไม่ใช่ทุกตัวอักษรที่พิมพ์ */
  const remember = useCallback((term) => {
    const trimmed = String(term ?? "").trim();
    if (!trimmed) return;

    // คำเดิมที่ค้นซ้ำให้เด้งขึ้นบนสุด ไม่ใช่มีสองบรรทัด
    const current = getSnapshot();
    writeHistory(
      [
        trimmed,
        ...current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase()),
      ].slice(0, LIMIT)
    );
  }, []);

  const forget = useCallback((term) => {
    writeHistory(getSnapshot().filter((item) => item !== term));
  }, []);

  const clear = useCallback(() => {
    writeHistory([]);
  }, []);

  return { history, remember, forget, clear };
}
