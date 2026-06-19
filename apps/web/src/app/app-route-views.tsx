import { useState } from "react";
import {
  CalendarClockIcon,
  CircleAlertIcon,
  FileTextIcon,
  Loader2Icon,
  SendIcon,
} from "lucide-react";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ApiConfig, ApiNote, AuthStatus, SanityPageSummary, SanityPostSummary, SanityProductSummary, SanityServiceSummary, SanityProjectSummary } from "@/lib/api";

type Note = ApiNote;

const TYPE_COLORS: Record<string, string> = {
  post: "border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
  page: "border-purple-200 bg-purple-100 text-purple-800 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300",
  product:
    "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  service:
    "border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300",
  project:
    "border-pink-200 bg-pink-100 text-pink-800 dark:border-pink-800 dark:bg-pink-950 dark:text-pink-300",
};

const TYPE_LABELS: Record<string, string> = {
  post: "Post",
  page: "Page",
  product: "Product",
  service: "Service",
  project: "Project",
};

const TITLE_COLORS: Record<string, string> = {
  post: "text-blue-600 dark:text-blue-400",
  page: "text-purple-600 dark:text-purple-400",
  product: "text-emerald-600 dark:text-emerald-400",
  service: "text-orange-600 dark:text-orange-400",
  project: "text-pink-600 dark:text-pink-400",
};

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

