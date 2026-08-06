import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

// Better Auth จัดการทุก endpoint ใต้ /api/auth เอง (callback ของ OAuth, sign-out, get-session)
export const { GET, POST } = toNextJsHandler(auth);
