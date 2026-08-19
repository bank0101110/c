"use server"

import { after } from "next/server"

import {
    createProduct,
    deleteProduct,
    getProduct,
    getProductGuard,
    saveProduct,
    saveProductNote,
} from "@/app/server/product"
import {
    addProductUnit,
    getProductUnitOwnership,
    removeProductUnit,
} from "@/app/server/productUnitType"
import { createUnitType, deleteUnitType, findUnitType, getUnitType } from "@/app/server/unitType"
import {
    adjustStock,
    adjustSkuStockBatch,
    getProductHistory,
    writeStockHistory,
} from "@/app/server/productHistory"
import {
    createSku,
    deleteSku,
    getSkuGuard,
    saveSku,
    setSkusDefaultUnit,
    setSkusUnits,
} from "@/app/server/sku"
import {
    createCategory,
    deleteCategory,
    findCategory,
    setProductCategory,
    setProductsCategory,
    updateCategory,
} from "@/app/server/category"
import { getCurrentUser } from "@/app/server/session"
import { allowedStockTypes, canManageProduct } from "@/lib/permissions"
import { BASE_UNIT_FACTOR } from "@/lib/stock"
import { uploadProductImage } from "@/lib/supabase-storage"

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

/*
 * ไม่มี revalidatePath ในไฟล์นี้แล้ว — ตั้งใจตัดออก ไม่ใช่ลืม
 *
 * ทั้ง "/" และ "/manage" เป็น force-dynamic จึงไม่มี cache ฝั่งเซิร์ฟเวอร์ให้ invalidate
 * และ Client Cache ก็ไม่เก็บเพจ dynamic อยู่แล้ว (staleTimes.dynamic ดีฟอลต์ = 0)
 * เดินไปหน้าไหนก็ดึงใหม่ทุกครั้ง
 *
 * ผลที่เหลืออยู่จริงของมันคือ Next จะ re-render หน้า /manage ทั้งหน้าแล้วยัด RSC payload
 * กลับมาใน response ของ action ทุกครั้ง (= requireUser + getProductsByOwner + getUnitTypes
 * ยิง DB เพิ่มอีกชุด) ทั้งที่ ManageDashboard ถือ state ของตัวเองและโยน payload นั้นทิ้ง
 * — จ่ายค่า latency กับ re-render ทั้งต้นไม้ฟรี ๆ ซึ่งคืออาการ UI ค้างตอนกดบันทึก
 *
 * ทุก action ที่แก้ข้อมูลจึงคืน record ที่อัปเดตแล้วกลับไปแทน ให้ฝั่ง UI เอาไปทับ state เอง
 */

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

    return { ok: true, product }
}

/**
 * บันทึกสินค้าทั้งก้อนในครั้งเดียว — ชื่อ รูป หน่วยหลัก และชุดหน่วยเสริมทั้งชุด
 *
 * เดิมหน้าแก้ไขยิงทีละ action (addUnit × N → removeUnit × M → updateProduct) แต่ Next
 * dispatch Server Action ทีละตัวต่อ client เสมอ กด Save ครั้งเดียวจึงกลายเป็น N+M+1
 * รอบไป-กลับที่ต่อคิวกัน แต่ละรอบเช็ค session + เจ้าของ + re-render หน้าใหม่หมด
 * รวบเป็นรอบเดียวและทรานแซกชันเดียว ทั้งเร็วกว่าและไม่ค้างครึ่ง ๆ ถ้าพังกลางทาง
 *
 * extraUnitTypeIds คือหน่วยเสริม "ทั้งชุด" ที่ต้องการหลังบันทึก ไม่ใช่ส่วนต่าง
 * ฝั่ง UI จึงไม่ต้องถือ ProductUnitType.id ไว้เทียบเอง
 */
