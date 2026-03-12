import { NextRequest } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.dev.erza.ai/";

export async function POST(req: NextRequest) {
  const targetUrl = `${API_URL.replace(/\/$/, "")}/api/paraphrase`;

  const auth = req.headers.get("authorization") ?? "";
  const locale = req.headers.get("accept-language") ?? "en";
  const tzOffset =
    req.headers.get("x-timezone-offset") ??
    String(new Date().getTimezoneOffset());
  const body = await req.text();

  const backendResponse = await fetch(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      "Accept-Language": locale,
      "X-Timezone-Offset": tzOffset,
      ...(auth ? { Authorization: auth } : {}),
    },
    body,
  });

  if (!backendResponse.body) {
    const text = await backendResponse.text().catch(() => "");
    return new Response(text, {
      status: backendResponse.status,
      headers: backendResponse.headers,
    });
  }

  const headers = new Headers(backendResponse.headers);
  headers.set("Content-Type", "text/event-stream");
  headers.set("Cache-Control", "no-cache, no-transform");
  headers.set("Connection", "keep-alive");

  const { readable, writable } = new TransformStream();
  backendResponse.body.pipeTo(writable);

  return new Response(readable, {
    status: backendResponse.status,
    headers,
  });
}
