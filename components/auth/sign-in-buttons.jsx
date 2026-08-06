"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PROVIDER_ICONS } from "@/components/auth/provider-icons";
import { authClient } from "@/lib/auth-client";

const PROVIDER_LABELS = {
  google: "Google",
  github: "GitHub",
};

export function SignInButtons({ providers, callbackURL = "/manage" }) {
  const [pendingProvider, setPendingProvider] = useState(null);
  const [error, setError] = useState(null);

  async function handleSignIn(provider) {
    setPendingProvider(provider);
    setError(null);

    // สำเร็จ = เบราว์เซอร์เด้งไป provider เลย ไม่ต้องเคลียร์ pending
    const result = await authClient.signIn.social({ provider, callbackURL });
    if (result?.error) {
      setError(result.error.message ?? "ล็อกอินไม่สำเร็จ");
      setPendingProvider(null);
    }
  }

  if (providers.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-dashed border-border p-3.5 text-left">
        <KeyRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="flex flex-col gap-1 text-sm">
          <span className="font-medium">ยังไม่ได้ตั้งค่า OAuth provider</span>
          <span className="text-xs text-muted-foreground">
            ใส่คีย์ใน <code className="rounded bg-muted px-1 py-0.5">.env</code>{" "}
            แล้วรีสตาร์ท dev server — ดูรายชื่อตัวแปรที่{" "}
            <code className="rounded bg-muted px-1 py-0.5">.env.example</code>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {providers.map((provider) => {
        const Icon = PROVIDER_ICONS[provider];
        const isPending = pendingProvider === provider;

        return (
          <Button
            key={provider}
            type="button"
            variant="outline"
            // ปุ่มหลักของหน้านี้ เลยไม่ยุบความสูงลงตอนจอกว้างเหมือนปุ่มทั่วไป
            className="h-11 w-full gap-3 text-sm sm:h-11"
            disabled={pendingProvider !== null}
            onClick={() => handleSignIn(provider)}
          >
            {isPending ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              Icon && <Icon className="size-5" />
            )}
            {isPending
              ? "กำลังพาไปหน้าล็อกอิน..."
              : `เข้าสู่ระบบด้วย ${PROVIDER_LABELS[provider] ?? provider}`}
          </Button>
        );
      })}

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
