export async function onRequestPost(context) {
  const { request, env } = context;
  const fallbackApiKey = "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";
  const apiKey = env.GROQ_API_KEY || fallbackApiKey;

  if (!apiKey) {
    return json(
      { error: "Missing GROQ_API_KEY environment variable or fallback key." },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = String(body?.text || "").trim();
  if (!text) {
    return json({ error: "Text is required." }, { status: 400 });
  }

  const section = String(body?.section || "CV section");
  const fieldLabel = String(body?.fieldLabel || "text field");
  const contextData = body?.context && typeof body.context === "object"
    ? body.context
    : {};

  const model = env.GROQ_MODEL || "llama-3.1-8b-instant";

  const systemPrompt = [
    "You improve resume text.",
    "Keep the exact meaning, context, and factual details.",
    "Do not add fake claims, awards, dates, metrics, tools, companies, or responsibilities.",
    "Do not change language unless the input is mixed.",
    "Make it clearer, more professional, and concise.",
    "Return plain text only with no markdown and no explanations."
  ].join(" ");

  const userPrompt = [
    `Section: ${section}`,
    `Field: ${fieldLabel}`,
    `CV context: ${JSON.stringify(contextData)}`,
    "Original text:",
    text
  ].join("\n");

  const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    })
  });

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const errorMessage =
      data?.error?.message || data?.message || "Groq request failed.";
    return json({ error: errorMessage }, { status: upstream.status });
  }

  const enhanced = String(data?.choices?.[0]?.message?.content || "").trim();
  if (!enhanced) {
    return json({ error: "No enhancement returned by model." }, { status: 502 });
  }

  return json({ text: enhanced });
}

function json(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(init.headers || {})
    }
  });
}

