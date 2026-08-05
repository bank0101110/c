"use client";

import { useState, useTransition } from "react";
import { Package, Trash2 } from "lucide-react";

import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NewProductDialog } from "@/components/manage/new-product-dialog";
import { AdjustStockDialog } from "@/components/manage/adjust-stock-dialog";
import { AddUnitSelect } from "@/components/manage/add-unit-select";
import { deleteProductAction } from "@/app/manage/actions";
import { formatBreakdown, productUnits } from "@/lib/stock";

// คอลัมน์ต้องตรงกันระหว่างหัวตารางกับแถว เลยแชร์คลาสเดียว
const COLUMNS =
  "sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.5fr)_auto] sm:gap-4 sm:px-2";

function StockCell({ product, qtyTypes, onUnitAdded }) {
  const units = productUnits(product);
  const smallestUnit = units.at(-1);

  return (
    <div className="flex flex-col gap-1">
      <span className="font-medium">
        {product.qty} {smallestUnit?.name}
      </span>
      {units.length > 1 && product.qty > 0 && (
        <span className="text-xs text-muted-foreground">
          {formatBreakdown(product.qty, units)}
        </span>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        {product.ProductQtyType.map((entry) => (
          <Badge key={entry.id} variant="secondary">
            {entry.qtyType.name} ×{entry.qtyType.qty}
          </Badge>
        ))}
        <AddUnitSelect product={product} qtyTypes={qtyTypes} onAdded={onUnitAdded} />
      </div>
    </div>
  );
}

export function ProductsPanel({ products, setProducts, qtyTypes, users }) {
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

  function handleUnitAdded(productId, unit) {
    setProducts((prev) =>
      prev.map((product) =>
        product.id === productId
          ? { ...product, ProductQtyType: [...product.ProductQtyType, unit] }
          : product
      )
    );
  }

  function handleStockAdjusted(updated) {
    setProducts((prev) =>
      prev.map((product) => (product.id === updated.id ? updated : product))
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Products</CardTitle>
        <CardAction>
          <NewProductDialog qtyTypes={qtyTypes} onCreated={handleCreated} />
        </CardAction>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-12 text-center text-muted-foreground">
            <Package className="size-8" />
            <p className="text-sm">No products yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* หัวตารางโผล่เฉพาะจอกว้าง จอแคบแถวจะซ้อนเป็นการ์ดแทน */}
            <div
              className={`hidden pb-2 text-sm font-medium sm:grid ${COLUMNS} sm:border-b sm:border-border`}
            >
              <span>Product</span>
              <span>Base unit</span>
              <span>Stock</span>
              <span className="text-right">Actions</span>
            </div>

            {products.map((product) => (
              <div
                key={product.id}
                className={`grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 border-b border-border py-3 last:border-0 sm:items-center ${COLUMNS}`}
              >
                <span className="col-start-1 row-start-1 truncate font-medium">
                  {product.name}
                </span>

                <span className="col-start-1 row-start-2 sm:col-start-2 sm:row-start-1">
                  <Badge variant="outline">{product.baseQty?.name}</Badge>
                </span>

                <div className="col-span-2 col-start-1 row-start-3 sm:col-span-1 sm:col-start-3 sm:row-start-1">
                  <StockCell
                    product={product}
                    qtyTypes={qtyTypes}
                    onUnitAdded={(unit) => handleUnitAdded(product.id, unit)}
                  />
                </div>

                <div className="col-start-2 row-span-2 row-start-1 flex justify-end gap-1.5 justify-self-end sm:col-start-4 sm:row-span-1">
                  <AdjustStockDialog
                    product={product}
                    users={users}
                    onAdjusted={handleStockAdjusted}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={isPending}
                    onClick={() => handleDelete(product.id)}
                    aria-label={`Delete ${product.name}`}
                  >
                    <Trash2 />
                  </Button>
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
