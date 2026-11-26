import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile, Store } from "./bot";

const PROFILE_COLUMNS = "id, timezone, reminder_time, reminders_enabled, telegram_chat_id, last_reminded_on";

type Row = {
  id: string;
  timezone: string;
  reminder_time: string;
  reminders_enabled: boolean;
  telegram_chat_id: number | string | null;
  last_reminded_on: string | null;
};

/** Хранилище бота поверх Supabase. Клиент — с секретным ключом (createAdminClient). */
export function supabaseStore(db: SupabaseClient): Store {
  const toProfile = async (row: Row, withEmail = false): Promise<Profile> => {
    let email: string | null = null;
    if (withEmail) {
      const { data } = await db.auth.admin.getUserById(row.id);
      email = data.user?.email ?? null;
    }
    return {
      id: row.id,
      email,
      timezone: row.timezone,
      reminderTime: row.reminder_time,
      remindersEnabled: row.reminders_enabled,
      chatId: row.telegram_chat_id === null ? null : Number(row.telegram_chat_id),
      lastRemindedOn: row.last_reminded_on,
    };
  };

  return {
    async findByLinkCode(code, now) {
      if (!/^[A-Za-z0-9_-]{16,64}$/.test(code)) return null;
      const { data, error } = await db
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("telegram_link_code", code)
        .gt("telegram_link_expires_at", now.toISOString())
        .maybeSingle();
      if (error) throw error;
      return data ? toProfile(data as Row, true) : null;
    },

    async findByChat(chatId) {
      const { data, error } = await db.from("profiles").select(PROFILE_COLUMNS).eq("telegram_chat_id", chatId).maybeSingle();
      if (error) throw error;
      return data ? toProfile(data as Row) : null;
    },

    async linkChat(profileId, chatId, username) {
      const { error: clearError } = await db
        .from("profiles")
        .update({ telegram_chat_id: null, telegram_username: null })
        .eq("telegram_chat_id", chatId)
        .neq("id", profileId);
      if (clearError) throw clearError;
      const { error } = await db
        .from("profiles")
        .update({
          telegram_chat_id: chatId,
          telegram_username: username,
          telegram_link_code: null,
          telegram_link_expires_at: null,
          reminders_enabled: true,
        })
        .eq("id", profileId);
      if (error) throw error;
    },

    async setReminders(profileId, enabled) {
      const { error } = await db.from("profiles").update({ reminders_enabled: enabled }).eq("id", profileId);
      if (error) throw error;
    },

    async markReminded(profileId, day) {
      const { error } = await db.from("profiles").update({ last_reminded_on: day }).eq("id", profileId);
      if (error) throw error;
    },

    async reminderCandidates() {
      const { data, error } = await db
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .not("telegram_chat_id", "is", null)
        .eq("reminders_enabled", true);
      if (error) throw error;
      return Promise.all(((data ?? []) as Row[]).map((r) => toProfile(r)));
    },

    async dueCount(profileId, now) {
      const { count, error } = await db
        .from("user_question_state")
        .select("question_id", { count: "exact", head: true })
        .eq("user_id", profileId)
        .lte("due_at", now.toISOString());
      if (error) throw error;
      return count ?? 0;
    },

    async activeDays(profileId) {
      const { data, error } = await db
        .from("daily_activity")
        .select("day")
        .eq("user_id", profileId)
        .gt("answers", 0)
        .order("day", { ascending: false })
        .limit(400);
      if (error) throw error;
      return (data ?? []).map((d) => d.day as string);
    },
  };
}
