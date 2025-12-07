// Uses Node 18+ built-in fetch (no node-fetch needed)

// ENV variables from GitHub Secrets
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const LINKEDIN_ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;

// 1) Get your LinkedIn member ID using the access token
async function getLinkedInMemberId() {
  const res = await fetch("https://api.linkedin.com/v2/me", {
    headers: {
      Authorization: `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
      "LinkedIn-Version": "202402"
    }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("LinkedIn /v2/me error: " + err);
  }

  const data = await res.json();
  return data.id; // this is the member ID
}

// 2) Fetch top AI-related post from r/AI_Agents (last 24h)
async function getRedditPost() {
  const url =
    "https://www.reddit.com/r/AI_Agents/top.json?t=day&limit=5&raw_json=1";

  const res = await fetch(url, {
    headers: { "User-Agent": "github-actions-bot/1.0" }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("Reddit error: " + err);
  }

  const json = await res.json();
  const first = json.data.children[0]?.data;

  if (!first) {
    throw new Error("No posts found on r/AI_Agents for the last 24h");
  }

  return {
    title: first.title,
    body: first.selftext
  };
}

// 3) Generate LinkedIn post content using Gemini
async function generateLinkedInPost(title, body) {
  const prompt = `
You are an expert in AI and business.

Write a LinkedIn post based only on this Reddit content:

Title: ${title}
Body:
${body}

Requirements:
- Start with a strong 1-line hook.
- Then add 2–3 short bullet points with key insights.
- Then a short 1–2 line takeaway.
- End with 4–6 relevant hashtags.

Return ONLY the final LinkedIn post as clean plain text
with normal line breaks. Do NOT use markdown (no ** or *),
no JSON, no quotes, no \\n, no backslashes.
  `;

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" +
      GEMINI_API_KEY,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error("Gemini error: " + err);
  }

  const result = await response.json();
  const text =
    result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

  if (!text) {
    throw new Error("Gemini returned empty text");
  }

  return text;
}

// 4) Post to LinkedIn (personal feed)
async function postToLinkedIn(memberId, text) {
  const body = {
    author: `urn:li:person:${memberId}`,
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
      "LinkedIn-Version": "202402"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("LinkedIn post error: " + err);
  }

  console.log("✅ Posted successfully to LinkedIn");
}

// 5) Run the full flow
(async () => {
  try {
    console.log("Fetching LinkedIn member ID...");
    const memberId = await getLinkedInMemberId();

    console.log("Fetching Reddit post...");
    const post = await getRedditPost();

    console.log("Generating LinkedIn text via Gemini...");
    const text = await generateLinkedInPost(post.title, post.body);

    console.log("Posting to LinkedIn...");
    await postToLinkedIn(memberId, text);

    console.log("🚀 Done");
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
})();
