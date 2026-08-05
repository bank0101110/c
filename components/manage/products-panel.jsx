"use client";

import { useTransition } from "react";
import { Package, Trash2 } from "lucide-react";

import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NewProductDialog } from "@/components/manage/new-product-dialog";
import { AdjustStockDialog } from "@/components/manage/adjust-stock-dialog";
import { AddUnitSelect } from "@/components/manage/add-unit-select";
import { deleteProductAction } from "@/app/manage/actions";

export function ProductsPanel({ products, setProducts, qtyTypes, users }) {
  const [isPending, startTransition] = useTransition();

  function handleCreated(product) {
    setProducts((prev) => [product, ...prev]);
  }

  function handleDelete(id) {
    startTransition(async () => {
      const ok = await deleteProductAction(id);
      if (ok) setProducts((prev) => prev.filter((product) => product.id !== id));
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

  function handleStockAdjusted(productId, productQtyTypeId, newQty) {
    setProducts((prev) =>
      prev.map((product) =>
        product.id === productId
          ? {
              ...product,
              ProductQtyType: product.ProductQtyType.map((entry) =>
                entry.id === productQtyTypeId ? { ...entry, qty: newQty } : entry
              ),
            }
          : product
      )
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Base unit</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="max-w-40 truncate font-medium">
                    {product.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{product.baseQty?.name}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {product.ProductQtyType.map((entry) => (
                        <Badge key={entry.id} variant="secondary">
                          {entry.qty} {entry.qtyType.name}
                        </Badge>
                      ))}
                      <AddUnitSelect
                        product={product}
                        qtyTypes={qtyTypes}
                        onAdded={(unit) => handleUnitAdded(product.id, unit)}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <AdjustStockDialog
                        product={product}
                        users={users}
                        onAdjusted={(productQtyTypeId, newQty) =>
                          handleStockAdjusted(product.id, productQtyTypeId, newQty)
                        }
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
