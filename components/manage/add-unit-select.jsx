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

  const usedIds = new Set(product.ProductQtyType.map((entry) => entry.qtyTypeId));
  const available = qtyTypes.filter((qtyType) => !usedIds.has(qtyType.id));

  if (available.length === 0) return null;

  function handleAdd() {
    if (!qtyTypeId) return;

    startTransition(async () => {
      const unit = await addUnitAction(product.id, Number(qtyTypeId));
      if (unit) {
        onAdded(unit);
        setQtyTypeId("");
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Select value={qtyTypeId} onValueChange={setQtyTypeId} disabled={isPending}>
        <SelectTrigger size="sm" className="h-6 text-xs">
          <SelectValue placeholder="Add unit" />
        </SelectTrigger>
        <SelectContent>
          {available.map((qtyType) => (
            <SelectItem key={qtyType.id} value={String(qtyType.id)}>
              {qtyType.name}
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
