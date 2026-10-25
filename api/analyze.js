export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "AI service is not configured yet. Add OPENROUTER_API_KEY in Vercel Environment Variables, then redeploy."
    });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const claim = typeof body.claim === "string" ? body.claim.trim() : "";
    const context = typeof body.context === "string" ? body.context.trim().slice(0, 500) : "";
    const language = body.language === "Hausa" ? "Hausa" : "English";

    if (claim.length < 12) return res.status(400).json({ error: "Please provide a claim of at least 12 characters." });
    if (claim.length > 5000) return res.status(400).json({ error: "Claim is too long. Maximum 5,000 characters." });

    const systemPrompt = `You are VoteWise AI, a nonpartisan election-information and claim-assessment assistant for Nigeria.
Your job is to help users reason carefully about election-related claims, not to persuade them politically.
Critical rules:
- You do NOT have live web access in this request. Never pretend that you checked live news, INEC records, official databases, or URLs.
- Do not invent sources, URLs, dates, official statements, election results, laws, or statistics.
- Do not label a claim false merely because it sounds suspicious. Distinguish "unverified", "misleading based on provided information", and "evidence appears supportive".
- Default label should be "unverified". Use "supported" only when the claim is logically supported by information actually included in the user's claim/context; use "likely_false" only when the provided information itself clearly contradicts the claim. Be conservative.
- Give concrete verification steps and suggest official source names (such as INEC) without fabricating exact URLs. For source entries without a verified URL, use url as an empty string and include a note telling the user what to search for.
- Never claim that an anomaly proves fraud or wrongdoing. Encourage corroboration by multiple credible sources.
- Do not ask for or expose personal data. If the claim includes private identifying information, recommend removing it before sharing.
- Respond in ${language}. Keep the wording accessible and concise.
Return ONLY valid JSON with exactly these keys:
{"label":"unverified|supported|likely_false","verdict":"short headline","summary":"2-4 sentence explanation","reasons":["reason 1","reason 2"],"verification_steps":["step 1","step 2"],"sources":[{"title":"source name or search phrase","url":"","note":"what to look for"}],"caution":"brief limitation statement"}
Use 2-4 reasons, 3-5 verification steps, and 2-4 source suggestions. Never put markdown fences around JSON.`;

    const userPrompt = `Assess this election-related claim without pretending to independently verify it.
Claim: ${claim}
Optional context: ${context || "Not provided"}
Remember: no live web access. Clearly state what evidence is missing.`;

    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL || "https://votewise-ai.vercel.app",
        "X-Title": "VoteWise AI"
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 900,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });

    const raw = await upstream.text();
    if (!upstream.ok) {
      console.error("OpenRouter returned status:", upstream.status);
      return res.status(502).json({ error: "The AI provider could not complete the request. Check your provider account/model and try again." });
    }

    let upstreamData;
    try { upstreamData = JSON.parse(raw); } catch {
      return res.status(502).json({ error: "The AI provider returned an unreadable response. Please try again." });
    }
    const content = upstreamData?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      return res.status(502).json({ error: "The AI provider returned an empty response. Please try again." });
    }

    let parsed;
    try {
      const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(502).json({ error: "The AI response could not be formatted safely. Please try again." });
    }

    const validLabels = ["unverified", "supported", "likely_false"];
    const cleanList = (value, max) => Array.isArray(value)
      ? value.filter(v => typeof v === "string").slice(0, max).map(v => v.slice(0, 500))
      : [];
    const sources = Array.isArray(parsed.sources) ? parsed.sources.slice(0, 4).map(s => ({
      title: typeof s?.title === "string" ? s.title.slice(0, 180) : "Suggested verification source",
      url: typeof s?.url === "string" && /^https:\/\/[^\s]+$/i.test(s.url) ? s.url : "",
      note: typeof s?.note === "string" ? s.note.slice(0, 300) : ""
    })) : [];

    return res.status(200).json({
      label: validLabels.includes(parsed.label) ? parsed.label : "unverified",
      verdict: typeof parsed.verdict === "string" ? parsed.verdict.slice(0, 180) : "This claim needs further verification",
      summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 1200) : "There is not enough information to assess this claim confidently.",
      reasons: cleanList(parsed.reasons, 4),
      verification_steps: cleanList(parsed.verification_steps, 5),
      sources,
      caution: typeof parsed.caution === "string" ? parsed.caution.slice(0, 500) : "AI can make mistakes. Verify important claims with primary sources."
    });
  } catch (error) {
    console.error("VoteWise API error:", error?.message || "Unknown error");
    return res.status(500).json({ error: "Unexpected server error. Please try again." });
  }
      }
