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

  const cvText = String(body?.cvText || "").trim();
  if (!cvText) {
    return json({ error: "cvText is required." }, { status: 400 });
  }

  const model = env.GROQ_MODEL || "llama-3.1-8b-instant";
  const systemPrompt = [
    "Extract structured CV data from raw resume text.",
    "Return strict JSON only (no markdown, no code fences).",
    "Do not invent details.",
    "Use this schema keys:",
    "fullName, jobTitle, linkedin, github, summary, skills, languages, experience, education, projects.",
    "languages is array of {name, level} where level is one of: native,c2,c1,b2,b1,a2,a1 when available.",
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
      temperature: 0.1,
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


