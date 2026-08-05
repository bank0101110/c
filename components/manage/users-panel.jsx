"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createUserAction } from "@/app/manage/actions";

export function UsersPanel({ users, setUsers }) {
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleCreate(event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    startTransition(async () => {
      const user = await createUserAction(trimmed);
      if (user) {
        setUsers((prev) => [...prev, user].sort((a, b) => a.name.localeCompare(b.name)));
        setName("");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Alex"
            disabled={isPending}
          />
          <Button type="submit" size="icon" disabled={isPending || !name.trim()}>
            <Plus />
          </Button>
        </form>

        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {users.map((user) => (
              <Badge key={user.id} variant="outline">
                {user.name}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
