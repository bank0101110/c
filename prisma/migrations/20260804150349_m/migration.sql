/*
  Warnings:

  - You are about to drop the column `qty` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `productUnitId` on the `ProductHistory` table. All the data in the column will be lost.
  - You are about to drop the `ProductUnit` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Unit` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `qtyTypeId` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productQtyTypeId` to the `ProductHistory` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ProductHistory" DROP CONSTRAINT "ProductHistory_productUnitId_fkey";

-- DropForeignKey
ALTER TABLE "ProductUnit" DROP CONSTRAINT "ProductUnit_ProductId_fkey";

-- DropForeignKey
ALTER TABLE "ProductUnit" DROP CONSTRAINT "ProductUnit_unitId_fkey";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "qty",
ADD COLUMN     "qtyTypeId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "ProductHistory" DROP COLUMN "productUnitId",
ADD COLUMN     "productQtyTypeId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "ProductUnit";

-- DropTable
DROP TABLE "Unit";

-- CreateTable
CREATE TABLE "QtyType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "QtyType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductQtyType" (
    "id" SERIAL NOT NULL,
    "ProductId" INTEGER NOT NULL,
    "qtyTypeId" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,

    CONSTRAINT "ProductQtyType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductQtyType_ProductId_qtyTypeId_key" ON "ProductQtyType"("ProductId", "qtyTypeId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_qtyTypeId_fkey" FOREIGN KEY ("qtyTypeId") REFERENCES "QtyType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductQtyType" ADD CONSTRAINT "ProductQtyType_ProductId_fkey" FOREIGN KEY ("ProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductQtyType" ADD CONSTRAINT "ProductQtyType_qtyTypeId_fkey" FOREIGN KEY ("qtyTypeId") REFERENCES "QtyType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductHistory" ADD CONSTRAINT "ProductHistory_productQtyTypeId_fkey" FOREIGN KEY ("productQtyTypeId") REFERENCES "ProductQtyType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
