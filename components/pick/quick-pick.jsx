"use client";

import { useEffect, useState, useTransition } from "react";
import { Package, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { searchSkusAction } from "@/app/manage/actions";
import { useCart } from "@/lib/use-cart";
import { thumbnailUrl } from "@/lib/images";

const ALL = "all";

// พิมพ์แล้วรอให้หยุดพิมพ์ก่อนค่อยยิงค้น ไม่งั้นกดทีละตัวอักษรก็ยิงทีละครั้ง
const DEBOUNCE_MS = 250;

/** หน่วยที่ควรถูกเลือกให้ — หน่วยเริ่มต้นที่ตั้งไว้ก่อน ไม่มีค่อยใช้หน่วยแรก (ใหญ่สุด) */
function initialUnit(sku) {
  const preferred = sku.units.find((unit) => unit.id === sku.defaultUnitTypeId);
  return preferred ?? sku.units.at(-1) ?? null;
}

/**
 * หน้าเบิกเร็ว — ค้นหาตัวเลือกข้ามทุกสินค้า ใส่จำนวน กด Enter แล้วพิมพ์ตัวถัดไปได้ทันที
 *
 * ทุกอย่างลงตะกร้าเดียวกับที่หน้าสินค้าใช้ (lib/use-cart.js) แล้วค่อยกดบันทึกทีเดียว
 * ที่แถบตะกร้าด้านล่าง — หน้านี้จึงเป็นแค่ทางลัดในการหยิบของใส่ตะกร้าให้เร็วที่สุด
 */
export function QuickPick({ categories = [] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);
  const [results, setResults] = useState([]);
  const [drafts, setDrafts] = useState({}); // skuId -> { amount, unitTypeId }
  const [searching, startSearch] = useTransition();
  const { addMany } = useCart();
  const { toast } = useToast();

  const term = query.trim();
  // คำค้นสั้นเกินไป = ไม่ต้องโชว์ผลเก่าค้างไว้ คิดตอน render เอา ไม่ต้องล้าง state ใน effect
  const visible = term.length < 2 ? [] : results;

  useEffect(() => {
    if (term.length < 2) return;

    const timer = setTimeout(() => {
      startSearch(async () => {
        const result = await searchSkusAction(term, category === ALL ? null : Number(category));
        if (!result.ok) {
          toast({ variant: "destructive", title: "ค้นหาไม่สำเร็จ", description: result.error });
          return;
        }
        setResults(result.skus);
        // เลือกหน่วยให้ล่วงหน้าทุกแถว ผู้ใช้จะได้กรอกแค่ตัวเลข
        setDrafts((prev) => {
          const next = { ...prev };
          for (const sku of result.skus) {
            if (!next[sku.id]) {
              next[sku.id] = { amount: "", unitTypeId: String(initialUnit(sku)?.id ?? "") };
            }
          }
          return next;
        });
      });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [term, category, toast]);

  function addToCart(sku) {
    const draft = drafts[sku.id];
    const amount = Number(draft?.amount);
    if (!Number.isInteger(amount) || amount <= 0) return;

    const unit = sku.units.find((item) => String(item.id) === draft.unitTypeId);
    if (!unit) return;

    addMany([
      {
        skuId: sku.id,
        productId: sku.product.id,
        productName: sku.product.name,
        skuName: sku.name,
        imageUrl: sku.imageUrl,
        unitTypeId: unit.id,
        unitName: unit.name,
        unitQty: unit.qty,
        units: sku.units,
        amount,
        skuQty: sku.qty,
      },
    ]);

    // ล้างเฉพาะช่องจำนวน (กันกดซ้ำแล้วได้สองเด้ง) — คำค้นกับผลลัพธ์คงไว้
    // คนหยิบของมักเบิกหลายตัวเลือกจากคำค้นเดียวกัน ล้างทิ้งทุกครั้งคือให้พิมพ์ใหม่ฟรี ๆ
    setDrafts((prev) => ({ ...prev, [sku.id]: { ...prev[sku.id], amount: "" } }));
    toast({ variant: "success", title: `ใส่ตะกร้า ${sku.name} ${amount} ${unit.name}` });
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 pb-32 sm:px-6">
      <div className="sticky top-14 z-20 flex flex-col gap-2 bg-background pt-4 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="พิมพ์ชื่อสินค้า ชื่อตัวเลือก หรือรหัส"
            aria-label="ค้นหาของที่จะเบิก"
            enterKeyHint="search"
            className="h-11 pr-9 pl-8"
          />
          {searching && (
            <Spinner className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground" />
          )}
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              className="h-8"
              variant={category === ALL ? "default" : "outline"}
              onClick={() => setCategory(ALL)}
            >
              ทุกหมวด
            </Button>
            {categories.map((item) => (
              <Button
                key={item.id}
                size="sm"
                className="h-8"
                variant={category === String(item.id) ? "default" : "outline"}
                onClick={() => setCategory(String(item.id))}
              >
                {item.name}
              </Button>
            ))}
          </div>
        )}
      </div>

      {term.length < 2 ? (
        <p className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          พิมพ์อย่างน้อย 2 ตัวอักษรเพื่อค้นหา
        </p>
      ) : visible.length === 0 && !searching ? (
        <p className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          ไม่พบของที่ตรงกับ &ldquo;{term}&rdquo;
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((sku) => {
            const draft = drafts[sku.id] ?? { amount: "", unitTypeId: "" };
            const unit = sku.units.find((item) => String(item.id) === draft.unitTypeId);
            const amount = Number(draft.amount);
            const valid = Number.isInteger(amount) && amount > 0;
            const exceeds = valid && amount * (unit?.qty ?? 1) > sku.qty;

            return (
              <li
                key={sku.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-2"
              >
                <div className="size-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {sku.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbnailUrl(sku.imageUrl)}
                      alt={sku.name}
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <Package className="size-4 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 basis-40 flex-col">
                  <span className="truncate text-sm font-medium">{sku.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {sku.product.name}
                  </span>
                  <div className="flex flex-wrap items-center gap-1">
                    {sku.code && (
                      <Badge variant="outline" className="font-mono text-[0.65rem]">
                        {sku.code}
                      </Badge>
                    )}
                    <span className="text-[0.7rem] text-muted-foreground">
                      คงเหลือ {sku.qty} {sku.units.at(-1)?.name ?? ""}
                    </span>
                  </div>
                </div>

                <Input
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  placeholder="จำนวน"
                  aria-label={`จำนวนของ ${sku.name}`}
                  aria-invalid={exceeds}
                  className="h-10 w-24"
                  value={draft.amount}
                  onChange={(event) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [sku.id]: { ...prev[sku.id], amount: event.target.value },
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    addToCart(sku);
                  }}
                />

                <Select
                  items={Object.fromEntries(
                    sku.units.map((item) => [String(item.id), `${item.name} (×${item.qty})`])
                  )}
                  value={draft.unitTypeId}
                  disabled={sku.units.length <= 1}
                  onValueChange={(value) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [sku.id]: { ...prev[sku.id], unitTypeId: value },
                    }))
                  }
                >
                  <SelectTrigger className="h-10 w-[7.5rem] shrink-0">
                    <SelectValue placeholder="หน่วย" />
                  </SelectTrigger>
                  <SelectContent>
                    {sku.units.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.name} (×{item.qty})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  className="h-10 shrink-0"
                  disabled={!valid}
                  onClick={() => addToCart(sku)}
                >
                  <Plus />
                  ใส่ตะกร้า
                </Button>

                {exceeds && (
                  <p className="w-full text-[0.7rem] font-medium text-destructive">
                    เกินยอดที่มี — ตัดออกได้สูงสุด {Math.floor(sku.qty / (unit?.qty ?? 1))}{" "}
                    {unit?.name}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
