import { prisma } from "@/prisma/prisma.js"

/**
 * หมวดทั้งหมด รวมหมวดว่างที่ยังไม่มีสินค้า
 *
 * หน้าจัดการกับช่องเลือกหมวดในหน้าสินค้าต้องเห็นครบ ไม่งั้นหมวดที่เพิ่งสร้าง (ยังไม่มีสินค้า)
 * จะหายไปจนแก้ชื่อ/ลบ/ย้ายสินค้าเข้าไม่ได้เลย
 */
export async function getCategories() {
    try {
        return await prisma.category.findMany({
            orderBy: { name: "asc" },
            include: { _count: { select: { products: true } } },
        })
    } catch (error) {
        console.error(error)
        return []
    }
}

/**
 * เฉพาะหมวดที่มีสินค้าอยู่จริง — ใช้กับแถบกรองหน้าแรก
 *
 * เดิมดึงมาทั้งหมดแล้วให้ฝั่ง client กรองหมวดว่างทิ้งเอง = ส่งของที่ไม่ได้ใช้ข้ามเน็ตไปฟรี ๆ
 * ทุกครั้งที่เปิดหน้าแรก คัดตั้งแต่ตอน query จบในตัว
 *
 * ไม่เอา _count มาด้วยเพราะแถบกรองไม่ได้โชว์จำนวน (ต่างจากหน้าจัดการที่โชว์)
 */
export async function getUsedCategories() {
    try {
        return await prisma.category.findMany({
            where: { products: { some: {} } },
            orderBy: { name: "asc" },
            select: { id: true, name: true },
        })
    } catch (error) {
        console.error(error)
        return []
    }
}

/** ชื่อหมวดห้ามซ้ำ (ไม่สนตัวพิมพ์ใหญ่เล็ก) — ใช้กันสร้างซ้ำก่อนยิง create */
export async function findCategory(name) {
    try {
        return await prisma.category.findFirst({
            where: { name: { equals: name, mode: "insensitive" } },
        })
    } catch (error) {
        console.error(error)
        return null
    }
}

export async function createCategory(name, ownerId = null) {
    try {
        return await prisma.category.create({ data: { name, ownerId } })
    } catch (error) {
        console.error(error)
        return null
    }
}

export async function updateCategory(id, name) {
    try {
        return await prisma.category.update({ where: { id }, data: { name } })
    } catch (error) {
        console.error(error)
        return null
    }
}

/** ลบหมวดแล้วสินค้าไม่หายตาม — categoryId เป็น SetNull สินค้าจะกลับไปกลุ่ม "ไม่มีหมวดหมู่" */
export async function deleteCategory(id) {
    try {
        await prisma.category.delete({ where: { id } })
        return { ok: true }
    } catch (error) {
        console.error(error)
        return { ok: false, error: "ลบหมวดหมู่ไม่สำเร็จ" }
    }
}

/** ย้ายสินค้าเข้าหมวด — categoryId เป็น null คือเอาออกจากหมวด */
/**
 * ย้ายหมวดหมู่หลายสินค้าพร้อมกัน — ผ่านการตรวจสิทธิ์รายตัวมาแล้วจาก action
 *
 * updateMany ทีเดียวแทนการ loop update เพราะ round trip เดียวจบ
 * และถ้าพลาดกลางทางจะไม่มีสินค้าบางส่วนถูกย้ายไปแล้วบางส่วนไม่
 */
export async function setProductsCategory(productIds, categoryId) {
    try {
        const result = await prisma.product.updateMany({
            where: { id: { in: productIds } },
            data: { categoryId },
        })
        return result.count
    } catch (error) {
        console.error(error)
        return null
    }
}

export async function setProductCategory(productId, categoryId) {
    try {
        return await prisma.product.update({
            where: { id: productId },
            data: { categoryId },
            select: { id: true, categoryId: true },
        })
    } catch (error) {
        console.error(error)
        return null
    }
}
