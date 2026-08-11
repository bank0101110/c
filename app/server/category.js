import { prisma } from "@/prisma/prisma.js"

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
