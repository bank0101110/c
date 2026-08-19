-- หน่วยเริ่มต้นตอนตัดสต็อกของแต่ละตัวเลือก (null = ใช้หน่วยหลัก)
-- คอลัมน์นี้มีอยู่แล้วในฐานข้อมูลจริง ไฟล์นี้ทำให้ฐานใหม่ที่รัน migrate deploy ได้โครงเดียวกัน
ALTER TABLE "Sku" ADD COLUMN IF NOT EXISTS "defaultUnitTypeId" INTEGER;

ALTER TABLE "Sku" DROP CONSTRAINT IF EXISTS "Sku_defaultUnitTypeId_fkey";
ALTER TABLE "Sku" ADD CONSTRAINT "Sku_defaultUnitTypeId_fkey"
    FOREIGN KEY ("defaultUnitTypeId") REFERENCES "QtyType"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
