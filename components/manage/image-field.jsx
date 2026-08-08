"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImageOff, Link2, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadProductImageAction } from "@/app/manage/actions";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif";

// เช็คคร่าว ๆ ตรงนี้เพื่อบอกผู้ใช้ทันทีที่เลือกไฟล์ ไม่ต้องรอถึงตอนกดบันทึก
// ของจริงเซิร์ฟเวอร์เช็คซ้ำอีกรอบใน lib/supabase-storage.js เพราะฝั่ง client เชื่อไม่ได้
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * อัปโหลดไฟล์ที่ผู้ใช้เลือกค้างไว้ — ให้ฟอร์มเรียกตอนกดบันทึก
 * คืน { ok, url } เหมือน action เดิม
 */
export async function uploadPendingImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  return uploadProductImageAction(formData);
}

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
 *
 * ไฟล์ที่เลือกยัง "ไม่" ถูกอัปโหลดทันที แค่พรีวิวจากในเครื่องแล้วส่ง File กลับไปให้ฟอร์ม
 * ถือไว้ผ่าน onPendingFileChange — ฟอร์มค่อยเรียก uploadPendingImage() ตอนกดบันทึก
 * ทำแบบนี้เพราะกดยกเลิกกลางคันจะได้ไม่มีไฟล์ขยะค้างใน bucket
 */
export function ImageField({
  id,
  value,
  onChange,
  pendingFile = null,
  onPendingFileChange,
  disabled,
}) {
  const [mode, setMode] = useState("upload");
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const busy = disabled;

  // พรีวิวจากไฟล์ในเครื่อง ไม่ต้องรอ network
  const previewUrl = useMemo(
    () => (pendingFile ? URL.createObjectURL(pendingFile) : null),
    [pendingFile]
  );

  // object URL ค้างในหน่วยความจำจนกว่าจะ revoke เลยผูกอายุไว้กับไฟล์ที่เลือกอยู่
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function handleFile(event) {
    const file = event.target.files?.[0];
    // เคลียร์ค่า input ทันที ไม่งั้นเลือกไฟล์เดิมซ้ำจะไม่ยิง onChange อีก
    event.target.value = "";
    if (!file) return;

    if (!ACCEPT.split(",").includes(file.type)) {
      setError("รองรับเฉพาะไฟล์ JPG, PNG, WebP, GIF และ AVIF");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(`ไฟล์ใหญ่เกิน ${MAX_IMAGE_BYTES / 1024 / 1024} MB`);
      return;
    }

    setError(null);
    // ไฟล์ใหม่มาแทนลิงก์เดิมเสมอ ไม่งั้นจะงงว่าตกลงจะเอารูปไหน
    onChange("");
    onPendingFileChange(file);
  }

  function clearImage() {
    onChange("");
    onPendingFileChange(null);
    setError(null);
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
        {previewUrl || value ? (
          // ไฟล์ที่เพิ่งเลือกมาก่อนลิงก์เดิมเสมอ เพราะมันคือสิ่งที่จะถูกบันทึกจริง
          <Preview key={previewUrl ?? value} url={previewUrl ?? value} />
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
                <Upload />
                {previewUrl || value ? "เปลี่ยนรูป" : "เลือกไฟล์รูป"}
              </Button>
              {/* เหลือไว้แค่ข้อจำกัดของไฟล์ ซึ่งผู้ใช้ต้องรู้ก่อนเลือก ที่เหลือเป็นกลไกหลังบ้าน */}
              <p className="text-xs text-muted-foreground">
                JPG, PNG, WebP, GIF, AVIF ไม่เกิน 5 MB
              </p>
            </>
          ) : (
            <>
              <Input
                id={id}
                value={value ?? ""}
                onChange={(event) => {
                  // พิมพ์ลิงก์เอง = ทิ้งไฟล์ที่เลือกค้างไว้ ไม่งั้นจะมีสองแหล่งแย่งกัน
                  onPendingFileChange(null);
                  onChange(event.target.value);
                  setError(null);
                }}
                placeholder="https://..."
                disabled={busy}
              />
            </>
          )}

          {(previewUrl || value) && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="self-start"
              disabled={busy}
              onClick={clearImage}
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
