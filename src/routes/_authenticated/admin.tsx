import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, GripVertical, Loader2, Palette, Pencil, Plus, QrCode, Trash2, Upload } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { claimFirstAdmin } from "@/lib/admin.functions";
import { QrPrintDialog } from "@/components/QrPrintDialog";
import { DesignDialog } from "@/components/DesignDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

type Category = {
  id: string;
  slug: string;
  name_ru: string;
  name_ro: string;
  sort_order: number;
  is_visible: boolean;
};
type Subcategory = {
  id: string;
  category_id: string;
  name_ru: string;
  name_ro: string;
  sort_order: number;
  is_visible: boolean;
};
type Variant = {
  id?: string;
  item_id?: string;
  label_ru: string;
  label_ro: string;
  price: number;
  sort_order: number;
};
type Item = {
  id: string;
  category_id: string;
  subcategory_id: string | null;
  name_ru: string;
  name_ro: string;
  description_ru: string | null;
  description_ro: string | null;
  image_url: string | null;
  sort_order: number;
  is_available: boolean;
};

function useThumb(path: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!path) {
      setUrl(null);
      return;
    }
    if (path.startsWith("http")) {
      setUrl(path);
      return;
    }
    supabase.storage
      .from("menu")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (active) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [path]);
  return url;
}

function Thumb({ path, alt }: { path: string | null; alt: string }) {
  const url = useThumb(path);
  if (!url) {
    return <div className="h-14 w-14 shrink-0 rounded-md border border-border bg-muted" />;
  }
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      width={56}
      height={56}
      className="h-14 w-14 shrink-0 rounded-md border border-border object-cover"
    />
  );
}

