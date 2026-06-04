import { useEffect, useMemo, useState } from "react";
import { Loader2Icon, PlayIcon, RefreshCcwIcon, SparklesIcon } from "lucide-react";
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

  const parsedItems = useMemo(() => parseBatchLines(batchLines), [batchLines]);

  useEffect(() => {
    void loadAll();
  }, [workspaceSlug]);

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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load batch detail");
    }
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
              <Input
                type="number"
                min={1}
                max={config?.aiBatchMaxItemsPerRun ?? 3}
                value={processLimitInput}
                onChange={(event) => setProcessLimitInput(event.target.value)}
                className="w-24"
              />
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
          <Badge variant="outline">Max/process run: {config?.aiBatchMaxItemsPerRun ?? 3}</Badge>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          Loading batches...
                        </TableCell>
                      </TableRow>
                    ) : batches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
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
                      <span>Mode: {selectedBatch.mode}</span>
                      <span>Total: {selectedBatch.totalItems}</span>
                      <span>Completed: {selectedBatch.completedItems}</span>
                      <span>Failed: {selectedBatch.failedItems}</span>
                      <span>Updated: {formatDate(selectedBatch.updatedAt)}</span>
                      {selectedBatch.lastError ? <span>Error: {selectedBatch.lastError}</span> : null}
                    </div>
                    <div className="max-h-[420px] overflow-y-auto rounded-xl border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Keyword</TableHead>
                            <TableHead>Status</TableHead>
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
                                  {item.noteId ? (
                                    <a className="text-xs underline" href={`#/posts/${item.noteId}`}>
                                      Open draft
                                    </a>
                                  ) : null}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
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
