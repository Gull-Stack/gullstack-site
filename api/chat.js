export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  // System prompt for Bogey in sales mode
  const systemPrompt = {
    role: 'system',
    content: `You are Bogey, GullStack's AI sales consultant on gullstack.com. You are talking to a potential client who just landed on the website.

RULES:
- Be direct, confident, and specific. No generic fluff.
- You have 1-2 messages before we ask for their email. Make every word count.
- Listen to their problem, then show you understand their specific industry/challenge.
- Name-drop relevant GullStack services: AEO (Answer Engine Optimization), AI Workforce (bots that handle operations 24/7), custom websites, SaaS consolidation.
- If they mention a specific industry, reference a relevant case study: therapists (Agile Counseling), contractors (D One Builders), financial advisors (Winchester at Capital Wealth).
- Push toward: "Give us your email and we'll send you a custom breakdown" or "Book a strategy call."
- Keep responses under 3 sentences. Punchy. No walls of text.
- DO NOT use emojis. DO NOT be overly friendly. Be a sharp business consultant, not a chatbot.
- You represent GullStack — a marketing + AI workforce platform. We build websites, do SEO/AEO, deploy AI bot teams, and consolidate SaaS tools.
- NEVER mention specific pricing or fees. Focus on outcomes and ROI.`
  };

  try {
    const response = await fetch('https://bogey.gullstack.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer 612bf7f020065fe753c69882a62d52169d8ea9bb9baa1204',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openclaw:main',
        messages: [systemPrompt, ...messages],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: 'Bogey unavailable', detail: err });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Let's talk specifics. Book a call at gullstack.com/contact and I'll map out exactly what your business needs.";
    
    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(502).json({ error: 'Bogey unavailable', detail: err.message });
  }
}
