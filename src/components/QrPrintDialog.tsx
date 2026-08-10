import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_SETTINGS } from "@/lib/site.functions";

export function QrPrintDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [url, setUrl] = useState("");
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    // Публичный адрес меню (не превью админки), чтобы QR не просил вход.
    supabase
      .from("site_settings")
      .select("public_url")
      .eq("id", "default")
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setUrl((prev) => prev || data?.public_url || DEFAULT_SETTINGS.public_url);
      });
    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !url) return;
    let active = true;
    QRCode.toDataURL(url, {
      width: 1024,
      margin: 2,
      color: { dark: "#141110", light: "#ffffff" },
    })
      .then((d) => active && setDataUrl(d))
      .catch(() => active && setDataUrl(null));
    return () => {
      active = false;
    };
  }, [open, url]);

  const print = () => {
    if (!dataUrl) return;
    const w = window.open("", "_blank", "width=800,height=1000");
    if (!w) return;
    w.document.write(
      `<html><head><title>QR — Independence Pub</title><style>
        @page { margin: 16mm; }
        body { font-family: system-ui, sans-serif; text-align:center; color:#141110; }
        h1 { font-size: 28px; margin: 0 0 4px; letter-spacing: 2px; text-transform: uppercase; }
        p { font-size: 14px; margin: 0 0 24px; color:#555; }
        img { width: 120mm; height: 120mm; }
        small { display:block; margin-top: 12px; font-size: 11px; color:#777; word-break: break-all; }
      </style></head><body>
        <h1>Independence Pub</h1>
        <p>Меню · Meniu</p>
        <img src="${dataUrl}" alt="QR" />
        <small>${url}</small>
        <script>window.onload = () => { window.focus(); window.print(); }<\/script>
      </body></html>`,
    );
    w.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-display text-2xl">QR-код меню</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div className="w-full space-y-1.5">
            <Label htmlFor="qr-url">Ссылка</Label>
            <Input id="qr-url" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          {dataUrl ? (
            <img
              src={dataUrl}
              alt="QR-код меню"
              width={260}
              height={260}
              className="rounded-md border border-border bg-white p-2"
            />
          ) : (
            <div className="h-[260px] w-[260px] animate-pulse rounded-md bg-muted" />
          )}
          <div className="grid w-full grid-cols-2 gap-2">
            <Button variant="outline" asChild disabled={!dataUrl}>
              <a href={dataUrl ?? "#"} download="independence-pub-menu-qr.png">
                Скачать PNG
              </a>
            </Button>
            <Button onClick={print} disabled={!dataUrl}>
              Печать
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
