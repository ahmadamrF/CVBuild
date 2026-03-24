export async function onRequestPost(context) {
  const { request, env } = context;
  const apiKey = resolveApiKey(request, env);

  if (!apiKey) {
    return json(
      { error: "Missing Groq API key. Add GROQ_API_KEY in Cloudflare secrets or provide x-groq-api-key." },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const cvText = String(body?.cvText || "").trim();
  if (!cvText) {
    return json({ error: "cvText is required." }, { status: 400 });
  }

  const model = env.GROQ_MODEL || "llama-3.1-8b-instant";
  const systemPrompt = [
    "You are a deterministic CV transcription engine.",
    "Task: map raw resume text to structured JSON without rewriting.",
    "Return strict JSON only (no markdown, no code fences, no commentary).",
    "Extraction rules:",
    "1) Copy wording exactly from source whenever possible.",
    "2) Do NOT paraphrase, enhance, translate, summarize, or polish text.",
    "3) Do NOT invent details, dates, metrics, tools, or companies.",
    "4) If a field is missing, use empty string or empty array.",
    "5) Keep original casing and punctuation.",
    "Schema keys:",
    "fullName, jobTitle, email, mobile, location, linkedin, github, summary, skills, languages, experience, education, projects.",
    "languages is array of {name, level} where level is one of: native,c2,c1,b2,b1,a2,a1 when explicitly stated.",
    "experience: {title, company, date, description}",
    "education: {degree, school, date, description}",
    "projects: {name, stack, link, achievements}"
  ].join(" ");

  const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: cvText.slice(0, 25000) }
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

function resolveApiKey(request, env) {
  const userKey = String(request.headers.get("x-groq-api-key") || "").trim();
  if (userKey) return userKey;
  return String(env.GROQ_API_KEY || "").trim();
}


