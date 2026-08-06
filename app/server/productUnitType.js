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

/** ถอดหน่วยรู้แค่ id ของแถว ต้องย้อนไปหาสินค้าก่อนถึงจะเช็คเจ้าของได้ */
export async function getProductUnitOwnership(id) {
    try {
        const entry = await prisma.productUnitType.findUnique({
            where: { id },
            select: { product: { select: { id: true, ownerId: true } } },
        })
        return entry?.product ?? null
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
