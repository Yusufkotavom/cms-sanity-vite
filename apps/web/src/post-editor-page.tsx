import { lazy, Suspense, useState } from "react";
import {
  CalendarClockIcon,
  Clock3Icon,
  ExternalLinkIcon,
  FileTextIcon,
  ImagePlusIcon,
  Loader2Icon,
  RefreshCcwIcon,
  Trash2Icon,
  XCircleIcon,
  SaveIcon,
  SendIcon,
  SparklesIcon,
  CopyIcon,
  CheckIcon,
} from "lucide-react";

import type { AiAssistJob, AiPromptTemplate, ApiCategory, ApiConfig, ApiNote } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const MarkdownPreview = lazy(async () => {
  const module = await import("@/components/markdown-preview");
  return { default: module.Preview };
});

function EditorFallback({ label }: { label: string }) {
  return (
    <div className="flex min-h-[520px] items-center justify-center rounded-xl border border-border bg-card/60 text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function sanityAssetToUrl(assetId: string | null, projectId: string | null, dataset: string | null): string | null {
  if (!assetId || !projectId || !dataset) return null;
  const hash = assetId.replace(/^image-/, "");
  const lastDash = hash.lastIndexOf("-");
  if (lastDash === -1) return null;
  const filename = `${hash.slice(0, lastDash)}.${hash.slice(lastDash + 1)}`;
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${filename}`;
}

type AiRunMode = null | "metadata" | "draft" | "outline" | "outline_to_post" | "seo_only" | "all_in_one";

function aiJobStatusVariant(status: AiAssistJob["status"]): "default" | "secondary" | "destructive" | "outline" {
  if (status === "completed") return "default";
  if (status === "failed") return "destructive";
  if (status === "cancelled") return "secondary";
  return "outline";
}

function formatAiModeLabel(mode: AiAssistJob["mode"]) {
  switch (mode) {
    case "metadata":
      return "Metadata";
    case "draft":
      return "Draft";
    case "outline":
      return "Outline";
    case "outline_to_post":
      return "Outline to Post";
    case "seo_only":
      return "SEO Only";
    case "all_in_one":
      return "All in One";
  }
}

type PostEditorPageProps = {
  draft: ApiNote;
  config: ApiConfig | null;
  scheduleAt: string;
  getScheduleDate: (value: string) => string;
  getScheduleTime: (value: string) => string;
  updateScheduleDate: (value: string) => void;
  updateScheduleTime: (value: string) => void;
  runAiAssist: (mode: Exclude<AiRunMode, null>) => Promise<void>;
  aiTemplates: AiPromptTemplate[];
  selectedTemplateId: string;
  setSelectedTemplateId: (id: string) => void;
  activeAiAssistJob: AiAssistJob | null;
  cancelActiveAiAssistJob: () => Promise<void>;
  retryActiveAiAssistJob: () => Promise<void>;
  generateOgImage: () => Promise<void>;
  saveDraft: () => Promise<ApiNote | undefined>;
  refreshDraftFromSanity: () => Promise<void>;
  deleteDraftSanityPost: () => Promise<void>;
  runAiRewritePreview: (prompt: string) => Promise<void>;
  applyAiRewriteCandidate: () => void;
  scheduleDraft: () => Promise<void>;
  publishDraft: () => Promise<void>;
  retryPublishDraft: () => Promise<void>;
  updateTitle: (value: string) => void;
  updateDraft: (patch: Partial<ApiNote>) => void;
  formatRelativeDate: (value: string | null) => string;
  categoryOptions: ApiCategory[];
  isCategoryDialogOpen: boolean;
  setIsCategoryDialogOpen: (open: boolean) => void;
  getSelectedCategoryLabel: () => string;
  toggleCategory: (categoryId: string, nextChecked: boolean) => void;
  navigateBack: () => void;
  deleteSelectedNote: () => void;
  isAiRunning: AiRunMode;
  isGeneratingOg: boolean;
  isRefreshingFromSanity: boolean;
  isDeletingSanityPost: boolean;
  isAiRewritePreviewRunning: boolean;
  isSaving: boolean;
  isScheduling: boolean;
  isPublishing: boolean;
  editorSectionTab: "overview" | "seo-og" | "outline" | "content" | "sanity";
  setEditorSectionTab: (value: "overview" | "seo-og" | "outline" | "content" | "sanity") => void;
  contentTab: "editor" | "preview";
  setContentTab: (value: "editor" | "preview") => void;
};

function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-64 text-xs">{label}</TooltipContent>
    </Tooltip>
  );
}

export function PostEditorPage({
  draft,
  config,
  scheduleAt,
  getScheduleDate,
  getScheduleTime,
  updateScheduleDate,
  updateScheduleTime,
  runAiAssist,
  aiTemplates,
  selectedTemplateId,
  setSelectedTemplateId,
  activeAiAssistJob,
  cancelActiveAiAssistJob,
  retryActiveAiAssistJob,
  generateOgImage,
  saveDraft,
  refreshDraftFromSanity,
  deleteDraftSanityPost,
  runAiRewritePreview,
  applyAiRewriteCandidate,
  scheduleDraft,
  publishDraft,
  retryPublishDraft,
  updateTitle,
  updateDraft,
  formatRelativeDate,
  categoryOptions,
  isCategoryDialogOpen,
  setIsCategoryDialogOpen,
  getSelectedCategoryLabel,
  toggleCategory,
  navigateBack,
  deleteSelectedNote,
  isAiRunning,
  isGeneratingOg,
  isRefreshingFromSanity,
  isDeletingSanityPost,
  isAiRewritePreviewRunning,
  isSaving,
  isScheduling,
  isPublishing,
  editorSectionTab,
  setEditorSectionTab,
  contentTab,
  setContentTab,
}: PostEditorPageProps) {
  const [aiRewritePrompt, setAiRewritePrompt] = useState(
    "Rewrite konten post ini dalam bahasa Indonesia yang lebih rapi, lebih kuat secara SEO, dan tetap menjaga fakta asli. Perbaiki alur, kejelasan, transisi, excerpt, serta metadata SEO/OG. Jangan mengubah intent utama atau menambahkan klaim yang tidak ada di sumber."
  );
  const [showPromptLog, setShowPromptLog] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const handleCopyPrompt = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };
  const sanityDocumentUrl = draft.sanityDocumentId && config?.sanityProjectId && config.sanityDataset
    ? `https://${config.sanityProjectId}.api.sanity.io/v2026-03-29/data/doc/${config.sanityDataset}/${encodeURIComponent(draft.sanityDocumentId)}`
    : null;

  const sanityStudioUrl = draft.sanityDocumentId && config?.sanityStudioUrl
    ? `${config.sanityStudioUrl}/structure/coreContent;posts;${encodeURIComponent(draft.sanityDocumentId)}`
    : null;

  function openSanityDocument() {
    if (!sanityDocumentUrl) return;
    window.open(sanityDocumentUrl, "_blank", "noopener,noreferrer");
  }

  function openSanityStudio() {
    if (!sanityStudioUrl) return;
    window.open(sanityStudioUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="grid gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle>Post Editor</CardTitle>
              <CardDescription>Tulis, rapikan, dan siapkan post Anda di satu tempat.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={navigateBack}>
                Kembali ke daftar
              </Button>
              <Button variant="outline" onClick={deleteSelectedNote}>
                Hapus
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardHeader>
          <CardTitle className="sr-only">Editor Content</CardTitle>
          <CardDescription>Atur jadwal, isi konten, SEO, dan gambar preview dengan alur yang ringkas.</CardDescription>
        </CardHeader>

        <CardContent className="border-y border-border bg-muted/20 py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="grid gap-4 md:grid-cols-2 xl:min-w-[420px] xl:flex-1">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium" htmlFor="schedule-date">
                  Tanggal publish
                </label>
                <Input
                  id="schedule-date"
                  type="date"
                  value={getScheduleDate(scheduleAt)}
                  onChange={(event) => updateScheduleDate(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium" htmlFor="schedule-time">
                  Jam publish
                </label>
                <div className="relative">
                  <Clock3Icon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="schedule-time"
                    type="time"
                    value={getScheduleTime(scheduleAt)}
                    onChange={(event) => updateScheduleTime(event.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 xl:w-64">
              <label className="text-sm font-medium">Template AI</label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Default (Workspace)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">Default (Workspace)</SelectItem>
                  {aiTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2 xl:justify-end">
              <TooltipProvider>
                <Tip label="Hasilkan outline, artikel lengkap, dan metadata SEO dalam satu klik (3 langkah AI)">
                  <Button
                    variant="default"
                    onClick={() => void runAiAssist("all_in_one")}
                    disabled={isAiRunning !== null}
                  >
                    {isAiRunning === "all_in_one" ? (
                      <Loader2Icon data-icon="inline-start" className="animate-spin" />
                    ) : (
                      <SparklesIcon data-icon="inline-start" />
                    )}
                    AI All-in-One
                  </Button>
                </Tip>
                <Tip label="Optimasi judul, slug, excerpt, dan semua field SEO/OG dari konten yang sudah ada">
                  <Button
                    variant="outline"
                    onClick={() => void runAiAssist("metadata")}
                    disabled={isAiRunning !== null}
                  >
                    {isAiRunning === "metadata" ? (
                      <Loader2Icon data-icon="inline-start" className="animate-spin" />
                    ) : (
                      <FileTextIcon data-icon="inline-start" />
                    )}
                    AI Metadata
                  </Button>
                </Tip>
                <Tip label="Perbaiki draft: struktur, alur, dan tata bahasa tanpa mengubah intent">
                  <Button
                    variant="outline"
                    onClick={() => void runAiAssist("draft")}
                    disabled={isAiRunning !== null}
                  >
                    {isAiRunning === "draft" ? (
                      <Loader2Icon data-icon="inline-start" className="animate-spin" />
                    ) : (
                      <FileTextIcon data-icon="inline-start" />
                    )}
                    AI Draft
                  </Button>
                </Tip>
                <Tip label="Buat outline artikel terstruktur dari judul atau keyword yang ada">
                  <Button
                    variant="outline"
                    onClick={() => void runAiAssist("outline")}
                    disabled={isAiRunning !== null}
                  >
                    {isAiRunning === "outline" ? (
                      <Loader2Icon data-icon="inline-start" className="animate-spin" />
                    ) : (
                      <FileTextIcon data-icon="inline-start" />
                    )}
                    Generate Outline
                  </Button>
                </Tip>
                <Tip label="Ubah outline menjadi artikel lengkap siap publish plus metadata">
                  <Button
                    variant="outline"
                    onClick={() => void runAiAssist("outline_to_post")}
                    disabled={isAiRunning !== null}
                  >
                    {isAiRunning === "outline_to_post" ? (
                      <Loader2Icon data-icon="inline-start" className="animate-spin" />
                    ) : (
                      <SendIcon data-icon="inline-start" />
                    )}
                    Outline to Post
                  </Button>
                </Tip>
                <Tip label="Hasilkan atau optimasi field SEO/OG tanpa menyentuh konten">
                  <Button
                    variant="outline"
                    onClick={() => void runAiAssist("seo_only")}
                    disabled={isAiRunning !== null}
                  >
                    {isAiRunning === "seo_only" ? (
                      <Loader2Icon data-icon="inline-start" className="animate-spin" />
                    ) : (
                      <FileTextIcon data-icon="inline-start" />
                    )}
                    Generate SEO Only
                  </Button>
                </Tip>
                <Tip label="Buat gambar OG preview 1200×630 untuk sosial media">
                  <Button
                    variant="outline"
                    onClick={() => void generateOgImage()}
                    disabled={isGeneratingOg || isSaving}
                  >
                    {isGeneratingOg ? (
                      <Loader2Icon data-icon="inline-start" className="animate-spin" />
                    ) : (
                      <ImagePlusIcon data-icon="inline-start" />
                    )}
                    Generate OG Image
                  </Button>
                </Tip>
                <Tip label="Simpan draft lokal">
                  <Button variant="outline" onClick={() => void saveDraft()} disabled={isSaving}>
                    {isSaving ? (
                      <Loader2Icon data-icon="inline-start" className="animate-spin" />
                    ) : (
                      <SaveIcon data-icon="inline-start" />
                    )}
                    Save
                  </Button>
                </Tip>
                <Tip label="Atur jadwal publish ke Sanity">
                  <Button
                    variant="outline"
                    onClick={() => void scheduleDraft()}
                    disabled={isSaving || isScheduling}
                  >
                    {isScheduling ? (
                      <Loader2Icon data-icon="inline-start" className="animate-spin" />
                    ) : (
                      <CalendarClockIcon data-icon="inline-start" />
                    )}
                    Schedule
                  </Button>
                </Tip>
                <Tip label={draft.status === "failed" ? "Coba publish ulang setelah gagal" : "Publish ke Sanity"}>
                  <Button
                    onClick={() => void (draft.status === "failed" ? retryPublishDraft() : publishDraft())}
                    disabled={isSaving || isPublishing}
                  >
                    {isPublishing ? (
                      <Loader2Icon data-icon="inline-start" className="animate-spin" />
                    ) : (
                      <SendIcon data-icon="inline-start" />
                    )}
                    {draft.status === "failed" ? "Retry Publish" : "Publish"}
                  </Button>
                </Tip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>

        {activeAiAssistJob ? (
          <CardContent className="border-b border-border bg-muted/10 py-4">
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 text-sm md:flex-row md:items-start md:justify-between">
              <div className="grid gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">AI Process</span>
                  <Badge variant={aiJobStatusVariant(activeAiAssistJob.status)}>{activeAiAssistJob.status}</Badge>
                  <Badge variant="outline">{formatAiModeLabel(activeAiAssistJob.mode)}</Badge>
                </div>
                <div className="grid gap-1 text-xs text-muted-foreground md:grid-cols-2">
                  <span>Job ID: {activeAiAssistJob.id}</span>
                  <span>Attempts: {activeAiAssistJob.attempts}</span>
                  <span>Created: {formatRelativeDate(activeAiAssistJob.createdAt)}</span>
                  <span>Updated: {formatRelativeDate(activeAiAssistJob.updatedAt)}</span>
                </div>
                {activeAiAssistJob.error ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                    {activeAiAssistJob.error}
                  </div>
                ) : null}
                {activeAiAssistJob.status === "queued" || activeAiAssistJob.status === "processing" ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2Icon className="size-3 animate-spin" />
                    <span>{activeAiAssistJob.status === "queued" ? "Menunggu worker..." : "AI sedang proses. Aman refresh/ganti note/tutup tab."}</span>
                  </div>
                ) : null}
                {activeAiAssistJob.promptLog ? (
                  <div className="mt-1 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs font-normal text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPromptLog(!showPromptLog)}
                      >
                        {showPromptLog ? "Sembunyikan Prompt AI" : "Tampilkan Prompt AI"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs font-normal text-muted-foreground hover:text-foreground flex items-center gap-1"
                        onClick={() => handleCopyPrompt(activeAiAssistJob.promptLog || "")}
                      >
                        {copiedPrompt ? (
                          <>
                            <CheckIcon className="size-3 text-green-500" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <CopyIcon className="size-3" />
                            <span>Copy Prompt</span>
                          </>
                        )}
                      </Button>
                    </div>
                    {showPromptLog && (
                      <pre className="max-h-[300px] overflow-auto rounded-lg border border-border bg-muted p-3 font-mono text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap break-all">
                        {activeAiAssistJob.promptLog}
                      </pre>
                    )}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {activeAiAssistJob.status === "queued" || activeAiAssistJob.status === "processing" ? (
                  <TooltipProvider>
                    <Tip label="Batalkan job AI yang sedang berjalan">
                      <Button variant="outline" size="sm" onClick={() => void cancelActiveAiAssistJob()}>
                        <XCircleIcon data-icon="inline-start" />
                        Cancel AI
                      </Button>
                    </Tip>
                  </TooltipProvider>
                ) : null}
                {activeAiAssistJob.status === "failed" || activeAiAssistJob.status === "cancelled" ? (
                  <TooltipProvider>
                    <Tip label="Coba ulang job AI yang gagal">
                      <Button variant="outline" size="sm" onClick={() => void retryActiveAiAssistJob()}>
                        <RefreshCcwIcon data-icon="inline-start" />
                        Retry AI
                      </Button>
                    </Tip>
                  </TooltipProvider>
                ) : null}
              </div>
            </div>
          </CardContent>
        ) : null}

        <CardContent className="flex flex-col gap-4">
          <Tabs
            value={editorSectionTab}
            onValueChange={(value) => setEditorSectionTab(value as typeof editorSectionTab)}
          >
            <div className="-mx-4 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
              <TabsList className="w-max min-w-full flex-nowrap md:grid md:w-full md:grid-cols-5">
                <TabsTrigger className="shrink-0 md:flex-1" value="overview">
                  Overview
                </TabsTrigger>
                <TabsTrigger className="shrink-0 md:flex-1" value="seo-og">
                  SEO & OG
                </TabsTrigger>
                <TabsTrigger className="shrink-0 md:flex-1" value="outline">
                  Outline
                </TabsTrigger>
                <TabsTrigger className="shrink-0 md:flex-1" value="content">
                  Content
                </TabsTrigger>
                <TabsTrigger className="shrink-0 md:flex-1" value="sanity">
                  Sanity Workflow
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium" htmlFor="note-title">
                    Title
                  </label>
                  <Input
                    id="note-title"
                    value={draft.title}
                    onChange={(event) => updateTitle(event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium" htmlFor="note-slug">
                    Slug
                  </label>
                  <Input
                    id="note-slug"
                    value={draft.slug}
                    onChange={(event) => updateDraft({ slug: event.target.value })}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium" htmlFor="note-excerpt">
                  Excerpt
                </label>
                <Textarea
                  id="note-excerpt"
                  value={draft.excerpt}
                  onChange={(event) => updateDraft({ excerpt: event.target.value })}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  <div className="grid gap-2">
                    <span>Status: {draft.status}</span>
                    <span>Publish ready: {config?.sanityConfigured ? "Ya" : "Belum"}</span>
                    <span>Kategori: {draft.categoryIds.length}</span>
                    <span>Sanity link: {draft.sanityDocumentId ? "Terhubung" : "Belum terhubung"}</span>
                    <span>Sanity revision: {draft.sanityRevision ?? "Belum ada"}</span>
                    <span>Jadwal: {scheduleAt ? `${getScheduleDate(scheduleAt)} ${getScheduleTime(scheduleAt)}` : "Belum diatur"}</span>
                    <span>Terakhir diubah: {formatRelativeDate(draft.updatedAt)}</span>
                    {draft.lastError ? <span>Error: {draft.lastError}</span> : null}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  <div className="grid gap-2">
                    <span>SEO title: {draft.seoTitle ? "Terisi" : "Kosong"}</span>
                    <span>SEO description: {draft.seoDescription ? "Terisi" : "Kosong"}</span>
                    <span>SEO keywords: {draft.seoKeywords ? "Terisi" : "Kosong"}</span>
                    <span>OG title: {draft.ogTitle ? "Terisi" : "Kosong"}</span>
                    <span>OG description: {draft.ogDescription ? "Terisi" : "Kosong"}</span>
                    <span>OG image: {draft.ogImageAssetId ? "Sudah ada" : "Belum ada"}</span>
                    <span>Outline: {draft.outlineMd ? "Siap" : "Kosong"}</span>
                  </div>
                </div>
              </div>

            </TabsContent>

            <TabsContent value="seo-og" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium" htmlFor="note-seo-title">
                  SEO Title
                  </label>
                  <Input
                    id="note-seo-title"
                    value={draft.seoTitle}
                    onChange={(event) => updateDraft({ seoTitle: event.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium" htmlFor="note-seo-description">
                    SEO Description
                  </label>
                  <Textarea
                    id="note-seo-description"
                    value={draft.seoDescription}
                    onChange={(event) => updateDraft({ seoDescription: event.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium" htmlFor="note-seo-keywords">
                    SEO Keywords
                  </label>
                  <Input
                    id="note-seo-keywords"
                    value={draft.seoKeywords}
                    onChange={(event) => updateDraft({ seoKeywords: event.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium" htmlFor="note-og-title">
                    OG Title
                  </label>
                  <Input
                    id="note-og-title"
                    value={draft.ogTitle}
                    onChange={(event) => updateDraft({ ogTitle: event.target.value })}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium" htmlFor="note-og-description">
                  OG Description
                </label>
                <Textarea
                  id="note-og-description"
                  value={draft.ogDescription}
                  onChange={(event) => updateDraft({ ogDescription: event.target.value })}
                />
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">OG Image Preview</span>
                    <span className="text-xs text-muted-foreground">
                      {draft.ogImageAssetId ? "Preview gambar saat ini." : "Buat gambar preview bila diperlukan."}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void generateOgImage()}
                    disabled={isGeneratingOg || isSaving}
                  >
                    {isGeneratingOg ? (
                      <Loader2Icon data-icon="inline-start" className="animate-spin" />
                    ) : (
                      <ImagePlusIcon data-icon="inline-start" />
                    )}
                    {draft.ogImageAssetId ? "Regenerate" : "Generate"}
                  </Button>
                </div>
                {(() => {
                  const ogUrl = draft.ogImageUrl || sanityAssetToUrl(
                    draft.ogImageAssetId,
                    config?.sanityProjectId ?? null,
                    config?.sanityDataset ?? null
                  );
                  if (ogUrl) {
                    return (
                      <div className="overflow-hidden rounded-lg border border-border">
                        <img
                          src={ogUrl}
                          alt={`OG preview: ${draft.title}`}
                          className="w-full"
                          loading="lazy"
                        />
                      </div>
                    );
                  }
                  return (
                    <div className="flex aspect-[1200/630] items-center justify-center rounded-lg border border-dashed border-border bg-background/60 text-sm text-muted-foreground">
                      1200 x 630 — belum ada image
                    </div>
                  );
                })()}
              </div>
            </TabsContent>

            <TabsContent value="outline" className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium" htmlFor="note-outline">
                  Outline
                </label>
                <Textarea
                  id="note-outline"
                  value={draft.outlineMd}
                  onChange={(event) => updateDraft({ outlineMd: event.target.value })}
                  className="min-h-[240px] resize-y font-mono text-sm"
                />
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">Categories</span>
                  <span className="text-xs text-muted-foreground">
                    Pilih kategori yang paling relevan untuk post ini.
                  </span>
                </div>
                <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                  <DialogTrigger
                    render={
                      <Button variant="outline" className="w-full justify-between md:w-auto" />
                    }
                  >
                    <span>{getSelectedCategoryLabel()}</span>
                    <Badge variant="secondary">{draft.categoryIds.length}</Badge>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl gap-0 p-0 sm:max-w-2xl">
                    <DialogHeader className="border-b px-6 py-4">
                      <DialogTitle>Pilih Categories</DialogTitle>
                      <DialogDescription>Pilih satu atau beberapa kategori, lalu klik Done.</DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
                      {categoryOptions.length === 0 ? (
                        <span className="text-sm text-muted-foreground">
                          Belum ada kategori yang tersedia.
                        </span>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                          {categoryOptions.map((category) => {
                            const checked = draft.categoryIds.includes(category.id);

                            return (
                              <label
                                key={category.id}
                                className="flex items-start gap-3 rounded-lg border border-border/70 bg-background/60 p-3"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(nextChecked) =>
                                    toggleCategory(category.id, Boolean(nextChecked))
                                  }
                                />
                                <span className="flex flex-col gap-1">
                                  <span className="text-sm font-medium text-foreground">{category.title}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {category.slug ? `/${category.slug}` : category.id}
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <DialogFooter className="sticky bottom-0 rounded-b-xl border-t bg-background/95 px-6 py-4 backdrop-blur-sm">
                      <div className="mr-auto text-sm text-muted-foreground">
                        {draft.categoryIds.length} kategori dipilih
                      </div>
                      <Button onClick={() => setIsCategoryDialogOpen(false)}>Done</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </TabsContent>

            <TabsContent value="content" className="space-y-4">
              {!config?.sanityConfigured ? (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
                  Pengaturan publish belum lengkap.
                </div>
              ) : null}

              <Tabs
                value={contentTab}
                onValueChange={(value) => setContentTab(value as typeof contentTab)}
              >
                <div className="overflow-x-auto pb-1">
                  <TabsList className="w-max min-w-full flex-nowrap sm:w-fit">
                    <TabsTrigger className="shrink-0" value="editor">
                      Editor
                    </TabsTrigger>
                    <TabsTrigger className="shrink-0" value="preview">
                      Preview
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="editor">
                  {draft.aiRewriteContentMd ? (
                    <div className="grid gap-4 xl:grid-cols-2">
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Current Draft Content</label>
                        <Textarea
                          value={draft.contentMd}
                          onChange={(event) => updateDraft({ contentMd: event.target.value })}
                          className="min-h-[520px] resize-y font-mono text-sm"
                        />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">AI Rewrite Candidate</label>
                        <Textarea
                          value={draft.aiRewriteContentMd}
                          readOnly
                          className="min-h-[520px] resize-y font-mono text-sm"
                        />
                      </div>
                    </div>
                  ) : (
                    <Textarea
                      value={draft.contentMd}
                      onChange={(event) => updateDraft({ contentMd: event.target.value })}
                      className="min-h-[520px] resize-y font-mono text-sm"
                    />
                  )}
                </TabsContent>
                <TabsContent value="preview">
                  <Suspense fallback={<EditorFallback label="Loading preview..." />}>
                    <MarkdownPreview source={draft.contentMd} />
                  </Suspense>
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="sanity" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  <div className="grid gap-2">
                    <span>Sanity link: {draft.sanityDocumentId ? "Terhubung" : "Belum terhubung"}</span>
                    <span>Sanity document: {draft.sanityDocumentId ?? "-"}</span>
                    <span>Sanity revision: {draft.sanityRevision ?? "Belum ada"}</span>
                    <span>Workflow: hanya field aman yang di-patch ke Sanity, block custom lain tidak disentuh.</span>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  <div className="grid gap-2">
                    <span>Current draft body: {draft.contentMd ? "Terisi" : "Kosong"}</span>
                    <span>AI candidate body: {draft.aiRewriteContentMd ? "Siap dibandingkan" : "Belum ada"}</span>
                    <span>AI candidate metadata: {draft.aiRewriteUpdatedAt ? `Dibuat ${formatRelativeDate(draft.aiRewriteUpdatedAt)}` : "Belum ada"}</span>
                  </div>
                </div>
              </div>

              {!draft.sanityDocumentId ? (
                <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Buka post dari tab <strong>Sanity Posts</strong> untuk mengaktifkan workflow rewrite dan patch update ke Sanity.
                </div>
              ) : (
                <>
                  <div className="grid gap-4 rounded-xl border border-border bg-muted/20 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="grid gap-1">
                        <span className="text-sm font-medium text-foreground">Sanity Rewrite Workflow</span>
                        <span className="text-xs text-muted-foreground">
                          Refresh konten dari Sanity dulu, generate kandidat rewrite AI, bandingkan, lalu apply ke draft utama jika cocok.
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {sanityStudioUrl ? (
                          <Button variant="outline" onClick={openSanityStudio}>
                            <ExternalLinkIcon data-icon="inline-start" />
                            Open in Studio
                          </Button>
                        ) : null}
                        {sanityDocumentUrl ? (
                          <Button variant="outline" onClick={openSanityDocument}>
                            <ExternalLinkIcon data-icon="inline-start" />
                            Open Sanity JSON
                          </Button>
                        ) : null}
                        <Button variant="outline" onClick={() => void refreshDraftFromSanity()} disabled={isRefreshingFromSanity || isDeletingSanityPost}>
                          {isRefreshingFromSanity ? (
                            <Loader2Icon data-icon="inline-start" className="animate-spin" />
                          ) : (
                            <RefreshCcwIcon data-icon="inline-start" />
                          )}
                          Refresh from Sanity
                        </Button>
                        <Button variant="destructive" onClick={() => void deleteDraftSanityPost()} disabled={isRefreshingFromSanity || isDeletingSanityPost}>
                          {isDeletingSanityPost ? (
                            <Loader2Icon data-icon="inline-start" className="animate-spin" />
                          ) : (
                            <Trash2Icon data-icon="inline-start" />
                          )}
                          Delete Sanity Post
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium" htmlFor="ai-rewrite-prompt">
                        Rewrite Prompt
                      </label>
                      <Textarea
                        id="ai-rewrite-prompt"
                        value={aiRewritePrompt}
                        onChange={(event) => setAiRewritePrompt(event.target.value)}
                        className="min-h-[140px]"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => void runAiRewritePreview(aiRewritePrompt)}
                        disabled={isAiRewritePreviewRunning || !aiRewritePrompt.trim()}
                      >
                        {isAiRewritePreviewRunning ? (
                          <Loader2Icon data-icon="inline-start" className="animate-spin" />
                        ) : (
                          <SparklesIcon data-icon="inline-start" />
                        )}
                        Generate AI Rewrite Preview
                      </Button>
                      <Button
                        onClick={applyAiRewriteCandidate}
                        disabled={!draft.aiRewriteContentMd || isAiRewritePreviewRunning}
                      >
                        Apply AI Rewrite to Draft
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 rounded-xl border border-border bg-muted/20 p-4 md:grid-cols-2">
                    <div className="grid gap-2 text-sm">
                      <span className="font-medium text-foreground">Current Draft Metadata</span>
                      <span>Excerpt: {draft.excerpt || "-"}</span>
                      <span>SEO Title: {draft.seoTitle || "-"}</span>
                      <span>SEO Description: {draft.seoDescription || "-"}</span>
                      <span>SEO Keywords: {draft.seoKeywords || "-"}</span>
                      <span>OG Title: {draft.ogTitle || "-"}</span>
                      <span>OG Description: {draft.ogDescription || "-"}</span>
                    </div>
                    <div className="grid gap-2 text-sm">
                      <span className="font-medium text-foreground">AI Rewrite Candidate</span>
                      <span>Excerpt: {draft.aiRewriteExcerpt || "-"}</span>
                      <span>SEO Title: {draft.aiRewriteSeoTitle || "-"}</span>
                      <span>SEO Description: {draft.aiRewriteSeoDescription || "-"}</span>
                      <span>SEO Keywords: {draft.aiRewriteSeoKeywords || "-"}</span>
                      <span>OG Title: {draft.aiRewriteOgTitle || "-"}</span>
                      <span>OG Description: {draft.aiRewriteOgDescription || "-"}</span>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </section>
  );
}
