"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { Filter, Package, Search, Trash2, X } from "lucide-react";

import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import { useToast } from "@/components/ui/toast";
import { NewProductDialog } from "@/components/manage/new-product-dialog";
import { ProductRowActions } from "@/components/manage/product-row-actions";
import { setProductsCategoryAction } from "@/app/manage/actions";
import { canManageProduct } from "@/lib/permissions";
import { formatBreakdown, productUnits } from "@/lib/stock";

// คอลัมน์ต้องตรงกันระหว่างหัวตารางกับแถว เลยแชร์คลาสเดียว
// จอกว้างเป็นตาราง 5 คอลัมน์ (รูป + 4 คอลัมน์เดิม) จอแคบยุบเหลือ 3 แล้วซ้อนเป็นการ์ด
const COLUMNS =
  "sm:grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1.5fr)_auto] sm:gap-4 sm:px-2";

// ค่าของ "ไม่มีหมวดหมู่" ใน Select — string ว่างใช้ไม่ได้ Base UI ถือว่ายังไม่ได้เลือก
const NO_CATEGORY = "none";

// ค่าพิเศษของตัวกรอง แยกจาก NO_CATEGORY เพราะ "ทุกหมวด" กับ "ไม่มีหมวด" คนละความหมาย
const ALL_CATEGORIES = "all";

// URL รูปพิมพ์มือได้ พังบ่อย เลยถอยกลับไปใช้ไอคอนแทนกรอบรูปเสียของเบราว์เซอร์
function Thumbnail({ product }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(product.imageUrl) && !failed;

  return (
    <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted transition-colors group-hover:border-foreground/25 sm:size-10">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
      ) : (
        <Package className="size-4 text-muted-foreground" />
      )}
    </div>
  );
}

function StockCell({ product }) {
  const units = productUnits(product);
  const smallestUnit = units.at(-1);

  if (product.qty <= 0) {
    return <Badge variant="destructive">หมด</Badge>;
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-medium tabular-nums">
        {product.qty} {smallestUnit?.name}
      </span>
      {units.length > 1 && (
        <span className="text-xs text-muted-foreground">
          {formatBreakdown(product.qty, units)}
        </span>
      )}
    </div>
  );
}

