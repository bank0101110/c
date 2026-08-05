import { prisma } from "@/prisma/prisma.js"
import { toBase } from "@/lib/stock"

export async function getProductHistory(productId) {
    try {
        const history = await prisma.productHistory.findMany({
            where: { productId },
            orderBy: { createdAt: "desc" },
            take: 50,
            include: { user: true },
        })
        return history
    } catch (error) {
        console.error(error)
        return []
    }
}

/**
 * ปรับสต็อกด้วยหน่วยที่ผู้ใช้เลือก แล้วแปลงเป็นหน่วยย่อยที่สุดก่อนบันทึกลง Product.qty
 * amount = จำนวนตามหน่วยที่เลือก, IN/OUT คือเพิ่ม/ลด, ADJUSTMENT คือตั้งยอดใหม่
 */
export async function adjustStock({ userId, productId, qtyTypeId, amount, type, note }) {
    try {
        return await prisma.$transaction(async (tx) => {
            const product = await tx.product.findUniqueOrThrow({
                where: { id: productId },
                include: { baseQty: true, ProductQtyType: true },
            })

            const allowed =
                qtyTypeId === product.qtyTypeId ||
                product.ProductQtyType.some((entry) => entry.qtyTypeId === qtyTypeId)
            if (!allowed) {
                return { ok: false, error: "หน่วยนี้ใช้กับสินค้านี้ไม่ได้" }
            }

            const qtyType =
                qtyTypeId === product.qtyTypeId
                    ? product.baseQty
                    : await tx.qtyType.findUniqueOrThrow({ where: { id: qtyTypeId } })

            const factor = qtyType.qty > 0 ? qtyType.qty : 1
            const oldQty = product.qty
            const changeQty =
                type === "IN"
                    ? toBase(amount, factor)
                    : type === "OUT"
                      ? -toBase(amount, factor)
                      : toBase(amount, factor) - oldQty

            const newQty = oldQty + changeQty
            if (newQty < 0) {
                return { ok: false, error: "ยอดคงเหลือติดลบไม่ได้" }
            }

            const updated = await tx.product.update({
                where: { id: productId },
                data: { qty: newQty },
                include: {
                    baseQty: true,
                    ProductQtyType: { include: { qtyType: true }, orderBy: { id: "asc" } },
                },
            })

            const productQtyType = product.ProductQtyType.find(
                (entry) => entry.qtyTypeId === qtyTypeId
            )

            const history = await tx.productHistory.create({
                data: {
                    userId,
                    productId,
                    productQtyTypeId: productQtyType?.id ?? null,
                    unitName: qtyType.name,
                    unitAmount: amount,
                    changeQty,
                    oldQty,
                    newQty,
                    type,
                    note,
                },
            })

            return { ok: true, product: updated, history }
        })
    } catch (error) {
        console.error(error)
        return { ok: false, error: "ปรับสต็อกไม่สำเร็จ" }
    }
}