export async function saveProductAction(id, name, imageUrl, baseUnitTypeId, extraUnitTypeIds = []) {
    const productId = toId(id)
    const trimmed = String(name ?? "").trim()
    const unitTypeId = toId(baseUnitTypeId)
    const extraIds = toIdList(extraUnitTypeIds)

    // สอง query นี้ไม่ขึ้นต่อกัน ยิงพร้อมกันได้ ประหยัดไป-กลับ DB หนึ่งรอบ
    const [user, current] = await Promise.all([
        requireUser(),
        productId ? getProductGuard(productId) : null,
    ])

    if (!user) return UNAUTHORIZED
    if (!productId) return { ok: false, error: "ไม่พบสินค้า" }
    if (!trimmed) return { ok: false, error: "กรอกชื่อสินค้า" }
    if (!unitTypeId) return { ok: false, error: "เลือกหน่วยหลัก" }
    if (extraIds === null) return { ok: false, error: "หน่วยเสริมไม่ถูกต้อง" }
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

    const product = await saveProduct(
        productId,
        trimmed,
        String(imageUrl ?? "").trim() || null,
        unitTypeId,
        extraIds
    )
    if (!product) return { ok: false, error: "แก้ไขสินค้าไม่สำเร็จ" }

    return { ok: true, product }
}

export async function deleteProductAction(id) {
    const productId = toId(id)
    const [user, current] = await Promise.all([
        requireUser(),
        productId ? getProductGuard(productId) : null,
    ])

    if (!user) return UNAUTHORIZED
    if (!productId) return { ok: false, error: "ไม่พบสินค้า" }
    if (!current) return { ok: false, error: "ไม่พบสินค้า" }
    if (!canManageProduct(current, user)) return FORBIDDEN

    const ok = await deleteProduct(productId)
    if (!ok) return { ok: false, error: "ลบสินค้าไม่สำเร็จ" }

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

    return { ok: true }
}

// ผู้บันทึกมาจาก session เท่านั้น ไม่รับ userId จาก client — ไม่งั้นสวมรอยเป็นคนอื่นได้
export async function adjustStockAction(productId, unitTypeId, amount, type, note) {
    const product = toId(productId)
    const unitType = toId(unitTypeId)
    const unitAmount = toCount(amount)

    // session กับ owner guard ไม่ขึ้นต่อกัน ยิงพร้อมกันได้
    const [user, owned] = await Promise.all([
        requireUser(),
        product ? getProductGuard(product) : null,
    ])

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
    if (!owned) return { ok: false, error: "ไม่พบสินค้า" }
    if (!allowedStockTypes(owned, user).includes(type)) return FORBIDDEN

    return adjustStock({
        userId: user.id,
        productId: product,
        unitTypeId: unitType,
        amount: unitAmount,
        type,
        note: String(note ?? "").trim() || null,
    })
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

    return { ok: true, unitType }
}

export async function deleteUnitTypeAction(id) {
    const unitTypeId = toId(id)
    if (!(await requireUser())) return UNAUTHORIZED
    if (!unitTypeId) return { ok: false, error: "ไม่พบหน่วย" }

    return deleteUnitType(unitTypeId)
}

/**
 * อัปโหลดรูปสินค้าขึ้น Supabase Storage แล้วคืน URL สาธารณะ
 * แยกจากตอนสร้าง/แก้สินค้า เพื่อให้เห็นรูปพรีวิวทันทีตั้งแต่ยังไม่กดบันทึก
 */
export async function uploadProductImageAction(formData) {
    if (!(await requireUser())) return UNAUTHORIZED
    if (!(formData instanceof FormData)) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" }

    return uploadProductImage(formData.get("file"))
}

/**
 * ปรับสต็อกหลายตัวเลือก (SKU) ของสินค้าเดียวกัน จบในครั้งเดียว
 *
 * entries = [{ skuId, unitTypeId, amount, type }]
 * ตรวจทุกแถวให้ครบก่อนค่อยส่งเข้า DB — เจอผิดแถวเดียวตีกลับทั้งชุด ไม่บันทึกครึ่ง ๆ
 */
