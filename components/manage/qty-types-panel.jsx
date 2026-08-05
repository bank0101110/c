"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createQtyTypeAction, deleteQtyTypeAction } from "@/app/manage/actions";

function sortUnits(units) {
  return [...units].sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name));
}

export function QtyTypesPanel({ qtyTypes, setQtyTypes }) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  const canSubmit = Boolean(name.trim()) && Number(qty) >= 1;

  function handleCreate(event) {
    event.preventDefault();
    if (!canSubmit) return;

    startTransition(async () => {
      const result = await createQtyTypeAction(name.trim(), Number(qty));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setQtyTypes((prev) => sortUnits([...prev, result.qtyType]));
      setName("");
      setQty("1");
      setError(null);
    });
  }

  function handleDelete(id) {
    startTransition(async () => {
      const result = await deleteQtyTypeAction(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setQtyTypes((prev) => prev.filter((qtyType) => qtyType.id !== id));
      setError(null);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unit types</CardTitle>
        <CardDescription>
          How many of the smallest unit each one holds. The smallest unit is 1.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <form onSubmit={handleCreate} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="unit-name">Name</Label>
              <Input
                id="unit-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Box"
                disabled={isPending}
              />
            </div>
            <div className="flex w-20 flex-col gap-1.5">
              <Label htmlFor="unit-qty">Holds</Label>
              <Input
                id="unit-qty"
                type="number"
                min={1}
                step={1}
                value={qty}
                onChange={(event) => setQty(event.target.value)}
                disabled={isPending}
              />
            </div>
          </div>
          <Button type="submit" size="sm" disabled={isPending || !canSubmit}>
            <Plus />
            Add unit type
          </Button>
        </form>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {qtyTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No unit types yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {qtyTypes.map((qtyType) => (
              <Badge
                key={qtyType.id}
                variant="secondary"
                className="h-8 gap-1 pr-1 pl-3 text-sm sm:h-5 sm:pl-2 sm:text-xs"
              >
                {qtyType.name}
                <span className="text-muted-foreground">×{qtyType.qty}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(qtyType.id)}
                  disabled={isPending}
                  className="rounded-full p-1.5 hover:bg-foreground/10 sm:p-0.5"
                  aria-label={`Delete ${qtyType.name}`}
                >
                  <Trash2 className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
