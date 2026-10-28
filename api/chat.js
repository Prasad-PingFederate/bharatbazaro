/**
 * Vercel Serverless Function: /api/chat.js
 * Companion endpoint for BazarAI chat window.
 * Supports Groq (GROQ_API_KEY), Gemini (GEMINI_API_KEY), or OpenRouter (HERMES_API_KEY).
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { message, contextDeals } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  const systemPrompt = `You are BazarAI, a world-class shopping, deal, and discount advisor for BharatBazaro.com.
You help Indian online shoppers find genuine Amazon India price errors, hidden on-page coupons, lowest prices, and Keepa historical price graphs.
Always include direct tips on how to claim on-page checkbox coupons, bank card instant discounts, and Amazon Prime benefits.
When suggesting Amazon links, use partner affiliate tag "dammaiprasad-21". Be concise, friendly, and enthusiastic with emojis!`;

  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const hermesKey = process.env.HERMES_API_KEY;

  try {
    // 1. Try Groq (ultra fast LLM response)
    if (groqKey) {
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          temperature: 0.6,
          max_tokens: 500
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) return res.status(200).json({ reply, provider: 'groq' });
      }
    }

    // 2. Try Gemini
    if (geminiKey) {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\nUser Question: ${message}` }] }]
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply) return res.status(200).json({ reply, provider: 'gemini' });
      }
    }

    // 3. Try OpenRouter (Hermes / DeepSeek)
    if (hermesKey) {
      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${hermesKey}`
        },
        body: JSON.stringify({
          model: 'nousresearch/hermes-3-llama-3.1-8b',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ]
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) return res.status(200).json({ reply, provider: 'openrouter' });
      }
    }

    return res.status(200).json({
      reply: `👋 I'm analyzing Amazon India live deals! Tap a quick category shortcut or ask for any budget (e.g. *earbuds under 999*).`,
      fallback: true
    });
  } catch (err) {
    return res.status(500).json({ error: err.message, fallback: true });
  }
}

