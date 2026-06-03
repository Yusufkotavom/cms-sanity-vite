import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  CalendarClockIcon,
  CircleAlertIcon,
  FileTextIcon,
  Loader2Icon,
  SendIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  ApiError,
  authApi,
  clearStoredAuthToken,
  clearStoredApiBaseUrlOverride,
  getApiBaseUrl,
  getDefaultApiBaseUrl,
  getStoredAuthToken,
  getStoredApiBaseUrlOverride,
  notesApi,
  setStoredAuthToken,
  setStoredApiBaseUrlOverride,
  type AiSettings,
  type ApiCategory,
  type ApiConfig,
  type ApiNote,
  type AuthSettings,
  type AuthStatus,
  type OgBrandingSettings,
  type SanitySettings,
} from "@/lib/api";
import { AppSidebar } from "@/components/app-sidebar";
import { PostEditorPage } from "./post-editor-page";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const AiBatchPage = lazy(async () => {
  const module = await import("./ai-batch-page");
  return { default: module.AiBatchPage };
});

type Note = ApiNote;
type LoginState = "checking" | "authenticated" | "unauthenticated";
type AppRoute =
  | "dashboard"
  | "posts"
  | "scheduled"
  | "sanity-sync"
  | "ai-batch"
  | "settings"
  | "api-status";

type RouteState = {
  route: AppRoute;
  noteId: string | null;
  isNewNote: boolean;
};

const JAKARTA_TIME_ZONE = "Asia/Jakarta";
const JAKARTA_UTC_OFFSET_HOURS = 7;

const routeMeta: Record<AppRoute, { title: string; description: string }> = {
  dashboard: {
    title: "Dashboard",
    description: "Ringkasan performa draft, schedule, dan publish.",
  },
  posts: {
    title: "Posts",
    description: "Kelola note markdown, edit konten, preview, dan publish.",
  },
  scheduled: {
    title: "Scheduled",
    description: "Pantau konten yang menunggu cron publish.",
  },
  "sanity-sync": {
    title: "Sanity Sync",
    description: "Lihat kesiapan integrasi Sanity dan status publish.",
  },
  "ai-batch": {
    title: "AI Batch",
    description: "Generate outline dan konten secara bertahap dari banyak keyword.",
  },
  settings: {
    title: "Settings",
    description: "Konfigurasi frontend dan panduan environment worker.",
  },
  "api-status": {
    title: "API Status",
    description: "Periksa koneksi worker, D1, dan readiness publish.",
  },
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function getRouteFromHash(hash: string): RouteState {
  const normalized = hash.replace(/^#\/?/, "").trim();
  const segments = normalized.split("/").filter(Boolean);
  const allowedRoutes: AppRoute[] = [
    "dashboard",
    "posts",
    "scheduled",
    "sanity-sync",
    "ai-batch",
    "settings",
    "api-status",
  ];

  const route = allowedRoutes.includes((segments[0] ?? "") as AppRoute)
    ? ((segments[0] ?? "dashboard") as AppRoute)
    : "dashboard";

  if (route !== "posts") {
    return {
      route,
      noteId: null,
      isNewNote: false,
    };
  }

  if (segments[1] === "new") {
    return {
      route,
      noteId: null,
      isNewNote: true,
    };
  }

  return {
    route,
    noteId: segments[1] ?? null,
    isNewNote: false,
  };
}

function formatRelativeDate(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return `${new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: JAKARTA_TIME_ZONE,
  }).format(date)} WIB`;
}

function getJakartaParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const map = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));

  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour: map.hour,
    minute: map.minute,
  };
}

function toJakartaScheduleValue(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const { year, month, day, hour, minute } = getJakartaParts(date);
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function fromJakartaScheduleValue(value: string) {
  if (!value) return null;

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const utcDate = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour) - JAKARTA_UTC_OFFSET_HOURS,
      Number(minute)
    )
  );

  return utcDate.toISOString();
}

function getScheduleDate(value: string) {
  return value.split("T")[0] ?? "";
}

function getScheduleTime(value: string) {
  return value.split("T")[1] ?? "09:00";
}

function setScheduleDateTime(currentValue: string, nextDate?: string, nextTime?: string) {
  const date = nextDate ?? getScheduleDate(currentValue);
  const time = nextTime ?? getScheduleTime(currentValue);

  if (!date) return "";

  return `${date}T${time || "00:00"}`;
}

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl font-semibold">{value}</CardTitle>
      </CardHeader>
      <CardFooter className="justify-between gap-3">
        <span className="text-sm text-muted-foreground">{description}</span>
        <span className="text-muted-foreground">{icon}</span>
      </CardFooter>
    </Card>
  );
}

