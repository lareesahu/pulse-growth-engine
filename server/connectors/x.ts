export interface XPostResult {
  tweetId: string;
}

/** Publish to X via the v2 API. Text is trimmed to 280 characters including hashtags. */
export async function publishToX(params: {
  accessToken: string;
  text: string;
  hashtags: string[];
}): Promise<XPostResult> {
  const { accessToken, text, hashtags } = params;

  const hashtagLine = hashtags.map(h => `#${h}`).join(" ");
  const combined = [text, hashtagLine].filter(Boolean).join("\n").substring(0, 280);

  const resp = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: combined }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`X publish failed (${resp.status}): ${err.slice(0, 300)}`);
  }

  const data = (await resp.json()) as { data?: { id?: string } };
  return { tweetId: data.data?.id ?? "" };
}
