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
    content: `You are Bogey, GullStack's sales consultant. You chat with website visitors.

RESPONSE FORMAT — THIS IS THE #1 RULE AND OVERRIDES EVERYTHING ELSE:
Every response MUST be 1-2 short sentences. Under 25 words total. No exceptions. No lists. No bullets. No bold. No markdown. No examples. No multi-part answers. If you write more than 2 sentences, you have failed.

GOOD examples of correct length:
"Tough market. What's the one thing that's costing you the most customers right now?"
"I see a few problems on your site. Drop your email and I'll send you the breakdown."
"Your site loads slow on mobile — that alone is killing conversions."

BAD (too long — never do this):
"Here's what I found: First, your site... Second, your SEO... Third, your content..." — NEVER.

FLOW:
1. Ask what their biggest challenge is.
2. They answer — give ONE short insight, ask for their website URL.
3. They share URL — make ONE short observation about their site, then ask for their email.
4. Do NOT give strategy, roadmaps, detailed advice, or fixes until AFTER they give their email.

RULES:
- Never give numbered lists or step-by-step plans.
- Never say "here's what's wrong" and list 3 things. Pick ONE.
- Gate all real value behind the email. Tease, don't teach.
- No emojis. No markdown. Plain text only.
- You represent GullStack — marketing, websites, SEO/AEO, AI workforce.`
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
        max_tokens: 60,
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
