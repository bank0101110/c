"use client";

import { useState, useTransition } from "react";
import { Package, Trash2 } from "lucide-react";

import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NewProductDialog } from "@/components/manage/new-product-dialog";
import { AdjustStockDialog } from "@/components/manage/adjust-stock-dialog";
import { EditProductDialog } from "@/components/manage/edit-product-dialog";
import { deleteProductAction } from "@/app/manage/actions";
import { canManageProduct } from "@/lib/permissions";
import { formatBreakdown, productUnits } from "@/lib/stock";

// คอลัมน์ต้องตรงกันระหว่างหัวตารางกับแถว เลยแชร์คลาสเดียว
// จอกว้างเป็นตาราง 5 คอลัมน์ (รูป + 4 คอลัมน์เดิม) จอแคบยุบเหลือ 3 แล้วซ้อนเป็นการ์ด
const COLUMNS =
  "sm:grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1.5fr)_auto] sm:gap-4 sm:px-2";

// URL รูปพิมพ์มือได้ พังบ่อย เลยถอยกลับไปใช้ไอคอนแทนกรอบรูปเสียของเบราว์เซอร์
function Thumbnail({ product }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(product.imageUrl) && !failed;

  return (
    <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted sm:size-10">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <Package className="size-4 text-muted-foreground" />
      )}
    </div>
  );
}

// บอกว่าใครเป็นเจ้าของ คนอ่านจะได้รู้ว่าทำไมปุ่มแก้ไข/ลบไม่ขึ้นกับสินค้าตัวนี้
function ownerLabel(product, currentUser) {
  if (!product.ownerId) return "ไม่มีเจ้าของ — ใครก็แก้ได้";
  if (product.ownerId === currentUser?.id) return "เจ้าของ: คุณ";
  return `เจ้าของ: ${product.owner?.name || product.owner?.email || "ไม่ทราบ"}`;
}

function StockCell({ product }) {
  const units = productUnits(product);
  const smallestUnit = units.at(-1);

  if (product.qty <= 0) {
    return <Badge variant="destructive">หมด</Badge>;
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-medium tabular-nums">
        {product.qty} {smallestUnit?.name}
      </span>
      {units.length > 1 && (
        <span className="text-xs text-muted-foreground">
          {formatBreakdown(product.qty, units)}
        </span>
      )}
    </div>
  );
}

export function ProductsPanel({
  products,
  setProducts,
  unitTypes,
  setUnitTypes,
  currentUser,
}) {
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  function handleCreated(product) {
    setProducts((prev) => [product, ...prev]);
  }

  function handleDelete(id) {
    startTransition(async () => {
      const result = await deleteProductAction(id);
      if (result.ok) {
        setProducts((prev) => prev.filter((product) => product.id !== id));
        setError(null);
      } else {
        setError(result.error);
      }
    });
  }

  // ทั้งแก้ไขสินค้าและปรับสต็อกคืน product ที่อัปเดตแล้วมาทั้งก้อน
  function handleProductReplaced(updated) {
    setProducts((prev) =>
      prev.map((product) => (product.id === updated.id ? updated : product))
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>สินค้า</CardTitle>
        <CardAction>
          <NewProductDialog
            unitTypes={unitTypes}
            setUnitTypes={setUnitTypes}
            onCreated={handleCreated}
          />
        </CardAction>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-12 text-center text-muted-foreground">
            <Package className="size-8" />
            <p className="text-sm">ยังไม่มีสินค้า กด &ldquo;เพิ่มสินค้า&rdquo; เพื่อเริ่มต้น</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* หัวตารางโผล่เฉพาะจอกว้าง จอแคบแถวจะซ้อนเป็นการ์ดแทน */}
            <div
              className={`hidden pb-2 text-sm font-medium text-muted-foreground sm:grid ${COLUMNS} sm:border-b sm:border-border`}
            >
              {/* ช่องว่างตรงคอลัมน์รูป ให้หัวตารางเลื่อนไปตรงกับแถวข้างล่าง */}
              <span className="size-10" aria-hidden="true" />
              <span>สินค้า</span>
              <span>หน่วยหลัก</span>
              <span>คงเหลือ</span>
              <span className="text-right">จัดการ</span>
            </div>

            {products.map((product) => (
              <div
                key={product.id}
                className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1.5 border-b border-border py-3 transition-colors last:border-0 sm:items-center sm:rounded-lg sm:hover:bg-muted/50 ${COLUMNS}`}
              >
                <div className="col-start-1 row-span-3 row-start-1 sm:row-span-1">
                  {/* URL เปลี่ยนเมื่อไหร่ต้องได้ลองโหลดใหม่ ไม่ค้างสถานะรูปพังของอันเก่า */}
                  <Thumbnail key={product.imageUrl ?? "none"} product={product} />
                </div>

                <div className="col-start-2 row-start-1 flex min-w-0 flex-col">
                  <span className="truncate font-medium">{product.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {ownerLabel(product, currentUser)}
                  </span>
                </div>

                <span className="col-start-2 row-start-2 sm:col-start-3 sm:row-start-1">
                  <Badge variant="outline">{product.baseUnit?.name}</Badge>
                </span>

                <div className="col-start-2 row-start-3 sm:col-start-4 sm:row-start-1">
                  <StockCell product={product} />
                </div>

                <div className="col-start-3 row-span-3 row-start-1 flex justify-end gap-1.5 justify-self-end sm:col-start-5 sm:row-span-1">
                  {/* ไม่ใช่เจ้าของก็ซ่อนแก้ไข/ลบไปเลย เหลือแค่ตัดสต็อก — ฝั่ง server กันซ้ำอีกชั้น */}
                  {canManageProduct(product, currentUser) && (
                    <EditProductDialog
                      product={product}
                      unitTypes={unitTypes}
                      onUpdated={handleProductReplaced}
                    />
                  )}
                  <AdjustStockDialog
                    product={product}
                    currentUser={currentUser}
                    onAdjusted={handleProductReplaced}
                  />
                  {canManageProduct(product, currentUser) && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={isPending}
                      onClick={() => handleDelete(product.id)}
                      aria-label={`ลบ ${product.name}`}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
