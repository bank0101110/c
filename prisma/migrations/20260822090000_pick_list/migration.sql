-- CreateTable
CREATE TABLE "PickList" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PickList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickListItem" (
    "id" SERIAL NOT NULL,
    "pickListId" INTEGER NOT NULL,
    "skuId" INTEGER NOT NULL,
    "unitTypeId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "PickListItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PickList_ownerId_idx" ON "PickList"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "PickList_ownerId_name_key" ON "PickList"("ownerId", "name");

-- CreateIndex
CREATE INDEX "PickListItem_skuId_idx" ON "PickListItem"("skuId");

-- CreateIndex
CREATE UNIQUE INDEX "PickListItem_pickListId_skuId_key" ON "PickListItem"("pickListId", "skuId");

-- AddForeignKey
ALTER TABLE "PickList" ADD CONSTRAINT "PickList_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickListItem" ADD CONSTRAINT "PickListItem_pickListId_fkey" FOREIGN KEY ("pickListId") REFERENCES "PickList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickListItem" ADD CONSTRAINT "PickListItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickListItem" ADD CONSTRAINT "PickListItem_unitTypeId_fkey" FOREIGN KEY ("unitTypeId") REFERENCES "QtyType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

