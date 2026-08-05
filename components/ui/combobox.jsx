"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const Combobox = ComboboxPrimitive.Root

function ComboboxInputGroup({
  className,
  ...props
}) {
  return (
    <ComboboxPrimitive.InputGroup
      data-slot="combobox-input-group"
      className={cn(
        "flex min-h-10 w-full cursor-text flex-wrap items-center gap-1 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-disabled:cursor-not-allowed has-disabled:opacity-50 sm:min-h-8 dark:bg-input/30",
        className
      )}
      {...props} />
  );
}

function ComboboxInput({
  className,
  ...props
}) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-input"
      className={cn(
        // text-base กัน iOS ซูมตอนโฟกัส แล้วค่อยย่อลงบนจอใหญ่
        "min-w-16 flex-1 border-0 bg-transparent p-0 text-base outline-none placeholder:text-muted-foreground md:text-sm",
        className
      )}
      {...props} />
  );
}

function ComboboxClear({
  className,
  ...props
}) {
  return (
    <ComboboxPrimitive.Clear
      data-slot="combobox-clear"
      aria-label="Clear"
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
        className
      )}
      {...props}>
      <XIcon className="size-4" />
    </ComboboxPrimitive.Clear>
  );
}

function ComboboxTrigger({
  className,
  ...props
}) {
  return (
    <ComboboxPrimitive.Trigger
      data-slot="combobox-trigger"
      aria-label="Open"
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
        className
      )}
      {...props}>
      <ChevronDownIcon className="size-4" />
    </ComboboxPrimitive.Trigger>
  );
}

function ComboboxChips({
  className,
  ...props
}) {
  return (
    <ComboboxPrimitive.Chips
      data-slot="combobox-chips"
      className={cn("flex w-full flex-wrap items-center gap-1", className)}
      {...props} />
  );
}

const ComboboxValue = ComboboxPrimitive.Value

function ComboboxChip({
  className,
  children,
  ...props
}) {
  return (
    <ComboboxPrimitive.Chip
      data-slot="combobox-chip"
      className={cn(
        "group/chip flex cursor-default items-center gap-1 rounded-4xl bg-secondary py-0.5 pr-1 pl-2.5 text-xs font-medium text-secondary-foreground outline-none focus-within:ring-2 focus-within:ring-ring/50 data-highlighted:bg-muted",
        className
      )}
      {...props}>
      {children}
    </ComboboxPrimitive.Chip>
  );
}

function ComboboxChipRemove({
  className,
  ...props
}) {
  return (
    <ComboboxPrimitive.ChipRemove
      data-slot="combobox-chip-remove"
      className={cn(
        "flex size-5 items-center justify-center rounded-full border-0 bg-transparent p-0 text-inherit hover:bg-foreground/10 sm:size-4",
        className
      )}
      {...props}>
      <XIcon className="size-3" />
    </ComboboxPrimitive.ChipRemove>
  );
}

function ComboboxContent({
  className,
  sideOffset = 4,
  ...props
}) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner sideOffset={sideOffset} className="isolate z-50 outline-none">
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={cn(
            "max-h-[min(var(--available-height),20rem)] w-(--anchor-width) max-w-(--available-width) origin-(--transform-origin) overflow-y-auto overscroll-contain rounded-lg bg-dropdown p-1 text-popover-foreground shadow-xl ring-1 ring-foreground/25 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props} />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

const ComboboxList = ComboboxPrimitive.List

function ComboboxItem({
  className,
  children,
  ...props
}) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "grid min-h-9 cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded-md px-2 text-sm outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-foreground/10 sm:min-h-8",
        className
      )}
      {...props}>
      <ComboboxPrimitive.ItemIndicator className="col-start-1">
        <CheckIcon className="size-4" />
      </ComboboxPrimitive.ItemIndicator>
      <span className="col-start-2 truncate">{children}</span>
    </ComboboxPrimitive.Item>
  );
}

function ComboboxEmpty({
  className,
  ...props
}) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn("px-2 py-3 text-center text-sm text-muted-foreground", className)}
      {...props} />
  );
}

export {
  Combobox,
  ComboboxChip,
  ComboboxChipRemove,
  ComboboxChips,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
}
