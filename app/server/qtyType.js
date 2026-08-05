import { prisma } from "@/prisma/prisma.js"

export async function getQtyTypes() {
    try {
        const qtyTypes = await prisma.qtyType.findMany({
            orderBy: { name: "asc" },
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

export async function createQtyType(name,qty) {
    try {
        const qtyType = await prisma.qtyType.create({
            data: { name,qty },
        })
        return qtyType
    } catch (error) {
        console.error(error)
        return null
    }
}

export async function updateQtyType(id, name) {
    try {
        const qtyType = await prisma.qtyType.update({
            where: { id },
            data: { name },
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
        return true
    } catch (error) {
        console.error(error)
        return false
    }
}
