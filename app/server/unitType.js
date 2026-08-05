import { prisma } from "@/prisma/prisma.js"

export async function getUnitTypes() {
    try {
        const unitTypes = await prisma.unitType.findMany({
            orderBy: [{ qty: "desc" }, { name: "asc" }],
        })
        return unitTypes
    } catch (error) {
        console.error(error)
        return []
    }
}

export async function getUnitType(id) {
    try {
        const unitType = await prisma.unitType.findUnique({
            where: { id },
        })
        return unitType
    } catch (error) {
        console.error(error)
        return null
    }
}

/** ชื่อ+ตัวคูณเหมือนกันถือว่าเป็นหน่วยเดิม (ชื่อไม่สนตัวพิมพ์ใหญ่เล็ก) */
export async function findUnitType(name, qty) {
    try {
        const unitType = await prisma.unitType.findFirst({
            where: {
                qty,
                name: { equals: name, mode: "insensitive" },
            },
        })
        return unitType
    } catch (error) {
        console.error(error)
        return null
    }
}

export async function createUnitType(name, qty = 1) {
    try {
        const unitType = await prisma.unitType.create({
            data: { name, qty },
        })
        return unitType
    } catch (error) {
        console.error(error)
        return null
    }
}

export async function updateUnitType(id, name, qty) {
    try {
        const unitType = await prisma.unitType.update({
            where: { id },
            data: { name, qty },
        })
        return unitType
    } catch (error) {
        console.error(error)
        return null
    }
}

export async function deleteUnitType(id) {
    try {
        await prisma.unitType.delete({ where: { id } })
        return { ok: true }
    } catch (error) {
        // FK ค้าง = ยังมีสินค้าใช้หน่วยนี้อยู่
        if (error?.code === "P2003" || error?.code === "P2014") {
            return { ok: false, error: "หน่วยนี้ถูกใช้กับสินค้าอยู่ ลบไม่ได้" }
        }
        console.error(error)
        return { ok: false, error: "ลบหน่วยไม่สำเร็จ" }
    }
}