export async function adjustSkuStockBatchAction(productId, entries, note) {
    const id = toId(productId)

    const [user, owned] = await Promise.all([requireUser(), id ? getProductGuard(id) : null])

    if (!user) return UNAUTHORIZED
    if (!id) return { ok: false, error: "ไม่พบสินค้า" }
    if (!owned) return { ok: false, error: "ไม่พบสินค้า" }
    if (!Array.isArray(entries) || entries.length === 0) {
        return { ok: false, error: "ยังไม่ได้เลือกตัวเลือกที่จะปรับ" }
    }

    const allowed = allowedStockTypes(owned, user)
    const cleaned = []

    for (const entry of entries) {
        const skuId = toId(entry?.skuId)
        const unitTypeId = toId(entry?.unitTypeId)
        const amount = toCount(entry?.amount)
        const type = entry?.type

        if (!skuId || !unitTypeId) return { ok: false, error: "ข้อมูลตัวเลือกไม่ครบ" }
        if (amount === null) return { ok: false, error: "จำนวนไม่ถูกต้อง" }
        if (!["IN", "OUT", "ADJUSTMENT"].includes(type)) {
            return { ok: false, error: "ชนิดรายการไม่ถูกต้อง" }
        }
        if (type !== "ADJUSTMENT" && amount === 0) {
            return { ok: false, error: "จำนวนต้องมากกว่า 0" }
        }
        // ตั้งยอดใหม่ทับของเดิมได้เฉพาะเจ้าของ เหมือนกรณีสินค้าไม่มีตัวเลือก
        if (!allowed.includes(type)) return FORBIDDEN

        cleaned.push({ skuId, unitTypeId, amount, type })
    }

    const result = await adjustSkuStockBatch({
        userId: user.id,
        productId: id,
        entries: cleaned,
        note: String(note ?? "").trim() || null,
    })

    // เขียนประวัติหลังส่ง response แล้ว ผู้ใช้ไม่ต้องรออีก ~50ms ต่อการบันทึกหนึ่งครั้ง
    // after() ของ Next รับประกันว่างานนี้ได้รันจนจบ ไม่ใช่ promise ลอยที่อาจโดนตัดกลางคัน
    if (result.ok && result.historyRows?.length) {
        const rows = result.historyRows
        after(() => writeStockHistory(rows))
    }

    // historyRows เป็นรายละเอียดภายใน ไม่ต้องส่งข้ามสายไปถึง client
    const { historyRows: _unused, ...payload } = result
    return payload
}

export async function createSkuAction(
    productId,
    name,
    imageUrl,
    unitTypeId,
    qty = 0,
    extraUnitTypeIds = [],
    code = null,
    defaultUnitTypeId = null
) {
    const id = toId(productId)
    const trimmed = String(name ?? "").trim()
    const baseUnitId = toId(unitTypeId)
    const startQty = toCount(qty)
    const extraIds = toIdList(extraUnitTypeIds)
    // ตั้งมาเป็นหน่วยที่ตัวเลือกนี้ใช้ไม่ได้ ฝั่ง server จะปัดทิ้งให้เอง ไม่ต้องตีกลับทั้งฟอร์ม
    const defaultUnitId = toId(defaultUnitTypeId)

    const user = await requireUser()
    if (!user) return UNAUTHORIZED
    if (!id) return { ok: false, error: "ไม่พบสินค้า" }
    if (!trimmed) return { ok: false, error: "กรอกชื่อตัวเลือก" }
    if (!baseUnitId) return { ok: false, error: "เลือกหน่วยหลัก" }
    if (startQty === null) return { ok: false, error: "ยอดเริ่มต้นไม่ถูกต้อง" }
    if (extraIds === null) return { ok: false, error: "หน่วยเสริมไม่ถูกต้อง" }

    const denied = await checkOwner(id, user)
    if (denied) return denied

    const baseUnit = await getUnitType(baseUnitId)
    if (!baseUnit) return { ok: false, error: "ไม่พบหน่วยหลัก" }
    if (baseUnit.qty !== BASE_UNIT_FACTOR) {
        return {
            ok: false,
            error: `หน่วยหลักต้องเป็นหน่วยย่อยที่สุด (×1) — "${baseUnit.name}" เป็น ×${baseUnit.qty}`,
        }
    }

    const sku = await createSku(
        id,
        trimmed,
        String(imageUrl ?? "").trim() || null,
        baseUnitId,
        startQty,
        extraIds,
        String(code ?? "").trim() || null,
        defaultUnitId
    )
    if (!sku) return { ok: false, error: "เพิ่มตัวเลือกไม่สำเร็จ (ชื่ออาจซ้ำกับที่มีอยู่)" }

    return { ok: true, sku }
}

