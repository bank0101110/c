"use client";

import { useRef, useState } from "react";
import { ImageOff, Link2, Loader2, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadProductImageAction } from "@/app/manage/actions";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif";

function Preview({ url }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
      {failed ? (
        <ImageOff className="size-5 text-muted-foreground" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      )}
    </div>
  );
}

/**
 * ช่องรูปสินค้าที่รับได้ 2 ทาง — อัปโหลดไฟล์ (เก็บที่ Supabase Storage) หรือวางลิงก์เอง
 * ทั้งสองทางจบที่ค่าเดียวกันคือ URL string ที่ส่งกลับผ่าน onChange
 */
export function ImageField({ id, value, onChange, disabled }) {
  const [mode, setMode] = useState("upload");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const busy = disabled || uploading;

  async function handleFile(event) {
    const file = event.target.files?.[0];
    // เคลียร์ค่า input ทันที ไม่งั้นเลือกไฟล์เดิมซ้ำจะไม่ยิง onChange อีก
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadProductImageAction(formData);
    setUploading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    onChange(result.url);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>รูปภาพ</Label>

        {/* สองปุ่มสลับโหมด ไม่ใช่ dropdown เพราะมีแค่สองทางเลือก */}
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

      <div className="flex items-start gap-2.5">
        {value ? (
          <Preview key={value} url={value} />
        ) : (
          <div className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40">
            <ImageOff className="size-5 text-muted-foreground" />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {mode === "upload" ? (
            <>
              <input
                ref={fileInputRef}
                id={id}
                type="file"
                accept={ACCEPT}
                onChange={handleFile}
                disabled={busy}
                className="sr-only"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
                {uploading ? "กำลังอัปโหลด..." : value ? "เปลี่ยนรูป" : "เลือกไฟล์รูป"}
              </Button>
              <p className="text-xs text-muted-foreground">
                เก็บไว้ใน Google Drive — JPG, PNG, WebP, GIF, AVIF ไม่เกิน 5 MB
              </p>
            </>
          ) : (
            <>
              <Input
                id={id}
                value={value ?? ""}
                onChange={(event) => {
                  onChange(event.target.value);
                  setError(null);
                }}
                placeholder="https://..."
                disabled={busy}
              />
              <p className="text-xs text-muted-foreground">
                วางลิงก์รูปจากเว็บอื่น ระบบไม่ได้เก็บไฟล์ให้ — ลิงก์ตายเมื่อไหร่รูปก็หาย
              </p>
            </>
          )}

          {value && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="self-start"
              disabled={busy}
              onClick={() => {
                onChange("");
                setError(null);
              }}
            >
              <Trash2 />
              เอารูปออก
            </Button>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
