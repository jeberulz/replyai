const X_TOKEN_URL = "https://api.x.com/2/oauth2/token";

export type XTokenResult = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope: string;
};

/** Refresh an X OAuth 2.0 access token using a refresh token. */
export async function refreshAccessToken(refreshToken: string): Promise<XTokenResult> {
  const clientId = process.env.X_CLIENT_ID ?? "";
  const clientSecret = process.env.X_CLIENT_SECRET ?? "";
  if (!clientId || !clientSecret) {
    throw new Error("X OAuth credentials not configured");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(X_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`X token refresh failed (${res.status}): ${await res.text()}`);
  }

  const json = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
  };

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshToken,
    expiresAt: Date.now() + (json.expires_in ?? 7200) * 1000,
    scope: json.scope ?? "",
  };
}
