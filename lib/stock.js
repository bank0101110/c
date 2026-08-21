// UnitType.qty เป็นตัวคูณ: 1 หน่วยนั้น = กี่หน่วยย่อยที่สุด (ชิ้น = 1, แพ็ค = 6, ลัง = 12)
// Product.qty เก็บเป็นหน่วยย่อยที่สุดเสมอ เพื่อให้ทุกหน่วยคิดยอดตรงกัน

export function toBase(amount, factor) {
  return amount * factor;
}

// หน่วยหลักของสินค้าต้องเป็นหน่วยย่อยที่สุด (×1) เสมอ ไม่งั้น Product.qty ที่เก็บเป็น
// หน่วยย่อยจะคิดยอดไม่ตรงกับหน่วยที่แสดง และ breakdown จะเหลือเศษที่อธิบายไม่ได้
export const BASE_UNIT_FACTOR = 1;

export function isBaseUnit(unitType) {
  return unitType?.qty === BASE_UNIT_FACTOR;
}

export function baseUnitTypes(unitTypes) {
  return unitTypes.filter(isBaseUnit);
}

// ชื่อหน่วยซ้ำกันได้แต่ตัวคูณต่างกัน เช่น ลัง=20 กับ ลัง=30 เลยต้องค้นด้วยจำนวนได้ด้วย
const QUERY_SEPARATORS = /[\s=×*()]+/;

export function unitSearchText(unitType) {
  return `${unitType.name} ${unitType.qty}`.toLowerCase();
}

/** พิมพ์ได้ทั้ง "ลัง", "20", "ลัง 20" หรือ "ลัง=20" — ต้องเจอครบทุก token ถึงนับว่าตรง */
export function matchesUnitQuery(searchText, query) {
  const tokens = String(query ?? "")
    .toLowerCase()
    .split(QUERY_SEPARATORS)
    .filter(Boolean);

  if (tokens.length === 0) return true;
  return tokens.every((token) => searchText.includes(token));
}

/** ชื่อ+ตัวคูณเหมือนกันถือว่าเป็นหน่วยเดียวกัน ใช้กันสร้างซ้ำ */
export function sameUnit(a, b) {
  return a.name.trim().toLowerCase() === b.name.trim().toLowerCase() && a.qty === b.qty;
}

/** ตัวเลือกหน่วยสำหรับ Combobox — เก็บ id ไว้ ส่วน label ใช้แสดงผล search ใช้กรอง */
export function unitOptions(unitTypes) {
  return unitTypes.map((unitType) => ({
    id: unitType.id,
    label: `${unitType.name} (×${unitType.qty})`,
    search: unitSearchText(unitType),
  }));
}

export const sameUnitOption = (a, b) => a?.id === b?.id;
export const unitOptionLabel = (option) => option?.label ?? "";
export const unitOptionFilter = (option, query) =>
  matchesUnitQuery(option?.search ?? "", query);

/** เรียงหน่วยจากใหญ่ไปเล็ก ชื่อซ้ำตัวคูณก็เรียงตามชื่อ */
export function sortUnits(units) {
  return [...units].sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name));
}

/**
 * ชื่อหน่วยที่ใช้แสดง "ยอดคงเหลือ" ของสินค้าหนึ่งตัว
 *
 * สินค้าที่มีตัวเลือกย่อย ยอดคือผลรวมของ SKU ซึ่งนับเป็นหน่วยหลักของ SKU ไม่ใช่ของ Product
 * (Product.unitTypeId เป็นของเดิมจากตอนที่ยังไม่มี SKU) ถ้า SKU ใช้หน่วยหลักปนกัน
 * การตั้งชื่อหน่วยเดียวให้ยอดรวมจะกลายเป็นข้อมูลผิด เลยเรียกกลาง ๆ ว่า "หน่วย"
 *
 * ไม่แปลงยอดขึ้นหน่วยใหญ่ให้เอง — หน่วยหลักเป็นชิ้นก็ต้องขึ้นว่าชิ้น ไม่ใช่ลัง
 */
export function stockUnitName(product) {
  const names = new Set(
    (product.skus ?? []).map((sku) => sku.baseUnit?.name).filter(Boolean)
  );
  if (names.size === 1) return [...names][0];
  if (names.size > 1) return "หน่วย";
  return product.baseUnit?.name ?? "";
}

/** หน่วยทั้งหมดที่สินค้านี้ใช้ได้ = หน่วยหลัก + หน่วยเสริม (ไม่ซ้ำ) */
export function productUnits(product) {
  const units = [];
  const seen = new Set();

  for (const unitType of [
    product.baseUnit,
    ...(product.ProductUnitType ?? []).map((entry) => entry.unitType),
  ]) {
    if (!unitType || seen.has(unitType.id)) continue;
    seen.add(unitType.id);
    units.push(unitType);
  }

  return units.sort((a, b) => b.qty - a.qty);
}

/** หน่วยทั้งหมดที่ตัวเลือกย่อย (SKU) ใช้ได้ — โครงเดียวกับ productUnits แต่คนละตาราง join */
export function skuUnits(sku) {
  const units = [];
  const seen = new Set();

  for (const unitType of [
    sku.baseUnit,
    ...(sku.SkuUnitType ?? []).map((entry) => entry.unitType),
  ]) {
    if (!unitType || seen.has(unitType.id)) continue;
    seen.add(unitType.id);
    units.push(unitType);
  }

  return units.sort((a, b) => b.qty - a.qty);
}

/** แตกยอดหน่วยย่อยออกเป็นหน่วยใหญ่ไปเล็ก แบบ greedy */
export function breakdown(baseUnit, units) {
  const parts = [];
  let left = Math.max(0, baseUnit);

  for (const unit of [...units].sort((a, b) => b.qty - a.qty)) {
    if (unit.qty <= 0) continue;
    const count = Math.floor(left / unit.qty);
    if (count > 0) {
      parts.push({ id: unit.id, name: unit.name, count });
      left -= count * unit.qty;
    }
  }

  return { parts, remainder: left };
}

export function formatBreakdown(baseUnit, units) {
  const { parts, remainder } = breakdown(baseUnit, units);
  const text = parts.map((part) => `${part.count} ${part.name}`);
  if (remainder > 0) text.push(String(remainder));
  return text.join(" + ");
}
