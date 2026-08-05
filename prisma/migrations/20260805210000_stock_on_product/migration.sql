-- Product ถือยอดคงเหลือจริง เก็บเป็นหน่วยย่อยที่สุด
ALTER TABLE "Product" ADD COLUMN "qty" INTEGER NOT NULL DEFAULT 0;

-- คอลัมน์ซ้ำกับ createdAt
ALTER TABLE "Product" DROP COLUMN "CreatedAt";

-- QtyType.qty เป็นตัวคูณ (1 หน่วยนี้ = กี่หน่วยย่อย) หน่วยย่อยที่สุด = 1
ALTER TABLE "QtyType" ALTER COLUMN "qty" SET DEFAULT 1;
UPDATE "QtyType" SET "qty" = 1 WHERE "qty" <= 0;

-- เก็บหน่วย/จำนวนที่ผู้ใช้กรอกไว้ในประวัติ เติมค่าเดิมก่อนบังคับ NOT NULL
ALTER TABLE "ProductHistory" ADD COLUMN "unitName" TEXT;
ALTER TABLE "ProductHistory" ADD COLUMN "unitAmount" INTEGER;

UPDATE "ProductHistory" AS h
SET "unitName" = COALESCE(q."name", 'unknown'),
    "unitAmount" = ABS(h."changeQty")
FROM "ProductQtyType" AS pqt
LEFT JOIN "QtyType" AS q ON q."id" = pqt."qtyTypeId"
WHERE pqt."id" = h."productQtyTypeId";

UPDATE "ProductHistory"
SET "unitName" = COALESCE("unitName", 'unknown'),
    "unitAmount" = COALESCE("unitAmount", ABS("changeQty"));

ALTER TABLE "ProductHistory" ALTER COLUMN "unitName" SET NOT NULL;
ALTER TABLE "ProductHistory" ALTER COLUMN "unitAmount" SET NOT NULL;

-- ปรับสต็อกด้วยหน่วยหลักได้ ไม่ต้องมีแถวใน ProductQtyType
ALTER TABLE "ProductHistory" ALTER COLUMN "productQtyTypeId" DROP NOT NULL;

-- ลบหน่วยแล้วประวัติต้องไม่หาย แต่ลบสินค้าให้ประวัติหายไปด้วย
ALTER TABLE "ProductHistory" DROP CONSTRAINT "ProductHistory_productQtyTypeId_fkey";
ALTER TABLE "ProductHistory" ADD CONSTRAINT "ProductHistory_productQtyTypeId_fkey" FOREIGN KEY ("productQtyTypeId") REFERENCES "ProductQtyType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductHistory" DROP CONSTRAINT "ProductHistory_productId_fkey";
ALTER TABLE "ProductHistory" ADD CONSTRAINT "ProductHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
