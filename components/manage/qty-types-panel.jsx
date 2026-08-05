"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createQtyTypeAction, deleteQtyTypeAction } from "@/app/manage/actions";

export function QtyTypesPanel({ qtyTypes, setQtyTypes }) {
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleCreate(event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    startTransition(async () => {
      const qtyType = await createQtyTypeAction(trimmed);
      if (qtyType) {
        setQtyTypes((prev) =>
          [...prev, qtyType].sort((a, b) => a.name.localeCompare(b.name))
        );
        setName("");
      }
    });
  }

  function handleDelete(id) {
    startTransition(async () => {
      const ok = await deleteQtyTypeAction(id);
      if (ok) setQtyTypes((prev) => prev.filter((qtyType) => qtyType.id !== id));
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unit types</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Box, Piece"
            disabled={isPending}
          />
          <Button type="submit" size="icon" disabled={isPending || !name.trim()}>
            <Plus />
          </Button>
        </form>

        {qtyTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No unit types yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {qtyTypes.map((qtyType) => (
              <Badge key={qtyType.id} variant="secondary" className="gap-1 pr-1">
                {qtyType.name}
                <button
                  type="button"
                  onClick={() => handleDelete(qtyType.id)}
                  disabled={isPending}
                  className="rounded-full p-0.5 hover:bg-foreground/10"
                  aria-label={`Delete ${qtyType.name}`}
                >
                  <Trash2 className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
