import type { SettingsPageProps } from "./types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { FieldInfo } from "./field-info";

type WorkspaceSettingsTabProps = Pick<
  SettingsPageProps,
  | "activeWorkspaceSlug"
  | "currentWorkspace"
  | "workspaces"
  | "workspaceEditorSlug"
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
  workspaceEditorSlug,
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
  return (
    <TabsContent value="workspace" className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Workspace Setup</CardTitle>
          <CardDescription>
            Metadata workspace dan kredensial Sanity untuk proses create atau update workspace.
          </CardDescription>
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

          <div className="grid gap-2">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                className={`rounded-xl border p-3 text-left ${workspace.slug === workspaceEditorSlug ? "border-primary bg-primary/5" : "border-border"}`}
                onClick={() => loadWorkspaceIntoEditor(workspace)}
              >
                <div className="font-medium text-foreground">{workspace.name}</div>
                <div className="text-xs text-muted-foreground">{workspace.slug}</div>
                <div className="text-xs text-muted-foreground">{workspace.domain || "Tanpa domain"}</div>
                <div className="mt-2 flex gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {workspace.slug === activeWorkspaceSlug ? "active" : "inactive"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {workspace.slug === workspaceEditorSlug ? "editing" : "not editing"}
                  </span>
                </div>
              </button>
            ))}
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
                New workspace
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
    </TabsContent>
  );
}
