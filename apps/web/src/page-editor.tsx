import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusIcon } from "lucide-react";

type Block = Record<string, string> & { type: string };

const BLOCK_TYPES = [
  "hero-1", "hero-2", "hero-vercel",
  "section-header",
  "split-row",
  "grid-row",
  "cta-1", "whatsapp-cta",
  "logo-cloud-1", "faqs", "form-newsletter", "all-posts",
  "features-package-block", "service-types-block", "value-props-block",
  "stats-hero-block", "company-info", "testimonials-block",
  "pricing-block", "faq-block",
  "eeat-block", "metrics-rail-block", "highlights-block",
  "reviews-block", "quote-spotlight-block",
  "related-links-block", "process-faq-block",
  "problem-solution-block", "micro-badges-block",
  "carousel-1", "carousel-2", "timeline-row",
  "legacy-rich-content", "flexible-builder",
];

function parseBlocks(json: string | null): Block[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((b): b is Block => b && typeof b === "object" && typeof b.type === "string");
  } catch {
    return [];
  }
}

function serializeBlocks(blocks: Block[]): string {
  if (blocks.length === 0) return "";
  return JSON.stringify(blocks, null, 2);
}

const COMMON_FIELDS = ["title", "tagline", "text", "description", "subtitle", "image", "rawUrl", "alt"];
const COLOR_FIELDS = ["colorVariant", "sectionWidth", "stackAlign", "uiIcon"];

function BlockEditDialog({
  open,
  onOpenChange,
  block,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: Block;
  onSave: (block: Block) => void;
}) {
  const [editBlock, setEditBlock] = useState<Block>({ ...block });
  const allKeys = [...new Set([...COMMON_FIELDS, ...COLOR_FIELDS, ...Object.keys(editBlock).filter(k => k !== "type")])];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Block</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Block Type</label>
            <Select value={editBlock.type} onValueChange={(v) => v && setEditBlock({ ...editBlock, type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BLOCK_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {allKeys.map((key) => (
            <div key={key} className="grid gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">{key}</label>
              {key === "text" || key === "description" ? (
                <Textarea
                  value={editBlock[key] ?? ""}
                  onChange={(e) => setEditBlock({ ...editBlock, [key]: e.target.value })}
                  className="min-h-[60px] resize-y text-sm"
                />
              ) : (
                <Input
                  value={editBlock[key] ?? ""}
                  onChange={(e) => setEditBlock({ ...editBlock, [key]: e.target.value })}
                />
              )}
            </div>
          ))}
          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">+ Add Field</label>
            <div className="flex gap-2">
              <Input
                placeholder="field-name"
                defaultValue=""
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const target = e.target as HTMLInputElement;
                    const val = target.value.trim();
                    if (val && !allKeys.includes(val) && val !== "type") {
                      setEditBlock({ ...editBlock, [val]: "" });
                      target.value = "";
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { onSave(editBlock); onOpenChange(false); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PageEditor({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (json: string | null) => void;
}) {
  const [blocks, setBlocks] = useState<Block[]>(() => parseBlocks(value));
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [newBlockType, setNewBlockType] = useState("hero-2");

  function updateBlocks(newBlocks: Block[]) {
    setBlocks(newBlocks);
    onChange(serializeBlocks(newBlocks) || null);
  }

  function handleSaveBlock(index: number, block: Block) {
    const copy = [...blocks];
    copy[index] = block;
    updateBlocks(copy);
  }

  function removeBlock(index: number) {
    updateBlocks(blocks.filter((_, i) => i !== index));
  }

  function addBlock() {
    const blank: Block = { type: newBlockType, title: "New Section", tagline: "", text: "" };
    updateBlocks([...blocks, blank]);
  }

  function moveBlock(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    const copy = [...blocks];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    updateBlocks(copy);
  }

  const editing = editIndex !== null && blocks[editIndex];

  return (
    <div className="grid gap-3">
      {blocks.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Belum ada block. Tambah block pertama.
        </div>
      )}

      {blocks.map((block, i) => {
        const keys = Object.keys(block).filter(k => k !== "type");
        return (
          <div key={i} className="group relative rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/30">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wider">
                {block.type}
              </span>
              {block.title && (
                <span className="truncate text-sm font-medium">{block.title}</span>
              )}
              <div className="ml-auto flex gap-0.5">
                <button
                  className="rounded p-1 text-muted-foreground hover:bg-muted"
                  onClick={() => moveBlock(i, -1)}
                  title="Move up"
                >↑</button>
                <button
                  className="rounded p-1 text-muted-foreground hover:bg-muted"
                  onClick={() => moveBlock(i, 1)}
                  title="Move down"
                >↓</button>
                <button
                  className="rounded p-1 text-muted-foreground hover:bg-muted"
                  onClick={() => setEditIndex(i)}
                  title="Edit"
                >✎</button>
                <button
                  className="rounded p-1 text-destructive hover:bg-destructive/10"
                  onClick={() => removeBlock(i)}
                  title="Remove"
                >×</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {keys.map(k => (
                <span key={k} className={k === "text" || k === "description" ? "truncate max-w-[300px]" : ""}>
                  {k}: {block[k] ? block[k].slice(0, 80) : ""}
                </span>
              ))}
            </div>
          </div>
        );
      })}

      {/* Add block */}
      <div className="flex items-center gap-2 pt-2">
        <Select value={newBlockType} onValueChange={(v) => v && setNewBlockType(v)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BLOCK_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => addBlock()}>
          <PlusIcon className="mr-1 size-3.5" /> Add Block
        </Button>
      </div>

      {/* Edit dialog */}
      {editing && editIndex !== null && (
        <BlockEditDialog
          open={true}
          onOpenChange={(open) => { if (!open) setEditIndex(null); }}
          block={editing}
          onSave={(block) => handleSaveBlock(editIndex, block)}
        />
      )}
    </div>
  );
}
