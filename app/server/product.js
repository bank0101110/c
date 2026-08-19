import { prisma } from "@/prisma/prisma.js"

/**
 * ชุดฟิลด์สำหรับ "รายการสินค้า" (หน้าแรก/หน้าจัดการ) — ตั้งใจไม่ลาก skus ทั้งก้อนมา
 *
 * หน้าแรกโหลดสินค้าเป็นร้อยรายการ ถ้า include skus เต็ม ๆ ทุกตัว payload จะบวมมาก
 * ทั้งที่การ์ดใช้แค่ยอดรวม (Product.qty ที่ sync ไว้แล้ว) กับจำนวนตัวเลือก
 * รายละเอียด SKU ค่อยดึงตอนเข้าหน้าสินค้าด้วย getProduct()
 */
export const productInclude = {
    baseUnit: true,
    ProductUnitType: { include: { unitType: true }, orderBy: { id: "asc" } },
    // ส่งไปถึง client ด้วย เลยเอาเฉพาะฟิลด์ที่ต้องโชว์ ไม่ลากทั้ง user มา
    owner: { select: { id: true, name: true, email: true, image: true } },
    category: { select: { id: true, name: true } },
    _count: { select: { skus: true } },
}

/** ฟิลด์ของหมายเหตุที่ส่งกลับหลังบันทึก — ฝั่ง client เอาไปทับ state ได้เลย */
export const productNoteSelect = {
    id: true,
    note: true,
    noteImageUrl: true,
    noteUpdatedAt: true,
    noteUpdatedBy: { select: { id: true, name: true, email: true, image: true } },
}

/** ชุดเต็มสำหรับหน้าสินค้าเดี่ยว — มี SKU พร้อมหน่วยของแต่ละตัว */
export const productDetailInclude = {
    ...productInclude,
    // เฉพาะหน้าสินค้าเดี่ยว — หน้ารายการไม่ต้อง join ผู้แก้หมายเหตุมาทีละร้อยแถว
    noteUpdatedBy: { select: { id: true, name: true, email: true, image: true } },
    skus: {
        orderBy: { id: "asc" },
        include: {
            baseUnit: true,
            SkuUnitType: { include: { unitType: true }, orderBy: { id: "asc" } },
        },
    },
}

/**
 * ดันสินค้าที่ยังมีของขึ้นก่อน ของที่หมดแล้วไปกองล่างสุด
 *
 * เรียงด้วย orderBy ของ Prisma ตรง ๆ ไม่ได้ เพราะเงื่อนไขคือ "qty > 0 หรือไม่" ไม่ใช่ค่า qty
 * (ถ้าเรียงด้วย qty ตรง ๆ ตัวที่มี 5000 ชิ้นจะกระโดดข้ามตัวที่มี 3 ชิ้น ทั้งที่ทั้งคู่ก็มีของ
 * เหมือนกัน — สิ่งที่ต้องการคือแยกแค่ "มี" กับ "หมด")
 *
 * sort ของ JS เสถียร ลำดับเดิมจาก DB (ใหม่สุดขึ้นก่อน) จึงยังอยู่ครบภายในแต่ละกลุ่ม
 */
function inStockFirst(products) {
    return products.sort((a, b) => (b.qty > 0) - (a.qty > 0))
}

export async function getProducts() {
    try {
        const products = await prisma.product.findMany({
            orderBy: { createdAt: "desc" },
            include: productInclude,
        })
        return inStockFirst(products)
    } catch (error) {
        console.error(error)
        return []
    }
}

/**
 * สินค้าของเจ้าของคนเดียว — ใช้ที่หน้า /manage
 *
 * หน้าแรกยังโชว์ของทุกคนเหมือนเดิม เพราะใครก็ดูสต็อกและตัดเข้า-ออกได้
 * ส่วนหน้าจัดการโชว์เฉพาะที่ตัวเองแก้ได้จริง จะได้ไม่มีแถวที่กดปุ่มอะไรไม่ได้เลยมาปน
 *
 * หมายเหตุ: สินค้าเก่าที่ ownerId เป็น null จะไม่ขึ้นที่นี่ ทั้งที่ canManageProduct()
 * ยังให้สิทธิ์แก้อยู่ — ตอนนี้ใน DB ไม่มีสักรายการ และของใหม่ผูกเจ้าของเสมอ
 * ถ้าวันหนึ่งมีขึ้นมา ให้เปลี่ยน where เป็น { OR: [{ ownerId }, { ownerId: null }] }
 */
