import { X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { pick, formatPrice, type Lang } from "@/lib/i18n";
import type { MenuItem } from "@/lib/menu.functions";

export const ZOOM_DISCLAIMER: Record<Lang, string> = {
  ru: "Изображения блюд могут отличаться от реальной подачи и приведены в ознакомительных целях.",
  ro: "Imaginile preparatelor pot diferi de prezentarea reală și sunt afișate cu titlu informativ.",
  en: "Dish images may differ from the actual serving and are shown for illustrative purposes only.",
};

export function ItemZoomDialog({
  item,
  lang,
  disclaimer,
  open,
  onOpenChange,
  style,
}: {
  item: MenuItem | null;
  lang: Lang;
  disclaimer: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  style?: React.CSSProperties;
}) {
  const name = item ? pick(lang, item.name_ru, item.name_ro, item.name_en) : "";
  const description = item
    ? pick(lang, item.description_ru, item.description_ro, item.description_en)
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-lg [&>button]:hidden"
        style={style}
      >
        {item ? (
          <>
            <div className="sticky top-0 z-10 flex items-center justify-end border-b border-border/60 bg-background/95 px-3 py-2 backdrop-blur">
              <DialogClose className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
            <div className="space-y-4 p-5 pt-4">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={name}
                  className="mx-auto max-h-[55vh] w-full object-contain"
                />
              ) : null}
              <DialogTitle className="text-display text-2xl text-foreground">{name}</DialogTitle>
              <DialogDescription className="text-sm leading-snug text-muted-foreground">
                {description}
              </DialogDescription>
              {item.variants.length > 0 ? (
                <ul className="flex flex-wrap gap-x-5 gap-y-1">
                  {item.variants.map((v) => {
                    const label = pick(lang, v.label_ru, v.label_ro, v.label_en);
                    return (
                      <li key={v.id} className="text-sm">
                        <span className="text-muted-foreground">{label}</span>
                        {label ? <span className="mx-1.5 text-muted-foreground/60">—</span> : null}
                        <span className="font-semibold text-primary">
                          {formatPrice(v.price, lang)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              {disclaimer ? (
                <p className="text-xs italic leading-snug text-muted-foreground/80">
                  {ZOOM_DISCLAIMER[lang]}
                </p>
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
