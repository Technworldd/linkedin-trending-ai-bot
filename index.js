// Node 20 has global fetch

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const LINKEDIN_ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;

if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY is not set.");
  process.exit(1);
}

if (!LINKEDIN_ACCESS_TOKEN) {
  console.error("❌ LINKEDIN_ACCESS_TOKEN is not set.");
  process.exit(1);
}

// 1) Get your LinkedIn person URN using the access token
async function getLinkedInAuthorUrn() {
  const res = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
      // Do NOT send LinkedIn-Version here – it caused NONEXISTENT_VERSION
    }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("LinkedIn /userinfo error: " + err);
  }

  const data = await res.json();

  // LinkedIn may return 'sub' or 'id'
  let sub = data.sub || data.id;
  if (!sub) {
    throw new Error("LinkedIn /userinfo response has no 'sub' or 'id' field.");
  }

  // If it is not already a full URN, wrap it
  if (!sub.startsWith("urn:")) {
    sub = `urn:li:person:${sub}`;
  }

  return sub; // e.g. "urn:li:person:97Q0E6swot"
}

// 2) Ask Gemini to create the LinkedIn post text
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

  return text;
}

// 3) Post that text to LinkedIn using REST Posts API
async function postToLinkedIn(authorUrn, text) {
  const body = {
    author: authorUrn, // e.g. "urn:li:person:97Q0E6swot"
    commentary: text,
    visibility: "PUBLIC",
    lifecycleState: "PUBLISHED",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: []
    }
  };

  const res = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": "202404"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("LinkedIn post error: " + err);
  }
}

// 4) Main
(async () => {
  try {
    console.log("👤 Getting LinkedIn author URN...");
    const authorUrn = await getLinkedInAuthorUrn();
    console.log("Author URN:", authorUrn);

    console.log("🧠 Generating post with Gemini...");
    const text = await generatePost();
    console.log("✏️ Gemini text:\n", text);

    console.log("🚀 Posting to LinkedIn...");
    await postToLinkedIn(authorUrn, text);

    console.log("🎉 Successfully posted to LinkedIn.");
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
})();
