import { parseFayuAssistantHtml } from "../src/fayuAssistant.js";
import { buildFayuAssistantUrl, resolveFayuAssistantInput } from "../src/verbData.js";

export default async function handler(request, response) {
  const url = new URL(request.url, "https://french-verb-trainer.local");
  const verb = url.searchParams.get("verb")?.trim();

  if (!verb) {
    sendJson(response, 400, { error: "Missing verb" });
    return;
  }

  const lookupTerm = resolveFayuAssistantInput(verb);
  const sourceUrl = buildFayuAssistantUrl(lookupTerm);
  let upstream;

  try {
    upstream = await fetch(sourceUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/605.1.15 Safari/605.1.15"
      }
    });
  } catch (error) {
    sendJson(response, 502, { error: `无法连接法语助手：${error.message}`, sourceUrl });
    return;
  }

  if (!upstream.ok) {
    sendJson(response, 502, { error: `法语助手返回 ${upstream.status}`, sourceUrl });
    return;
  }

  const html = await upstream.text();
  const verbData = parseFayuAssistantHtml(html, lookupTerm);
  if (!verbData) {
    sendJson(response, 422, { error: "无法自动解析该页面，请手动校对。", sourceUrl });
    return;
  }

  sendJson(response, 200, { verb: verbData, sourceUrl });
}

function sendJson(response, status, payload) {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}
