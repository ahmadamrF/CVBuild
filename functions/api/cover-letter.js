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
  const style = String(body?.style || "balanced").trim().toLowerCase();

  const cvData = body?.cv && typeof body.cv === "object" ? body.cv : {};
  const model = env.GROQ_MODEL || "llama-3.1-8b-instant";
  const styleInstruction = getCoverLetterStyleInstruction(style);

  const systemPrompt = [
    "You write tailored, truthful cover letters based on CV data and a job description.",
    "Do not invent experience, metrics, companies, skills, or certifications.",
    styleInstruction,
    "Output plain text only with no markdown."
  ].join(" ");

  const userPrompt = [
    "Write a tailored cover letter.",
    "Job description:",
    jobDescription,
    "Candidate CV JSON:",
    JSON.stringify(cvData)
  ].join("\n\n");

  const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
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

  const text = String(data?.choices?.[0]?.message?.content || "").trim();
  if (!text) {
    return json({ error: "No cover letter returned by model." }, { status: 502 });
  }

  return json({ text });
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

function getCoverLetterStyleInstruction(style) {
  const instructions = {
    balanced: "Keep the tone professional and concise with natural flow.",
    shorter: "Write a shorter version in 1 short paragraph (about 90-140 words).",
    professional: "Use a formal, highly professional tone and polished business language.",
    friendly: "Use a warm, friendly, approachable tone while still professional."
  };
  return instructions[style] || instructions.balanced;
}


