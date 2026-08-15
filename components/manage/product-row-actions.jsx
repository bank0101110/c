"use client";

import Link from "next/link";
import { ArrowUpDown, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EditProductDialog } from "@/components/manage/edit-product-dialog";
import { SkusDialog } from "@/components/manage/skus-dialog";
import { canManageProduct } from "@/lib/permissions";

/**
 * ชุดปุ่มจัดการสินค้าหนึ่งชิ้น — แก้ไข / ตัวเลือกย่อย / ปรับสต็อก / ลบ
 *
 * แยกออกมาเพราะใช้ทั้งในตารางสินค้าและในกล่อง "สินค้าในหมวด"
 * ถ้าปล่อยให้ต่างคนต่างเขียน วันหนึ่งจะมีที่หนึ่งได้ปุ่มใหม่แต่อีกที่ไม่ได้
 *
 * ไม่ใช่เจ้าของก็เหลือแค่ปรับสต็อก — ฝั่ง server กันซ้ำอีกชั้นอยู่แล้ว
 */
export function ProductRowActions({
  product,
  unitTypes,
  setUnitTypes,
  currentUser,
  onUpdated,
  onSkuCountChange,
  onDelete,
  deleting = false,
}) {
  const canManage = canManageProduct(product, currentUser);

  return (
    <div className="flex shrink-0 justify-end gap-1.5">
      {canManage && (
        <>
          <EditProductDialog product={product} onUpdated={onUpdated} />
          <SkusDialog
            product={product}
            unitTypes={unitTypes}
            setUnitTypes={setUnitTypes}
            onCountChange={(count) => onSkuCountChange?.(product.id, count)}
          />
        </>
      )}

      {/*
        ปรับสต็อกไปทำที่หน้าสินค้า ไม่ใช่ dialog ที่นี่
        ยอดจริงอยู่ที่ SKU แล้ว ส่วน Product.qty เป็นผลรวมที่ syncProductQty() คำนวณใหม่
        ทุกครั้งที่มี SKU ถูกปรับ — การเขียน Product.qty ตรง ๆ จึงถูกทับหายในภายหลัง
      */}
      <Button
        variant="ghost"
        size="icon-sm"
        nativeButton={false}
        render={<Link href={`/product/${product.id}`} />}
        aria-label={`ปรับสต็อก ${product.name}`}
      >
        <ArrowUpDown />
      </Button>

      {canManage && onDelete && (
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={deleting}
          onClick={() => onDelete(product.id)}
          aria-label={`ลบ ${product.name}`}
        >
          <Trash2 />
        </Button>
      )}
    </div>
  );
}