export function LoginScreen({
  authSettings,
  apiBaseUrl,
  loginEmail,
  loginPassword,
  setLoginEmail,
  setLoginPassword,
  signIn,
  isSigningIn,
}: {
  authSettings: AuthStatus | null;
  apiBaseUrl: string;
  loginEmail: string;
  loginPassword: string;
  setLoginEmail: (value: string) => void;
  setLoginPassword: (value: string) => void;
  signIn: () => Promise<void>;
  isSigningIn: boolean;
}) {
  const authConfigured = authSettings?.configured ?? null;

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
          <Button onClick={() => void signIn()} disabled={isSigningIn || authConfigured === false}>
            {isSigningIn ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : null}
            {isSigningIn ? "Signing in..." : "Sign in"}
          </Button>
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <div className="grid gap-2">
              <span>
                API base: <code>{apiBaseUrl}</code>
              </span>
              <span>Auth configured: {authConfigured ? "yes" : "no"}</span>
              {authConfigured === false ? (
                <span>Set `AUTH_ADMIN_EMAIL`, `AUTH_ADMIN_PASSWORD`, dan `AUTH_TOKEN_SECRET` di Worker secrets dulu.</span>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export function NotesTable({
  items,
  emptyLabel,
  isLoading,
  selectedId,
  formatRelativeDate,
  onOpenNote,
  onRetryPublish,
  retryingNoteId,
  showRetryAction = false,
}: {
  items: Note[];
  emptyLabel: string;
  isLoading: boolean;
  selectedId: string;
  formatRelativeDate: (value: string | null) => string;
  onOpenNote: (id: string) => void;
  onRetryPublish: (noteId: string) => void;
  retryingNoteId: string | null;
  showRetryAction?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Updated</TableHead>
          {showRetryAction ? <TableHead className="text-right">Action</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={showRetryAction ? 5 : 4} className="text-center text-muted-foreground">
              Loading notes...
            </TableCell>
          </TableRow>
        ) : items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={showRetryAction ? 5 : 4} className="text-center text-muted-foreground">
              {emptyLabel}
            </TableCell>
          </TableRow>
        ) : (
          items.map((note) => {
            const isActive = note.id === selectedId;
            const st = note.sanityType ?? "";
            const typeColor = TYPE_COLORS[st] ?? "border-gray-200 bg-gray-100 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";

            return (
              <TableRow
                key={note.id}
                className={`cursor-pointer${isActive ? " bg-muted/60" : ""}`}
                onClick={() => onOpenNote(note.id)}
              >
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className={`font-medium ${TITLE_COLORS[st] ?? "text-foreground"}`}>{note.title}</span>
                    <span className="truncate text-xs text-muted-foreground">/{note.slug}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${typeColor}`}>
                    {TYPE_LABELS[st] ?? (st || "—")}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{note.status}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatRelativeDate(note.updatedAt)}</TableCell>
                {showRetryAction ? (
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRetryPublish(note.id);
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

export function PostsView({
  postsSourceTab,
  setPostsSourceTab,
  createNote,
  notes,
  isLoading,
  selectedId,
  openNote,
  formatRelativeDate,
  retryPublishNote,
  retryingNoteId,
  loadSanityPosts,
  openingSanityDocumentId,
  sanityPosts,
  isLoadingSanityPosts,
  openSanityPost,
  loadSanityPages,
  sanityPages,
  isLoadingSanityPages,
  openSanityPage,
  loadSanityProducts,
  products,
  isLoadingSanityProducts,
  openSanityProduct,
  loadSanityServices,
  services,
  isLoadingSanityServices,
  openSanityService,
  loadSanityProjects,
  projects,
  isLoadingSanityProjects,
  openSanityProject,
}: {
  postsSourceTab: "local" | "sanity" | "pages" | "products" | "services" | "projects";
  setPostsSourceTab: (value: typeof postsSourceTab) => void;
  createNote: () => void;
  notes: Note[];
  isLoading: boolean;
  selectedId: string;
  openNote: (id: string) => void;
  formatRelativeDate: (value: string | null) => string;
  retryPublishNote: (noteId: string) => void;
  retryingNoteId: string | null;
  loadSanityPosts: () => void;
  openingSanityDocumentId: string | null;
  sanityPosts: SanityPostSummary[];
  isLoadingSanityPosts: boolean;
  openSanityPost: (sanityDocumentId: string) => void;
  loadSanityPages: () => void;
  sanityPages: SanityPageSummary[];
  isLoadingSanityPages: boolean;
  openSanityPage: (sanityDocumentId: string) => void;
  loadSanityProducts: () => void;
  products: SanityProductSummary[];
  isLoadingSanityProducts: boolean;
  openSanityProduct: (sanityDocumentId: string) => void;
  loadSanityServices: () => void;
  services: SanityServiceSummary[];
  isLoadingSanityServices: boolean;
  openSanityService: (sanityDocumentId: string) => void;
  loadSanityProjects: () => void;
  projects: SanityProjectSummary[];
  isLoadingSanityProjects: boolean;
  openSanityProject: (sanityDocumentId: string) => void;
}) {
  const [typeFilter, setTypeFilter] = useState("all");
  const filteredNotes =
    typeFilter === "all" ? notes : notes.filter((n) => n.sanityType === typeFilter);

  const filterOptions = [
    { value: "all", label: "All" },
    { value: "post", label: "Post" },
    { value: "page", label: "Page" },
    { value: "product", label: "Product" },
    { value: "service", label: "Service" },
    { value: "project", label: "Project" },
  ] as const;

  return (
    <section className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
          <CardDescription>Kelola draft lokal atau buka post/page Sanity di editor yang sama.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Tabs value={postsSourceTab} onValueChange={(value) => setPostsSourceTab(value as typeof postsSourceTab)}>
            <TabsList>
              <TabsTrigger value="local">Local Notes</TabsTrigger>
              <TabsTrigger value="sanity">Sanity Posts</TabsTrigger>
              <TabsTrigger value="pages">Sanity Pages</TabsTrigger>
              <TabsTrigger value="products">Sanity Products</TabsTrigger>
              <TabsTrigger value="services">Sanity Services</TabsTrigger>
              <TabsTrigger value="projects">Sanity Projects</TabsTrigger>
            </TabsList>
          </Tabs>

          {postsSourceTab === "local" ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Button className="w-full md:w-auto" onClick={createNote}>
                  Note Baru
                </Button>
                <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by type">
                  {filterOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTypeFilter(opt.value)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        typeFilter === opt.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <NotesTable
                items={filteredNotes}
                emptyLabel="Belum ada note."
                isLoading={isLoading}
                selectedId={selectedId}
                formatRelativeDate={formatRelativeDate}
                onOpenNote={openNote}
                onRetryPublish={retryPublishNote}
                retryingNoteId={retryingNoteId}
              />
            </>
          ) : postsSourceTab === "pages" ? (
            <>
              <div className="flex gap-2">
                <Button variant="outline" className="w-full md:w-auto" onClick={loadSanityPages}>
                  Refresh Sanity Pages
                </Button>
                {openingSanityDocumentId ? (
                  <span className="text-sm text-muted-foreground">Membuka page Sanity ke editor...</span>
                ) : null}
              </div>
              <PagesView
                sanityPages={sanityPages}
                isLoadingSanityPages={isLoadingSanityPages}
                formatRelativeDate={formatRelativeDate}
                onOpenSanityPage={openSanityPage}
              />
            </>
          ) : postsSourceTab === "products" ? (
            <>
              <div className="flex gap-2">
                <Button variant="outline" className="w-full md:w-auto" onClick={loadSanityProducts}>
                  Refresh Sanity Products
                </Button>
                {openingSanityDocumentId ? (
                  <span className="text-sm text-muted-foreground">Membuka product Sanity ke editor...</span>
                ) : null}
              </div>
              <ProductsTable
                items={products}
                isLoading={isLoadingSanityProducts}
                formatRelativeDate={formatRelativeDate}
                onOpen={openSanityProduct}
              />
            </>
          ) : postsSourceTab === "services" ? (
            <>
              <div className="flex gap-2">
                <Button variant="outline" className="w-full md:w-auto" onClick={loadSanityServices}>
                  Refresh Sanity Services
                </Button>
                {openingSanityDocumentId ? (
                  <span className="text-sm text-muted-foreground">Membuka service Sanity ke editor...</span>
                ) : null}
              </div>
              <ServicesTable
                items={services}
                isLoading={isLoadingSanityServices}
                formatRelativeDate={formatRelativeDate}
                onOpen={openSanityService}
              />
            </>
          ) : postsSourceTab === "projects" ? (
            <>
              <div className="flex gap-2">
                <Button variant="outline" className="w-full md:w-auto" onClick={loadSanityProjects}>
                  Refresh Sanity Projects
                </Button>
                {openingSanityDocumentId ? (
                  <span className="text-sm text-muted-foreground">Membuka project Sanity ke editor...</span>
                ) : null}
              </div>
              <ProjectsTable
                items={projects}
                isLoading={isLoadingSanityProjects}
                formatRelativeDate={formatRelativeDate}
                onOpen={openSanityProject}
              />
            </>
          ) : (
            <>
              <div className="flex gap-2">
                <Button variant="outline" className="w-full md:w-auto" onClick={loadSanityPosts}>
                  Refresh Sanity Posts
                </Button>
                {openingSanityDocumentId ? (
                  <span className="text-sm text-muted-foreground">Membuka post Sanity ke editor...</span>
                ) : null}
              </div>
              <SanityPostsTable
                sanityPosts={sanityPosts}
                isLoadingSanityPosts={isLoadingSanityPosts}
                formatRelativeDate={formatRelativeDate}
                onOpenSanityPost={openSanityPost}
              />
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function SanityPostsTable({
  sanityPosts,
  isLoadingSanityPosts,
  formatRelativeDate,
  onOpenSanityPost,
}: {
  sanityPosts: SanityPostSummary[];
  isLoadingSanityPosts: boolean;
  formatRelativeDate: (value: string | null) => string;
  onOpenSanityPost: (sanityDocumentId: string) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Slug</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead>Categories</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoadingSanityPosts ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground">
              Loading Sanity posts...
            </TableCell>
          </TableRow>
        ) : sanityPosts.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground">
              Belum ada post Sanity atau koneksi belum siap.
            </TableCell>
          </TableRow>
        ) : (
          sanityPosts.map((post) => (
            <TableRow key={post.sanityDocumentId} onClick={() => onOpenSanityPost(post.sanityDocumentId)}>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-foreground">{post.title}</span>
                  <span className="truncate text-xs text-muted-foreground">{post.sanityDocumentId}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">/{post.slug}</TableCell>
              <TableCell className="text-muted-foreground">{formatRelativeDate(post.updatedAt)}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {post.categoryTitles.length > 0 ? (
                    post.categoryTitles.slice(0, 3).map((category) => (
                      <Badge key={category} variant="outline">
                        {category}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function PagesView({
  sanityPages,
  isLoadingSanityPages,
  formatRelativeDate,
  onOpenSanityPage,
}: {
  sanityPages: SanityPageSummary[];
  isLoadingSanityPages: boolean;
  formatRelativeDate: (value: string | null) => string;
  onOpenSanityPage: (sanityDocumentId: string) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Slug</TableHead>
          <TableHead>Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoadingSanityPages ? (
          <TableRow>
            <TableCell colSpan={3} className="text-center text-muted-foreground">
              Loading Sanity pages...
            </TableCell>
          </TableRow>
        ) : sanityPages.length === 0 ? (
          <TableRow>
            <TableCell colSpan={3} className="text-center text-muted-foreground">
              Belum ada page Sanity atau koneksi belum siap.
            </TableCell>
          </TableRow>
        ) : (
          sanityPages.map((page) => (
            <TableRow key={page.sanityDocumentId} onClick={() => onOpenSanityPage(page.sanityDocumentId)}>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-foreground">{page.title}</span>
                  <span className="truncate text-xs text-muted-foreground">{page.sanityDocumentId}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">/{page.slug}</TableCell>
              <TableCell className="text-muted-foreground">{formatRelativeDate(page.updatedAt)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function ProductsTable({
  items,
  isLoading,
  formatRelativeDate,
  onOpen,
}: {
  items: SanityProductSummary[];
  isLoading: boolean;
  formatRelativeDate: (value: string | null) => string;
  onOpen: (sanityDocumentId: string) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Slug</TableHead>
          <TableHead>Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={3} className="text-center text-muted-foreground">
              Loading Sanity products...
            </TableCell>
          </TableRow>
        ) : items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={3} className="text-center text-muted-foreground">
              Belum ada product Sanity atau koneksi belum siap.
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <TableRow key={item.sanityDocumentId} onClick={() => onOpen(item.sanityDocumentId)}>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-foreground">{item.title}</span>
                  <span className="truncate text-xs text-muted-foreground">{item.sanityDocumentId}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">/{item.slug}</TableCell>
              <TableCell className="text-muted-foreground">{formatRelativeDate(item.updatedAt)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function ServicesTable({
  items,
  isLoading,
  formatRelativeDate,
  onOpen,
}: {
  items: SanityServiceSummary[];
  isLoading: boolean;
  formatRelativeDate: (value: string | null) => string;
  onOpen: (sanityDocumentId: string) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Slug</TableHead>
          <TableHead>Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={3} className="text-center text-muted-foreground">
              Loading Sanity services...
            </TableCell>
          </TableRow>
        ) : items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={3} className="text-center text-muted-foreground">
              Belum ada service Sanity atau koneksi belum siap.
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <TableRow key={item.sanityDocumentId} onClick={() => onOpen(item.sanityDocumentId)}>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-foreground">{item.title}</span>
                  <span className="truncate text-xs text-muted-foreground">{item.sanityDocumentId}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">/{item.slug}</TableCell>
              <TableCell className="text-muted-foreground">{formatRelativeDate(item.updatedAt)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function ProjectsTable({
  items,
  isLoading,
  formatRelativeDate,
  onOpen,
}: {
  items: SanityProjectSummary[];
  isLoading: boolean;
  formatRelativeDate: (value: string | null) => string;
  onOpen: (sanityDocumentId: string) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Slug</TableHead>
          <TableHead>Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={3} className="text-center text-muted-foreground">
              Loading Sanity projects...
            </TableCell>
          </TableRow>
        ) : items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={3} className="text-center text-muted-foreground">
              Belum ada project Sanity atau koneksi belum siap.
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <TableRow key={item.sanityDocumentId} onClick={() => onOpen(item.sanityDocumentId)}>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-foreground">{item.title}</span>
                  <span className="truncate text-xs text-muted-foreground">{item.sanityDocumentId}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">/{item.slug}</TableCell>
              <TableCell className="text-muted-foreground">{formatRelativeDate(item.updatedAt)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

export function EditorStatusCard({ isDirty }: { isDirty: boolean }) {
  return (
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
  );
}

export function DashboardView({
  stats,
  notes,
  isLoading,
  selectedId,
  openNote,
  formatRelativeDate,
  retryPublishNote,
  retryingNoteId,
  config,
  scheduledCount,
  failedCount,
}: {
  stats: { draft: number; scheduled: number; published: number; failed: number };
  notes: Note[];
  isLoading: boolean;
  selectedId: string;
  openNote: (id: string) => void;
  formatRelativeDate: (value: string | null) => string;
  retryPublishNote: (noteId: string) => void;
  retryingNoteId: string | null;
  config: ApiConfig | null;
  scheduledCount: number;
  failedCount: number;
}) {
  return (
    <>
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

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Recent Notes</CardTitle>
            <CardDescription>Masuk ke editor saat memilih salah satu note.</CardDescription>
          </CardHeader>
          <CardContent>
            <NotesTable
              items={notes.slice(0, 8)}
              emptyLabel="Belum ada note."
              isLoading={isLoading}
              selectedId={selectedId}
              formatRelativeDate={formatRelativeDate}
              onOpenNote={openNote}
              onRetryPublish={retryPublishNote}
              retryingNoteId={retryingNoteId}
            />
          </CardContent>
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
              <Badge variant="outline">{config?.sanityConfigured ? "Ready" : "Not configured"}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Scheduled queue</span>
              <Badge variant="outline">{scheduledCount}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Failed publish</span>
              <Badge variant="outline">{failedCount}</Badge>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

export function ScheduledView({
  config,
  scheduledNotes,
  isLoading,
  selectedId,
  openNote,
  formatRelativeDate,
  retryPublishNote,
  retryingNoteId,
}: {
  config: ApiConfig | null;
  scheduledNotes: Note[];
  isLoading: boolean;
  selectedId: string;
  openNote: (id: string) => void;
  formatRelativeDate: (value: string | null) => string;
  retryPublishNote: (noteId: string) => void;
  retryingNoteId: string | null;
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Queue</CardTitle>
          <CardDescription>Daftar note yang akan dipublish oleh cron worker.</CardDescription>
        </CardHeader>
        <CardContent>
          <NotesTable
            items={scheduledNotes}
            emptyLabel="Belum ada note yang dijadwalkan."
            isLoading={isLoading}
            selectedId={selectedId}
            formatRelativeDate={formatRelativeDate}
            onOpenNote={openNote}
            onRetryPublish={retryPublishNote}
            retryingNoteId={retryingNoteId}
          />
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

export function SanitySyncView({
  config,
  publishedNotes,
  failedNotes,
  isLoading,
  selectedId,
  openNote,
  formatRelativeDate,
  retryPublishNote,
  retryingNoteId,
}: {
  config: ApiConfig | null;
  publishedNotes: Note[];
  failedNotes: Note[];
  isLoading: boolean;
  selectedId: string;
  openNote: (id: string) => void;
  formatRelativeDate: (value: string | null) => string;
  retryPublishNote: (noteId: string) => void;
  retryingNoteId: string | null;
}) {
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
            <NotesTable
              items={publishedNotes}
              emptyLabel="Belum ada note yang berhasil dipublish."
              isLoading={isLoading}
              selectedId={selectedId}
              formatRelativeDate={formatRelativeDate}
              onOpenNote={openNote}
              onRetryPublish={retryPublishNote}
              retryingNoteId={retryingNoteId}
            />
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium">Failed</h3>
            <NotesTable
              items={failedNotes}
              emptyLabel="Belum ada note yang gagal publish."
              isLoading={isLoading}
              selectedId={selectedId}
              formatRelativeDate={formatRelativeDate}
              onOpenNote={openNote}
              onRetryPublish={retryPublishNote}
              retryingNoteId={retryingNoteId}
              showRetryAction
            />
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
            <Badge variant="outline">{config?.sanityConfigured ? "Ready" : "Not configured"}</Badge>
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

export function ApiStatusView({
  config,
  scheduledCount,
  publishedCount,
}: {
  config: ApiConfig | null;
  scheduledCount: number;
  publishedCount: number;
}) {
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
          <span>Queued notes: {scheduledCount}</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sanity</CardTitle>
          <CardDescription>Readiness env publish.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <span>Configured: {config?.sanityConfigured ? "yes" : "no"}</span>
          <span>Published: {publishedCount}</span>
        </CardContent>
      </Card>
    </section>
  );
}
