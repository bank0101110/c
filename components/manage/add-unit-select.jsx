"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { addUnitAction } from "@/app/manage/actions";

export function AddUnitSelect({ product, unitTypes, onAdded }) {
  const [unitTypeId, setUnitTypeId] = useState("");
  const [isPending, startTransition] = useTransition();

  // หน่วยหลักใช้ได้อยู่แล้ว ไม่ต้องเพิ่มซ้ำ
  const available = useMemo(() => {
    const usedIds = new Set([
      product.unitTypeId,
      ...product.ProductUnitType.map((entry) => entry.unitTypeId),
    ]);
    return unitTypes.filter((unitType) => !usedIds.has(unitType.id));
  }, [product, unitTypes]);

  // ค่าที่เก็บยังเป็น id แต่ให้ปุ่มโชว์ชื่อหน่วย
  const availableItems = useMemo(
    () =>
      Object.fromEntries(
        available.map((unitType) => [
          String(unitType.id),
          `${unitType.name} (×${unitType.qty})`,
        ])
      ),
    [available]
  );

  if (available.length === 0) return null;

  function handleAdd() {
    if (!unitTypeId) return;

    startTransition(async () => {
      const result = await addUnitAction(product.id, Number(unitTypeId));
      if (result.ok) {
        onAdded(result.unit);
        setUnitTypeId("");
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Select
        items={availableItems}
        value={unitTypeId}
        onValueChange={setUnitTypeId}
        disabled={isPending}
      >
        <SelectTrigger size="sm" className="text-xs sm:h-6">
          <SelectValue placeholder="เพิ่มหน่วย" />
        </SelectTrigger>
        <SelectContent>
          {available.map((unitType) => (
            <SelectItem key={unitType.id} value={String(unitType.id)}>
              {unitType.name} (×{unitType.qty})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        disabled={!unitTypeId || isPending}
        onClick={handleAdd}
        aria-label="เพิ่มหน่วย"
      >
        <Plus />
      </Button>
    </div>
  );
}
