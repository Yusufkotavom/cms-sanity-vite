import { lazy, Suspense } from "react";
import {
  CalendarClockIcon,
  Clock3Icon,
  FileTextIcon,
  ImagePlusIcon,
  Loader2Icon,
  SaveIcon,
  SendIcon,
} from "lucide-react";

import type { ApiCategory, ApiConfig, ApiNote } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type AiRunMode = null | "metadata" | "draft" | "outline" | "outline_to_post" | "seo_only";

type PostEditorPageProps = {
  draft: ApiNote;
  config: ApiConfig | null;
  scheduleAt: string;
  getScheduleDate: (value: string) => string;
  getScheduleTime: (value: string) => string;
  updateScheduleDate: (value: string) => void;
  updateScheduleTime: (value: string) => void;
  runAiAssist: (mode: Exclude<AiRunMode, null>) => Promise<void>;
  generateOgImage: () => Promise<void>;
  saveDraft: () => Promise<ApiNote | undefined>;
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
  isSaving: boolean;
  isScheduling: boolean;
  isPublishing: boolean;
  editorSectionTab: "overview" | "seo-og" | "outline" | "content";
  setEditorSectionTab: (value: "overview" | "seo-og" | "outline" | "content") => void;
  contentTab: "editor" | "preview";
  setContentTab: (value: "editor" | "preview") => void;
};

export function PostEditorPage({
  draft,
  config,
  scheduleAt,
  getScheduleDate,
  getScheduleTime,
  updateScheduleDate,
  updateScheduleTime,
  runAiAssist,
  generateOgImage,
  saveDraft,
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
  isSaving,
  isScheduling,
  isPublishing,
  editorSectionTab,
  setEditorSectionTab,
  contentTab,
  setContentTab,
}: PostEditorPageProps) {
  return (
    <section className="grid gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle>Markdown Editor</CardTitle>
              <CardDescription>
                Halaman editor terpisah untuk create atau edit note.
              </CardDescription>
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
          <CardDescription>
            Save draft ke D1, schedule via Worker cron, lalu publish ke Sanity `post`.
          </CardDescription>
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
                  Jam publish (WIB / UTC+7)
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

            <div className="flex flex-wrap gap-2 xl:justify-end">
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
              <Button variant="outline" onClick={() => void saveDraft()} disabled={isSaving}>
                {isSaving ? (
                  <Loader2Icon data-icon="inline-start" className="animate-spin" />
                ) : (
                  <SaveIcon data-icon="inline-start" />
                )}
                Save
              </Button>
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
            </div>
          </div>
        </CardContent>

        <CardContent className="flex flex-col gap-4">
          <Tabs
            value={editorSectionTab}
            onValueChange={(value) => setEditorSectionTab(value as typeof editorSectionTab)}
          >
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="seo-og">SEO & OG</TabsTrigger>
              <TabsTrigger value="outline">Outline</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
            </TabsList>

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
                    <span>Sanity: {config?.sanityConfigured ? "Siap publish" : "Belum dikonfigurasi"}</span>
                    <span>Categories: {draft.categoryIds.length}</span>
                    <span>Schedule: {scheduleAt ? `${getScheduleDate(scheduleAt)} ${getScheduleTime(scheduleAt)} WIB` : "Belum diatur"}</span>
                    <span>Updated: {formatRelativeDate(draft.updatedAt)}</span>
                    <span>Sanity ID: {draft.sanityDocumentId ?? "Belum publish"}</span>
                    {draft.lastError ? <span>Error: {draft.lastError}</span> : null}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  <div className="grid gap-2">
                    <span>SEO title: {draft.seoTitle ? "Filled" : "Empty"}</span>
                    <span>SEO description: {draft.seoDescription ? "Filled" : "Empty"}</span>
                    <span>SEO keywords: {draft.seoKeywords ? "Filled" : "Empty"}</span>
                    <span>OG title: {draft.ogTitle ? "Filled" : "Empty"}</span>
                    <span>OG description: {draft.ogDescription ? "Filled" : "Empty"}</span>
                    <span>OG image: {draft.ogImageAssetId ? `Attached (${draft.ogImageAssetId.slice(0, 20)}...)` : "Not generated"}</span>
                    <span>Outline: {draft.outlineMd ? "Ready" : "Empty"}</span>
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
                      {draft.ogImageAssetId
                        ? "Image sudah di-generate dan tersimpan di Sanity."
                        : "Belum ada OG image. Klik Generate OG Image untuk membuat."}
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
                  const ogUrl = sanityAssetToUrl(
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
                    Pilih kategori Sanity yang relevan. Ini cukup sebagai field tambahan minimum.
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
                      <DialogDescription>
                        Daftar category diambil langsung dari Sanity. Scroll di sini, lalu klik Done.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
                      {categoryOptions.length === 0 ? (
                        <span className="text-sm text-muted-foreground">
                          Belum ada kategori yang berhasil dimuat dari Sanity.
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
                  Publish dan schedule belum bisa jalan ke Sanity karena settings backend belum diisi.
                </div>
              ) : null}

              <Tabs
                value={contentTab}
                onValueChange={(value) => setContentTab(value as typeof contentTab)}
              >
                <TabsList>
                  <TabsTrigger value="editor">Editor</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <TabsContent value="editor">
                  <Textarea
                    value={draft.contentMd}
                    onChange={(event) => updateDraft({ contentMd: event.target.value })}
                    className="min-h-[520px] resize-y font-mono text-sm"
                  />
                </TabsContent>
                <TabsContent value="preview">
                  <Suspense fallback={<EditorFallback label="Loading preview..." />}>
                    <MarkdownPreview source={draft.contentMd} />
                  </Suspense>
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </section>
  );
}
