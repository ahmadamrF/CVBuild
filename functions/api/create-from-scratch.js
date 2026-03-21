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

  const answers = body?.answers && typeof body.answers === "object" ? body.answers : null;
  if (!answers) {
    return json({ error: "answers object is required." }, { status: 400 });
  }

  const fullName = String(answers.fullName || "").trim();
  const targetRole = String(answers.targetRole || "").trim();
  if (!fullName || !targetRole) {
    return json({ error: "Required answers are missing (fullName, targetRole)." }, { status: 400 });
  }

  const model = env.GROQ_MODEL || "llama-3.1-8b-instant";
  const systemPrompt = [
    "You create a complete, truthful CV JSON from questionnaire answers.",
    "Do not invent employers, degrees, dates, links, or certifications that the user did not imply.",
    "You may rewrite for clarity and professional presentation.",
    "Keep achievements realistic and based only on user-provided details.",
    "Return strict JSON only (no markdown, no code fences).",
    "Output schema:",
    "{",
    "\"cv\": {",
    "\"fullName\": string, \"jobTitle\": string, \"linkedin\": string, \"github\": string, \"summary\": string,",
    "\"skills\": string[],",
    "\"languages\": [{\"name\": string, \"level\": \"native\"|\"c2\"|\"c1\"|\"b2\"|\"b1\"|\"a2\"|\"a1\"}],",
    "\"experience\": [{\"title\": string, \"company\": string, \"date\": string, \"description\": string}],",
    "\"education\": [{\"degree\": string, \"school\": string, \"date\": string, \"description\": string}],",
    "\"projects\": [{\"name\": string, \"stack\": string, \"link\": string, \"achievements\": string}]",
    "},",
    "\"design\": {\"template\": \"modern\"|\"classic\"|\"minimal\"|\"executive\"|\"creative\"}",
    "}"
  ].join(" ");

  const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0.25,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify({ answers, language: body?.language || "en" }) }
      ]
    })
  });

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const errorMessage = data?.error?.message || data?.message || "Groq request failed.";
    return json({ error: errorMessage }, { status: upstream.status });
  }

  const raw = String(data?.choices?.[0]?.message?.content || "");
  try {
    const parsed = parseModelJson(raw);
    return json(parsed);
  } catch (error) {
    return json(
      { error: error.message || "AI response could not be parsed as JSON." },
      { status: 502 }
    );
  }
}

function parseModelJson(raw) {
  const clean = String(raw || "")
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(clean);
  } catch {
    throw new Error("AI response could not be parsed as JSON.");
  }
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
