import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { listUsers, setUserAdmin } from "@/lib/admin.functions";
import { Switch } from "@/components/ui/switch";
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Пользователи / Utilizatori
          </DialogTitle>
          <DialogDescription>
            Назначайте и снимайте роль администратора. Последнего администратора снять нельзя.
          </DialogDescription>
        </DialogHeader>

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
