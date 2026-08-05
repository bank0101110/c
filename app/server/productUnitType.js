import { prisma } from "@/prisma/prisma.js"

export async function addProductUnit(productId, unitTypeId) {
    try {
        const productUnitType = await prisma.productUnitType.create({
            data: {
                ProductId: productId,
                unitTypeId,
            },
            include: { unitType: true },
        })
        return productUnitType
    } catch (error) {
        console.error(error)
        return null
    }
}

export async function removeProductUnit(id) {
    try {
        await prisma.productUnitType.delete({ where: { id } })
        return true
    } catch (error) {
        console.error(error)
        return false
    }
}
