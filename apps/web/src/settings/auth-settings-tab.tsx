import { useState } from "react";

import type { SettingsPageProps } from "./types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { FieldInfo } from "./field-info";

type AuthSettingsTabProps = Pick<
  SettingsPageProps,
  | "apiBaseUrl"
  | "authConfig"
  | "authEmail"
  | "currentWorkspace"
  | "getStoredAuthToken"
  | "copyToken"
  | "isCopyingToken"
  | "workspaces"
>;

type EndpointGroup = {
  label: string;
  endpoints: Array<{
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    path: string;
    description: string;
  }>;
};

const ENDPOINT_GROUPS: EndpointGroup[] = [
  {
    label: "Auth",
    endpoints: [
      { method: "POST", path: "/api/auth/login", description: "Login dan dapatkan session token" },
      { method: "GET", path: "/api/auth/me", description: "Info user yang sedang login" },
      { method: "GET", path: "/api/auth/status", description: "Cek apakah auth dikonfigurasi" },
    ],
  },
  {
    label: "Workspaces",
    endpoints: [
      { method: "GET", path: "/api/workspaces", description: "List semua workspace" },
      { method: "POST", path: "/api/workspaces", description: "Buat workspace baru" },
      { method: "PATCH", path: "/api/workspaces/:id", description: "Update workspace" },
      { method: "DELETE", path: "/api/workspaces/:id", description: "Hapus workspace" },
    ],
  },
  {
    label: "Notes",
    endpoints: [
      { method: "GET", path: "/api/notes", description: "List semua note di workspace aktif" },
      { method: "POST", path: "/api/notes", description: "Buat note baru" },
      { method: "GET", path: "/api/notes/:id", description: "Detail note" },
      { method: "PATCH", path: "/api/notes/:id", description: "Update draft note" },
      { method: "DELETE", path: "/api/notes/:id", description: "Hapus note" },
      { method: "POST", path: "/api/notes/:id/schedule", description: "Jadwalkan publish (body: publishAt)" },
      { method: "POST", path: "/api/notes/:id/publish", description: "Publish langsung ke Sanity" },
      { method: "POST", path: "/api/notes/:id/retry-publish", description: "Retry publish note yang gagal" },
      { method: "POST", path: "/api/notes/:id/generate-og", description: "Generate OG image" },
      { method: "POST", path: "/api/notes/:id/refresh-from-sanity", description: "Refresh field aman note dari post Sanity" },
      { method: "POST", path: "/api/notes/:id/ai-rewrite-preview", description: "Buat kandidat rewrite AI dari konten Sanity" },
    ],
  },
  {
    label: "Sanity",
    endpoints: [
      { method: "GET", path: "/api/sanity/categories", description: "List kategori dari Sanity" },
      { method: "GET", path: "/api/sanity/posts", description: "List post Sanity untuk browser rewrite" },
      { method: "POST", path: "/api/sanity/posts/open", description: "Buka atau link post Sanity ke editor note" },
      { method: "GET", path: "/api/sanity/status", description: "Status koneksi Sanity" },
      { method: "POST", path: "/api/sanity/test", description: "Test koneksi Sanity" },
      { method: "POST", path: "/api/sanity/publish", description: "Publish note via noteId" },
    ],
  },
  {
    label: "AI",
    endpoints: [
      { method: "POST", path: "/api/ai/assist", description: "AI suggestion (metadata, draft, outline)" },
      { method: "GET", path: "/api/ai/batches", description: "List AI batch" },
      { method: "POST", path: "/api/ai/batches", description: "Buat AI batch baru" },
      { method: "GET", path: "/api/ai/batches/:id", description: "Detail AI batch" },
      { method: "POST", path: "/api/ai/batches/process", description: "Proses AI batch" },
      { method: "GET", path: "/api/ai/batches/templates", description: "List prompt template" },
      { method: "POST", path: "/api/ai/batches/templates", description: "Buat prompt template" },
      { method: "PATCH", path: "/api/ai/batches/templates/:id", description: "Update prompt template" },
    ],
  },
  {
    label: "Settings",
    endpoints: [
      { method: "GET", path: "/api/config", description: "Konfigurasi worker" },
      { method: "GET", path: "/api/settings/auth", description: "Pengaturan auth" },
      { method: "GET", path: "/api/settings/sanity", description: "Pengaturan Sanity" },
      { method: "PUT", path: "/api/settings/sanity", description: "Update pengaturan Sanity" },
      { method: "GET", path: "/api/settings/ai", description: "Pengaturan AI" },
      { method: "PUT", path: "/api/settings/ai", description: "Update pengaturan AI" },
      { method: "POST", path: "/api/settings/ai/test", description: "Test koneksi model AI aktif" },
      { method: "GET", path: "/api/settings/og-branding", description: "Pengaturan OG branding" },
      { method: "PUT", path: "/api/settings/og-branding", description: "Update OG branding" },
    ],
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  POST: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  PUT: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  PATCH: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  DELETE: "bg-red-500/10 text-red-600 border-red-500/20",
};

export function AuthSettingsTab({
  apiBaseUrl,
  authConfig,
  authEmail,
  currentWorkspace,
  getStoredAuthToken,
  copyToken,
  isCopyingToken,
  workspaces,
}: AuthSettingsTabProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  async function copyText(field: string, value: string) {
    if (!value) return;
    setCopiedField(field);
    try {
      await navigator.clipboard.writeText(value);
    } finally {
      setTimeout(() => setCopiedField(null), 1500);
    }
  }

  const activeSlug = currentWorkspace?.slug ?? "";
  const integrationToken = authConfig?.integrationToken ?? "";
  const tokenForExamples = integrationToken || "<your-token>";

  const curlLogin = `curl -X POST ${apiBaseUrl}/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "admin@example.com", "password": "your-password"}'`;

  const curlListNotes = `curl ${apiBaseUrl}/api/notes \\
  -H "Authorization: Bearer ${tokenForExamples}" \\
  -H "X-Workspace-Slug: ${activeSlug || "<workspace-slug>"}"`;

  const curlCreateNote = `curl -X POST ${apiBaseUrl}/api/notes \\
  -H "Authorization: Bearer ${tokenForExamples}" \\
  -H "X-Workspace-Slug: ${activeSlug || "<workspace-slug>"}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Judul Post",
    "slug": "judul-post",
    "contentMd": "# Konten\\n\\nIsi artikel.",
    "excerpt": "Ringkasan singkat",
    "seoTitle": "SEO Title",
    "seoDescription": "Deskripsi SEO",
    "seoKeywords": "keyword1, keyword2",
    "categoryIds": []
  }'`;

  const curlPublish = `curl -X POST ${apiBaseUrl}/api/notes/<note-id>/publish \\
  -H "Authorization: Bearer ${tokenForExamples}" \\
  -H "X-Workspace-Slug: ${activeSlug || "<workspace-slug>"}"`;

  return (
    <TabsContent value="auth" className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Auth & API Token</CardTitle>
          <CardDescription>
            Session token untuk browser saat ini, dan integration token untuk akses API dari app lain.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
          <div className="grid gap-2 rounded-xl border border-border bg-muted/20 p-4">
            <span>
              Admin email: <code>{authConfig?.adminEmail ?? authEmail}</code>
            </span>
            <span>Session TTL: {authConfig?.sessionTtlHours ?? "-"} jam</span>
            <span>Integration token: {authConfig?.hasIntegrationToken ? "configured" : "not configured"}</span>
          </div>

          <div className="grid gap-2">
            <FieldInfo label="Current session token" description="Token session browser aktif. Gunakan hanya untuk debugging internal." />
            <Textarea
              readOnly
              value={getStoredAuthToken() ?? ""}
              placeholder="Login dulu untuk melihat session token browser"
              className="min-h-24 font-mono text-xs"
            />
            <Button
              variant="outline"
              onClick={() => void copyToken("session", getStoredAuthToken() ?? "")}
              disabled={isCopyingToken !== null || !getStoredAuthToken()}
            >
              {isCopyingToken === "session" ? "Copying..." : "Copy session token"}
            </Button>
          </div>

          <div className="grid gap-2">
            <FieldInfo label="Static integration token" description="Pakai token ini untuk integrasi eksternal lewat header Authorization." />
            <Textarea
              readOnly
              value={authConfig?.integrationToken ?? ""}
              placeholder="Set AUTH_INTEGRATION_TOKEN di Worker env agar token muncul di sini"
              className="min-h-24 font-mono text-xs"
            />
            <Button
              variant="outline"
              onClick={() => void copyToken("integration", authConfig?.integrationToken ?? "")}
              disabled={isCopyingToken !== null || !authConfig?.integrationToken}
            >
              {isCopyingToken === "integration" ? "Copying..." : "Copy integration token"}
            </Button>
            <div className="text-xs text-muted-foreground">
              Header contoh: <code>Authorization: Bearer {authConfig?.integrationToken || "<your-token>"}</code>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Reference</CardTitle>
          <CardDescription>
            Informasi lengkap API untuk workspace <code>{activeSlug || "-"}</code>.
            Berikan info ini ke AI atau agent agar bisa manage post via API.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 text-sm">
          <div className="grid gap-3">
            <FieldInfo label="Base URL" description="URL dasar API worker. Semua endpoint diawali dengan base URL ini." />
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">{apiBaseUrl}</code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void copyText("baseUrl", apiBaseUrl)}
              >
                {copiedField === "baseUrl" ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="grid gap-3">
            <FieldInfo label="Required headers" description="Kirim header ini di setiap request API (kecuali /api/auth/login dan /api/auth/status)." />
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-3 py-2 text-left font-medium">Header</th>
                    <th className="px-3 py-2 text-left font-medium">Value</th>
                    <th className="px-3 py-2 text-left font-medium">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/50">
                    <td className="px-3 py-2 font-mono">Authorization</td>
                    <td className="px-3 py-2 font-mono">Bearer {tokenForExamples}</td>
                    <td className="px-3 py-2">Session token atau integration token</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="px-3 py-2 font-mono">X-Workspace-Slug</td>
                    <td className="px-3 py-2 font-mono">{activeSlug || "<workspace-slug>"}</td>
                    <td className="px-3 py-2">Slug workspace target</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono">Content-Type</td>
                    <td className="px-3 py-2 font-mono">application/json</td>
                    <td className="px-3 py-2">Wajib untuk request ber-body</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <Separator />

          <div className="grid gap-3">
            <FieldInfo label="Workspace slugs" description="Gunakan slug di header X-Workspace-Slug untuk menargetkan workspace tertentu." />
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-3 py-2 text-left font-medium">Name</th>
                    <th className="px-3 py-2 text-left font-medium">Slug</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="w-16 px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {workspaces.map((ws) => (
                    <tr key={ws.id} className="border-b border-border/50">
                      <td className="px-3 py-2 font-medium text-foreground">{ws.name}</td>
                      <td className="px-3 py-2 font-mono">{ws.slug}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline">{ws.status}</Badge>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => void copyText(`slug-${ws.id}`, ws.slug)}
                        >
                          {copiedField === `slug-${ws.id}` ? "Copied!" : "Copy"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4">
            <FieldInfo label="Endpoints" description="Semua endpoint yang tersedia. Kirim header Authorization dan X-Workspace-Slug sesuai kebutuhan." />
            {ENDPOINT_GROUPS.map((group) => (
              <div key={group.label} className="grid gap-1.5">
                <span className="text-xs font-semibold text-foreground">{group.label}</span>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-xs">
                    <tbody className="text-muted-foreground">
                      {group.endpoints.map((ep) => (
                        <tr key={ep.path + ep.method} className="border-b border-border/50 last:border-b-0">
                          <td className="w-20 px-3 py-1.5">
                            <Badge variant="outline" className={`${METHOD_COLORS[ep.method]} text-[10px]`}>
                              {ep.method}
                            </Badge>
                          </td>
                          <td className="px-3 py-1.5 font-mono">{ep.path}</td>
                          <td className="px-3 py-1.5">{ep.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          <div className="grid gap-4">
            <FieldInfo label="Quick start (curl)" description="Contoh request siap pakai. Ganti token dan slug sesuai kebutuhan." />

            <div className="grid gap-3">
              <span className="text-xs font-medium text-foreground">1. Login</span>
              <div className="relative">
                <pre className="overflow-x-auto rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">{curlLogin}</pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-6 px-2 text-xs"
                  onClick={() => void copyText("curl-login", curlLogin)}
                >
                  {copiedField === "curl-login" ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              <span className="text-xs font-medium text-foreground">2. List notes</span>
              <div className="relative">
                <pre className="overflow-x-auto rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">{curlListNotes}</pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-6 px-2 text-xs"
                  onClick={() => void copyText("curl-list", curlListNotes)}
                >
                  {copiedField === "curl-list" ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              <span className="text-xs font-medium text-foreground">3. Create note</span>
              <div className="relative">
                <pre className="overflow-x-auto rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">{curlCreateNote}</pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-6 px-2 text-xs"
                  onClick={() => void copyText("curl-create", curlCreateNote)}
                >
                  {copiedField === "curl-create" ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              <span className="text-xs font-medium text-foreground">4. Publish note</span>
              <div className="relative">
                <pre className="overflow-x-auto rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">{curlPublish}</pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-6 px-2 text-xs"
                  onClick={() => void copyText("curl-publish", curlPublish)}
                >
                  {copiedField === "curl-publish" ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
