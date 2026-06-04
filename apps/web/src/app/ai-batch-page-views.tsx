import {
  ArrowLeftIcon,
  Loader2Icon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  RefreshCcwIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";

import type {
  AiBatchDetail,
  AiBatchMode,
  AiBatchSummary,
  AiPromptTemplate,
  ApiConfig,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function describeBatchStatus(status: AiBatchSummary["status"]) {
  switch (status) {
    case "queued":
      return "Menunggu giliran. Worker belum mengambil keyword berikutnya.";
    case "processing":
      return "Worker sedang atau masih akan memproses keyword runnable satu per satu, bukan semua keyword sekaligus.";
    case "paused":
      return "Batch dihentikan sementara. Cron dan Process Now tidak akan mengambil keyword baru dari batch ini.";
    case "completed":
      return "Semua keyword di batch ini sudah selesai diproses.";
    case "failed":
      return "Tidak ada keyword runnable tersisa dan ada keyword yang gagal yang perlu diperiksa atau diedit.";
  }
}

function describeItemStatus(status: AiBatchDetail["items"][number]["status"]) {
  switch (status) {
    case "pending":
      return "Belum diproses.";
    case "processing":
      return "Sedang dikerjakan worker.";
    case "outline_done":
      return "Outline sudah jadi, menunggu step konten penuh bila mode mengharuskan.";
    case "completed":
      return "Keyword ini sudah menghasilkan draft note.";
    case "failed":
      return "Proses terakhir gagal. Edit akan mengembalikan item ke pending.";
  }
}

export function AiBatchOverviewCard({
  config,
  processLimitInput,
  setProcessLimitInput,
  refresh,
  isLoading,
  processNow,
  isProcessing,
  openCreateView,
}: {
  config: ApiConfig | null;
  processLimitInput: string;
  setProcessLimitInput: (value: string) => void;
  refresh: () => void;
  isLoading: boolean;
  processNow: () => void;
  isProcessing: boolean;
  openCreateView: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle>AI Batch</CardTitle>
            <CardDescription>
              Batch generator aman untuk free tier. Daftar run jadi pusat kerja utama, sedangkan form create dan edit dibuka sebagai page terpisah.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-end">
            <div className="grid gap-1">
              <Input
                type="number"
                min={1}
                max={config?.aiBatchMaxItemsPerRun ?? 10}
                value={processLimitInput}
                onChange={(event) => setProcessLimitInput(event.target.value)}
                className="w-full sm:w-24"
              />
              <span className="text-xs text-muted-foreground">
                Max {config?.aiBatchMaxItemsPerRun ?? 10} item per manual run.
              </span>
            </div>
            <Button variant="outline" onClick={refresh} disabled={isLoading}>
              <RefreshCcwIcon data-icon="inline-start" />
              Refresh
            </Button>
            <Button variant="outline" onClick={openCreateView}>
              <PlusIcon data-icon="inline-start" />
              New Batch
            </Button>
            <Button onClick={processNow} disabled={isProcessing || !config?.aiConfigured}>
              {isProcessing ? (
                <Loader2Icon data-icon="inline-start" className="animate-spin" />
              ) : (
                <PlayIcon data-icon="inline-start" />
              )}
              Process Now
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3 text-sm text-muted-foreground">
        <Badge variant="outline">Cron: {config?.cron ?? "*/15 * * * *"}</Badge>
        <Badge variant="outline">Max/process run: {config?.aiBatchMaxItemsPerRun ?? 10}</Badge>
        <Badge variant="outline">AI: {config?.aiConfigured ? config.aiModel : "Not configured"}</Badge>
      </CardContent>
    </Card>
  );
}

export function AiBatchRunsView({
  batches,
  isLoading,
  openBatch,
  toggleBatchStatus,
  togglingBatchId,
  removeBatch,
  deletingBatchId,
}: {
  batches: AiBatchSummary[];
  isLoading: boolean;
  openBatch: (batchId: string) => void;
  toggleBatchStatus: (batch: AiBatchSummary) => void;
  togglingBatchId: string | null;
  removeBatch: (batchId: string, batchName: string) => void;
  deletingBatchId: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Runs</CardTitle>
        <CardDescription>
          Semua run dikumpulkan dalam satu table. Klik row untuk membuka halaman detail dan edit batch.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-40 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Loading batches...
                </TableCell>
              </TableRow>
            ) : batches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Belum ada batch. Gunakan tombol `New Batch` untuk membuat antrean pertama.
                </TableCell>
              </TableRow>
            ) : (
              batches.map((batch) => (
                <TableRow key={batch.id} onClick={() => openBatch(batch.id)}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-foreground">{batch.name}</span>
                      <span className="text-xs text-muted-foreground">{batch.templateName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{batch.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{batch.mode}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {batch.completedItems}/{batch.totalItems} complete
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(batch.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(event) => {
                          event.stopPropagation();
                          openBatch(batch.id);
                        }}
                      >
                        <PencilIcon className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleBatchStatus(batch);
                        }}
                        disabled={
                          togglingBatchId === batch.id ||
                          batch.status === "processing" ||
                          (batch.status !== "queued" && batch.status !== "paused")
                        }
                      >
                        {togglingBatchId === batch.id ? (
                          <Loader2Icon className="size-3.5 animate-spin" />
                        ) : batch.status === "paused" ? (
                          <PlayIcon className="size-3.5" />
                        ) : (
                          <PauseIcon className="size-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeBatch(batch.id, batch.name);
                        }}
                        disabled={Boolean(deletingBatchId) || batch.status === "processing"}
                      >
                        {deletingBatchId === batch.id ? (
                          <Loader2Icon className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2Icon className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function AiBatchCreateView({
  batchName,
  setBatchName,
  batchMode,
  setBatchMode,
  selectedTemplateId,
  setSelectedTemplateId,
  templates,
  batchLines,
  setBatchLines,
  parsedItemsCount,
  createBatch,
  isCreating,
  cancel,
}: {
  batchName: string;
  setBatchName: (value: string) => void;
  batchMode: AiBatchMode;
  setBatchMode: (value: AiBatchMode) => void;
  selectedTemplateId: string;
  setSelectedTemplateId: (value: string) => void;
  templates: AiPromptTemplate[];
  batchLines: string;
  setBatchLines: (value: string) => void;
  parsedItemsCount: number;
  createBatch: () => void;
  isCreating: boolean;
  cancel: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>New Batch</CardTitle>
            <CardDescription>
              Form create dipisahkan dari table utama agar pembuatan run terasa seperti langkah terfokus, bukan bagian dari dashboard list.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={cancel}>
            <ArrowLeftIcon data-icon="inline-start" />
            Back to Runs
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="rounded-xl border border-border bg-muted/20 p-4 text-xs leading-relaxed">
          <p className="font-medium text-foreground">Cara kerja</p>
          <ol className="mt-2 ml-4 list-decimal space-y-1">
            <li>Tulis `keyword | description` satu per baris.</li>
            <li>Pilih mode dan template prompt yang sesuai.</li>
            <li>Klik `Create Batch` untuk memasukkan antrean ke list utama.</li>
            <li>Setelah dibuat, run akan dibuka ke halaman detail untuk monitoring dan edit lanjutan.</li>
          </ol>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Nama batch</span>
            <Input value={batchName} onChange={(event) => setBatchName(event.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Mode</span>
            <Select
              value={batchMode}
              onValueChange={(value) => {
                if (value) {
                  setBatchMode(value as AiBatchMode);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="outline_then_content">Outline then Content</SelectItem>
                <SelectItem value="outline_only">Outline Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Prompt template</span>
            <Select value={selectedTemplateId} onValueChange={(value) => setSelectedTemplateId(value ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-2">
          <span className="text-sm font-medium">Keywords + description</span>
          <Textarea
            value={batchLines}
            onChange={(event) => setBatchLines(event.target.value)}
            className="min-h-[320px] font-mono text-sm"
            placeholder={`jasa seo toko online | fokus conversion untuk UMKM\nsoftware akuntansi gratis | bandingkan fitur untuk bisnis kecil`}
          />
          <span className="text-xs text-muted-foreground">Parsed items: {parsedItemsCount}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={createBatch} disabled={isCreating || parsedItemsCount === 0}>
            {isCreating ? (
              <Loader2Icon data-icon="inline-start" className="animate-spin" />
            ) : (
              <SparklesIcon data-icon="inline-start" />
            )}
            Create Batch
          </Button>
          <Button variant="outline" onClick={cancel} disabled={isCreating}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function AiBatchDetailView({
  selectedBatch,
  workspaceSlug,
  templates,
  editForm,
  setEditForm,
  saveBatch,
  isSavingBatch,
  startEditingItem,
  editingItemId,
  itemForm,
  setItemForm,
  saveItem,
  isSavingItem,
  removeItem,
  deletingItemId,
  backToRuns,
}: {
  selectedBatch: AiBatchDetail | null;
  workspaceSlug: string;
  templates: AiPromptTemplate[];
  editForm: {
    name: string;
    mode: AiBatchMode;
    templateId: string;
    status: "queued" | "paused";
  };
  setEditForm: (next: {
    name: string;
    mode: AiBatchMode;
    templateId: string;
    status: "queued" | "paused";
  }) => void;
  saveBatch: () => void;
  isSavingBatch: boolean;
  startEditingItem: (item: AiBatchDetail["items"][number] | null) => void;
  editingItemId: string | null;
  itemForm: { keyword: string; description: string };
  setItemForm: (next: { keyword: string; description: string }) => void;
  saveItem: () => void;
  isSavingItem: boolean;
  removeItem: (itemId: string, keyword: string) => void;
  deletingItemId: string | null;
  backToRuns: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{selectedBatch?.name ?? "Batch Detail"}</CardTitle>
            <CardDescription>
              Halaman detail dipakai untuk edit metadata batch, memantau progress, dan mengelola keyword tanpa berdesakan dengan list utama.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={backToRuns}>
            <ArrowLeftIcon data-icon="inline-start" />
            Back to Runs
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 text-sm text-muted-foreground">
        {selectedBatch ? (
          <>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Overview</CardTitle>
                  <CardDescription>Ringkasan status dan kesehatan batch saat ini.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm text-muted-foreground">
                  <span>Status: {selectedBatch.status}</span>
                  <span>{describeBatchStatus(selectedBatch.status)}</span>
                  <span>Mode: {selectedBatch.mode}</span>
                  <span>Total: {selectedBatch.totalItems}</span>
                  <span>Completed: {selectedBatch.completedItems}</span>
                  <span>Failed: {selectedBatch.failedItems}</span>
                  <span>Pending: {selectedBatch.pendingItems}</span>
                  <span>Outline Ready: {selectedBatch.outlineReadyItems}</span>
                  <span>Processing Items: {selectedBatch.processingItems}</span>
                  <span>Updated: {formatDate(selectedBatch.updatedAt)}</span>
                  {selectedBatch.lastError ? (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive">
                      <p className="font-medium">Last failure</p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-xs">{selectedBatch.lastError}</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Edit Batch</CardTitle>
                  <CardDescription>
                    Ubah nama, mode, template, dan status antrean. Pilih `paused` untuk menghentikan sementara.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <span className="text-sm font-medium text-foreground">Nama batch</span>
                      <Input
                        value={editForm.name}
                        onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                        disabled={selectedBatch.status === "processing"}
                      />
                    </div>
                    <div className="grid gap-2">
                      <span className="text-sm font-medium text-foreground">Mode</span>
                      <Select
                        value={editForm.mode}
                        onValueChange={(value) => {
                          if (value) {
                            setEditForm({ ...editForm, mode: value as AiBatchMode });
                          }
                        }}
                        disabled={selectedBatch.status === "processing"}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="outline_then_content">Outline then Content</SelectItem>
                          <SelectItem value="outline_only">Outline Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <span className="text-sm font-medium text-foreground">Prompt template</span>
                      <Select
                        value={editForm.templateId}
                        onValueChange={(value) => setEditForm({ ...editForm, templateId: value ?? "" })}
                        disabled={selectedBatch.status === "processing"}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih template" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <span className="text-sm font-medium text-foreground">Status antrean</span>
                      <Select
                        value={editForm.status}
                        onValueChange={(value) => {
                          if (value === "queued" || value === "paused") {
                            setEditForm({ ...editForm, status: value });
                          }
                        }}
                        disabled={selectedBatch.status === "processing"}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="queued">queued</SelectItem>
                          <SelectItem value="paused">paused</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={saveBatch} disabled={isSavingBatch || selectedBatch.status === "processing"}>
                      {isSavingBatch ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : null}
                      Save Batch
                    </Button>
                    {selectedBatch.status === "processing" ? (
                      <span className="text-xs">Batch sedang diproses, ubahan status dikunci sampai run selesai.</span>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4 text-xs leading-relaxed">
              <p className="font-medium text-foreground">Generator status</p>
              <ol className="mt-2 ml-4 list-decimal space-y-1">
                <li><code>queued</code>: batch menunggu giliran. Worker belum mengambil keyword berikutnya.</li>
                <li><code>processing</code>: worker memproses keyword satu per satu.</li>
                <li><code>paused</code>: batch di-skip oleh cron dan Process Now sampai di-resume ke <code>queued</code>.</li>
                <li><code>outline_done</code>: keyword sudah punya outline, lalu menunggu step konten penuh bila mode batch adalah <code>outline_then_content</code>.</li>
                <li>Edit atau hapus keyword hanya diizinkan saat batch <code>paused</code>.</li>
              </ol>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Keywords</CardTitle>
                <CardDescription>
                  Keyword list tetap berbentuk table. Edit item dibuka di form bawah agar alur review tetap linear.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {selectedBatch.failedItems > 0 ? (
                  <div className="grid gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                    <div>
                      <p className="font-medium text-destructive">Failure Log</p>
                      <p className="text-xs text-muted-foreground">
                        Error terbaru per item gagal ditampilkan di sini agar lebih mudah tahu respons provider saat run gagal.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      {selectedBatch.items
                        .filter((item) => item.status === "failed" && item.lastError)
                        .map((item) => (
                          <div key={item.id} className="rounded-lg border border-destructive/20 bg-background/80 p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-foreground">{item.keyword}</span>
                              <Badge variant="outline">{item.status}</Badge>
                              <span className="text-xs text-muted-foreground">
                                Attempt {item.attempts} • {formatDate(item.updatedAt)}
                              </span>
                            </div>
                            <p className="mt-2 whitespace-pre-wrap break-words text-xs text-destructive">
                              {item.lastError}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : null}

                <div className="overflow-hidden rounded-xl border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Keyword</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-24 text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedBatch.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="font-medium text-foreground">{item.keyword}</span>
                              <span className="text-xs text-muted-foreground">{item.description || "-"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant="outline">{item.status}</Badge>
                              <span className="text-xs text-muted-foreground">{describeItemStatus(item.status)}</span>
                              {item.lastError ? (
                                <div className="rounded-md border border-destructive/20 bg-destructive/5 p-2 text-xs text-destructive whitespace-pre-wrap break-words">
                                  {item.lastError}
                                </div>
                              ) : null}
                              {item.noteId ? (
                                <a className="text-xs underline" href={`#/w/${workspaceSlug}/posts/${item.noteId}`}>
                                  Open draft
                                </a>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                disabled={selectedBatch.status !== "paused" || item.status === "processing"}
                                onClick={() => startEditingItem(item)}
                              >
                                <PencilIcon className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                disabled={selectedBatch.status !== "paused" || item.status === "processing" || deletingItemId === item.id}
                                onClick={() => removeItem(item.id, item.keyword)}
                              >
                                {deletingItemId === item.id ? (
                                  <Loader2Icon className="size-3.5 animate-spin" />
                                ) : (
                                  <Trash2Icon className="size-3.5" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {editingItemId ? (
                  <div className="grid gap-4 rounded-xl border border-border p-4">
                    <div className="grid gap-2">
                      <span className="text-sm font-medium text-foreground">Edit Keyword</span>
                      <span className="text-xs">
                        Mengubah keyword atau deskripsi akan mereset item ini ke <code>pending</code> agar generator memulai ulang item tersebut secara konsisten.
                      </span>
                    </div>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <span className="text-sm font-medium text-foreground">Keyword</span>
                        <Input
                          value={itemForm.keyword}
                          onChange={(event) => setItemForm({ ...itemForm, keyword: event.target.value })}
                          disabled={selectedBatch.status !== "paused" || isSavingItem}
                        />
                      </div>
                      <div className="grid gap-2">
                        <span className="text-sm font-medium text-foreground">Description</span>
                        <Textarea
                          value={itemForm.description}
                          onChange={(event) => setItemForm({ ...itemForm, description: event.target.value })}
                          disabled={selectedBatch.status !== "paused" || isSavingItem}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={saveItem} disabled={selectedBatch.status !== "paused" || isSavingItem}>
                        {isSavingItem ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : null}
                        Save Keyword
                      </Button>
                      <Button variant="outline" onClick={() => startEditingItem(null)} disabled={isSavingItem}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </>
        ) : (
          <span>Belum ada batch yang dipilih.</span>
        )}
      </CardContent>
    </Card>
  );
}

export function AiBatchTemplatesView({
  templates,
  templateDraft,
  setTemplateDraft,
  applyTemplate,
  saveTemplate,
  isSavingTemplate,
}: {
  templates: AiPromptTemplate[];
  templateDraft: {
    id: string;
    name: string;
    description: string;
    outlinePrompt: string;
    contentPrompt: string;
  };
  setTemplateDraft: (next: {
    id: string;
    name: string;
    description: string;
    outlinePrompt: string;
    contentPrompt: string;
  }) => void;
  applyTemplate: (id: string) => void;
  saveTemplate: () => void;
  isSavingTemplate: boolean;
}) {
  return (
    <TabsContent value="templates">
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Template List</CardTitle>
            <CardDescription>Pilih template untuk diedit atau buat baru.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setTemplateDraft({
                  id: "",
                  name: "",
                  description: "",
                  outlinePrompt: "",
                  contentPrompt: "",
                })
              }
            >
              Template Baru
            </Button>
            {templates.map((template) => (
              <Button
                key={template.id}
                variant={templateDraft.id === template.id ? "default" : "outline"}
                className="justify-start"
                onClick={() => applyTemplate(template.id)}
              >
                {template.name}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{templateDraft.id ? "Edit Template" : "New Template"}</CardTitle>
            <CardDescription>Prompt dipisah untuk outline dan content.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Input
              placeholder="Nama template"
              value={templateDraft.name}
              onChange={(event) => setTemplateDraft({ ...templateDraft, name: event.target.value })}
            />
            <Textarea
              placeholder="Deskripsi singkat template"
              value={templateDraft.description}
              onChange={(event) => setTemplateDraft({ ...templateDraft, description: event.target.value })}
            />
            <Textarea
              className="min-h-[220px]"
              placeholder="Outline prompt"
              value={templateDraft.outlinePrompt}
              onChange={(event) => setTemplateDraft({ ...templateDraft, outlinePrompt: event.target.value })}
            />
            <Textarea
              className="min-h-[220px]"
              placeholder="Content prompt"
              value={templateDraft.contentPrompt}
              onChange={(event) => setTemplateDraft({ ...templateDraft, contentPrompt: event.target.value })}
            />
            <div className="flex gap-2">
              <Button onClick={saveTemplate} disabled={isSavingTemplate}>
                {isSavingTemplate ? (
                  <Loader2Icon data-icon="inline-start" className="animate-spin" />
                ) : null}
                Save Template
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}
