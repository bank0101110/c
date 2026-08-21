import { Prisma } from "@prisma/client"

import { prisma } from "@/prisma/prisma.js"
import { productInclude } from "@/app/server/product"
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
 *
 * จำนวน query ต้องคงที่ ไม่โตตามจำนวนตัวเลือกที่ติ๊ก
 *
 * เดิมลูปนี้ยิง DB ทีละแถว (หาหน่วย + update + create history = 3 รอบต่อหนึ่งตัวเลือก)
 * ติ๊ก 30 ตัวก็เกือบ 100 รอบเรียงกันในทรานแซกชันเดียว พอ DB อยู่คนละเครื่อง
 * ค่า latency ต่อรอบคูณเข้าไปจนชนลิมิตเวลาของ interactive transaction (ดีฟอลต์ 5 วิ)
 * แล้ว Prisma โยน P2028 ทิ้งทั้งชุด — อาการคือ "ยิ่งเลือกเยอะยิ่งช้าแล้วพังทั้งชุด"
 * ระหว่างนั้นทรานแซกชันยังจองคอนเนคชันจากพูลไว้ทั้งช่วง หน้าอื่นเลยพลอยหน่วงตามไปด้วย
 *
 * ตอนนี้อ่านทีเดียว ตรวจให้ครบใน JS แล้วค่อยเขียนเป็นก้อน — คงที่ที่ 5 query ไม่ว่าจะกี่ตัว
 */
/**
 * เขียนประวัติการปรับสต็อก — ตั้งใจแยกออกจากทรานแซกชันที่เปลี่ยนยอด
 *
 * เรียกหลังส่ง response ให้ผู้ใช้แล้ว (ผ่าน after() ของ Next) ผู้ใช้จึงไม่ต้องรอ
 *
 * ⚠ ผลที่ตามมา: ถ้าเขียนพลาด ยอดจะเปลี่ยนไปแล้วแต่ไม่มีประวัติกำกับ ซึ่งกู้อัตโนมัติไม่ได้
 * เลย log ข้อมูลทั้งก้อนออกมาให้ประกอบกลับเองได้ อย่าลดเป็นแค่ข้อความสั้น ๆ
 */
export async function writeStockHistory(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return true
    try {
        await prisma.productHistory.createMany({ data: rows })
        return true
    } catch (error) {
        console.error("writeStockHistory failed", JSON.stringify(rows), error)
        return false
    }
}

