import { prisma } from "@/prisma/prisma";

export async function createUser(name) {
    
}
export async function getUser(id) {
    try {
        const user = await prisma.user.getById({id:id})
        return user
    } catch (error) {
        
    }
}