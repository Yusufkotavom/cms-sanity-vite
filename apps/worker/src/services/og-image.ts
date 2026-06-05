import { Resvg, initWasm } from "@resvg/resvg-wasm";
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm";
import { geistVariableFont } from "./geist-variable-font";
import { kotacomLogoDataUri } from "./kotacom-logo-data";

const OG_FONT_FAMILY = "Geist Variable, Geist, Arial, sans-serif";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const DEFAULT_WORKFLOW_LABEL = "AI WORKFLOW";
const DEFAULT_FOOTER_TEXT = "WA 085799520350 · kotacom.id";

let wasmInitialized = false;

export type OgBranding = {
  workflowLabel?: string | null;
  footerText?: string | null;
  logoDataUri?: string | null;
  ogBaseUrl?: string | null;
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

export function buildOgSvg(title: string, excerpt?: string | null, branding: OgBranding = {}): string {
  const safeTitle = title.trim().slice(0, 72);
  const safeExcerpt = (excerpt ?? "").trim().slice(0, 96);
  const safeWorkflowLabel = (branding.workflowLabel ?? DEFAULT_WORKFLOW_LABEL).trim().slice(0, 28) || DEFAULT_WORKFLOW_LABEL;
  const safeFooterText = (branding.footerText ?? DEFAULT_FOOTER_TEXT).trim().slice(0, 72) || DEFAULT_FOOTER_TEXT;
  const logoDataUri = branding.logoDataUri?.trim() || kotacomLogoDataUri;
  const titleLines = truncateLines(wrapText(safeTitle, 22), 4).map(escapeXml);
  const excerptLines = excerpt
    ? truncateLines(wrapText(safeExcerpt, 36), 3).map(escapeXml)
    : [];

  const titleFontSize = titleLines.length >= 4 ? 42 : titleLines.length === 3 ? 48 : titleLines.length === 2 ? 56 : 62;
  const titleLineHeight = Math.round(titleFontSize * 1.1);
  const titleStartY = 240;

  const excerptFontSize = 23;
  const excerptLineHeight = Math.round(excerptFontSize * 1.45);
  const excerptStartY = titleStartY + titleLines.length * titleLineHeight + 32;
  const leftPanelX = 34;
  const leftPanelY = 42;
  const leftPanelWidth = 630;
  const leftPanelHeight = 546;
  const rightPanelX = 632;
  const rightPanelY = 42;
  const rightPanelWidth = 534;
  const rightPanelHeight = 546;
  const connectorX = 616;
  const connectorY = 176;
  const connectorWidth = 56;
  const connectorHeight = 272;
  const hashSeed = [...safeTitle].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const accentX = rightPanelX + 66 + (hashSeed % 3) * 24;
  const accentY = rightPanelY + 82 + (hashSeed % 4) * 10;
  const nodeOffset = hashSeed % 5;

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

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}">
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
  <rect x="${rightPanelX + 56}" y="${rightPanelY + 62}" width="${rightPanelWidth - 112}" height="166" rx="22" fill="#0f172a" stroke="#334155"/>
  <rect x="${rightPanelX + 56}" y="${rightPanelY + 62}" width="${rightPanelWidth - 112}" height="32" rx="22" fill="#111827"/>
  <circle cx="${rightPanelX + 82}" cy="${rightPanelY + 78}" r="4.5" fill="#22c55e"/>
  <circle cx="${rightPanelX + 100}" cy="${rightPanelY + 78}" r="4.5" fill="#f59e0b"/>
  <circle cx="${rightPanelX + 118}" cy="${rightPanelY + 78}" r="4.5" fill="#3b82f6"/>
  <rect x="${rightPanelX + 82}" y="${rightPanelY + 118}" width="136" height="12" rx="6" fill="#e2e8f0" fill-opacity="0.96"/>
  <rect x="${rightPanelX + 82}" y="${rightPanelY + 143}" width="226" height="8" rx="4" fill="#64748b" fill-opacity="0.78"/>
  <rect x="${rightPanelX + 82}" y="${rightPanelY + 161}" width="182" height="8" rx="4" fill="#64748b" fill-opacity="0.58"/>
  <rect x="${rightPanelX + 82}" y="${rightPanelY + 184}" width="112" height="18" rx="9" fill="#0070f3"/>
  <text x="${rightPanelX + 102}" y="${rightPanelY + 198}" font-family="${OG_FONT_FAMILY}" font-size="12" font-weight="700" fill="#ffffff">${escapeXml(safeWorkflowLabel)}</text>

  <rect x="${accentX}" y="${accentY + 212}" width="176" height="136" rx="24" fill="#111827" stroke="#334155"/>
  <circle cx="${accentX + 42}" cy="${accentY + 254}" r="18" fill="#0070f3" fill-opacity="0.16" stroke="#60a5fa"/>
  <rect x="${accentX + 76}" y="${accentY + 236}" width="70" height="10" rx="5" fill="#e2e8f0"/>
  <rect x="${accentX + 76}" y="${accentY + 256}" width="52" height="8" rx="4" fill="#94a3b8"/>
  <rect x="${accentX + 28}" y="${accentY + 294}" width="118" height="8" rx="4" fill="#1d4ed8"/>
  <rect x="${accentX + 28}" y="${accentY + 310}" width="92" height="8" rx="4" fill="#475569"/>

  <rect x="${rightPanelX + 276}" y="${rightPanelY + 290}" width="188" height="182" rx="26" fill="#111827" stroke="#334155"/>
  <rect x="${rightPanelX + 304}" y="${rightPanelY + 324}" width="126" height="10" rx="5" fill="#e2e8f0"/>
  <rect x="${rightPanelX + 304}" y="${rightPanelY + 346}" width="78" height="8" rx="4" fill="#64748b"/>
  <path d="M ${rightPanelX + 308} ${rightPanelY + 420} C ${rightPanelX + 342} ${rightPanelY + 396}, ${rightPanelX + 366} ${rightPanelY + 432}, ${rightPanelX + 392} ${rightPanelY + 396} S ${rightPanelX + 432} ${rightPanelY + 378}, ${rightPanelX + 452} ${rightPanelY + 350}" fill="none" stroke="#60a5fa" stroke-width="6" stroke-linecap="round"/>
  <circle cx="${rightPanelX + 308}" cy="${rightPanelY + 420}" r="${7 + (nodeOffset % 2)}" fill="#38bdf8"/>
  <circle cx="${rightPanelX + 392}" cy="${rightPanelY + 396}" r="${8 + (nodeOffset % 3)}" fill="#22c55e"/>
  <circle cx="${rightPanelX + 452}" cy="${rightPanelY + 350}" r="7" fill="#f59e0b"/>

  <rect x="${rightPanelX + 90}" y="${rightPanelY + 388}" width="126" height="116" rx="24" fill="#111827" stroke="#334155"/>
  <rect x="${rightPanelX + 120}" y="${rightPanelY + 420}" width="66" height="46" rx="13" fill="#0f172a" stroke="#475569"/>
  <rect x="${rightPanelX + 134}" y="${rightPanelY + 433}" width="38" height="20" rx="6" fill="#0070f3" fill-opacity="0.16" stroke="#60a5fa"/>
  <rect x="${rightPanelX + 126}" y="${rightPanelY + 480}" width="54" height="8" rx="4" fill="#94a3b8"/>

  <image x="${leftPanelX + 18}" y="${leftPanelY + 12}" width="234" height="52" href="${logoDataUri}" preserveAspectRatio="xMinYMid meet"/>
  <rect x="${leftPanelX + 18}" y="${leftPanelY + 82}" width="64" height="4" rx="2" fill="#0070f3"/>
  ${titleLines
    .map(
      (line, i) =>
        `<text x="${leftPanelX + 44}" y="${titleStartY + i * titleLineHeight}" font-family="${OG_FONT_FAMILY}" font-size="${titleFontSize}" font-weight="700" letter-spacing="${titleFontSize > 54 ? "-1.6" : "-1.0"}" fill="#111827">${line}</text>`
    )
    .join("\n  ")}

  ${
    excerptLines.length > 0
      ? excerptLines
          .map(
            (line, i) =>
              `<text x="${leftPanelX + 44}" y="${excerptStartY + i * excerptLineHeight}" font-family="${OG_FONT_FAMILY}" font-size="${excerptFontSize}" font-weight="700" fill="#64748b">${line}</text>`
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
      defaultFontFamily: "Geist Variable",
      sansSerifFamily: "Geist Variable",
      monospaceFamily: "Geist Variable",
      fontBuffers: [geistVariableFont],
    },
  });

  const rendered = resvg.render();
  const pngData = rendered.asPng();

  return {
    pngBuffer: pngData.buffer as ArrayBuffer,
    contentType: "image/png",
  };
}

