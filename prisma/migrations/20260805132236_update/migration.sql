/*
  Warnings:

  - You are about to drop the column `qty` on the `ProductQtyType` table. All the data in the column will be lost.
  - Added the required column `qty` to the `QtyType` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProductQtyType" DROP COLUMN "qty";

-- AlterTable
ALTER TABLE "QtyType" ADD COLUMN     "qty" INTEGER NOT NULL;