export async function adjustSkuStockBatch({ userId, productId, entries, note }) {
    try {
        return await prisma.$transaction(async (tx) => {
            const skus = await tx.sku.findMany({
                where: { productId },
                select: {
                    id: true,
                    name: true,
                    qty: true,
                    unitTypeId: true,
                    SkuUnitType: { select: { unitTypeId: true } },
                },
            })

            // หน่วยที่ถูกอ้างถึงทั้งหมดในชุดนี้ ดึงรอบเดียวจบ (รวมหน่วยหลักของ SKU ด้วย
            // เพราะหน่วยหลักก็เป็นแถวใน UnitType เหมือนกัน)
            const unitTypes = await tx.unitType.findMany({
                where: { id: { in: [...new Set(entries.map((entry) => entry.unitTypeId))] } },
                select: { id: true, name: true, qty: true },
            })

            const byId = new Map(skus.map((sku) => [sku.id, sku]))
            const unitById = new Map(unitTypes.map((unitType) => [unitType.id, unitType]))

            // skuId -> ยอดล่าสุด เผื่อ entries ส่งตัวเลือกเดิมซ้ำมาสองแถว ยอดจะได้ต่อกันถูก
            const nextQty = new Map()
            const historyRows = []

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

                const unitType = unitById.get(entry.unitTypeId)
                if (!unitType) {
                    throw new BatchError(`ไม่พบหน่วยที่เลือกของ "${sku.name}"`)
                }

                const factor = unitType.qty > 0 ? unitType.qty : 1
                const oldQty = nextQty.get(sku.id) ?? sku.qty
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

                nextQty.set(sku.id, newQty)
                historyRows.push({
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
                })
            }

            // ยอดใหม่ของทุกตัวเลือกในคำสั่งเดียว — updateMany ทำไม่ได้เพราะแต่ละแถวคนละค่า
            // ("updatedAt" ต้องเซ็ตเองด้วย @updatedAt ของ Prisma ไม่ทำงานกับ raw query)
            const updates = [...nextQty].filter(([skuId, qty]) => qty !== byId.get(skuId).qty)
            if (updates.length > 0) {
                await tx.$executeRaw`
                    UPDATE "Sku" AS s
                    SET qty = v.qty, "updatedAt" = NOW()
                    FROM (VALUES ${Prisma.join(
                        updates.map(([skuId, qty]) => Prisma.sql`(${skuId}::int, ${qty}::int)`)
                    )}) AS v(id, qty)
                    WHERE s.id = v.id
                `
            }

            // ยอดรวมของสินค้าแม่ต้องตามยอด SKU ที่เพิ่งเปลี่ยน
            const totals = await syncProductQty(tx, productId)

            // ส่งกลับเฉพาะยอดที่เปลี่ยน ไม่ใช่สินค้าทั้งก้อน
            //
            // เดิมปิดท้ายด้วย findUnique + productDetailInclude ซึ่ง Prisma แตกเป็น query
            // ต่อหนึ่ง relation (SKU, หน่วยของ SKU, หน่วยเสริม, เจ้าของ, หมวด) — วัดจริงกับสินค้า
            // 99 ตัวเลือกคือ ~800 ms แล้วยัดกลับไปทั้งก้อนทั้งที่มีแค่ qty ที่ขยับ
            // ฝั่ง UI ถือข้อมูลที่เหลืออยู่แล้ว เอาไปแปะทับเฉพาะตัวเลขก็พอ
            // historyRows ไม่ได้เขียนที่นี่ — ฝั่ง action เอาไปเขียนหลังตอบ response แล้ว
            // (วัดได้ ~50ms จาก 261ms ของทั้งชุด) ดู writeStockHistory() ด้านล่าง
            return {
                ok: true,
                productQty: totals?.qty ?? 0,
                skuQty: Object.fromEntries(nextQty),
                historyRows,
            }
        })
    } catch (error) {
        // BatchError = เหตุผลที่อธิบายผู้ใช้ได้ ส่งข้อความจริงกลับไป
        // ส่วน error อื่นคือของไม่คาดคิด ไม่ควรหลุดรายละเอียดออกหน้าเว็บ
        if (error instanceof BatchError) return { ok: false, error: error.message }
        console.error(error)
        return { ok: false, error: "ปรับสต็อกไม่สำเร็จ" }
    }
}

/**
 * ปรับสต็อกจาก "ตะกร้าเบิกของ" — หลายตัวเลือกข้ามหลายสินค้าในทรานแซกชันเดียว
 *
 * ต่างจาก adjustSkuStockBatch() ตรงที่ไม่ผูกกับสินค้าตัวเดียว เพราะคนหยิบของยืนอยู่จุดเดียว
 * แล้วหยิบของหลายสินค้าพร้อมกัน จะให้กดบันทึกทีละสินค้าก็เสียเวลาเปล่า
 *
 * ยังยึดกฎเดิมทุกข้อ: ตรวจให้ครบก่อนเขียน ผิดแถวเดียวตกทั้งชุด และจำนวน query คงที่
 * ไม่โตตามจำนวนรายการในตะกร้า (5 query ไม่ว่าจะ 3 รายการหรือ 50 รายการ)
 */
