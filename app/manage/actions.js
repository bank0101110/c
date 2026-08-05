"use server"

import { revalidatePath } from "next/cache"

import { createProduct, deleteProduct } from "@/app/server/product"
import { addProductUnit } from "@/app/server/productQtyType"
import { createQtyType, deleteQtyType } from "@/app/server/qtyType"
import { createUser } from "@/app/server/user"
import { adjustStock } from "@/app/server/productHistory"

export async function createProductAction(name, imageUrl, baseQtyTypeId) {
    const product = await createProduct(name, imageUrl, baseQtyTypeId)
    revalidatePath("/manage")
    return product
}

export async function deleteProductAction(id) {
    const ok = await deleteProduct(id)
    revalidatePath("/manage")
    return ok
}

export async function addUnitAction(productId, qtyTypeId) {
    const unit = await addProductUnit(productId, qtyTypeId, 0)
    revalidatePath("/manage")
    return unit
}

export async function adjustStockAction(userId, productQtyTypeId, changeQty, type, note) {
    const result = await adjustStock({ userId, productQtyTypeId, changeQty, type, note })
    revalidatePath("/manage")
    return result
}

export async function createQtyTypeAction(name) {
    const qtyType = await createQtyType(name)
    revalidatePath("/manage")
    return qtyType
}

export async function deleteQtyTypeAction(id) {
    const ok = await deleteQtyType(id)
    revalidatePath("/manage")
    return ok
}

export async function createUserAction(name) {
    const user = await createUser(name)
    revalidatePath("/manage")
    return user
}