export async function saveSkuAction(
    skuId,
    name,
    imageUrl,
    unitTypeId,
    extraUnitTypeIds = [],
    code = null,
    defaultUnitTypeId = null
) {
    const id = toId(skuId)
    const trimmed = String(name ?? "").trim()
    const baseUnitId = toId(unitTypeId)
    const extraIds = toIdList(extraUnitTypeIds)
    const defaultUnitId = toId(defaultUnitTypeId)

    const [user, current] = await Promise.all([requireUser(), id ? getSkuGuard(id) : null])

    if (!user) return UNAUTHORIZED
    if (!id || !current) return { ok: false, error: "ไม่พบตัวเลือก" }
    if (!trimmed) return { ok: false, error: "กรอกชื่อตัวเลือก" }
    if (!baseUnitId) return { ok: false, error: "เลือกหน่วยหลัก" }
    if (extraIds === null) return { ok: false, error: "หน่วยเสริมไม่ถูกต้อง" }
    if (!canManageProduct(current.product, user)) return FORBIDDEN

    // เปลี่ยนหน่วยหลักได้เฉพาะเป็น ×1 แต่ถ้าไม่ได้แตะก็ปล่อยผ่าน (เหมือน saveProductAction)
    if (baseUnitId !== current.unitTypeId) {
        const baseUnit = await getUnitType(baseUnitId)
        if (!baseUnit) return { ok: false, error: "ไม่พบหน่วยหลัก" }
        if (baseUnit.qty !== BASE_UNIT_FACTOR) {
            return {
                ok: false,
                error: `หน่วยหลักต้องเป็นหน่วยย่อยที่สุด (×1) — "${baseUnit.name}" เป็น ×${baseUnit.qty}`,
            }
        }
    }

    const sku = await saveSku(
        id,
        trimmed,
        String(imageUrl ?? "").trim() || null,
        baseUnitId,
        extraIds,
        String(code ?? "").trim() || null,
        defaultUnitId
    )
    if (!sku) return { ok: false, error: "แก้ตัวเลือกไม่สำเร็จ" }

    return { ok: true, sku }
}

/**
 * ตั้งหน่วยให้หลายตัวเลือกพร้อมกัน — ใช้ตอนแก้หน่วยเหมือนกันทีละหลายตัว
 *
 * ตรวจสิทธิ์ทุกตัวก่อนแล้วค่อยเขียน ถ้ามีสักตัวที่ไม่ใช่ของเราจะไม่เขียนอะไรเลย
 * และทุกตัวต้องอยู่สินค้าเดียวกัน กันการยิงข้ามสินค้าจากนอก UI
 */
