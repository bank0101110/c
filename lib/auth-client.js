"use client";

import { createAuthClient } from "better-auth/react";

// baseURL ไม่ต้องใส่ — client เรียก /api/auth ของ origin เดียวกันอยู่แล้ว
export const authClient = createAuthClient();
