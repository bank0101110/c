"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, History, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { getProductHistoryAction } from "@/app/manage/actions";

const TYPE_META = {
  IN: { label: "รับเข้า", icon: ArrowDown, className: "text-emerald-600 dark:text-emerald-400" },
  OUT: { label: "ตัดออก", icon: ArrowUp, className: "text-destructive" },
  ADJUSTMENT: { label: "ตั้งยอดใหม่", icon: Pencil, className: "text-muted-foreground" },
};

// เวลาไทยแบบสั้น — วันเดือน + เวลา พอให้ไล่ย้อนได้โดยไม่กินความกว้าง
const formatWhen = (value) =>
  new Date(value).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/** ประวัติการปรับสต็อกของสินค้าหนึ่งชิ้น — โหลดตอนเปิดกล่องเท่านั้น */
export function HistoryDialog({ product }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(null); // null = ยังไม่ได้โหลด
  const [loading, startLoad] = useTransition();
  const { toast } = useToast();

  function load() {
    startLoad(async () => {
      const result = await getProductHistoryAction(product.id);
      if (!result.ok) {
        toast({
          variant: "destructive",
          title: "โหลดประวัติไม่สำเร็จ",
          description: result.error,
          duration: 0,
        });
        setRows([]);
        return;
      }
      setRows(result.history);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // โหลดใหม่ทุกครั้งที่เปิด เพราะอาจมีคนอื่นตัดสต็อกไประหว่างนั้น
        if (next) load();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" aria-label={`ประวัติของ ${product.name}`} />
        }
      >
        <History />
        ประวัติ
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="truncate">ประวัติการปรับสต็อก</DialogTitle>
          <DialogDescription>
            {rows === null ? "กำลังโหลด…" : `${rows.length} รายการล่าสุด`}
          </DialogDescription>
        </DialogHeader>

        {rows === null || loading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        ) : rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            ยังไม่มีการปรับสต็อกสินค้านี้
          </p>
        ) : (
          <ul className="flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto">
            {rows.map((row) => {
              const meta = TYPE_META[row.type] ?? TYPE_META.ADJUSTMENT;
              const Icon = meta.icon;

              return (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border p-2 text-sm"
                >
                  <Icon className={`size-4 shrink-0 ${meta.className}`} />

                  <span className="font-medium">{meta.label}</span>

                  {/* ตัวเลือกที่ถูกปรับ — รายการเก่าก่อนมีระบบ SKU จะไม่มี */}
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    {row.sku?.name ?? "(ทั้งสินค้า)"}
                  </span>

                  <Badge variant="secondary" className="tabular-nums">
                    {row.unitAmount} {row.unitName}
                  </Badge>

                  {/* ยอดก่อน → หลัง คือหัวใจของการเช็คย้อนหลัง */}
                  <span className="tabular-nums text-muted-foreground">
                    {row.oldQty} → <span className="font-medium text-foreground">{row.newQty}</span>
                  </span>

                  <span className="w-full text-xs text-muted-foreground sm:w-auto">
                    {formatWhen(row.createdAt)} · {row.user?.name || row.user?.email || "ไม่ทราบ"}
                  </span>

                  {row.note && (
                    <span className="w-full truncate text-xs text-muted-foreground italic">
                      หมายเหตุ: {row.note}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
