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

  const jobDescription = String(body?.jobDescription || "").trim();
  if (!jobDescription) {
    return json({ error: "Job description is required." }, { status: 400 });
  }

  const cv = body?.cv && typeof body.cv === "object" ? body.cv : null;
  if (!cv) {
    return json({ error: "cv object is required." }, { status: 400 });
  }

  const model = env.GROQ_MODEL || "llama-3.1-8b-instant";
  const systemPrompt = [
    "You tailor CV JSON to a target job description.",
    "Hard rules:",
    "1) Keep all claims truthful and grounded in the provided CV only.",
    "2) Never invent employers, achievements, metrics, dates, degrees, tools, or certifications.",
    "3) Reorder, rewrite, and emphasize content to improve relevance to the JD.",
    "4) Preserve concise and professional wording.",
    "5) Return strict JSON only (no markdown, no commentary).",
    "Required schema keys:",
    "{",
    "\"cv\": {",
    "\"fullName\": string, \"jobTitle\": string, \"email\": string, \"mobile\": string, \"location\": string,",
    "\"linkedin\": string, \"github\": string, \"summary\": string,",
    "\"skills\": string[],",
    "\"languages\": [{\"name\": string, \"level\": \"native\"|\"c2\"|\"c1\"|\"b2\"|\"b1\"|\"a2\"|\"a1\"}],",
    "\"experience\": [{\"title\": string, \"company\": string, \"date\": string, \"description\": string}],",
    "\"education\": [{\"degree\": string, \"school\": string, \"date\": string, \"description\": string}],",
    "\"projects\": [{\"name\": string, \"stack\": string, \"link\": string, \"achievements\": string}]",
    "}",
    "}"
  ].join(" ");

  const userPrompt = JSON.stringify({ jobDescription, cv });

  const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    })
  });

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const errorMessage = data?.error?.message || data?.message || "Groq request failed.";
    return json({ error: errorMessage }, { status: upstream.status });
  }

  const raw = String(data?.choices?.[0]?.message?.content || "").trim();
  try {
    const parsed = parseModelJson(raw);
    const cvOutput = parsed?.cv && typeof parsed.cv === "object" ? parsed.cv : parsed;
    return json({ cv: normalizeTailoredCv(cvOutput) });
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

function normalizeTailoredCv(value) {
  const safe = value && typeof value === "object" ? value : {};
  return {
    fullName: String(safe.fullName || "").trim(),
    jobTitle: String(safe.jobTitle || "").trim(),
    email: String(safe.email || "").trim(),
    mobile: String(safe.mobile || "").trim(),
    location: String(safe.location || "").trim(),
    linkedin: String(safe.linkedin || "").trim(),
    github: String(safe.github || "").trim(),
    summary: String(safe.summary || "").trim(),
    skills: Array.isArray(safe.skills)
      ? [...new Set(safe.skills.map((entry) => String(entry || "").trim()).filter(Boolean))].slice(0, 80)
      : [],
    languages: Array.isArray(safe.languages)
      ? safe.languages
        .map((entry) => ({
          name: String(entry?.name || "").trim(),
          level: normalizeLanguageLevel(entry?.level)
        }))
        .filter((entry) => entry.name)
      : [],
    experience: normalizeArray(safe.experience, (entry) => ({
      title: String(entry?.title || "").trim(),
      company: String(entry?.company || "").trim(),
      date: String(entry?.date || "").trim(),
      description: String(entry?.description || "").trim()
    })),
    education: normalizeArray(safe.education, (entry) => ({
      degree: String(entry?.degree || "").trim(),
      school: String(entry?.school || "").trim(),
      date: String(entry?.date || "").trim(),
      description: String(entry?.description || "").trim()
    })),
    projects: normalizeArray(safe.projects, (entry) => ({
      name: String(entry?.name || "").trim(),
      stack: String(entry?.stack || "").trim(),
      link: String(entry?.link || "").trim(),
      achievements: String(entry?.achievements || "").trim()
    }))
  };
}

function normalizeArray(value, mapper) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => mapper(entry && typeof entry === "object" ? entry : {}))
    .filter((entry) => Object.values(entry).some(Boolean));
}

function normalizeLanguageLevel(value) {
  const allowed = new Set(["native", "c2", "c1", "b2", "b1", "a2", "a1"]);
  const level = String(value || "").toLowerCase().trim();
  return allowed.has(level) ? level : "b2";
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
