"use client";

import { useMemo, useState, useTransition } from "react";
import { Layers, Package, Pencil, Plus, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  createSkuAction,
  createUnitTypeAction,
  deleteSkuAction,
  getProductSkusAction,
  saveSkuAction,
  setSkusDefaultUnitAction,
  setSkusUnitsAction,
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
  BASE_UNIT_FACTOR,
  baseUnitTypes,
  sameUnitOption,
  sortUnits,
  skuUnits,
  unitOptionFilter,
  unitOptionLabel,
  unitOptions,
} from "@/lib/stock";
import { thumbnailUrl } from "@/lib/images";

// "ใช้หน่วยหลัก" ใน Select — ใช้ string ว่างไม่ได้ Base UI ถือว่าเป็นยังไม่ได้เลือก
const BASE_DEFAULT = "base";

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
    // หน่วยที่หน้าสินค้าจะเลือกให้ตอนคนมากดตัดสต็อก — BASE_DEFAULT = ใช้หน่วยหลัก
    defaultUnitId: BASE_DEFAULT,
    qty: "0",
  };
}

/** หน่วยเริ่มต้นต้องอยู่ในชุดหน่วยของตัวเลือกเสมอ ถอดหน่วยนั้นออกก็ต้องถอยไปใช้หน่วยหลัก */
function keepDefaultUnit(defaultUnitId, unitTypeId, extraUnitIds) {
  if (defaultUnitId === BASE_DEFAULT) return BASE_DEFAULT;
  const allowed = new Set([String(unitTypeId), ...[...extraUnitIds].map(String)]);
  return allowed.has(defaultUnitId) ? defaultUnitId : BASE_DEFAULT;
}

