import { createServerFn } from "@tanstack/react-start";

/** TEMPORARY maintenance function: fills English columns via AI translation. */
export const translateMenuToEnglish = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const apiKey = process.env["LOVABLE_API_KEY"]!;

  async function translate(values: string[]): Promise<string[]> {
    const out: string[] = [];
    for (let i = 0; i < values.length; i += 40) {
      const chunk = values.slice(i, i + 40);
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content:
                "You translate restaurant/pub menu strings from Russian to English. Reply ONLY with a JSON array of strings, same length and order as the input array. Keep units (г, мл, л) converted to g, ml, l. Keep proper names.",
            },
            { role: "user", content: JSON.stringify(chunk) },
          ],
        }),
      });
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = json.choices?.[0]?.message?.content ?? "[]";
      const cleaned = text.replace(/^```(?:json)?/m, "").replace(/```$/m, "").trim();
      let parsed: string[] = [];
      try {
        parsed = JSON.parse(cleaned) as string[];
      } catch {
        parsed = [];
      }
      for (let k = 0; k < chunk.length; k++) out.push(parsed[k] ?? chunk[k]!);
    }
    return out;
  }

  const report: Record<string, number> = {};

  // categories / subcategories
  for (const table of ["categories", "subcategories"] as const) {
    const { data } = await supabaseAdmin.from(table).select("id, name_ru, name_en");
    const rows = (data ?? []).filter((r) => !r.name_en);
    if (rows.length) {
      const t = await translate(rows.map((r) => r.name_ru));
      for (let i = 0; i < rows.length; i++) {
        await supabaseAdmin.from(table).update({ name_en: t[i]! }).eq("id", rows[i]!.id);
      }
    }
    report[table] = rows.length;
  }

  // menu items
  {
    const { data } = await supabaseAdmin
      .from("menu_items")
      .select("id, name_ru, description_ru, name_en, description_en");
    const rows = (data ?? []).filter((r) => !r.name_en || (r.description_ru && !r.description_en));
    if (rows.length) {
      const names = await translate(rows.map((r) => r.name_ru));
      const descRows = rows.filter((r) => r.description_ru);
      const descs = await translate(descRows.map((r) => r.description_ru!));
      const descMap = new Map<string, string>();
      descRows.forEach((r, i) => descMap.set(r.id, descs[i]!));
      for (let i = 0; i < rows.length; i++) {
        await supabaseAdmin
          .from("menu_items")
          .update({
            name_en: names[i]!,
            description_en: descMap.get(rows[i]!.id) ?? null,
          })
          .eq("id", rows[i]!.id);
      }
    }
    report["menu_items"] = rows.length;
  }

  // variants
  {
    const { data } = await supabaseAdmin.from("item_variants").select("id, label_ru, label_en");
    const rows = (data ?? []).filter((r) => r.label_ru && !r.label_en);
    if (rows.length) {
      const t = await translate(rows.map((r) => r.label_ru));
      for (let i = 0; i < rows.length; i++) {
        await supabaseAdmin.from("item_variants").update({ label_en: t[i]! }).eq("id", rows[i]!.id);
      }
    }
    report["item_variants"] = rows.length;
  }

  return report;
});
