import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { prisma } from "@/prisma/prisma.js";

// ตั้ง provider เฉพาะตัวที่มีคีย์จริงใน env — ใส่ตัวที่ยังไม่มีคีย์ไว้ Better Auth
// จะโผล่ปุ่มล็อกอินที่กดแล้วพังตอน redirect ไป provider แทนที่จะเงียบ ๆ ไม่มีปุ่ม
function socialProviders() {
  const providers = {};

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    // ขอแค่ name/email/profile — Google ยกเว้นชุดนี้จากกฎ Testing mode
    // เติม scope อื่นเมื่อไหร่ ต้องไปเพิ่ม Test users หรือ Publish app ก่อน ไม่งั้นล็อกอินไม่ได้
    providers.google = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    };
  }

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.github = {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    };
  }

  return providers;
}

export const enabledProviders = Object.keys(socialProviders());

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  socialProviders: socialProviders(),
  // ระบบนี้เข้าด้วย OAuth อย่างเดียว ไม่เปิดสมัคร/ล็อกอินด้วยรหัสผ่าน
  emailAndPassword: { enabled: false },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  // ต้องอยู่ท้ายสุดของ plugins — ทำให้ Server Action เซ็ต cookie session ได้
  plugins: [nextCookies()],
});