export async function adjustCartStock({ userId, entries, note }) {
    try {
        return await prisma.$transaction(async (tx) => {
            const skuIds = [...new Set(entries.map((entry) => entry.skuId))]
            const unitIds = [...new Set(entries.map((entry) => entry.unitTypeId))]

            const [skus, unitTypes] = await Promise.all([
                tx.sku.findMany({
                    where: { id: { in: skuIds } },
                    select: {
                        id: true,
                        name: true,
                        qty: true,
                        productId: true,
                        unitTypeId: true,
                        SkuUnitType: { select: { unitTypeId: true } },
                    },
                }),
                tx.unitType.findMany({
                    where: { id: { in: unitIds } },
                    select: { id: true, name: true, qty: true },
                }),
            ])

            const byId = new Map(skus.map((sku) => [sku.id, sku]))
            const unitById = new Map(unitTypes.map((unitType) => [unitType.id, unitType]))

            const nextQty = new Map()
            const historyRows = []

            for (const entry of entries) {
                const sku = byId.get(entry.skuId)
                if (!sku) throw new BatchError("มีรายการในตะกร้าที่ถูกลบไปแล้ว")

                const allowed =
                    entry.unitTypeId === sku.unitTypeId ||
                    sku.SkuUnitType.some((row) => row.unitTypeId === entry.unitTypeId)
                if (!allowed) throw new BatchError(`หน่วยที่เลือกใช้กับ "${sku.name}" ไม่ได้`)

                const unitType = unitById.get(entry.unitTypeId)
                if (!unitType) throw new BatchError(`ไม่พบหน่วยที่เลือกของ "${sku.name}"`)

                const factor = unitType.qty > 0 ? unitType.qty : 1
                const oldQty = nextQty.get(sku.id) ?? sku.qty
                const changeQty =
                    entry.type === "IN"
                        ? toBase(entry.amount, factor)
                        : entry.type === "OUT"
                          ? -toBase(entry.amount, factor)
                          : toBase(entry.amount, factor) - oldQty

                const newQty = oldQty + changeQty
                if (newQty < 0) throw new BatchError(`"${sku.name}" ยอดคงเหลือติดลบไม่ได้`)

                nextQty.set(sku.id, newQty)
                historyRows.push({
                    userId,
                    productId: sku.productId,
                    skuId: sku.id,
                    productUnitTypeId: null,
                    unitName: unitType.name,
                    unitAmount: entry.amount,
                    changeQty,
                    oldQty,
                    newQty,
                    type: entry.type,
                    note,
                })
            }

            const updates = [...nextQty].filter(([skuId, qty]) => qty !== byId.get(skuId).qty)
            if (updates.length > 0) {
                await tx.$executeRaw`
                    UPDATE "Sku" AS s
                    SET qty = v.qty, "updatedAt" = NOW()
                    FROM (VALUES ${Prisma.join(
                        updates.map(([skuId, qty]) => Prisma.sql`(${skuId}::int, ${qty}::int)`)
                    )}) AS v(id, qty)
                    WHERE s.id = v.id
                `
            }

            // ยอดรวมของสินค้าแม่ทุกตัวที่ถูกแตะ — รวบเป็น 2 query ไม่ใช่ 2 query ต่อสินค้า
            const productIds = [...new Set(skus.map((sku) => sku.productId))]
            const totals = await tx.sku.groupBy({
                by: ["productId"],
                where: { productId: { in: productIds } },
                _sum: { qty: true },
            })

            if (totals.length > 0) {
                await tx.$executeRaw`
                    UPDATE "Product" AS p
                    SET qty = v.qty, "updateAt" = NOW()
                    FROM (VALUES ${Prisma.join(
                        totals.map(
                            (row) =>
                                Prisma.sql`(${row.productId}::int, ${row._sum.qty ?? 0}::int)`
                        )
                    )}) AS v(id, qty)
                    WHERE p.id = v.id
                `
            }

            return {
                ok: true,
                skuQty: Object.fromEntries(nextQty),
                productQty: Object.fromEntries(
                    totals.map((row) => [row.productId, row._sum.qty ?? 0])
                ),
                historyRows,
            }
        })
    } catch (error) {
        if (error instanceof BatchError) return { ok: false, error: error.message }
        console.error(error)
        return { ok: false, error: "บันทึกตะกร้าไม่สำเร็จ" }
    }
}
