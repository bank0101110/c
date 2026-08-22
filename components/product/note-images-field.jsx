"use client";

import { useEffect, useRef, useState } from "react";
import { ImageOff, Link2, Plus, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  IMAGE_ACCEPT,
  MAX_SOURCE_MB,
  imageSourceError,
  shrinkForUpload,
} from "@/components/manage/image-field";

function Thumb({ src, onRemove, disabled, label }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
      {failed ? (
        <div className="flex size-full items-center justify-center">
          <ImageOff className="size-5 text-muted-foreground" />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      )}

      <Button
        type="button"
        size="icon-xs"
        variant="secondary"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`ลบ${label}`}
        className="absolute top-0.5 right-0.5 rounded-md shadow-sm"
      >
        <X />
      </Button>
    </div>
  );
}

/**
 * ช่องรูปของหมายเหตุ — ใส่ได้หลายรูป ทั้งอัปโหลดจากเครื่องและวางลิงก์
 *
 * ต่างจาก ImageField ตรงที่ถือเป็น "รายการ" ไม่ใช่ค่าเดียว แต่ยังไม่อัปโหลดตอนเลือกเหมือนกัน
 * — เก็บ File ไว้ในรายการก่อน ฟอร์มค่อยอัปตอนกดบันทึก กดยกเลิกกลางคันจะได้ไม่มีไฟล์ขยะค้างใน bucket
 *
 * items: [{ key, url }] = รูปที่มีลิงก์แล้ว, [{ key, file, preview }] = ไฟล์ที่รออัป
 * onChange: รับ updater เสมอ (แบบ setState) เพราะตอนเลือกหลายไฟล์จะต่อท้ายทีละไฟล์ที่ย่อเสร็จ
 */
export function NoteImagesField({ id, items, onChange, max, disabled }) {
  const [mode, setMode] = useState("upload");
  const [error, setError] = useState(null);
  const [busyCount, setBusyCount] = useState(0);
  const [link, setLink] = useState("");
  const fileInputRef = useRef(null);

  // object URL ของพรีวิวไม่ถูกคืนเองจนกว่าจะ revoke — เก็บไว้ล้างตอนกล่องปิด
  const previews = useRef(new Set());

  useEffect(
    () => () => {
      for (const url of previews.current) URL.revokeObjectURL(url);
      previews.current.clear();
    },
    []
  );

  const full = items.length >= max;
  const busy = disabled || busyCount > 0;
  const remaining = max - items.length;

  function removeAt(index) {
    const target = items[index];
    if (target?.preview) {
      URL.revokeObjectURL(target.preview);
      previews.current.delete(target.preview);
    }
    onChange((current) => current.filter((_, at) => at !== index));
    setError(null);
  }

  async function handleFiles(event) {
    const picked = [...(event.target.files ?? [])];
    // เคลียร์ค่า input ทันที ไม่งั้นเลือกไฟล์เดิมซ้ำจะไม่ยิง onChange อีก
    event.target.value = "";
    if (picked.length === 0) return;

    // เลือกมาเกินโควตาก็รับเท่าที่เหลือ แล้วบอกไปว่าตัดทิ้งกี่ไฟล์ ดีกว่าตีกลับทั้งชุด
    const accepted = picked.slice(0, remaining);
    const dropped = picked.length - accepted.length;

    setError(dropped > 0 ? `ใส่ได้อีก ${remaining} รูป — ตัดออก ${dropped} ไฟล์` : null);
    setBusyCount((count) => count + accepted.length);

    for (const file of accepted) {
      const sourceError = imageSourceError(file);
      if (sourceError) {
        setError(`${file.name}: ${sourceError}`);
        setBusyCount((count) => count - 1);
        continue;
      }

      const ready = await shrinkForUpload(file);
      setBusyCount((count) => count - 1);

      if (ready.error) {
        setError(`${file.name}: ${ready.error}`);
        continue;
      }

      const preview = URL.createObjectURL(ready.file);
      previews.current.add(preview);
      // อ่าน items จาก callback ไม่ได้ (มันเป็น prop) เลยต้องต่อท้ายทีละไฟล์ผ่านตัวแม่
      onChange((current) => [
        ...current,
        { key: `${file.name}-${preview}`, file: ready.file, preview },
      ]);
    }
  }

  function addLink() {
    const url = link.trim();
    if (!url || full) return;

    if (items.some((item) => item.url === url)) {
      setError("ใส่รูปนี้ไว้แล้ว");
      return;
    }

    onChange((current) => [...current, { key: url, url }]);
    setLink("");
    setError(null);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>
          รูปจุดวาง{" "}
          <span className="font-normal text-muted-foreground">
            {items.length}/{max}
          </span>
        </Label>

        <div className="flex gap-1">
          <Button
            type="button"
            size="xs"
            variant={mode === "upload" ? "secondary" : "ghost"}
            aria-pressed={mode === "upload"}
            onClick={() => setMode("upload")}
            disabled={busy}
          >
            <Upload />
            อัปโหลด
          </Button>
          <Button
            type="button"
            size="xs"
            variant={mode === "url" ? "secondary" : "ghost"}
            aria-pressed={mode === "url"}
            onClick={() => setMode("url")}
            disabled={busy}
          >
            <Link2 />
            ใส่ลิงก์
          </Button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <Thumb
              key={item.key}
              src={item.preview ?? item.url}
              label={`รูปที่ ${index + 1}`}
              disabled={busy}
              onRemove={() => removeAt(index)}
            />
          ))}
        </div>
      )}

      {mode === "upload" ? (
        <>
          <input
            ref={fileInputRef}
            id={id}
            type="file"
            accept={IMAGE_ACCEPT}
            multiple
            onChange={handleFiles}
            disabled={busy || full}
            className="sr-only"
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={busy || full}
            onClick={() => fileInputRef.current?.click()}
          >
            {busyCount > 0 ? <Spinner /> : <Plus />}
            {busyCount > 0 ? "กำลังย่อรูป…" : items.length > 0 ? "เพิ่มรูป" : "เลือกไฟล์รูป"}
          </Button>
          <p className="text-xs text-muted-foreground">
            เลือกหลายไฟล์พร้อมกันได้ ระบบย่อรูปให้อัตโนมัติ — JPG, PNG, WebP, GIF, AVIF ไม่เกิน{" "}
            {MAX_SOURCE_MB} MB ต่อไฟล์
          </p>
        </>
      ) : (
        <div className="flex gap-2">
          <Input
            id={id}
            value={link}
            onChange={(event) => {
              setLink(event.target.value);
              setError(null);
            }}
            onKeyDown={(event) => {
              // อยู่ใน Dialog กด Enter แล้วอย่าให้ไปโดนปุ่มบันทึกของฟอร์ม
              if (event.key !== "Enter") return;
              event.preventDefault();
              addLink();
            }}
            placeholder="https://..."
            disabled={busy || full}
          />
          <Button
            type="button"
            variant="outline"
            onClick={addLink}
            disabled={busy || full || !link.trim()}
            className="shrink-0"
          >
            <Plus />
            เพิ่ม
          </Button>
        </div>
      )}

      {full && <p className="text-xs text-muted-foreground">ครบ {max} รูปแล้ว ลบรูปเก่าก่อนถึงจะเพิ่มได้</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
