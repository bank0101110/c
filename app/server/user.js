import { prisma } from "@/prisma/prisma.js"

// แถวใน user ถูกสร้างโดย Better Auth ตอนล็อกอิน OAuth ครั้งแรก แอปไม่สร้างเอง
// (id เป็น string ที่ Better Auth ออกให้ ไม่ใช่ autoincrement แล้ว)

export async function getUsers() {
    try {
        const users = await prisma.user.findMany({
            orderBy: { name: "asc" },
        })
        return users
    } catch (error) {
        console.error(error)
        return []
    }
}

export async function getUser(id) {
    try {
        const user = await prisma.user.findUnique({
            where: { id },
        })
        return user
    } catch (error) {
        console.error(error)
        return null
    }
}

export async function getUserByEmail(email) {
    try {
        const user = await prisma.user.findUnique({
            where: { email },
        })
        return user
    } catch (error) {
        console.error(error)
        return null
    }
}