export async function setSkusUnitsAction(skuIds, unitTypeId, extraUnitTypeIds = []) {
    const ids = toIdList(skuIds)
    const baseUnitId = toId(unitTypeId)
    const extraIds = toIdList(extraUnitTypeIds)

    const user = await requireUser()
    if (!user) return UNAUTHORIZED
    if (!ids || ids.length === 0) return { ok: false, error: "ยังไม่ได้เลือกตัวเลือก" }
    if (!baseUnitId) return { ok: false, error: "เลือกหน่วยหลัก" }
    if (!extraIds) return { ok: false, error: "หน่วยเสริมไม่ถูกต้อง" }

    const baseUnit = await getUnitType(baseUnitId)
    if (!baseUnit) return { ok: false, error: "ไม่พบหน่วยหลัก" }
    if (baseUnit.qty !== BASE_UNIT_FACTOR) {
        return {
            ok: false,
            error: `หน่วยหลักต้องเป็นหน่วยย่อยที่สุด (×1) — "${baseUnit.name}" เป็น ×${baseUnit.qty}`,
        }
    }

    const guards = await Promise.all(ids.map((id) => getSkuGuard(id)))
    if (guards.some((sku) => !sku)) return { ok: false, error: "ไม่พบตัวเลือกบางรายการ" }
    if (guards.some((sku) => !canManageProduct(sku.product, user))) return FORBIDDEN
    if (new Set(guards.map((sku) => sku.productId)).size > 1) {
        return { ok: false, error: "ตัวเลือกต้องอยู่สินค้าเดียวกัน" }
    }

    const skus = await setSkusUnits(ids, baseUnitId, extraIds)
    if (!skus) return { ok: false, error: "ตั้งหน่วยไม่สำเร็จ" }

    return { ok: true, skus }
}

/**
 * ตั้งหน่วยเริ่มต้นให้หลายตัวเลือกพร้อมกัน — หน่วยที่หน้าสินค้าจะเลือกให้คนที่มากดตัดสต็อก
 *
 * unitTypeId = null คือกลับไปใช้หน่วยหลักของแต่ละตัว
 * ตัวที่ไม่รองรับหน่วยนั้นจะถูกข้าม (ไม่ใช่ error ทั้งชุด) แล้วบอกจำนวนกลับไปให้ UI
 */
export async function setSkusDefaultUnitAction(skuIds, unitTypeId) {
    const ids = toIdList(skuIds)
    // null = ล้างกลับไปใช้หน่วยหลัก ต่างจาก id ที่ส่งมาผิดรูปแบบ
    const defaultUnitId = unitTypeId === null ? null : toId(unitTypeId)

    const user = await requireUser()
    if (!user) return UNAUTHORIZED
    if (!ids || ids.length === 0) return { ok: false, error: "ยังไม่ได้เลือกตัวเลือก" }
    if (unitTypeId !== null && !defaultUnitId) return { ok: false, error: "เลือกหน่วยเริ่มต้น" }

    if (defaultUnitId) {
        const unit = await getUnitType(defaultUnitId)
        if (!unit) return { ok: false, error: "ไม่พบหน่วยที่เลือก" }
    }

    const guards = await Promise.all(ids.map((id) => getSkuGuard(id)))
    if (guards.some((sku) => !sku)) return { ok: false, error: "ไม่พบตัวเลือกบางรายการ" }
    if (guards.some((sku) => !canManageProduct(sku.product, user))) return FORBIDDEN
    if (new Set(guards.map((sku) => sku.productId)).size > 1) {
        return { ok: false, error: "ตัวเลือกต้องอยู่สินค้าเดียวกัน" }
    }

    const result = await setSkusDefaultUnit(ids, defaultUnitId)
    if (!result) return { ok: false, error: "ตั้งหน่วยเริ่มต้นไม่สำเร็จ" }

    return { ok: true, ...result }
}

/** หมายเหตุยาวเกินนี้เริ่มอ่านไม่ไหวบนมือถือ และไม่ใช่ที่สำหรับเขียนรายละเอียดยาว ๆ */
const NOTE_MAX_LENGTH = 500

