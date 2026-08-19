"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogIn, Package, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { SkuCard } from "@/components/product/sku-picker";
import { HistoryDialog } from "@/components/product/history-dialog";
import { NoteCard } from "@/components/product/note-card";
import {
  adjustSkuStockBatchAction,
  setProductCategoryAction,
} from "@/app/manage/actions";
import { allowedStockTypes, canManageProduct } from "@/lib/permissions";
import { skuUnits } from "@/lib/stock";

// ค่าของ "ไม่มีหมวดหมู่" ใน Select — ใช้ string ว่างไม่ได้ Base UI ถือว่าเป็นยังไม่ได้เลือก
const NO_CATEGORY = "none";

// หน่วยเริ่มต้นแบบ "ตามที่ตั้งไว้ของแต่ละตัวเลือก" (ค่าจาก DB) แยกจาก id หน่วยจริง
const AUTO_UNIT = "auto";

/**
 * หน่วยที่ควรถูกเลือกไว้ให้ตอนติ๊กตัวเลือกนี้
 *
 * ลำดับคือ หน่วยที่ผู้ใช้สลับไว้ชั่วคราวบนหน้านี้ → หน่วยเริ่มต้นที่เจ้าของตั้งไว้จากหน้าจัดการ
 * → หน่วยหลักของตัวเอง ตัวไหนใช้กับตัวเลือกนี้ไม่ได้ก็ข้ามไปตัวถัดไป ดีกว่าเลือกหน่วยที่
 * ใช้กับมันไม่ได้แล้วโดน server ตีกลับทั้งชุด
 */
function unitForSku(sku, preferred) {
  if (!sku) return "";
  const units = skuUnits(sku);
  const usable = (id) => id != null && units.some((unit) => String(unit.id) === String(id));

  if (preferred !== AUTO_UNIT && usable(preferred)) return preferred;
  if (usable(sku.defaultUnitTypeId)) return String(sku.defaultUnitTypeId);
  return String(sku.unitTypeId);
}

const TYPES = [
  { value: "IN", label: "รับเข้า" },
  { value: "OUT", label: "ตัดออก" },
  { value: "ADJUSTMENT", label: "ตั้งยอดใหม่" },
];

