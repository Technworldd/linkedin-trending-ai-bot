import fetch from "node-fetch";

// ENV variables from GitHub Secrets
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const LINKEDIN_ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
const LINKEDIN_MEMBER_ID = process.env.LINKEDIN_MEMBER_ID;

// 1️⃣ Fetch top AI-related post (past 24h) from r/AI_Agents
async function getRedditPost() {
  const url = "https://www.reddit.com/r/AI_Agents/top.json?t=day&limit=5&raw_json=1";
  const res = await fetch(url, {
    headers: { "User-Agent": "github-actions-bot/1.0" }
  });
  const json = await res.json();
  const first = json.data.children[0].data;
  return {
    title: first.title,
    body: first.selftext
  };
}

// 2️⃣ Generate LinkedIn post content using Gemini API
async function generateLinkedInPost(title, body) {
  const prompt = `
You are an expert in AI + business.

Write a LinkedIn post based only on this Reddit content:

Title: ${title}
Body: ${body}

Format:
- Strong 1 line hook
- 2–3 bullet points with insights
- Short takeaway
- 4–6 hashtags

Return only clean text with normal newlines. No markdown like ** or *.
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

  const result = await response.json();
  return result.candidates[0].content.parts[0].text;
}

// 3️⃣ Post to LinkedIn
async function postToLinkedIn(text) {
  const body = {
    author: `urn:li:person:${LINKEDIN_MEMBER_ID}`,
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
    throw new Error("LinkedIn Error: " + err);
  }
  console.log("Posted successfully 🚀");
}

// Run everything sequentially
(async () => {
  const post = await getRedditPost();
  const text = await generateLinkedInPost(post.title, post.body);
  await postToLinkedIn(text);
})();
