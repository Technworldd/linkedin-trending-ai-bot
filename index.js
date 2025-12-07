// Node 20 has global fetch available

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY is not set in environment.");
  process.exit(1);
}

async function generatePost() {
  const prompt = `
Search for the top AI-in-business post from r/aibusiness from the last 24 hours, extract the key insights, and generate a professional LinkedIn post with:
1) a strong hook,
2) 2–3 concise bullet points summarizing the insights,
3) a short takeaway, and
4) relevant hashtags.

Format the output as ready-to-post LinkedIn text only (plain text, normal line breaks, no markdown, no JSON, no escape sequences like \\n).
  `;

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


  if (!res.ok) {
    const err = await res.text();
    throw new Error("Gemini error: " + err);
  }

  const data = await res.json();
  const text =
    data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

  if (!text) {
    throw new Error("Gemini returned empty text");
  }

  console.log("------ LINKEDIN POST START ------");
  console.log(text);
  console.log("------ LINKEDIN POST END ------");
}

(async () => {
  try {
    console.log("🧠 Calling Gemini...");
    await generatePost();
    console.log("✅ Generated LinkedIn post text.");
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
})();
