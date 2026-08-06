// Prisma 7 ตัด query engine แบบเดิมออก ต้องต่อ DB ผ่าน driver adapter เสมอ
// (ตัว datasource url อยู่ใน prisma.config.ts ส่วน runtime ใช้ pool ข้างล่างนี้)
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

// แก้ schema.prisma แล้วต้องรีสตาร์ท dev server ไม่งั้นไฟล์นี้ยังถือ client ตัวเก่า
// ที่ Node cache ไว้ แล้วจะฟ้อง "Unknown argument" ทั้งที่ schema ถูกแล้ว
export const prisma = new PrismaClient({ adapter });