import { prisma } from "@/prisma/prisma.js"

export async function getProducts() {
    try {
        const products = await prisma.product.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                baseQty: true,
                ProductQtyType: { include: { qtyType: true } },
            },
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
            include: {
                baseQty: true,
                ProductQtyType: { include: { qtyType: true } },
            },
        })
        return product
    } catch (error) {
        console.error(error)
        return null
    }
}

export async function createProduct(name, imageUrl, baseQtyTypeId, productQtyTypes = []) {
    try {
        const product = await prisma.product.create({
            data: {
                name,
                imageUrl,
                qtyTypeId: baseQtyTypeId,
                ProductQtyType: {
                    create: productQtyTypes.map((pqt) => ({
                        qtyTypeId: pqt.qtyTypeId,
                        qty: pqt.qty,
                    })),
                },
            },
            include: {
                baseQty: true,
                ProductQtyType: { include: { qtyType: true } },
            },
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
