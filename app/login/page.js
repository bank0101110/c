import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, PackageSearch, ShieldCheck } from "lucide-react";

import { getCurrentUser } from "@/app/server/session";
import { enabledProviders } from "@/lib/auth";
import { siteConfig } from "@/lib/site-config";
import { SignInButtons } from "@/components/auth/sign-in-buttons";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `เข้าสู่ระบบ — ${siteConfig.name}`,
};

// เปิดให้ redirect กลับได้เฉพาะ path ในเว็บนี้ กัน ?next=https://evil.example พาผู้ใช้ออกนอกเว็บ
function safeNext(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/manage";
}

export default async function LoginPage({ searchParams }) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  const callbackURL = safeNext(params?.next);

  if (user) redirect(callbackURL);

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12">
      {/* ฉากหลัง: ตารางจาง ๆ ที่ค่อย ๆ หายไปขอบภาพ + แสงนวลหลังการ์ด */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-size-[44px_44px] opacity-50 mask-[radial-gradient(ellipse_55%_45%_at_50%_45%,black,transparent)]" />
        <div className="absolute top-0 left-1/2 size-120 -translate-x-1/2 -translate-y-1/3 rounded-full bg-foreground/5 blur-3xl" />
      </div>

      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <PackageSearch className="size-5.5" />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              เข้าสู่ระบบ {siteConfig.name}
            </h1>
            <p className="text-sm text-balance text-muted-foreground">
              ล็อกอินก่อนถึงจะจัดการสินค้าและปรับสต็อกได้
            </p>
          </div>
        </div>

        <Card className="[--card-spacing:--spacing(5)]">
          <CardContent className="flex flex-col gap-4">
            <SignInButtons providers={enabledProviders} callbackURL={callbackURL} />

            <div className="flex items-start gap-2.5 border-t border-border pt-4 text-xs text-muted-foreground">
              <ShieldCheck className="mt-px size-3.5 shrink-0" />
              <p>
                ทุกครั้งที่ตัดสต็อกจะบันทึกชื่อผู้ทำไว้ในประวัติ
                และสินค้าที่คุณสร้างจะแก้ไขได้เฉพาะคุณเท่านั้น
              </p>
            </div>
          </CardContent>
        </Card>

        <Link
          href="/"
          className="mx-auto flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          กลับไปดูสต็อก
        </Link>
      </div>
    </main>
  );
}
