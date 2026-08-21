"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Package, ShoppingBasket, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useCart } from "@/lib/use-cart";
import { thumbnailUrl } from "@/lib/images";
import { saveCartAction } from "@/app/manage/actions";

const TYPES = [
  { value: "OUT", label: "ตัดออก" },
  { value: "IN", label: "รับเข้า" },
];

/**
 * ตะกร้าเบิกของ — แถบลอยล่างจอ + กล่องรายละเอียดที่กางขึ้นมา
 *
 * มีไว้เพื่อเบิกของหลายสินค้าในการกดบันทึกครั้งเดียว แทนที่จะต้องเปิดหน้าสินค้าทีละหน้า
 * ของในตะกร้าอยู่ในเครื่องผู้ใช้เท่านั้น (ดู lib/use-cart.js) ยังไม่แตะ DB จนกว่าจะกดบันทึก
 */
export function CartBar() {
  const { items, setAmount, setUnit, remove, clear, keyOf } = useCart();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("OUT");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const total = items.length;
  const ready = total > 0 && items.every((item) => item.amount > 0);

  function handleSave() {
    if (!ready) return;

    const payload = items.map((item) => ({
      skuId: item.skuId,
      unitTypeId: item.unitTypeId,
      amount: item.amount,
    }));

    startTransition(async () => {
      const result = await saveCartAction(payload, type, note);
      if (!result.ok) {
        toast({
          variant: "destructive",
          title: "บันทึกตะกร้าไม่สำเร็จ",
          description: result.error,
          duration: 0,
        });
        return;
      }

      clear();
      setNote("");
      setOpen(false);
      toast({
        variant: "success",
        title: `${type === "OUT" ? "ตัดออก" : "รับเข้า"} ${total} รายการแล้ว`,
      });
      // หน้าที่เปิดค้างอยู่ถือยอดเก่า ดึงใหม่ให้เห็นยอดหลังบันทึกทันที
      router.refresh();
    });
  }

  /*
   * ล้างตะกร้าแล้วต้องปิดกล่องด้วย ไม่งั้น open ค้างเป็น true อยู่ พอใส่ของชิ้นใหม่
   * คอมโพเนนต์กลับมาวาดอีกครั้งแล้วกล่องเด้งขึ้นมาเองทั้งที่ผู้ใช้ไม่ได้กด
   *
   * เซ็ต state ระหว่าง render แบบนี้คือแพตเทิร์นที่ React แนะนำสำหรับ "รีเซ็ตตามค่าที่เปลี่ยน"
   * (ทำใน effect จะวาดรอบหนึ่งด้วยค่าเก่าก่อน = เห็นกล่องแวบขึ้นมาแล้วปิด)
   */
  if (total === 0 && open) setOpen(false);

  // ตะกร้าว่างก็ไม่ต้องมีแถบมาบังหน้าจอ
  if (total === 0) return null;

  // จัดกลุ่มตามสินค้าแม่ เวลาเบิกของจากสินค้าเดียวกันหลายตัวเลือกจะได้อ่านง่าย
  const groups = [];
  for (const item of items) {
    const group = groups.find((entry) => entry.productId === item.productId);
    if (group) group.items.push(item);
    else groups.push({ productId: item.productId, productName: item.productName, items: [item] });
  }

  return (
    <>
      {/* แถบลอยอยู่เหนือทุกหน้า กดที่ไหนของแอปก็เปิดตะกร้าได้ */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-2 px-4 py-2.5 sm:px-6">
          <ShoppingBasket className="size-5 shrink-0" />
          <span className="text-sm font-medium">ตะกร้า {total} รายการ</span>
          <Button size="sm" className="ml-auto" onClick={() => setOpen(true)}>
            ดู / บันทึก
          </Button>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[92vh] sm:max-w-none">
          <SheetHeader>
            <SheetTitle>ตะกร้าเบิกของ</SheetTitle>
            <SheetDescription>
              เบิกของหลายสินค้าพร้อมกัน กดบันทึกครั้งเดียวจบ
            </SheetDescription>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {TYPES.map((option) => (
                <Button
                  key={option.value}
                  size="sm"
                  variant={type === option.value ? "default" : "outline"}
                  aria-pressed={type === option.value}
                  disabled={isPending}
                  onClick={() => setType(option.value)}
                >
                  {option.label}
                </Button>
              ))}
              <span className="text-xs text-muted-foreground">
                ทั้งตะกร้าใช้ชนิดเดียวกัน
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto text-destructive"
                onClick={clear}
                disabled={isPending}
              >
                <Trash2 />
                ล้างตะกร้า
              </Button>
            </div>

            {groups.map((group) => (
              <div key={group.productId} className="flex flex-col gap-1.5">
                <p className="truncate text-xs font-medium text-muted-foreground">
                  {group.productName}
                </p>

                {group.items.map((item) => {
                  const key = keyOf(item);
                  const exceeds =
                    type === "OUT" && item.amount * (item.unitQty ?? 1) > (item.skuQty ?? 0);

                  return (
                    <div
                      key={key}
                      className="flex items-center gap-2 rounded-lg border border-border p-2"
                    >
                      <div className="size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumbnailUrl(item.imageUrl)}
                            alt={item.skuName}
                            loading="lazy"
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center">
                            <Package className="size-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm">{item.skuName}</span>
                        {exceeds && (
                          <span className="text-[0.7rem] font-medium text-destructive">
                            เกินยอดที่มี ({item.skuQty})
                          </span>
                        )}
                      </div>

                      <Input
                        type="number"
                        min={1}
                        step={1}
                        inputMode="numeric"
                        aria-label={`จำนวนของ ${item.skuName}`}
                        className="h-9 w-20 shrink-0"
                        value={item.amount}
                        aria-invalid={exceeds}
                        disabled={isPending}
                        onChange={(event) =>
                          setAmount(key, Math.max(0, Number(event.target.value) || 0))
                        }
                      />

                      <Select
                        items={Object.fromEntries(
                          (item.units ?? []).map((unit) => [
                            String(unit.id),
                            `${unit.name} (×${unit.qty})`,
                          ])
                        )}
                        value={String(item.unitTypeId)}
                        disabled={isPending || (item.units ?? []).length <= 1}
                        onValueChange={(value) => {
                          const unit = (item.units ?? []).find(
                            (entry) => String(entry.id) === value
                          );
                          if (unit) setUnit(key, unit);
                        }}
                      >
                        <SelectTrigger className="h-9 w-[7rem] shrink-0">
                          <SelectValue placeholder="หน่วย" />
                        </SelectTrigger>
                        <SelectContent>
                          {(item.units ?? []).map((unit) => (
                            <SelectItem key={unit.id} value={String(unit.id)}>
                              {unit.name} (×{unit.qty})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`เอา ${item.skuName} ออกจากตะกร้า`}
                        onClick={() => remove(key)}
                        disabled={isPending}
                      >
                        <X />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 border-t px-4 py-3">
            <Label htmlFor="cart-note" className="sr-only">
              หมายเหตุ
            </Label>
            <Textarea
              id="cart-note"
              rows={1}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="หมายเหตุ (ไม่บังคับ) เช่น ใครเป็นคนเบิก"
              className="min-h-9 resize-none"
              disabled={isPending}
            />
            <Button onClick={handleSave} disabled={!ready || isPending}>
              บันทึกทั้งตะกร้า ({total} รายการ)
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
