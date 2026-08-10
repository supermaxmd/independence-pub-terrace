import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";

export function QrDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useLang();
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!open) return;
    const target = `${window.location.origin}/`;
    setUrl(target);
    QRCode.toDataURL(target, {
      width: 720,
      margin: 2,
      color: { dark: "#141110", light: "#f0e6d6" },
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-display text-2xl">{t("qrTitle")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          {dataUrl ? (
            <img
              src={dataUrl}
              alt="QR"
              width={260}
              height={260}
              className="rounded-md border border-border"
            />
          ) : (
            <div className="h-[260px] w-[260px] animate-pulse rounded-md bg-muted" />
          )}
          <p className="text-center text-xs text-muted-foreground">{t("qrHint")}</p>
          <p className="break-all text-center text-xs text-muted-foreground">{url}</p>
          <canvas ref={canvasRef} className="hidden" />
          {dataUrl && (
            <Button asChild className="w-full">
              <a href={dataUrl} download="independence-pub-menu-qr.png">
                {t("download")}
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
