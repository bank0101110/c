// QtyType.qty เป็นตัวคูณ: 1 หน่วยนั้น = กี่หน่วยย่อยที่สุด (ชิ้น = 1, แพ็ค = 6, ลัง = 12)
// Product.qty เก็บเป็นหน่วยย่อยที่สุดเสมอ เพื่อให้ทุกหน่วยคิดยอดตรงกัน

export function toBase(amount, factor) {
  return amount * factor;
}

/** หน่วยทั้งหมดที่สินค้านี้ใช้ได้ = หน่วยหลัก + หน่วยเสริม (ไม่ซ้ำ) */
export function productUnits(product) {
  const units = [];
  const seen = new Set();

  for (const qtyType of [
    product.baseQty,
    ...product.ProductQtyType.map((entry) => entry.qtyType),
  ]) {
    if (!qtyType || seen.has(qtyType.id)) continue;
    seen.add(qtyType.id);
    units.push(qtyType);
  }

  return units.sort((a, b) => b.qty - a.qty);
}

/** แตกยอดหน่วยย่อยออกเป็นหน่วยใหญ่ไปเล็ก แบบ greedy */
export function breakdown(baseQty, units) {
  const parts = [];
  let left = Math.max(0, baseQty);

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

export function formatBreakdown(baseQty, units) {
  const { parts, remainder } = breakdown(baseQty, units);
  const text = parts.map((part) => `${part.count} ${part.name}`);
  if (remainder > 0) text.push(String(remainder));
  return text.join(" + ");
}
