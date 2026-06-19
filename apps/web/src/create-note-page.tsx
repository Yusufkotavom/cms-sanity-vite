import { useState } from "react";
import {
  FileTextIcon,
  PuzzleIcon,
  PackageIcon,
  FolderKanbanIcon,
  FileIcon,
  Loader2Icon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type NoteType = "post" | "service" | "product" | "project" | "page";

const typeOptions: {
  value: NoteType;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "post",
    label: "Post",
    description: "Artikel blog, berita, atau konten editorial.",
    icon: <FileTextIcon className="size-5" />,
  },
  {
    value: "service",
    label: "Service",
    description: "Halaman layanan/jasa yang ditawarkan.",
    icon: <PuzzleIcon className="size-5" />,
  },
  {
    value: "product",
    label: "Product",
    description: "Halaman produk atau barang yang dijual.",
    icon: <PackageIcon className="size-5" />,
  },
  {
    value: "project",
    label: "Project",
    description: "Halaman portofolio atau studi kasus.",
    icon: <FolderKanbanIcon className="size-5" />,
  },
  {
    value: "page",
    label: "Page",
    description: "Halaman statis biasa (about, contact, dll).",
    icon: <FileIcon className="size-5" />,
  },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

type CreateNotePageProps = {
  onCreateNote: (type: NoteType, title: string, slug: string) => Promise<void>;
  isCreating: boolean;
};

export function CreateNotePage({ onCreateNote, isCreating }: CreateNotePageProps) {
  const [selectedType, setSelectedType] = useState<NoteType>("post");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");

  function handleTitleChange(value: string) {
    setTitle(value);
    setSlug(slugify(value));
  }

  function handleCreate() {
    void onCreateNote(selectedType, title, slug);
  }

  const isFormValid = title.trim().length > 0 && slug.trim().length > 0;

  return (
    <section className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Note</CardTitle>
          <CardDescription>
            Pilih tipe dokumen Sanity, lalu isi judul untuk mulai membuat note baru.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Type Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Tipe Dokumen</label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {typeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedType(option.value)}
                  className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors hover:bg-accent/50 ${
                    selectedType === option.value
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border bg-background"
                  }`}
                >
                  <div
                    className={`rounded-lg p-2 ${
                      selectedType === option.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {option.icon}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Title & Slug */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="create-title">
                Title
              </label>
              <Input
                id="create-title"
                placeholder="Judul note"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="create-slug">
                Slug
              </label>
              <Input
                id="create-slug"
                placeholder="auto-generated-from-title"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>
          </div>

          {/* Info */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <p>
              Note akan dibuat sebagai <strong>draft</strong> dengan tipe{" "}
              <strong>{typeOptions.find((o) => o.value === selectedType)?.label}</strong>.
              Setelah dibuat, kamu bisa mengedit konten, mengatur SEO, dan publish ke Sanity.
            </p>
          </div>

          {/* Create Button */}
          <div className="flex justify-end">
            <Button onClick={handleCreate} disabled={!isFormValid || isCreating} size="lg">
              {isCreating ? (
                <>
                  <Loader2Icon data-icon="inline-start" className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FileTextIcon data-icon="inline-start" />
                  Create Note
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
