import { prisma } from "@/prisma/prisma.js"

export async function getQtyTypes() {
    try {
        const qtyTypes = await prisma.qtyType.findMany({
            orderBy: [{ qty: "desc" }, { name: "asc" }],
        })
        return qtyTypes
    } catch (error) {
        console.error(error)
        return []
    }
}

export async function getQtyType(id) {
    try {
        const qtyType = await prisma.qtyType.findUnique({
            where: { id },
        })
        return qtyType
    } catch (error) {
        console.error(error)
        return null
    }
}

export async function createQtyType(name, qty = 1) {
    try {
        const qtyType = await prisma.qtyType.create({
            data: { name, qty },
        })
        return qtyType
    } catch (error) {
        console.error(error)
        return null
    }
}

export async function updateQtyType(id, name, qty) {
    try {
        const qtyType = await prisma.qtyType.update({
            where: { id },
            data: { name, qty },
        })
        return qtyType
    } catch (error) {
        console.error(error)
        return null
    }
}

export async function deleteQtyType(id) {
    try {
        await prisma.qtyType.delete({ where: { id } })
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
