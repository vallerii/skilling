import { timingSafeEqual } from "node:crypto";
import { sendMessage, siteUrl } from "@/lib/telegram/api";
import { runReminders } from "@/lib/telegram/bot";
import { supabaseStore } from "@/lib/telegram/store";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Ежедневные напоминания. Vercel Cron вызывает GET с заголовком
 * `Authorization: Bearer <CRON_SECRET>` (расписание — в vercel.json).
 */
export async function GET(request: Request) {
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  const got = request.headers.get("authorization") ?? "";
  if (!process.env.CRON_SECRET || got.length !== expected.length || !timingSafeEqual(Buffer.from(got), Buffer.from(expected))) {
    return new Response("unauthorized", { status: 401 });
  }
  try {
    const report = await runReminders({ store: supabaseStore(createAdminClient()), send: sendMessage, site: siteUrl() });
    return Response.json(report);
  } catch (error) {
    console.error("cron reminders", error);
    return Response.json({ error: error instanceof Error ? error.message : "failed" }, { status: 500 });
  }
}
