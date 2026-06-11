import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { kbApi, type KbEntry, type KbEntryPayload, type KbEntryType, type KbResolveResult } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2Icon,
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  SearchIcon,
  UploadIcon,
  FlaskConicalIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ImageIcon,
  DownloadIcon,
} from "lucide-react";

const KB_TYPES: { value: KbEntryType; label: string }[] = [
  { value: "product", label: "Product" },
  { value: "url", label: "URL" },
  { value: "image", label: "Image" },
  { value: "block", label: "Content Block" },
  { value: "template", label: "Template" },
  { value: "faq", label: "FAQ" },
  { value: "policy", label: "Policy" },
];

const CATEGORIES = ["general", "website", "software", "it-support", "printing", "money-page", "blog"];

const MODES = ["metadata", "draft", "outline", "outline_to_post", "seo_only"];

type EntryFormState = {
  type: KbEntryType;
  category: string;
  title: string;
  content: string;
  keywords: string;
  modes: string;
  priority: number;
  isActive: boolean;
  metadataJson: string;
};

const EMPTY_FORM: EntryFormState = {
  type: "product",
  category: "",
  title: "",
  content: "",
  keywords: "",
  modes: "",
  priority: 0,
  isActive: true,
  metadataJson: "",
};

function entryToForm(entry: KbEntry): EntryFormState {
  return {
    type: entry.type,
    category: entry.category,
    title: entry.title,
    content: entry.content,
    keywords: entry.keywords,
    modes: entry.modes,
    priority: entry.priority,
    isActive: entry.isActive,
    metadataJson: entry.metadataJson ?? "",
  };
}