export function ProductsPanel({
  products,
  setProducts,
  unitTypes,
  setUnitTypes,
  categories = [],
  currentUser,
  onProductUpdated,
  onSkuCountChange,
  onProductDelete,
  deletingIds,
}) {
  const [query, setQuery] = useState("");
  // สินค้าที่ติ๊กไว้เพื่อทำอะไรพร้อมกันหลายตัว เก็บเป็น id ไม่ใช่ index เพราะรายการถูกกรองได้
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkCategory, setBulkCategory] = useState(NO_CATEGORY);
  const [filterCategory, setFilterCategory] = useState(ALL_CATEGORIES);
  const [applying, startApply] = useTransition();
  const { toast } = useToast();

  // การกรองหนักกว่าการอัปเดตช่องพิมพ์ ปล่อยให้ตัวอักษรขึ้นจอก่อนแล้วค่อยตามด้วยรายการ
  const deferredQuery = useDeferredValue(query);

  // ตัวกรองหมวดกับช่องค้นหาทำงานพร้อมกัน — เลือกหมวดแล้วยังพิมพ์ค้นในหมวดนั้นต่อได้
  const matches = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();

    return products.filter((product) => {
      if (filterCategory === NO_CATEGORY && product.categoryId !== null) return false;
      if (
        filterCategory !== ALL_CATEGORIES &&
        filterCategory !== NO_CATEGORY &&
        String(product.categoryId) !== filterCategory
      ) {
        return false;
      }
      if (!needle) return true;

      // ค้นได้ทั้งชื่อสินค้าและชื่อหมวดหมู่ — จำชื่อสินค้าไม่ได้ก็ยังไล่จากหมวดได้
      return (
        product.name.toLowerCase().includes(needle) ||
        (product.category?.name ?? "").toLowerCase().includes(needle)
      );
    });
  }, [products, deferredQuery, filterCategory]);

  const filterOptions = useMemo(
    () => [
      { value: ALL_CATEGORIES, label: "ทุกหมวดหมู่" },
      { value: NO_CATEGORY, label: "ไม่มีหมวดหมู่" },
      ...categories.map((category) => ({
        value: String(category.id),
        label: category.name,
      })),
    ],
    [categories]
  );
  const selectedFilter =
    filterOptions.find((option) => option.value === filterCategory) ?? filterOptions[0];

  // ติ๊กได้เฉพาะสินค้าที่ตัวเองแก้ได้ ฝั่ง server ก็ปฏิเสธทั้งชุดถ้ามีตัวที่ไม่ใช่ของเราปน
  const selectableMatches = useMemo(
    () => matches.filter((product) => canManageProduct(product, currentUser)),
    [matches, currentUser]
  );
  // "ไม่มีหมวดหมู่" เป็นตัวเลือกจริงตัวหนึ่ง เพราะใช้ถอดสินค้าออกจากหมวดได้ด้วย
  const bulkCategoryOptions = useMemo(
    () => [
      { value: NO_CATEGORY, label: "ไม่มีหมวดหมู่" },
      ...categories.map((category) => ({
        value: String(category.id),
        label: category.name,
      })),
    ],
    [categories]
  );
  const selectedBulkCategory =
    bulkCategoryOptions.find((option) => option.value === bulkCategory) ?? null;

  const selectedCount = selectedIds.size;
  const allVisibleSelected =
    selectableMatches.length > 0 &&
    selectableMatches.every((product) => selectedIds.has(product.id));

  function toggleOne(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        // ยกเลิกเฉพาะที่มองเห็นอยู่ ตัวที่ติ๊กไว้แล้วถูกกรองออกไปต้องไม่หลุด
        const next = new Set(prev);
        for (const product of selectableMatches) next.delete(product.id);
        return next;
      }
      return new Set([...prev, ...selectableMatches.map((product) => product.id)]);
    });
  }

  function applyCategory() {
    if (selectedCount === 0) return;

    const ids = [...selectedIds];
    const target = bulkCategory === NO_CATEGORY ? null : Number(bulkCategory);
    const label =
      categories.find((category) => category.id === target)?.name ?? "ไม่มีหมวดหมู่";

    startApply(async () => {
      const result = await setProductsCategoryAction(ids, target);
      if (!result.ok) {
        toast({
          variant: "destructive",
          title: "ย้ายหมวดหมู่ไม่สำเร็จ",
          description: result.error,
          duration: 0,
        });
        return;
      }

      const category = categories.find((item) => item.id === target) ?? null;
      setProducts((prev) =>
        prev.map((product) =>
          selectedIds.has(product.id)
            ? { ...product, categoryId: target, category }
            : product
        )
      );
      setSelectedIds(new Set());
      toast({
        variant: "success",
        title: `ย้าย ${result.count} สินค้าไปที่ “${label}” แล้ว`,
      });
    });
  }

  function handleCreated(product) {
    setProducts((prev) => [product, ...prev]);
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>สินค้า</CardTitle>
        <CardAction>
          <NewProductDialog
            unitTypes={unitTypes}
            setUnitTypes={setUnitTypes}
            onCreated={handleCreated}
          />
        </CardAction>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-12 text-center text-muted-foreground">
            <Package className="size-8" />
            <p className="text-sm">ยังไม่มีสินค้า กด &ldquo;เพิ่มสินค้า&rdquo; เพื่อเริ่มต้น</p>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            {/* icon เป็น flex item จริง ไม่ใช่ absolute ทับบน input เลยไม่มีทางชนข้อความ */}
            <div className="flex h-10 flex-1 items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 sm:h-9 dark:bg-input/30">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`ค้นหาใน ${products.length} สินค้า — ชื่อ หรือ หมวดหมู่`}
                aria-label="ค้นหาสินค้า"
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-base outline-none placeholder:text-muted-foreground md:text-sm"
              />
              {query && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setQuery("")}
                  aria-label="ล้างคำค้นหา"
                >
                  <X />
                </Button>
              )}
            </div>

            {/* กรองตามหมวด — combobox เพราะหมวดมีได้เยอะ ต้องพิมพ์ค้นได้ */}
            <Combobox
              items={filterOptions}
              value={selectedFilter}
              onValueChange={(option) =>
                setFilterCategory(option ? option.value : ALL_CATEGORIES)
              }
              itemToStringLabel={(option) => option?.label ?? ""}
              isItemEqualToValue={(a, b) => a?.value === b?.value}
              limit={50}
              autoHighlight
            >
              <ComboboxInputGroup className="w-full sm:w-56">
                <Filter className="size-4 shrink-0 text-muted-foreground" />
                <ComboboxInput placeholder="กรองตามหมวดหมู่" />
                <ComboboxTrigger />
              </ComboboxInputGroup>
              <ComboboxContent>
                <ComboboxEmpty>ไม่พบหมวดหมู่ที่ค้นหา</ComboboxEmpty>
                <ComboboxList>
                  {(option) => (
                    <ComboboxItem key={option.value} value={option}>
                      {option.label}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            </div>

            {/* แถบทำงานหมู่ — โผล่เมื่อติ๊กสินค้าไว้อย่างน้อยหนึ่งตัว */}
            {selectedCount > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/50 p-2">
                <Badge variant="secondary">เลือกไว้ {selectedCount}</Badge>

                {/* หมวดหมู่มีได้เยอะ ใช้ combobox ที่พิมพ์ค้นได้แทน dropdown ที่ต้องไล่เลื่อนหา */}
                <Combobox
                  items={bulkCategoryOptions}
                  value={selectedBulkCategory}
                  onValueChange={(option) =>
                    setBulkCategory(option ? option.value : NO_CATEGORY)
                  }
                  itemToStringLabel={(option) => option?.label ?? ""}
                  isItemEqualToValue={(a, b) => a?.value === b?.value}
                  limit={50}
                  autoHighlight
                  disabled={applying}
                >
                  <ComboboxInputGroup className="min-h-9 w-56">
                    <ComboboxInput placeholder="ค้นหาหมวดหมู่" />
                    <ComboboxTrigger />
                  </ComboboxInputGroup>
                  <ComboboxContent>
                    <ComboboxEmpty>ไม่พบหมวดหมู่ที่ค้นหา</ComboboxEmpty>
                    <ComboboxList>
                      {(option) => (
                        <ComboboxItem key={option.value} value={option}>
                          {option.label}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>

                <Button size="sm" onClick={applyCategory} disabled={applying}>
                  ย้ายไปหมวดนี้
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto"
                  onClick={() => setSelectedIds(new Set())}
                  disabled={applying}
                >
                  <X />
                  ล้างที่เลือก
                </Button>
              </div>
            )}

            {/* หัวตารางโผล่เฉพาะจอกว้าง จอแคบแถวจะซ้อนเป็นการ์ดแทน */}
            <div
              className={`hidden pb-2 text-sm font-medium text-muted-foreground sm:grid ${COLUMNS} sm:border-b sm:border-border`}
            >
              {/* ติ๊กทั้งหมด + ช่องว่างให้ตรงกับคอลัมน์ checkbox/รูปของแถวข้างล่าง */}
              <span className="flex w-16 items-center">
                <Checkbox
                  checked={allVisibleSelected}
                  indeterminate={selectedCount > 0 && !allVisibleSelected}
                  onCheckedChange={toggleAllVisible}
                  disabled={selectableMatches.length === 0}
                  aria-label="เลือกสินค้าทั้งหมดที่แสดงอยู่"
                />
              </span>
              <span>สินค้า</span>
              <span>ตัวเลือก</span>
              <span>คงเหลือ</span>
              <span className="text-right">จัดการ</span>
            </div>

            {matches.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {deferredQuery.trim()
                  ? `ไม่พบสินค้าที่ตรงกับ “${deferredQuery.trim()}”`
                  : `ไม่มีสินค้าในหมวด “${selectedFilter.label}”`}
              </p>
            )}

            {matches.map((product) => (
              <div
                key={product.id}
                className={`group grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1.5 border-b border-border py-3 transition-colors last:border-0 sm:items-center sm:rounded-lg sm:hover:bg-muted/60 ${COLUMNS}`}
              >
                {/* checkbox อยู่ในเซลล์เดียวกับรูป จะได้ไม่ต้องรื้อ grid ทั้งตาราง */}
                <div className="col-start-1 row-span-3 row-start-1 flex items-center gap-2 sm:row-span-1">
                  {canManageProduct(product, currentUser) ? (
                    <Checkbox
                      checked={selectedIds.has(product.id)}
                      onCheckedChange={() => toggleOne(product.id)}
                      aria-label={`เลือก ${product.name}`}
                    />
                  ) : (
                    <span className="size-4" aria-hidden="true" />
                  )}
                  {/* URL เปลี่ยนเมื่อไหร่ต้องได้ลองโหลดใหม่ ไม่ค้างสถานะรูปพังของอันเก่า */}
                  <Thumbnail key={product.imageUrl ?? "none"} product={product} />
                </div>

                <div className="col-start-2 row-start-1 flex min-w-0 flex-col">
                  <span className="truncate font-medium">{product.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {product.category?.name ?? "ไม่มีหมวดหมู่"}
                  </span>
                </div>

                {/* หน่วยย้ายไปอยู่ที่ระดับตัวเลือกแล้ว ตารางจึงบอกแค่ว่ามีกี่ตัวเลือก
                    รายละเอียดหน่วยของแต่ละตัวดูได้ในกล่องจัดการตัวเลือก */}
                <span className="col-start-2 row-start-2 flex flex-wrap items-center gap-1 sm:col-start-3 sm:row-start-1">
                  <Badge variant="secondary">
                    {product._count?.skus ?? 0} ตัวเลือก
                  </Badge>
                </span>

                <div className="col-start-2 row-start-3 sm:col-start-4 sm:row-start-1">
                  <StockCell product={product} />
                </div>

                <div className="col-start-3 row-span-3 row-start-1 justify-self-end sm:col-start-5 sm:row-span-1">
                  <ProductRowActions
                    product={product}
                    unitTypes={unitTypes}
                    currentUser={currentUser}
                    onUpdated={onProductUpdated}
                    onSkuCountChange={onSkuCountChange}
                    onDelete={onProductDelete}
                    deleting={deletingIds?.has(product.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

      </CardContent>
    </Card>
  );
}
