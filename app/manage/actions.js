"use server"

import { revalidatePath } from "next/cache"

import { createProduct, deleteProduct } from "@/app/server/product"
import { addProductUnit } from "@/app/server/productQtyType"
import { createQtyType, deleteQtyType } from "@/app/server/qtyType"
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

export async function createProductAction(name, imageUrl, baseQtyTypeId, qty = 0) {
    const trimmed = String(name ?? "").trim()
    const qtyTypeId = toId(baseQtyTypeId)
    const startQty = toCount(qty)

    if (!trimmed) return { ok: false, error: "กรอกชื่อสินค้า" }
    if (!qtyTypeId) return { ok: false, error: "เลือกหน่วยหลัก" }
    if (startQty === null) return { ok: false, error: "ยอดเริ่มต้นไม่ถูกต้อง" }

    const product = await createProduct(
        trimmed,
        String(imageUrl ?? "").trim() || null,
        qtyTypeId,
        startQty
    )
    if (!product) return { ok: false, error: "สร้างสินค้าไม่สำเร็จ" }

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

export async function addUnitAction(productId, qtyTypeId) {
    const product = toId(productId)
    const qtyType = toId(qtyTypeId)
    if (!product || !qtyType) return { ok: false, error: "ข้อมูลไม่ครบ" }

    const unit = await addProductUnit(product, qtyType)
    if (!unit) return { ok: false, error: "เพิ่มหน่วยไม่สำเร็จ" }

    revalidateStock()
    return { ok: true, unit }
}

export async function adjustStockAction(userId, productId, qtyTypeId, amount, type, note) {
    const user = toId(userId)
    const product = toId(productId)
    const qtyType = toId(qtyTypeId)
    const unitAmount = toCount(amount)

    if (!user) return { ok: false, error: "เลือกผู้บันทึก" }
    if (!product || !qtyType) return { ok: false, error: "ข้อมูลไม่ครบ" }
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
        qtyTypeId: qtyType,
        amount: unitAmount,
        type,
        note: String(note ?? "").trim() || null,
    })

    if (result.ok) revalidateStock()
    return result
}

export async function createQtyTypeAction(name, qty) {
    const trimmed = String(name ?? "").trim()
    const factor = Number(qty)

    if (!trimmed) return { ok: false, error: "กรอกชื่อหน่วย" }
    if (!Number.isInteger(factor) || factor < 1) {
        return { ok: false, error: "ตัวคูณต้องเป็นจำนวนเต็มตั้งแต่ 1" }
    }

    const qtyType = await createQtyType(trimmed, factor)
    if (!qtyType) return { ok: false, error: "สร้างหน่วยไม่สำเร็จ" }

    revalidateStock()
    return { ok: true, qtyType }
}

export async function deleteQtyTypeAction(id) {
    const qtyTypeId = toId(id)
    if (!qtyTypeId) return { ok: false, error: "ไม่พบหน่วย" }

    const result = await deleteQtyType(qtyTypeId)
    if (result.ok) revalidateStock()
    return result
}

export async function getProductHistoryAction(productId) {
    const id = toId(productId)
    if (!id) return { ok: false, error: "ไม่พบสินค้า" }

    return { ok: true, history: await getProductHistory(id) }
}
