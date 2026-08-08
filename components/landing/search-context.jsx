"use client";

import { createContext, useContext, useMemo, useState } from "react";

// คำค้นอยู่ใน context ไม่ใช่ state ของ ProductCatalog เอง เพื่อให้ย้ายช่องค้นหา
// ไปไว้ที่ navbar หรือ hero ได้โดยไม่ต้องยกสถานะขึ้นไปทั้งต้น
// รายชื่อสินค้าฝากมาด้วยเพราะช่องค้นหาที่ navbar ต้องใช้ทำ autocomplete
const SearchContext = createContext(null);

export function SearchProvider({ products = [], children }) {
  const [query, setQuery] = useState("");

  const value = useMemo(() => ({ query, setQuery, products }), [query, products]);

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
}
