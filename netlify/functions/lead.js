// Env: TELEGRAM_BOT_TOKEN, RECIPIENT_IDS (comma-separated)
export async function handler(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!TOKEN) return { statusCode: 500, body: "Missing TELEGRAM_BOT_TOKEN" };

  const hdr = k => event.headers[k] || event.headers[k.toLowerCase()] || "";
  const isJSON = (hdr("content-type") || "").includes("application/json");
  let data = {};
  if (isJSON) data = JSON.parse(event.body || "{}");
  else { const p = new URLSearchParams(event.body || ""); for (const [k,v] of p.entries()) data[k]=v; }
  if (data["bot-field"]) return { statusCode: 200, body: "ok" };

  const payload = {
    name: data.name || "", whatsapp: data.whatsapp || "", preferred: data.preferred || "",
    utm_source: data.utm_source || "", utm_medium: data.utm_medium || "",
    utm_campaign: data.utm_campaign || "", utm_content: data.utm_content || "", ref: data.ref || ""
  };

  const list = (process.env.RECIPIENT_IDS || "").split(",").map(s=>s.trim()).filter(Boolean);
  if (!list.length) return { statusCode: 500, body: "No RECIPIENT_IDS set." };

  const text = `🟡 Новый лид LemonMall
Имя: ${payload.name}
WhatsApp: ${payload.whatsapp}
Канал: ${payload.preferred}
UTM: ${payload.utm_source}/${payload.utm_medium}/${payload.utm_campaign}/${payload.utm_content}
Ref: ${payload.ref}`;

  try {
    const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
    await Promise.all(list.map(chat_id =>
      fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ chat_id, text }) })
    ));
    return { statusCode: 302, headers: { Location: "/thanks/" } };
  } catch {
    return { statusCode: 500, body: "Lead processing failed" };
  }
}