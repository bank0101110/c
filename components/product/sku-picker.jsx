"use client";

import { memo, useMemo } from "react";
import { Check, Package } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatBreakdown, skuUnits } from "@/lib/stock";
import { thumbnailUrl } from "@/lib/images";

/**
 * การ์ดตัวเลือกย่อยหนึ่งใบ — กดที่ตัวการ์ดเพื่อติ๊ก/ยกเลิก
 *
 * ช่องกรอกจำนวนกับหน่วยโผล่เฉพาะตอนติ๊กแล้ว เพื่อไม่ให้หน้าจอรกตอนมีตัวเลือกเป็นสิบ ๆ ตัว
 * และกันกรอกเลขทิ้งไว้ในตัวที่ไม่ได้เลือกแล้วงงว่าทำไมไม่ถูกบันทึก
 */
export const SkuCard = memo(function SkuCard({
  sku,
  selected,
  draft,
  disabled,
  type,
  onToggle,
  onDraftChange,
}) {
  // skuUnits() คัดซ้ำแล้วเรียงใหม่ทุกครั้ง ต้อง memo ไว้ ไม่งั้นได้ array ใหม่ทุก render
  // แล้ว useMemo ของ unitItems ที่พึ่ง units เป็น dep ก็คำนวณใหม่ตามไปด้วยทุกครั้ง
  const units = useMemo(() => skuUnits(sku), [sku]);
  // Select ของ Base UI ต้องได้แผนที่ value -> label ถึงจะโชว์ชื่อหน่วยที่เลือกได้
  // ไม่ส่งมาให้ ปุ่มจะโชว์ค่าดิบซึ่งคือ id ของหน่วย (เช่น "63") แทนที่จะเป็น "ชิ้น (×1)"
  const unitItems = useMemo(
    () =>
      Object.fromEntries(units.map((unit) => [String(unit.id), `${unit.name} (×${unit.qty})`])),
    [units]
  );
  const selectedUnit = units.find((unit) => String(unit.id) === draft?.unitTypeId);
  const factor = selectedUnit?.qty ?? 1;
  const smallest = units.at(-1);

  const amount = draft?.amount ?? "";
  const parsed = Number(amount);
  const hasAmount = amount !== "" && Number.isInteger(parsed) && parsed >= 0;
  const exceeds = type === "OUT" && hasAmount && parsed * factor > sku.qty;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border p-2.5 transition-all",
        selected
          ? "border-primary bg-primary/5 ring-2 ring-primary/30"
          : "border-border hover:border-foreground/30 hover:bg-muted/40"
      )}
    >
      <button
        type="button"
        onClick={() => onToggle(sku.id)}
        disabled={disabled}
        aria-pressed={selected}
        className="flex items-center gap-2.5 text-left outline-none disabled:opacity-60"
      >
        <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
          {sku.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl(sku.imageUrl)}
              alt={sku.name}
              loading="lazy"
              decoding="async"
              width={96}
              height={96}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <Package className="size-4 text-muted-foreground" />
            </div>
          )}
          {selected && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/75">
              <Check className="size-5 text-primary-foreground" />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="line-clamp-2 text-xs leading-snug font-medium">{sku.name}</span>
          <span className="text-[0.7rem] text-muted-foreground">
            {sku.qty > 0
              ? units.length > 1
                ? formatBreakdown(sku.qty, units)
                : `${sku.qty} ${smallest?.name ?? ""}`
              : "หมด"}
          </span>
        </div>
      </button>

      {selected && (
        <div className="flex gap-1.5">
          <Input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            placeholder={type === "ADJUSTMENT" ? "ยอดใหม่" : "จำนวน"}
            className="h-9 flex-1"
            value={amount}
            aria-invalid={exceeds}
            aria-label={`จำนวนของ ${sku.name}`}
            disabled={disabled}
            onChange={(event) => onDraftChange(sku.id, { amount: event.target.value })}
          />
          <Select
            items={unitItems}
            value={draft?.unitTypeId ?? ""}
            onValueChange={(value) => onDraftChange(sku.id, { unitTypeId: value })}
            disabled={disabled || units.length <= 1}
          >
            <SelectTrigger className="h-9 w-[7.5rem] shrink-0">
              <SelectValue placeholder="หน่วย" />
            </SelectTrigger>
            <SelectContent>
              {units.map((unit) => (
                <SelectItem key={unit.id} value={String(unit.id)}>
                  {unit.name} (×{unit.qty})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selected && exceeds && (
        <p className="text-[0.7rem] font-medium text-destructive">
          ตัดออกได้สูงสุด {Math.floor(sku.qty / factor)} {selectedUnit?.name}
        </p>
      )}

      {selected && !exceeds && hasAmount && factor > 1 && (
        <Badge variant="secondary" className="w-fit text-[0.7rem]">
          = {parsed * factor} {smallest?.name ?? "หน่วย"}
        </Badge>
      )}
    </div>
  );
});
