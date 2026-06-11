import { useEffect, useState } from "react";

import type { SettingsPageProps } from "./types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { FieldInfo } from "./field-info";

type WorkspaceSettingsTabProps = Pick<
  SettingsPageProps,
  | "activeWorkspaceSlug"
  | "currentWorkspace"
  | "workspaces"
  | "workspaceForm"
  | "setWorkspaceForm"
  | "workspaceSanitySettings"
  | "setWorkspaceSanitySettings"
  | "setWorkspaceSanityTestFingerprint"
  | "loadWorkspaceIntoEditor"
  | "switchWorkspace"
  | "testWorkspaceSanityBeforeSave"
  | "saveWorkspace"
  | "resetWorkspaceEditor"
  | "deleteWorkspace"
  | "isTestingWorkspaceSanity"
  | "isSavingWorkspace"
  | "isDeletingWorkspace"
  | "isWorkspaceFormComplete"
  | "isWorkspaceSanityComplete"
  | "hasWorkspaceSanityTestPassed"
  | "slugify"
>;

export function WorkspaceSettingsTab({
  activeWorkspaceSlug,
  currentWorkspace,
  workspaces,
  workspaceForm,
  setWorkspaceForm,
  workspaceSanitySettings,
  setWorkspaceSanitySettings,
  setWorkspaceSanityTestFingerprint,
  loadWorkspaceIntoEditor,
  switchWorkspace,
  testWorkspaceSanityBeforeSave,
  saveWorkspace,
  resetWorkspaceEditor,
  deleteWorkspace,
  isTestingWorkspaceSanity,
  isSavingWorkspace,
  isDeletingWorkspace,
  isWorkspaceFormComplete,
  isWorkspaceSanityComplete,
  hasWorkspaceSanityTestPassed,
  slugify,
}: WorkspaceSettingsTabProps) {
  const [view, setView] = useState<"list" | "editor">("list");

  useEffect(() => {
    if (workspaceForm.id) {
      setView("editor");
    }
  }, [workspaceForm.id]);

  return (
    <TabsContent value="workspace" className="grid gap-6">
      {view === "list" ? (
        <Card>
          <CardHeader>
            <CardTitle>Workspace Setup</CardTitle>
            <CardDescription>Pilih workspace dari tabel untuk membuka editor yang lebih bersih.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div>
                Workspace aktif: <code>{activeWorkspaceSlug || "-"}</code>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  resetWorkspaceEditor();
                  setView("editor");
                }}
              >
                New workspace
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workspaces.map((workspace) => (
                    <TableRow key={workspace.id} onClick={() => {
                      loadWorkspaceIntoEditor(workspace);
                      setView("editor");
                    }}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-foreground">{workspace.name}</span>
                          {workspace.slug === activeWorkspaceSlug ? <span className="text-xs text-muted-foreground">active workspace</span> : null}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{workspace.slug}</TableCell>
                      <TableCell className="text-muted-foreground">{workspace.domain || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{workspace.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            loadWorkspaceIntoEditor(workspace);
                            setView("editor");
                          }}
                        >
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>{workspaceForm.id ? "Edit Workspace" : "New Workspace"}</CardTitle>
                <CardDescription>
                  Metadata workspace dan satu-satunya lokasi untuk kredensial Sanity per workspace.
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => setView("list")}>
                Kembali ke daftar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div>
                Workspace aktif: <code>{activeWorkspaceSlug || "-"}</code>
              </div>
              <div className="mt-2">
                Workspace editor: <code>{workspaceForm.id ? workspaceForm.slug || workspaceForm.id : "workspace baru"}</code>
              </div>
            </div>

            <div className="grid gap-4 rounded-xl border border-border p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <FieldInfo label="Workspace name" description="Nama tampilan workspace di sidebar dan settings." />
                <Input
                  value={workspaceForm.name}
                  onChange={(event) => setWorkspaceForm((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <FieldInfo label="Workspace slug" description="Slug unik untuk hash route dan identitas workspace." />
                <Input
                  value={workspaceForm.slug}
                  onChange={(event) =>
                    setWorkspaceForm((current) => ({ ...current, slug: slugify(event.target.value) }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <FieldInfo label="Domain" description="Opsional. Berguna untuk penandaan client atau mapping target site." />
                <Input
                  value={workspaceForm.domain}
                  onChange={(event) => setWorkspaceForm((current) => ({ ...current, domain: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <FieldInfo label="Timezone" description="Default sekarang Asia/Jakarta." />
                <Input
                  value={workspaceForm.timezone}
                  onChange={(event) => setWorkspaceForm((current) => ({ ...current, timezone: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <FieldInfo label="Status" description="Pakai archived untuk menonaktifkan workspace dari operasional harian." />
                <Select
                  value={workspaceForm.status}
                  onValueChange={(value) =>
                    setWorkspaceForm((current) => ({ ...current, status: value as "active" | "archived" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">active</SelectItem>
                    <SelectItem value="archived">archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <FieldInfo label="Description" description="Catatan singkat untuk membedakan fungsi atau client workspace." />
              <Textarea
                value={workspaceForm.description}
                onChange={(event) => setWorkspaceForm((current) => ({ ...current, description: event.target.value }))}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <FieldInfo label="Sanity project ID" description="Project Sanity target untuk workspace ini." />
                <Input
                  value={workspaceSanitySettings.projectId}
                  onChange={(event) => {
                    setWorkspaceSanityTestFingerprint("");
                    setWorkspaceSanitySettings((current) => ({ ...current, projectId: event.target.value }));
                  }}
                />
              </div>
              <div className="grid gap-2">
                <FieldInfo label="Dataset" description="Pilih dataset target untuk workspace ini." />
                <Select
                  value={workspaceSanitySettings.dataset}
                  onValueChange={(value) => {
                    if (!value) return;
                    setWorkspaceSanityTestFingerprint("");
                    setWorkspaceSanitySettings((current) => ({ ...current, dataset: value }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="development">development</SelectItem>
                    <SelectItem value="production">production</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <FieldInfo label="API version" description="Versi API Sanity yang dipakai saat query dan publish." />
                <Input
                  value={workspaceSanitySettings.apiVersion}
                  onChange={(event) => {
                    setWorkspaceSanityTestFingerprint("");
                    setWorkspaceSanitySettings((current) => ({ ...current, apiVersion: event.target.value }));
                  }}
                />
              </div>
              <div className="grid gap-2">
                <FieldInfo label="Write token" description="Token harus punya akses yang cukup untuk query category dan publish." />
                <Input
                  value={workspaceSanitySettings.writeToken}
                  placeholder={workspaceSanitySettings.hasWriteToken ? "********" : "Sanity write token"}
                  onChange={(event) => {
                    setWorkspaceSanityTestFingerprint("");
                    setWorkspaceSanitySettings((current) => ({ ...current, writeToken: event.target.value }));
                  }}
                />
              </div>
              <div className="grid gap-2">
                <FieldInfo label="Studio URL" description="URL Sanity Studio untuk workspace ini (misal: https://sanity-clean-studio.vercel.app). Kosongkan jika tidak perlu." />
                <Input
                  value={workspaceSanitySettings.studioUrl}
                  placeholder="https://sanity-clean-studio.vercel.app"
                  onChange={(event) => {
                    setWorkspaceSanitySettings((current) => ({ ...current, studioUrl: event.target.value }));
                  }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-border bg-muted/10 p-3 text-xs">
              Pengaturan Sanity sekarang cukup di sini saja agar tidak duplikat dan membingungkan.
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => workspaceForm.slug && switchWorkspace(workspaceForm.slug)}
                disabled={!workspaceForm.slug || workspaceForm.slug === activeWorkspaceSlug}
              >
                Jadikan workspace aktif
              </Button>
              <Button
                variant="outline"
                onClick={() => void testWorkspaceSanityBeforeSave()}
                disabled={isTestingWorkspaceSanity || !isWorkspaceSanityComplete}
              >
                {isTestingWorkspaceSanity ? "Testing..." : "Test workspace connection"}
              </Button>
              <Button
                onClick={() => void saveWorkspace()}
                disabled={isSavingWorkspace || !isWorkspaceFormComplete || !hasWorkspaceSanityTestPassed}
              >
                {isSavingWorkspace ? "Saving..." : workspaceForm.id ? "Update workspace" : "Create workspace"}
              </Button>
              <Button variant="outline" onClick={resetWorkspaceEditor}>
                Reset form
              </Button>
              <Button
                variant="destructive"
                onClick={() => void deleteWorkspace()}
                disabled={isDeletingWorkspace || !workspaceForm.id || workspaceForm.slug === "default"}
              >
                {isDeletingWorkspace ? "Deleting..." : "Delete workspace"}
              </Button>
            </div>

            <div className="grid gap-1 text-xs text-muted-foreground">
              <span>Metadata lengkap: {isWorkspaceFormComplete ? "yes" : "no"}</span>
              <span>Sanity lengkap: {isWorkspaceSanityComplete ? "yes" : "no"}</span>
              <span>Connection test terbaru: {hasWorkspaceSanityTestPassed ? "success" : "required"}</span>
              <span>Workspace status: {workspaceForm.status}</span>
              <span>Active workspace domain: {currentWorkspace?.domain || "-"}</span>
            </div>
            </div>
          </CardContent>
        </Card>
      )}
    </TabsContent>
  );
}
