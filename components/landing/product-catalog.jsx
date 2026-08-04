"use client";

import { useMemo } from "react";
import { PackageX, Search } from "lucide-react";

import { siteConfig } from "@/lib/site-config";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/landing/product-card";
import { useSearch } from "@/components/landing/search-context";

export function ProductCatalog({ products }) {
  const { query, setQuery } = useSearch();

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return products;
    return products.filter((product) =>
      product.name.toLowerCase().includes(normalizedQuery)
    );
  }, [products, query]);

  return (
    <section id="products" className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <div className="mx-auto mb-8 max-w-md">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
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
            {products.length === 0
              ? "No products yet — check back soon."
              : "No products match your search."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
