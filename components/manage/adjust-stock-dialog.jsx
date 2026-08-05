"use client";

import { useMemo, useState, useTransition } from "react";
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

export const TYPE_OPTIONS = [
  { value: "IN", label: "Stock in" },
  { value: "OUT", label: "Stock out" },
  { value: "ADJUSTMENT", label: "Adjustment" },
];

export function AdjustStockDialog({
  product,
  users,
  onAdjusted,
  defaultType = "IN",
  typeOptions = TYPE_OPTIONS,
  trigger,
  children,
}) {
  const units = useMemo(() => productUnits(product), [product]);
  const smallestUnit = units.at(-1);
  const [open, setOpen] = useState(false);
  const [unitTypeId, setUnitTypeId] = useState("");
  const [userId, setUserId] = useState("");
  const [type, setType] = useState(defaultType);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  const unitItems = useMemo(
    () =>
      Object.fromEntries(
        units.map((unit) => [String(unit.id), `${unit.name} (×${unit.qty})`])
      ),
    [units]
  );
  const userItems = useMemo(
    () => Object.fromEntries(users.map((user) => [String(user.id), user.name])),
    [users]
  );

  const selectedUnit = units.find((unit) => String(unit.id) === unitTypeId);
  const factor = selectedUnit?.qty ?? 1;
  const parsedAmount = Number(amount);
  const hasAmount = amount !== "" && Number.isInteger(parsedAmount) && parsedAmount >= 0;

  // ยอดคงเหลือเก็บเป็นหน่วยย่อย แปลงเป็นหน่วยที่เลือกเพื่อบอกว่าตัดออกได้เท่าไหร่
  const availableInUnit = Math.floor(product.qty / factor);

  const canSubmit =
    Boolean(unitTypeId) &&
    Boolean(userId) &&
    hasAmount &&
    (type === "ADJUSTMENT" || parsedAmount > 0) &&
    (type !== "OUT" || parsedAmount * factor <= product.qty);

  function reset() {
    // มีหน่วยเดียวก็เลือกให้เลย ผู้ใช้จะได้กดน้อยลง
    setUnitTypeId(units.length === 1 ? String(units[0].id) : "");
    setUserId(users.length === 1 ? String(users[0].id) : "");
    setType(defaultType);
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
        Number(unitTypeId),
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
        // reset ตอนเปิดด้วย ไม่ใช่แค่ตอนปิด ค่า default จะได้ถูกเซ็ตตั้งแต่ครั้งแรก
        reset();
      }}
    >
      <DialogTrigger
        render={
          trigger ?? (
            <Button
              variant="outline"
              size="icon-sm"
              disabled={units.length === 0}
              aria-label={`Adjust stock for ${product.name}`}
            />
          )
        }
      >
        {children ?? <ArrowUpDown />}
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
              <Select
                items={unitItems}
                value={unitTypeId}
                onValueChange={setUnitTypeId}
                disabled={isPending}
              >
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
              {/* ปุ่มเรียงกันแทน dropdown เพราะมีไม่กี่ตัวเลือกและกดง่ายกว่าบนมือถือ */}
              <div className="flex gap-1.5">
                {typeOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    className="flex-1"
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
              <Select
                items={userItems}
                value={userId}
                onValueChange={setUserId}
                disabled={isPending}
              >
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
