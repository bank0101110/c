// อัปโหลดรูปสินค้าขึ้น Google Drive ของบัญชีที่ตั้งไว้ใน .env
//
// ตั้งใจแยกขาดจากระบบล็อกอิน — ไม่ไปยุ่งกับ scope ของ Better Auth
// เพราะพอ Google OAuth ขอ scope นอกเหนือ name/email/profile เมื่อไหร่
// แอปที่ยังอยู่สถานะ Testing จะล็อกอินไม่ได้ทั้งระบบ (403 access_denied)
// ตรงนี้เลยใช้ refresh token แยกของตัวเอง ไม่ตั้งค่าก็แค่อัปโหลดไม่ได้ ล็อกอินยังปกติ
//
// ทำไมไม่ใช้ service account: Google ตัดโควตาที่เก็บของ service account ไปแล้ว
// อัปโหลดจะเจอ "Service Accounts do not have storage quota" ยกเว้นใช้ Shared Drive ของ Workspace

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const UPLOAD_URL =
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id";
const FILES_URL = "https://www.googleapis.com/drive/v3/files";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// map ชนิดไฟล์ -> นามสกุล เพื่อไม่ต้องเชื่อชื่อไฟล์ที่ผู้ใช้ส่งมา
const ALLOWED_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export function driveConfigured() {
  return Boolean(
    process.env.GOOGLE_DRIVE_CLIENT_ID &&
      process.env.GOOGLE_DRIVE_CLIENT_SECRET &&
      process.env.GOOGLE_DRIVE_REFRESH_TOKEN
  );
}

// access token อายุ ~1 ชม. เก็บไว้ใช้ซ้ำ ไม่ต้องแลกใหม่ทุกครั้งที่อัปโหลด
let cachedToken = null;

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_DRIVE_CLIENT_ID,
      client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.access_token) {
    console.error("google drive token exchange failed", data);
    return null;
  }

  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

/**
 * ลิงก์ที่ <img> โหลดได้จริง
 * ลิงก์แชร์ปกติ (drive.google.com/file/d/.../view) เป็นหน้าเว็บ ไม่ใช่ไฟล์รูป
 * และ uc?export=view ทุกวันนี้เด้งไปหน้ายืนยันบ่อย เลยใช้ endpoint thumbnail ที่คืนรูปตรง ๆ
 */
function publicImageUrl(fileId) {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
}

async function deleteFile(fileId, accessToken) {
  try {
    await fetch(`${FILES_URL}/${fileId}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${accessToken}` },
    });
  } catch (error) {
    console.error(error);
  }
}

/** อัปโหลดรูปสินค้าแล้วคืน URL ที่เอาไปเก็บใน Product.imageUrl ได้เลย */
export async function uploadProductImage(file) {
  if (!driveConfigured()) {
    return {
      ok: false,
      error:
        "ยังไม่ได้ตั้งค่า Google Drive — ใส่ GOOGLE_DRIVE_* ใน .env (ระหว่างนี้ใช้โหมด “ใส่ลิงก์” ไปก่อนได้)",
    };
  }

  // FormData ที่ไม่ได้แนบไฟล์จะได้ string ว่างกลับมา ไม่ใช่ File
  if (!file || typeof file.arrayBuffer !== "function" || !file.size) {
    return { ok: false, error: "ไม่พบไฟล์ที่อัปโหลด" };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: `ไฟล์ใหญ่เกิน ${MAX_IMAGE_BYTES / 1024 / 1024} MB` };
  }

  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    return { ok: false, error: "รองรับเฉพาะไฟล์ JPG, PNG, WebP, GIF และ AVIF" };
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return {
      ok: false,
      error: "ต่อกับ Google Drive ไม่ได้ — refresh token อาจหมดอายุหรือถูกเพิกถอน",
    };
  }

  // ชื่อไฟล์สุ่มใหม่เสมอ กันชื่อซ้ำและกันอักขระแปลก ๆ ที่ผู้ใช้ตั้งมา
  const metadata = {
    name: `${crypto.randomUUID()}.${extension}`,
    mimeType: file.type,
  };
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (folderId) metadata.parents = [folderId];

  const boundary = `stockly-${crypto.randomUUID()}`;
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: ${file.type}\r\n\r\n`,
    file,
    `\r\n--${boundary}--\r\n`,
  ]);

  const uploadResponse = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      // ต้องกำหนดเอง ไม่งั้น fetch จะใส่ content-type ตาม Blob ซึ่งไม่มี boundary
      "content-type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  const uploaded = await uploadResponse.json().catch(() => null);
  if (!uploadResponse.ok || !uploaded?.id) {
    console.error("google drive upload failed", uploaded);
    return { ok: false, error: "อัปโหลดรูปขึ้น Google Drive ไม่สำเร็จ" };
  }

  // ไม่เปิดสิทธิ์ = ไฟล์ขึ้นไปแล้วแต่หน้าเว็บโหลดรูปไม่ได้ ถือว่าล้มเหลว เก็บกวาดทิ้งเลย
  const permissionResponse = await fetch(`${FILES_URL}/${uploaded.id}/permissions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });

  if (!permissionResponse.ok) {
    console.error("google drive permission failed", await permissionResponse.text());
    await deleteFile(uploaded.id, accessToken);
    return { ok: false, error: "ตั้งสิทธิ์ให้รูปเปิดดูสาธารณะไม่สำเร็จ" };
  }

  return { ok: true, url: publicImageUrl(uploaded.id) };
}
