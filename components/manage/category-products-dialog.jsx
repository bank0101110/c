"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { List, Package } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ProductRowActions } from "@/components/manage/product-row-actions";
import { thumbnailUrl } from "@/lib/images";

/**
 * ดูรายการสินค้าในหมวดหนึ่ง
 *
 * กรองจากรายการที่หน้าจัดการถืออยู่แล้ว ไม่ยิง server เพิ่ม — เปิดปุ๊บเห็นปั๊บ
 * ผลที่ตามมา: เห็นเฉพาะสินค้าของตัวเอง ซึ่งตรงกับที่ตารางสินค้าแสดงอยู่แล้ว
 * แต่จะไม่ตรงกับตัวเลขบนป้ายของหมวด ถ้าหมวดนั้นมีสินค้าของคนอื่นปนอยู่
 */
export function CategoryProductsDialog({
  category,
  products,
  unitTypes,
  setUnitTypes,
  currentUser,
  onProductUpdated,
  onSkuCountChange,
  onProductDelete,
  deletingIds,
}) {
  const [open, setOpen] = useState(false);

  const inCategory = useMemo(
    () => products.filter((product) => product.categoryId === category.id),
    [products, category.id]
  );

  const totalCount = category._count?.products ?? inCategory.length;
  const hasOthers = totalCount > inCategory.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`ดูสินค้าในหมวด ${category.name}`}
          />
        }
      >
        <List />
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="truncate">สินค้าในหมวด {category.name}</DialogTitle>
          <DialogDescription>
            {inCategory.length} รายการ
            {hasOthers && ` (หมวดนี้มีทั้งหมด ${totalCount} รวมของเจ้าของคนอื่น)`}
          </DialogDescription>
        </DialogHeader>

        {inCategory.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            ยังไม่มีสินค้าในหมวดนี้
          </p>
        ) : (
          <ul className="flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto">
            {inCategory.map((product) => (
              // ปุ่มแก้ไขต้องอยู่นอก <Link> ไม่งั้นกดแก้ไขแล้วเด้งไปหน้าสินค้าด้วย
              <li
                key={product.id}
                // มือถือให้ชื่อกินเต็มบรรทัดแรก แล้วปุ่มตกลงบรรทัดล่าง ไม่งั้นชื่อเหลือที่ไม่กี่สิบพิกเซล
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2 transition-colors hover:bg-muted/60"
              >
                <Link
                  href={`/product/${product.id}`}
                  className="flex min-w-0 flex-1 basis-full items-center gap-2.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:basis-auto"
                >
                  <div className="size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbnailUrl(product.imageUrl)}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        width={80}
                        height={80}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <Package className="size-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <span className="min-w-0 flex-1 truncate text-sm">{product.name}</span>
                </Link>

                <Badge variant={product.qty > 0 ? "secondary" : "destructive"}>
                  {product.qty > 0 ? product.qty : "หมด"}
                </Badge>

                {/* ชุดปุ่มเดียวกับในตารางสินค้าเป๊ะ ๆ ทำได้ทุกอย่างเหมือนกัน */}
                <ProductRowActions
                  product={product}
                  unitTypes={unitTypes}
                  setUnitTypes={setUnitTypes}
                  currentUser={currentUser}
                  onUpdated={onProductUpdated}
                  onSkuCountChange={onSkuCountChange}
                  onDelete={onProductDelete}
                  deleting={deletingIds?.has(product.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
