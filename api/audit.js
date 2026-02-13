// Vercel Serverless Function - Audit Request Handler
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { url, timestamp } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    console.log(`[AUDIT REQUEST] ${timestamp} - ${url}`);
    
    // Send notification via Telegram Bot API (if configured)
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;
    
    if (telegramBotToken && telegramChatId) {
      const message = `🔍 New Audit Request\n\nURL: ${url}\nTime: ${timestamp}`;
      
      await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: message,
          parse_mode: 'HTML'
        })
      });
    }
    
    // Send via Resend (if configured)
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (resendApiKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'GullStack <noreply@gullstack.com>',
          to: ['hello@gullstack.com'],
          subject: `New Audit Request: ${url}`,
          html: `
            <h2>New Website Audit Request</h2>
            <p><strong>URL:</strong> ${url}</p>
            <p><strong>Submitted:</strong> ${timestamp}</p>
          `
        })
      });
    }
    
    return res.status(200).json({ success: true, message: 'Audit request received' });
    
  } catch (error) {
    console.error('Audit submission error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
