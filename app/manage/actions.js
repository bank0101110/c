"use server"

import { revalidatePath } from "next/cache"

import { createProduct, deleteProduct, updateProduct } from "@/app/server/product"
import { addProductUnit, removeProductUnit } from "@/app/server/productUnitType"
import { createUnitType, deleteUnitType, findUnitType } from "@/app/server/unitType"
import { adjustStock, getProductHistory } from "@/app/server/productHistory"

// Server Action ถูกยิงตรงด้วย POST ได้ ไม่ได้มาจาก UI เท่านั้น จึงต้องตรวจค่าซ้ำที่นี่
function toId(value) {
    const id = Number(value)
    return Number.isInteger(id) && id > 0 ? id : null
}

function toCount(value) {
    const count = Number(value)
    return Number.isInteger(count) && count >= 0 ? count : null
}

// หน้าแรกกับหน้าจัดการอ่านสต็อกชุดเดียวกัน
function revalidateStock() {
    revalidatePath("/")
    revalidatePath("/manage")
}

export async function createProductAction(name, imageUrl, baseUnitTypeId, qty = 0) {
    const trimmed = String(name ?? "").trim()
    const unitTypeId = toId(baseUnitTypeId)
    const startQty = toCount(qty)

    if (!trimmed) return { ok: false, error: "กรอกชื่อสินค้า" }
    if (!unitTypeId) return { ok: false, error: "เลือกหน่วยหลัก" }
    if (startQty === null) return { ok: false, error: "ยอดเริ่มต้นไม่ถูกต้อง" }

    const product = await createProduct(
        trimmed,
        String(imageUrl ?? "").trim() || null,
        unitTypeId,
        startQty
    )
    if (!product) return { ok: false, error: "สร้างสินค้าไม่สำเร็จ" }

    revalidateStock()
    return { ok: true, product }
}

export async function updateProductAction(id, name, imageUrl, baseUnitTypeId) {
    const productId = toId(id)
    const trimmed = String(name ?? "").trim()
    const unitTypeId = toId(baseUnitTypeId)

    if (!productId) return { ok: false, error: "ไม่พบสินค้า" }
    if (!trimmed) return { ok: false, error: "กรอกชื่อสินค้า" }
    if (!unitTypeId) return { ok: false, error: "เลือกหน่วยหลัก" }

    const product = await updateProduct(
        productId,
        trimmed,
        String(imageUrl ?? "").trim() || null,
        unitTypeId
    )
    if (!product) return { ok: false, error: "แก้ไขสินค้าไม่สำเร็จ" }

    revalidateStock()
    return { ok: true, product }
}

export async function deleteProductAction(id) {
    const productId = toId(id)
    if (!productId) return { ok: false, error: "ไม่พบสินค้า" }

    const ok = await deleteProduct(productId)
    if (!ok) return { ok: false, error: "ลบสินค้าไม่สำเร็จ" }

    revalidateStock()
    return { ok: true }
}

export async function addUnitAction(productId, unitTypeId) {
    const product = toId(productId)
    const unitType = toId(unitTypeId)
    if (!product || !unitType) return { ok: false, error: "ข้อมูลไม่ครบ" }

    const unit = await addProductUnit(product, unitType)
    if (!unit) return { ok: false, error: "เพิ่มหน่วยไม่สำเร็จ" }

    revalidateStock()
    return { ok: true, unit }
}

// ประวัติไม่หายตอนถอดหน่วย เพราะ ProductHistory เก็บ unitName ไว้ และ FK เป็น SetNull
export async function removeUnitAction(productUnitTypeId) {
    const id = toId(productUnitTypeId)
    if (!id) return { ok: false, error: "ไม่พบหน่วย" }

    const ok = await removeProductUnit(id)
    if (!ok) return { ok: false, error: "ถอดหน่วยไม่สำเร็จ" }

    revalidateStock()
    return { ok: true }
}

export async function adjustStockAction(userId, productId, unitTypeId, amount, type, note) {
    const user = toId(userId)
    const product = toId(productId)
    const unitType = toId(unitTypeId)
    const unitAmount = toCount(amount)

    if (!user) return { ok: false, error: "เลือกผู้บันทึก" }
    if (!product || !unitType) return { ok: false, error: "ข้อมูลไม่ครบ" }
    if (unitAmount === null) return { ok: false, error: "จำนวนไม่ถูกต้อง" }
    if (!["IN", "OUT", "ADJUSTMENT"].includes(type)) {
        return { ok: false, error: "ชนิดรายการไม่ถูกต้อง" }
    }
    if (type !== "ADJUSTMENT" && unitAmount === 0) {
        return { ok: false, error: "จำนวนต้องมากกว่า 0" }
    }

    const result = await adjustStock({
        userId: user,
        productId: product,
        unitTypeId: unitType,
        amount: unitAmount,
        type,
        note: String(note ?? "").trim() || null,
    })

    if (result.ok) revalidateStock()
    return result
}

export async function createUnitTypeAction(name, qty) {
    const trimmed = String(name ?? "").trim()
    const factor = Number(qty)

    if (!trimmed) return { ok: false, error: "กรอกชื่อหน่วย" }
    if (!Number.isInteger(factor) || factor < 1) {
        return { ok: false, error: "ตัวคูณต้องเป็นจำนวนเต็มตั้งแต่ 1" }
    }

    // ชื่อซ้ำแต่ตัวคูณต่างกันสร้างได้ (ลัง=20 กับ ลัง=30) ซ้ำทั้งคู่ถึงจะถือว่ามีอยู่แล้ว
    const existing = await findUnitType(trimmed, factor)
    if (existing) {
        return {
            ok: false,
            error: `มี "${existing.name} (×${existing.qty})" อยู่แล้ว`,
            existing,
        }
    }

    const unitType = await createUnitType(trimmed, factor)
    if (!unitType) return { ok: false, error: "สร้างหน่วยไม่สำเร็จ" }

    revalidateStock()
    return { ok: true, unitType }
}

export async function deleteUnitTypeAction(id) {
    const unitTypeId = toId(id)
    if (!unitTypeId) return { ok: false, error: "ไม่พบหน่วย" }

    const result = await deleteUnitType(unitTypeId)
    if (result.ok) revalidateStock()
    return result
}

export async function getProductHistoryAction(productId) {
    const id = toId(productId)
    if (!id) return { ok: false, error: "ไม่พบสินค้า" }

    return { ok: true, history: await getProductHistory(id) }
}
