import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";
import path from "node:path";

// อัปโหลดรูปสินค้าขึ้น Google Drive — รองรับ 2 วิธียืนยันตัวตน เลือกให้อัตโนมัติ
//
//   1) Service account  — อ่านจาก google-credentials.json
//      ⚠ ใช้ได้เฉพาะเมื่อปลายทางเป็น "Shared Drive" (ต้องมี Google Workspace)
//        เพราะไฟล์ที่ service account สร้างจะเป็นของ service account เอง
//        ซึ่งมีโควตาที่เก็บ = 0 → Google ตอบ 403 "Service Accounts do not have storage quota"
//        แชร์โฟลเดอร์จาก Drive ส่วนตัวให้มันก็ไม่ช่วย เพราะเจ้าของไฟล์ยังเป็น service account
//
//   2) OAuth refresh token — ของบัญชี Google จริง (GOOGLE_DRIVE_REFRESH_TOKEN)
//      ใช้ได้กับ Gmail ทั่วไป ไฟล์จะเป็นของบัญชีนั้นและกินโควตา 15GB ของเขา
//
// ตั้งใจแยกขาดจากระบบล็อกอิน ไม่ไปยุ่งกับ scope ของ Better Auth เพราะถ้า OAuth client
// ที่ใช้ล็อกอินขอ scope นอกเหนือ name/email/profile แล้วแอปยังอยู่สถานะ Testing
// ทุกคนจะล็อกอินไม่ได้ทั้งระบบ (403 access_denied)

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const UPLOAD_URL =
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id";
const FILES_URL = "https://www.googleapis.com/drive/v3/files";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// map ชนิดไฟล์ -> นามสกุล เพื่อไม่ต้องเชื่อชื่อไฟล์ที่ผู้ใช้ส่งมา
const ALLOWED_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

// ---------- โหลด service account key ----------

let serviceAccount = null;
let serviceAccountLoaded = false;

function getServiceAccount() {
  if (serviceAccountLoaded) return serviceAccount;
  serviceAccountLoaded = true;

  const file = process.env.GOOGLE_APPLICATION_CREDENTIALS || "google-credentials.json";
  try {
    const raw = readFileSync(path.resolve(process.cwd(), file), "utf8");
    const parsed = JSON.parse(raw);
    // ต้องมีครบทั้งคู่ถึงเซ็น JWT ได้ ไฟล์ OAuth client ธรรมดาไม่มี private_key
    if (parsed?.client_email && parsed?.private_key) serviceAccount = parsed;
  } catch {
    // ไม่มีไฟล์ = ไม่ได้ใช้วิธีนี้ ไม่ต้องส่งเสียง
  }
  return serviceAccount;
}

function hasRefreshToken() {
  return Boolean(
    process.env.GOOGLE_DRIVE_CLIENT_ID &&
      process.env.GOOGLE_DRIVE_CLIENT_SECRET &&
      process.env.GOOGLE_DRIVE_REFRESH_TOKEN
  );
}

export function driveConfigured() {
  return Boolean(getServiceAccount()) || hasRefreshToken();
}

// ---------- ขอ access token ----------

const base64url = (value) =>
  Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString(
    "base64url"
  );

/** เซ็น JWT ด้วย private key ของ service account แล้วแลกเป็น access token */
async function tokenFromServiceAccount(account) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64url({ alg: "RS256", typ: "JWT" });
  const claims = base64url({
    iss: account.client_email,
    scope: DRIVE_SCOPE,
    aud: TOKEN_URL,
    iat: issuedAt,
    exp: issuedAt + 3600,
  });

  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const assertion = `${header}.${claims}.${signer.sign(account.private_key, "base64url")}`;

  return fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
}

async function tokenFromRefreshToken() {
  return fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_DRIVE_CLIENT_ID,
      client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
}

// access token อายุ ~1 ชม. เก็บไว้ใช้ซ้ำ ไม่ต้องแลกใหม่ทุกครั้งที่อัปโหลด
let cachedToken = null;

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  // refresh token ของบัญชีจริงมาก่อน เพราะเป็นวิธีที่ใช้ได้กับ Gmail ทั่วไป
  const account = hasRefreshToken() ? null : getServiceAccount();
  const response = account
    ? await tokenFromServiceAccount(account)
    : await tokenFromRefreshToken();

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
    await fetch(`${FILES_URL}/${fileId}?supportsAllDrives=true`, {
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
        "ยังไม่ได้ตั้งค่า Google Drive — ต้องมี google-credentials.json หรือ GOOGLE_DRIVE_* ใน .env (ระหว่างนี้ใช้โหมด “ใส่ลิงก์” ไปก่อนได้)",
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
    return { ok: false, error: "ต่อกับ Google Drive ไม่ได้ — คีย์อาจหมดอายุหรือถูกเพิกถอน" };
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
    const message = uploaded?.error?.message ?? "";
    console.error("google drive upload failed", uploaded);

    // เคสที่เจอบ่อยสุดเวลาใช้ service account กับ Drive ส่วนตัว บอกทางออกไปเลย
    if (/storage quota/i.test(message)) {
      return {
        ok: false,
        error:
          "service account ไม่มีโควตาที่เก็บของตัวเอง อัปโหลดลง Drive ส่วนตัวไม่ได้ — ต้องใช้ Shared Drive (Google Workspace) หรือเปลี่ยนไปใช้ GOOGLE_DRIVE_REFRESH_TOKEN ของบัญชีจริง",
      };
    }
    if (/not been used|disabled/i.test(message)) {
      return { ok: false, error: "ยังไม่ได้เปิดใช้ Google Drive API ในโปรเจกต์ Google Cloud" };
    }
    if (/File not found/i.test(message)) {
      return { ok: false, error: "ไม่พบโฟลเดอร์ปลายทาง — เช็ค GOOGLE_DRIVE_FOLDER_ID และสิทธิ์เข้าถึง" };
    }
    return { ok: false, error: "อัปโหลดรูปขึ้น Google Drive ไม่สำเร็จ" };
  }

  // ไม่เปิดสิทธิ์ = ไฟล์ขึ้นไปแล้วแต่หน้าเว็บโหลดรูปไม่ได้ ถือว่าล้มเหลว เก็บกวาดทิ้งเลย
  const permissionResponse = await fetch(
    `${FILES_URL}/${uploaded.id}/permissions?supportsAllDrives=true`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    }
  );

  if (!permissionResponse.ok) {
    console.error("google drive permission failed", await permissionResponse.text());
    await deleteFile(uploaded.id, accessToken);
    return { ok: false, error: "ตั้งสิทธิ์ให้รูปเปิดดูสาธารณะไม่สำเร็จ" };
  }

  return { ok: true, url: publicImageUrl(uploaded.id) };
}
