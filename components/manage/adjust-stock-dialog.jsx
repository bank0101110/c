"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUpDown, LogIn } from "lucide-react";

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
import { useToast } from "@/components/ui/toast";
import { adjustStockAction } from "@/app/manage/actions";
import { allowedStockTypes, canManageProduct } from "@/lib/permissions";
import { formatBreakdown, productUnits, toBase } from "@/lib/stock";

export const TYPE_OPTIONS = [
  { value: "IN", label: "รับเข้า" },
  { value: "OUT", label: "ตัดออก" },
  { value: "ADJUSTMENT", label: "ตั้งยอดใหม่" },
];

/**
 * ยอดที่จะได้หลังปรับ — สูตรเดียวกับที่ adjustStock() คิดฝั่ง server
 * ใช้ทับหน้าจอทันทีระหว่างรอ server ตอบ ของจริงมาถึงค่อยทับซ้ำ
 */
function nextQty(currentQty, amount, factor, type) {
  if (type === "IN") return currentQty + toBase(amount, factor);
  if (type === "OUT") return currentQty - toBase(amount, factor);
  return toBase(amount, factor);
}

export function AdjustStockDialog({
  product,
  currentUser,
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
  const [type, setType] = useState(defaultType);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const unitItems = useMemo(
    () =>
      Object.fromEntries(
        units.map((unit) => [String(unit.id), `${unit.name} (×${unit.qty})`])
      ),
    [units]
  );
  // ไม่ใช่เจ้าของ = เข้า-ออกได้ แต่ตั้งยอดใหม่ (ADJUSTMENT) ไม่ได้
  const availableTypes = useMemo(() => {
    const allowed = allowedStockTypes(product, currentUser);
    return typeOptions.filter((option) => allowed.includes(option.value));
  }, [typeOptions, product, currentUser]);

  const selectedUnit = units.find((unit) => String(unit.id) === unitTypeId);
  const factor = selectedUnit?.qty ?? 1;
  const parsedAmount = Number(amount);
  const hasAmount = amount !== "" && Number.isInteger(parsedAmount) && parsedAmount >= 0;

  // ยอดคงเหลือเก็บเป็นหน่วยย่อย แปลงเป็นหน่วยที่เลือกเพื่อบอกว่าตัดออกได้เท่าไหร่
  const availableInUnit = Math.floor(product.qty / factor);

  const exceedsStock =
    type === "OUT" && hasAmount && parsedAmount * factor > product.qty;

  // ตั้งใจไม่เอา exceedsStock มาปิดปุ่ม — ปล่อยให้กดได้แล้วเด้ง toast บอกเหตุผล
  // ปุ่มจางที่กดไม่ติดโดยไม่บอกอะไรเลยคือจุดที่ผู้ใช้งงว่าทำอะไรผิด
  const canSubmit =
    Boolean(unitTypeId) &&
    Boolean(currentUser) &&
    hasAmount &&
    (type === "ADJUSTMENT" || parsedAmount > 0);

  function reset() {
    // มีหน่วยเดียวก็เลือกให้เลย ผู้ใช้จะได้กดน้อยลง
    setUnitTypeId(units.length === 1 ? String(units[0].id) : "");
    // defaultType อาจเป็นตัวที่คนนี้ทำไม่ได้ ถอยไปใช้ตัวแรกที่ทำได้แทน
    setType(
      availableTypes.some((option) => option.value === defaultType)
        ? defaultType
        : (availableTypes[0]?.value ?? defaultType)
    );
    setAmount("");
    setNote("");
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;

    if (exceedsStock) {
      toast({
        variant: "destructive",
        title: "ตัดออกเกินยอดคงเหลือ",
        description: `${product.name} เหลือ ${availableInUnit} ${selectedUnit.name} แต่สั่งตัด ${parsedAmount} ${selectedUnit.name}`,
      });
      return;
    }

    // เก็บค่าที่ต้องใช้ในข้อความไว้ก่อน เพราะเดี๋ยว state จะถูก reset ตอนเปิดครั้งหน้า
    const unitLabel = selectedUnit?.name ?? "หน่วย";
    const typeLabel =
      availableTypes.find((option) => option.value === type)?.label ?? "บันทึก";

    // ปิดทันทีไม่รอ server — ที่เหลือไปรายงานผลที่ toast
    // ถ้าพลาดจริงยังรู้แน่นอนเพราะ toast แบบ destructive ค้างให้อ่าน
    setOpen(false);

    // ขยับยอดในตารางทันที ไม่ต้องรอ round trip — เลขที่คิดตรงกับฝั่ง server
    onAdjusted({
      ...product,
      qty: nextQty(product.qty, parsedAmount, factor, type),
    });

    startTransition(async () => {
      const result = await adjustStockAction(
        product.id,
        Number(unitTypeId),
        parsedAmount,
        type,
        note.trim() || null
      );

      if (!result.ok) {
        // ยอดที่ทับไว้ไม่ได้เกิดขึ้นจริง ย้อนกลับเป็นของเดิม
        onAdjusted(product);
        toast({
          variant: "destructive",
          title: `${typeLabel} ${product.name} ไม่สำเร็จ`,
          description: result.error,
          duration: 0,
        });
        return;
      }

      onAdjusted(result.product);
      toast({
        variant: "success",
        title: `${typeLabel} ${product.name} แล้ว`,
        description: `${parsedAmount} ${unitLabel}`,
      });
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
              aria-label={`ปรับสต็อก ${product.name}`}
            />
          )
        }
      >
        {children ?? <ArrowUpDown />}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ปรับสต็อก — {product.name}</DialogTitle>
          <DialogDescription>
            คงเหลือ {product.qty} {smallestUnit?.name ?? "หน่วย"}
            {units.length > 1 && ` — ${formatBreakdown(product.qty, units)}`}
          </DialogDescription>
        </DialogHeader>

        {!currentUser ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">
              ต้องเข้าสู่ระบบก่อนถึงจะปรับสต็อกได้
            </p>
            <Button nativeButton={false} render={<Link href="/login" />}>
              <LogIn />
              เข้าสู่ระบบ
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>หน่วย</Label>
              <Select
                items={unitItems}
                value={unitTypeId}
                onValueChange={setUnitTypeId}
                disabled={isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="เลือกหน่วย" />
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
              <Label>ประเภทรายการ</Label>
              {/* ปุ่มเรียงกันแทน dropdown เพราะมีไม่กี่ตัวเลือกและกดง่ายกว่าบนมือถือ */}
              <div className="flex gap-1.5">
                {availableTypes.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    // ปุ่มขนาด sm ยุบเหลือ 28px ตอนจอกว้าง ซึ่งเตี้ยไปสำหรับสระบน/วรรณยุกต์
                    // ของไทย เลยล็อกให้สูงขึ้นอีกหน่อย (จัดกึ่งกลางมาจาก Button อยู่แล้ว)
                    className="h-9 flex-1 sm:h-8"
                    variant={type === option.value ? "default" : "outline"}
                    aria-pressed={type === option.value}
                    disabled={isPending}
                    onClick={() => setType(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              {!canManageProduct(product, currentUser) && (
                <p className="text-xs text-muted-foreground">
                  ตั้งยอดใหม่ได้เฉพาะเจ้าของสินค้า
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="adjust-amount">
                {type === "ADJUSTMENT" ? "ยอดใหม่" : "จำนวน"}
                {selectedUnit ? ` (${selectedUnit.name})` : ""}
              </Label>
              <Input
                id="adjust-amount"
                type="number"
                min={0}
                step={1}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                aria-invalid={exceedsStock}
                disabled={isPending}
              />
              {selectedUnit && (
                <p
                  className={
                    exceedsStock
                      ? "text-xs font-medium text-destructive"
                      : "text-xs text-muted-foreground"
                  }
                >
                  {type === "OUT"
                    ? `ตัดออกได้สูงสุด ${availableInUnit} ${selectedUnit.name}`
                    : hasAmount && factor > 1
                      ? `= ${parsedAmount * factor} ${smallestUnit?.name ?? "หน่วย"}`
                      : `1 ${selectedUnit.name} = ${factor} ${smallestUnit?.name ?? "หน่วย"}`}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>ผู้บันทึก</Label>
              {/* คนบันทึกมาจาก session ฝั่ง server เลือกเองไม่ได้ ตรงนี้แค่บอกให้รู้ */}
              <p className="text-sm text-muted-foreground">
                {currentUser.name || currentUser.email}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="adjust-note">หมายเหตุ (ไม่บังคับ)</Label>
              <Textarea
                id="adjust-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                disabled={isPending}
              />
            </div>

            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                ยกเลิก
              </DialogClose>
              <Button type="submit" disabled={!canSubmit || isPending}>
                บันทึก
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
