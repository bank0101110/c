import { prisma } from "@/prisma/prisma.js"

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

export async function getUserByName(name) {
    try {
        const user = await prisma.user.findUnique({
            where: { name },
        })
        return user
    } catch (error) {
        console.error(error)
        return null
    }
}

export async function createUser(name) {
    try {
        const user = await prisma.user.create({
            data: { name },
        })
        return user
    } catch (error) {
        console.error(error)
        return null
    }
}
