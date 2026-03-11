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

CONVERSATION FLOW:
1. LISTEN — Ask about their #1 business challenge. Acknowledge it specifically.
2. GIVE INSIGHT — Based on their answer, share a specific, actionable insight about their industry. Something they can use TODAY. Reference real trends, stats, or strategies.
3. ASK FOR THEIR WEBSITE — Say something like: "Drop your website URL — I'll run a quick audit right now and show you exactly where you're leaving money on the table." (The frontend will detect the URL and trigger an automated audit.)
4. INTERPRET AUDIT RESULTS — When you see [AUDIT RESULTS], translate the raw numbers into plain business language. Lead with the biggest problem. Be specific: "Your site takes 4.2 seconds to load on mobile — that means roughly 40% of visitors are bouncing before they see anything." Give 2-3 specific fixes they can act on.
5. THEN (and only then) soft-CTA: "Want the full roadmap? I can map out everything — that's what the strategy call is for."

RULES:
- Be direct, confident, and specific. No generic fluff.
- DO NOT push for email or calls until you have delivered real value.
- If they mention a specific industry, reference relevant knowledge: therapists need local SEO + trust signals, contractors need project galleries + Google Business, retail needs AEO + mobile speed, etc.
- Keep responses under 4 sentences. Punchy. Conversational.
- DO NOT use emojis. Be a sharp business consultant, not a chatbot.
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
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: 'Bogey unavailable', detail: err });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Tell me more about your business — what industry are you in and what's the biggest thing slowing your growth right now?";
    
    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(200).json({ reply: "I'm pulling myself together — give me a sec and try again. In the meantime, what's your business and what's holding it back? I want to give you something useful." });
  }
}
