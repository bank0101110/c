"use client";

import { createContext, useContext, useDeferredValue, useMemo } from "react";

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

  /**
   * การกรองหนักกว่าการอัปเดตช่องพิมพ์มาก — ปล่อยให้ตัวอักษรขึ้นจอก่อน แล้วค่อยตามด้วย
   * รายการที่กรองแล้ว ช่องค้นหาจะได้ไม่หนืดตอนพิมพ์รัว
   *
   * อยู่ที่ context ไม่ใช่ใน ProductCatalog เพราะช่องค้นหาที่ navbar ต้องรู้ด้วยว่า
   * ผลลัพธ์ตามมาทันหรือยัง จะได้ขึ้นตัวหมุนบอกว่ากำลังค้นอยู่
   */
  const deferredQuery = useDeferredValue(query);
  const isSearching = query !== deferredQuery;

  const value = useMemo(
    () => ({ query, setQuery, deferredQuery, isSearching, products, index }),
    [query, setQuery, deferredQuery, isSearching, products, index]
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
