// netlify/functions/lead.js
export async function handler(event) {
  // Только из формы (POST)
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 302,
      headers: { Location: "/" },
      body: "Redirecting...",
    };
  }

  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const IDS_RAW = process.env.RECIPIENT_IDS || "";

  if (!TOKEN || !IDS_RAW) {
    console.error("Missing env: TELEGRAM_BOT_TOKEN or RECIPIENT_IDS");
    return {
      statusCode: 303,
      headers: { Location: "/thanks?status=fail" },
      body: "",
    };
  }

  // Почитаем тело (form-urlencoded или json — оба варианта поддержим)
  let data = {};
  const ct = (event.headers["content-type"] || "").toLowerCase();
  try {
    if (ct.includes("application/json")) {
      data = JSON.parse(event.body || "{}");
    } else {
      const p = new URLSearchParams(event.body || "");
      for (const [k, v] of p.entries()) data[k] = v;
    }
  } catch (e) {
    console.error("Body parse error:", e);
  }

  // Хантипот — если бот-поле заполнено, тихо уходим в /thanks
  if (data["bot-field"]) {
    return { statusCode: 303, headers: { Location: "/thanks" }, body: "" };
  }

  // Соберём полезные поля (имена как у вас в форме)
  const payload = {
    name: (data["name_surname"] || data["name"] || "").trim(),
    whatsapp: (data["whatsapp"] || "").trim(),
    preferred: data["preferred"] || "",
    comment: data["comment"] || "",
    utm_source: data["utm_source"] || "",
    utm_medium: data["utm_medium"] || "",
    utm_campaign: data["utm_campaign"] || "",
    utm_content: data["utm_content"] || "",
    ref: data["ref"] || "",
  };

  // Сообщение
  const lines = [
    "🟡 *Новый лид LemonMall*",
    `Имя: ${payload.name || "—"}`,
    `WhatsApp: ${payload.whatsapp || "—"}`,
    `Канал: ${payload.preferred || "—"}`,
  ];
  if (payload.comment) lines.push(`Комментарий: ${payload.comment}`);
  const utm = [
    payload.utm_source && `utm_source: ${payload.utm_source}`,
    payload.utm_medium && `utm_medium: ${payload.utm_medium}`,
    payload.utm_campaign && `utm_campaign: ${payload.utm_campaign}`,
    payload.utm_content && `utm_content: ${payload.utm_content}`,
    payload.ref && `ref: ${payload.ref}`,
  ].filter(Boolean);
  if (utm.length) lines.push("", utm.join(" / "));

  const text = lines.join("\n");

  // Отправка всем id
  const chatIds = IDS_RAW.split(",").map(s => s.trim()).filter(Boolean);
  const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;

  try {
    const sends = chatIds.map(id =>
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: id,
          text,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        }),
      }).then(r => r.json())
    );

    const results = await Promise.all(sends);

    // Проверим, не вернул ли кто-то ошибку
    const bad = results.find(r => !r.ok);
    if (bad) {
      console.error("Telegram error:", bad);
      return { statusCode: 303, headers: { Location: "/thanks?status=fail" }, body: "" };
    }

    // Успех
    return { statusCode: 303, headers: { Location: "/thanks" }, body: "" };
  } catch (e) {
    console.error("Send failed:", e);
    return { statusCode: 303, headers: { Location: "/thanks?status=fail" }, body: "" };
  }
}
