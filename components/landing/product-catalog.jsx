"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PackageX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/landing/product-card";
import { useSearch } from "@/components/landing/search-context";
import { useUrlState } from "@/lib/use-url-state";

// ค่าพิเศษของแถบกรอง แยกจาก id หมวดจริงที่เป็นตัวเลข
const ALL = "all";
const UNCATEGORIZED = "none";

// วาดทีละชุด สินค้ามีหลายร้อยรายการ ถ้าวาดหมดในรอบเดียวหน้าจะหนืดตั้งแต่โหลด
const PAGE_SIZE = 60;

export function ProductCatalog({ products, categories = [] }) {
  // ช่องกรอกย้ายไปอยู่ที่ navbar แล้ว ที่นี่เหลือแค่อ่านคำค้นมากรอง
  const { query, index } = useSearch();
  // การปรับสต็อกย้ายไปทำที่หน้าสินค้าแล้ว ที่นี่จึงไม่ต้องถือสำเนารายการไว้แก้เอง
  const productList = products;
  // อยู่ใน URL ไม่ใช่ useState เพื่อให้เข้าหน้าสินค้าแล้วย้อนกลับมาแล้วหมวดที่เลือกยังอยู่
  // ค่าที่ได้เป็น string เสมอ (มาจาก query string) เวลาเทียบกับ category.id ต้องแปลงให้ตรงชนิด
  const [activeCategory, setActiveCategory] = useUrlState("cat", ALL);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef(null);

  // การกรองหนักกว่าการอัปเดตช่องพิมพ์มาก — ปล่อยให้ตัวอักษรขึ้นจอก่อน
  // แล้วค่อยตามด้วยรายการที่กรองแล้ว ช่องค้นหาจะได้ไม่หนืดตอนพิมพ์รัว
  const deferredQuery = useDeferredValue(query);

  // โชว์เฉพาะหมวดที่มีสินค้าอยู่จริง หมวดว่างเปล่าไม่ต้องรกแถบกรอง
  const usedCategories = useMemo(() => {
    const counts = new Map();
    for (const product of productList) {
      if (product.categoryId) {
        counts.set(product.categoryId, (counts.get(product.categoryId) ?? 0) + 1);
      }
    }
    return categories.filter((category) => counts.has(category.id));
  }, [categories, productList]);

  const hasUncategorized = useMemo(
    () => productList.some((product) => !product.categoryId),
    [productList]
  );

  // ใช้ชื่อพิมพ์เล็กที่ทำไว้ล่วงหน้าใน SearchProvider แทนการ toLowerCase() ใหม่ทุกครั้ง
  const lowerByName = useMemo(() => {
    const map = new Map();
    for (const entry of index) map.set(entry.product.id, entry.lower);
    return map;
  }, [index]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    return productList.filter((product) => {
      if (normalizedQuery) {
        const lower = lowerByName.get(product.id) ?? product.name.toLowerCase();
        if (!lower.includes(normalizedQuery)) return false;
      }
      if (activeCategory === ALL) return true;
      if (activeCategory === UNCATEGORIZED) return !product.categoryId;
      return product.categoryId === Number(activeCategory);
    });
  }, [productList, deferredQuery, activeCategory, lowerByName]);

  // เปลี่ยนคำค้น/หมวดแล้วต้องเริ่มนับใหม่ ไม่งั้นผลลัพธ์ชุดใหม่จะโผล่มาทีเดียวหมด
  //
  // รีเซ็ตระหว่าง render ไม่ใช่ใน useEffect — ทำใน effect จะวาดรอบหนึ่งด้วยค่าเก่าก่อน
  // แล้วค่อยวาดใหม่อีกรอบ (เห็นการ์ดกระพริบ) นี่คือแพตเทิร์นที่ React แนะนำ
  // สำหรับรีเซ็ต state ตาม input ที่เปลี่ยน
  const filterKey = `${deferredQuery} ${activeCategory}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setVisibleCount(PAGE_SIZE);
  }

  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

  // เลื่อนถึงท้ายรายการแล้วค่อยวาดชุดถัดไป — ผู้ใช้ไม่ต้องกดปุ่มเอง
  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => prev + PAGE_SIZE);
        }
      },
      // เริ่มโหลดก่อนถึงจริงหน่อย จะได้ไม่เห็นรอยสะดุด
      { rootMargin: "600px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, visibleCount]);

  return (
    <section id="products" className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      {/* แถบกรองหมวดหมู่ — ขึ้นเฉพาะตอนมีหมวดให้เลือกจริง */}
      {(usedCategories.length > 0 || hasUncategorized) && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          <Button
            size="sm"
            className="h-8"
            variant={activeCategory === ALL ? "default" : "outline"}
            aria-pressed={activeCategory === ALL}
            onClick={() => setActiveCategory(ALL)}
          >
            ทั้งหมด
          </Button>
          {usedCategories.map((category) => (
            <Button
              key={category.id}
              size="sm"
              className="h-8"
              variant={activeCategory === String(category.id) ? "default" : "outline"}
              aria-pressed={activeCategory === String(category.id)}
              onClick={() => setActiveCategory(String(category.id))}
            >
              {category.name}
            </Button>
          ))}
          {hasUncategorized && (
            <Button
              size="sm"
              className="h-8"
              variant={activeCategory === UNCATEGORIZED ? "default" : "outline"}
              aria-pressed={activeCategory === UNCATEGORIZED}
              onClick={() => setActiveCategory(UNCATEGORIZED)}
            >
              ไม่มีหมวดหมู่
            </Button>
          )}
        </div>
      )}

      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-20 text-center text-muted-foreground">
          <PackageX className="size-8" />
          <p className="text-sm">
            {productList.length === 0
              ? "ยังไม่มีสินค้าในระบบ — กลับมาดูใหม่อีกครั้ง"
              : "ไม่พบสินค้าที่ตรงกับคำค้นหา"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {/* ทุกใบเข้าหน้าสินค้าเหมือนกันหมด สินค้าที่ยังไม่มีตัวเลือกย่อยจะถูกมองเป็น
              ตัวเลือกเดียวที่หน้านั้น ผู้ใช้เลยไม่เจอสองพฤติกรรมที่ต่างกันโดยไม่รู้ตัว */}
          {visibleProducts.map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.id}`}
              className="rounded-xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-label={`ดู ${product.name}`}
            >
              <ProductCard product={product} />
            </Link>
          ))}
        </div>
      )}

      {/* จุดสังเกตท้ายรายการ — เลื่อนมาถึงเมื่อไหร่ค่อยวาดชุดถัดไป */}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          <span className="text-xs text-muted-foreground">
            กำลังโหลดเพิ่ม… ({visibleProducts.length}/{filteredProducts.length})
          </span>
        </div>
      )}
    </section>
  );
}