function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Partial<Item> | null>(null);
  const [editingSub, setEditingSub] = useState<Partial<Subcategory> | null>(null);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [qrOpen, setQrOpen] = useState(false);

  const roleQuery = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (data) return true;
      const claimed = await claimFirstAdmin();
      return claimed === true;
    },
  });

  const categoriesQuery = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as Category[];
    },
  });

  const subsQuery = useQuery({
    queryKey: ["admin-subs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subcategories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as Subcategory[];
    },
  });

  const itemsQuery = useQuery({
    queryKey: ["admin-items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("menu_items").select("*").order("sort_order");
      if (error) throw error;
      return data as Item[];
    },
  });

  const variantsQuery = useQuery({
    queryKey: ["admin-variants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_variants")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []).map((v) => ({ ...v, price: Number(v.price) })) as Variant[];
    },
  });

  const categories = categoriesQuery.data ?? [];
  const currentCategoryId = activeCategory ?? categories[0]?.id ?? null;
  const currentSubs = (subsQuery.data ?? []).filter((s) => s.category_id === currentCategoryId);
  const currentItems = (itemsQuery.data ?? []).filter((i) => i.category_id === currentCategoryId);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    queryClient.invalidateQueries({ queryKey: ["admin-subs"] });
    queryClient.invalidateQueries({ queryKey: ["admin-items"] });
    queryClient.invalidateQueries({ queryKey: ["admin-variants"] });
  };

  const removeMutation = useMutation({
    mutationFn: async ({ table, id }: { table: "categories" | "subcategories" | "menu_items"; id: string }) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Удалено");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (roleQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!roleQuery.data) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-5 text-center">
        <h1 className="text-display text-3xl">Нет доступа</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          У этого аккаунта нет прав администратора. Попросите действующего администратора выдать вам
          доступ.
        </p>
        <Button variant="outline" onClick={signOut}>
          Выйти
        </Button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-20">
      <QrPrintDialog open={qrOpen} onOpenChange={setQrOpen} />
      <DesignDialog open={designOpen} onOpenChange={setDesignOpen} />
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <h1 className="text-display text-2xl">Админ-панель</h1>
            <p className="text-xs text-muted-foreground">Independence Pub · меню</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setDesignOpen(true)}>
              <Palette className="mr-1.5 h-4 w-4" />
              Оформление
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQrOpen(true)}>
              <QrCode className="mr-1.5 h-4 w-4" />
              QR-код
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                На сайт
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}>
              Выйти
            </Button>
          </div>
        </div>
      </header>


      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-6 md:grid-cols-[260px_1fr]">
        <aside className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Разделы
            </h2>
            <Button
              size="icon"
              variant="ghost"
              onClick={() =>
                setEditingCategory({
                  name_ru: "",
                  name_ro: "",
                  sort_order: (categories.at(-1)?.sort_order ?? 0) + 10,
                  is_visible: true,
                })
              }
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ul className="space-y-1">
            {categories.map((c) => (
              <li key={c.id}>
                <div
                  className={`group flex items-center gap-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                    c.id === currentCategoryId
                      ? "border-primary bg-accent text-foreground"
                      : "border-border text-muted-foreground hover:bg-accent/50"
                  }`}
                >
                  <button className="flex-1 text-left" onClick={() => setActiveCategory(c.id)}>
                    {c.name_ru}
                    {!c.is_visible && <span className="ml-1 text-xs">(скрыт)</span>}
                  </button>
                  <button
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => setEditingCategory(c)}
                    aria-label="Изменить раздел"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-display text-2xl text-primary">
              {categories.find((c) => c.id === currentCategoryId)?.name_ru ?? "—"}
            </h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!currentCategoryId}
                onClick={() =>
                  setEditingSub({
                    category_id: currentCategoryId!,
                    name_ru: "",
                    name_ro: "",
                    sort_order: (currentSubs.at(-1)?.sort_order ?? 0) + 10,
                    is_visible: true,
                  })
                }
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Подраздел
              </Button>
              <Button
                size="sm"
                disabled={!currentCategoryId}
                onClick={() =>
                  setEditingItem({
                    category_id: currentCategoryId!,
                    subcategory_id: null,
                    name_ru: "",
                    name_ro: "",
                    description_ru: "",
                    description_ro: "",
                    image_url: null,
                    sort_order: (currentItems.at(-1)?.sort_order ?? 0) + 10,
                    is_available: true,
                  })
                }
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Позиция
              </Button>
            </div>
          </div>

          {currentSubs.length > 0 && (
            <div className="rounded-lg border border-border p-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Подразделы
              </h3>
              <ul className="mt-2 space-y-1">
                {currentSubs.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent/40"
                  >
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="flex-1">
                      {s.name_ru} <span className="text-muted-foreground">/ {s.name_ro}</span>
                    </span>
                    <button onClick={() => setEditingSub(s)} aria-label="Изменить подраздел">
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                    </button>
                    <button
                      onClick={() => removeMutation.mutate({ table: "subcategories", id: s.id })}
                      aria-label="Удалить подраздел"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ul className="space-y-2">
            {currentItems.length === 0 && (
              <li className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                В разделе пока нет позиций
              </li>
            )}
            {currentItems.map((item) => {
              const itemVariants = (variantsQuery.data ?? []).filter((v) => v.item_id === item.id);
              const sub = currentSubs.find((s) => s.id === item.subcategory_id);
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                >
                  <Thumb path={item.image_url} alt={item.name_ru} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{item.name_ru}</span>
                      <span className="text-sm text-muted-foreground">/ {item.name_ro}</span>
                      {sub && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                          {sub.name_ru}
                        </span>
                      )}
                      {!item.is_available && (
                        <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-xs text-destructive">
                          нет в наличии
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {itemVariants.length > 0
                        ? itemVariants
                            .map((v) => `${v.label_ru || "—"} · ${v.price} лей`)
                            .join("   ")
                        : "цена не указана"}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setEditingItem(item)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMutation.mutate({ table: "menu_items", id: item.id })}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {editingCategory && (
        <CategoryDialog
          value={editingCategory}
          onClose={() => setEditingCategory(null)}
          onSaved={invalidate}
          onDelete={
            editingCategory.id
              ? () => {
                  removeMutation.mutate({ table: "categories", id: editingCategory.id! });
                  setEditingCategory(null);
                }
              : undefined
          }
        />
      )}

      {editingSub && (
        <SubDialog value={editingSub} onClose={() => setEditingSub(null)} onSaved={invalidate} />
      )}

      {editingItem && (
        <ItemDialog
          value={editingItem}
          subs={currentSubs}
          variants={(variantsQuery.data ?? []).filter((v) => v.item_id === editingItem.id)}
          onClose={() => setEditingItem(null)}
          onSaved={invalidate}
        />
      )}
    </main>
  );
}

function CategoryDialog({
  value,
  onClose,
  onSaved,
  onDelete,
}: {
  value: Partial<Category>;
  onClose: () => void;
  onSaved: () => void;
  onDelete?: (() => void) | undefined;
}) {
  const [form, setForm] = useState(value);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name_ru?.trim() || !form.name_ro?.trim()) {
      toast.error("Укажите название на обоих языках");
      return;
    }
    setSaving(true);
    const payload = {
      name_ru: form.name_ru.trim(),
      name_ro: form.name_ro.trim(),
      sort_order: Number(form.sort_order) || 0,
      is_visible: form.is_visible ?? true,
      slug:
        form.slug ||
        `cat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    };
    const { error } = form.id
      ? await supabase.from("categories").update(payload).eq("id", form.id)
      : await supabase.from("categories").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Сохранено");
    onSaved();
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{form.id ? "Раздел меню" : "Новый раздел"}</DialogTitle>
          <DialogDescription>Название на русском и румынском.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Название (RU)</Label>
              <Input
                value={form.name_ru ?? ""}
                onChange={(e) => setForm({ ...form, name_ru: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Denumire (RO)</Label>
              <Input
                value={form.name_ro ?? ""}
                onChange={(e) => setForm({ ...form, name_ro: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-end gap-6">
            <div className="w-32 space-y-2">
              <Label>Порядок</Label>
              <Input
                type="number"
                value={form.sort_order ?? 0}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch
                checked={form.is_visible ?? true}
                onCheckedChange={(v) => setForm({ ...form, is_visible: v })}
              />
              <Label>Показывать на сайте</Label>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {onDelete ? (
            <Button variant="ghost" onClick={onDelete} className="text-destructive">
              <Trash2 className="mr-1.5 h-4 w-4" />
              Удалить
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={save} disabled={saving}>
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubDialog({
  value,
  onClose,
  onSaved,
}: {
  value: Partial<Subcategory>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(value);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name_ru?.trim() || !form.name_ro?.trim()) {
      toast.error("Укажите название на обоих языках");
      return;
    }
    setSaving(true);
    const payload = {
      category_id: form.category_id!,
      name_ru: form.name_ru.trim(),
      name_ro: form.name_ro.trim(),
      sort_order: Number(form.sort_order) || 0,
      is_visible: form.is_visible ?? true,
    };
    const { error } = form.id
      ? await supabase.from("subcategories").update(payload).eq("id", form.id)
      : await supabase.from("subcategories").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Сохранено");
    onSaved();
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{form.id ? "Подраздел" : "Новый подраздел"}</DialogTitle>
          <DialogDescription>Группа внутри раздела, например «Пиво разливное».</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Название (RU)</Label>
            <Input
              value={form.name_ru ?? ""}
              onChange={(e) => setForm({ ...form, name_ru: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Denumire (RO)</Label>
            <Input
              value={form.name_ro ?? ""}
              onChange={(e) => setForm({ ...form, name_ro: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Порядок</Label>
            <Input
              type="number"
              value={form.sort_order ?? 0}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={saving}>
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ItemDialog({
  value,
  subs,
  variants,
  onClose,
  onSaved,
}: {
  value: Partial<Item>;
  subs: Subcategory[];
  variants: Variant[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(value);
  const [rows, setRows] = useState<Variant[]>(
    variants.length > 0
      ? variants
      : [{ label_ru: "", label_ro: "", price: 0, sort_order: 10 }],
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const preview = useThumb(form.image_url ?? null);

  const removedIds = useMemo(
    () => variants.filter((v) => !rows.some((r) => r.id === v.id)).map((v) => v.id!),
    [variants, rows],
  );

  const upload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Файл больше 5 МБ");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `items/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("menu").upload(path, file, { upsert: false });
    setUploading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setForm((f) => ({ ...f, image_url: path }));
    toast.success("Картинка загружена");
  };

  const save = async () => {
    if (!form.name_ru?.trim() || !form.name_ro?.trim()) {
      toast.error("Укажите название на обоих языках");
      return;
    }
    setSaving(true);
    const payload = {
      category_id: form.category_id!,
      subcategory_id: form.subcategory_id || null,
      name_ru: form.name_ru.trim(),
      name_ro: form.name_ro.trim(),
      description_ru: form.description_ru?.trim() || null,
      description_ro: form.description_ro?.trim() || null,
      image_url: form.image_url || null,
      sort_order: Number(form.sort_order) || 0,
      is_available: form.is_available ?? true,
    };

    let itemId = form.id;
    if (itemId) {
      const { error } = await supabase.from("menu_items").update(payload).eq("id", itemId);
      if (error) {
        setSaving(false);
        toast.error(error.message);
        return;
      }
    } else {
      const { data, error } = await supabase.from("menu_items").insert(payload).select("id").single();
      if (error || !data) {
        setSaving(false);
        toast.error(error?.message ?? "Ошибка сохранения");
        return;
      }
      itemId = data.id;
    }

    if (removedIds.length > 0) {
      await supabase.from("item_variants").delete().in("id", removedIds);
    }

    for (const [index, row] of rows.entries()) {
      const variantPayload = {
        item_id: itemId!,
        label_ru: row.label_ru.trim(),
        label_ro: row.label_ro.trim(),
        price: Number(row.price) || 0,
        sort_order: (index + 1) * 10,
      };
      const { error } = row.id
        ? await supabase.from("item_variants").update(variantPayload).eq("id", row.id)
        : await supabase.from("item_variants").insert(variantPayload);
      if (error) {
        setSaving(false);
        toast.error(error.message);
        return;
      }
    }

    setSaving(false);
    toast.success("Сохранено");
    onSaved();
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{form.id ? "Позиция меню" : "Новая позиция"}</DialogTitle>
          <DialogDescription>
            Название, описание, миниатюра и варианты подачи (например 0.5 л и 0.3 л).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center gap-4">
            {preview ? (
              <img
                src={preview}
                alt="Миниатюра"
                width={80}
                height={80}
                className="h-20 w-20 rounded-md border border-border object-cover"
              />
            ) : (
              <div className="h-20 w-20 rounded-md border border-dashed border-border" />
            )}
            <div className="space-y-2">
              <Label htmlFor="image" className="cursor-pointer">
                <span className="inline-flex items-center rounded-md border border-input px-3 py-2 text-sm hover:bg-accent">
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Загрузить фото
                </span>
              </Label>
              <input
                id="image"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file);
                }}
              />
              {form.image_url && (
                <button
                  type="button"
                  className="block text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => setForm({ ...form, image_url: null })}
                >
                  Убрать картинку
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Название (RU)</Label>
              <Input
                value={form.name_ru ?? ""}
                onChange={(e) => setForm({ ...form, name_ru: e.target.value })}
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label>Denumire (RO)</Label>
              <Input
                value={form.name_ro ?? ""}
                onChange={(e) => setForm({ ...form, name_ro: e.target.value })}
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label>Описание (RU)</Label>
              <Textarea
                rows={3}
                value={form.description_ru ?? ""}
                onChange={(e) => setForm({ ...form, description_ru: e.target.value })}
                maxLength={400}
              />
            </div>
            <div className="space-y-2">
              <Label>Descriere (RO)</Label>
              <Textarea
                rows={3}
                value={form.description_ro ?? ""}
                onChange={(e) => setForm({ ...form, description_ro: e.target.value })}
                maxLength={400}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-2">
              <Label>Подраздел</Label>
              <Select
                value={form.subcategory_id ?? "none"}
                onValueChange={(v) =>
                  setForm({ ...form, subcategory_id: v === "none" ? null : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Без подраздела" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без подраздела</SelectItem>
                  {subs.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name_ru}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Порядок</Label>
              <Input
                type="number"
                value={form.sort_order ?? 0}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={form.is_available ?? true}
              onCheckedChange={(v) => setForm({ ...form, is_available: v })}
            />
            <Label>Есть в наличии</Label>
          </div>

          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Варианты и цены</h4>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setRows([
                    ...rows,
                    { label_ru: "", label_ro: "", price: 0, sort_order: (rows.length + 1) * 10 },
                  ])
                }
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Вариант
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Например: 0.5 л — 55 лей, 0.3 л — 38 лей. Для одной цены оставьте подпись пустой.
            </p>
            <ul className="mt-3 space-y-2">
              {rows.map((row, index) => (
                <li key={row.id ?? `new-${index}`} className="flex items-center gap-2">
                  <Input
                    placeholder="0.5 л"
                    value={row.label_ru}
                    onChange={(e) => {
                      const next = [...rows];
                      next[index] = { ...row, label_ru: e.target.value };
                      setRows(next);
                    }}
                  />
                  <Input
                    placeholder="0.5 l"
                    value={row.label_ro}
                    onChange={(e) => {
                      const next = [...rows];
                      next[index] = { ...row, label_ro: e.target.value };
                      setRows(next);
                    }}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    className="w-28"
                    value={row.price}
                    onChange={(e) => {
                      const next = [...rows];
                      next[index] = { ...row, price: Number(e.target.value) };
                      setRows(next);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setRows(rows.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={save} disabled={saving || uploading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