function formToPayload(form: EntryFormState): KbEntryPayload {
  return {
    type: form.type,
    category: form.category,
    title: form.title,
    content: form.content,
    keywords: form.keywords,
    modes: form.modes,
    priority: form.priority,
    isActive: form.isActive,
    metadataJson: form.metadataJson || null,
  };
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export function KnowledgeBasePage() {
  const [entries, setEntries] = useState<KbEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  const [sortField, setSortField] = useState<keyof KbEntry | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleSort = (field: keyof KbEntry) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedEntries = [...entries].sort((a, b) => {
    if (!sortField) return 0;
    const valA = a[sortField];
    const valB = b[sortField];

    if (valA === null || valA === undefined) return sortOrder === "asc" ? 1 : -1;
    if (valB === null || valB === undefined) return sortOrder === "asc" ? -1 : 1;

    if (typeof valA === "string" && typeof valB === "string") {
      return sortOrder === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }

    if (typeof valA === "number" && typeof valB === "number") {
      return sortOrder === "asc" ? valA - valB : valB - valA;
    }

    if (typeof valA === "boolean" && typeof valB === "boolean") {
      const numA = valA ? 1 : 0;
      const numB = valB ? 1 : 0;
      return sortOrder === "asc" ? numA - numB : numB - numA;
    }

    return 0;
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EntryFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveKeywords, setResolveKeywords] = useState("");
  const [resolveTitle, setResolveTitle] = useState("");
  const [resolveMode, setResolveMode] = useState("outline_to_post");
  const [resolveResult, setResolveResult] = useState<KbResolveResult | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: { type?: KbEntryType; category?: string; limit?: number; offset?: number } = { limit, offset };
      if (filterType !== "all") params.type = filterType as KbEntryType;
      if (filterCategory !== "all") params.category = filterCategory;
      const result = await kbApi.list(params);
      setEntries(result.items);
      setTotal(result.total);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load KB entries");
    } finally {
      setIsLoading(false);
    }
  }, [filterType, filterCategory, limit, offset]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  function openCreateDialog() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEditDialog(entry: KbEntry) {
    setEditingId(entry.id);
    setForm(entryToForm(entry));
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Title dan content wajib diisi");
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        await kbApi.update(editingId, formToPayload(form));
        toast.success("KB entry updated");
      } else {
        await kbApi.create(formToPayload(form));
        toast.success("KB entry created");
      }
      setDialogOpen(false);
      loadEntries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save KB entry");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const result = await kbApi.upload(file);
      toast.success("Gambar berhasil diupload!");
      if (form.type === "image") {
        setForm({
          ...form,
          content: result.url,
          metadataJson: JSON.stringify({ imageUrl: result.url }, null, 2),
        });
      } else {
        const separator = form.content.trim() ? "\n\n" : "";
        setForm({
          ...form,
          content: `${form.content}${separator}![${file.name.split(".")[0]}](${result.url})`,
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengupload gambar");
    } finally {
      setIsUploadingImage(false);
      e.target.value = "";
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus entry ini?")) return;
    try {
      await kbApi.remove(id);
      toast.success("KB entry deleted");
      loadEntries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  }

  async function handleResolve() {
    setIsResolving(true);
    try {
      const result = await kbApi.resolve({
        keywords: resolveKeywords,
        title: resolveTitle,
        mode: resolveMode,
        limit: 10,
      });
      setResolveResult(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Resolve failed");
    } finally {
      setIsResolving(false);
    }
  }

  async function handleImportJson() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.csv";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const filename = file.name.toLowerCase();

        if (filename.endsWith(".csv")) {
          const rows = parseCSV(text);
          if (rows.length === 0) {
            toast.error("File CSV kosong atau tidak valid.");
            return;
          }

          const payload = rows.map((row) => ({
            id: row.id || undefined,
            type: row.type || "product",
            category: row.category || "",
            title: row.title || "",
            content: row.content || "",
            keywords: row.keywords || "",
            modes: row.modes || "",
            priority: Number(row.priority || 0),
            isActive: row.isActive === "true" || row.isActive === "1" || row.isActive === "yes",
            metadataJson: row.metadataJson || null,
          }));

          const result = await kbApi.import(payload as any);
          toast.success(`Imported ${result.imported} entries from CSV`);
        } else {
          const data = JSON.parse(text);
          if (data.company || data.links || data.generationRules) {
            const result = await kbApi.seedFromCompanyInfo(data);
            toast.success(`Imported ${result.imported} entries from company info`);
          } else if (Array.isArray(data)) {
            const result = await kbApi.import(data);
            toast.success(`Imported ${result.imported} entries`);
          } else {
            toast.error("Invalid JSON format. Provide an array of entries or company-info JSON.");
            return;
          }
        }
        loadEntries();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Import failed");
      }
    };
    input.click();
  }

  function parseCSV(text: string) {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentValue = "";
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentValue += '"';
          i++; 
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentValue);
        currentValue = "";
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; 
        }
        row.push(currentValue);
        lines.push(row);
        row = [];
        currentValue = "";
      } else {
        currentValue += char;
      }
    }
    if (row.length > 0 || currentValue) {
      row.push(currentValue);
      lines.push(row);
    }
    
    if (lines.length < 2) return [];
    
    const headers = lines[0].map(h => h.trim());
    const result: Record<string, string>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i];
      if (values.length < headers.length) continue; 
      const entry: Record<string, string> = {};
      headers.forEach((header, index) => {
        entry[header] = values[index];
      });
      result.push(entry);
    }
    
    return result;
  }

  async function handleExportJson() {
    try {
      const params: { limit: number } = { limit: 1000 };
      const result = await kbApi.list(params);
      
      const exportData = result.items.map(entry => ({
        id: entry.id,
        type: entry.type,
        category: entry.category,
        title: entry.title,
        content: entry.content,
        keywords: entry.keywords,
        modes: entry.modes,
        priority: entry.priority,
        isActive: entry.isActive,
        metadataJson: entry.metadataJson,
      }));

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kb-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("KB entries exported successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    }
  }

  async function handleExportCsv() {
    try {
      const params: { limit: number } = { limit: 1000 };
      const result = await kbApi.list(params);
      
      const headers = ["id", "type", "category", "title", "content", "keywords", "modes", "priority", "isActive", "metadataJson"];
      const csvRows = [
        headers.join(","),
        ...result.items.map(item => {
          return headers.map(header => {
            const value = item[header as keyof KbEntry];
            let cellString = "";
            
            if (value === null || value === undefined) {
              cellString = "";
            } else if (typeof value === "boolean") {
              cellString = value ? "true" : "false";
            } else if (typeof value === "object") {
              cellString = JSON.stringify(value);
            } else {
              cellString = String(value);
            }
            
            const escaped = cellString.replace(/"/g, '""');
            return `"${escaped}"`;
          }).join(",");
        })
      ];

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kb-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("KB entries exported to CSV successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export CSV failed");
    }
  }

  const renderSortHeader = (field: keyof KbEntry, label: string) => {
    const isSorted = sortField === field;
    return (
      <div className="flex items-center gap-1 select-none">
        <span>{label}</span>
        {isSorted ? (
          sortOrder === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Knowledge Base</CardTitle>
              <CardDescription>
                Kelola entri knowledge base yang otomatis diinject ke prompt AI saat generate konten.
                Total: {total} entries.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setResolveOpen(true)}>
                <FlaskConicalIcon className="mr-1 h-4 w-4" />
                Test Resolver
              </Button>
              <Button variant="outline" size="sm" onClick={handleImportJson}>
                <UploadIcon className="mr-1 h-4 w-4" />
                Import
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportJson} disabled={isLoading}>
                <DownloadIcon className="mr-1 h-4 w-4" />
                Export JSON
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={isLoading}>
                <DownloadIcon className="mr-1 h-4 w-4" />
                Export CSV
              </Button>
              <Button size="sm" onClick={openCreateDialog}>
                <PlusIcon className="mr-1 h-4 w-4" />
                Add Entry
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-3">
            <Select value={filterType} onValueChange={(val) => { setFilterType(val ?? "all"); setOffset(0); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {KB_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={(val) => { setFilterCategory(val ?? "all"); setOffset(0); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(limit)} onValueChange={(val) => { setLimit(Number(val)); setOffset(0); }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Limit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 entries</SelectItem>
                <SelectItem value="20">20 entries</SelectItem>
                <SelectItem value="50">50 entries</SelectItem>
                <SelectItem value="100">100 entries</SelectItem>
                <SelectItem value="200">200 entries</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              Loading entries...
            </div>
          ) : sortedEntries.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Belum ada entri. Klik "Add Entry" atau "Import" untuk mulai mengisi knowledge base.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px] cursor-pointer hover:bg-muted/50 group" onClick={() => handleSort("type")}>
                    {renderSortHeader("type", "Type")}
                  </TableHead>
                  <TableHead className="w-[120px] cursor-pointer hover:bg-muted/50 group" onClick={() => handleSort("category")}>
                    {renderSortHeader("category", "Category")}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50 group" onClick={() => handleSort("title")}>
                    {renderSortHeader("title", "Title")}
                  </TableHead>
                  <TableHead className="w-[180px] cursor-pointer hover:bg-muted/50 group" onClick={() => handleSort("keywords")}>
                    {renderSortHeader("keywords", "Keywords")}
                  </TableHead>
                  <TableHead className="w-[90px] cursor-pointer hover:bg-muted/50 group" onClick={() => handleSort("priority")}>
                    {renderSortHeader("priority", "Priority")}
                  </TableHead>
                  <TableHead className="w-[90px] cursor-pointer hover:bg-muted/50 group" onClick={() => handleSort("isActive")}>
                    {renderSortHeader("isActive", "Active")}
                  </TableHead>
                  <TableHead className="w-[140px] cursor-pointer hover:bg-muted/50 group" onClick={() => handleSort("updatedAt")}>
                    {renderSortHeader("updatedAt", "Updated")}
                  </TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge variant="outline">{entry.type}</Badge>
                    </TableCell>
                    <TableCell>{entry.category || "—"}</TableCell>
                    <TableCell className="font-medium">{entry.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {entry.keywords ? entry.keywords.slice(0, 60) : "—"}
                    </TableCell>
                    <TableCell>{entry.priority}</TableCell>
                    <TableCell>
                      <Badge variant={entry.isActive ? "default" : "secondary"}>
                        {entry.isActive ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(entry.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(entry)}>
                          <PencilIcon className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(entry.id)}>
                          <Trash2Icon className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {total > 0 && (
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
              <div>
                Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} entries
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset === 0}
                  onClick={() => setOffset((prev) => Math.max(0, prev - limit))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset + limit >= total}
                  onClick={() => setOffset((prev) => prev + limit)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit KB Entry" : "Create KB Entry"}</DialogTitle>
            <DialogDescription>
              Entri ini akan otomatis dipilih dan diinject ke prompt AI berdasarkan keyword matching.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(val) => val && setForm({ ...form, type: val as KbEntryType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {KB_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={form.category || "_empty"} onValueChange={(val) => setForm({ ...form, category: val === "_empty" || !val ? "" : val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_empty">None</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Entry title" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label>Content</Label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    id="kb-image-upload"
                    className="sr-only"
                    onChange={handleImageUpload}
                    disabled={isUploadingImage}
                  />
                  <Label
                    htmlFor="kb-image-upload"
                    className={`inline-flex items-center gap-1 cursor-pointer text-xs text-primary hover:underline ${isUploadingImage ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    {isUploadingImage ? (
                      <>
                        <Loader2Icon className="h-3 w-3 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-3 w-3" />
                        <span>Upload Image</span>
                      </>
                    )}
                  </Label>
                </div>
              </div>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Knowledge content (markdown supported). This text will be injected into the AI prompt."
                rows={5}
              />
            </div>
            <div className="space-y-1">
              <Label>Keywords (comma-separated)</Label>
              <Input
                value={form.keywords}
                onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                placeholder="website, landing page, company profile"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Modes (comma-separated, empty = all)</Label>
                <Input
                  value={form.modes}
                  onChange={(e) => setForm({ ...form, modes: e.target.value })}
                  placeholder="outline,outline_to_post"
                />
              </div>
              <div className="space-y-1">
                <Label>Priority (higher = first)</Label>
                <Input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Metadata JSON (optional)</Label>
              <Input
                value={form.metadataJson}
                onChange={(e) => setForm({ ...form, metadataJson: e.target.value })}
                placeholder='{"url": "https://..."} or {"imageUrl": "https://..."}'
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="kb-active"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="kb-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Test KB Resolver</DialogTitle>
            <DialogDescription>
              Simulasikan bagaimana resolver memilih entri KB untuk sebuah post.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1">
              <Label>Keywords</Label>
              <Input
                value={resolveKeywords}
                onChange={(e) => setResolveKeywords(e.target.value)}
                placeholder="jasa pembuatan website company profile"
              />
            </div>
            <div className="space-y-1">
              <Label>Title</Label>
              <Input
                value={resolveTitle}
                onChange={(e) => setResolveTitle(e.target.value)}
                placeholder="Panduan Pembuatan Website Company Profile"
              />
            </div>
            <div className="space-y-1">
              <Label>Mode</Label>
              <Select value={resolveMode} onValueChange={(val) => val && setResolveMode(val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODES.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleResolve} disabled={isResolving}>
              {isResolving && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
              <SearchIcon className="mr-2 h-4 w-4" />
              Resolve
            </Button>
            {resolveResult && (
              <div className="space-y-2">
                <div className="text-sm">
                  Matched <strong>{resolveResult.entryCount}</strong> entries using terms:{" "}
                  <code className="text-xs">{resolveResult.terms.join(", ")}</code>
                </div>
                <pre className="max-h-[300px] overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap">
                  {resolveResult.context || "(no matches)"}
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