/**
 * แก้หมายเหตุประจำสินค้า (ที่เก็บของ/ย้ายโกดัง) พร้อมรูปจุดวาง
 *
 * ไม่เช็คเจ้าของ — คนหน้าคลังที่ย้ายของจริงมักไม่ใช่คนสร้างสินค้า ถ้าบังคับให้เจ้าของแก้
 * คนเดียว หมายเหตุจะเก่าค้างจนไม่มีใครเชื่อ แต่ยังบังคับล็อกอินเพื่อให้รู้ว่าใครแก้ล่าสุด
 */
export async function saveProductNoteAction(productId, note, imageUrl) {
    const id = toId(productId)
    const user = await requireUser()

    if (!user) return UNAUTHORIZED
    if (!id) return { ok: false, error: "ไม่พบสินค้า" }

    const text = String(note ?? "").trim()
    if (text.length > NOTE_MAX_LENGTH) {
        return { ok: false, error: `หมายเหตุยาวเกิน ${NOTE_MAX_LENGTH} ตัวอักษร` }
    }

    const product = await saveProductNote(
        id,
        text || null,
        String(imageUrl ?? "").trim() || null,
        user.id
    )
    if (!product) return { ok: false, error: "บันทึกหมายเหตุไม่สำเร็จ" }

    return { ok: true, product }
}

export async function deleteSkuAction(skuId) {
    const id = toId(skuId)
    const [user, current] = await Promise.all([requireUser(), id ? getSkuGuard(id) : null])

    if (!user) return UNAUTHORIZED
    if (!id || !current) return { ok: false, error: "ไม่พบตัวเลือก" }
    if (!canManageProduct(current.product, user)) return FORBIDDEN

    const ok = await deleteSku(id)
    if (!ok) return { ok: false, error: "ลบตัวเลือกไม่สำเร็จ" }

    return { ok: true }
}

// หมวดหมู่ใช้ร่วมกันทั้งระบบเหมือนหน่วยนับ ใครล็อกอินแล้วก็สร้างได้
export async function createCategoryAction(name) {
    const trimmed = String(name ?? "").trim()
    const user = await requireUser()
    if (!user) return UNAUTHORIZED
    if (!trimmed) return { ok: false, error: "กรอกชื่อหมวดหมู่" }

    const existing = await findCategory(trimmed)
    if (existing) return { ok: false, error: `มีหมวด "${existing.name}" อยู่แล้ว`, existing }

    const category = await createCategory(trimmed, user.id)
    if (!category) return { ok: false, error: "สร้างหมวดหมู่ไม่สำเร็จ" }

    return { ok: true, category }
}

export async function updateCategoryAction(id, name) {
    const categoryId = toId(id)
    const trimmed = String(name ?? "").trim()
    if (!(await requireUser())) return UNAUTHORIZED
    if (!categoryId) return { ok: false, error: "ไม่พบหมวดหมู่" }
    if (!trimmed) return { ok: false, error: "กรอกชื่อหมวดหมู่" }

    const existing = await findCategory(trimmed)
    if (existing && existing.id !== categoryId) {
        return { ok: false, error: `มีหมวด "${existing.name}" อยู่แล้ว` }
    }

    const category = await updateCategory(categoryId, trimmed)
    if (!category) return { ok: false, error: "แก้หมวดหมู่ไม่สำเร็จ" }

    return { ok: true, category }
}

// ลบหมวดแล้วสินค้าไม่หายตาม (categoryId เป็น SetNull) แค่หลุดออกจากหมวด
export async function deleteCategoryAction(id) {
    const categoryId = toId(id)
    if (!(await requireUser())) return UNAUTHORIZED
    if (!categoryId) return { ok: false, error: "ไม่พบหมวดหมู่" }

    return deleteCategory(categoryId)
}

