import { useEffect, useMemo, useState } from "react";
import { Loader2Icon, PauseIcon, PencilIcon, PlayIcon, RefreshCcwIcon, SparklesIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  notesApi,
  type AiBatchDetail,
  type AiBatchMode,
  type AiBatchSummary,
  type AiPromptTemplate,
  type ApiConfig,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

function parseBatchLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [keyword, ...rest] = line.split("|");
      return {
        keyword: keyword?.trim() ?? "",
        description: rest.join("|").trim(),
      };
    })
    .filter((item) => item.keyword);
}

function formatDate(value: string) {
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

export function AiBatchPage({ config, workspaceSlug }: { config: ApiConfig | null; workspaceSlug: string }) {
  const [templates, setTemplates] = useState<AiPromptTemplate[]>([]);
  const [batches, setBatches] = useState<AiBatchSummary[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<AiBatchDetail | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [batchName, setBatchName] = useState("SEO Batch");
  const [batchMode, setBatchMode] = useState<AiBatchMode>("outline_then_content");
  const [batchLines, setBatchLines] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [processLimitInput, setProcessLimitInput] = useState("1");
  const [templateDraft, setTemplateDraft] = useState({
    id: "",
    name: "",
    description: "",
    outlinePrompt: "",
    contentPrompt: "",
  });
  const [editingBatch, setEditingBatch] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    mode: AiBatchMode;
    templateId: string;
    status: "queued" | "paused";
  }>({
    name: "",
    mode: "outline_then_content",
    templateId: "",
    status: "queued",
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [togglingBatchId, setTogglingBatchId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({ keyword: "", description: "" });
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const parsedItems = useMemo(() => parseBatchLines(batchLines), [batchLines]);

  useEffect(() => {
    void loadAll();
  }, [workspaceSlug]);

  function syncEditForm(batch: AiBatchDetail | null) {
    if (!batch) {
      setEditingBatch(null);
      setEditingItemId(null);
      setEditForm({
        name: "",
        mode: "outline_then_content",
        templateId: "",
        status: "queued",
      });
      return;
    }

    setEditingBatch(batch.id);
    setEditForm({
      name: batch.name,
      mode: batch.mode,
      templateId: batch.templateId,
      status: batch.status === "paused" ? "paused" : "queued",
    });
  }

  async function loadAll(selectedBatchId?: string) {
    setIsLoading(true);
    try {
      const [templateResponse, batchResponse] = await Promise.all([
        notesApi.listAiPromptTemplates(),
        notesApi.listAiBatches(),
      ]);

      setTemplates(templateResponse.items);
      setBatches(batchResponse.items);

      const defaultTemplate = templateResponse.items[0];
      if (defaultTemplate && !selectedTemplateId) {
        setSelectedTemplateId(defaultTemplate.id);
        setTemplateDraft({
          id: defaultTemplate.id,
          name: defaultTemplate.name,
          description: defaultTemplate.description,
          outlinePrompt: defaultTemplate.outlinePrompt,
          contentPrompt: defaultTemplate.contentPrompt,
        });
      }

      const nextBatchId = selectedBatchId ?? selectedBatch?.id ?? batchResponse.items.at(-1)?.id;
      if (nextBatchId) {
        await loadBatch(nextBatchId);
      } else {
        setSelectedBatch(null);
        syncEditForm(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load AI batch data");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadBatch(id: string) {
    try {
      const batch = await notesApi.getAiBatch(id);
      setSelectedBatch(batch);
      syncEditForm(batch);
      if (editingItemId) {
        const activeItem = batch.items.find((item) => item.id === editingItemId);
        if (activeItem) {
          setItemForm({ keyword: activeItem.keyword, description: activeItem.description });
        } else {
          setEditingItemId(null);
          setItemForm({ keyword: "", description: "" });
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load batch detail");
    }
  }

  function startEditingItem(item: AiBatchDetail["items"][number]) {
    setEditingItemId(item.id);
    setItemForm({ keyword: item.keyword, description: item.description });
  }

  function applyTemplate(id: string) {
    setSelectedTemplateId(id);
    const template = templates.find((item) => item.id === id);
    if (!template) return;

    setTemplateDraft({
      id: template.id,
      name: template.name,
      description: template.description,
      outlinePrompt: template.outlinePrompt,
      contentPrompt: template.contentPrompt,
    });
  }

  async function createBatch() {
    if (!config?.aiConfigured) {
      toast.error("AI settings belum aktif");
      return;
    }

    if (!selectedTemplateId) {
      toast.error("Pilih template prompt terlebih dulu");
      return;
    }

    if (parsedItems.length === 0) {
      toast.error("Tambahkan minimal satu keyword");
      return;
    }

    setIsCreating(true);
    try {
      const created = await notesApi.createAiBatch({
        name: batchName.trim() || "SEO Batch",
        mode: batchMode,
        templateId: selectedTemplateId,
        items: parsedItems,
      });
      setBatchLines("");
      setBatchName("SEO Batch");
      setSelectedBatch(created);
      toast.success("Batch dibuat");
      await loadAll(created.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create batch");
    } finally {
      setIsCreating(false);
    }
  }

  async function processBatchNow() {
    if (!config?.aiConfigured) {
      toast.error("AI settings belum aktif");
      return;
    }

    setIsProcessing(true);
    try {
      const requestedLimit = Number.parseInt(processLimitInput, 10);
      const safeLimit = Number.isFinite(requestedLimit)
        ? Math.max(1, Math.min(config.aiBatchMaxItemsPerRun, requestedLimit))
        : 1;
      const result = await notesApi.processAiBatches(safeLimit);
      toast.success(`Processed ${result.processed} item, failed ${result.failed}`);
      await loadAll(selectedBatch?.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to process AI batch");
    } finally {
      setIsProcessing(false);
    }
  }

  async function removeBatch(batchId: string, batchName: string) {
    if (!window.confirm(`Hapus batch "${batchName}" beserta semua item-nya?`)) {
      return;
    }

    setDeletingBatchId(batchId);
    setIsDeleting(true);
    try {
      await notesApi.deleteAiBatch(batchId);
      toast.success(`Batch "${batchName}" dihapus`);
      if (selectedBatch?.id === batchId) {
        setSelectedBatch(null);
        syncEditForm(null);
      }
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete batch");
    } finally {
      setDeletingBatchId(null);
      setIsDeleting(false);
    }
  }

  async function saveTemplate() {
    if (!templateDraft.name.trim()) {
      toast.error("Nama template wajib diisi");
      return;
    }

    setIsSavingTemplate(true);
    try {
      if (templateDraft.id) {
        const updated = await notesApi.updateAiPromptTemplate(templateDraft.id, {
          name: templateDraft.name.trim(),
          description: templateDraft.description,
          outlinePrompt: templateDraft.outlinePrompt,
          contentPrompt: templateDraft.contentPrompt,
        });
        toast.success("Template diperbarui");
        await loadAll(selectedBatch?.id);
        setSelectedTemplateId(updated.id);
        setTemplateDraft({
          id: updated.id,
          name: updated.name,
          description: updated.description,
          outlinePrompt: updated.outlinePrompt,
          contentPrompt: updated.contentPrompt,
        });
      } else {
        const created = await notesApi.createAiPromptTemplate({
          name: templateDraft.name.trim(),
          description: templateDraft.description,
          outlinePrompt: templateDraft.outlinePrompt,
          contentPrompt: templateDraft.contentPrompt,
        });
        toast.success("Template dibuat");
        await loadAll(selectedBatch?.id);
        setSelectedTemplateId(created.id);
        setTemplateDraft({
          id: created.id,
          name: created.name,
          description: created.description,
          outlinePrompt: created.outlinePrompt,
          contentPrompt: created.contentPrompt,
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save template");
    } finally {
      setIsSavingTemplate(false);
    }
  }

  async function saveBatch() {
    if (!selectedBatch || editingBatch !== selectedBatch.id) {
      return;
    }

    if (!editForm.name.trim()) {
      toast.error("Nama batch wajib diisi");
      return;
    }

    if (!editForm.templateId) {
      toast.error("Pilih template prompt untuk batch");
      return;
    }

    setIsSavingBatch(true);
    try {
      await notesApi.updateAiBatch(selectedBatch.id, {
        name: editForm.name.trim(),
        mode: editForm.mode,
        templateId: editForm.templateId,
        status: editForm.status,
      });
      toast.success("Batch diperbarui");
      await loadAll(selectedBatch.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update batch");
    } finally {
      setIsSavingBatch(false);
    }
  }

  async function toggleBatchStatus(batch: AiBatchSummary) {
    const nextStatus = batch.status === "paused" ? "queued" : "paused";

    setTogglingBatchId(batch.id);
    try {
      await notesApi.updateAiBatch(batch.id, { status: nextStatus });
      toast.success(nextStatus === "paused" ? `Batch "${batch.name}" dipause` : `Batch "${batch.name}" dilanjutkan`);
      await loadAll(selectedBatch?.id === batch.id ? batch.id : selectedBatch?.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update batch status");
    } finally {
      setTogglingBatchId(null);
    }
  }

  async function saveItem() {
    if (!selectedBatch || !editingItemId) {
      return;
    }

    if (selectedBatch.status !== "paused") {
      toast.error("Pause batch dulu sebelum edit keyword");
      return;
    }

    if (!itemForm.keyword.trim()) {
      toast.error("Keyword wajib diisi");
      return;
    }

    setIsSavingItem(true);
    try {
      await notesApi.updateAiBatchItem(selectedBatch.id, editingItemId, {
        keyword: itemForm.keyword.trim(),
        description: itemForm.description,
      });
      toast.success("Keyword diperbarui dan di-reset ke pending");
      await loadAll(selectedBatch.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update keyword");
    } finally {
      setIsSavingItem(false);
    }
  }

  async function removeItem(itemId: string, keyword: string) {
    if (!selectedBatch) {
      return;
    }

    if (selectedBatch.status !== "paused") {
      toast.error("Pause batch dulu sebelum hapus keyword");
      return;
    }

    if (!window.confirm(`Hapus keyword "${keyword}" dari batch ini?`)) {
      return;
    }

    setDeletingItemId(itemId);
    try {
      await notesApi.deleteAiBatchItem(selectedBatch.id, itemId);
      toast.success(`Keyword "${keyword}" dihapus`);
      if (editingItemId === itemId) {
        setEditingItemId(null);
        setItemForm({ keyword: "", description: "" });
      }
      await loadAll(selectedBatch.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete keyword");
    } finally {
      setDeletingItemId(null);
    }
  }

  return (
    <section className="grid gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>AI Batch</CardTitle>
              <CardDescription>
                Batch generator aman untuk free tier. Worker hanya memproses sedikit item per run.
              </CardDescription>
            </div>
              <div className="flex flex-wrap gap-2">
                <div className="grid gap-1">
                  <Input
                    type="number"
                    min={1}
                    max={config?.aiBatchMaxItemsPerRun ?? 10}
                    value={processLimitInput}
                    onChange={(event) => setProcessLimitInput(event.target.value)}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">
                    Manual process limit. Maksimal {config?.aiBatchMaxItemsPerRun ?? 10} item per klik.
                  </span>
                </div>
              <Button variant="outline" onClick={() => void loadAll(selectedBatch?.id)} disabled={isLoading}>
                <RefreshCcwIcon data-icon="inline-start" />
                Refresh
              </Button>
              <Button onClick={() => void processBatchNow()} disabled={isProcessing || !config?.aiConfigured}>
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

      <Tabs defaultValue="new-batch" className="grid gap-6">
        <TabsList>
          <TabsTrigger value="new-batch">New Batch</TabsTrigger>
          <TabsTrigger value="runs">Runs</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="new-batch">
          <Card>
            <CardHeader>
              <CardTitle>Buat Batch Baru</CardTitle>
              <CardDescription>
                Format input: `keyword | description`. Maksimal 20 item per batch.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
              <div className="rounded-xl border border-border bg-muted/20 p-4 text-xs leading-relaxed">
                <p className="font-medium text-foreground">Cara kerja New Batch:</p>
                <ol className="mt-2 ml-4 list-decimal space-y-1">
                  <li>Tulis keyword dan deskripsi singkat per baris. Pisahkan keyword dan deskripsi dengan tanda <code>|</code>.</li>
                  <li>Pilih <strong>mode</strong>: <code>outline_then_content</code> menghasilkan outline dulu lalu konten lengkap; <code>outline_only</code> hanya membuat outline.</li>
                  <li>Pilih <strong>prompt template</strong> yang sesuai. Template menentukan gaya tulisan dan instruksi AI.</li>
                  <li>Klik <strong>Create Batch</strong> untuk membuat antrean. Batch akan masuk ke tab <strong>Runs</strong> dengan status <code>queued</code>.</li>
                  <li>Worker cron akan otomatis memproses beberapa item tiap 15 menit, atau gunakan tombol <strong>Process Now</strong> di atas untuk memproses manual.</li>
                </ol>
              </div>
            </CardContent>
          </Card>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Form Batch</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
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
                  <Select
                    value={selectedTemplateId}
                    onValueChange={(value) => setSelectedTemplateId(value ?? "")}
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
              </div>

              <div className="grid gap-2">
                <span className="text-sm font-medium">Keywords + description</span>
                <Textarea
                  value={batchLines}
                  onChange={(event) => setBatchLines(event.target.value)}
                  className="min-h-[240px] font-mono text-sm"
                  placeholder={`jasa seo toko online | fokus conversion untuk UMKM\nsoftware akuntansi gratis | bandingkan fitur untuk bisnis kecil`}
                />
                <span className="text-xs text-muted-foreground">
                  Parsed items: {parsedItems.length}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void createBatch()} disabled={isCreating || parsedItems.length === 0}>
                  {isCreating ? (
                    <Loader2Icon data-icon="inline-start" className="animate-spin" />
                  ) : (
                    <SparklesIcon data-icon="inline-start" />
                  )}
                  Create Batch
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="runs">
          <Card className="mb-6">
            <CardContent className="p-4 text-xs leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground">Cara kerja Runs:</p>
              <ol className="mt-2 ml-4 list-decimal space-y-1">
                <li>Setiap batch yang dibuat dari tab <strong>New Batch</strong> muncul di sini dengan status <code>queued</code>.</li>
                <li>Klik tombol <strong>Process Now</strong> di atas untuk memproses item secara manual. Worker akan mengambil beberapa item dari batch <code>queued</code> atau <code>processing</code> dan menjalankan AI.</li>
                <li>Item yang berhasil outline-nya akan berstatus <code>outline_done</code>. Pada mode <code>outline_then_content</code>, item akan diproses lagi untuk membuat konten lengkap dan otomatis menjadi draft note.</li>
                <li>Item <code>completed</code> sudah punya draft note yang bisa dibuka di editor. Item <code>failed</code> akan di-retry otomatis pada run berikutnya.</li>
                <li>Status <code>paused</code> membuat batch dilewati oleh cron dan tombol <strong>Process Now</strong> sampai Anda ubah lagi ke <code>queued</code>.</li>
                <li>Gunakan tombol <strong>Delete</strong> untuk menghapus batch yang sudah tidak diperlukan beserta semua item-nya. Draft note yang sudah dibuat tidak ikut terhapus.</li>
              </ol>
            </CardContent>
          </Card>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <Card>
              <CardHeader>
                <CardTitle>Batch Runs</CardTitle>
                <CardDescription>Status batch dan progres item.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead className="w-32 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Loading batches...
                        </TableCell>
                      </TableRow>
                    ) : batches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Belum ada batch.
                        </TableCell>
                      </TableRow>
                    ) : (
                      batches.map((batch) => (
                        <TableRow key={batch.id} onClick={() => void loadBatch(batch.id)}>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">{batch.name}</span>
                              <span className="text-xs text-muted-foreground">{batch.templateName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{batch.status}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {batch.completedItems}/{batch.totalItems} complete
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void toggleBatchStatus(batch);
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
                                  void removeBatch(batch.id, batch.name);
                                }}
                                disabled={isDeleting || batch.status === "processing"}
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

            <Card>
              <CardHeader>
                <CardTitle>Batch Detail</CardTitle>
                <CardDescription>
                  {selectedBatch ? selectedBatch.name : "Pilih batch dari daftar kiri."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
                {selectedBatch ? (
                  <>
                    <div className="grid gap-2">
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
                      {selectedBatch.lastError ? <span>Error: {selectedBatch.lastError}</span> : null}
                    </div>
                    <div className="grid gap-4 rounded-xl border border-border p-4">
                      <div className="grid gap-2">
                        <span className="text-sm font-medium text-foreground">Edit Batch</span>
                        <span className="text-xs">
                          Ubah nama, mode, template, dan status antrean. Pilih <code>paused</code> untuk menghentikan sementara.
                        </span>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                          <span className="text-sm font-medium text-foreground">Nama batch</span>
                          <Input
                            value={editForm.name}
                            onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                            disabled={selectedBatch.status === "processing"}
                          />
                        </div>
                        <div className="grid gap-2">
                          <span className="text-sm font-medium text-foreground">Mode</span>
                          <Select
                            value={editForm.mode}
                            onValueChange={(value) => {
                              if (value) {
                                setEditForm((current) => ({ ...current, mode: value as AiBatchMode }));
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
                            onValueChange={(value) => setEditForm((current) => ({ ...current, templateId: value ?? "" }))}
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
                                setEditForm((current) => ({ ...current, status: value }));
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
                        <Button onClick={() => void saveBatch()} disabled={isSavingBatch || selectedBatch.status === "processing"}>
                          {isSavingBatch ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : null}
                          Save Batch
                        </Button>
                        {selectedBatch.status === "processing" ? (
                          <span className="text-xs">Batch sedang diproses, ubahan status dikunci sampai run selesai.</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-4 text-xs leading-relaxed">
                      <p className="font-medium text-foreground">Generator status</p>
                      <ol className="mt-2 ml-4 list-decimal space-y-1">
                        <li><code>queued</code>: batch menunggu giliran. Worker belum mengambil keyword berikutnya.</li>
                        <li><code>processing</code>: worker memproses keyword satu per satu. Satu batch tidak memproses semua keyword sekaligus.</li>
                        <li><code>paused</code>: batch di-skip oleh cron dan Process Now sampai di-resume ke <code>queued</code>.</li>
                        <li><code>outline_done</code>: keyword sudah punya outline, lalu menunggu step konten penuh bila mode batch adalah <code>outline_then_content</code>.</li>
                        <li>Edit atau hapus keyword hanya diizinkan saat batch <code>paused</code> agar worker tidak mengambil data yang sedang diubah.</li>
                      </ol>
                    </div>
                    <div className="max-h-[420px] overflow-y-auto rounded-xl border border-border">
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
                                  <span className="font-medium">{item.keyword}</span>
                                  <span className="text-xs text-muted-foreground">{item.description || "-"}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <Badge variant="outline">{item.status}</Badge>
                                  <span className="text-xs text-muted-foreground">{describeItemStatus(item.status)}</span>
                                  {item.noteId ? (
                                    <a className="text-xs underline" href={`#/posts/${item.noteId}`}>
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
                                    onClick={() => void removeItem(item.id, item.keyword)}
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
                              onChange={(event) => setItemForm((current) => ({ ...current, keyword: event.target.value }))}
                              disabled={selectedBatch.status !== "paused" || isSavingItem}
                            />
                          </div>
                          <div className="grid gap-2">
                            <span className="text-sm font-medium text-foreground">Description</span>
                            <Textarea
                              value={itemForm.description}
                              onChange={(event) => setItemForm((current) => ({ ...current, description: event.target.value }))}
                              disabled={selectedBatch.status !== "paused" || isSavingItem}
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={() => void saveItem()} disabled={selectedBatch.status !== "paused" || isSavingItem}>
                            {isSavingItem ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : null}
                            Save Keyword
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditingItemId(null);
                              setItemForm({ keyword: "", description: "" });
                            }}
                            disabled={isSavingItem}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <span>Belum ada batch yang dipilih.</span>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

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
                  onChange={(event) => setTemplateDraft((current) => ({ ...current, name: event.target.value }))}
                />
                <Textarea
                  placeholder="Deskripsi singkat template"
                  value={templateDraft.description}
                  onChange={(event) =>
                    setTemplateDraft((current) => ({ ...current, description: event.target.value }))
                  }
                />
                <Textarea
                  className="min-h-[220px]"
                  placeholder="Outline prompt"
                  value={templateDraft.outlinePrompt}
                  onChange={(event) =>
                    setTemplateDraft((current) => ({ ...current, outlinePrompt: event.target.value }))
                  }
                />
                <Textarea
                  className="min-h-[220px]"
                  placeholder="Content prompt"
                  value={templateDraft.contentPrompt}
                  onChange={(event) =>
                    setTemplateDraft((current) => ({ ...current, contentPrompt: event.target.value }))
                  }
                />
                <div className="flex gap-2">
                  <Button onClick={() => void saveTemplate()} disabled={isSavingTemplate}>
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
      </Tabs>
    </section>
  );
}
