"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, User as UserIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

import { authClient } from "@/lib/auth-client";

function Avatar({ user }) {
  const [failed, setFailed] = useState(false);

  if (!user.image || failed) {
    return (
      <span className="flex size-7 items-center justify-center rounded-full bg-muted">
        <UserIcon className="size-3.5 text-muted-foreground" />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={user.image}
      alt=""
      onError={() => setFailed(true)}
      className="size-7 rounded-full object-cover ring-2 ring-transparent transition-all duration-300 hover:scale-110 hover:ring-foreground/20"
    />
  );
}

// ใช้ร่วมกันระหว่างเมนูบนแถบ navbar กับเมนูมือถือ — ตรรกะออกจากระบบต้องอยู่ที่เดียว
function useSignOut(onDone) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function signOut() {
    setIsPending(true);
    await authClient.signOut();
    // Server Component ถือ session อยู่ ต้อง refresh ไม่งั้นยังเห็นชื่อตัวเองค้าง
    router.refresh();
    setIsPending(false);
    onDone?.();
  }

  return { signOut, isPending };
}

/** เมนูผู้ใช้บนแถบ navbar — ใช้บนจอ sm ขึ้นไป (มือถือดูที่ AccountPanel ในเมนูสไลด์) */
export function UserMenu({ user }) {
  const { signOut, isPending } = useSignOut();

  if (!user) {
    return (
      <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/login" />}>
        <LogIn />
        เข้าสู่ระบบ
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Avatar user={user} />
      <span className="hidden max-w-32 truncate text-sm font-medium text-foreground sm:inline">
        {user.name || user.email}
      </span>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={signOut}
        disabled={isPending}
        aria-label="ออกจากระบบ"
      >
        <LogOut />
      </Button>
    </div>
  );
}

/**
 * ส่วนบัญชีผู้ใช้ในเมนูมือถือ
 *
 * ต่างจาก UserMenu ตรงที่มีที่ให้โชว์ชื่อเต็มกับปุ่มที่มีข้อความกำกับ ไม่ต้องบีบให้เหลือแต่ไอคอน
 */
export function AccountPanel({ user, onDone }) {
  const { signOut, isPending } = useSignOut(onDone);

  if (!user) {
    return (
      <Button
        nativeButton={false}
        className="w-full"
        render={<Link href="/login" onClick={onDone} />}
      >
        <LogIn />
        เข้าสู่ระบบ
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Avatar user={user} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {user.name || user.email}
      </span>
      <Button size="sm" variant="outline" onClick={signOut} disabled={isPending}>
        <LogOut />
        ออกจากระบบ
      </Button>
    </div>
  );
}
