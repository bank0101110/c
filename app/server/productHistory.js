import { prisma } from "@/prisma/prisma.js"
import { productInclude, productDetailInclude } from "@/app/server/product"
import { syncProductQty } from "@/app/server/sku"
import { toBase } from "@/lib/stock"

export async function getProductHistory(productId) {
    try {
        const history = await prisma.productHistory.findMany({
            where: { productId },
            orderBy: { createdAt: "desc" },
            take: 50,
            // ชื่อ SKU ติดมาด้วย จะได้รู้ว่าแถวนั้นตัดสต็อกของตัวเลือกไหน
            include: { user: true, sku: { select: { id: true, name: true } } },
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

            // include ชุดเดียวกับตอนโหลดหน้า ไม่งั้น product ที่ส่งกลับไปแทนที่ของเดิม
            // จะไม่มี owner ติดมา แล้วแถวนั้นจะเปลี่ยนเป็น "เจ้าของ: ไม่ทราบ" ทันทีที่ตัดสต็อก
            const updated = await tx.product.update({
                where: { id: productId },
                data: { qty: newQty },
                include: productInclude,
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

/**
 * ใช้ throw เพื่อยกเลิกทรานแซกชัน — `return { ok: false }` เฉย ๆ ไม่ rollback
 *
 * Prisma ถือว่า interactive transaction สำเร็จถ้า callback คืนค่าปกติ ต่อให้ค่าที่คืนจะ
 * แปลว่า "ล้มเหลว" ก็ตาม เคยพลาดตรงนี้มาแล้ว: แถวแรกที่ผ่านถูกบันทึกจริง
 * ทั้งที่แถวถัดไปตัดจนติดลบและควรตกไปทั้งชุด
 */
class BatchError extends Error {}

/**
 * ปรับสต็อกหลาย SKU ของสินค้าเดียวกันในทรานแซกชันเดียว
 *
 * entries = [{ skuId, unitTypeId, amount, type }] — แต่ละตัวเลือกหน่วยและชนิดรายการเองได้
 * เพราะจำนวนต่อหน่วยของแต่ละ SKU ไม่เท่ากัน (ถุง 6x9 กับ 12x20 คนละขนาด)
 *
 * ทำเป็นก้อนเดียวเพราะผู้ใช้กด "บันทึก" ครั้งเดียวหลังติ๊กหลายตัว — ถ้าตัวใดตัวหนึ่ง
 * ไม่ผ่าน (เช่นตัดจนติดลบ) ต้องไม่มีตัวไหนถูกบันทึกเลย ไม่งั้นยอดจะค้างครึ่ง ๆ
 * และผู้ใช้ไม่รู้ว่าอันไหนผ่านอันไหนไม่ผ่าน
 */
export async function adjustSkuStockBatch({ userId, productId, entries, note }) {
    try {
        return await prisma.$transaction(async (tx) => {
            const skus = await tx.sku.findMany({
                where: { productId },
                include: { baseUnit: true, SkuUnitType: true },
            })
            const byId = new Map(skus.map((sku) => [sku.id, sku]))

            const histories = []

            for (const entry of entries) {
                const sku = byId.get(entry.skuId)
                if (!sku) {
                    throw new BatchError("ไม่พบตัวเลือกที่เลือกไว้ในสินค้านี้")
                }

                const allowed =
                    entry.unitTypeId === sku.unitTypeId ||
                    sku.SkuUnitType.some((row) => row.unitTypeId === entry.unitTypeId)
                if (!allowed) {
                    throw new BatchError(`หน่วยที่เลือกใช้กับ "${sku.name}" ไม่ได้`)
                }

                const unitType =
                    entry.unitTypeId === sku.unitTypeId
                        ? sku.baseUnit
                        : await tx.unitType.findUniqueOrThrow({ where: { id: entry.unitTypeId } })

                const factor = unitType.qty > 0 ? unitType.qty : 1
                const oldQty = sku.qty
                const changeQty =
                    entry.type === "IN"
                        ? toBase(entry.amount, factor)
                        : entry.type === "OUT"
                          ? -toBase(entry.amount, factor)
                          : toBase(entry.amount, factor) - oldQty

                const newQty = oldQty + changeQty
                if (newQty < 0) {
                    throw new BatchError(`"${sku.name}" ยอดคงเหลือติดลบไม่ได้`)
                }

                await tx.sku.update({ where: { id: sku.id }, data: { qty: newQty } })
                // อัปเดตในแมปด้วย เผื่อ entries ส่งตัวเลือกเดิมซ้ำมาสองแถว ยอดจะได้ต่อกันถูก
                sku.qty = newQty

                histories.push(
                    await tx.productHistory.create({
                        data: {
                            userId,
                            productId,
                            skuId: sku.id,
                            productUnitTypeId: null,
                            unitName: unitType.name,
                            unitAmount: entry.amount,
                            changeQty,
                            oldQty,
                            newQty,
                            type: entry.type,
                            note,
                        },
                    })
                )
            }

            // ยอดรวมของสินค้าแม่ต้องตามยอด SKU ที่เพิ่งเปลี่ยน
            await syncProductQty(tx, productId)

            const product = await tx.product.findUnique({
                where: { id: productId },
                include: productDetailInclude,
            })

            return { ok: true, product, histories }
        })
    } catch (error) {
        // BatchError = เหตุผลที่อธิบายผู้ใช้ได้ ส่งข้อความจริงกลับไป
        // ส่วน error อื่นคือของไม่คาดคิด ไม่ควรหลุดรายละเอียดออกหน้าเว็บ
        if (error instanceof BatchError) return { ok: false, error: error.message }
        console.error(error)
        return { ok: false, error: "ปรับสต็อกไม่สำเร็จ" }
    }
}
