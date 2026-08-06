"use server"

import { revalidatePath } from "next/cache"

import {
    createProduct,
    deleteProduct,
    getProductGuard,
    updateProduct,
} from "@/app/server/product"
import {
    addProductUnit,
    getProductUnitOwnership,
    removeProductUnit,
} from "@/app/server/productUnitType"
import { createUnitType, deleteUnitType, findUnitType, getUnitType } from "@/app/server/unitType"
import { adjustStock, getProductHistory } from "@/app/server/productHistory"
import { getCurrentUser } from "@/app/server/session"
import { allowedStockTypes, canManageProduct } from "@/lib/permissions"
import { uploadProductImage } from "@/lib/google-drive"
import { BASE_UNIT_FACTOR } from "@/lib/stock"

// Server Action เปิดรับ POST จากภายนอกได้เหมือน API endpoint การเช็คที่ UI ไม่พอ
// ทุกตัวที่แก้ข้อมูลต้องเรียกอันนี้ก่อน
async function requireUser() {
    const user = await getCurrentUser()
    return user ?? null
}

const UNAUTHORIZED = { ok: false, error: "ต้องล็อกอินก่อน" }
const FORBIDDEN = { ok: false, error: "แก้ได้เฉพาะเจ้าของสินค้า — คนอื่นตัดสต็อกเข้า-ออกได้อย่างเดียว" }

/** คืน null ถ้าผ่าน ไม่ผ่านคืน result ที่เอาไป return ต่อได้เลย */
async function checkOwner(productId, user) {
    const product = await getProductGuard(productId)
    if (!product) return { ok: false, error: "ไม่พบสินค้า" }
    return canManageProduct(product, user) ? null : FORBIDDEN
}

// Server Action ถูกยิงตรงด้วย POST ได้ ไม่ได้มาจาก UI เท่านั้น จึงต้องตรวจค่าซ้ำที่นี่
function toId(value) {
    const id = Number(value)
    return Number.isInteger(id) && id > 0 ? id : null
}

