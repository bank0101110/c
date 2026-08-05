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
export async function adjustStock({ userId, productId, unitTypeId, amount, type, note }) {
    try {
        return await prisma.$transaction(async (tx) => {
            const product = await tx.product.findUniqueOrThrow({
                where: { id: productId },
                include: { baseUnit: true, ProductUnitType: true },
            })

            const allowed =
                unitTypeId === product.unitTypeId ||
                product.ProductUnitType.some((entry) => entry.unitTypeId === unitTypeId)
            if (!allowed) {
                return { ok: false, error: "หน่วยนี้ใช้กับสินค้านี้ไม่ได้" }
            }

            const unitType =
                unitTypeId === product.unitTypeId
                    ? product.baseUnit
                    : await tx.unitType.findUniqueOrThrow({ where: { id: unitTypeId } })

            const factor = unitType.qty > 0 ? unitType.qty : 1
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
                    baseUnit: true,
                    ProductUnitType: { include: { unitType: true }, orderBy: { id: "asc" } },
                },
            })

            const productUnitType = product.ProductUnitType.find(
                (entry) => entry.unitTypeId === unitTypeId
            )

            const history = await tx.productHistory.create({
                data: {
                    userId,
                    productId,
                    productUnitTypeId: productUnitType?.id ?? null,
                    unitName: unitType.name,
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
