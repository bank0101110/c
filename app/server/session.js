import { cache } from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"

/**
 * อ่าน session จาก cookie แล้วเช็คกับตาราง session จริงใน DB
 * cache() ทำให้เรียกกี่ที่ในหนึ่ง render ก็ยิง DB รอบเดียว
 */
export const getSession = cache(async () => {
    try {
        return await auth.api.getSession({ headers: await headers() })
    } catch (error) {
        console.error(error)
        return null
    }
})

export async function getCurrentUser() {
    const session = await getSession()
    return session?.user ?? null
}

/** ใช้ในหน้า/layout — ไม่ได้ล็อกอินให้เด้งไปหน้า login */
export async function requireUser(next) {
    const user = await getCurrentUser()
    if (!user) {
        redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login")
    }
    return user
}
