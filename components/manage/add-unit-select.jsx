"use client";

import { useState, useTransition } from "react";
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

export function AddUnitSelect({ product, qtyTypes, onAdded }) {
  const [qtyTypeId, setQtyTypeId] = useState("");
  const [isPending, startTransition] = useTransition();

  // หน่วยหลักใช้ได้อยู่แล้ว ไม่ต้องเพิ่มซ้ำ
  const usedIds = new Set([
    product.qtyTypeId,
    ...product.ProductQtyType.map((entry) => entry.qtyTypeId),
  ]);
  const available = qtyTypes.filter((qtyType) => !usedIds.has(qtyType.id));

  if (available.length === 0) return null;

  function handleAdd() {
    if (!qtyTypeId) return;

    startTransition(async () => {
      const result = await addUnitAction(product.id, Number(qtyTypeId));
      if (result.ok) {
        onAdded(result.unit);
        setQtyTypeId("");
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Select value={qtyTypeId} onValueChange={setQtyTypeId} disabled={isPending}>
        <SelectTrigger size="sm" className="text-xs sm:h-6">
          <SelectValue placeholder="Add unit" />
        </SelectTrigger>
        <SelectContent>
          {available.map((qtyType) => (
            <SelectItem key={qtyType.id} value={String(qtyType.id)}>
              {qtyType.name} (×{qtyType.qty})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        disabled={!qtyTypeId || isPending}
        onClick={handleAdd}
        aria-label="Add unit"
      >
        <Plus />
      </Button>
    </div>
  );
}
