-- DropForeignKey
ALTER TABLE "PickList" DROP CONSTRAINT "PickList_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "PickListItem" DROP CONSTRAINT "PickListItem_pickListId_fkey";

-- DropForeignKey
ALTER TABLE "PickListItem" DROP CONSTRAINT "PickListItem_skuId_fkey";

-- DropForeignKey
ALTER TABLE "PickListItem" DROP CONSTRAINT "PickListItem_unitTypeId_fkey";

-- DropTable
DROP TABLE "PickList";

-- DropTable
DROP TABLE "PickListItem";