function SkuRow({ sku, onEdit, onDelete, busy, selected, onToggle }) {
  const units = skuUnits(sku);
  const defaultUnit = units.find((unit) => unit.id === sku.defaultUnitTypeId);

  return (
    <div
      className={`flex items-center gap-2.5 rounded-lg border p-2 transition-colors ${
        selected ? "border-primary bg-primary/5" : "border-border"
      }`}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={() => onToggle(sku.id)}
        disabled={busy}
        aria-label={`เลือก ${sku.name}`}
      />
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
          {/* ตัวที่ยังไม่ได้ตั้งไม่ต้องโชว์ — หน้าสินค้าจะใช้หน่วยหลักอยู่แล้ว */}
          {defaultUnit && (
            <Badge variant="secondary" className="text-[0.65rem]">
              เริ่มต้น {defaultUnit.name} (×{defaultUnit.qty})
            </Badge>
          )}
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
export function SkusDialog({ product, unitTypes, setUnitTypes, onCountChange }) {
  const [open, setOpen] = useState(false);
  const [skus, setSkus] = useState(null); // null = ยังไม่ได้โหลด
  const [draft, setDraft] = useState(null); // null = ยังไม่ได้เปิดฟอร์ม
  // ติ๊กไว้เพื่อแก้หน่วยพร้อมกันหลายตัว — ชื่อ/รหัส/รูป เป็นของเฉพาะตัว แก้หมู่ไม่ได้
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkUnitId, setBulkUnitId] = useState("");
  const [bulkExtraIds, setBulkExtraIds] = useState(() => new Set());
  const [bulkDefaultUnitId, setBulkDefaultUnitId] = useState("");
  // ฟอร์มสร้างหน่วยในตัว — หน่วยที่ต้องใช้มักนึกออกตอนกรอก SKU ไม่ใช่ตอนอยู่แท็บหน่วยนับ
  const [showNewUnit, setShowNewUnit] = useState(false);
  const [unitName, setUnitName] = useState("");
  const [unitQty, setUnitQty] = useState("1");
  const [unitError, setUnitError] = useState(null);
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

  // หน่วยเริ่มต้นตั้งได้เฉพาะหน่วยที่ตัวเลือกนี้รองรับ = หน่วยหลัก + หน่วยเสริมที่เลือกไว้
  const draftUnits = useMemo(() => {
    if (!draft) return [];
    const ids = new Set([Number(draft.unitTypeId), ...draft.extraUnitIds]);
    return sortUnits(unitTypes.filter((unitType) => ids.has(unitType.id)));
  }, [unitTypes, draft]);

  // Base UI ต้องได้ map value -> label ถึงจะโชว์ชื่อหน่วยที่เลือกบนปุ่มแทน id ดิบ
  const draftUnitItems = useMemo(
    () => ({
      [BASE_DEFAULT]: "ใช้หน่วยหลัก",
      ...Object.fromEntries(
        draftUnits.map((unit) => [String(unit.id), `${unit.name} (×${unit.qty})`])
      ),
    }),
    [draftUnits]
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

  function toggleOne(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = skus !== null && skus.length > 0 && selectedIds.size === skus.length;

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set((skus ?? []).map((s) => s.id)));
  }

  // หน่วยเสริมของแถบแก้หมู่ ต้องไม่ให้เลือกหน่วยหลักซ้ำเข้าไปด้วย
  const bulkExtraOptions = useMemo(
    () => unitOptions(unitTypes).filter((option) => String(option.id) !== bulkUnitId),
    [unitTypes, bulkUnitId]
  );
  const bulkSelectedExtras = useMemo(
    () => bulkExtraOptions.filter((option) => bulkExtraIds.has(option.id)),
    [bulkExtraOptions, bulkExtraIds]
  );
  const bulkSelectedBase =
    baseUnitOptions.find((option) => String(option.id) === bulkUnitId) ?? null;

  // หน่วยเริ่มต้นแบบหมู่เลือกได้จากหน่วยทั้งระบบ ตัวที่ SKU ไหนไม่รองรับ server จะข้ามให้
  const allUnitOptions = useMemo(() => unitOptions(unitTypes), [unitTypes]);
  const bulkSelectedDefault =
    allUnitOptions.find((option) => String(option.id) === bulkDefaultUnitId) ?? null;

  function applyBulkUnits() {
    if (selectedIds.size === 0 || !bulkUnitId) return;

    const ids = [...selectedIds];
    startTransition(async () => {
      const result = await setSkusUnitsAction(ids, Number(bulkUnitId), [...bulkExtraIds]);
      if (!result.ok) {
        toast({
          variant: "destructive",
          title: "ตั้งหน่วยไม่สำเร็จ",
          description: result.error,
          duration: 0,
        });
        return;
      }

      const updated = new Map(result.skus.map((sku) => [sku.id, sku]));
      setSkus((prev) => (prev ?? []).map((sku) => updated.get(sku.id) ?? sku));
      setSelectedIds(new Set());
      toast({ variant: "success", title: `ตั้งหน่วยให้ ${result.skus.length} ตัวเลือกแล้ว` });
    });
  }

  /**
   * ตั้งหน่วยเริ่มต้นให้ตัวที่ติ๊กไว้ — unitId = null คือกลับไปใช้หน่วยหลัก
   *
   * ไม่ล้างที่เลือกไว้หลังทำเสร็จ (ต่างจากตั้งหน่วยหลัก) เพราะถ้ามีตัวที่ถูกข้าม
   * ผู้ใช้มักอยากไล่เพิ่มหน่วยให้ตัวนั้นแล้วกดซ้ำอีกที
   */
  function applyBulkDefaultUnit(unitId) {
    if (selectedIds.size === 0) return;

    const ids = [...selectedIds];
    startTransition(async () => {
      const result = await setSkusDefaultUnitAction(ids, unitId);
      if (!result.ok) {
        toast({
          variant: "destructive",
          title: "ตั้งหน่วยเริ่มต้นไม่สำเร็จ",
          description: result.error,
          duration: 0,
        });
        return;
      }

      const updated = new Map(result.skus.map((sku) => [sku.id, sku]));
      setSkus((prev) => (prev ?? []).map((sku) => updated.get(sku.id) ?? sku));
      toast({
        variant: "success",
        title:
          unitId === null
            ? `กลับไปใช้หน่วยหลักให้ ${result.appliedCount} ตัวเลือกแล้ว`
            : `ตั้งหน่วยเริ่มต้นให้ ${result.appliedCount} ตัวเลือกแล้ว`,
        description:
          result.skippedCount > 0
            ? `ข้าม ${result.skippedCount} ตัวที่ยังไม่ได้เพิ่มหน่วยนี้ไว้`
            : undefined,
      });
    });
  }

  /**
   * สร้างหน่วยใหม่โดยไม่ต้องปิดกล่องนี้ออกไปที่แท็บหน่วยนับ
   *
   * ตัวคูณ 1 = หน่วยหลักได้ เลยเลือกให้เป็นหน่วยหลักของฟอร์มที่เปิดอยู่
   * ตัวคูณมากกว่า 1 = หน่วยเสริม ติ๊กเข้าไปในชุดหน่วยอื่นให้เลย
   */
  function handleCreateUnit() {
    const name = unitName.trim();
    const qty = Number(unitQty);
    if (!name || !Number.isInteger(qty) || qty < 1) return;

    startTransition(async () => {
      const result = await createUnitTypeAction(name, qty);

      // ชื่อซ้ำกับที่มีอยู่ ก็หยิบตัวเดิมมาใช้เลย ผู้ใช้จะได้ไม่ต้องไปไล่หาเอง
      const unit = result.ok ? result.unitType : result.existing;
      if (!unit) {
        setUnitError(result.error);
        return;
      }

      setUnitTypes?.((prev) =>
        prev.some((item) => item.id === unit.id) ? prev : sortUnits([...prev, unit])
      );

      if (draft) {
        setDraft((prev) =>
          unit.qty === BASE_UNIT_FACTOR
            ? { ...prev, unitTypeId: String(unit.id) }
            : { ...prev, extraUnitIds: new Set([...prev.extraUnitIds, unit.id]) }
        );
      }

      setUnitName("");
      setUnitQty("1");
      setUnitError(result.ok ? null : `${result.error} — เลือกตัวเดิมให้แล้ว`);
      if (result.ok) setShowNewUnit(false);
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
      defaultUnitId: sku.defaultUnitTypeId ? String(sku.defaultUnitTypeId) : BASE_DEFAULT,
      // ยอดแก้ที่นี่ไม่ได้ ต้องไปปรับผ่านหน้าสินค้าเพื่อให้มีประวัติกำกับ
      qty: String(sku.qty),
    });
  }

  const canSave = Boolean(draft?.name.trim()) && Boolean(draft?.unitTypeId);

  function handleSave() {
    if (!canSave) return;

    const current = draft;
    const isEdit = current.id !== null;
    const defaultUnitId =
      current.defaultUnitId === BASE_DEFAULT ? null : Number(current.defaultUnitId);

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
            current.code.trim() || null,
            defaultUnitId
          )
        : await createSkuAction(
            product.id,
            current.name.trim(),
            imageUrl,
            Number(current.unitTypeId),
            Number(current.qty) || 0,
            [...current.extraUnitIds],
            current.code.trim() || null,
            defaultUnitId
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

        {skus !== null && skus.length > 0 && (
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <Checkbox
              checked={allSelected}
              indeterminate={selectedIds.size > 0 && !allSelected}
              onCheckedChange={toggleAll}
              disabled={busy}
              aria-label="เลือกตัวเลือกทั้งหมด"
            />
            <span className="text-xs text-muted-foreground">
              {selectedIds.size > 0 ? `เลือกไว้ ${selectedIds.size}` : "เลือกทั้งหมด"}
            </span>
          </div>
        )}

        {/* แถบแก้หน่วยพร้อมกันหลายตัว — โผล่เมื่อติ๊กไว้อย่างน้อยหนึ่ง */}
        {selectedIds.size > 0 && (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/50 p-2.5">
            <p className="text-xs font-medium">
              ตั้งหน่วยให้ {selectedIds.size} ตัวเลือกที่เลือกไว้
            </p>

            <div className="grid gap-2 sm:grid-cols-2">
              <Combobox
                items={baseUnitOptions}
                value={bulkSelectedBase}
                onValueChange={(option) => {
                  setBulkUnitId(option ? String(option.id) : "");
                  // หน่วยหลักตัวใหม่ต้องไม่ค้างอยู่ในหน่วยเสริมด้วย
                  if (option) {
                    setBulkExtraIds((prev) => {
                      const next = new Set(prev);
                      next.delete(option.id);
                      return next;
                    });
                  }
                }}
                itemToStringLabel={unitOptionLabel}
                filter={unitOptionFilter}
                isItemEqualToValue={sameUnitOption}
                limit={50}
                autoHighlight
                disabled={busy}
              >
                <ComboboxInputGroup>
                  <ComboboxInput placeholder="หน่วยหลัก (×1)" />
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

              <Combobox
                multiple
                items={bulkExtraOptions}
                value={bulkSelectedExtras}
                onValueChange={(options) =>
                  setBulkExtraIds(new Set(options.map((option) => option.id)))
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
                            placeholder={value.length > 0 ? "" : "หน่วยอื่น (ไม่บังคับ)"}
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

            <div className="flex gap-2">
              <Button size="sm" onClick={applyBulkUnits} disabled={busy || !bulkUnitId}>
                ตั้งหน่วยให้ทั้งหมด
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
                disabled={busy}
              >
                <X />
                ล้างที่เลือก
              </Button>
            </div>

            <p className="text-[0.7rem] text-muted-foreground">
              แก้ได้เฉพาะหน่วย — ชื่อ รหัส และรูป เป็นของเฉพาะตัว ต้องแก้ทีละอัน
            </p>

            <Separator />

            {/* ตั้งหน่วยเริ่มต้นแยกจากหน่วยหลัก เพราะเป็นคนละเรื่องกัน: หน่วยหลักคือหน่วยที่
                เก็บยอด (×1 เสมอ) ส่วนอันนี้คือหน่วยที่หน้าสินค้าจะเลือกให้ตอนตัดสต็อก */}
            <p className="text-xs font-medium">หน่วยเริ่มต้นตอนตัดสต็อก</p>

            <div className="grid gap-2 sm:grid-cols-2">
              <Combobox
                items={allUnitOptions}
                value={bulkSelectedDefault}
                onValueChange={(option) =>
                  setBulkDefaultUnitId(option ? String(option.id) : "")
                }
                itemToStringLabel={unitOptionLabel}
                filter={unitOptionFilter}
                isItemEqualToValue={sameUnitOption}
                limit={50}
                autoHighlight
                disabled={busy}
              >
                <ComboboxInputGroup>
                  <ComboboxInput placeholder={`ค้นหาใน ${allUnitOptions.length} หน่วย`} />
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

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => applyBulkDefaultUnit(Number(bulkDefaultUnitId))}
                  disabled={busy || !bulkDefaultUnitId}
                >
                  ตั้งให้ {selectedIds.size} ตัว
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => applyBulkDefaultUnit(null)}
                  disabled={busy}
                >
                  กลับไปใช้หน่วยหลัก
                </Button>
              </div>
            </div>

            <p className="text-[0.7rem] text-muted-foreground">
              ตัวที่ยังไม่มีหน่วยนี้ในรายการหน่วยของมันจะถูกข้าม — เพิ่มหน่วยให้ก่อนแล้วกดซ้ำได้
            </p>
          </div>
        )}

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
                selected={selectedIds.has(sku.id)}
                onToggle={toggleOne}
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
                <div className="flex items-center justify-between gap-2">
                  <Label>หน่วยหลัก</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    disabled={busy}
                    onClick={() => {
                      setShowNewUnit((prev) => !prev);
                      setUnitError(null);
                    }}
                  >
                    {showNewUnit ? <X /> : <Plus />}
                    {showNewUnit ? "ยกเลิก" : "สร้างหน่วยใหม่"}
                  </Button>
                </div>
                <Combobox
                  items={baseUnitOptions}
                  value={selectedBaseOption}
                  onValueChange={(option) => {
                    // เปลี่ยนหน่วยหลักแล้วตัวเดิมอาจไปซ้ำอยู่ในหน่วยเสริม ต้องถอดออก
                    const extraUnitIds = new Set(
                      [...draft.extraUnitIds].filter((id) => id !== option?.id)
                    );
                    setDraft({
                      ...draft,
                      unitTypeId: option ? String(option.id) : "",
                      extraUnitIds,
                      defaultUnitId: keepDefaultUnit(
                        draft.defaultUnitId,
                        option?.id ?? "",
                        extraUnitIds
                      ),
                    });
                  }}
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

                {showNewUnit && (
                  <div className="mt-1 flex flex-col gap-2 rounded-lg border border-dashed border-border p-2.5">
                    <div className="flex items-end gap-2">
                      <div className="flex flex-1 flex-col gap-1.5">
                        <Label htmlFor="new-unit-name">ชื่อหน่วย</Label>
                        <Input
                          id="new-unit-name"
                          value={unitName}
                          onChange={(event) => setUnitName(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter") return;
                            // อยู่ในกล่องที่มีปุ่มบันทึกอยู่แล้ว กัน Enter ไปยิงตัวนั้นแทน
                            event.preventDefault();
                            handleCreateUnit();
                          }}
                          placeholder="เช่น ลัง"
                          disabled={busy}
                        />
                      </div>
                      <div className="flex w-20 flex-col gap-1.5">
                        <Label htmlFor="new-unit-qty">ตัวคูณ</Label>
                        <Input
                          id="new-unit-qty"
                          type="number"
                          min={1}
                          step={1}
                          value={unitQty}
                          onChange={(event) => setUnitQty(event.target.value)}
                          disabled={busy}
                        />
                      </div>
                    </div>

                    <p className="text-[0.7rem] text-muted-foreground">
                      ตัวคูณ 1 = ใช้เป็นหน่วยหลักได้ · มากกว่า 1 = เพิ่มเข้าหน่วยอื่นให้เลย
                    </p>

                    {unitError && <p className="text-xs text-destructive">{unitError}</p>}

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleCreateUnit}
                      disabled={busy || !unitName.trim() || Number(unitQty) < 1}
                    >
                      <Plus />
                      เพิ่มหน่วยนับ
                    </Button>
                  </div>
                )}
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
                    onValueChange={(options) => {
                      const extraUnitIds = new Set(options.map((option) => option.id));
                      setDraft({
                        ...draft,
                        extraUnitIds,
                        defaultUnitId: keepDefaultUnit(
                          draft.defaultUnitId,
                          draft.unitTypeId,
                          extraUnitIds
                        ),
                      });
                    }}
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

              {/* หน่วยที่หน้าสินค้าจะเลือกให้ทุกคนตอนติ๊กตัวเลือกนี้ — มีหน่วยเดียวก็ไม่ต้องถาม */}
              {draftUnits.length > 1 && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sku-default-unit">หน่วยเริ่มต้นตอนตัดสต็อก</Label>
                  <Select
                    items={draftUnitItems}
                    value={draft.defaultUnitId}
                    onValueChange={(value) => setDraft({ ...draft, defaultUnitId: value })}
                    disabled={busy}
                  >
                    <SelectTrigger id="sku-default-unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={BASE_DEFAULT}>ใช้หน่วยหลัก</SelectItem>
                      {draftUnits.map((unit) => (
                        <SelectItem key={unit.id} value={String(unit.id)}>
                          {unit.name} (×{unit.qty})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[0.7rem] text-muted-foreground">
                    คนที่เปิดหน้าสินค้าจะได้หน่วยนี้ให้อัตโนมัติ เปลี่ยนเองตอนนั้นได้
                  </p>
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
