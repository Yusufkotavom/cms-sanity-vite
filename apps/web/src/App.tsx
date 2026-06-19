import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  ApiError,
  authApi,
  clearStoredActiveWorkspaceSlug,
  clearStoredAuthToken,
  clearStoredApiBaseUrlOverride,
  getApiBaseUrl,
  getDefaultApiBaseUrl,
  getStoredActiveWorkspaceSlug,
  getStoredAuthToken,
  getStoredApiBaseUrlOverride,
  notesApi,
  pagesApi,
  setStoredActiveWorkspaceSlug,
  setStoredAuthToken,
  setStoredApiBaseUrlOverride,
  type AiSettings,
  type AiAssistJob,
  type AiConnectionTestResult,
  type AiPromptTemplate,
  type ApiCategory,
  type ApiConfig,
  type ApiNote,
  type AuthSettings,
  type AuthStatus,
  type OgBrandingSettings,
  type   SanityPageSummary,
  type   SanityPostSummary,
  type   SanityProductSummary,
  type   SanityServiceSummary,
  type   SanityProjectSummary,
  type SanitySettings,
  type Workspace,
  type WorkspacePayload,
  workspacesApi,
  productsApi,
  servicesApi,
  projectsApi,
} from "@/lib/api";
import {
  ApiStatusView,
  DashboardView,
  EditorStatusCard,
  LoginScreen,
  PostsView,
  SanitySyncView,
  ScheduledView,
} from "./app/app-route-views";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const AiBatchPage = lazy(async () => {
  const module = await import("./ai-batch-page");
  return { default: module.AiBatchPage };
});

const KnowledgeBasePage = lazy(async () => {
  const module = await import("./knowledge-base-page");
  return { default: module.KnowledgeBasePage };
});

const PostEditorPage = lazy(async () => {
  const module = await import("./post-editor-page");
  return { default: module.PostEditorPage };
});

const SettingsPage = lazy(async () => {
  const module = await import("./settings-page");
  return { default: module.SettingsPage };
});

const WorkerLogsPage = lazy(async () => {
  const module = await import("./worker-logs-page");
  return { default: module.WorkerLogsPage };
});

const CreateNotePage = lazy(async () => {
  const module = await import("./create-note-page");
  return { default: module.CreateNotePage };
});

type Note = ApiNote;
type LoginState = "checking" | "authenticated" | "unauthenticated";
type AppRoute =
  | "dashboard"
  | "posts"
  | "scheduled"
  | "sanity-sync"
  | "ai-batch"
  | "knowledge-base"
  | "worker-logs"
  | "settings"
  | "api-status"
  | "create";

type RouteState = {
  workspaceSlug: string | null;
  route: AppRoute;
  noteId: string | null;
  isNewNote: boolean;
};

