const textEncoder = new TextEncoder();

export type AuthTokenPayload = {
  sub: string;
  email: string;
  iat: number;
  exp: number;
};

type AuthTokenHeader = {
  alg: "HS256";
  typ: "JWT";
};

function toBase64Url(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return diff === 0;
}

async function importSigningKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign", "verify"]
  );
}

async function signValue(value: string, secret: string) {
  const key = await importSigningKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(value));
  return toBase64Url(new Uint8Array(signature));
}

export async function createAuthToken(payload: AuthTokenPayload, secret: string) {
  const header: AuthTokenHeader = {
    alg: "HS256",
    typ: "JWT",
  };
  const encodedHeader = toBase64Url(textEncoder.encode(JSON.stringify(header)));
  const encodedPayload = toBase64Url(textEncoder.encode(JSON.stringify(payload)));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = await signValue(unsignedToken, secret);
  return `${unsignedToken}.${signature}`;
}

export async function verifyAuthToken(token: string, secret: string) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, receivedSignature] = parts;
  const expectedSignature = await signValue(`${encodedHeader}.${encodedPayload}`, secret);

  if (!timingSafeEqual(receivedSignature, expectedSignature)) {
    return null;
  }

  try {
    const header = JSON.parse(new TextDecoder().decode(fromBase64Url(encodedHeader))) as AuthTokenHeader;
    if (header.alg !== "HS256" || header.typ !== "JWT") {
      return null;
    }

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encodedPayload))) as AuthTokenPayload;
    if (!payload.email || !payload.sub || !payload.exp || !payload.iat) {
      return null;
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getBearerToken(authorizationHeader: string | null) {
  if (!authorizationHeader) {
    return null;
  }

  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function isAuthConfigured(env: {
  AUTH_ADMIN_EMAIL?: string;
  AUTH_ADMIN_PASSWORD?: string;
  AUTH_TOKEN_SECRET?: string;
}) {
  return Boolean(env.AUTH_ADMIN_EMAIL && env.AUTH_ADMIN_PASSWORD && env.AUTH_TOKEN_SECRET);
}
