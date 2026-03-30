async function getAccessToken() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !privateKeyRaw) {
    throw new Error("Missing Google service account credentials.");
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  const encode = (obj) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const unsigned = `${encode(header)}.${encode(payload)}`;

  const { createSign } = await import("node:crypto");
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();

  const signature = signer
    .sign(privateKey, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${unsigned}.${signature}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });

  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(tokenJson.error_description || tokenJson.error || "Failed to get Google access token.");
  }

  return tokenJson.access_token;
}

function makeLeadId() {
  const stamp = Date.now().toString().slice(-6);
  const rand = Math.floor(Math.random() * 900 + 100);
  return `L-${stamp}-${rand}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sheetName = process.env.GOOGLE_SHEET_TAB || "Leads";

  if (!sheetId) {
    return res.status(500).json({ error: "Missing GOOGLE_SHEET_ID." });
  }

  const {
    name = "",
    email = "",
    phone = "",
    url = "",
    businessType = "",
    goal = "",
    extraContext = ""
  } = req.body || {};

  if (!url) {
    return res.status(400).json({ error: "Website URL is required." });
  }

  try {
    const accessToken = await getAccessToken();
    const leadId = makeLeadId();
    const createdAt = new Date().toISOString();

    const values = [[
      leadId,
      createdAt,
      name,
      email,
      phone,
      url,
      businessType,
      goal,
      extraContext,
      "New",
      "",
      ""
    ]];

    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}!A:L:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ values })
      }
    );

    const appendJson = await appendRes.json();
    if (!appendRes.ok) {
      throw new Error(appendJson.error?.message || "Failed to append lead to Google Sheet.");
    }

    return res.status(200).json({
      ok: true,
      leadId,
      createdAt,
      updates: appendJson.updates || null
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Lead logging failed." });
  }
}