type WorkspaceFormState = {
  id: string | null;
  name: string;
  slug: string;
  domain: string;
  description: string;
  timezone: string;
  status: "active" | "archived";
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
  "knowledge-base": {
    title: "Knowledge Base",
    description: "Kelola entri knowledge base untuk konteks AI generation.",
  },
  "worker-logs": {
    title: "Worker Logs",
    description: "Pantau semua proses AI assist, AI batch, dan publish worker.",
  },
  settings: {
    title: "Settings",
    description: "Konfigurasi frontend dan panduan environment worker.",
  },
  "api-status": {
    title: "API Status",
    description: "Periksa koneksi worker, D1, dan readiness publish.",
  },
  create: {
    title: "Create",
    description: "Buat note baru dengan tipe dokumen yang sesuai.",
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

function createEmptyWorkspaceForm(): WorkspaceFormState {
  return {
    id: null,
    name: "",
    slug: "",
    domain: "",
    description: "",
    timezone: "Asia/Jakarta",
    status: "active",
  };
}

function createEmptyWorkspaceSanitySettings(): SanitySettings {
  return {
    projectId: "",
    dataset: "development",
    apiVersion: "2026-03-29",
    writeToken: "",
    hasWriteToken: false,
    studioUrl: "",
  };
}

function getSanityTestFingerprint(settings: SanitySettings) {
  return JSON.stringify({
    projectId: settings.projectId.trim(),
    dataset: settings.dataset.trim(),
    apiVersion: settings.apiVersion.trim(),
    writeToken: settings.writeToken.trim(),
  });
}

function getRouteFromHash(hash: string): RouteState {
  const normalized = hash.replace(/^#\/?/, "").trim();
  const segments = normalized.split("/").filter(Boolean);
  const hasWorkspacePrefix = segments[0] === "w" && Boolean(segments[1]);
  const workspaceSlug = hasWorkspacePrefix ? (segments[1] ?? null) : null;
  const routeOffset = hasWorkspacePrefix ? 2 : 0;
  const allowedRoutes: AppRoute[] = [
    "dashboard",
    "posts",
    "scheduled",
    "sanity-sync",
    "ai-batch",
    "knowledge-base",
    "worker-logs",
    "settings",
    "api-status",
    "create",
  ];

  const route = allowedRoutes.includes((segments[routeOffset] ?? "") as AppRoute)
    ? ((segments[routeOffset] ?? "dashboard") as AppRoute)
    : "dashboard";

  if (route !== "posts") {
    return {
      workspaceSlug,
      route,
      noteId: null,
      isNewNote: false,
    };
  }

  if (segments[routeOffset + 1] === "new") {
    return {
      workspaceSlug,
      route,
      noteId: null,
      isNewNote: true,
    };
  }

  return {
    workspaceSlug,
    route,
    noteId: segments[routeOffset + 1] ?? null,
    isNewNote: false,
  };
}

function buildWorkspaceHash(workspaceSlug: string, route: AppRoute, noteId?: string | null, isNewNote = false) {
  const base = `#/w/${workspaceSlug}/${route}`;
  if (route !== "posts") {
    return base;
  }

  if (isNewNote) {
    return `${base}/new`;
  }

  if (noteId) {
    return `${base}/${noteId}`;
  }

  return base;
}

function RouteFallback({ label }: { label: string }) {
  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-border bg-card/60 text-sm text-muted-foreground">
      {label}
    </div>
  );
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

function App() {
  const [routeState, setRouteState] = useState<RouteState>(() => getRouteFromHash(window.location.hash));
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [draft, setDraft] = useState<Note | null>(null);
  const [savedDraft, setSavedDraft] = useState<Note | null>(null);
  const [sanityPosts, setSanityPosts] = useState<SanityPostSummary[]>([]);
  const [sanityPages, setSanityPages] = useState<SanityPageSummary[]>([]);
  const [sanityProducts, setSanityProducts] = useState<SanityProductSummary[]>([]);
  const [sanityServices, setSanityServices] = useState<SanityServiceSummary[]>([]);
  const [sanityProjects, setSanityProjects] = useState<SanityProjectSummary[]>([]);
  const [postsSourceTab, setPostsSourceTab] = useState<"local" | "sanity" | "pages" | "products" | "services" | "projects">("local");
  const [scheduleAt, setScheduleAt] = useState("");
  const [editorSectionTab, setEditorSectionTab] = useState<"overview" | "seo-og" | "outline" | "content" | "sanity">("overview");
  const [contentTab, setContentTab] = useState<"editor" | "preview">("editor");
  const [config, setConfig] = useState<ApiConfig | null>(null);
  const [aiSettings, setAiSettings] = useState<AiSettings | null>(null);
  const [aiConnectionTestResult, setAiConnectionTestResult] = useState<AiConnectionTestResult | null>(null);
  const [aiTemplates, setAiTemplates] = useState<AiPromptTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("__default__");
  const [ogBrandingSettings, setOgBrandingSettings] = useState<OgBrandingSettings | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<ApiCategory[]>([]);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState(() => getApiBaseUrl());
  const [apiBaseUrlInput, setApiBaseUrlInput] = useState(() => getStoredApiBaseUrlOverride() ?? "");
  const [authStatus, setAuthStatus] = useState<LoginState>("checking");
  const [authSettings, setAuthSettings] = useState<AuthStatus | null>(null);
  const [authConfig, setAuthConfig] = useState<AuthSettings | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceSlug, setActiveWorkspaceSlug] = useState(() => getStoredActiveWorkspaceSlug() ?? "");
  const [workspaceEditorSlug, setWorkspaceEditorSlug] = useState("");
  const [workspaceForm, setWorkspaceForm] = useState<WorkspaceFormState>(() => createEmptyWorkspaceForm());
  const [workspaceSanitySettings, setWorkspaceSanitySettings] = useState<SanitySettings>(() =>
    createEmptyWorkspaceSanitySettings()
  );
  const [workspaceSanityTestFingerprint, setWorkspaceSanityTestFingerprint] = useState("");
  const [isTestingWorkspaceSanity, setIsTestingWorkspaceSanity] = useState(false);
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);
  const [isDeletingWorkspace, setIsDeletingWorkspace] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSanityPosts, setIsLoadingSanityPosts] = useState(false);
  const [isLoadingSanityPages, setIsLoadingSanityPages] = useState(false);
  const [isLoadingSanityProducts, setIsLoadingSanityProducts] = useState(false);
  const [isLoadingSanityServices, setIsLoadingSanityServices] = useState(false);
  const [isLoadingSanityProjects, setIsLoadingSanityProjects] = useState(false);
  const [openingSanityDocumentId, setOpeningSanityDocumentId] = useState<string | null>(null);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [retryingNoteId, setRetryingNoteId] = useState<string | null>(null);
  const [isAiRunning, setIsAiRunning] = useState<null | "metadata" | "draft" | "outline" | "outline_to_post" | "seo_only" | "all_in_one">(null);
  const [activeAiAssistJob, setActiveAiAssistJob] = useState<AiAssistJob | null>(null);
  const [isGeneratingOg, setIsGeneratingOg] = useState(false);
  const [isRefreshingFromSanity, setIsRefreshingFromSanity] = useState(false);
  const [isDeletingSanityPost, setIsDeletingSanityPost] = useState(false);
  const [isAiRewritePreviewRunning, setIsAiRewritePreviewRunning] = useState(false);
  const [isTestingAiSettings, setIsTestingAiSettings] = useState(false);
  const [isCopyingToken, setIsCopyingToken] = useState<null | "session" | "integration">(null);
  const lastErrorToastRef = useRef<{ message: string; at: number } | null>(null);

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

  const workspaceSanityFingerprint = useMemo(
    () => getSanityTestFingerprint(workspaceSanitySettings),
    [workspaceSanitySettings]
  );
  const isWorkspaceSanityComplete = useMemo(
    () =>
      Boolean(
        workspaceSanitySettings.projectId.trim() &&
          workspaceSanitySettings.dataset.trim() &&
          workspaceSanitySettings.apiVersion.trim() &&
          workspaceSanitySettings.writeToken.trim()
      ),
    [workspaceSanitySettings]
  );
  const isWorkspaceFormComplete = useMemo(
    () => Boolean(workspaceForm.name.trim() && workspaceForm.slug.trim() && workspaceForm.timezone.trim()),
    [workspaceForm]
  );
  const hasWorkspaceSanityTestPassed = workspaceSanityTestFingerprint === workspaceSanityFingerprint;
  const currentWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.slug === activeWorkspaceSlug) ?? null,
    [activeWorkspaceSlug, workspaces]
  );

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
      window.location.hash = activeWorkspaceSlug
        ? buildWorkspaceHash(activeWorkspaceSlug, "dashboard")
        : "#/dashboard";
    }

    const handleHashChange = () => setRouteState(getRouteFromHash(window.location.hash));
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [activeWorkspaceSlug]);

  useEffect(() => {
    if (!activeWorkspaceSlug || authStatus !== "authenticated") {
      return;
    }

    if (!routeState.workspaceSlug) {
      navigate(buildWorkspaceHash(activeWorkspaceSlug, routeState.route, routeState.noteId, routeState.isNewNote));
      return;
    }
  }, [activeWorkspaceSlug, authStatus, routeState.isNewNote, routeState.noteId, routeState.route, routeState.workspaceSlug]);

  useEffect(() => {
    if (!routeState.workspaceSlug || routeState.workspaceSlug === activeWorkspaceSlug) {
      return;
    }

    setActiveWorkspaceSlug(routeState.workspaceSlug);
    setStoredActiveWorkspaceSlug(routeState.workspaceSlug);
  }, [activeWorkspaceSlug, routeState.workspaceSlug]);

  useEffect(() => {
    function handleUnauthorized() {
      setAuthEmail("");
      setAuthStatus("unauthenticated");
      setWorkspaces([]);
      setActiveWorkspaceSlug("");
      setWorkspaceEditorSlug("");
      setWorkspaceForm(createEmptyWorkspaceForm());
      setWorkspaceSanitySettings(createEmptyWorkspaceSanitySettings());
      setWorkspaceSanityTestFingerprint("");
      setDraft(null);
      setSavedDraft(null);
      setNotes([]);
      setConfig(null);
      setAuthConfig(null);
      clearStoredActiveWorkspaceSlug();
    }

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  useEffect(() => {
    void bootstrapAuth();
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated" || !activeWorkspaceSlug) {
      return;
    }

    void loadWorkspaceData();
  }, [activeWorkspaceSlug, authStatus]);

  useEffect(() => {
    if (authStatus !== "authenticated" || !activeWorkspaceSlug) {
      return;
    }

    if (route !== "settings") {
      return;
    }

    void loadAiSettings();
    void loadOgBrandingSettings();
    void loadAuthConfig();
  }, [activeWorkspaceSlug, authStatus, route]);

  useEffect(() => {
    if (authStatus !== "authenticated" || !activeWorkspaceSlug) {
      return;
    }

    if (route !== "posts") {
      return;
    }

    if (postsSourceTab === "sanity") {
      void loadSanityPosts();
    } else if (postsSourceTab === "pages") {
      void loadSanityPages();
    } else if (postsSourceTab === "products") {
      void loadSanityProducts();
    } else if (postsSourceTab === "services") {
      void loadSanityServices();
    } else if (postsSourceTab === "projects") {
      void loadSanityProjects();
    }
  }, [activeWorkspaceSlug, authStatus, postsSourceTab, route]);

  useEffect(() => {
    if (workspaces.length === 0) {
      return;
    }

    const existingEditorWorkspace = workspaces.find((workspace) => workspace.slug === workspaceEditorSlug);
    if (existingEditorWorkspace) {
      return;
    }

    const fallbackWorkspace =
      workspaces.find((workspace) => workspace.slug === activeWorkspaceSlug) ?? workspaces[0];

    if (!fallbackWorkspace) {
      return;
    }

    setWorkspaceEditorSlug(fallbackWorkspace.slug);
    setWorkspaceForm({
      id: fallbackWorkspace.id,
      name: fallbackWorkspace.name,
      slug: fallbackWorkspace.slug,
      domain: fallbackWorkspace.domain ?? "",
      description: fallbackWorkspace.description ?? "",
      timezone: fallbackWorkspace.timezone ?? "Asia/Jakarta",
      status: fallbackWorkspace.status,
    });
    if (route === "settings") {
      void loadSanitySettingsForEditorWorkspace(fallbackWorkspace.slug);
    }
  }, [activeWorkspaceSlug, route, workspaceEditorSlug, workspaces]);

  useEffect(() => {
    if (authStatus !== "authenticated") {
      return;
    }

    if (!selectedId || !isEditorRoute) {
      setDraft(null);
      setSavedDraft(null);
      setScheduleAt("");
      setActiveAiAssistJob(null);
      setIsAiRunning(null);
      return;
    }

    void loadNote(selectedId);
  }, [authStatus, isEditorRoute, selectedId]);

  useEffect(() => {
    if (authStatus !== "authenticated" || !draft?.id || !isEditorRoute) {
      return;
    }

    const draftId = draft.id;
    let cancelled = false;

    async function loadLatestAiAssistJob() {
      try {
        const response = await notesApi.getLatestAiAssistJob(draftId);
        if (cancelled) {
          return;
        }

        setActiveAiAssistJob(response.job);
        if (response.job?.status === "processing" || response.job?.status === "queued") {
          setIsAiRunning(response.job.mode);
        } else if (response.job?.status === "completed") {
          setIsAiRunning(null);
        }
      } catch {
        return;
      }
    }

    void loadLatestAiAssistJob();
    return () => {
      cancelled = true;
    };
  }, [authStatus, draft?.id, isEditorRoute]);

  useEffect(() => {
    if (!activeAiAssistJob || !draft?.id) {
      return;
    }

    if (activeAiAssistJob.noteId !== draft.id) {
      return;
    }

    if (activeAiAssistJob.status === "completed") {
      applyCompletedAiAssistJob(activeAiAssistJob, false);
      return;
    }

    if (activeAiAssistJob.status === "failed") {
      setIsAiRunning(null);
      toast.error(activeAiAssistJob.error || "AI assist failed");
      return;
    }

    if (activeAiAssistJob.status === "cancelled") {
      setIsAiRunning(null);
      return;
    }

    if (activeAiAssistJob.status !== "queued" && activeAiAssistJob.status !== "processing") {
      return;
    }

    const timer = window.setInterval(async () => {
      try {
        const nextJob = await notesApi.getAiAssistJob(activeAiAssistJob.id);
        setActiveAiAssistJob(nextJob);
      } catch {
        return;
      }
    }, 2000);

    return () => window.clearInterval(timer);
  }, [activeAiAssistJob, draft?.id]);

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
      await loadWorkspaces();
      setAuthStatus("authenticated");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearStoredAuthToken();
        setAuthStatus("unauthenticated");
        return;
      }

      setAuthStatus("unauthenticated");
      toast.error(error instanceof Error ? error.message : "Failed to initialize auth");
    }
  }

  async function loadWorkspaces(preferredSlug?: string) {
    const response = await workspacesApi.list();
    setWorkspaces(response.items);

    const storedSlug =
      preferredSlug ??
      routeState.workspaceSlug ??
      getStoredActiveWorkspaceSlug() ??
      activeWorkspaceSlug;
    const fallbackSlug = response.items[0]?.slug ?? "";
    const nextSlug = response.items.some((workspace) => workspace.slug === storedSlug) ? storedSlug : fallbackSlug;

    setActiveWorkspaceSlug(nextSlug);
    setStoredActiveWorkspaceSlug(nextSlug);
    return response.items;
  }

  function showLoadError(error: unknown, fallbackMessage: string) {
    const message = error instanceof Error ? error.message : fallbackMessage;
    const now = Date.now();
    const previous = lastErrorToastRef.current;

    if (previous && previous.message === message && now - previous.at < 3000) {
      return;
    }

    lastErrorToastRef.current = { message, at: now };
    toast.error(message);
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
      await loadWorkspaces();
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
    setWorkspaces([]);
    setActiveWorkspaceSlug("");
    setWorkspaceEditorSlug("");
    setWorkspaceForm(createEmptyWorkspaceForm());
    setWorkspaceSanitySettings(createEmptyWorkspaceSanitySettings());
    setWorkspaceSanityTestFingerprint("");
    setDraft(null);
    setSavedDraft(null);
    setSelectedId("");
    setNotes([]);
    setConfig(null);
    setAuthConfig(null);
    setAuthStatus("unauthenticated");
    setLoginPassword("");
    clearStoredActiveWorkspaceSlug();
    toast.success("Logged out");
  }

  function resetWorkspaceEditor() {
    setWorkspaceEditorSlug("");
    setWorkspaceForm(createEmptyWorkspaceForm());
    setWorkspaceSanitySettings(createEmptyWorkspaceSanitySettings());
    setWorkspaceSanityTestFingerprint("");
  }

  async function loadSanitySettingsForEditorWorkspace(workspaceSlug: string) {
    try {
      const nextSettings = await notesApi.getSanitySettings(workspaceSlug);
      setWorkspaceSanitySettings(nextSettings);
      setWorkspaceSanityTestFingerprint("");
    } catch (error) {
      showLoadError(error, "Failed to load Sanity settings");
    }
  }

  function loadWorkspaceIntoEditor(workspace: Workspace) {
    setWorkspaceEditorSlug(workspace.slug);
    setWorkspaceForm({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      domain: workspace.domain ?? "",
      description: workspace.description ?? "",
      timezone: workspace.timezone ?? "Asia/Jakarta",
      status: workspace.status,
    });
    void loadSanitySettingsForEditorWorkspace(workspace.slug);
  }

  async function testWorkspaceSanityBeforeSave() {
    if (!isWorkspaceSanityComplete) {
      toast.error("Lengkapi project ID, dataset, API version, dan write token dulu");
      return;
    }

    setIsTestingWorkspaceSanity(true);
    try {
      const result = await notesApi.testSanitySettings(workspaceSanitySettings);
      setWorkspaceSanityTestFingerprint(workspaceSanityFingerprint);
      toast.success(`Sanity connected. ${result.categoryCount} categories found.`);
    } catch (error) {
      setWorkspaceSanityTestFingerprint("");
      toast.error(error instanceof Error ? error.message : "Sanity test failed");
    } finally {
      setIsTestingWorkspaceSanity(false);
    }
  }

  async function saveWorkspace() {
    if (!isWorkspaceFormComplete) {
      toast.error("Nama, slug, dan timezone workspace wajib diisi");
      return;
    }

    if (!isWorkspaceSanityComplete) {
      toast.error("Sanity settings workspace wajib diisi lengkap");
      return;
    }

    if (!hasWorkspaceSanityTestPassed) {
      toast.error("Jalankan test connection sampai sukses sebelum create atau update workspace");
      return;
    }

    setIsSavingWorkspace(true);

    const payload: WorkspacePayload = {
      name: workspaceForm.name.trim(),
      slug: workspaceForm.slug.trim(),
      domain: workspaceForm.domain.trim(),
      description: workspaceForm.description,
      timezone: workspaceForm.timezone.trim(),
      status: workspaceForm.status,
      sanity: workspaceSanitySettings,
    };

    try {
      const wasEditingActiveWorkspace = workspaceForm.slug === activeWorkspaceSlug;
      if (workspaceForm.id) {
        const updated = await workspacesApi.update(workspaceForm.id, payload);
        const refreshed = await loadWorkspaces(wasEditingActiveWorkspace ? updated.slug : undefined);
        const refreshedWorkspace = refreshed.find((workspace) => workspace.id === updated.id);
        if (refreshedWorkspace) {
          loadWorkspaceIntoEditor(refreshedWorkspace);
        }
        toast.success("Workspace diperbarui");
      } else {
        const created = await workspacesApi.create(payload);
        const refreshed = await loadWorkspaces();
        const refreshedWorkspace = refreshed.find((workspace) => workspace.id === created.id);
        if (refreshedWorkspace) {
          loadWorkspaceIntoEditor(refreshedWorkspace);
        }
        toast.success("Workspace dibuat");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save workspace");
    } finally {
      setIsSavingWorkspace(false);
    }
  }

  async function deleteWorkspace() {
    if (!workspaceForm.id) {
      toast.error("Pilih workspace yang ingin dihapus dulu");
      return;
    }

    if (workspaceForm.slug === "default") {
      toast.error("Default workspace tidak bisa dihapus");
      return;
    }

    if (!window.confirm(`Hapus workspace "${workspaceForm.name}" (${workspaceForm.slug}) beserta notes dan settings-nya?`)) {
      return;
    }

    setIsDeletingWorkspace(true);
    try {
      const deletingActiveWorkspace = workspaceForm.slug === activeWorkspaceSlug;
      await workspacesApi.remove(workspaceForm.id);
      resetWorkspaceEditor();
      await loadWorkspaces(deletingActiveWorkspace ? undefined : activeWorkspaceSlug);
      toast.success("Workspace dihapus");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete workspace");
    } finally {
      setIsDeletingWorkspace(false);
    }
  }

  function switchWorkspace(slug: string) {
    setActiveWorkspaceSlug(slug);
    setStoredActiveWorkspaceSlug(slug);
    setWorkspaceSanityTestFingerprint("");
    setDraft(null);
    setSavedDraft(null);
    setSelectedId("");
    navigate(buildWorkspaceHash(slug, "dashboard"));
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
      showLoadError(error, "Failed to load worker config");
    }
  }

  async function loadWorkspaceData() {
    await loadConfig();
    await loadAiSettings();
    await loadOgBrandingSettings();
    await loadAuthConfig();
    await loadCategories();
    await loadTemplates();
    await loadNotes();
  }

  async function loadCategories() {
    try {
      const response = await notesApi.categories();
      setCategoryOptions(response.items);
    } catch (error) {
      showLoadError(error, "Failed to load Sanity categories");
    }
  }

  async function loadTemplates() {
    try {
      const response = await notesApi.listAiPromptTemplates();
      setAiTemplates(response.items);
    } catch {
      setAiTemplates([]);
    }
  }

  async function loadAiSettings() {
    try {
      const nextSettings = await notesApi.getAiSettings();
      setAiSettings(nextSettings);
      setAiConnectionTestResult(null);
    } catch (error) {
      showLoadError(error, "Failed to load AI settings");
    }
  }

  async function loadOgBrandingSettings() {
    try {
      const nextSettings = await notesApi.getOgBrandingSettings();
      setOgBrandingSettings(nextSettings);
    } catch (error) {
      showLoadError(error, "Failed to load OG branding settings");
    }
  }

  async function loadAuthConfig() {
    try {
      const nextSettings = await authApi.settings();
      setAuthConfig(nextSettings);
    } catch (error) {
      showLoadError(error, "Failed to load auth settings");
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
      showLoadError(error, "Failed to load notes");
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

  async function loadSanityPosts() {
    setIsLoadingSanityPosts(true);
    try {
      const response = await notesApi.sanityPosts(activeWorkspaceSlug || undefined);
      setSanityPosts(response.items);
    } catch (error) {
      showLoadError(error, "Failed to load Sanity posts");
    } finally {
      setIsLoadingSanityPosts(false);
    }
  }

  async function loadSanityPages() {
    setIsLoadingSanityPages(true);
    try {
      const response = await pagesApi.list(activeWorkspaceSlug || undefined);
      setSanityPages(response.items);
    } catch (error) {
      showLoadError(error, "Failed to load Sanity pages");
    } finally {
      setIsLoadingSanityPages(false);
    }
  }

  async function loadSanityProducts() {
    setIsLoadingSanityProducts(true);
    try {
      const response = await productsApi.list(activeWorkspaceSlug || undefined);
      setSanityProducts(response.items);
    } catch (error) {
      showLoadError(error, "Failed to load Sanity products");
    } finally {
      setIsLoadingSanityProducts(false);
    }
  }

  async function loadSanityServices() {
    setIsLoadingSanityServices(true);
    try {
      const response = await servicesApi.list(activeWorkspaceSlug || undefined);
      setSanityServices(response.items);
    } catch (error) {
      showLoadError(error, "Failed to load Sanity services");
    } finally {
      setIsLoadingSanityServices(false);
    }
  }

  async function loadSanityProjects() {
    setIsLoadingSanityProjects(true);
    try {
      const response = await projectsApi.list(activeWorkspaceSlug || undefined);
      setSanityProjects(response.items);
    } catch (error) {
      showLoadError(error, "Failed to load Sanity projects");
    } finally {
      setIsLoadingSanityProjects(false);
    }
  }

  async function openSanityPost(sanityDocumentId: string) {
    setOpeningSanityDocumentId(sanityDocumentId);
    try {
      const note = await notesApi.openSanityPost(sanityDocumentId, activeWorkspaceSlug || undefined);
      setDraft(note);
      setSavedDraft(note);
      setNotes((current) => {
        const exists = current.some((item) => item.id === note.id);
        return exists ? current.map((item) => (item.id === note.id ? note : item)) : [note, ...current];
      });
      setSelectedId(note.id);
      setScheduleAt(toJakartaScheduleValue(note.publishAt));
      setEditorSectionTab("sanity");
      if (activeWorkspaceSlug) {
        navigate(buildWorkspaceHash(activeWorkspaceSlug, "posts", note.id));
      }
      toast.success("Sanity post loaded into editor");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to open Sanity post");
    } finally {
      setOpeningSanityDocumentId(null);
    }
  }

  async function openSanityPage(sanityDocumentId: string) {
    setOpeningSanityDocumentId(sanityDocumentId);
    try {
      const page = await pagesApi.open(sanityDocumentId, activeWorkspaceSlug || undefined);
      setDraft(page);
      setSavedDraft(page);
      setNotes((current) => {
        const exists = current.some((item) => item.id === page.id);
        return exists ? current.map((item) => (item.id === page.id ? page : item)) : [page, ...current];
      });
      setSelectedId(page.id);
      setScheduleAt(toJakartaScheduleValue(page.publishAt));
      setEditorSectionTab("sanity");
      if (activeWorkspaceSlug) {
        navigate(buildWorkspaceHash(activeWorkspaceSlug, "posts", page.id));
      }
      toast.success("Sanity page loaded into editor");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to open Sanity page");
    } finally {
      setOpeningSanityDocumentId(null);
    }
  }

  async function openSanityProduct(sanityDocumentId: string) {
    setOpeningSanityDocumentId(sanityDocumentId);
    try {
      const item = await productsApi.open(sanityDocumentId, activeWorkspaceSlug || undefined);
      setDraft(item);
      setSavedDraft(item);
      setNotes((current) => {
        const exists = current.some((n) => n.id === item.id);
        return exists ? current.map((n) => (n.id === item.id ? item : n)) : [item, ...current];
      });
      setSelectedId(item.id);
      setScheduleAt(toJakartaScheduleValue(item.publishAt));
      setEditorSectionTab("sanity");
      if (activeWorkspaceSlug) {
        navigate(buildWorkspaceHash(activeWorkspaceSlug, "posts", item.id));
      }
      toast.success("Sanity product loaded into editor");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to open Sanity product");
    } finally {
      setOpeningSanityDocumentId(null);
    }
  }

  async function openSanityService(sanityDocumentId: string) {
    setOpeningSanityDocumentId(sanityDocumentId);
    try {
      const item = await servicesApi.open(sanityDocumentId, activeWorkspaceSlug || undefined);
      setDraft(item);
      setSavedDraft(item);
      setNotes((current) => {
        const exists = current.some((n) => n.id === item.id);
        return exists ? current.map((n) => (n.id === item.id ? item : n)) : [item, ...current];
      });
      setSelectedId(item.id);
      setScheduleAt(toJakartaScheduleValue(item.publishAt));
      setEditorSectionTab("sanity");
      if (activeWorkspaceSlug) {
        navigate(buildWorkspaceHash(activeWorkspaceSlug, "posts", item.id));
      }
      toast.success("Sanity service loaded into editor");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to open Sanity service");
    } finally {
      setOpeningSanityDocumentId(null);
    }
  }

  async function openSanityProject(sanityDocumentId: string) {
    setOpeningSanityDocumentId(sanityDocumentId);
    try {
      const item = await projectsApi.open(sanityDocumentId, activeWorkspaceSlug || undefined);
      setDraft(item);
      setSavedDraft(item);
      setNotes((current) => {
        const exists = current.some((n) => n.id === item.id);
        return exists ? current.map((n) => (n.id === item.id ? item : n)) : [item, ...current];
      });
      setSelectedId(item.id);
      setScheduleAt(toJakartaScheduleValue(item.publishAt));
      setEditorSectionTab("sanity");
      if (activeWorkspaceSlug) {
        navigate(buildWorkspaceHash(activeWorkspaceSlug, "posts", item.id));
      }
      toast.success("Sanity project loaded into editor");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to open Sanity project");
    } finally {
      setOpeningSanityDocumentId(null);
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
      if (activeWorkspaceSlug) {
        navigate(buildWorkspaceHash(activeWorkspaceSlug, "posts", created.id));
      }
      setContentTab("editor");
      await loadNotes(created.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create note");
    }
  }

  async function createNoteWithType(type: string, title: string, slug: string) {
    setIsCreatingNote(true);
    try {
      const created = await notesApi.create({
        title: title || "Untitled note",
        slug: slug || `untitled-note-${Date.now()}`,
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
        sanityType: type,
      });
      toast.success("Note created");
      setSelectedId(created.id);
      if (activeWorkspaceSlug) {
        navigate(buildWorkspaceHash(activeWorkspaceSlug, "posts", created.id));
      }
      setContentTab("editor");
      await loadNotes(created.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create note");
    } finally {
      setIsCreatingNote(false);
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
        sanityType: draft.sanityType ?? undefined,
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
      if (activeWorkspaceSlug) {
        navigate(buildWorkspaceHash(activeWorkspaceSlug, "scheduled"));
      }
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
      if (activeWorkspaceSlug) {
        navigate(buildWorkspaceHash(activeWorkspaceSlug, "sanity-sync"));
      }
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
      if (activeWorkspaceSlug) {
        navigate(buildWorkspaceHash(activeWorkspaceSlug, "sanity-sync"));
      }
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

  function applyCompletedAiAssistJob(job: AiAssistJob, showToast = true) {
    const updated = job.suggestion;
    if (!updated) {
      return;
    }

    setNotes((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    if (draft?.id === updated.id) {
      setDraft(updated);
      setSavedDraft(updated);
      setScheduleAt(toJakartaScheduleValue(updated.publishAt));
    }
    setActiveAiAssistJob((current) => (current?.id === job.id ? job : current));
    setIsAiRunning(null);
    if (showToast) {
      toast.success("AI suggestion applied and saved");
    }
  }

  async function runAiAssist(mode: "metadata" | "draft" | "outline" | "outline_to_post" | "seo_only" | "all_in_one") {
    if (!draft) return;
    if (!config?.aiConfigured) {
      toast.error("AI belum aktif karena settings AI belum diisi");
      return;
    }

    const targetDraft = draft;
    setIsAiRunning(mode);

    try {
      const job = await notesApi.createAiAssistJob({
        mode,
        noteId: targetDraft.id,
        templateId: (selectedTemplateId && selectedTemplateId !== "__default__") ? selectedTemplateId : undefined,
        note: {
          title: targetDraft.title,
          slug: targetDraft.slug,
          excerpt: targetDraft.excerpt,
          seoTitle: targetDraft.seoTitle,
          seoDescription: targetDraft.seoDescription,
          seoKeywords: targetDraft.seoKeywords,
          ogTitle: targetDraft.ogTitle,
          ogDescription: targetDraft.ogDescription,
          outlineMd: targetDraft.outlineMd,
          contentMd: targetDraft.contentMd,
        },
      });
      setActiveAiAssistJob(job);
      toast.success("AI job queued. Aman jika ganti note, refresh, atau keluar tab.");
    } catch (error) {
      setIsAiRunning(null);
      toast.error(error instanceof Error ? error.message : "AI assist failed");
    }
  }

  async function cancelActiveAiAssistJob() {
    if (!activeAiAssistJob) return;

    try {
      const job = await notesApi.cancelAiAssistJob(activeAiAssistJob.id);
      setActiveAiAssistJob(job);
      setIsAiRunning(null);
      toast.success("AI job cancelled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel AI job");
    }
  }

  async function retryActiveAiAssistJob() {
    if (!activeAiAssistJob) return;

    try {
      const job = await notesApi.retryAiAssistJob(activeAiAssistJob.id);
      setActiveAiAssistJob(job);
      if (job.status === "queued" || job.status === "processing") {
        setIsAiRunning(job.mode);
      }
      toast.success("AI job requeued");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to retry AI job");
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

  async function refreshDraftFromSanity() {
    if (!draft) return;
    if (!draft.sanityDocumentId) {
      toast.error("Note ini belum terhubung ke dokumen Sanity");
      return;
    }

    setIsRefreshingFromSanity(true);
    try {
      const updated = await notesApi.refreshFromSanity(draft.id);
      setDraft(updated);
      setSavedDraft(updated);
      setNotes((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      toast.success("Konten terbaru dari Sanity dimuat ke draft lokal");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to refresh from Sanity");
    } finally {
      setIsRefreshingFromSanity(false);
    }
  }

  async function deleteDraftSanityPost() {
    if (!draft) return;
    if (!draft.sanityDocumentId) {
      toast.error("Note ini belum terhubung ke dokumen Sanity");
      return;
    }

    if (!window.confirm(`Hapus post Sanity untuk "${draft.title}"? Draft lokal tetap disimpan.`)) {
      return;
    }

    setIsDeletingSanityPost(true);
    try {
      const updated = await notesApi.deleteSanityPost(draft.id);
      setDraft(updated);
      setSavedDraft(updated);
      setNotes((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      toast.success("Sanity post deleted. Local draft kept.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete Sanity post");
    } finally {
      setIsDeletingSanityPost(false);
    }
  }

  async function runAiRewritePreview(prompt: string) {
    if (!draft) return;
    if (!draft.sanityDocumentId) {
      toast.error("Note ini belum terhubung ke dokumen Sanity");
      return;
    }
    if (!config?.aiConfigured) {
      toast.error("AI belum aktif karena settings AI belum diisi");
      return;
    }

    setIsAiRewritePreviewRunning(true);
    try {
      const updated = await notesApi.aiRewritePreview(draft.id, prompt);
      setDraft(updated);
      setSavedDraft((current) => current ?? updated);
      setNotes((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      toast.success("Preview rewrite AI siap dibandingkan dengan konten Sanity saat ini");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate AI rewrite preview");
    } finally {
      setIsAiRewritePreviewRunning(false);
    }
  }

  function applyAiRewriteCandidate() {
    setDraft((current) => {
      if (!current || !current.aiRewriteContentMd) {
        return current;
      }

      return {
        ...current,
        contentMd: current.aiRewriteContentMd,
        excerpt: current.aiRewriteExcerpt ?? current.excerpt,
        seoTitle: current.aiRewriteSeoTitle ?? current.seoTitle,
        seoDescription: current.aiRewriteSeoDescription ?? current.seoDescription,
        seoKeywords: current.aiRewriteSeoKeywords ?? current.seoKeywords,
        ogTitle: current.aiRewriteOgTitle ?? current.ogTitle,
        ogDescription: current.aiRewriteOgDescription ?? current.ogDescription,
      };
    });
    toast.success("Preview AI dipindahkan ke field draft utama. Review lalu Save atau Publish.");
  }

  function saveApiBaseOverride() {
    setStoredApiBaseUrlOverride(apiBaseUrlInput);
    const nextApiBaseUrl = getApiBaseUrl();
    setApiBaseUrl(nextApiBaseUrl);
    toast.success(`API base updated to ${nextApiBaseUrl}`);
    void loadConfig();
    void loadAiSettings();
    void loadOgBrandingSettings();
    void loadAuthConfig();
    void loadWorkspaces();
    void loadCategories();
    void loadTemplates();
    void loadNotes(selectedId || undefined);
  }

  function resetApiBaseOverride() {
    clearStoredApiBaseUrlOverride();
    setApiBaseUrlInput("");
    const nextApiBaseUrl = getApiBaseUrl();
    setApiBaseUrl(nextApiBaseUrl);
    toast.success("API base reset to default");
    void loadConfig();
    void loadAiSettings();
    void loadOgBrandingSettings();
    void loadAuthConfig();
    void loadCategories();
    void loadNotes(selectedId || undefined);
  }

  async function saveAiSettings() {
    if (!aiSettings) return;

    try {
      const saved = await notesApi.saveAiSettings(aiSettings);
      setAiSettings(saved);
      setAiConnectionTestResult(null);
      toast.success("AI settings saved");
      void loadConfig();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save AI settings");
    }
  }

  async function testAiSettings() {
    if (!aiSettings) return;

    setIsTestingAiSettings(true);
    setAiConnectionTestResult(null);

    try {
      const result = await notesApi.testAiSettings(aiSettings);
      setAiConnectionTestResult(result);
      toast.success(`AI connection OK: ${result.model}`);
    } catch (error) {
      setAiConnectionTestResult(null);
      toast.error(error instanceof Error ? error.message : "AI connection test failed");
    } finally {
      setIsTestingAiSettings(false);
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
    if (activeWorkspaceSlug) {
      navigate(buildWorkspaceHash(activeWorkspaceSlug, "posts", id));
    }
  }

  function renderEditorPage() {
    if (!draft) {
      return (
        <section className="grid gap-6">
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
            Belum ada note yang dipilih.
          </div>
        </section>
      );
    }

    return (
      <section className="grid gap-6">
        <Suspense fallback={<RouteFallback label="Loading editor..." />}>
          <PostEditorPage
            draft={draft}
            config={config}
            scheduleAt={scheduleAt}
            getScheduleDate={getScheduleDate}
            getScheduleTime={getScheduleTime}
            updateScheduleDate={updateScheduleDate}
            updateScheduleTime={updateScheduleTime}
            runAiAssist={runAiAssist}
            aiTemplates={aiTemplates}
            selectedTemplateId={selectedTemplateId}
            setSelectedTemplateId={setSelectedTemplateId}
            activeAiAssistJob={activeAiAssistJob?.noteId === draft.id ? activeAiAssistJob : null}
            cancelActiveAiAssistJob={cancelActiveAiAssistJob}
            retryActiveAiAssistJob={retryActiveAiAssistJob}
            generateOgImage={generateOgImage}
            saveDraft={saveDraft}
            refreshDraftFromSanity={refreshDraftFromSanity}
            deleteDraftSanityPost={deleteDraftSanityPost}
            runAiRewritePreview={runAiRewritePreview}
            applyAiRewriteCandidate={applyAiRewriteCandidate}
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
            navigateBack={() => activeWorkspaceSlug && navigate(buildWorkspaceHash(activeWorkspaceSlug, "posts"))}
            deleteSelectedNote={deleteSelectedNote}
            isAiRunning={isAiRunning}
            isGeneratingOg={isGeneratingOg}
            isRefreshingFromSanity={isRefreshingFromSanity}
            isDeletingSanityPost={isDeletingSanityPost}
            isAiRewritePreviewRunning={isAiRewritePreviewRunning}
            isSaving={isSaving}
            isScheduling={isScheduling}
            isPublishing={isPublishing}
            editorSectionTab={editorSectionTab}
            setEditorSectionTab={setEditorSectionTab}
            contentTab={contentTab}
            setContentTab={setContentTab}
          />
        </Suspense>

        <EditorStatusCard isDirty={isDirty} />
      </section>
    );
  }

  function renderSettingsView() {
    return (
      <Suspense fallback={<RouteFallback label="Loading settings..." />}>
        <SettingsPage
          apiBaseUrl={apiBaseUrl}
          apiBaseUrlInput={apiBaseUrlInput}
          setApiBaseUrlInput={setApiBaseUrlInput}
          saveApiBaseOverride={saveApiBaseOverride}
          resetApiBaseOverride={resetApiBaseOverride}
          getDefaultApiBaseUrl={getDefaultApiBaseUrl}
          activeWorkspaceSlug={activeWorkspaceSlug}
          currentWorkspace={currentWorkspace}
          workspaces={workspaces}
          workspaceForm={workspaceForm}
          setWorkspaceForm={setWorkspaceForm}
          workspaceSanitySettings={workspaceSanitySettings}
          setWorkspaceSanitySettings={setWorkspaceSanitySettings}
          setWorkspaceSanityTestFingerprint={setWorkspaceSanityTestFingerprint}
          loadWorkspaceIntoEditor={loadWorkspaceIntoEditor}
          switchWorkspace={switchWorkspace}
          testWorkspaceSanityBeforeSave={testWorkspaceSanityBeforeSave}
          saveWorkspace={saveWorkspace}
          resetWorkspaceEditor={resetWorkspaceEditor}
          deleteWorkspace={deleteWorkspace}
          isTestingWorkspaceSanity={isTestingWorkspaceSanity}
          isSavingWorkspace={isSavingWorkspace}
          isDeletingWorkspace={isDeletingWorkspace}
          isWorkspaceFormComplete={isWorkspaceFormComplete}
          isWorkspaceSanityComplete={isWorkspaceSanityComplete}
          hasWorkspaceSanityTestPassed={hasWorkspaceSanityTestPassed}
          config={config}
          authConfig={authConfig}
          authEmail={authEmail}
          getStoredAuthToken={getStoredAuthToken}
          copyToken={copyToken}
          isCopyingToken={isCopyingToken}
          aiSettings={aiSettings}
          setAiSettings={setAiSettings}
          saveAiSettings={saveAiSettings}
          testAiSettings={testAiSettings}
          isTestingAiSettings={isTestingAiSettings}
          aiConnectionTestResult={aiConnectionTestResult}
          ogBrandingSettings={ogBrandingSettings}
          setOgBrandingSettings={setOgBrandingSettings}
          saveOgBrandingSettings={saveOgBrandingSettings}
          slugify={slugify}
        />
      </Suspense>
    );
  }

  function renderRoute() {
    switch (route) {
      case "dashboard":
        return (
          <DashboardView
            stats={stats}
            notes={notes}
            isLoading={isLoading}
            selectedId={selectedId}
            openNote={openNote}
            formatRelativeDate={formatRelativeDate}
            retryPublishNote={(noteId) => void retryPublishNote(noteId)}
            retryingNoteId={retryingNoteId}
            config={config}
            scheduledCount={scheduledNotes.length}
            failedCount={failedNotes.length}
          />
        );
      case "posts":
        return isEditorRoute ? (
          renderEditorPage()
        ) : (
          <PostsView
            postsSourceTab={postsSourceTab}
            setPostsSourceTab={setPostsSourceTab}
            createNote={() => void createNote()}
            notes={notes}
            isLoading={isLoading}
            selectedId={selectedId}
            openNote={openNote}
            formatRelativeDate={formatRelativeDate}
            retryPublishNote={(noteId) => void retryPublishNote(noteId)}
            retryingNoteId={retryingNoteId}
            loadSanityPosts={() => void loadSanityPosts()}
            openingSanityDocumentId={openingSanityDocumentId}
            sanityPosts={sanityPosts}
            isLoadingSanityPosts={isLoadingSanityPosts}
            openSanityPost={(sanityDocumentId) => void openSanityPost(sanityDocumentId)}
            loadSanityPages={() => void loadSanityPages()}
            sanityPages={sanityPages}
            isLoadingSanityPages={isLoadingSanityPages}
            openSanityPage={(sanityDocumentId) => void openSanityPage(sanityDocumentId)}
            loadSanityProducts={() => void loadSanityProducts()}
            products={sanityProducts}
            isLoadingSanityProducts={isLoadingSanityProducts}
            openSanityProduct={(sanityDocumentId) => void openSanityProduct(sanityDocumentId)}
            loadSanityServices={() => void loadSanityServices()}
            services={sanityServices}
            isLoadingSanityServices={isLoadingSanityServices}
            openSanityService={(sanityDocumentId) => void openSanityService(sanityDocumentId)}
            loadSanityProjects={() => void loadSanityProjects()}
            projects={sanityProjects}
            isLoadingSanityProjects={isLoadingSanityProjects}
            openSanityProject={(sanityDocumentId) => void openSanityProject(sanityDocumentId)}
          />
        );
      case "scheduled":
        return (
          <ScheduledView
            config={config}
            scheduledNotes={scheduledNotes}
            isLoading={isLoading}
            selectedId={selectedId}
            openNote={openNote}
            formatRelativeDate={formatRelativeDate}
            retryPublishNote={(noteId) => void retryPublishNote(noteId)}
            retryingNoteId={retryingNoteId}
          />
        );
      case "sanity-sync":
        return (
          <SanitySyncView
            config={config}
            publishedNotes={publishedNotes}
            failedNotes={failedNotes}
            isLoading={isLoading}
            selectedId={selectedId}
            openNote={openNote}
            formatRelativeDate={formatRelativeDate}
            retryPublishNote={(noteId) => void retryPublishNote(noteId)}
            retryingNoteId={retryingNoteId}
          />
        );
      case "ai-batch":
        return (
          <Suspense
            fallback={
              <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-border bg-card/60 text-sm text-muted-foreground">
                Loading AI batch...
              </div>
            }
          >
            <AiBatchPage config={config} workspaceSlug={activeWorkspaceSlug} />
          </Suspense>
        );
      case "knowledge-base":
        return (
          <Suspense
            fallback={
              <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-border bg-card/60 text-sm text-muted-foreground">
                Loading knowledge base...
              </div>
            }
          >
            <KnowledgeBasePage />
          </Suspense>
        );
      case "worker-logs":
        return (
          <Suspense
            fallback={
              <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-border bg-card/60 text-sm text-muted-foreground">
                Loading worker logs...
              </div>
            }
          >
            <WorkerLogsPage />
          </Suspense>
        );
      case "settings":
        return renderSettingsView();
      case "create":
        return (
          <Suspense
            fallback={
              <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-border bg-card/60 text-sm text-muted-foreground">
                Loading...
              </div>
            }
          >
            <CreateNotePage
              onCreateNote={(type, title, slug) => createNoteWithType(type, title, slug)}
              isCreating={isCreatingNote}
            />
          </Suspense>
        );
      case "api-status":
        return (
          <ApiStatusView
            config={config}
            scheduledCount={scheduledNotes.length}
            publishedCount={publishedNotes.length}
          />
        );
      default:
        return (
          <DashboardView
            stats={stats}
            notes={notes}
            isLoading={isLoading}
            selectedId={selectedId}
            openNote={openNote}
            formatRelativeDate={formatRelativeDate}
            retryPublishNote={(noteId) => void retryPublishNote(noteId)}
            retryingNoteId={retryingNoteId}
            config={config}
            scheduledCount={scheduledNotes.length}
            failedCount={failedNotes.length}
          />
        );
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
    return (
      <LoginScreen
        authSettings={authSettings}
        apiBaseUrl={apiBaseUrl}
        loginEmail={loginEmail}
        loginPassword={loginPassword}
        setLoginEmail={setLoginEmail}
        setLoginPassword={setLoginPassword}
        signIn={signIn}
        isSigningIn={isSigningIn}
      />
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar
        currentUrl={window.location.hash || buildWorkspaceHash(activeWorkspaceSlug, route, routeState.noteId, routeState.isNewNote)}
        onNavigate={navigate}
        onCreate={() => navigate(buildWorkspaceHash(activeWorkspaceSlug, "create"))}
        userEmail={authEmail}
        onLogout={logout}
        workspaces={workspaces}
        activeWorkspaceSlug={activeWorkspaceSlug}
        onSelectWorkspace={switchWorkspace}
      />
      <SidebarInset>
        <SiteHeader title={header.title} description={header.description} />
        <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6">{renderRoute()}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default App;
