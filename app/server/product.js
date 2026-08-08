import { prisma } from "@/prisma/prisma.js"

const productInclude = {
    baseUnit: true,
    ProductUnitType: { include: { unitType: true }, orderBy: { id: "asc" } },
    // ส่งไปถึง client ด้วย เลยเอาเฉพาะฟิลด์ที่ต้องโชว์ ไม่ลากทั้ง user มา
    owner: { select: { id: true, name: true, email: true, image: true } },
}

export async function getProducts() {
    try {
        const products = await prisma.product.findMany({
            orderBy: { createdAt: "desc" },
            include: productInclude,
        })
        return products
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
        return products
    } catch (error) {
        console.error(error)
        return []
    }
}

export async function getProduct(id) {
    try {
        const product = await prisma.product.findUnique({
            where: { id },
            include: productInclude,
        })
        return product
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

/** qty ที่รับมาเป็นหน่วยย่อยที่สุด, extraUnitTypeIds = หน่วยเสริมที่สินค้านี้ใช้ได้ */
export async function createProduct(
    name,
    imageUrl,
    baseUnitTypeId,
    qty = 0,
    extraUnitTypeIds = [],
    ownerId = null
) {
    try {
        const product = await prisma.product.create({
            data: {
                name,
                imageUrl,
                qty,
                unitTypeId: baseUnitTypeId,
                ownerId,
                ProductUnitType: {
                    create: extraUnitTypeIds
                        .filter((unitTypeId) => unitTypeId !== baseUnitTypeId)
                        .map((unitTypeId) => ({ unitTypeId })),
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

export async function updateProduct(id, name, imageUrl, baseUnitTypeId) {
    try {
        const product = await prisma.product.update({
            where: { id },
            data: { name, imageUrl, unitTypeId: baseUnitTypeId },
            include: productInclude,
        })
        return product
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