/**
 * ย้ายหลายสินค้าเข้าหมวดเดียวกันในครั้งเดียว — ส่ง null เพื่อเอาออกจากหมวด
 *
 * ตรวจสิทธิ์ทุกตัวก่อนแล้วค่อยเขียน ถ้ามีสักตัวที่ไม่ใช่ของเราจะไม่เขียนอะไรเลย
 * ดีกว่าย้ายไปครึ่งหนึ่งแล้วค่อยฟ้อง เพราะผู้ใช้จะไม่รู้ว่าตัวไหนสำเร็จบ้าง
 */
export async function setProductsCategoryAction(productIds, categoryId) {
    const ids = toIdList(productIds)
    const target = categoryId === null || categoryId === "" ? null : toId(categoryId)

    const user = await requireUser()
    if (!user) return UNAUTHORIZED
    if (!ids || ids.length === 0) return { ok: false, error: "ยังไม่ได้เลือกสินค้า" }
    if (categoryId !== null && categoryId !== "" && target === null) {
        return { ok: false, error: "หมวดหมู่ไม่ถูกต้อง" }
    }

    const guards = await Promise.all(ids.map((id) => getProductGuard(id)))
    if (guards.some((product) => !product)) return { ok: false, error: "ไม่พบสินค้าบางรายการ" }
    if (guards.some((product) => !canManageProduct(product, user))) return FORBIDDEN

    const count = await setProductsCategory(ids, target)
    if (count === null) return { ok: false, error: "ย้ายหมวดหมู่ไม่สำเร็จ" }

    // ไม่ revalidate ตามหมายเหตุด้านบนของไฟล์ — ฝั่ง UI ทับ state เองจาก ids ที่ส่งมา
    return { ok: true, count, categoryId: target }
}

/** ย้ายสินค้าเข้าหมวด — ส่ง null เพื่อเอาออกจากหมวด แก้ได้เฉพาะเจ้าของสินค้า */
export async function setProductCategoryAction(productId, categoryId) {
    const id = toId(productId)
    // null = เอาออกจากหมวด ต้องแยกจากค่าที่ส่งมาผิดรูป
    const target = categoryId === null || categoryId === "" ? null : toId(categoryId)

    const [user, owned] = await Promise.all([requireUser(), id ? getProductGuard(id) : null])

    if (!user) return UNAUTHORIZED
    if (!id || !owned) return { ok: false, error: "ไม่พบสินค้า" }
    if (categoryId !== null && categoryId !== "" && target === null) {
        return { ok: false, error: "หมวดหมู่ไม่ถูกต้อง" }
    }
    if (!canManageProduct(owned, user)) return FORBIDDEN

    const updated = await setProductCategory(id, target)
    if (!updated) return { ok: false, error: "ย้ายหมวดหมู่ไม่สำเร็จ" }

    return { ok: true, product: updated }
}

/**
 * ตัวเลือกย่อยของสินค้าหนึ่งชิ้น — โหลดตอนเปิดกล่องจัดการตัวเลือกเท่านั้น
 *
 * รายการสินค้าในหน้าจัดการตั้งใจไม่ลาก skus มาด้วย (ดู productInclude)
 * เพราะสินค้าเป็นร้อยรายการ payload จะบวมทั้งที่ตารางใช้แค่จำนวนตัวเลือก
 */
export async function getProductSkusAction(productId) {
    const id = toId(productId)
    if (!(await requireUser())) return UNAUTHORIZED
    if (!id) return { ok: false, error: "ไม่พบสินค้า" }

    const product = await getProduct(id)
    if (!product) return { ok: false, error: "ไม่พบสินค้า" }

    return { ok: true, skus: product.skus ?? [] }
}

// ประวัติมีชื่อคนบันทึกติดมาด้วย เลยไม่เปิดให้คนนอกอ่าน
export async function getProductHistoryAction(productId) {
    const id = toId(productId)
    if (!(await requireUser())) return UNAUTHORIZED
    if (!id) return { ok: false, error: "ไม่พบสินค้า" }

    return { ok: true, history: await getProductHistory(id) }
}
