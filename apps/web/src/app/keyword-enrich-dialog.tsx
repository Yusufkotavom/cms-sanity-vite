import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2Icon, PlusIcon, SparklesIcon, Trash2Icon, Undo2Icon, SaveIcon, PencilIcon, CheckIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { notesApi } from "@/lib/api";

const PROMPT_STORAGE_KEY = "keyword-enrich-prompt-default";

const DEFAULT_ENRICH_PROMPT = `Anda adalah ahli SEO riset keyword profesional. Tugas anda adalah mengembangkan seed keyword menjadi peta keyword yang terstruktur, berdasarkan prinsip SEO modern.

## Prinsip SEO yang harus diikuti:
1. **Search Intent**: Setiap keyword harus memiliki intent jelas — informasional, komersial, atau transaksional
2. **Struktur Short → Long Tail**: Mulai dari head term (1-2 kata), kembangkan ke mid-tail (2-3 kata), lalu long-tail (3+ kata dengan intent spesifik)
3. **Real Demand**: Hasilkan keyword yang benar-benar dicari orang. Hindari keyword acak atau tidak realistis
4. **Topical Authority**: Keyword dalam satu cluster harus saling terkait secara semantik
5. **EEAT-Friendly**: Prioritaskan keyword yang menunjukkan expertise, pengalaman, dan trustworthiness
6. **AI Overview Resilience**: Untuk keyword broad informational, pastikan ada angle unik yang tidak bisa dijawab instant oleh AI Overview

## Output:
Kembalikan JSON dengan format:
{
  "suggestions": [
    { "keyword": "...", "description": "..." }
  ]
}

Setiap keyword harus memiliki deskripsi singkat yang menjelaskan:
- Intent pencarian (informational, commercial, transactional, navigational)
- Target audiens
- Sudut pandang konten yang disarankan

Hasilkan 8-20 keyword tergantung dari seed yang diberikan. Prioritaskan kualitas daripada kuantitas.`;

type SuggestionItem = {
  id: string;
  keyword: string;
  description: string;
  selected: boolean;
};

