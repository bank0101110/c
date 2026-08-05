import { prisma } from "@/prisma/prisma.js"

export async function addProductUnit(productId, qtyTypeId, qty = 0) {
    try {
        const productQtyType = await prisma.productQtyType.create({
            data: {
                ProductId: productId,
                qtyTypeId,
                qty,
            },
            include: { qtyType: true },
        })
        return productQtyType
    } catch (error) {
        console.error(error)
        return null
    }
}

export async function removeProductUnit(id) {
    try {
        await prisma.productQtyType.delete({ where: { id } })
        return true
    } catch (error) {
        console.error(error)
        return false
    }
}
