import { prisma } from "@/prisma/prisma.js"

const productInclude = {
    baseUnit: true,
    ProductUnitType: { include: { unitType: true }, orderBy: { id: "asc" } },
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

/** qty ที่รับมาเป็นหน่วยย่อยที่สุด, extraUnitTypeIds = หน่วยเสริมที่สินค้านี้ใช้ได้ */
export async function createProduct(name, imageUrl, baseUnitTypeId, qty = 0, extraUnitTypeIds = []) {
    try {
        const product = await prisma.product.create({
            data: {
                name,
                imageUrl,
                qty,
                unitTypeId: baseUnitTypeId,
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
