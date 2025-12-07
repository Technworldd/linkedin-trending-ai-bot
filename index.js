const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

async function generatePost() {
  const prompt = `... your LinkedIn prompt ...`;

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" +
      GEMINI_API_KEY,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  const data = await res.json();
  const text =
    data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  return text;
}

async function sendToN8n(text) {
  const res = await fetch(N8N_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("n8n webhook error: " + err);
  }
}

(async () => {
  try {
    console.log("🧠 Generating post with Gemini...");
    const text = await generatePost();
    console.log("✏️ Gemini text:\n", text);

    console.log("📨 Sending text to n8n webhook...");
    await sendToN8n(text);

    console.log("🎉 Successfully sent to n8n. LinkedIn post will be created by n8n workflow.");
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
})();