async function uploadOgAsset(params: {
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

export async function generateAndUploadOgImage(params: {
  title: string;
  excerpt?: string | null;
  branding?: OgBranding;
  projectId: string;
  dataset: string;
  apiVersion: string;
  token: string;
  fetchImpl?: typeof fetch;
}): Promise<{ assetId: string }> {
  const { title, excerpt, branding, projectId, dataset, apiVersion, token, fetchImpl = fetch } = params;

  const ogBaseUrl = branding?.ogBaseUrl?.trim()?.replace(/\/+$/, "");
  if (ogBaseUrl) {
    const badge = (branding?.workflowLabel?.trim() || "Blog").slice(0, 32);
    const remoteUrl = `${ogBaseUrl}/api/og?${new URLSearchParams({ title, description: excerpt ?? "", badge }).toString()}`;
    const remoteResponse = await fetchImpl(remoteUrl);
    const remoteContentType = remoteResponse.headers.get("content-type") || "";
    if (remoteResponse.ok && remoteContentType.toLowerCase().startsWith("image/")) {
      const bytes = await remoteResponse.arrayBuffer();
      return uploadOgAsset({
        bytes,
        contentType: remoteContentType,
        projectId,
        dataset,
        apiVersion,
        token,
        fetchImpl,
      });
    }
  }

  const { pngBuffer, contentType } = await generateOgImagePng(title, excerpt, branding);
  return uploadOgAsset({
    bytes: pngBuffer,
    contentType,
    projectId,
    dataset,
    apiVersion,
    token,
    fetchImpl,
  });
}
