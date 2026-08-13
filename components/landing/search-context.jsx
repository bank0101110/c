"use client";

import { createContext, useContext, useMemo } from "react";

import { useUrlState } from "@/lib/use-url-state";

// คำค้นอยู่ใน context ไม่ใช่ state ของ ProductCatalog เอง เพื่อให้ย้ายช่องค้นหา
// ไปไว้ที่ navbar หรือ hero ได้โดยไม่ต้องยกสถานะขึ้นไปทั้งต้น
// รายชื่อสินค้าฝากมาด้วยเพราะช่องค้นหาที่ navbar ต้องใช้ทำ autocomplete
const SearchContext = createContext(null);

export function SearchProvider({ products = [], children }) {
  // อยู่ใน URL ไม่ใช่ useState เพื่อให้กดเข้าหน้าสินค้าแล้วย้อนกลับมาแล้วคำค้นยังอยู่
  const [query, setQuery] = useUrlState("q");

  /**
   * ทำชื่อพิมพ์เล็กไว้ล่วงหน้าครั้งเดียว
   *
   * เดิมทั้งช่องแนะนำและตัวกรองรายการเรียก name.toLowerCase() ใหม่ทุกครั้งที่พิมพ์
   * สินค้าเป็นร้อยรายการ = สร้าง string ใหม่หลายร้อยก้อนต่อการกดปุ่มหนึ่งครั้ง
   * ซึ่งเป็นสาเหตุที่ตัวอักษรแรกหน่วงเป็นครึ่งวินาที
   */
  const index = useMemo(
    () => products.map((product) => ({ product, lower: product.name.toLowerCase() })),
    [products]
  );

  const value = useMemo(
    () => ({ query, setQuery, products, index }),
    [query, setQuery, products, index]
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
}
