"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";

import { cn } from "@/lib/utils";

// เขียนเองแทนการลง sonner เพราะใช้แค่แจ้งเตือนสั้น ๆ ไม่กี่จุด
// ไม่คุ้มกับการเพิ่ม dependency แค่เรื่องเดียว

const ToastContext = createContext(null);

const VARIANTS = {
  default: {
    icon: Info,
    className: "bg-popover text-popover-foreground ring-border",
    iconClassName: "text-muted-foreground",
  },
  success: {
    icon: CheckCircle2,
    className: "bg-popover text-popover-foreground ring-border",
    iconClassName: "text-emerald-600 dark:text-emerald-400",
  },
  destructive: {
    icon: TriangleAlert,
    className:
      "bg-destructive/10 text-foreground ring-destructive/30 dark:bg-destructive/20",
    iconClassName: "text-destructive",
  },
};

const DEFAULT_DURATION = 4000;

let nextId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, variant = "default", duration = DEFAULT_DURATION }) => {
      const id = ++nextId;
      setToasts((prev) => [...prev, { id, title, description, variant }]);
      // duration: 0 = ค้างไว้จนกดปิดเอง
      if (duration > 0) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* z สูงกว่า dialog (z-50) เพราะต้องอ่านออกตอนเด้งทับ dialog ที่เปิดค้างอยู่ */}
      <div
        className="pointer-events-none fixed inset-x-0 top-3 z-100 flex flex-col items-center gap-2 px-4"
        // เป็นแค่ที่วาง ไม่ประกาศ role เอง ปล่อยให้แต่ละใบประกาศตัวเอง
      >
        {toasts.map((item) => (
          <Toast key={item.id} {...item} onDismiss={() => dismiss(item.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ title, description, variant, onDismiss }) {
  const { icon: Icon, className, iconClassName } = VARIANTS[variant] ?? VARIANTS.default;

  return (
    <div
      // ข้อความเตือนต้องขัดจังหวะ screen reader ส่วนข้อความทั่วไปรอคิวได้
      role={variant === "destructive" ? "alert" : "status"}
      aria-live={variant === "destructive" ? "assertive" : "polite"}
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl px-3.5 py-3 shadow-lg ring-1 backdrop-blur duration-200 animate-in fade-in-0 slide-in-from-top-4",
        className
      )}
    >
      <Icon className={cn("mt-px size-4 shrink-0", iconClassName)} />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="ปิดการแจ้งเตือน"
        className="-mr-1 flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