export function KeywordEnrichDialog({
  open,
  onOpenChange,
  initialKeywords,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialKeywords: string;
  onApply: (keywords: string) => void;
}) {
  const [seedText, setSeedText] = useState(initialKeywords);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(DEFAULT_ENRICH_PROMPT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKeyword, setEditKeyword] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSeedText(initialKeywords);
      setSuggestions([]);
      setError(null);
      setEditingId(null);
      try {
        const saved = localStorage.getItem(PROMPT_STORAGE_KEY);
        setPrompt(saved || DEFAULT_ENRICH_PROMPT);
      } catch {
        setPrompt(DEFAULT_ENRICH_PROMPT);
      }
    }
  }, [open, initialKeywords]);

  // Focus edit input when entering edit mode
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  const generateKeywords = useCallback(async () => {
    if (!seedText.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const result = await notesApi.enrichKeywords(seedText, prompt);
      const items: SuggestionItem[] = (result.suggestions ?? []).map((s, i) => ({
        id: `sug-${Date.now()}-${i}`,
        keyword: s.keyword,
        description: s.description ?? "",
        selected: true,
      }));
      setSuggestions((prev) => [...prev, ...items]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghasilkan keyword");
    } finally {
      setIsGenerating(false);
    }
  }, [seedText]);

  const toggleSuggestion = useCallback((id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s))
    );
  }, []);

  const removeSuggestion = useCallback((id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const startEditing = useCallback((item: SuggestionItem) => {
    setEditingId(item.id);
    setEditKeyword(item.keyword);
    setEditDescription(item.description);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
    setEditKeyword("");
    setEditDescription("");
  }, []);

  const saveEditing = useCallback(() => {
    if (!editingId) return;
    setSuggestions((prev) =>
      prev.map((s) =>
        s.id === editingId
          ? { ...s, keyword: editKeyword.trim(), description: editDescription.trim() }
          : s
      )
    );
    setEditingId(null);
  }, [editingId, editKeyword, editDescription]);

  const handleApply = useCallback(() => {
    // Only send selected suggestions (parent will append to existing batch)
    const selectedSuggestions = suggestions
      .filter((s) => s.selected)
      .map((s) => (s.description ? `${s.keyword} | ${s.description}` : s.keyword))
      .join("\n");

    onApply(selectedSuggestions);
    onOpenChange(false);
  }, [suggestions, onApply, onOpenChange]);

  const saveAsDefault = useCallback(() => {
    try {
      localStorage.setItem(PROMPT_STORAGE_KEY, prompt);
    } catch {
      // localStorage may be full
    }
  }, [prompt]);

  const restoreDefault = useCallback(() => {
    try {
      const saved = localStorage.getItem(PROMPT_STORAGE_KEY);
      setPrompt(saved || DEFAULT_ENRICH_PROMPT);
    } catch {
      setPrompt(DEFAULT_ENRICH_PROMPT);
    }
  }, []);

  const hasSavedDefault = (() => {
    try {
      return !!localStorage.getItem(PROMPT_STORAGE_KEY);
    } catch {
      return false;
    }
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Enrich Keywords</DialogTitle>
          <DialogDescription>
            Kembangkan seed keyword menjadi daftar keyword SEO terstruktur. AI akan menghasilkan variasi short-tail hingga long-tail berdasarkan prinsip SEO.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {/* Seed keywords textarea */}
          <div className="grid gap-2">
            <span className="text-sm font-medium">Seed Keywords</span>
            <Textarea
              value={seedText}
              onChange={(e) => setSeedText(e.target.value)}
              className="min-h-[100px] font-mono text-sm"
              placeholder={`jasa seo | optimasi toko online\nbuat website murah`}
            />
            <span className="text-xs text-muted-foreground">
              Tulis keyword | description satu per baris. AI akan mengembangkan dari sini.
            </span>
          </div>

          {/* AI Prompt */}
          <div className="grid gap-2">
            <span className="text-sm font-medium">AI Prompt</span>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[120px] font-mono text-xs"
              placeholder="Tulis prompt untuk AI keyword enrichment..."
            />
            <span className="text-xs text-muted-foreground">
              Prompt ini dikirim ke AI untuk menghasilkan keyword. Edit sesuai kebutuhan.
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => void generateKeywords()}
              disabled={isGenerating || !seedText.trim()}
              size="sm"
            >
              {isGenerating ? (
                <Loader2Icon data-icon="inline-start" className="animate-spin" />
              ) : (
                <SparklesIcon data-icon="inline-start" />
              )}
              {isGenerating ? "Generating..." : "Generate Keywords"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={saveAsDefault}
              disabled={!prompt.trim()}
            >
              <SaveIcon data-icon="inline-start" />
              Save Prompt as Default
            </Button>
            {hasSavedDefault && (
              <Button variant="outline" size="sm" onClick={restoreDefault}>
                <Undo2Icon data-icon="inline-start" />
                Restore Default Prompt
              </Button>
            )}
          </div>

          {/* Error state */}
          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              {error}
            </div>
          ) : null}

          {/* Results */}
          {suggestions.length > 0 ? (
            <div className="grid gap-2">
              <span className="text-sm font-medium">
                Generated Keywords ({suggestions.length})
              </span>
              <div className="grid gap-2">
                {suggestions.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-2 rounded-lg border border-border p-3"
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => toggleSuggestion(item.id)}
                      className="mt-1 size-3.5 shrink-0"
                    />

                    {/* Content */}
                    {editingId === item.id ? (
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <Input
                          ref={editInputRef}
                          value={editKeyword}
                          onChange={(e) => setEditKeyword(e.target.value)}
                          className="h-7 text-xs"
                          placeholder="Keyword"
                        />
                        <Input
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="h-7 text-xs"
                          placeholder="Deskripsi (opsional)"
                        />
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-6 w-6"
                            onClick={saveEditing}
                            disabled={!editKeyword.trim()}
                          >
                            <CheckIcon className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-6 w-6"
                            onClick={cancelEditing}
                          >
                            <XIcon className="size-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-sm font-medium text-foreground">
                          {item.keyword}
                        </span>
                        {item.description ? (
                          <span className="text-xs text-muted-foreground line-clamp-2">
                            {item.description}
                          </span>
                        ) : null}
                      </div>
                    )}

                    {/* Actions */}
                    {editingId !== item.id && (
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="h-6 w-6"
                          onClick={() => startEditing(item)}
                        >
                          <PencilIcon className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => removeSuggestion(item.id)}
                        >
                          <Trash2Icon className="size-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Empty state */}
          {suggestions.length === 0 && !isGenerating && seedText.trim() ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              Klik "Generate Keywords" untuk mengembangkan seed keyword menjadi daftar keyword SEO yang terstruktur.
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!seedText.trim() && suggestions.filter((s) => s.selected).length === 0}>
            <PlusIcon data-icon="inline-start" />
            Add to Batch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