export async function getProductsByOwner(ownerId) {
    try {
        const products = await prisma.product.findMany({
            where: { ownerId },
            orderBy: { createdAt: "desc" },
            include: productInclude,
        })
        return inStockFirst(products)
    } catch (error) {
        console.error(error)
        return []
    }
}

export async function getProduct(id) {
    try {
        const product = await prisma.product.findUnique({
            where: { id },
            include: productDetailInclude,
        })
        return product
    } catch (error) {
        console.error(error)
        return null
    }
}

/**
 * ข้อมูลย่อสำหรับ generateMetadata() — ชื่อ ยอดคงเหลือ รูป หมวด จำนวนตัวเลือก
 *
 * Next เรียก generateMetadata() แยกจากตัวเพจ และ Prisma ไม่ได้ dedupe ให้เหมือน fetch()
 * เดิมตรงนั้นเรียก getProduct() ตัวเต็ม หน้าสินค้าหนึ่งหน้าจึงลาก SKU + หน่วยทุกตัวมาสองรอบ
 * ทั้งที่รอบนั้นใช้แค่ไม่กี่ฟิลด์ไปทำ <title> กับพรีวิวตอนแชร์ลิงก์
 */
export async function getProductMeta(id) {
    try {
        return await prisma.product.findUnique({
            where: { id },
            select: {
                name: true,
                qty: true,
                imageUrl: true,
                baseUnit: { select: { name: true } },
                category: { select: { name: true } },
                _count: { select: { skus: true } },
            },
        })
    } catch (error) {
        console.error(error)
        return null
    }
}

/** ฟิลด์เท่าที่ Server Action ต้องใช้ตรวจสิทธิ์และตรวจค่า ไม่ต้องลากทั้งสินค้า+หน่วยมา */
export async function getProductGuard(id) {
    try {
        const product = await prisma.product.findUnique({
            where: { id },
            select: { id: true, ownerId: true, unitTypeId: true },
        })
        return product
    } catch (error) {
        console.error(error)
        return null
    }
}

/**
 * สร้างสินค้าพร้อม SKU เริ่มต้นหนึ่งตัวเสมอ
 *
 * หน่วยทั้งหมดอยู่ที่ระดับ SKU แล้ว สินค้าที่ไม่มี SKU เลยจะตัดสต็อกไม่ได้
 * เลยบังคับให้มีอย่างน้อยหนึ่งตัวตั้งแต่ตอนสร้าง — ผู้ใช้ค่อยไปเพิ่มตัวเลือกอื่นทีหลัง
 *
 * Product.unitTypeId กับ Product.qty ยังเขียนไว้เหมือนเดิม เพราะเป็นคอลัมน์ NOT NULL
 * และ syncProductQty() ใช้ qty เป็นยอดรวมของทุก SKU
 *
 * qty ที่รับมาเป็นหน่วยย่อยที่สุด, extraUnitTypeIds = หน่วยเสริมของ SKU เริ่มต้น
 */
export async function createProduct(
    name,
    imageUrl,
    baseUnitTypeId,
    qty = 0,
    extraUnitTypeIds = [],
    ownerId = null
) {
    try {
        const extras = [
            ...new Set(extraUnitTypeIds.filter((unitTypeId) => unitTypeId !== baseUnitTypeId)),
        ]

        const product = await prisma.product.create({
            data: {
                name,
                imageUrl,
                qty,
                unitTypeId: baseUnitTypeId,
                ownerId,
                skus: {
                    create: {
                        // ตั้งชื่อตามสินค้าไปก่อน เปลี่ยนทีหลังได้ที่กล่องจัดการตัวเลือก
                        name,
                        imageUrl,
                        qty,
                        unitTypeId: baseUnitTypeId,
                        SkuUnitType: { create: extras.map((unitTypeId) => ({ unitTypeId })) },
                    },
                },
            },
            include: productInclude,
        })
        return product
    } catch (error) {
        console.error(error)
        return null
    }
}

