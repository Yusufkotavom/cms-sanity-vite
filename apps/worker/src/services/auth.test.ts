import { describe, expect, it } from "vitest";

import { createAuthToken, getBearerToken, verifyAuthToken } from "./auth";

describe("auth service", () => {
  it("creates and verifies auth tokens", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await createAuthToken(
      {
        sub: "admin",
        email: "admin@example.com",
        iat: now,
        exp: now + 3600,
      },
      "super-secret"
    );

    await expect(verifyAuthToken(token, "super-secret")).resolves.toMatchObject({
      email: "admin@example.com",
      sub: "admin",
    });
  });

  it("rejects expired tokens", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await createAuthToken(
      {
        sub: "admin",
        email: "admin@example.com",
        iat: now - 7200,
        exp: now - 3600,
      },
      "super-secret"
    );

    await expect(verifyAuthToken(token, "super-secret")).resolves.toBeNull();
  });

  it("parses bearer token headers", () => {
    expect(getBearerToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
    expect(getBearerToken(null)).toBeNull();
  });
});
