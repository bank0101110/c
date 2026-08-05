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

const TYPE_OPTIONS = [
  { value: "IN", label: "Stock in" },
  { value: "OUT", label: "Stock out" },
  { value: "ADJUSTMENT", label: "Adjustment" },
];

export function AdjustStockDialog({ product, users, onAdjusted }) {
  const units = product.ProductQtyType;
  const [open, setOpen] = useState(false);
  const [productQtyTypeId, setProductQtyTypeId] = useState("");
  const [userId, setUserId] = useState("");
  const [type, setType] = useState("IN");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedUnit = units.find((unit) => String(unit.id) === productQtyTypeId);
  const currentQty = selectedUnit?.qty ?? 0;
  const parsedAmount = Number(amount);

  const canSubmit =
    Boolean(productQtyTypeId) &&
    Boolean(userId) &&
    amount !== "" &&
    !Number.isNaN(parsedAmount) &&
    (type === "ADJUSTMENT" || parsedAmount > 0) &&
    (type !== "OUT" || parsedAmount <= currentQty);

  function reset() {
    setProductQtyTypeId("");
    setUserId("");
    setType("IN");
    setAmount("");
    setNote("");
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;

    const changeQty =
      type === "IN" ? parsedAmount : type === "OUT" ? -parsedAmount : parsedAmount - currentQty;

    startTransition(async () => {
      const result = await adjustStockAction(
        Number(userId),
        Number(productQtyTypeId),
        changeQty,
        type,
        note.trim() || null
      );
      if (result) {
        onAdjusted(Number(productQtyTypeId), result.productQtyType.qty);
        reset();
        setOpen(false);
      }
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
            disabled={units.length === 0 || users.length === 0}
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
            Record a stock movement. This updates the unit quantity and logs history.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Unit</Label>
            <Select
              value={productQtyTypeId}
              onValueChange={setProductQtyTypeId}
              disabled={isPending}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a unit" />
              </SelectTrigger>
              <SelectContent>
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={String(unit.id)}>
                    {unit.qtyType.name} ({unit.qty} in stock)
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
            </Label>
            <Input
              id="adjust-amount"
              type="number"
              min={0}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              disabled={isPending}
            />
            {type === "OUT" && selectedUnit && (
              <p className="text-xs text-muted-foreground">{currentQty} currently in stock</p>
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

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={!canSubmit || isPending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
