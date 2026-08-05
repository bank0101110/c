import { prisma } from "@/prisma/prisma.js"

const productInclude = {
    baseQty: true,
    ProductQtyType: { include: { qtyType: true }, orderBy: { id: "asc" } },
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

/** qty ที่รับมาเป็นหน่วยย่อยที่สุด, extraQtyTypeIds = หน่วยเสริมที่สินค้านี้ใช้ได้ */
export async function createProduct(name, imageUrl, baseQtyTypeId, qty = 0, extraQtyTypeIds = []) {
    try {
        const product = await prisma.product.create({
            data: {
                name,
                imageUrl,
                qty,
                qtyTypeId: baseQtyTypeId,
                ProductQtyType: {
                    create: extraQtyTypeIds
                        .filter((qtyTypeId) => qtyTypeId !== baseQtyTypeId)
                        .map((qtyTypeId) => ({ qtyTypeId })),
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

export async function updateProduct(id, name, imageUrl, baseQtyTypeId) {
    try {
        const product = await prisma.product.update({
            where: { id },
            data: { name, imageUrl, qtyTypeId: baseQtyTypeId },
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