export function ProductDetail({ product: initialProduct, categories = [], currentUser }) {
  const [product, setProduct] = useState(initialProduct);
  // drafts: skuId -> { amount, unitTypeId } — มีคีย์อยู่ = ถูกติ๊กเลือกไว้
  const [drafts, setDrafts] = useState({});
  const [type, setType] = useState("OUT");
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  // หน่วยที่จะถูกเลือกให้อัตโนมัติเวลาติ๊กตัวเลือกใหม่ — AUTO = ใช้หน่วยหลักของแต่ละตัว
  const [defaultUnit, setDefaultUnit] = useState(AUTO_UNIT);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [savingCategory, startCategory] = useTransition();
  const { toast } = useToast();

  const isOwner = canManageProduct(product, currentUser);

  /**
   * ถอยกลับหน้าที่มาจริง ๆ ไม่ใช่เด้งกลับหน้าแรกเสมอ
   *
   * เดิมลิงก์ไป "/" ตายตัว มาจากหน้าจัดการก็โดนพากลับหน้าแรก แล้วยังต้องโหลดหน้านั้นใหม่
   * ทั้งที่ browser back คืนหน้าเดิมพร้อมตำแหน่งเลื่อนจอให้ได้เลย
   *
   * เปิดลิงก์ตรงมาจากข้างนอกจะไม่มีประวัติให้ถอย เลยส่งไปหน้าแรกแทนไม่ให้ปุ่มด้าน
   */
  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  /** หมายเหตุถูกแก้จากกล่องของมันเอง — action คืนเฉพาะฟิลด์หมายเหตุกลับมาให้ทับ */
  function handleNoteSaved(patch) {
    setProduct((prev) => ({ ...prev, ...patch }));
  }

  // เหตุผลเดียวกับหน่วยใน SkuCard — ไม่ส่ง items ปุ่มจะโชว์ id ของหมวดแทนชื่อ
  const categoryItems = useMemo(
    () => ({
      [NO_CATEGORY]: "ไม่มีหมวดหมู่",
      ...Object.fromEntries(categories.map((c) => [String(c.id), c.name])),
    }),
    [categories]
  );

  function handleCategoryChange(value) {
    const categoryId = value === NO_CATEGORY ? null : Number(value);
    const previous = product;

    // ทับหน้าจอทันที ไม่ต้องรอ server — พลาดค่อยย้อนกลับ
    setProduct((prev) => ({
      ...prev,
      categoryId,
      category: categoryId
        ? (categories.find((item) => item.id === categoryId) ?? null)
        : null,
    }));

    startCategory(async () => {
      const result = await setProductCategoryAction(product.id, categoryId);
      if (!result.ok) {
        setProduct(previous);
        toast({
          variant: "destructive",
          title: "เปลี่ยนหมวดหมู่ไม่สำเร็จ",
          description: result.error,
          duration: 0,
        });
      }
    });
  }

  // ห่อ useMemo ไว้ ไม่งั้น ?? [] สร้าง array ใหม่ทุก render แล้ว useMemo ที่กรองด้านล่างพังหมด
  // สินค้าทุกตัวมีอย่างน้อยหนึ่งตัวเลือกเสมอ (บังคับตั้งแต่ตอนสร้าง) เลยไม่ต้องมีทางสำรอง
  const skus = useMemo(() => product.skus ?? [], [product.skus]);

  const availableTypes = useMemo(() => {
    const allowed = allowedStockTypes(product, currentUser);
    return TYPES.filter((option) => allowed.includes(option.value));
  }, [product, currentUser]);

  const filteredSkus = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return skus;
    return skus.filter((sku) => sku.name.toLowerCase().includes(q));
  }, [skus, query]);

  const selectedIds = Object.keys(drafts).map(Number);
  const selectedCount = selectedIds.length;

  // หน่วยทั้งหมดที่ตัวเลือกใด ๆ ในสินค้านี้ใช้ได้ — รวมจากทุก SKU แล้วตัดซ้ำ
  const unitChoices = useMemo(() => {
    const seen = new Map();
    for (const sku of skus) {
      for (const unit of skuUnits(sku)) {
        if (!seen.has(unit.id)) seen.set(unit.id, unit);
      }
    }
    return [...seen.values()].sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name));
  }, [skus]);

  // เหตุผลเดียวกับ categoryItems — Base UI ต้องได้ map value -> label ถึงจะโชว์ชื่อที่เลือก
  const defaultUnitItems = useMemo(
    () => ({
      [AUTO_UNIT]: "ตามที่ตั้งไว้ของแต่ละตัว",
      ...Object.fromEntries(
        unitChoices.map((unit) => [String(unit.id), `${unit.name} (×${unit.qty})`])
      ),
    }),
    [unitChoices]
  );

  // toggle กับ changeDraft ถูกส่งเข้า SkuCard ที่ห่อ memo ไว้ ต้องคงตัวเดิมข้าม render
  // ไม่งั้น prop เปลี่ยนทุกครั้ง memo ก็ไม่ช่วยอะไร แล้วการพิมพ์ในช่องเดียวจะลาก
  // การ์ดทั้งหน้า (มีได้เป็นสิบ ๆ ใบ พร้อมรูปและ Select ของตัวเอง) มา re-render ด้วยทั้งหมด
  const toggle = useCallback(
    (skuId) => {
      setDrafts((prev) => {
        const next = { ...prev };
        if (next[skuId]) {
          delete next[skuId];
          return next;
        }
        next[skuId] = {
          amount: "",
          // เลือกหน่วยให้เลย ผู้ใช้จะได้กรอกแค่ตัวเลขในกรณีปกติ
          unitTypeId: unitForSku(
            skus.find((item) => item.id === skuId),
            defaultUnit
          ),
        };
        return next;
      });
    },
    [skus, defaultUnit]
  );

  const changeDraft = useCallback((skuId, patch) => {
    setDrafts((prev) => ({ ...prev, [skuId]: { ...prev[skuId], ...patch } }));
  }, []);

  function selectAllVisible() {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const sku of filteredSkus) {
        if (!next[sku.id]) {
          next[sku.id] = { amount: "", unitTypeId: unitForSku(sku, defaultUnit) };
        }
      }
      return next;
    });
  }

  /**
   * เปลี่ยนหน่วยของตัวที่ติ๊กไว้แล้วทั้งหมดให้เป็นหน่วยเริ่มต้น
   *
   * แยกเป็นปุ่มแทนที่จะให้เปลี่ยน default แล้วไล่ทับให้เองอัตโนมัติ เพราะบางตัวผู้ใช้
   * ตั้งใจเลือกหน่วยเฉพาะของมันไว้ ทับทิ้งเงียบ ๆ แล้วบันทึกไปจะยิ่งผิดหนักกว่าเดิม
   */
  function applyDefaultToSelected() {
    setDrafts((prev) => {
      const next = {};
      for (const [skuId, draft] of Object.entries(prev)) {
        const sku = skus.find((item) => item.id === Number(skuId));
        next[skuId] = { ...draft, unitTypeId: unitForSku(sku, defaultUnit) };
      }
      return next;
    });
  }

  function clearAll() {
    setDrafts({});
  }

  // แถวที่ติ๊กแล้วแต่ยังไม่กรอกจำนวน ถือว่ายังไม่พร้อมบันทึก
  const entries = selectedIds
    .map((skuId) => {
      const draft = drafts[skuId];
      const amount = Number(draft?.amount);
      if (draft?.amount === "" || !Number.isInteger(amount) || amount < 0) return null;
      if (type !== "ADJUSTMENT" && amount === 0) return null;
      return { skuId, unitTypeId: Number(draft.unitTypeId), amount, type };
    })
    .filter(Boolean);

  const ready = entries.length > 0 && entries.length === selectedCount;

  function handleSave() {
    if (!ready || !currentUser) return;

    const typeLabel = TYPES.find((option) => option.value === type)?.label ?? "บันทึก";
    const count = entries.length;

    startTransition(async () => {
      const result = await adjustSkuStockBatchAction(
        product.id,
        entries,
        note.trim() || null
      );

      if (!result.ok) {
        toast({
          variant: "destructive",
          title: `${typeLabel}ไม่สำเร็จ`,
          description: result.error,
          duration: 0,
        });
        return;
      }

      // action ส่งกลับเฉพาะยอดที่เปลี่ยน แปะทับตัวเลขลงของเดิมที่ถืออยู่
      // (ชื่อ/รูป/หน่วยไม่ได้ถูกแตะในรายการปรับสต็อก เลยไม่ต้องดึงกลับมาใหม่ทั้งก้อน)
      setProduct((prev) => ({
        ...prev,
        qty: result.productQty,
        skus: prev.skus.map((sku) =>
          sku.id in result.skuQty ? { ...sku, qty: result.skuQty[sku.id] } : sku
        ),
      }));
      clearAll();
      setNote("");
      toast({
        variant: "success",
        title: `${typeLabel}แล้ว ${count} ตัวเลือก`,
        description: product.name,
      });
    });
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-32 sm:px-6">
      <Button variant="ghost" size="sm" className="mt-4 -ml-2 w-fit" onClick={goBack}>
        <ArrowLeft />
        ย้อนกลับ
      </Button>

      {/* หัวสินค้า */}
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-2xl bg-muted sm:size-44">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <Package className="size-10 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* เจ้าของจัดหมวดได้ตรงนี้เลย คนอื่นเห็นเป็นป้ายเฉย ๆ */}
            {isOwner ? (
              <Select
                items={categoryItems}
                value={product.categoryId ? String(product.categoryId) : NO_CATEGORY}
                onValueChange={handleCategoryChange}
                disabled={savingCategory}
              >
                <SelectTrigger size="sm" className="w-auto min-w-40">
                  <SelectValue placeholder="เลือกหมวดหมู่" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY}>ไม่มีหมวดหมู่</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : product.category ? (
              <Badge variant="secondary">{product.category.name}</Badge>
            ) : (
              <Badge variant="outline">ไม่มีหมวดหมู่</Badge>
            )}
            <Badge variant="outline">{skus.length} ตัวเลือก</Badge>
          </div>

          <h1 className="text-lg leading-snug font-semibold sm:text-xl">{product.name}</h1>

          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm text-muted-foreground">คงเหลือรวม</span>
            <span className="text-2xl font-semibold tabular-nums">{product.qty}</span>
            {/* ยอดรวมเก็บเป็นหน่วยย่อยที่สุด ซึ่งคือหน่วยหลักของตัวเลือก (ทุกตัวเป็น ×1) */}
            <span className="text-sm text-muted-foreground">
              {skus[0]?.baseUnit?.name ?? "หน่วย"}
            </span>
          </div>

          {product.owner && (
            <p className="text-xs text-muted-foreground">
              เจ้าของ: {product.owner.name || product.owner.email}
            </p>
          )}

          {/* ประวัติเปิดให้เฉพาะคนที่ล็อกอิน เพราะมีชื่อผู้ทำรายการติดอยู่ด้วย */}
          {currentUser && (
            <div className="mt-1">
              <HistoryDialog product={product} />
            </div>
          )}
        </div>
      </div>

      {/* ของอยู่ตรงไหน/ย้ายไปไหนแล้ว — วางไว้ก่อนแถบปรับสต็อก เพราะคนที่เข้ามาหยิบของ
          ต้องเห็นก่อนที่จะไปกดตัดสต็อก */}
      <NoteCard product={product} currentUser={currentUser} onSaved={handleNoteSaved} />

      {!currentUser ? (
        <div className="mt-8 flex flex-col items-start gap-3 rounded-xl border border-dashed p-6">
          <p className="text-sm text-muted-foreground">
            ต้องเข้าสู่ระบบก่อนถึงจะปรับสต็อกได้
          </p>
          <Button nativeButton={false} render={<Link href="/login" />}>
            <LogIn />
            เข้าสู่ระบบ
          </Button>
        </div>
      ) : (
        <>
          {/* แถบเลือกชนิดรายการ + ค้นหา */}
          <div className="mt-8 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">เลือกตัวเลือกที่จะปรับสต็อก</h2>
              <div className="flex gap-1.5">
                {availableTypes.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    className="h-9 sm:h-8"
                    variant={type === option.value ? "default" : "outline"}
                    aria-pressed={type === option.value}
                    disabled={isPending}
                    onClick={() => setType(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {!isOwner && (
              <p className="text-xs text-muted-foreground">
                ตั้งยอดใหม่ได้เฉพาะเจ้าของสินค้า
              </p>
            )}

            {/* มีตัวเลือกได้ถึงหลักสิบ ช่องค้นหาเลยจำเป็นเมื่อรายการยาว */}
            {skus.length > 8 && (
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={`ค้นหาในตัวเลือกทั้ง ${skus.length} รายการ`}
                  className="pl-9"
                />
              </div>
            )}

            {/* สลับหน่วยชั่วคราวเฉพาะรอบนี้ — ค่าตั้งต้นจริงมาจากหน่วยเริ่มต้นที่เจ้าของตั้งไว้
                ในหน้าจัดการ ตรงนี้ไว้ให้คนที่ตัดสต็อกเป็นลัง/แพ็คทั้งวันไม่ต้องเปลี่ยนทีละใบ
                (เผลอลืมเปลี่ยนแล้วยอดหายเป็นเท่าตัว) ขึ้นเฉพาะตอนมีหน่วยให้เลือกจริง ๆ */}
            {unitChoices.length > 1 && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed p-2.5">
                <Label htmlFor="default-unit" className="text-xs font-medium">
                  สลับหน่วย
                </Label>
                <Select
                  items={defaultUnitItems}
                  value={defaultUnit}
                  onValueChange={setDefaultUnit}
                  disabled={isPending}
                >
                  <SelectTrigger id="default-unit" size="sm" className="w-auto min-w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AUTO_UNIT}>ตามที่ตั้งไว้ของแต่ละตัว</SelectItem>
                    {unitChoices.map((unit) => (
                      <SelectItem key={unit.id} value={String(unit.id)}>
                        {unit.name} (×{unit.qty})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedCount > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 sm:h-8"
                    disabled={isPending}
                    onClick={applyDefaultToSelected}
                  >
                    ใช้กับที่เลือกไว้ {selectedCount} ตัว
                  </Button>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <button
                type="button"
                className="font-medium text-foreground underline-offset-2 hover:underline"
                onClick={selectAllVisible}
                disabled={isPending}
              >
                เลือกทั้งหมด{query ? " (ที่ค้นเจอ)" : ""}
              </button>
              {selectedCount > 0 && (
                <>
                  <span>·</span>
                  <button
                    type="button"
                    className="font-medium text-foreground underline-offset-2 hover:underline"
                    onClick={clearAll}
                    disabled={isPending}
                  >
                    ล้างที่เลือก
                  </button>
                </>
              )}
            </div>
          </div>

          {/* รายการตัวเลือก */}
          {filteredSkus.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
              ไม่พบตัวเลือกที่ตรงกับคำค้นหา
            </p>
          ) : (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSkus.map((sku) => (
                <SkuCard
                  key={sku.id}
                  sku={sku}
                  type={type}
                  selected={Boolean(drafts[sku.id])}
                  draft={drafts[sku.id]}
                  disabled={isPending}
                  onToggle={toggle}
                  onDraftChange={changeDraft}
                />
              ))}
            </div>
          )}

          {/* แถบบันทึกลอยอยู่ล่างจอ — เลือกอยู่ตรงไหนของหน้าก็กดบันทึกได้เลย
              ไม่ต้องเลื่อนกลับขึ้นไปหาปุ่ม */}
          {selectedCount > 0 && (
            <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur">
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-4 py-3 sm:px-6">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">เลือกไว้ {selectedCount}</Badge>
                  {entries.length < selectedCount && (
                    <span className="text-xs text-destructive">
                      ยังไม่ได้กรอกจำนวนอีก {selectedCount - entries.length} รายการ
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="ml-auto"
                    aria-label="ล้างที่เลือก"
                    onClick={clearAll}
                    disabled={isPending}
                  >
                    <X />
                  </Button>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="batch-note" className="sr-only">
                      หมายเหตุ
                    </Label>
                    <Textarea
                      id="batch-note"
                      rows={1}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="หมายเหตุ (ไม่บังคับ)"
                      className="min-h-9 resize-none"
                      disabled={isPending}
                    />
                  </div>
                  <Button onClick={handleSave} disabled={!ready || isPending} className="shrink-0">
                    บันทึกทั้งหมด
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
