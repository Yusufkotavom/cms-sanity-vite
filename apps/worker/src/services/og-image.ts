import { Resvg, initWasm } from "@resvg/resvg-wasm";
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm";
import { geistBoldFont } from "./geist-bold-font";
import { geistVariableFont } from "./geist-variable-font";
import { kotacomLogoDataUri } from "./kotacom-logo-data";

const OG_FONT_FAMILY = "Geist, Geist Variable, Arial, sans-serif";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const DEFAULT_WORKFLOW_LABEL = "AI WORKFLOW";
const DEFAULT_FOOTER_TEXT = "WA 085799520350 · kotacom.id";

let wasmInitialized = false;

export type OgGeneratorMode = "local" | "remote";

export type OgBranding = {
  workflowLabel?: string | null;
  brandName?: string | null;
  footerText?: string | null;
  logoDataUri?: string | null;
  ogBaseUrl?: string | null;
  generatorMode?: OgGeneratorMode | null;
  fallbackImageUrl?: string | null;
  fallbackImageUrls?: string | null;
  websiteImageUrl?: string | null;
  websiteImageUrls?: string | null;
  softwareImageUrl?: string | null;
  softwareImageUrls?: string | null;
  percetakanImageUrl?: string | null;
  percetakanImageUrls?: string | null;
  blogImageUrl?: string | null;
  blogImageUrls?: string | null;
  sideImageDataUri?: string | null;
};

