// Email notification when a visitor drops their email (lead capture)
async function notifyLeadCapture(rawContent) {
  if (!process.env.SENDGRID_API_KEY) return;
  try {
    const emailMatch = rawContent.match(/Email:\s*(\S+)/);
    const email = emailMatch ? emailMatch[1] : 'unknown';
    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/Boise' });
    const convo = rawContent.replace(/.*Previous conversation:\s*/, '').replace(/\|/g, '\n');
    await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: 'bryce@gullstack.com' }] }],
        from: { email: 'leads@gullstack.com', name: 'Bogey' },
        subject: `🔥 LEAD CAPTURED — ${email}`,
        content: [{
          type: 'text/html',
          value: `<div style="font-family:sans-serif;max-width:600px;">
            <h2 style="color:#22c55e;margin-bottom:4px;">Lead Captured!</h2>
            <p style="color:#888;margin-top:0;">${timestamp} MST</p>
            <div style="background:#f0fdf4;padding:16px;border-radius:8px;margin:16px 0;border:1px solid #bbf7d0;">
              <strong>Email:</strong> <a href="mailto:${email}">${email}</a>
            </div>
            <div style="background:#f4f4f5;padding:16px;border-radius:8px;margin:16px 0;">
              <strong>Conversation:</strong><br><pre style="white-space:pre-wrap;font-size:0.85rem;">${convo}</pre>
            </div>
            <p><strong>Follow up ASAP.</strong></p>
          </div>`,
        }],
      }),
    });
  } catch (e) {
    console.error('Lead notification failed:', e.message);
  }
}

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

  // Notify when a visitor drops their email
  const lastUserMsg = messages[messages.length - 1]?.content || '';
  if (lastUserMsg.startsWith('[LEAD CAPTURED]')) {
    notifyLeadCapture(lastUserMsg);
  }

  // System prompt for Bogey — value-first sales mode
  const systemPrompt = {
    role: 'system',
    content: `You are Bogey, GullStack's AI sales consultant on gullstack.com. You are talking to a potential client who just landed on the website.

YOUR GOAL: Provide real value BEFORE asking for anything. Earn the next step, don't beg for it.

CONVERSATION FLOW (follow this STRICTLY — do not skip steps):
1. LISTEN — Ask about their #1 business challenge. One question, nothing else.
2. GIVE ONE INSIGHT — Based on their answer, share ONE specific insight about their industry. Something useful. Then ask for their website URL so you can look at it.
3. ACKNOWLEDGE THE URL — When they share a URL, say something like "Let me take a look" and give ONE observation about their site. Keep it short.
4. ASK FOR EMAIL — After giving that one observation, ALWAYS ask for their email. Say something like: "I can see a few things right away. Drop your email and I'll send you a proper breakdown — no spam, just the stuff that'll actually move the needle."
5. AFTER EMAIL — Once they give their email (you'll see [LEAD CAPTURED] or similar), THEN give them a bit more detail and push toward a strategy call.

CRITICAL RULES:
- NEVER give a full strategy, roadmap, multi-phase plan, or detailed recommendations BEFORE getting their email. That's giving away the store for free.
- After step 3, EVERY response must push toward getting the email until you have it.
- Once you've made 3+ exchanges without getting an email, be more direct: "Look, I can tell you exactly how to fix this — just need your email so I can send it over properly."
- If they mention a specific industry, reference relevant knowledge: therapists need local SEO + trust signals, contractors need project galleries + Google Business, retail needs AEO + mobile speed, etc.
- STRICT LENGTH: 2-3 sentences MAX per response. Never more. If you need to make multiple points, pick the ONE most impactful and save the rest.
- Write like a text message, not an essay. Short. Punchy. Conversational.
- NO numbered lists, NO bullet points, NO markdown formatting (no asterisks, no bold, no headers). Plain conversational text only.
- DO NOT use emojis. Be a sharp business consultant, not a chatbot.
- ONE idea per message. If you have 3 insights, give the best one and let them ask for more.
- You represent GullStack — marketing, AI workforce, websites, SEO/AEO, SaaS consolidation.
- NEVER mention specific pricing. Focus on outcomes and ROI.
- If they ask "what do you do" or similar, don't list services — ask about THEIR problem first.
- When audit data is provided, ALWAYS reference the actual numbers. Never give generic advice when you have real data.`
  };

  try {
    const response = await fetch('https://bogey.gullstack.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.BOGEY_GATEWAY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openclaw:main',
        messages: [systemPrompt, ...messages],
        max_tokens: 120,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: 'Bogey unavailable', detail: err });
    }

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content || "Tell me more about your business — what industry are you in and what's the biggest thing slowing your growth right now?";
    
    // Strip any markdown formatting that slipped through
    reply = reply.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/^#+\s*/gm, '').replace(/^[-*]\s+/gm, '').replace(/^\d+\.\s+/gm, '');
    
    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(200).json({ reply: "I'm pulling myself together — give me a sec and try again. In the meantime, what's your business and what's holding it back? I want to give you something useful." });
  }
}
