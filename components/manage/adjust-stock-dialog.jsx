"use client";

import { useState, useTransition } from "react";
import { ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { adjustStockAction } from "@/app/manage/actions";
import { formatBreakdown, productUnits } from "@/lib/stock";

const TYPE_OPTIONS = [
  { value: "IN", label: "Stock in" },
  { value: "OUT", label: "Stock out" },
  { value: "ADJUSTMENT", label: "Adjustment" },
];

export function AdjustStockDialog({ product, users, onAdjusted }) {
  const units = productUnits(product);
  const smallestUnit = units.at(-1);
  const [open, setOpen] = useState(false);
  const [qtyTypeId, setQtyTypeId] = useState("");
  const [userId, setUserId] = useState("");
  const [type, setType] = useState("IN");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  const selectedUnit = units.find((unit) => String(unit.id) === qtyTypeId);
  const factor = selectedUnit?.qty ?? 1;
  const parsedAmount = Number(amount);
  const hasAmount = amount !== "" && Number.isInteger(parsedAmount) && parsedAmount >= 0;

  // ยอดคงเหลือเก็บเป็นหน่วยย่อย แปลงเป็นหน่วยที่เลือกเพื่อบอกว่าตัดออกได้เท่าไหร่
  const availableInUnit = Math.floor(product.qty / factor);

  const canSubmit =
    Boolean(qtyTypeId) &&
    Boolean(userId) &&
    hasAmount &&
    (type === "ADJUSTMENT" || parsedAmount > 0) &&
    (type !== "OUT" || parsedAmount * factor <= product.qty);

  function reset() {
    setQtyTypeId("");
    setUserId("");
    setType("IN");
    setAmount("");
    setNote("");
    setError(null);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;

    startTransition(async () => {
      const result = await adjustStockAction(
        Number(userId),
        product.id,
        Number(qtyTypeId),
        parsedAmount,
        type,
        note.trim() || null
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onAdjusted(result.product);
      reset();
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            disabled={units.length === 0}
            aria-label={`Adjust stock for ${product.name}`}
          />
        }
      >
        <ArrowUpDown />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock — {product.name}</DialogTitle>
          <DialogDescription>
            {product.qty} {smallestUnit?.name ?? "unit"} on hand
            {units.length > 1 && ` — ${formatBreakdown(product.qty, units)}`}
          </DialogDescription>
        </DialogHeader>

        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No users yet. Add a row to the <code>User</code> table before recording stock
            movements.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Unit</Label>
              <Select value={qtyTypeId} onValueChange={setQtyTypeId} disabled={isPending}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a unit" />
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

            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType} disabled={isPending}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="adjust-amount">
                {type === "ADJUSTMENT" ? "New quantity" : "Amount"}
                {selectedUnit ? ` (${selectedUnit.name})` : ""}
              </Label>
              <Input
                id="adjust-amount"
                type="number"
                min={0}
                step={1}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={isPending}
              />
              {selectedUnit && (
                <p className="text-xs text-muted-foreground">
                  {type === "OUT"
                    ? `${availableInUnit} ${selectedUnit.name} available`
                    : hasAmount && factor > 1
                      ? `= ${parsedAmount * factor} ${smallestUnit?.name ?? "unit"}`
                      : `1 ${selectedUnit.name} = ${factor} ${smallestUnit?.name ?? "unit"}`}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Recorded by</Label>
              <Select value={userId} onValueChange={setUserId} disabled={isPending}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="adjust-note">Note (optional)</Label>
              <Textarea
                id="adjust-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                disabled={isPending}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancel
              </DialogClose>
              <Button type="submit" disabled={!canSubmit || isPending}>
                Save
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
