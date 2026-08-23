import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { createUser, listUsers, setUserAdmin } from "@/lib/admin.functions";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function UsersDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const fetchUsers = useServerFn(listUsers);
  const updateRole = useServerFn(setUserAdmin);
  const addUser = useServerFn(createUser);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [asAdmin, setAsAdmin] = useState(false);

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetchUsers(),
    enabled: open,
  });

  const roleMutation = useMutation({
    mutationFn: (vars: { userId: string; isAdmin: boolean }) => updateRole({ data: vars }),
    onSuccess: () => {
      toast.success("Права обновлены");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createMutation = useMutation({
    mutationFn: (vars: { email: string; password: string; isAdmin: boolean }) =>
      addUser({ data: vars }),
    onSuccess: () => {
      toast.success("Пользователь создан");
      setEmail("");
      setPassword("");
      setAsAdmin(false);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Пользователи / Utilizatori
          </DialogTitle>
          <DialogDescription>
            Создавайте сотрудников и управляйте ролью администратора. Последнего администратора
            снять нельзя.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-3 rounded-lg border border-border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate({ email, password, isAdmin: asAdmin });
          }}
        >
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <UserPlus className="h-4 w-4 text-primary" />
            Новый пользователь
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Пароль (минимум 8 символов)</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Switch checked={asAdmin} onCheckedChange={setAsAdmin} />
              Сразу назначить администратором
            </label>
            <Button type="submit" size="sm" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-1.5 h-4 w-4" />
              )}
              Создать
            </Button>
          </div>
        </form>


        {usersQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : usersQuery.isError ? (
          <p className="py-6 text-center text-sm text-destructive">Не удалось загрузить список</p>
        ) : (
          <ul className="divide-y divide-border">
            {(usersQuery.data ?? []).map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{u.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {u.is_admin ? "Администратор" : "Пользователь"}
                  </p>
                </div>
                <Switch
                  checked={u.is_admin}
                  disabled={roleMutation.isPending}
                  onCheckedChange={(checked) =>
                    roleMutation.mutate({ userId: u.id, isAdmin: checked })
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
