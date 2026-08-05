import { prisma } from "@/prisma/prisma.js"

export async function getProductHistory(productId) {
    try {
        const history = await prisma.productHistory.findMany({
            where: { productId },
            orderBy: { createdAt: "desc" },
            include: {
                user: true,
                productQtyType: { include: { qtyType: true } },
            },
        })
        return history
    } catch (error) {
        console.error(error)
        return []
    }
}

export async function adjustStock({ userId, productQtyTypeId, changeQty, type, note }) {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const productQtyType = await tx.productQtyType.findUniqueOrThrow({
                where: { id: productQtyTypeId },
            })

            const oldQty = productQtyType.qty
            const newQty = oldQty + changeQty

            const updated = await tx.productQtyType.update({
                where: { id: productQtyTypeId },
                data: { qty: newQty },
            })

            const history = await tx.productHistory.create({
                data: {
                    userId,
                    productId: productQtyType.ProductId,
                    productQtyTypeId,
                    changeQty,
                    oldQty,
                    newQty,
                    type,
                    note,
                },
            })

            return { productQtyType: updated, history }
        })
        return result
    } catch (error) {
        console.error(error)
        return null
    }
}
