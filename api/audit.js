// GullStack - Free Audit Request API
// Sends leads via SendGrid

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SALES_EMAIL = process.env.SITE_EMAIL || 'hello@gullstack.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'leads@gullstack.com';

async function sendEmail({ to, from, fromName, subject, html, replyTo }) {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from, name: fromName || 'GullStack' },
      reply_to: replyTo ? { email: replyTo } : undefined,
      subject,
      content: [{ type: 'text/html', value: html }],
    }),
  });
  return response.ok;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { website, frustrations, email, company_fax } = req.body;

    // Honeypot check - if filled, it's a bot
    if (company_fax) {
      return res.status(200).json({
        success: true,
        message: "Thanks! Your audit will be delivered within 24 hours.",
      });
    }

    if (!website || !email) {
      return res.status(400).json({ error: 'Website URL and email are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Send confirmation to lead
    if (SENDGRID_API_KEY) {
      const confirmationHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Audit Request Received! 🎯</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <p style="font-size: 16px; color: #333;">Thanks for requesting a free website audit. We'll analyze your site and send you a detailed report within 24 hours.</p>
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
              <p style="margin: 5px 0;"><strong>Website:</strong> <a href="${website}">${website}</a></p>
              ${frustrations ? `<p style="margin: 5px 0;"><strong>Your concerns:</strong> ${frustrations}</p>` : ''}
            </div>
            <p style="font-size: 16px; color: #333; margin-top: 20px;">Questions? Reply to this email anytime.</p>
          </div>
          <div style="background: #1a1a1a; padding: 20px; text-align: center;">
            <p style="color: #888; margin: 0; font-size: 14px;">GullStack — Stop Bleeding Money</p>
          </div>
        </div>
      `;

      await sendEmail({
        to: email,
        from: FROM_EMAIL,
        subject: 'Your Free Website Audit is Coming!',
        html: confirmationHtml,
      });

      // Send notification to team
      const notificationHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #7c3aed; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">🎯 New Audit Request!</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Email:</strong></td><td style="padding: 10px; border-bottom: 1px solid #ddd;"><a href="mailto:${email}">${email}</a></td></tr>
              <tr><td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Website:</strong></td><td style="padding: 10px; border-bottom: 1px solid #ddd;"><a href="${website}">${website}</a></td></tr>
            </table>
            ${frustrations ? `<div style="margin-top: 20px; padding: 15px; background: white; border-radius: 8px; border: 1px solid #ddd;"><strong>Their frustrations:</strong><br/><p style="margin: 10px 0 0 0;">${frustrations}</p></div>` : ''}
          </div>
          <div style="background: #1a1a1a; padding: 15px; text-align: center;">
            <p style="color: #888; margin: 0; font-size: 12px;">Lead from gullstack.com</p>
          </div>
        </div>
      `;

      await sendEmail({
        to: SALES_EMAIL,
        from: FROM_EMAIL,
        fromName: 'GullStack Leads',
        subject: `🎯 Audit Request: ${website}`,
        html: notificationHtml,
        replyTo: email,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Thanks! Your audit will be delivered within 24 hours.",
    });

  } catch (error) {
    console.error('Audit form error:', error);
    return res.status(500).json({
      error: 'Something went wrong. Please try again.',
    });
  }
}
