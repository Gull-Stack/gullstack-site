export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  // Normalize URL
  let targetUrl = url.trim();
  if (!/^https?:\/\//i.test(targetUrl)) targetUrl = 'https://' + targetUrl;

  try {
    // Google PageSpeed Insights API (free, no key required for basic)
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(targetUrl)}&strategy=mobile&category=performance&category=seo&category=accessibility`;
    
    const response = await fetch(apiUrl, { signal: AbortSignal.timeout(30000) });
    
    if (!response.ok) {
      return res.status(200).json({
        success: false,
        error: 'Could not analyze that URL. Make sure it is a live, publicly accessible website.'
      });
    }

    const data = await response.json();
    const categories = data.lighthouseResult?.categories || {};
    const audits = data.lighthouseResult?.audits || {};

    const performance = Math.round((categories.performance?.score || 0) * 100);
    const seo = Math.round((categories.seo?.score || 0) * 100);
    const accessibility = Math.round((categories.accessibility?.score || 0) * 100);

    // Extract key issues
    const issues = [];
    
    // Speed metrics
    const fcp = audits['first-contentful-paint']?.displayValue;
    const lcp = audits['largest-contentful-paint']?.displayValue;
    const cls = audits['cumulative-layout-shift']?.displayValue;
    const tbt = audits['total-blocking-time']?.displayValue;

    if (fcp) issues.push(`First paint: ${fcp}`);
    if (lcp) issues.push(`Largest paint: ${lcp}`);
    if (tbt) issues.push(`Blocking time: ${tbt}`);
    if (cls) issues.push(`Layout shift: ${cls}`);

    // SEO specifics
    const metaDesc = audits['meta-description']?.score;
    const titleTag = audits['document-title']?.score;
    const hreflang = audits['hreflang']?.score;
    const canonical = audits['canonical']?.score;
    const isCrawlable = audits['is-crawlable']?.score;
    
    const seoIssues = [];
    if (metaDesc === 0) seoIssues.push('Missing meta description');
    if (titleTag === 0) seoIssues.push('Missing or poor title tag');
    if (isCrawlable === 0) seoIssues.push('Page is blocking search engines');
    if (canonical === 0) seoIssues.push('Missing canonical URL');

    // Mobile friendliness
    const viewport = audits['viewport']?.score;
    const fontSize = audits['font-size']?.score;
    const tapTargets = audits['tap-targets']?.score;
    
    const mobileIssues = [];
    if (viewport === 0) mobileIssues.push('Not mobile-optimized');
    if (fontSize === 0) mobileIssues.push('Text too small on mobile');
    if (tapTargets === 0) mobileIssues.push('Buttons/links too small to tap');

    // Schema/structured data check
    const structuredData = audits['structured-data-item']?.score;
    
    return res.status(200).json({
      success: true,
      url: targetUrl,
      scores: { performance, seo, accessibility },
      speed: { fcp, lcp, tbt, cls },
      seoIssues,
      mobileIssues,
      hasStructuredData: structuredData !== 0,
      issueCount: seoIssues.length + mobileIssues.length + (performance < 50 ? 1 : 0) + (structuredData === 0 ? 1 : 0),
    });

  } catch (err) {
    return res.status(200).json({
      success: false,
      error: 'Audit timed out or failed. The site may be slow or blocking analysis.'
    });
  }
}
