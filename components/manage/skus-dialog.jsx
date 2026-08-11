"use client";

import { useMemo, useState, useTransition } from "react";
import { Layers, Package, Pencil, Plus, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import { ImageField, uploadPendingImage } from "@/components/manage/image-field";
import {
  createSkuAction,
  deleteSkuAction,
  getProductSkusAction,
  saveSkuAction,
} from "@/app/manage/actions";
import {
  Combobox,
  ComboboxChip,
  ComboboxChipRemove,
  ComboboxChips,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";
import {
  baseUnitTypes,
  sameUnitOption,
  skuUnits,
  unitOptionFilter,
  unitOptionLabel,
  unitOptions,
} from "@/lib/stock";
import { thumbnailUrl } from "@/lib/images";

/** ฟอร์มเปล่าสำหรับเพิ่มตัวเลือกใหม่ */
function emptyDraft(baseOptions) {
  return {
    id: null,
    name: "",
    code: "",
    imageUrl: "",
    imageFile: null,
    // มีหน่วย ×1 อยู่ตัวเดียวก็เลือกให้เลย ผู้ใช้จะได้กรอกน้อยลง
    unitTypeId: baseOptions.length === 1 ? String(baseOptions[0].id) : "",
    // หน่วยเสริม เช่น ลัง (×12) — ตัวเลือกเดียวใช้ได้หลายหน่วย
    extraUnitIds: new Set(),
    qty: "0",
  };
}

function SkuRow({ sku, onEdit, onDelete, busy }) {
  const units = skuUnits(sku);

  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border p-2">
      <div className="size-11 shrink-0 overflow-hidden rounded-md bg-muted">
        {sku.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl(sku.imageUrl)}
            alt={sku.name}
            loading="lazy"
            decoding="async"
            width={88}
            height={88}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Package className="size-4 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium">{sku.name}</span>
        <div className="flex flex-wrap items-center gap-1">
          {sku.code && (
            <Badge variant="outline" className="font-mono text-[0.65rem]">
              {sku.code}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            คงเหลือ {sku.qty} {units.at(-1)?.name ?? ""}
            {units.length > 1 && ` · ${units.length} หน่วย`}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={busy}
          onClick={() => onEdit(sku)}
          aria-label={`แก้ไข ${sku.name}`}
        >
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={busy}
          onClick={() => onDelete(sku)}
          aria-label={`ลบ ${sku.name}`}
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}

/**
 * จัดการตัวเลือกย่อย (SKU) ของสินค้าหนึ่งชิ้น — เพิ่ม แก้ ลบ พร้อมรูปของแต่ละตัว
 *
 * รายการ SKU ไม่ได้ติดมากับตารางสินค้า (payload จะบวมเกินจำเป็น) เลยโหลดตอนเปิดกล่องนี้
 */
export function SkusDialog({ product, unitTypes, onCountChange }) {
  const [open, setOpen] = useState(false);
  const [skus, setSkus] = useState(null); // null = ยังไม่ได้โหลด
  const [draft, setDraft] = useState(null); // null = ยังไม่ได้เปิดฟอร์ม
  const [busy, startTransition] = useTransition();
  const { toast } = useToast();

  // หน่วยหลักของ SKU ต้องเป็น ×1 ส่วนหน่วยเสริมคือหน่วยอื่นทั้งหมดที่ไม่ใช่หน่วยหลักที่เลือกไว้
  const baseOptions = baseUnitTypes(unitTypes);
  const baseUnitOptions = useMemo(() => unitOptions(baseOptions), [baseOptions]);
  const selectedBaseOption =
    baseUnitOptions.find((option) => String(option.id) === draft?.unitTypeId) ?? null;
  const extraOptions = useMemo(
    () =>
      unitOptions(unitTypes).filter((option) => String(option.id) !== draft?.unitTypeId),
    [unitTypes, draft?.unitTypeId]
  );
  const selectedExtraOptions = useMemo(
    () => extraOptions.filter((option) => draft?.extraUnitIds?.has(option.id)),
    [extraOptions, draft?.extraUnitIds]
  );

  function load() {
    startTransition(async () => {
      const result = await getProductSkusAction(product.id);
      if (!result.ok) {
        toast({
          variant: "destructive",
          title: "โหลดตัวเลือกไม่สำเร็จ",
          description: result.error,
          duration: 0,
        });
        setSkus([]);
        return;
      }
      setSkus(result.skus);
    });
  }

  function startAdd() {
    setDraft(emptyDraft(baseOptions));
  }

  function startEdit(sku) {
    setDraft({
      id: sku.id,
      name: sku.name,
      code: sku.code ?? "",
      imageUrl: sku.imageUrl ?? "",
      imageFile: null,
      unitTypeId: String(sku.unitTypeId),
      extraUnitIds: new Set(
        (sku.SkuUnitType ?? [])
          .map((entry) => entry.unitTypeId)
          .filter((id) => id !== sku.unitTypeId)
      ),
      // ยอดแก้ที่นี่ไม่ได้ ต้องไปปรับผ่านหน้าสินค้าเพื่อให้มีประวัติกำกับ
      qty: String(sku.qty),
    });
  }

  const canSave = Boolean(draft?.name.trim()) && Boolean(draft?.unitTypeId);

  function handleSave() {
    if (!canSave) return;

    const current = draft;
    const isEdit = current.id !== null;

    startTransition(async () => {
      // อัปโหลดรูปก่อน ถ้าพลาดจะได้ไม่มีตัวเลือกที่รูปหาย
      let imageUrl = current.imageUrl.trim() || null;
      if (current.imageFile) {
        const uploaded = await uploadPendingImage(current.imageFile);
        if (!uploaded.ok) {
          toast({
            variant: "destructive",
            title: "อัปโหลดรูปไม่สำเร็จ",
            description: uploaded.error,
            duration: 0,
          });
          return;
        }
        imageUrl = uploaded.url;
      }

      const result = isEdit
        ? await saveSkuAction(
            current.id,
            current.name.trim(),
            imageUrl,
            Number(current.unitTypeId),
            [...current.extraUnitIds],
            current.code.trim() || null
          )
        : await createSkuAction(
            product.id,
            current.name.trim(),
            imageUrl,
            Number(current.unitTypeId),
            Number(current.qty) || 0,
            [...current.extraUnitIds],
            current.code.trim() || null
          );

      if (!result.ok) {
        toast({
          variant: "destructive",
          title: isEdit ? "แก้ตัวเลือกไม่สำเร็จ" : "เพิ่มตัวเลือกไม่สำเร็จ",
          description: result.error,
          duration: 0,
        });
        return;
      }

      setSkus((prev) => {
        const list = prev ?? [];
        const next = isEdit
          ? list.map((item) => (item.id === result.sku.id ? result.sku : item))
          : [...list, result.sku];
        onCountChange?.(next.length);
        return next;
      });
      setDraft(null);
      toast({
        variant: "success",
        title: isEdit ? `แก้ ${result.sku.name} แล้ว` : `เพิ่ม ${result.sku.name} แล้ว`,
      });
    });
  }

  function handleDelete(sku) {
    startTransition(async () => {
      const result = await deleteSkuAction(sku.id);
      if (!result.ok) {
        toast({
          variant: "destructive",
          title: `ลบ ${sku.name} ไม่สำเร็จ`,
          description: result.error,
          duration: 0,
        });
        return;
      }
      setSkus((prev) => {
        const next = (prev ?? []).filter((item) => item.id !== sku.id);
        onCountChange?.(next.length);
        return next;
      });
      toast({ variant: "success", title: `ลบ ${sku.name} แล้ว` });
    });
  }

  const count = skus?.length ?? product._count?.skus ?? 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setDraft(null);
        // โหลดครั้งแรกที่เปิดเท่านั้น เปิดซ้ำใช้ของที่มีอยู่ในมือ
        if (next && skus === null) load();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={`จัดการตัวเลือกของ ${product.name}`} />
        }
      >
        <Layers />
      </DialogTrigger>

      {/* กล่องนี้เป็นรายการ ไม่ใช่ฟอร์มสั้น ๆ — ดีฟอลต์ sm:max-w-sm แคบเกินไปบนจอคอม */}
      <DialogContent className="sm:max-w-2xl lg:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="truncate">ตัวเลือกย่อย — {product.name}</DialogTitle>
          <DialogDescription>
            แยกสี ขนาด หรือรุ่น ที่ถือสต็อกแยกกัน — ยอดรวมของสินค้าคิดจากทุกตัวเลือก
          </DialogDescription>
        </DialogHeader>

        {/* จอกว้างวางสองคอลัมน์ ไม่งั้นการ์ดยืดเต็มความกว้างแล้วเหลือที่ว่างข้างในเยอะ */}
        <div className="grid max-h-[60vh] grid-cols-1 gap-2.5 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
          {skus === null ? (
            <>
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </>
          ) : skus.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
              ยังไม่มีตัวเลือกย่อย
            </p>
          ) : (
            skus.map((sku) => (
              <SkuRow
                key={sku.id}
                sku={sku}
                busy={busy}
                onEdit={startEdit}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>

        {draft ? (
          <>
            <Separator />
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  {draft.id === null ? "เพิ่มตัวเลือกใหม่" : "แก้ไขตัวเลือก"}
                </h3>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDraft(null)}
                  disabled={busy}
                  aria-label="ปิดฟอร์ม"
                >
                  <X />
                </Button>
              </div>

              {/* จอกว้างวางชื่อกับรหัสคู่กัน ฟอร์มจะได้ไม่ยาวเป็นเสาเดียว */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sku-name">ชื่อตัวเลือก</Label>
                  <Input
                    id="sku-name"
                    value={draft.name}
                    onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                    placeholder="เช่น 6x14 นิ้ว"
                    disabled={busy}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sku-code">รหัส (ไม่บังคับ)</Label>
                  <Input
                    id="sku-code"
                    value={draft.code}
                    onChange={(event) => setDraft({ ...draft, code: event.target.value })}
                    placeholder="SKU-001"
                    disabled={busy}
                  />
                </div>
              </div>

              <ImageField
                id="sku-image"
                value={draft.imageUrl}
                onChange={(value) => setDraft({ ...draft, imageUrl: value })}
                pendingFile={draft.imageFile}
                onPendingFileChange={(file) => setDraft({ ...draft, imageFile: file })}
                disabled={busy}
              />

              <div className="flex flex-col gap-1.5">
                <Label>หน่วยหลัก</Label>
                <Combobox
                  items={baseUnitOptions}
                  value={selectedBaseOption}
                  onValueChange={(option) =>
                    setDraft({
                      ...draft,
                      unitTypeId: option ? String(option.id) : "",
                      // เปลี่ยนหน่วยหลักแล้วตัวเดิมอาจไปซ้ำอยู่ในหน่วยเสริม ต้องถอดออก
                      extraUnitIds: new Set(
                        [...draft.extraUnitIds].filter((id) => id !== option?.id)
                      ),
                    })
                  }
                  itemToStringLabel={unitOptionLabel}
                  filter={unitOptionFilter}
                  isItemEqualToValue={sameUnitOption}
                  limit={50}
                  autoHighlight
                  disabled={busy || baseUnitOptions.length === 0}
                >
                  <ComboboxInputGroup>
                    <ComboboxInput
                      placeholder={
                        baseUnitOptions.length === 0
                          ? "ยังไม่มีหน่วย ×1"
                          : `ค้นหาใน ${baseUnitOptions.length} หน่วย ×1`
                      }
                    />
                    <ComboboxClear />
                    <ComboboxTrigger />
                  </ComboboxInputGroup>
                  <ComboboxContent>
                    <ComboboxEmpty>ไม่พบหน่วยที่ค้นหา</ComboboxEmpty>
                    <ComboboxList>
                      {(option) => (
                        <ComboboxItem key={option.id} value={option}>
                          {option.label}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>

              {/* หน่วยอาจมีเป็นร้อยตัว ชิปเรียงกันทั้งหมดจะยาวจนใช้ไม่ได้
                  เลยใช้ combobox ที่พิมพ์ค้นได้ แล้วโชว์เฉพาะตัวที่เลือกเป็นชิป */}
              {extraOptions.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <Label>หน่วยอื่นที่ใช้กับตัวเลือกนี้ได้</Label>
                  <Combobox
                    multiple
                    items={extraOptions}
                    value={selectedExtraOptions}
                    onValueChange={(options) =>
                      setDraft({
                        ...draft,
                        extraUnitIds: new Set(options.map((option) => option.id)),
                      })
                    }
                    itemToStringLabel={unitOptionLabel}
                    filter={unitOptionFilter}
                    isItemEqualToValue={sameUnitOption}
                    limit={50}
                    disabled={busy}
                  >
                    <ComboboxInputGroup>
                      <ComboboxChips>
                        <ComboboxValue>
                          {(value) => (
                            <>
                              {value.map((option) => (
                                <ComboboxChip key={option.id} aria-label={option.label}>
                                  {option.label}
                                  <ComboboxChipRemove aria-label={`เอา ${option.label} ออก`} />
                                </ComboboxChip>
                              ))}
                              <ComboboxInput
                                placeholder={
                                  value.length > 0
                                    ? ""
                                    : `ค้นหาใน ${extraOptions.length} หน่วย`
                                }
                              />
                            </>
                          )}
                        </ComboboxValue>
                      </ComboboxChips>
                    </ComboboxInputGroup>
                    <ComboboxContent>
                      <ComboboxEmpty>ไม่พบหน่วยที่ค้นหา</ComboboxEmpty>
                      <ComboboxList>
                        {(option) => (
                          <ComboboxItem key={option.id} value={option}>
                            {option.label}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </div>
              )}

              {draft.id === null && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sku-qty">ยอดเริ่มต้น</Label>
                  <Input
                    id="sku-qty"
                    type="number"
                    min={0}
                    step={1}
                    value={draft.qty}
                    onChange={(event) => setDraft({ ...draft, qty: event.target.value })}
                    disabled={busy}
                  />
                </div>
              )}

              <Button onClick={handleSave} disabled={!canSave || busy}>
                {draft.id === null ? "เพิ่มตัวเลือก" : "บันทึกการแก้ไข"}
              </Button>
            </div>
          </>
        ) : (
          <Button variant="outline" onClick={startAdd} disabled={busy || skus === null}>
            <Plus />
            เพิ่มตัวเลือก{count > 0 ? ` (มีอยู่ ${count})` : ""}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
