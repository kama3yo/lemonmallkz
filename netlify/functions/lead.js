// netlify/functions/lead.js
// DEBUG-версия: пишет подробные логи в Function logs, но токен не выводит.

export async function handler(event) {
  // 1) Принимаем только POST
  if (event.httpMethod !== "POST") {
    console.log("[lead] Wrong method:", event.httpMethod);
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // 2) Переменные окружения
  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const IDS_RAW = process.env.RECIPIENT_IDS || "";
  const IDS = IDS_RAW.split(",").map(s => s.trim()).filter(Boolean);

  if (!TOKEN) {
    console.error("[lead] Missing TELEGRAM_BOT_TOKEN env var");
    return { statusCode: 500, body: "Missing token" };
  }
  if (!IDS.length) {
    console.error("[lead] Missing RECIPIENT_IDS env var");
    return { statusCode: 500, body: "No recipients" };
  }

  // 3) Разбор входных данных
  const hdr = k => event.headers[k] || event.headers[k.toLowerCase()] || "";
  const ct = hdr("content-type");
  const isJSON = (ct || "").includes("application/json");

  let data = {};
  try {
    if (isJSON) {
      data = JSON.parse(event.body || "{}");
    } else {
      // application/x-www-form-urlencoded или multipart/form-data
      const p = new URLSearchParams(event.body || "");
      for (const [k, v] of p.entries()) data[k] = v;
    }
  } catch (e) {
    console.error("[lead] Body parse error:", e.message);
  }

  // 4) Антибот-поле (honeypot). Если заполнено — тихо выходим.
  if (data["bot-field"]) {
    console.log("[lead] Honeypot caught. Skip.");
    return { statusCode: 200, body: "ok" };
  }

  // 5) Готовим полезные поля
  const payload = {
    name: (data.name || data["name surname"] || "").trim(),
    whatsapp: (data.whatsapp || "").trim(),
    preferred: (data.preferred || "").trim(),
    comment: (data.comment || "").trim(),
    utm_source: (data.utm_source || "").trim(),
    utm_medium: (data.utm_medium || "").trim(),
    utm_campaign: (data.utm_campaign || "").trim(),
    utm_content: (data.utm_content || "").trim(),
    ref: (data.ref || "").trim(),
    form: (data["form-name"] || "").trim(),
  };

  // Значение ref по умолчанию — как договаривались ("Janna")
  if (!payload.ref) payload.ref = "Janna";

  // 6) Формируем текст в Telegram
  const lines = [];
  lines.push("🟡 <b>Новый лид LemonMall</b>");
  if (payload.name)      lines.push(`Имя: <b>${escape(payload.name)}</b>`);
  if (payload.whatsapp)  lines.push(`WhatsApp: <b>${escape(payload.whatsapp)}</b>`);
  if (payload.preferred) lines.push(`Канал: <b>${escape(payload.preferred)}</b>`);
  if (payload.comment)   lines.push(`Комментарий: ${escape(payload.comment)}`);
  lines.push(
    `UTM: ${escape(payload.utm_source || "")}/${escape(payload.utm_medium || "")}/${escape(payload.utm_campaign || "")}/${escape(payload.utm_content || "")}`
  );
  lines.push(`Ref: ${escape(payload.ref)}`);
  const text = lines.join("\n");

  // 7) Отладочные логи (без токена)
  console.log("[lead] Parsed payload keys:", Object.keys(payload));
  console.log("[lead] Recipients count:", IDS.length);
  console.log("[lead] Content-Type:", ct);

  // 8) Отправка в Telegram
  try {
    const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;

    // шлём всем chat_id параллельно
    const results = await Promise.allSettled(
      IDS.map(chat_id =>
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id,
            text,
            parse_mode: "HTML",
            disable_web_page_preview: true
          }),
        }).then(async r => {
          const bodyText = await r.text();
          console.log(`[lead] TG to ${chat_id} → ${r.status} ${bodyText}`);
          if (!r.ok) throw new Error(`TG ${r.status}: ${bodyText}`);
          return true;
        })
      )
    );

    const failed = results.filter(r => r.status === "rejected");
    if (failed.length) {
      console.error("[lead] Some TG sends failed:", failed.map(f => f.reason?.message || "Error"));
      return { statusCode: 500, body: "Telegram send failed" };
    }

    // 9) Редирект на /thanks
    return {
      statusCode: 302,
      headers: { Location: "/thanks" }
    };
  } catch (e) {
    console.error("[lead] Lead processing failed:", e.message);
    return { statusCode: 500, body: "Lead processing failed" };
  }
}

// простая экранизация для HTML
function escape(s) {
  return String(s).replace(/[<>&"]/g, ch => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;"
  }[ch]));
}
