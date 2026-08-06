"use client";

import { useState } from "react";
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
      className="size-7 rounded-full object-cover"
    />
  );
}

export function UserMenu({ user }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  if (!user) {
    return (
      <Button size="sm" variant="outline" render={<a href="/login" />}>
        <LogIn />
        เข้าสู่ระบบ
      </Button>
    );
  }

  async function handleSignOut() {
    setIsPending(true);
    await authClient.signOut();
    // Server Component ถือ session อยู่ ต้อง refresh ไม่งั้นยังเห็นชื่อตัวเองค้าง
    router.refresh();
    setIsPending(false);
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
        onClick={handleSignOut}
        disabled={isPending}
        aria-label="ออกจากระบบ"
      >
        <LogOut />
      </Button>
    </div>
  );
}