function App() {
  const [routeState, setRouteState] = useState<RouteState>(() => getRouteFromHash(window.location.hash));
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [draft, setDraft] = useState<Note | null>(null);
  const [savedDraft, setSavedDraft] = useState<Note | null>(null);
  const [scheduleAt, setScheduleAt] = useState("");
  const [editorSectionTab, setEditorSectionTab] = useState<"overview" | "seo-og" | "outline" | "content">("overview");
  const [contentTab, setContentTab] = useState<"editor" | "preview">("editor");
  const [config, setConfig] = useState<ApiConfig | null>(null);
  const [sanitySettings, setSanitySettings] = useState<SanitySettings | null>(null);
  const [aiSettings, setAiSettings] = useState<AiSettings | null>(null);
  const [ogBrandingSettings, setOgBrandingSettings] = useState<OgBrandingSettings | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<ApiCategory[]>([]);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState(() => getApiBaseUrl());
  const [apiBaseUrlInput, setApiBaseUrlInput] = useState(() => getStoredApiBaseUrlOverride() ?? "");
  const [authStatus, setAuthStatus] = useState<LoginState>("checking");
  const [authSettings, setAuthSettings] = useState<AuthStatus | null>(null);
  const [authConfig, setAuthConfig] = useState<AuthSettings | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [retryingNoteId, setRetryingNoteId] = useState<string | null>(null);
  const [isAiRunning, setIsAiRunning] = useState<null | "metadata" | "draft" | "outline" | "outline_to_post" | "seo_only">(null);
  const [isGeneratingOg, setIsGeneratingOg] = useState(false);
  const [isTestingSanity, setIsTestingSanity] = useState(false);
  const [isSavingSanity, setIsSavingSanity] = useState(false);
  const [isCopyingToken, setIsCopyingToken] = useState<null | "session" | "integration">(null);

  const stats = useMemo(
    () => ({
      draft: notes.filter((note) => note.status === "draft").length,
      scheduled: notes.filter((note) => note.status === "scheduled").length,
      published: notes.filter((note) => note.status === "published").length,
      failed: notes.filter((note) => note.status === "failed").length,
    }),
    [notes]
  );

  const isDirty = useMemo(() => {
    if (!draft || !savedDraft) return false;

    return JSON.stringify({
      title: draft.title,
      slug: draft.slug,
      excerpt: draft.excerpt,
      seoTitle: draft.seoTitle,
      seoDescription: draft.seoDescription,
      seoKeywords: draft.seoKeywords,
      ogTitle: draft.ogTitle,
      ogDescription: draft.ogDescription,
      outlineMd: draft.outlineMd,
      contentMd: draft.contentMd,
      categoryIds: [...draft.categoryIds].sort(),
    }) !==
      JSON.stringify({
        title: savedDraft.title,
        slug: savedDraft.slug,
        excerpt: savedDraft.excerpt,
        seoTitle: savedDraft.seoTitle,
        seoDescription: savedDraft.seoDescription,
        seoKeywords: savedDraft.seoKeywords,
        ogTitle: savedDraft.ogTitle,
        ogDescription: savedDraft.ogDescription,
        outlineMd: savedDraft.outlineMd,
        contentMd: savedDraft.contentMd,
        categoryIds: [...savedDraft.categoryIds].sort(),
      });
  }, [draft, savedDraft]);

  const scheduledNotes = useMemo(
    () => notes.filter((note) => note.status === "scheduled"),
    [notes]
  );
  const failedNotes = useMemo(() => notes.filter((note) => note.status === "failed"), [notes]);
  const publishedNotes = useMemo(
    () => notes.filter((note) => note.status === "published"),
    [notes]
  );
  const route = routeState.route;
  const isEditorRoute = route === "posts" && (routeState.isNewNote || Boolean(routeState.noteId));

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = "#/dashboard";
    }

    const handleHashChange = () => setRouteState(getRouteFromHash(window.location.hash));
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      setAuthEmail("");
      setAuthStatus("unauthenticated");
      setDraft(null);
      setSavedDraft(null);
      setNotes([]);
      setConfig(null);
      setAuthConfig(null);
    }

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  useEffect(() => {
    void bootstrapAuth();
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated") {
      return;
    }

    void loadConfig();
    void loadSanitySettings();
    void loadAiSettings();
    void loadOgBrandingSettings();
    void loadAuthConfig();
    void loadCategories();
    void loadNotes();
  }, [authStatus]);

  useEffect(() => {
    if (authStatus !== "authenticated") {
      return;
    }

    if (!selectedId || !isEditorRoute) {
      setDraft(null);
      setSavedDraft(null);
      setScheduleAt("");
      return;
    }

    void loadNote(selectedId);
  }, [authStatus, isEditorRoute, selectedId]);

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (!draft) return;

      const isSaveShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s";
      if (!isSaveShortcut) return;

      event.preventDefault();
      void saveDraft();
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [
    draft,
    draft?.id,
    draft?.title,
    draft?.slug,
    draft?.excerpt,
    draft?.seoTitle,
    draft?.seoDescription,
    draft?.seoKeywords,
    draft?.ogTitle,
    draft?.ogDescription,
    draft?.outlineMd,
    draft?.contentMd,
    draft?.categoryIds,
  ]);

  function navigate(nextUrl: string) {
    if (window.location.hash === nextUrl) {
      setRouteState(getRouteFromHash(nextUrl));
      return;
    }

    window.location.hash = nextUrl;
  }

  async function bootstrapAuth() {
    try {
      const status = await authApi.status();
      setAuthSettings(status);

      if (!status.configured) {
        setAuthStatus("unauthenticated");
        return;
      }

      const existingToken = getStoredAuthToken();
      if (!existingToken) {
        setAuthStatus("unauthenticated");
        return;
      }

      const session = await authApi.me();
      setAuthEmail(session.user.email);
      setLoginEmail(session.user.email);
      setAuthStatus("authenticated");
    } catch (error) {
      clearStoredAuthToken();
      setAuthStatus("unauthenticated");
      if (!(error instanceof ApiError && error.status === 401)) {
        toast.error(error instanceof Error ? error.message : "Failed to initialize auth");
      }
    }
  }

  async function signIn() {
    if (!loginEmail.trim() || !loginPassword) {
      toast.error("Email dan password wajib diisi");
      return;
    }

    setIsSigningIn(true);

    try {
      const session = await authApi.login({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      setStoredAuthToken(session.token);
      setAuthEmail(session.user.email);
      setLoginPassword("");
      setAuthStatus("authenticated");
      toast.success("Login berhasil");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login gagal");
    } finally {
      setIsSigningIn(false);
    }
  }

  function logout() {
    clearStoredAuthToken();
    setAuthEmail("");
    setDraft(null);
    setSavedDraft(null);
    setSelectedId("");
    setNotes([]);
    setConfig(null);
    setAuthConfig(null);
    setAuthStatus("unauthenticated");
    setLoginPassword("");
    toast.success("Logged out");
  }

  async function copyToken(kind: "session" | "integration", value: string) {
    if (!value) {
      toast.error("Token belum tersedia");
      return;
    }

    setIsCopyingToken(kind);

    try {
      await navigator.clipboard.writeText(value);
      toast.success(kind === "session" ? "Session token copied" : "Integration token copied");
    } catch {
      toast.error("Failed to copy token");
    } finally {
      setIsCopyingToken(null);
    }
  }

  useEffect(() => {
    if (route !== "posts") {
      return;
    }

    if (routeState.isNewNote) {
      return;
    }

    if (routeState.noteId && routeState.noteId !== selectedId) {
      setSelectedId(routeState.noteId);
      return;
    }

    if (!routeState.noteId && selectedId && !isEditorRoute) {
      setSelectedId("");
    }
  }, [isEditorRoute, route, routeState.isNewNote, routeState.noteId, selectedId]);

  async function loadConfig() {
    try {
      const nextConfig = await notesApi.config();
      setConfig(nextConfig);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load worker config");
    }
  }

  async function loadCategories() {
    try {
      const response = await notesApi.categories();
      setCategoryOptions(response.items);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load Sanity categories");
    }
  }

  async function loadAiSettings() {
    try {
      const nextSettings = await notesApi.getAiSettings();
      setAiSettings(nextSettings);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load AI settings");
    }
  }

  async function loadSanitySettings() {
    try {
      const nextSettings = await notesApi.getSanitySettings();
      setSanitySettings(nextSettings);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load Sanity settings");
    }
  }

  async function loadOgBrandingSettings() {
    try {
      const nextSettings = await notesApi.getOgBrandingSettings();
      setOgBrandingSettings(nextSettings);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load OG branding settings");
    }
  }

  async function loadAuthConfig() {
    try {
      const nextSettings = await authApi.settings();
      setAuthConfig(nextSettings);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load auth settings");
    }
  }

  async function loadNotes(nextSelectedId?: string) {
    setIsLoading(true);

    try {
      const response = await notesApi.list();
      setNotes(response.items);

      const targetId = nextSelectedId || selectedId || response.items[0]?.id || "";
      setSelectedId(targetId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load notes");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadNote(id: string) {
    try {
      const note = await notesApi.get(id);
      setDraft(note);
      setSavedDraft(note);
      setScheduleAt(toJakartaScheduleValue(note.publishAt));
      setNotes((current) => current.map((item) => (item.id === note.id ? note : item)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load note");
    }
  }

  function updateDraft(patch: Partial<Note>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function updateTitle(title: string) {
    setDraft((current) => {
      if (!current) return current;

      const canReplaceSlug =
        current.slug.trim().length === 0 ||
        current.slug === slugify(savedDraft?.title ?? "") ||
        current.slug.startsWith("untitled-note-");

      return {
        ...current,
        title,
        slug: canReplaceSlug ? slugify(title) : current.slug,
      };
    });
  }

  function updateScheduleDate(date: string) {
    setScheduleAt((current) => setScheduleDateTime(current, date, undefined));
  }

  function updateScheduleTime(time: string) {
    setScheduleAt((current) => setScheduleDateTime(current, undefined, time));
  }

  function toggleCategory(categoryId: string, checked: boolean) {
    setDraft((current) => {
      if (!current) return current;

      const nextCategoryIds = checked
        ? [...new Set([...current.categoryIds, categoryId])]
        : current.categoryIds.filter((id) => id !== categoryId);

      return {
        ...current,
        categoryIds: nextCategoryIds,
      };
    });
  }

  function getSelectedCategoryLabel() {
    if (!draft || draft.categoryIds.length === 0) {
      return "Pilih kategori";
    }

    if (draft.categoryIds.length === 1) {
      const selectedCategory = categoryOptions.find((category) => category.id === draft.categoryIds[0]);
      return selectedCategory?.title ?? "1 kategori dipilih";
    }

    return `${draft.categoryIds.length} kategori dipilih`;
  }

  async function createNote() {
    try {
      const created = await notesApi.create({
        title: "Untitled note",
        slug: `untitled-note-${Date.now()}`,
        excerpt: "",
        seoTitle: "",
        seoDescription: "",
        seoKeywords: "",
        ogTitle: "",
        ogDescription: "",
        outlineMd: "",
        contentMd: "# Judul baru\n\nTulis draft di sini.",
        categoryIds: [],
        status: "draft",
      });

      toast.success("Note created");
      setSelectedId(created.id);
      navigate(`#/posts/${created.id}`);
      setContentTab("editor");
      await loadNotes(created.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create note");
    }
  }

  async function saveDraft(showToast = true) {
    if (!draft) return;

    if (!draft.title.trim()) {
      toast.error("Title wajib diisi");
      return;
    }

    if (!draft.slug.trim()) {
      toast.error("Slug wajib diisi");
      return;
    }

    setIsSaving(true);

    try {
      const updated = await notesApi.update(draft.id, {
        title: draft.title.trim(),
        slug: draft.slug.trim(),
        excerpt: draft.excerpt.trim(),
        seoTitle: draft.seoTitle.trim(),
        seoDescription: draft.seoDescription.trim(),
        seoKeywords: draft.seoKeywords.trim(),
        ogTitle: draft.ogTitle.trim(),
        ogDescription: draft.ogDescription.trim(),
        outlineMd: draft.outlineMd,
        contentMd: draft.contentMd,
        categoryIds: draft.categoryIds,
      });

      setDraft(updated);
      setSavedDraft(updated);
      setNotes((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setScheduleAt(toJakartaScheduleValue(updated.publishAt));
      if (showToast) {
        toast.success(isDirty ? "Draft saved" : "Draft confirmed");
      }

      return updated;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save draft");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteSelectedNote() {
    if (!draft) return;

    if (!window.confirm(`Hapus note "${draft.title}"?`)) {
      return;
    }

    try {
      await notesApi.remove(draft.id);
      toast.success("Note deleted");
      const remaining = notes.filter((item) => item.id !== draft.id);
      setNotes(remaining);
      setSelectedId(remaining[0]?.id || "");
      setDraft(null);
      setSavedDraft(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete note");
    }
  }

  async function scheduleDraft() {
    if (!draft) return;

    if (!config?.sanityConfigured) {
      toast.error("Schedule belum aktif karena Sanity settings belum diisi");
      return;
    }

    const publishAt = fromJakartaScheduleValue(scheduleAt);
    if (!publishAt) {
      toast.error("Pilih tanggal schedule terlebih dulu");
      return;
    }

    const persistedDraft = await saveDraft(false);
    if (!persistedDraft) {
      return;
    }

    setIsScheduling(true);

    try {
      const updated = await notesApi.schedule(draft.id, publishAt);
      setDraft(updated);
      setSavedDraft(updated);
      setNotes((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setScheduleAt(toJakartaScheduleValue(updated.publishAt));
      navigate("#/scheduled");
      toast.success("Note scheduled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to schedule note");
    } finally {
      setIsScheduling(false);
    }
  }

  async function publishDraft() {
    if (!draft) return;

    if (!config?.sanityConfigured) {
      toast.error("Publish belum aktif karena Sanity settings belum diisi");
      return;
    }

    const persistedDraft = await saveDraft(false);
    if (!persistedDraft) {
      return;
    }

    setIsPublishing(true);

    try {
      const updated = await notesApi.publish(draft.id);
      setDraft(updated);
      setSavedDraft(updated);
      setNotes((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setScheduleAt(toJakartaScheduleValue(updated.publishAt));
      navigate("#/sanity-sync");
      toast.success("Published to Sanity");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to publish note");
    } finally {
      setIsPublishing(false);
    }
  }

  async function retryPublishDraft() {
    if (!draft) return;

    if (!config?.sanityConfigured) {
      toast.error("Publish belum aktif karena Sanity settings belum diisi");
      return;
    }

    const persistedDraft = await saveDraft(false);
    if (!persistedDraft) {
      return;
    }

    setIsPublishing(true);

    try {
      const updated = await notesApi.retryPublish(draft.id);
      setDraft(updated);
      setSavedDraft(updated);
      setNotes((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setScheduleAt(toJakartaScheduleValue(updated.publishAt));
      navigate("#/sanity-sync");
      toast.success("Retry publish berhasil");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to retry publish");
    } finally {
      setIsPublishing(false);
    }
  }

  async function retryPublishNote(noteId: string) {
    if (!config?.sanityConfigured) {
      toast.error("Publish belum aktif karena Sanity settings belum diisi");
      return;
    }

    if (draft?.id === noteId && isDirty) {
      const persistedDraft = await saveDraft(false);
      if (!persistedDraft) {
        return;
      }
    }

    setRetryingNoteId(noteId);

    try {
      const updated = await notesApi.retryPublish(noteId);
      setNotes((current) => current.map((item) => (item.id === updated.id ? updated : item)));

      if (draft?.id === updated.id) {
        setDraft(updated);
        setSavedDraft(updated);
        setScheduleAt(toJakartaScheduleValue(updated.publishAt));
      }

      toast.success(`Retry publish berhasil untuk ${updated.title}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to retry publish");
    } finally {
      setRetryingNoteId(null);
    }
  }

  async function runAiAssist(mode: "metadata" | "draft" | "outline" | "outline_to_post" | "seo_only") {
    if (!draft) return;
    if (!config?.aiConfigured) {
      toast.error("AI belum aktif karena settings AI belum diisi");
      return;
    }

    setIsAiRunning(mode);

    try {
      const response = await notesApi.aiAssist({
        mode,
        note: {
          title: draft.title,
          slug: draft.slug,
          excerpt: draft.excerpt,
          seoTitle: draft.seoTitle,
          seoDescription: draft.seoDescription,
          seoKeywords: draft.seoKeywords,
          ogTitle: draft.ogTitle,
          ogDescription: draft.ogDescription,
          outlineMd: draft.outlineMd,
          contentMd: draft.contentMd,
        },
      });

      setDraft((current) => {
        if (!current) return current;

        const nextTitle = response.suggestion.title?.trim() || current.title;
        const nextSlug = response.suggestion.slug?.trim() || current.slug;

        return {
          ...current,
          title: nextTitle,
          slug: nextSlug,
          excerpt: response.suggestion.excerpt?.trim() ?? current.excerpt,
          seoTitle: response.suggestion.seoTitle?.trim() ?? current.seoTitle,
          seoDescription: response.suggestion.seoDescription?.trim() ?? current.seoDescription,
          seoKeywords: response.suggestion.seoKeywords?.trim() ?? current.seoKeywords,
          ogTitle: response.suggestion.ogTitle?.trim() ?? current.ogTitle,
          ogDescription: response.suggestion.ogDescription?.trim() ?? current.ogDescription,
          outlineMd: response.suggestion.outlineMd ?? current.outlineMd,
          contentMd: response.suggestion.contentMd ?? current.contentMd,
        };
      });

      toast.success(`AI suggestion applied (${response.model})`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI assist failed");
    } finally {
      setIsAiRunning(null);
    }
  }

  async function generateOgImage() {
    if (!draft) return;
    if (!config?.sanityConfigured) {
      toast.error("Sanity belum dikonfigurasi, tidak bisa generate OG image");
      return;
    }

    const persistedDraft = await saveDraft(false);
    if (!persistedDraft) return;

    setIsGeneratingOg(true);

    try {
      const updated = await notesApi.generateOg(draft.id);
      setDraft(updated);
      setSavedDraft(updated);
      setNotes((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      toast.success("OG image generated and uploaded to Sanity");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "OG image generation failed");
    } finally {
      setIsGeneratingOg(false);
    }
  }

  function saveApiBaseOverride() {
    setStoredApiBaseUrlOverride(apiBaseUrlInput);
    const nextApiBaseUrl = getApiBaseUrl();
    setApiBaseUrl(nextApiBaseUrl);
    toast.success(`API base updated to ${nextApiBaseUrl}`);
    void loadConfig();
    void loadSanitySettings();
    void loadAiSettings();
    void loadOgBrandingSettings();
    void loadAuthConfig();
    void loadCategories();
    void loadNotes(selectedId || undefined);
  }

  function resetApiBaseOverride() {
    clearStoredApiBaseUrlOverride();
    setApiBaseUrlInput("");
    const nextApiBaseUrl = getApiBaseUrl();
    setApiBaseUrl(nextApiBaseUrl);
    toast.success("API base reset to default");
    void loadConfig();
    void loadSanitySettings();
    void loadAiSettings();
    void loadOgBrandingSettings();
    void loadAuthConfig();
    void loadCategories();
    void loadNotes(selectedId || undefined);
  }

  async function testSanitySettings() {
    if (!sanitySettings) return;

    setIsTestingSanity(true);
    try {
      const result = await notesApi.testSanitySettings(sanitySettings);
      toast.success(`Sanity connected. ${result.categoryCount} categories found.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sanity test failed");
    } finally {
      setIsTestingSanity(false);
    }
  }

  async function saveSanitySettings() {
    if (!sanitySettings) return;

    setIsSavingSanity(true);
    try {
      const saved = await notesApi.saveSanitySettings(sanitySettings);
      setSanitySettings(saved);
      toast.success("Sanity settings saved");
      void loadConfig();
      void loadCategories();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save Sanity settings");
    } finally {
      setIsSavingSanity(false);
    }
  }

  async function saveAiSettings() {
    if (!aiSettings) return;

    try {
      const saved = await notesApi.saveAiSettings(aiSettings);
      setAiSettings(saved);
      toast.success("AI settings saved");
      void loadConfig();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save AI settings");
    }
  }

  async function saveOgBrandingSettings() {
    if (!ogBrandingSettings) return;

    try {
      const saved = await notesApi.saveOgBrandingSettings(ogBrandingSettings);
      setOgBrandingSettings(saved);
      toast.success("OG branding settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save OG branding settings");
    }
  }

  function openNote(id: string) {
    setSelectedId(id);
    navigate(`#/posts/${id}`);
  }

  function renderStats() {
    return (
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Draft"
          value={stats.draft}
          description="Konten yang masih diedit"
          icon={<FileTextIcon />}
        />
        <StatCard
          title="Scheduled"
          value={stats.scheduled}
          description="Menunggu cron publish"
          icon={<CalendarClockIcon />}
        />
        <StatCard
          title="Published"
          value={stats.published}
          description="Sudah dikirim ke Sanity"
          icon={<SendIcon />}
        />
        <StatCard
          title="Failed"
          value={stats.failed}
          description="Butuh perbaikan atau retry"
          icon={<CircleAlertIcon />}
        />
      </section>
    );
  }

  function renderLoginScreen() {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2">
            <CardTitle>Login CMS</CardTitle>
            <CardDescription>
              Masuk untuk mengakses worker dan dashboard CMS. API publish tidak lagi dibuka ke publik.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="login-email">
                Email
              </label>
              <Input
                id="login-email"
                type="email"
                autoComplete="username"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="admin@example.com"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="login-password">
                Password
              </label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void signIn();
                  }
                }}
                placeholder="Masukkan password admin"
              />
            </div>
            <Button onClick={() => void signIn()} disabled={isSigningIn || authSettings?.configured === false}>
              {isSigningIn ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : null}
              {isSigningIn ? "Signing in..." : "Sign in"}
            </Button>
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              <div className="grid gap-2">
                <span>API base: <code>{apiBaseUrl}</code></span>
                <span>Auth configured: {authSettings?.configured ? "yes" : "no"}</span>
                {authSettings?.configured === false ? (
                  <span>Set `AUTH_ADMIN_EMAIL`, `AUTH_ADMIN_PASSWORD`, dan `AUTH_TOKEN_SECRET` di Worker secrets dulu.</span>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  function renderNotesTable(
    items: Note[],
    emptyLabel: string,
    options?: {
      showRetryAction?: boolean;
    }
  ) {
    const showRetryAction = options?.showRetryAction ?? false;

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Updated</TableHead>
            {showRetryAction ? <TableHead className="text-right">Action</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={showRetryAction ? 4 : 3} className="text-center text-muted-foreground">
                Loading notes...
              </TableCell>
            </TableRow>
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showRetryAction ? 4 : 3} className="text-center text-muted-foreground">
                {emptyLabel}
              </TableCell>
            </TableRow>
          ) : (
            items.map((note) => {
              const isActive = note.id === selectedId;

              return (
                <TableRow
                  key={note.id}
                  className={isActive ? "bg-muted/60" : undefined}
                  onClick={() => openNote(note.id)}
                >
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-foreground">{note.title}</span>
                      <span className="truncate text-xs text-muted-foreground">/{note.slug}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{note.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatRelativeDate(note.updatedAt)}
                  </TableCell>
                  {showRetryAction ? (
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation();
                          void retryPublishNote(note.id);
                        }}
                        disabled={retryingNoteId === note.id}
                      >
                        {retryingNoteId === note.id ? (
                          <Loader2Icon data-icon="inline-start" className="animate-spin" />
                        ) : null}
                        Retry
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    );
  }

  function renderPostsList() {
    return (
      <section className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            <CardDescription>Daftar draft markdown yang tersimpan di D1.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex gap-2">
              <Button className="w-full md:w-auto" onClick={createNote}>
                Note Baru
              </Button>
            </div>
            {renderNotesTable(notes, "Belum ada note.")}
          </CardContent>
        </Card>
      </section>
    );
  }

  function renderEditorPage() {
    if (!draft) {
      return (
        <section className="grid gap-6">
          <Card>
            <CardContent>
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
                Belum ada note yang dipilih.
              </div>
            </CardContent>
          </Card>
        </section>
      );
    }

    return (
      <section className="grid gap-6">
        <PostEditorPage
          draft={draft}
          config={config}
          scheduleAt={scheduleAt}
          getScheduleDate={getScheduleDate}
          getScheduleTime={getScheduleTime}
          updateScheduleDate={updateScheduleDate}
          updateScheduleTime={updateScheduleTime}
          runAiAssist={runAiAssist}
          generateOgImage={generateOgImage}
          saveDraft={saveDraft}
          scheduleDraft={scheduleDraft}
          publishDraft={publishDraft}
          retryPublishDraft={retryPublishDraft}
          updateTitle={updateTitle}
          updateDraft={updateDraft}
          formatRelativeDate={formatRelativeDate}
          categoryOptions={categoryOptions}
          isCategoryDialogOpen={isCategoryDialogOpen}
          setIsCategoryDialogOpen={setIsCategoryDialogOpen}
          getSelectedCategoryLabel={getSelectedCategoryLabel}
          toggleCategory={toggleCategory}
          navigateBack={() => navigate("#/posts")}
          deleteSelectedNote={deleteSelectedNote}
          isAiRunning={isAiRunning}
          isGeneratingOg={isGeneratingOg}
          isSaving={isSaving}
          isScheduling={isScheduling}
          isPublishing={isPublishing}
          editorSectionTab={editorSectionTab}
          setEditorSectionTab={setEditorSectionTab}
          contentTab={contentTab}
          setContentTab={setContentTab}
        />

        <Card>
          <CardFooter className="justify-between gap-3">
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              <span>
                Draft utama disimpan di D1
                {isDirty ? " • ada perubahan belum disimpan" : " • semua perubahan tersimpan"}.
              </span>
              <span>Publish akan membuat atau update dokumen `post` di Sanity.</span>
              <span>Shortcut save: Ctrl/Cmd + S.</span>
            </div>
          </CardFooter>
        </Card>
      </section>
    );
  }

  function renderDashboard() {
    return (
      <>
        {renderStats()}
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card>
            <CardHeader>
              <CardTitle>Recent Notes</CardTitle>
              <CardDescription>Masuk ke editor saat memilih salah satu note.</CardDescription>
            </CardHeader>
            <CardContent>{renderNotesTable(notes.slice(0, 8), "Belum ada note.")}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Publish Health</CardTitle>
              <CardDescription>Status operasional worker saat ini.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Worker config</span>
                <Badge variant="outline">{config ? "Loaded" : "Pending"}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Sanity status</span>
                <Badge variant="outline">
                  {config?.sanityConfigured ? "Ready" : "Not configured"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Scheduled queue</span>
                <Badge variant="outline">{scheduledNotes.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Failed publish</span>
                <Badge variant="outline">{failedNotes.length}</Badge>
              </div>
            </CardContent>
          </Card>
        </section>
      </>
    );
  }

  function renderScheduledView() {
    return (
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Scheduled Queue</CardTitle>
            <CardDescription>Daftar note yang akan dipublish oleh cron worker.</CardDescription>
          </CardHeader>
          <CardContent>
            {renderNotesTable(scheduledNotes, "Belum ada note yang dijadwalkan.")}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cron Runtime</CardTitle>
            <CardDescription>Trigger worker production berjalan tiap 15 menit.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <span>Schedule aktif: `{config?.cron ?? "*/15 * * * *"}`</span>
            <span>Gunakan halaman Posts untuk memilih note dan mengatur waktu publish.</span>
            <span>Jika note gagal publish, statusnya akan pindah ke `failed`.</span>
          </CardContent>
        </Card>
      </section>
    );
  }

  function renderSanitySyncView() {
    return (
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Published & Failed</CardTitle>
            <CardDescription>Ringkasan hasil sync ke Sanity.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-medium">Published</h3>
              {renderNotesTable(publishedNotes, "Belum ada note yang berhasil dipublish.")}
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-medium">Failed</h3>
              {renderNotesTable(failedNotes, "Belum ada note yang gagal publish.", {
                showRetryAction: true,
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sanity Integration</CardTitle>
            <CardDescription>Kesiapan env dan outcome publish.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Config</span>
              <Badge variant="outline">
                {config?.sanityConfigured ? "Ready" : "Not configured"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Published notes</span>
              <Badge variant="outline">{publishedNotes.length}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Failed notes</span>
              <Badge variant="outline">{failedNotes.length}</Badge>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  function renderSettingsView() {
    return (
      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Frontend</CardTitle>
            <CardDescription>Konfigurasi app web dan API endpoint yang sedang dipakai user.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="api-base-url">
                API base override
              </label>
              <Input
                id="api-base-url"
                placeholder="https://your-worker.your-subdomain.workers.dev"
                value={apiBaseUrlInput}
                onChange={(event) => setApiBaseUrlInput(event.target.value)}
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={saveApiBaseOverride}>
                  Save override
                </Button>
                <Button variant="outline" onClick={resetApiBaseOverride}>
                  Reset default
                </Button>
              </div>
            </div>
            <span>
              API base: <code>{apiBaseUrl}</code>
            </span>
            <span>
              Default API base: <code>{getDefaultApiBaseUrl()}</code>
            </span>
            <span>Routing sekarang dipisah per hash route agar aman di Cloudflare Pages.</span>
            <span>Halaman editor utama ada di route `#/posts`.</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sanity Settings</CardTitle>
            <CardDescription>Form ini hanya kirim payload ke backend. Test connection tidak menyimpan token di frontend.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            {sanitySettings ? (
              <>
                <Input
                  placeholder="Sanity project ID"
                  value={sanitySettings.projectId}
                  onChange={(event) =>
                    setSanitySettings((current) => (current ? { ...current, projectId: event.target.value } : current))
                  }
                />
                <Input
                  placeholder="development"
                  value={sanitySettings.dataset}
                  onChange={(event) =>
                    setSanitySettings((current) => (current ? { ...current, dataset: event.target.value } : current))
                  }
                />
                <Input
                  placeholder="2026-03-29"
                  value={sanitySettings.apiVersion}
                  onChange={(event) =>
                    setSanitySettings((current) => (current ? { ...current, apiVersion: event.target.value } : current))
                  }
                />
                <Input
                  placeholder={sanitySettings.hasWriteToken ? "********" : "Sanity write token"}
                  value={sanitySettings.writeToken}
                  onChange={(event) =>
                    setSanitySettings((current) => (current ? { ...current, writeToken: event.target.value } : current))
                  }
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => void testSanitySettings()} disabled={isTestingSanity}>
                    {isTestingSanity ? "Testing..." : "Test connection"}
                  </Button>
                  <Button onClick={() => void saveSanitySettings()} disabled={isSavingSanity}>
                    {isSavingSanity ? "Saving..." : "Save Sanity settings"}
                  </Button>
                </div>
                <span>Sanity status: {config?.sanityConfigured ? "ready" : "not configured"}</span>
              </>
            ) : (
              <span>Loading Sanity settings...</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Auth & API Token</CardTitle>
            <CardDescription>
              Gunakan integration token untuk AI atau app lain. Semua endpoint API menerima token ini melalui header `Authorization`.
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

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="session-token">
                Current session token
              </label>
              <Textarea
                id="session-token"
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

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="integration-token">
                Static integration token
              </label>
              <Textarea
                id="integration-token"
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
              <span>
                Header contoh: <code>Authorization: Bearer {authConfig?.integrationToken || "<your-token>"}</code>
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Settings</CardTitle>
            <CardDescription>Semua AI setting disimpan di aplikasi, bukan env Worker.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            {aiSettings ? (
              <>
                <Input
                  placeholder="https://api.openai.com/v1"
                  value={aiSettings.apiBaseUrl}
                  onChange={(event) =>
                    setAiSettings((current) => (current ? { ...current, apiBaseUrl: event.target.value } : current))
                  }
                />
                <Input
                  placeholder={aiSettings.hasApiKey ? "********" : "API key"}
                  value={aiSettings.apiKey}
                  onChange={(event) =>
                    setAiSettings((current) => (current ? { ...current, apiKey: event.target.value } : current))
                  }
                />
                <Input
                  placeholder="gpt-4.1-mini"
                  value={aiSettings.model}
                  onChange={(event) =>
                    setAiSettings((current) => (current ? { ...current, model: event.target.value } : current))
                  }
                />
                <Textarea
                  placeholder="Global system prompt"
                  value={aiSettings.systemPrompt}
                  onChange={(event) =>
                    setAiSettings((current) => (current ? { ...current, systemPrompt: event.target.value } : current))
                  }
                />
                <Textarea
                  placeholder="Prompt untuk AI metadata"
                  value={aiSettings.metadataPrompt}
                  onChange={(event) =>
                    setAiSettings((current) => (current ? { ...current, metadataPrompt: event.target.value } : current))
                  }
                />
                <Textarea
                  placeholder="Prompt untuk AI draft"
                  value={aiSettings.draftPrompt}
                  onChange={(event) =>
                    setAiSettings((current) => (current ? { ...current, draftPrompt: event.target.value } : current))
                  }
                />
                <Textarea
                  placeholder="Prompt untuk generate outline"
                  value={aiSettings.outlinePrompt}
                  onChange={(event) =>
                    setAiSettings((current) => (current ? { ...current, outlinePrompt: event.target.value } : current))
                  }
                />
                <Textarea
                  placeholder="Prompt untuk ubah outline jadi post lengkap metadata + SEO"
                  value={aiSettings.outlineToPostPrompt}
                  onChange={(event) =>
                    setAiSettings((current) =>
                      current ? { ...current, outlineToPostPrompt: event.target.value } : current
                    )
                  }
                />
                <Button onClick={() => void saveAiSettings()}>Save AI settings</Button>
                <span>AI status: {config?.aiConfigured ? `ready (${config.aiModel})` : "not configured"}</span>
              </>
            ) : (
              <span>Loading AI settings...</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>OG Branding</CardTitle>
            <CardDescription>Atur logo dan teks OG agar bisa dipakai untuk profile atau business berbeda.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            {ogBrandingSettings ? (
              <>
                <Input
                  placeholder="https://example.com/logo.png"
                  value={ogBrandingSettings.logoUrl}
                  onChange={(event) =>
                    setOgBrandingSettings((current) =>
                      current ? { ...current, logoUrl: event.target.value } : current
                    )
                  }
                />
                <Input
                  placeholder="AI WORKFLOW"
                  value={ogBrandingSettings.workflowLabel}
                  onChange={(event) =>
                    setOgBrandingSettings((current) =>
                      current ? { ...current, workflowLabel: event.target.value } : current
                    )
                  }
                />
                <Input
                  placeholder="WA 085799520350 · kotacom.id"
                  value={ogBrandingSettings.footerText}
                  onChange={(event) =>
                    setOgBrandingSettings((current) =>
                      current ? { ...current, footerText: event.target.value } : current
                    )
                  }
                />
                <Button onClick={() => void saveOgBrandingSettings()}>Save OG branding</Button>
                <span>Kosongkan field untuk kembali pakai default bawaan worker.</span>
              </>
            ) : (
              <span>Loading OG branding settings...</span>
            )}
          </CardContent>
        </Card>
      </section>
    );
  }

  function renderApiStatusView() {
    return (
      <section className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Worker</CardTitle>
            <CardDescription>Health status API production.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <span>Status: online</span>
            <span>D1 binding: {config?.d1Binding ?? "DB"}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>Cron dan antrean publish.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <span>Cron: {config?.cron ?? "*/15 * * * *"}</span>
            <span>Queued notes: {scheduledNotes.length}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sanity</CardTitle>
            <CardDescription>Readiness env publish.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <span>Configured: {config?.sanityConfigured ? "yes" : "no"}</span>
            <span>Published: {publishedNotes.length}</span>
          </CardContent>
        </Card>
      </section>
    );
  }

  function renderRoute() {
    switch (route) {
      case "dashboard":
        return renderDashboard();
      case "posts":
        return isEditorRoute ? renderEditorPage() : renderPostsList();
      case "scheduled":
        return renderScheduledView();
      case "sanity-sync":
        return renderSanitySyncView();
      case "ai-batch":
        return (
          <Suspense
            fallback={
              <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-border bg-card/60 text-sm text-muted-foreground">
                Loading AI batch...
              </div>
            }
          >
            <AiBatchPage config={config} />
          </Suspense>
        );
      case "settings":
        return renderSettingsView();
      case "api-status":
        return renderApiStatusView();
      default:
        return renderDashboard();
    }
  }

  const header = routeMeta[route];

  if (authStatus === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-3">
          <Loader2Icon className="size-4 animate-spin" />
          Checking session...
        </div>
      </main>
    );
  }

  if (authStatus !== "authenticated") {
    return renderLoginScreen();
  }

  return (
    <SidebarProvider>
      <AppSidebar
        currentUrl={`#/${route}`}
        onNavigate={navigate}
        onCreate={() => void createNote()}
        userEmail={authEmail}
        onLogout={logout}
      />
      <SidebarInset>
        <SiteHeader title={header.title} description={header.description} />
        <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6">{renderRoute()}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default App;
