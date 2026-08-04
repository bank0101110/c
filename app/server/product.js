import { prisma } from "@/prisma/prisma.js"

export async function getProducts() {
    try {
        const products = await prisma.product.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                baseQty: true,
                ProductQtyType: { include: { qtyType: true } },
            },
        })
        return products
    } catch (error) {
        console.error(error)
        return []
    }
}

export async function createProduct(name,imageUrl,userId,qtyTypeIds) {
    try {
        const res = await prisma.product.create({
            data:{
                name:name,
                imageUrl:imageUrl,
            }
        })
    } catch (error) {
        console.error(error)
    }
}