// รายการ id ที่ต้องถูกต้องทุกตัว ผิดตัวเดียวก็ตีกลับ ไม่เงียบ ๆ ตัดทิ้ง
function toIdList(value) {
    if (!Array.isArray(value)) return null
    const ids = value.map(toId)
    if (ids.some((id) => id === null)) return null
    return [...new Set(ids)]
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

export async function createProductAction(
    name,
    imageUrl,
    baseUnitTypeId,
    qty = 0,
    extraUnitTypeIds = []
) {
    const trimmed = String(name ?? "").trim()
    const unitTypeId = toId(baseUnitTypeId)
    const startQty = toCount(qty)
    const extraIds = toIdList(extraUnitTypeIds)

    const user = await requireUser()
    if (!user) return UNAUTHORIZED
    if (!trimmed) return { ok: false, error: "กรอกชื่อสินค้า" }
    if (!unitTypeId) return { ok: false, error: "เลือกหน่วยหลัก" }
    if (startQty === null) return { ok: false, error: "ยอดเริ่มต้นไม่ถูกต้อง" }
    if (extraIds === null) return { ok: false, error: "หน่วยเสริมไม่ถูกต้อง" }

    // หน่วยหลักต้องเป็น ×1 เพราะยอดที่กรอกถูกเก็บเป็นหน่วยย่อยที่สุดตรง ๆ
    const baseUnit = await getUnitType(unitTypeId)
    if (!baseUnit) return { ok: false, error: "ไม่พบหน่วยหลัก" }
    if (baseUnit.qty !== BASE_UNIT_FACTOR) {
        return {
            ok: false,
            error: `หน่วยหลักต้องเป็นหน่วยย่อยที่สุด (×1) — "${baseUnit.name}" เป็น ×${baseUnit.qty}`,
        }
    }

    const product = await createProduct(
        trimmed,
        String(imageUrl ?? "").trim() || null,
        unitTypeId,
        startQty,
        extraIds,
        // คนกดสร้างคือเจ้าของ ไม่รับ ownerId จาก client
        user.id
    )
    if (!product) return { ok: false, error: "สร้างสินค้าไม่สำเร็จ" }

    revalidateStock()
    return { ok: true, product }
}

export async function updateProductAction(id, name, imageUrl, baseUnitTypeId) {
    const productId = toId(id)
    const trimmed = String(name ?? "").trim()
    const unitTypeId = toId(baseUnitTypeId)

    const user = await requireUser()
    if (!user) return UNAUTHORIZED
    if (!productId) return { ok: false, error: "ไม่พบสินค้า" }
    if (!trimmed) return { ok: false, error: "กรอกชื่อสินค้า" }
    if (!unitTypeId) return { ok: false, error: "เลือกหน่วยหลัก" }

    const current = await getProductGuard(productId)
    if (!current) return { ok: false, error: "ไม่พบสินค้า" }
    if (!canManageProduct(current, user)) return FORBIDDEN

    // เปลี่ยนหน่วยหลักได้เฉพาะเป็นหน่วย ×1 เหมือนตอนสร้าง
    // แต่ถ้าไม่ได้แตะหน่วยหลักก็ปล่อยผ่าน ไม่งั้นสินค้าเก่าที่หน่วยหลักเป็น ×N
    // จะแก้แม้แต่ชื่อตัวเองไม่ได้เลย
    if (unitTypeId !== current.unitTypeId) {
        const baseUnit = await getUnitType(unitTypeId)
        if (!baseUnit) return { ok: false, error: "ไม่พบหน่วยหลัก" }
        if (baseUnit.qty !== BASE_UNIT_FACTOR) {
            return {
                ok: false,
                error: `หน่วยหลักต้องเป็นหน่วยย่อยที่สุด (×1) — "${baseUnit.name}" เป็น ×${baseUnit.qty}`,
            }
        }
    }

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
    const user = await requireUser()
    if (!user) return UNAUTHORIZED
    if (!productId) return { ok: false, error: "ไม่พบสินค้า" }

    const denied = await checkOwner(productId, user)
    if (denied) return denied

    const ok = await deleteProduct(productId)
    if (!ok) return { ok: false, error: "ลบสินค้าไม่สำเร็จ" }

    revalidateStock()
    return { ok: true }
}

export async function addUnitAction(productId, unitTypeId) {
    const product = toId(productId)
    const unitType = toId(unitTypeId)
    const user = await requireUser()
    if (!user) return UNAUTHORIZED
    if (!product || !unitType) return { ok: false, error: "ข้อมูลไม่ครบ" }

    const denied = await checkOwner(product, user)
    if (denied) return denied

    const unit = await addProductUnit(product, unitType)
    if (!unit) return { ok: false, error: "เพิ่มหน่วยไม่สำเร็จ" }

    revalidateStock()
    return { ok: true, unit }
}

// ประวัติไม่หายตอนถอดหน่วย เพราะ ProductHistory เก็บ unitName ไว้ และ FK เป็น SetNull
export async function removeUnitAction(productUnitTypeId) {
    const id = toId(productUnitTypeId)
    const user = await requireUser()
    if (!user) return UNAUTHORIZED
    if (!id) return { ok: false, error: "ไม่พบหน่วย" }

    const owned = await getProductUnitOwnership(id)
    if (!owned) return { ok: false, error: "ไม่พบหน่วย" }
    if (!canManageProduct(owned, user)) return FORBIDDEN

    const ok = await removeProductUnit(id)
    if (!ok) return { ok: false, error: "ถอดหน่วยไม่สำเร็จ" }

    revalidateStock()
    return { ok: true }
}

// ผู้บันทึกมาจาก session เท่านั้น ไม่รับ userId จาก client — ไม่งั้นสวมรอยเป็นคนอื่นได้
export async function adjustStockAction(productId, unitTypeId, amount, type, note) {
    const user = await requireUser()
    const product = toId(productId)
    const unitType = toId(unitTypeId)
    const unitAmount = toCount(amount)

    if (!user) return UNAUTHORIZED
    if (!product || !unitType) return { ok: false, error: "ข้อมูลไม่ครบ" }
    if (unitAmount === null) return { ok: false, error: "จำนวนไม่ถูกต้อง" }
    if (!["IN", "OUT", "ADJUSTMENT"].includes(type)) {
        return { ok: false, error: "ชนิดรายการไม่ถูกต้อง" }
    }
    if (type !== "ADJUSTMENT" && unitAmount === 0) {
        return { ok: false, error: "จำนวนต้องมากกว่า 0" }
    }

    // เข้า-ออกใครก็ทำได้ แต่ ADJUSTMENT คือตั้งยอดใหม่ทับของเดิม เลยให้เฉพาะเจ้าของ
    const owned = await getProductGuard(product)
    if (!owned) return { ok: false, error: "ไม่พบสินค้า" }
    if (!allowedStockTypes(owned, user).includes(type)) return FORBIDDEN

    const result = await adjustStock({
        userId: user.id,
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

    if (!(await requireUser())) return UNAUTHORIZED
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
    if (!(await requireUser())) return UNAUTHORIZED
    if (!unitTypeId) return { ok: false, error: "ไม่พบหน่วย" }

    const result = await deleteUnitType(unitTypeId)
    if (result.ok) revalidateStock()
    return result
}

/**
 * อัปโหลดรูปสินค้าขึ้น Google Drive แล้วคืน URL สาธารณะ
 * แยกจากตอนสร้าง/แก้สินค้า เพื่อให้เห็นรูปพรีวิวทันทีตั้งแต่ยังไม่กดบันทึก
 */
export async function uploadProductImageAction(formData) {
    if (!(await requireUser())) return UNAUTHORIZED
    if (!(formData instanceof FormData)) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" }

    return uploadProductImage(formData.get("file"))
}

// ประวัติมีชื่อคนบันทึกติดมาด้วย เลยไม่เปิดให้คนนอกอ่าน
export async function getProductHistoryAction(productId) {
    const id = toId(productId)
    if (!(await requireUser())) return UNAUTHORIZED
    if (!id) return { ok: false, error: "ไม่พบสินค้า" }

    return { ok: true, history: await getProductHistory(id) }
}
