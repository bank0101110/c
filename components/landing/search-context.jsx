"use client";

import { createContext, useContext, useState } from "react";

// คำค้นอยู่ใน context ไม่ใช่ state ของ ProductCatalog เอง เพื่อให้ย้ายช่องค้นหา
// ไปไว้ที่ navbar หรือ hero ได้โดยไม่ต้องยกสถานะขึ้นไปทั้งต้น
const SearchContext = createContext(null);

export function SearchProvider({ children }) {
  const [query, setQuery] = useState("");

  return (
    <SearchContext.Provider value={{ query, setQuery }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
}
