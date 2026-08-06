// สิทธิ์ต่อสินค้าหนึ่งชิ้น — ใช้ทั้งฝั่ง client (ซ่อนปุ่ม) และฝั่ง server (กันจริง)
// ห้ามใช้ฝั่ง client อย่างเดียว เพราะ Server Action ยิงตรงได้โดยไม่ผ่าน UI

/** เจ้าของแก้ชื่อ/รูป/หน่วย ลบสินค้า และตั้งยอดใหม่ (ADJUSTMENT) ได้ */
export function canManageProduct(product, user) {
  if (!user || !product) return false;
  // ของเก่าที่ยังไม่มีเจ้าของ ปล่อยให้คนที่ล็อกอินแล้วดูแลได้ ไม่งั้นจะค้างแก้ไม่ได้ตลอดไป
  if (!product.ownerId) return true;
  return product.ownerId === user.id;
}

/** คนที่ล็อกอินแล้วตัดสต็อกเข้า-ออกได้ทุกชิ้น ไม่ต้องเป็นเจ้าของ */
export function canAdjustStock(product, user) {
  return Boolean(user && product);
}

/** ประเภทรายการที่ทำได้ — ADJUSTMENT คือตั้งยอดใหม่ทับของเดิม เลยกันไว้ให้เจ้าของ */
export function allowedStockTypes(product, user) {
  if (!canAdjustStock(product, user)) return [];
  return canManageProduct(product, user) ? ["IN", "OUT", "ADJUSTMENT"] : ["IN", "OUT"];
}