/**
 * แก้สินค้า + ปรับหน่วยเสริมให้ตรงกับที่เลือก ในทรานแซกชันเดียว
 *
 * extraUnitTypeIds คือชุดหน่วยเสริม "ทั้งหมด" ที่ต้องการหลังบันทึก ไม่ใช่ส่วนต่าง
 * ฝั่งเรียกจึงไม่ต้องรู้ว่าของเดิมมีอะไร (และไม่ต้องถือ ProductUnitType.id ไว้เอง)
 * เรียกซ้ำด้วยค่าเดิมกี่ครั้งผลก็เท่าเดิม
 *
 * ทำในทรานแซกชันเพราะเดิมเพิ่ม/ถอดหน่วยเป็นคนละ request กัน พังกลางทางแล้วค้างครึ่ง ๆ
 */
export async function saveProduct(id, name, imageUrl, baseUnitTypeId, extraUnitTypeIds = []) {
    try {
        return await prisma.$transaction(async (tx) => {
            // หน่วยหลักไม่ต้องมีแถวซ้ำใน ProductUnitType เลยตัดออกจากชุดที่ต้องการ
            const wanted = new Set(
                extraUnitTypeIds.filter((unitTypeId) => unitTypeId !== baseUnitTypeId)
            )
            const current = await tx.productUnitType.findMany({
                where: { ProductId: id },
                select: { id: true, unitTypeId: true },
            })

            const staleIds = current
                .filter((entry) => !wanted.has(entry.unitTypeId))
                .map((entry) => entry.id)
            const kept = new Set(current.map((entry) => entry.unitTypeId))
            const newIds = [...wanted].filter((unitTypeId) => !kept.has(unitTypeId))

            if (staleIds.length > 0) {
                await tx.productUnitType.deleteMany({ where: { id: { in: staleIds } } })
            }
            if (newIds.length > 0) {
                await tx.productUnitType.createMany({
                    data: newIds.map((unitTypeId) => ({ ProductId: id, unitTypeId })),
                })
            }

            // อัปเดตเป็นอย่างสุดท้าย จะได้ product ที่รวมหน่วยล่าสุดกลับไปก้อนเดียว
            return tx.product.update({
                where: { id },
                data: { name, imageUrl, unitTypeId: baseUnitTypeId },
                include: productInclude,
            })
        })
    } catch (error) {
        console.error(error)
        return null
    }
}

export async function deleteProduct(id) {
    try {
        await prisma.product.delete({ where: { id } })
        return true
    } catch (error) {
        console.error(error)
        return false
    }
}

/**
 * หมายเหตุประจำสินค้า — ที่เก็บของ/จุดวาง/ย้ายโกดัง พร้อมรูปถ่าย
 *
 * ทับของเดิมทั้งก้อน (ไม่เก็บประวัติหมายเหตุ) เพราะสิ่งที่คนอ่านต้องการคือ "ตอนนี้ของอยู่ไหน"
 * ไม่ใช่ว่าเคยอยู่ไหนมาบ้าง ส่วนใครแก้ล่าสุดเมื่อไหร่เก็บไว้ให้ตามตัวคนตอบได้
 */
export async function saveProductNote(id, note, imageUrl, userId) {
    const hasContent = Boolean(note || imageUrl)

    try {
        return await prisma.product.update({
            where: { id },
            data: {
                note,
                noteImageUrl: imageUrl,
                // ล้างหมายเหตุจนไม่เหลืออะไร ก็ไม่ต้องค้างว่าใครแก้ล่าสุด
                noteUpdatedAt: hasContent ? new Date() : null,
                noteUpdatedById: hasContent ? userId : null,
            },
            select: productNoteSelect,
        })
    } catch (error) {
        console.error(error)
        return null
    }
}
