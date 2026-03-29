// vercel.js
export const config = {
  runtime: 'edge',
};

function cleanJsonResponse(rawText) {
  return rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

export default async function handler(req) {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { websiteUrl } = await req.json();

    if (!websiteUrl) {
      return new Response(JSON.stringify({ error: 'Website URL is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const prompt = `
You are an expert website conversion critic.

Analyze this website URL: ${websiteUrl}

Return ONLY valid JSON in this exact format:
{
  "conversionScore": number,
  "summary": "short summary",
  "issues": [
    {
      "title": "Issue title",
      "problem": "Why this hurts conversions",
      "fix": "How to improve it"
    }
  ]
}

Rules:
- conversionScore must be 1-10
- include 3 to 5 issues
- keep summary concise
- do not include markdown
- do not wrap response in backticks
`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: prompt,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: 'OpenAI request failed', details: errText }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    const rawText =
      data.output_text ||
      data.output?.map(item => item?.content?.map(c => c?.text || '').join('')).join('') ||
      '';

    const cleaned = cleanJsonResponse(rawText);
    const parsed = JSON.parse(cleaned);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Something went wrong while generating the critique.',
        details: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
      }
