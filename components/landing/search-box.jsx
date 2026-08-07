"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

import { siteConfig } from "@/lib/site-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSearch } from "@/components/landing/search-context";

/**
 * ช่องค้นหาสินค้าใน navbar
 * จอ sm ขึ้นไปโชว์ช่องกรอกเต็ม ๆ ส่วนมือถือยุบเหลือแค่ไอคอน แล้วกดแล้วค่อยกางทับแถบ navbar
 * เพราะพื้นที่บนมือถือมีแค่พอให้โลโก้ เมนู กับปุ่มผู้ใช้อยู่แล้ว
 */
export function SearchBox() {
  const { query, setQuery } = useSearch();
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);

  // กางแล้วโฟกัสให้เลย ไม่ต้องให้ผู้ใช้แตะสองครั้ง
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // ปิดแล้วล้างคำค้นด้วย ไม่งั้นรายการจะยังโดนกรองค้างอยู่ทั้งที่มองไม่เห็นช่องค้นหาแล้ว
  function close() {
    setIsOpen(false);
    setQuery("");
  }

  return (
    <>
      <div className="relative hidden sm:block">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={siteConfig.hero.searchPlaceholder}
          aria-label="ค้นหาสินค้า"
          className="h-9 w-44 pl-8 md:w-64"
        />
      </div>

      <Button
        size="icon-sm"
        variant="ghost"
        onClick={() => setIsOpen(true)}
        aria-label="ค้นหาสินค้า"
        aria-expanded={isOpen}
        className="sm:hidden"
      >
        <Search />
      </Button>

      {isOpen && (
        // ทับทั้งแถบไปเลย จะได้มีที่ให้พิมพ์เต็มความกว้าง — ตัวแม่ใน navbar เป็น relative อยู่
        <div className="absolute inset-0 z-10 flex items-center gap-1 bg-background px-4 sm:hidden">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") close();
              }}
              placeholder={siteConfig.hero.searchPlaceholder}
              aria-label="ค้นหาสินค้า"
              className="h-9 pl-8"
            />
          </div>
          <Button size="icon-sm" variant="ghost" onClick={close} aria-label="ปิดการค้นหา">
            <X />
          </Button>
        </div>
      )}
    </>
  );
}
