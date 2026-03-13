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

RESPONSE FORMAT — THIS IS THE #1 RULE:
Every response MUST be 1-3 short sentences. Under 40 words total. No lists. No bullets. No bold. No markdown. Plain text only.

CONVERSATION FLOW (3 exchanges max before capture):
1. Ask what their biggest challenge is. One question, that's it.
2. They answer — give ONE short observation about their industry, then IMMEDIATELY ask for their website URL in the SAME message. Example: "Tough market but tons of upside. Drop your website URL and I'll run a free audit right now — I'll show you exactly what's costing you sales."
3. If they don't have a site or dodge the URL ask — pivot to email: "No site yet? Drop your email and I'll send you a custom growth plan. No spam, just strategy."

CRITICAL RULES:
- After your FIRST reply, EVERY response MUST end with either a URL ask or an email ask. No exceptions. Dead-end responses kill conversions.
- Never give insight without asking for the URL or email in the same message.
- If they give a URL, say "Let me take a look..." (the frontend handles the audit automatically).
- When you see [AUDIT RESULTS], translate the numbers into ONE plain-English sentence about the biggest problem, then ask for email to send the full breakdown.
- Gate all detailed value behind the email. Tease, don't teach.
- No emojis. No markdown formatting. Plain text only.
- You represent GullStack — marketing, websites, SEO/AEO, AI workforce.
- NEVER mention pricing. Focus on outcomes.`
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
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: 'Bogey unavailable', detail: err });
    }

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content || "Tell me more about your business — what's the biggest thing slowing your growth right now?";
    
    // Strip markdown formatting
    reply = reply.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/^#+\s*/gm, '').replace(/^[-*]\s+/gm, '').replace(/^\d+\.\s+/gm, '');
    
    // Strip newlines — force everything into one continuous block
    reply = reply.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Hard limit: 3 sentences max
    const sentences = reply.match(/[^.!?]*[.!?]+/g) || [reply];
    reply = sentences.slice(0, 3).join('').trim();
    
    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(200).json({ reply: "What's your business and what's holding it back? Drop your website URL and I'll show you what's costing you sales." });
  }
}
