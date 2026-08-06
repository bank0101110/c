-- เจ้าของสินค้า = คนที่กดสร้าง เอาไว้ตัดสิทธิ์แก้ไข/ลบ
-- nullable เพราะสินค้าที่มีอยู่ก่อนหน้านี้ไม่รู้ว่าใครสร้าง (โค้ดถือว่า "ไม่มีเจ้าของ" = คนที่ล็อกอินแล้วแก้ได้)
-- SET NULL ตอนลบ user เพื่อไม่ให้สินค้าหายตามเจ้าของไปด้วย
ALTER TABLE "Product" ADD COLUMN "ownerId" TEXT;

CREATE INDEX "Product_ownerId_idx" ON "Product"("ownerId");

ALTER TABLE "Product" ADD CONSTRAINT "Product_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
