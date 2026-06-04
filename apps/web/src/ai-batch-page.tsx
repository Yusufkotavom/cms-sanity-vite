import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  type AiBatchDetail,
  type AiBatchMode,
  type AiBatchSummary,
  type AiPromptTemplate,
  type ApiConfig,
  notesApi,
} from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AiBatchCreateView,
  AiBatchDetailView,
  AiBatchOverviewCard,
  AiBatchRunsView,
  AiBatchTemplatesView,
} from "./app/ai-batch-page-views";

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

type RunsView = "list" | "new" | "detail";

export function AiBatchPage({ config, workspaceSlug }: { config: ApiConfig | null; workspaceSlug: string }) {
  const [activeTab, setActiveTab] = useState<"runs" | "templates">("runs");
  const [runsView, setRunsView] = useState<RunsView>("list");
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
      setEditingItemId(null);
      setEditForm({
        name: "",
        mode: "outline_then_content",
        templateId: "",
        status: "queued",
      });
      return;
    }

    setEditForm({
      name: batch.name,
      mode: batch.mode,
      templateId: batch.templateId,
      status: batch.status === "paused" ? "paused" : "queued",
    });
  }

  function resetNewBatchForm() {
    setBatchName("SEO Batch");
    setBatchMode("outline_then_content");
    setBatchLines("");
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

      const nextBatchId = selectedBatchId ?? selectedBatch?.id;
      if (nextBatchId && runsView === "detail") {
        await loadBatch(nextBatchId);
      } else if (batchResponse.items.length === 0) {
        setSelectedBatch(null);
        syncEditForm(null);
        if (runsView === "detail") {
          setRunsView("list");
        }
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

  async function openBatchDetail(batchId: string) {
    setActiveTab("runs");
    setRunsView("detail");
    await loadBatch(batchId);
  }

  function openCreateView() {
    setActiveTab("runs");
    setRunsView("new");
    setEditingItemId(null);
    setItemForm({ keyword: "", description: "" });
    resetNewBatchForm();
  }

  function backToRuns() {
    setRunsView("list");
    setEditingItemId(null);
    setItemForm({ keyword: "", description: "" });
  }

  function startEditingItem(item: AiBatchDetail["items"][number] | null) {
    if (!item) {
      setEditingItemId(null);
      setItemForm({ keyword: "", description: "" });
      return;
    }

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
      toast.success("Batch dibuat");
      await loadAll(created.id);
      resetNewBatchForm();
      setSelectedBatch(created);
      syncEditForm(created);
      setRunsView("detail");
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
      if (result.failed > 0) {
        const firstFailure = result.failures[0];
        const suffix = firstFailure ? ` First failure: ${firstFailure.message}` : "";
        toast.error(`Processed ${result.processed} item, failed ${result.failed}.${suffix}`);
      } else {
        toast.success(`Processed ${result.processed} item, failed ${result.failed}`);
      }
      await loadAll(selectedBatch?.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to process AI batch");
    } finally {
      setIsProcessing(false);
    }
  }

  async function removeBatch(batchId: string, batchNameValue: string) {
    if (!window.confirm(`Hapus batch "${batchNameValue}" beserta semua item-nya?`)) {
      return;
    }

    setDeletingBatchId(batchId);
    setIsDeleting(true);
    try {
      await notesApi.deleteAiBatch(batchId);
      toast.success(`Batch "${batchNameValue}" dihapus`);
      if (selectedBatch?.id === batchId) {
        setSelectedBatch(null);
        syncEditForm(null);
        setRunsView("list");
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
        applyTemplate(updated.id);
      } else {
        const created = await notesApi.createAiPromptTemplate({
          name: templateDraft.name.trim(),
          description: templateDraft.description,
          outlinePrompt: templateDraft.outlinePrompt,
          contentPrompt: templateDraft.contentPrompt,
        });
        toast.success("Template dibuat");
        await loadAll(selectedBatch?.id);
        applyTemplate(created.id);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save template");
    } finally {
      setIsSavingTemplate(false);
    }
  }

  async function saveBatch() {
    if (!selectedBatch) {
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
      startEditingItem(null);
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
        startEditingItem(null);
      }
      await loadAll(selectedBatch.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete keyword");
    } finally {
      setDeletingItemId(null);
    }
  }

  return (
    <section className="grid min-w-0 gap-6">
      <AiBatchOverviewCard
        config={config}
        processLimitInput={processLimitInput}
        setProcessLimitInput={setProcessLimitInput}
        refresh={() => void loadAll(selectedBatch?.id)}
        isLoading={isLoading}
        processNow={() => void processBatchNow()}
        isProcessing={isProcessing}
        openCreateView={openCreateView}
      />

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "runs" | "templates")}
        className="grid min-w-0 gap-6"
      >
        <div className="min-w-0 overflow-x-auto pb-1">
          <TabsList className="w-max min-w-max">
            <TabsTrigger value="runs">Runs</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="runs" className="min-w-0">
          {runsView === "new" ? (
            <AiBatchCreateView
              batchName={batchName}
              setBatchName={setBatchName}
              batchMode={batchMode}
              setBatchMode={setBatchMode}
              selectedTemplateId={selectedTemplateId}
              setSelectedTemplateId={setSelectedTemplateId}
              templates={templates}
              batchLines={batchLines}
              setBatchLines={setBatchLines}
              parsedItemsCount={parsedItems.length}
              createBatch={() => void createBatch()}
              isCreating={isCreating}
              cancel={backToRuns}
            />
          ) : runsView === "detail" ? (
            <AiBatchDetailView
              selectedBatch={selectedBatch}
              workspaceSlug={workspaceSlug}
              templates={templates}
              editForm={editForm}
              setEditForm={setEditForm}
              saveBatch={() => void saveBatch()}
              isSavingBatch={isSavingBatch}
              startEditingItem={startEditingItem}
              editingItemId={editingItemId}
              itemForm={itemForm}
              setItemForm={setItemForm}
              saveItem={() => void saveItem()}
              isSavingItem={isSavingItem}
              removeItem={(itemId, keyword) => void removeItem(itemId, keyword)}
              deletingItemId={deletingItemId}
              backToRuns={backToRuns}
            />
          ) : (
            <AiBatchRunsView
              batches={batches}
              isLoading={isLoading}
              openBatch={(batchId) => void openBatchDetail(batchId)}
              toggleBatchStatus={(batch) => void toggleBatchStatus(batch)}
              togglingBatchId={togglingBatchId}
              removeBatch={(batchId, batchNameValue) => void removeBatch(batchId, batchNameValue)}
              deletingBatchId={isDeleting ? deletingBatchId : null}
            />
          )}
        </TabsContent>

        <AiBatchTemplatesView
          templates={templates}
          templateDraft={templateDraft}
          setTemplateDraft={setTemplateDraft}
          applyTemplate={applyTemplate}
          saveTemplate={() => void saveTemplate()}
          isSavingTemplate={isSavingTemplate}
        />
      </Tabs>
    </section>
  );
}