async function ensureWasm() {
  if (wasmInitialized) return;

  await initWasm(resvgWasm);
  wasmInitialized = true;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (currentLine.length + word.length + 1 > maxCharsPerLine && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function truncateLines(lines: string[], maxLines: number): string[] {
  if (lines.length <= maxLines) return lines;
  const truncated = lines.slice(0, maxLines);
  truncated[maxLines - 1] = truncated[maxLines - 1].replace(/\s+\S*$/, "") + "...";
  return truncated;
}

function isSafeImageUrl(value: string | null | undefined) {
  return Boolean(value && /^https:\/\//i.test(value.trim()));
}

function detectOgCategory(title: string, workflowLabel?: string | null) {
  const source = `${workflowLabel ?? ""} ${title}`.toLowerCase();
  if (/(website|web dev|landing page)/i.test(source)) return "website";
  if (/(software|aplikasi|pos|crm)/i.test(source)) return "software";
  if (/(percetakan|printing|cetak|brosur|buku)/i.test(source)) return "percetakan";
  if (/(blog|artikel|tips|insight)/i.test(source)) return "blog";
  return null;
}

function parseImageUrlList(value?: string | null) {
  return (value ?? "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter((item) => isSafeImageUrl(item));
}

function selectDeterministicImage(title: string, urls: readonly string[]) {
  if (!urls.length) return null;
  const hash = title.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return urls[hash % urls.length] ?? null;
}

function resolveOgSideImage(title: string, branding: OgBranding = {}) {
  const category = detectOgCategory(title, branding.workflowLabel);
  const imagePools = {
    website: [
      ...parseImageUrlList(branding.websiteImageUrls),
      ...(isSafeImageUrl(branding.websiteImageUrl) ? [branding.websiteImageUrl!.trim()] : []),
    ],
    software: [
      ...parseImageUrlList(branding.softwareImageUrls),
      ...(isSafeImageUrl(branding.softwareImageUrl) ? [branding.softwareImageUrl!.trim()] : []),
    ],
    percetakan: [
      ...parseImageUrlList(branding.percetakanImageUrls),
      ...(isSafeImageUrl(branding.percetakanImageUrl) ? [branding.percetakanImageUrl!.trim()] : []),
    ],
    blog: [
      ...parseImageUrlList(branding.blogImageUrls),
      ...(isSafeImageUrl(branding.blogImageUrl) ? [branding.blogImageUrl!.trim()] : []),
    ],
  } as const;

  const preferredPool = category ? imagePools[category as keyof typeof imagePools] : [];
  const anyPool = [
    ...imagePools.website,
    ...imagePools.software,
    ...imagePools.percetakan,
    ...imagePools.blog,
  ];
  const fallbackPool = [
    ...parseImageUrlList(branding.fallbackImageUrls),
    ...(isSafeImageUrl(branding.fallbackImageUrl) ? [branding.fallbackImageUrl!.trim()] : []),
  ];

  return (
    selectDeterministicImage(title, preferredPool) ||
    selectDeterministicImage(title, anyPool) ||
    selectDeterministicImage(title, fallbackPool)
  );
}

function optimizeOgSideImageUrl(sourceUrl: string) {
  const url = new URL(sourceUrl);
  url.searchParams.set("w", "640");
  url.searchParams.set("h", "640");
  url.searchParams.set("fit", "crop");
  url.searchParams.set("fm", "jpg");
  url.searchParams.set("q", "72");
  return url.toString();
}

async function fetchOgSideImageDataUri(title: string, branding: OgBranding | undefined, fetchImpl: typeof fetch) {
  const sourceUrl = resolveOgSideImage(title, branding);
  if (!sourceUrl) {
    return null;
  }

  const response = await fetchImpl(optimizeOgSideImageUrl(sourceUrl));
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok || !contentType.toLowerCase().startsWith("image/")) {
    return null;
  }

  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > 1_500_000) {
    return null;
  }

  let binary = "";
  const chunkSize = 0x8000;
  const view = new Uint8Array(bytes);
  for (let index = 0; index < view.length; index += chunkSize) {
    binary += String.fromCharCode(...view.subarray(index, index + chunkSize));
  }

  return `data:${contentType};base64,${btoa(binary)}`;
}

export function buildOgSvg(title: string, excerpt?: string | null, branding: OgBranding = {}): string {
  const safeTitle = title.trim().slice(0, 72);
  const safeExcerpt = (excerpt ?? "").trim().slice(0, 96);
  const safeWorkflowLabel = (branding.workflowLabel ?? DEFAULT_WORKFLOW_LABEL).trim().slice(0, 28) || DEFAULT_WORKFLOW_LABEL;
  const safeBrandName = (branding.brandName ?? "KOTACOM").trim().slice(0, 28) || "KOTACOM";
  const safeFooterText = (branding.footerText ?? DEFAULT_FOOTER_TEXT).trim().slice(0, 72) || DEFAULT_FOOTER_TEXT;
  const logoDataUri = branding.logoDataUri?.trim() || kotacomLogoDataUri;
  const sideImageUrl = branding.sideImageDataUri?.trim() || null;
  const titleLines = truncateLines(wrapText(safeTitle, 26), 4).map(escapeXml);
  const excerptLines = excerpt
    ? truncateLines(wrapText(safeExcerpt, 39), 3).map(escapeXml)
    : [];

  const titleFontSize = titleLines.length >= 4 ? 36 : titleLines.length === 3 ? 44 : titleLines.length === 2 ? 52 : 58;
  const titleLineHeight = Math.round(titleFontSize * 1.05);
  const titleStartY = 198;

  const excerptFontSize = 21;
  const excerptLineHeight = Math.round(excerptFontSize * 1.38);
  const excerptStartY = titleStartY + titleLines.length * titleLineHeight + 18;
  const leftPanelX = 34;
  const leftPanelY = 42;
  const leftPanelWidth = 630;
  const leftPanelHeight = 546;
  const rightPanelX = 646;
  const rightPanelY = 42;
  const rightPanelWidth = 520;
  const rightPanelHeight = 546;
  const connectorX = 624;
  const connectorY = 176;
  const connectorWidth = 42;
  const connectorHeight = 272;

  const gridLines: string[] = [];
  for (let x = 0; x <= OG_WIDTH; x += 44) {
    gridLines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${OG_HEIGHT}" stroke="#0f172a" stroke-opacity="0.075" stroke-width="1"/>`);
  }
  for (let y = 0; y <= OG_HEIGHT; y += 44) {
    gridLines.push(`<line x1="0" y1="${y}" x2="${OG_WIDTH}" y2="${y}" stroke="#0f172a" stroke-opacity="0.075" stroke-width="1"/>`);
  }

  const leftPanelGridLines: string[] = [];
  for (let x = leftPanelX; x <= leftPanelX + leftPanelWidth; x += 36) {
    leftPanelGridLines.push(
      `<line x1="${x}" y1="${leftPanelY}" x2="${x}" y2="${leftPanelY + leftPanelHeight}" stroke="#0f172a" stroke-opacity="0.08" stroke-width="1"/>`
    );
  }
  for (let y = leftPanelY; y <= leftPanelY + leftPanelHeight; y += 36) {
    leftPanelGridLines.push(
      `<line x1="${leftPanelX}" y1="${y}" x2="${leftPanelX + leftPanelWidth}" y2="${y}" stroke="#0f172a" stroke-opacity="0.08" stroke-width="1"/>`
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}">
  <defs>
    <linearGradient id="canvasBackground" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="55%" stop-color="#fdfdfd"/>
      <stop offset="100%" stop-color="#eef2f7"/>
    </linearGradient>
    <radialGradient id="gridMaskGradient" cx="18%" cy="12%" rx="90%" ry="72%">
      <stop offset="0%" stop-color="white" stop-opacity="0.9"/>
      <stop offset="65%" stop-color="white" stop-opacity="0.42"/>
      <stop offset="100%" stop-color="white" stop-opacity="0.08"/>
    </radialGradient>
    <linearGradient id="leftPanelBackground" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.98"/>
      <stop offset="100%" stop-color="#f8fafc" stop-opacity="0.92"/>
    </linearGradient>
    <radialGradient id="topGlow" cx="22%" cy="-8%" r="88%">
      <stop offset="0%" stop-color="#0070f3" stop-opacity="0.10"/>
      <stop offset="55%" stop-color="#0f172a" stop-opacity="0.03"/>
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0"/>
    </radialGradient>
    <mask id="gridMask">
      <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#gridMaskGradient)"/>
    </mask>
    <clipPath id="rightImageClip">
      <rect x="${rightPanelX + 28}" y="${rightPanelY + 24}" width="${rightPanelWidth - 56}" height="${rightPanelHeight - 48}" rx="26"/>
    </clipPath>
  </defs>

  <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#canvasBackground)"/>
  <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#topGlow)"/>
  <g mask="url(#gridMask)">
    ${gridLines.join("\n    ")}
  </g>

  <rect x="${connectorX}" y="${connectorY}" width="${connectorWidth}" height="${connectorHeight}" rx="26" fill="#dbe7f5" fill-opacity="0.96" stroke="#c7d6ea" stroke-opacity="0.95"/>
  <rect x="${leftPanelX}" y="${leftPanelY}" width="${leftPanelWidth}" height="${leftPanelHeight}" rx="30" fill="url(#leftPanelBackground)" stroke="#0f172a" stroke-opacity="0.08"/>
  <g opacity="0.78">
    ${leftPanelGridLines.join("\n    ")}
  </g>

  <rect x="${rightPanelX}" y="${rightPanelY}" width="${rightPanelWidth}" height="${rightPanelHeight}" rx="30" fill="#0b1220"/>
  <rect x="${rightPanelX}" y="${rightPanelY}" width="${rightPanelWidth}" height="${rightPanelHeight}" rx="30" fill="#0f172a" fill-opacity="0.96" stroke="#1e293b" stroke-opacity="0.9"/>
  <rect x="${rightPanelX + 28}" y="${rightPanelY + 24}" width="${rightPanelWidth - 56}" height="${rightPanelHeight - 48}" rx="26" fill="#111827" stroke="#334155" stroke-opacity="0.7"/>
  ${sideImageUrl ? `<image x="${rightPanelX + 28}" y="${rightPanelY + 24}" width="${rightPanelWidth - 56}" height="${rightPanelHeight - 48}" href="${escapeXml(sideImageUrl)}" xlink:href="${escapeXml(sideImageUrl)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#rightImageClip)"/>` : ""}
  <rect x="${rightPanelX + 28}" y="${rightPanelY + 24}" width="${rightPanelWidth - 56}" height="${rightPanelHeight - 48}" rx="26" fill="#020617" fill-opacity="${sideImageUrl ? "0.06" : "0.08"}"/>

 
   <image x="${leftPanelX + 32}" y="${leftPanelY + 24}" width="52" height="52" href="${logoDataUri}" xlink:href="${logoDataUri}" preserveAspectRatio="xMidYMid meet"/>
  <text x="${leftPanelX + 100}" y="${leftPanelY + 64}" font-family="${OG_FONT_FAMILY}" font-size="34" font-weight="900" letter-spacing="-0.8" fill="#0f172a">${escapeXml(safeBrandName)}</text>
  <rect x="${leftPanelX + 32}" y="${leftPanelY + 96}" width="64" height="4" rx="2" fill="#0070f3"/>
  ${titleLines
    .map(
      (line, i) =>
        `<text x="${leftPanelX + 32}" y="${titleStartY + i * titleLineHeight}" font-family="${OG_FONT_FAMILY}" font-size="${titleFontSize}" font-weight="900" letter-spacing="${titleFontSize > 54 ? "-1.6" : "-1.0"}" fill="#111827">${line}</text>`
    )
    .join("\n  ")}

  ${
    excerptLines.length > 0
      ? excerptLines
          .map(
            (line, i) =>
              `<text x="${leftPanelX + 32}" y="${excerptStartY + i * excerptLineHeight}" font-family="${OG_FONT_FAMILY}" font-size="${excerptFontSize}" font-weight="700" fill="#64748b">${line}</text>`
          )
          .join("\n  ")
      : ""
  }

  <rect x="${leftPanelX + 18}" y="${OG_HEIGHT - 86}" width="290" height="44" fill="#111111"/>
  <text x="${leftPanelX + 38}" y="${OG_HEIGHT - 56}" font-family="${OG_FONT_FAMILY}" font-size="18" font-weight="700" fill="#ffffff">${escapeXml(safeFooterText)}</text>
</svg>`;
}

export async function generateOgImagePng(
  title: string,
  excerpt?: string | null,
  branding?: OgBranding
): Promise<{ pngBuffer: ArrayBuffer; contentType: string }> {
  await ensureWasm();

  const svg = buildOgSvg(title, excerpt, branding);
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: OG_WIDTH },
    font: {
      loadSystemFonts: false,
      defaultFontFamily: "Geist",
      sansSerifFamily: "Geist",
      monospaceFamily: "Geist",
      fontBuffers: [geistBoldFont, geistVariableFont],
    },
  });

  const rendered = resvg.render();
  const pngData = rendered.asPng();

  return {
    pngBuffer: pngData.buffer as ArrayBuffer,
    contentType: "image/png",
  };
}

export async function uploadOgImageBytesToSanity(params: {
  bytes: ArrayBuffer;
  contentType: string;
  projectId: string;
  dataset: string;
  apiVersion: string;
  token: string;
  fetchImpl?: typeof fetch;
}) {
  const { bytes, contentType, projectId, dataset, apiVersion, token, fetchImpl = fetch } = params;
  const fileName = `og-${crypto.randomUUID().slice(0, 12)}.png`;
  const assetUrl = `https://${projectId}.api.sanity.io/v${apiVersion}/assets/images/${dataset}?filename=${encodeURIComponent(fileName)}`;

  const uploadResponse = await fetchImpl(assetUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": contentType,
    },
    body: bytes,
  });

  const uploadJson = (await uploadResponse.json().catch(() => ({}))) as {
    document?: { _id?: string };
  };

  if (!uploadResponse.ok || !uploadJson.document?._id) {
    throw new Error(`Sanity OG image upload failed (${uploadResponse.status})`);
  }

  return { assetId: uploadJson.document._id };
}

async function tryGenerateRemoteOgImage(title: string, excerpt: string | null | undefined, branding: OgBranding | undefined, fetchImpl: typeof fetch) {
  const ogBaseUrl = branding?.ogBaseUrl?.trim()?.replace(/\/+$/, "");
  if (!ogBaseUrl) {
    return null;
  }

  const badge = (branding?.workflowLabel?.trim() || "Blog").slice(0, 32);
  const remoteUrl = `${ogBaseUrl}/api/og?${new URLSearchParams({ title, description: excerpt ?? "", badge }).toString()}`;
  const remoteResponse = await fetchImpl(remoteUrl);
  const remoteContentType = remoteResponse.headers.get("content-type") || "";
  if (!remoteResponse.ok || !remoteContentType.toLowerCase().startsWith("image/")) {
    return null;
  }

  return {
    bytes: await remoteResponse.arrayBuffer(),
    contentType: remoteContentType,
  };
}

export async function generateOgImageBytes(params: {
  title: string;
  excerpt?: string | null;
  branding?: OgBranding;
  fetchImpl?: typeof fetch;
}): Promise<{ bytes: ArrayBuffer; contentType: string }> {
  const { title, excerpt, branding, fetchImpl = fetch } = params;
  const preferRemote = branding?.generatorMode === "remote";
  const remoteFirst = preferRemote ? await tryGenerateRemoteOgImage(title, excerpt, branding, fetchImpl) : null;
  if (remoteFirst) {
    return remoteFirst;
  }

  try {
    const sideImageDataUri = await fetchOgSideImageDataUri(title, branding, fetchImpl).catch(() => null);
    const { pngBuffer, contentType } = await generateOgImagePng(title, excerpt, {
      ...branding,
      sideImageDataUri,
    });
    return { bytes: pngBuffer, contentType };
  } catch (error) {
    const remoteFallback = await tryGenerateRemoteOgImage(title, excerpt, branding, fetchImpl);
    if (remoteFallback) {
      return remoteFallback;
    }
    throw error;
  }
}

export async function generateAndUploadOgImage(params: {
  title: string;
  excerpt?: string | null;
  branding?: OgBranding;
  projectId: string;
  dataset: string;
  apiVersion: string;
  token: string;
  fetchImpl?: typeof fetch;
}): Promise<{ assetId: string; bytes: ArrayBuffer; contentType: string }> {
  const { title, excerpt, branding, projectId, dataset, apiVersion, token, fetchImpl = fetch } = params;
  const generated = await generateOgImageBytes({ title, excerpt, branding, fetchImpl });
  const uploaded = await uploadOgImageBytesToSanity({
    bytes: generated.bytes,
    contentType: generated.contentType,
    projectId,
    dataset,
    apiVersion,
    token,
    fetchImpl,
  });
  return { ...uploaded, ...generated };
}
