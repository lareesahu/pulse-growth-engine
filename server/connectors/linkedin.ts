export interface LinkedInPostResult {
  postId: string;
}

/** Publish a post to LinkedIn via the UGC Posts API. */
export async function publishToLinkedIn(params: {
  accessToken: string;
  authorUrn: string;
  text: string;
  hashtags: string[];
}): Promise<LinkedInPostResult> {
  const { accessToken, authorUrn, text, hashtags } = params;

  const hashtagLine = hashtags.map(h => `#${h}`).join(" ");
  const fullText = [text, hashtagLine].filter(Boolean).join("\n\n");

  const resp = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: fullText },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`LinkedIn publish failed (${resp.status}): ${err.slice(0, 300)}`);
  }

  const postId = resp.headers.get("x-restli-id") ?? "";
  return { postId };
}
