"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { createProductAction } from "@/app/manage/actions";

export function NewProductDialog({ qtyTypes, onCreated }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [baseQtyTypeId, setBaseQtyTypeId] = useState("");
  const [isPending, startTransition] = useTransition();

  const canSubmit = Boolean(name.trim()) && Boolean(baseQtyTypeId);

  function reset() {
    setName("");
    setImageUrl("");
    setBaseQtyTypeId("");
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;

    startTransition(async () => {
      const product = await createProductAction(
        name.trim(),
        imageUrl.trim() || null,
        Number(baseQtyTypeId)
      );
      if (product) {
        onCreated(product);
        reset();
        setOpen(false);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button size="sm" disabled={qtyTypes.length === 0} />}>
        <Plus />
        New product
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New product</DialogTitle>
          <DialogDescription>Add a product and its base unit of measure.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="product-name">Name</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Coffee beans"
              disabled={isPending}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="product-image">Image URL</Label>
            <Input
              id="product-image"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://..."
              disabled={isPending}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Base unit</Label>
            <Select value={baseQtyTypeId} onValueChange={setBaseQtyTypeId} disabled={isPending}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a unit" />
              </SelectTrigger>
              <SelectContent>
                {qtyTypes.map((qtyType) => (
                  <SelectItem key={qtyType.id} value={String(qtyType.id)}>
                    {qtyType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={!canSubmit || isPending}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
