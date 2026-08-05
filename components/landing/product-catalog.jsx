"use client";

import { useMemo, useState } from "react";
import { PackageX, Search } from "lucide-react";

import { siteConfig } from "@/lib/site-config";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/landing/product-card";
import { useSearch } from "@/components/landing/search-context";
import {
  AdjustStockDialog,
  TYPE_OPTIONS,
} from "@/components/manage/adjust-stock-dialog";

// หน้าแรกให้ตัดเข้า-ออกเท่านั้น ส่วน Adjustment เก็บไว้ที่หน้าจัดการ
const IN_OUT = TYPE_OPTIONS.filter((option) => option.value !== "ADJUSTMENT");

export function ProductCatalog({ products, users }) {
  const { query, setQuery } = useSearch();
  const [productList, setProductList] = useState(products);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return productList;
    return productList.filter((product) =>
      product.name.toLowerCase().includes(normalizedQuery)
    );
  }, [productList, query]);

  function handleAdjusted(updated) {
    setProductList((prev) =>
      prev.map((product) => (product.id === updated.id ? updated : product))
    );
  }

  return (
    <section id="products" className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <div className="mx-auto mb-8 max-w-md">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={siteConfig.hero.searchPlaceholder}
            className="h-11 pl-9"
          />
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-20 text-center text-muted-foreground">
          <PackageX className="size-8" />
          <p className="text-sm">
            {productList.length === 0
              ? "No products yet — check back soon."
              : "No products match your search."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {filteredProducts.map((product) => (
            <AdjustStockDialog
              key={product.id}
              product={product}
              users={users}
              defaultType="OUT"
              typeOptions={IN_OUT}
              onAdjusted={handleAdjusted}
              trigger={
                <button
                  type="button"
                  className="rounded-xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  aria-label={`ตัดสต็อก ${product.name}`}
                />
              }
            >
              <ProductCard product={product} />
            </AdjustStockDialog>
          ))}
        </div>
      )}
    </section>
  );
}
