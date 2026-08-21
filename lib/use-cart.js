"use client";

import { useCallback, useSyncExternalStore } from "react";

// ตะกร้าเก็บในเครื่องที่กด ไม่ได้อยู่ใน DB — ของที่ยังไม่กดบันทึกไม่ควรไปโผล่ในระบบ
// และคนหยิบของมักถือเครื่องเดิมทั้งรอบอยู่แล้ว ปิดแอปกลางทางแล้วเปิดใหม่ของยังอยู่ครบ
const STORAGE_KEY = "check-stock:pick-cart";

// รายการเดียวกันใส่ซ้ำจะบวกจำนวนเข้าไปในแถวเดิม ไม่ใช่มีสองแถว
const keyOf = (item) => `${item.skuId}:${item.unitTypeId}`;

const EMPTY = [];
const listeners = new Set();

let cachedRaw = null;
let cachedList = EMPTY;

function parseCart(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    const clean = parsed.filter(
      (item) =>
        Number.isInteger(item?.skuId) &&
        Number.isInteger(item?.unitTypeId) &&
        Number.isInteger(item?.amount)
    );
    return clean.length > 0 ? clean : EMPTY;
  } catch {
    return EMPTY;
  }
}

function getSnapshot() {
  let raw;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY) ?? "[]";
  } catch {
    return EMPTY;
  }

  // ต้องคืน array ตัวเดิมจนกว่าค่าจริงจะเปลี่ยน ไม่งั้น useSyncExternalStore วนไม่จบ
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedList = parseCart(raw);
  }
  return cachedList;
}

function getServerSnapshot() {
  return EMPTY;
}

function subscribe(onChange) {
  listeners.add(onChange);
  // เปิดหลายแท็บก็ให้ตะกร้าตรงกัน (storage ยิงข้ามแท็บ ไม่ยิงให้ตัวเอง)
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function write(items) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // เขียนไม่ได้ก็ปล่อยไป ดีกว่าทำให้ปุ่มใส่ตะกร้าพัง
  }
  for (const listener of listeners) listener();
}

/**
 * ตะกร้าเบิกของ — รายการที่ตั้งใจจะตัด/รับเข้าพร้อมกันทีเดียว
 *
 * แต่ละแถวเก็บข้อมูลที่ใช้วาดหน้าจอไว้ด้วย (ชื่อสินค้า/ชื่อตัวเลือก/รูป/ชื่อหน่วย)
 * จะได้เปิดตะกร้าดูได้ทันทีโดยไม่ต้องยิงถามเซิร์ฟเวอร์ ส่วนยอดคงเหลือที่ติดมาถือเป็น
 * ค่า ณ ตอนที่ใส่ตะกร้า — ตอนกดบันทึกเซิร์ฟเวอร์ตรวจยอดจริงให้อีกชั้นเสมอ
 */
export function useCart() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  /** ใส่หลายรายการทีเดียว (จากหน้าสินค้าที่ติ๊กไว้หลายตัว หรือจากชุดเบิกประจำ) */
  const addMany = useCallback((incoming) => {
    if (!Array.isArray(incoming) || incoming.length === 0) return 0;

    const current = getSnapshot();
    const byKey = new Map(current.map((item) => [keyOf(item), item]));

    for (const item of incoming) {
      const existing = byKey.get(keyOf(item));
      byKey.set(
        keyOf(item),
        existing ? { ...existing, ...item, amount: existing.amount + item.amount } : item
      );
    }

    write([...byKey.values()]);
    return incoming.length;
  }, []);

  const setAmount = useCallback((key, amount) => {
    write(getSnapshot().map((item) => (keyOf(item) === key ? { ...item, amount } : item)));
  }, []);

  /** เปลี่ยนหน่วยของแถวหนึ่ง — key เปลี่ยนตามหน่วย เลยต้องกันไปชนแถวที่มีอยู่แล้ว */
  const setUnit = useCallback((key, unit) => {
    const current = getSnapshot();
    const target = current.find((item) => keyOf(item) === key);
    if (!target) return;

    const next = { ...target, unitTypeId: unit.id, unitName: unit.name, unitQty: unit.qty };
    write([
      ...current.filter((item) => keyOf(item) !== key && keyOf(item) !== keyOf(next)),
      next,
    ]);
  }, []);

  const remove = useCallback((key) => {
    write(getSnapshot().filter((item) => keyOf(item) !== key));
  }, []);

  const clear = useCallback(() => write([]), []);

  return { items, addMany, setAmount, setUnit, remove, clear, keyOf };
}

export { keyOf as cartKeyOf };
