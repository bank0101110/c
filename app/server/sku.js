import { prisma } from "@/prisma/prisma.js"

export const skuInclude = {
    baseUnit: true,
    SkuUnitType: { include: { unitType: true }, orderBy: { id: "asc" } },
}

/** ฟิลด์เท่าที่ Server Action ต้องใช้ตรวจสิทธิ์ — เจ้าของ SKU คือเจ้าของสินค้าแม่ */
export async function getSkuGuard(id) {
    try {
        return await prisma.sku.findUnique({
            where: { id },
            select: {
                id: true,
                productId: true,
                unitTypeId: true,
                product: { select: { id: true, ownerId: true } },
            },
        })
    } catch (error) {
        console.error(error)
        return null
    }
}

export async function createSku(productId, name, imageUrl, unitTypeId, qty = 0, extraUnitTypeIds = [], code = null) {
    try {
        return await prisma.sku.create({
            data: {
                productId,
                name,
                code,
                imageUrl,
                qty,
                unitTypeId,
                SkuUnitType: {
                    create: extraUnitTypeIds
                        .filter((id) => id !== unitTypeId)
                        .map((id) => ({ unitTypeId: id })),
                },
            },
            include: skuInclude,
        })
    } catch (error) {
        console.error(error)
        return null
    }
}

/**
 * แก้ SKU + ปรับหน่วยเสริมให้ตรงกับที่เลือก ในทรานแซกชันเดียว
 * extraUnitTypeIds คือชุดหน่วยเสริม "ทั้งหมด" ที่ต้องการหลังบันทึก ไม่ใช่ส่วนต่าง
 * (โครงเดียวกับ saveProduct เพื่อให้ฝั่ง UI ใช้รูปแบบเดิม)
 */
/**
 * ตั้งหน่วยให้หลายตัวเลือกพร้อมกัน — แตะเฉพาะหน่วย ไม่ยุ่งชื่อ/รหัส/รูป
 *
 * แยกจาก saveSku() เพราะการแก้หมู่ต้องคงข้อมูลเฉพาะตัวของแต่ละ SKU ไว้
 * ถ้าใช้ saveSku วนลูปจะต้องส่งชื่อไปด้วยทุกครั้ง เสี่ยงเขียนทับชื่อกันเอง
 *
 * ทำในทรานแซกชันเดียว ถ้าพลาดกลางทางจะไม่มีบางตัวเปลี่ยนบางตัวไม่เปลี่ยน
 */
export async function setSkusUnits(skuIds, unitTypeId, extraUnitTypeIds = []) {
    try {
        return await prisma.$transaction(async (tx) => {
            const wanted = [...new Set(extraUnitTypeIds.filter((id) => id !== unitTypeId))]

            // ล้างหน่วยเสริมเดิมของทุกตัวแล้วใส่ชุดใหม่ ง่ายกว่าไล่หาส่วนต่างทีละตัว
            await tx.skuUnitType.deleteMany({ where: { skuId: { in: skuIds } } })
            if (wanted.length > 0) {
                await tx.skuUnitType.createMany({
                    data: skuIds.flatMap((skuId) =>
                        wanted.map((unitId) => ({ skuId, unitTypeId: unitId }))
                    ),
                })
            }

            await tx.sku.updateMany({ where: { id: { in: skuIds } }, data: { unitTypeId } })

            return tx.sku.findMany({ where: { id: { in: skuIds } }, include: skuInclude })
        })
    } catch (error) {
        console.error(error)
        return null
    }
}

export async function saveSku(id, name, imageUrl, unitTypeId, extraUnitTypeIds = [], code = null) {
    try {
        return await prisma.$transaction(async (tx) => {
            const wanted = new Set(extraUnitTypeIds.filter((unitId) => unitId !== unitTypeId))
            const current = await tx.skuUnitType.findMany({
                where: { skuId: id },
                select: { id: true, unitTypeId: true },
            })

            const staleIds = current
                .filter((entry) => !wanted.has(entry.unitTypeId))
                .map((entry) => entry.id)
            const kept = new Set(current.map((entry) => entry.unitTypeId))
            const newIds = [...wanted].filter((unitId) => !kept.has(unitId))

            if (staleIds.length > 0) {
                await tx.skuUnitType.deleteMany({ where: { id: { in: staleIds } } })
            }
            if (newIds.length > 0) {
                await tx.skuUnitType.createMany({
                    data: newIds.map((unitId) => ({ skuId: id, unitTypeId: unitId })),
                })
            }

            return tx.sku.update({
                where: { id },
                data: { name, imageUrl, unitTypeId, code },
                include: skuInclude,
            })
        })
    } catch (error) {
        console.error(error)
        return null
    }
}

/** ลบ SKU แล้วยอดรวมของสินค้าแม่ต้องลดตามด้วย ไม่งั้นยอดค้างเกินจริง */
export async function deleteSku(id) {
    try {
        return await prisma.$transaction(async (tx) => {
            const sku = await tx.sku.findUnique({ where: { id }, select: { productId: true } })
            if (!sku) return false
            await tx.sku.delete({ where: { id } })
            await syncProductQty(tx, sku.productId)
            return true
        })
    } catch (error) {
        console.error(error)
        return false
    }
}

/**
 * ยอดของสินค้าแม่ = ผลรวมของทุก SKU
 *
 * เก็บซ้ำไว้ใน Product.qty แทนที่จะคิดสดทุกครั้ง เพื่อให้หน้าแรกที่โหลดสินค้าเป็นร้อย ๆ
 * ไม่ต้อง join ตาราง SKU มารวมทุกแถว และการ์ด/breakdown เดิมใช้ต่อได้โดยไม่ต้องแก้
 * ทุกทางที่แตะ Sku.qty ต้องเรียกตัวนี้ปิดท้ายเสมอ
 */
export async function syncProductQty(tx, productId) {
    const total = await tx.sku.aggregate({
        where: { productId },
        _sum: { qty: true },
    })
    // ไม่มี SKU เหลือแล้ว = กลับไปเป็นสินค้าเดี่ยว ปล่อย qty ไว้ให้ผู้ใช้จัดการเอง
    const count = await tx.sku.count({ where: { productId } })
    if (count === 0) return null

    return tx.product.update({
        where: { id: productId },
        data: { qty: total._sum.qty ?? 0 },
        select: { id: true, qty: true },
    })
}
