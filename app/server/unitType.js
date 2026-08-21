import { unstable_cache } from "next/cache"

import { prisma } from "@/prisma/prisma.js"

/** tag สำหรับล้างแคชหน่วยนับ — action ที่สร้าง/ลบหน่วยต้องเรียก revalidateTag ด้วยตัวนี้ */
export const UNIT_TYPES_TAG = "unit-types"

/**
 * หน่วยนับทั้งระบบ — แคชไว้ข้ามรีเควสต์
 *
 * ตารางนี้มีไม่กี่สิบแถวและนาน ๆ ทีถึงจะมีหน่วยใหม่ แต่ถูกอ่านทุกครั้งที่เปิดหน้าสินค้า
 * และหน้าจัดการ ซึ่งแต่ละครั้งคือไป-กลับ DB ข้ามภูมิภาคเกือบร้อยมิลลิวินาที
 * เพิ่ม/ลบหน่วยเมื่อไหร่ก็ล้างด้วย tag ส่วน revalidate เป็นตาข่ายกันแคชค้างถ้าพลาดไป
 */
export const getUnitTypes = unstable_cache(
    async () => {
        try {
            return await prisma.unitType.findMany({
                orderBy: [{ qty: "desc" }, { name: "asc" }],
            })
        } catch (error) {
            console.error(error)
            return []
        }
    },
    ["unit-types"],
    { tags: [UNIT_TYPES_TAG], revalidate: 3600 }
)

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
