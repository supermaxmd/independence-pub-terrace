import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_SETTINGS, FONT_OPTIONS, type SiteSettings } from "@/lib/site.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function DesignDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [form, setForm] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);

  const resolvePreview = async (value: string) => {
    if (!value) return setHeroPreview(null);
    if (value.startsWith("http")) return setHeroPreview(value);
    const { data } = await supabase.storage.from("menu").createSignedUrl(value, 3600);
    setHeroPreview(data?.signedUrl ?? null);
  };

  const uploadHero = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Файл больше 8 МБ");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `hero/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("menu").upload(path, file, { upsert: false });
    setUploading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    set("hero_image_url", path);
    void resolvePreview(path);
    toast.success("Картинка шапки загружена");
  };

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    supabase
      .from("site_settings")
      .select("*")
      .eq("id", "default")
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        if (data) setForm({ ...DEFAULT_SETTINGS, ...(data as Partial<SiteSettings>) });
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open]);

  const set = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ id: "default", ...form });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Оформление сохранено");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-display text-2xl">Оформление сайта</DialogTitle>
          <DialogDescription>Шапка, подписи, шрифты и подвал публичного меню.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="h-40 animate-pulse rounded-md bg-muted" />
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Название в шапке</Label>
              <Input
                value={form.brand_title}
                onChange={(e) => set("brand_title", e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Надпись над названием (RU)</Label>
                <Input value={form.kicker_ru} onChange={(e) => set("kicker_ru", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Text deasupra titlului (RO)</Label>
                <Input value={form.kicker_ro} onChange={(e) => set("kicker_ro", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Text above the title (EN)</Label>
                <Input value={form.kicker_en} onChange={(e) => set("kicker_en", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Подпись под названием (RU)</Label>
                <Input value={form.tagline_ru} onChange={(e) => set("tagline_ru", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Subtitlu (RO)</Label>
                <Input value={form.tagline_ro} onChange={(e) => set("tagline_ro", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Subtitle (EN)</Label>
                <Input value={form.tagline_en} onChange={(e) => set("tagline_en", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Текст в подвале (RU)</Label>
                <Input value={form.footer_ru} onChange={(e) => set("footer_ru", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Text în subsol (RO)</Label>
                <Input value={form.footer_ro} onChange={(e) => set("footer_ro", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Footer text (EN)</Label>
                <Input value={form.footer_en} onChange={(e) => set("footer_en", e.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Шрифт заголовков</Label>
                <Select
                  value={form.font_display}
                  onValueChange={(v) => set("font_display", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((f) => (
                      <SelectItem key={f} value={f} style={{ fontFamily: `"${f}", sans-serif` }}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Шрифт текста</Label>
                <Select value={form.font_body} onValueChange={(v) => set("font_body", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((f) => (
                      <SelectItem key={f} value={f} style={{ fontFamily: `"${f}", sans-serif` }}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div
              className="rounded-lg border border-border bg-card p-4 text-center"
              style={{ fontFamily: `"${form.font_body}", sans-serif` }}
            >
              <p className="text-xs uppercase tracking-[0.4em] text-primary">{form.kicker_ru}</p>
              <p
                className="mt-1 text-4xl text-foreground"
                style={{ fontFamily: `"${form.font_display}", sans-serif` }}
              >
                {form.brand_title}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{form.tagline_ru}</p>
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.show_hero_image}
                  onCheckedChange={(v) => set("show_hero_image", v)}
                />
                <Label>Фоновое фото в шапке</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.show_search}
                  onCheckedChange={(v) => set("show_search", v)}
                />
                <Label>Строка поиска</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Адрес сайта для QR-кода</Label>
              <Input value={form.public_url} onChange={(e) => set("public_url", e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Публичная ссылка на меню — именно она попадёт в QR-код.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={save} disabled={saving || loading}>
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
