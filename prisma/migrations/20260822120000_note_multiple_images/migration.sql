-- หมายเหตุใส่รูปได้หลายรูป: noteImageUrl (รูปเดียว) -> noteImageUrls (อาร์เรย์)

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "noteImageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- ย้ายรูปเดิมเข้าอาร์เรย์ให้ครบก่อน ค่อยทิ้งคอลัมน์เก่า จะได้ไม่มีรูปไหนหาย
UPDATE "Product"
SET "noteImageUrls" = ARRAY["noteImageUrl"]
WHERE "noteImageUrl" IS NOT NULL AND "noteImageUrl" <> '';

ALTER TABLE "Product" DROP COLUMN "noteImageUrl";
