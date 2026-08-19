-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "note" TEXT,
ADD COLUMN     "noteImageUrl" TEXT,
ADD COLUMN     "noteUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "noteUpdatedById" TEXT;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_noteUpdatedById_fkey" FOREIGN KEY ("noteUpdatedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

