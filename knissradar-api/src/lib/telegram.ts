import { Telegraf } from "telegraf";
import { pool } from "../db/pool.js";

let bot: Telegraf | null = null;

export function initTelegramBot(): Telegraf | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("TELEGRAM_BOT_TOKEN not set — Telegram bot disabled");
    return null;
  }

  bot = new Telegraf(token);

  bot.start(async (ctx) => {
    const chatId = ctx.chat.id;
    const username = ctx.from?.username ?? "unknown";

    await ctx.reply(
      `👋 Bienvenue sur KnissRadar!\n\n` +
        `Je surveille les prix pour vous sur Ouedkniss.\n\n` +
        `Pour connecter votre extension:\n` +
        `1. Ouvrez l'extension KnissRadar\n` +
        `2. Allez dans Paramètres > Notifications\n` +
        `3. Entrez le code: ${chatId}\n\n` +
        `Commandes:\n` +
        `/link <code> — Connecter une extension\n` +
        `/stop — Désactiver les alertes\n` +
        `/status — Vérifier votre connexion`
    );

    console.log(`[Telegram] /start from @${username} (chat: ${chatId})`);
  });

  bot.command("link", async (ctx) => {
    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
      await ctx.reply("Usage: /link <votre-code-extension>");
      return;
    }

    const fingerprint = args[1];
    const chatId = ctx.chat.id;

    try {
      await pool.query(
        `INSERT INTO telegram_users (chat_id, user_fingerprint)
         VALUES ($1, $2)
         ON CONFLICT (user_fingerprint) DO UPDATE SET
           chat_id = EXCLUDED.chat_id,
           updated_at = NOW()`,
        [chatId, fingerprint]
      );

      await ctx.reply(
        `✅ Extension connectée!\n\n` +
          `Vous recevrez des alertes de baisse de prix ici.`
      );

      console.log(`[Telegram] /link: chat ${chatId} linked to fingerprint ${fingerprint}`);
    } catch (err) {
      console.error("[Telegram] /link error:", err);
      await ctx.reply("❌ Erreur lors de la connexion. Réessayez.");
    }
  });

  bot.command("stop", async (ctx) => {
    const chatId = ctx.chat.id;

    try {
      await pool.query(
        `UPDATE telegram_users SET is_active = FALSE WHERE chat_id = $1`,
        [chatId]
      );

      await ctx.reply(
        `🔕 Alertes désactivées.\n\n` +
          `Pour les réactiver, envoyez /start`
      );
    } catch (err) {
      console.error("[Telegram] /stop error:", err);
      await ctx.reply("❌ Erreur. Réessayez.");
    }
  });

  bot.command("status", async (ctx) => {
    const chatId = ctx.chat.id;

    try {
      const { rows } = await pool.query(
        `SELECT user_fingerprint, is_active, created_at
         FROM telegram_users
         WHERE chat_id = $1`,
        [chatId]
      );

      if (rows.length === 0) {
        await ctx.reply(
          `❌ Aucune extension connectée.\n\n` +
            `Envoyez /start pour commencer.`
        );
        return;
      }

      const user = rows[0];
      const status = user.is_active ? "✅ Actif" : "🔕 Inactif";

      await ctx.reply(
        `📊 Statut:\n\n` +
          `Extension: ${user.user_fingerprint}\n` +
          `Alertes: ${status}\n` +
          `Connecté le: ${new Date(user.created_at).toLocaleDateString("fr-FR")}`
      );
    } catch (err) {
      console.error("[Telegram] /status error:", err);
      await ctx.reply("❌ Erreur. Réessayez.");
    }
  });

  bot.launch();
  console.log("[Telegram] Bot started");

  process.once("SIGINT", () => bot?.stop("SIGINT"));
  process.once("SIGTERM", () => bot?.stop("SIGTERM"));

  return bot;
}

export async function sendTelegramAlert(
  chatId: number,
  message: string
): Promise<boolean> {
  if (!bot) {
    console.warn("[Telegram] Bot not initialized");
    return false;
  }

  try {
    await bot.telegram.sendMessage(chatId, message, { parse_mode: "HTML" });
    return true;
  } catch (err) {
    console.error(`[Telegram] Failed to send to ${chatId}:`, err);
    return false;
  }
}

export async function getTelegramUsers(
  fingerprint: string
): Promise<Array<{ chat_id: number; is_active: boolean }>> {
  const { rows } = await pool.query(
    `SELECT chat_id, is_active
     FROM telegram_users
     WHERE user_fingerprint = $1 AND is_active = TRUE`,
    [fingerprint]
  );
  return rows;
}
