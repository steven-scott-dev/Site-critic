// /api/critique.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "Missing URL" });
  }

  try {
    // Fetch website HTML
    const site = await fetch(url);
    const html = await site.text();

    // Clean HTML (very basic)
    const text = html.replace(/<[^>]*>?/gm, " ").slice(0, 8000);

    // Call OpenAI
    const aiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        input: `
Analyze this business website and give:
- conversion score (1-10)
- what hurts conversions
- what to fix

Website content:
${text}
        `
      })
    });

    const aiData = await aiRes.json();

    res.status(200).json({
      result: aiData.output_text || "No response"
    });

  } catch (err) {
    res.status(500).json({ error: "Something failed" });
  }
}
