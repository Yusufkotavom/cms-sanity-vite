import type { SettingsPageProps } from "./types";

import { ChevronDownIcon, Loader2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { FieldInfo } from "./field-info";

type AiSettingsTabProps = Pick<
  SettingsPageProps,
  | "aiSettings"
  | "setAiSettings"
  | "saveAiSettings"
  | "testAiSettings"
  | "isTestingAiSettings"
  | "aiConnectionTestResult"
  | "config"
>;

const MODEL_PRESETS = [
  {
    label: "OpenRouter",
    providerPreset: "openrouter",
    name: "OpenRouter",
    apiBaseUrl: "https://openrouter.ai/api/v1",
    model: "openai/gpt-4o-mini",
    maxTokens: 8192,
  },
  {
    label: "Gemini Compatible",
    providerPreset: "gemini",
    name: "Gemini OpenAI Compatible",
    apiBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.5-pro",
    maxTokens: 8192,
  },
  {
    label: "Groq",
    providerPreset: "groq",
    name: "Groq",
    apiBaseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    maxTokens: 4096,
  },
  {
    label: "Custom",
    providerPreset: "custom",
    name: "Custom OpenAI Compatible",
    apiBaseUrl: "",
    model: "",
    maxTokens: 4096,
  },
] as const;

const GLOBAL_PROMPT_PRESETS = [
  {
    label: "Indonesia SEO E-E-A-T Marketing",
    values: {
      systemPrompt:
        "Anda adalah editor senior konten berbahasa Indonesia untuk brand dan website bisnis. Fokus pada artikel SEO yang bermanfaat, akurat, mudah dipahami, dan siap publish. Utamakan prinsip E-E-A-T: pengalaman nyata, keahlian, otoritas, dan kepercayaan. Hindari klaim berlebihan, data fiktif, dan fluff. Tulis dengan sudut pandang marketing yang tetap jujur, membantu pembaca, dan mendorong conversion secara natural.",
      metadataPrompt:
        "Buat metadata SEO berbahasa Indonesia yang kuat untuk search intent komersial maupun informasional. Judul harus jelas, meyakinkan, dan relevan dengan keyword utama tanpa clickbait. Meta description harus ringkas, human, dan mendorong klik. SEO keywords cukup natural, tidak stuffing. OG title dan description harus tetap enak dibaca saat dibagikan di social media.",
      draftPrompt:
        "Tulis draft artikel Indonesia yang terasa seperti ditulis editor marketing yang paham SEO. Buka dengan hook yang jelas, jawab intent pembaca secepat mungkin, lalu susun isi dengan subheading yang rapi. Sertakan penjelasan konkret, contoh praktis, dan sudut pandang yang menunjukkan pengalaman nyata. Hindari kalimat generik AI, pengulangan, dan isi yang terlalu normatif tanpa value.",
      outlinePrompt:
        "Buat outline artikel SEO berbahasa Indonesia yang siap dikembangkan menjadi post berkualitas tinggi. Struktur harus mengikuti intent keyword, mencakup topik inti, FAQ bila relevan, angle E-E-A-T, dan poin yang membantu conversion atau trust building. Pastikan urutan heading logis, tidak tumpang tindih, dan cocok untuk pembaca Indonesia.",
      outlineToPostPrompt:
        "Ubah outline menjadi artikel lengkap berbahasa Indonesia yang kuat secara SEO dan marketing. Jaga akurasi, berikan penjelasan bernilai, gunakan gaya yang meyakinkan tetapi tidak berlebihan, dan tunjukkan prinsip E-E-A-T dalam isi. Artikel harus enak dibaca, bisa dipublish langsung, dan tetap fokus pada keyword utama serta kebutuhan pembaca.",
    },
  },
  {
    label: "SEO Informational",
    values: {
      systemPrompt:
        "Anda adalah editor konten SEO informasional berbahasa Indonesia. Prioritaskan kejelasan, helpfulness, akurasi, dan struktur yang mudah dipindai. Tugas Anda adalah membantu pembaca memahami topik secara tuntas tanpa clickbait dan tanpa over-selling.",
      metadataPrompt:
        "Tulis metadata SEO yang fokus pada intent informasional. Judul harus menjanjikan jawaban yang jelas. Meta description harus singkat, relevan, dan menunjukkan nilai artikel. Hindari wording yang terlalu promosi.",
      draftPrompt:
        "Tulis artikel edukatif berbahasa Indonesia yang langsung menjawab pertanyaan utama pembaca. Gunakan struktur yang rapi, penjelasan konkret, dan contoh bila relevan. Jaga tone tetap profesional, lugas, dan mudah dipahami.",
      outlinePrompt:
        "Buat outline artikel informasional SEO yang menjawab pertanyaan pembaca dari dasar hingga insight praktis. Prioritaskan definisi, penjelasan, langkah, contoh, dan FAQ bila relevan.",
      outlineToPostPrompt:
        "Ubah outline menjadi artikel edukatif yang lengkap, jelas, dan enak dibaca. Pastikan tiap bagian menjawab intent informasional, mengalir logis, dan tidak bertele-tele.",
    },
  },
  {
    label: "SEO Transactional",
    values: {
      systemPrompt:
        "Anda adalah editor SEO untuk konten komersial berbahasa Indonesia. Fokus pada intent pembaca yang sedang membandingkan solusi, mencari vendor, atau mempertimbangkan pembelian. Tone harus persuasif tetapi tetap jujur dan kredibel.",
      metadataPrompt:
        "Tulis metadata SEO untuk intent transaksional atau komersial. Judul dan description harus memperjelas manfaat, pembeda, atau alasan memilih solusi tanpa terkesan spam.",
      draftPrompt:
        "Tulis artikel SEO komersial yang membantu pembaca mengambil keputusan. Jelaskan masalah, opsi solusi, kriteria memilih, kelebihan, keterbatasan, dan CTA yang natural. Tetap tampilkan E-E-A-T dan hindari hard selling berlebihan.",
      outlinePrompt:
        "Buat outline artikel transaksional yang cocok untuk keyword komersial. Sertakan pain points, solusi, perbandingan, manfaat, proof, objection handling, dan CTA lembut.",
      outlineToPostPrompt:
        "Ubah outline menjadi artikel komersial yang kuat untuk conversion dan SEO. Gunakan bahasa Indonesia yang meyakinkan, jelas, dan credible, tanpa membuat klaim kosong.",
    },
  },
  {
    label: "Landing Page Marketing",
    values: {
      systemPrompt:
        "Anda adalah conversion-focused marketing writer berbahasa Indonesia. Tugas Anda adalah membuat copy yang jelas, ringkas, dan mendorong aksi. Fokus pada value proposition, pain points, benefits, proof, dan CTA yang kuat.",
      metadataPrompt:
        "Tulis title, description, dan OG copy yang terasa seperti landing page marketing: jelas, tajam, dan fokus pada manfaat utama serta hasil yang diinginkan audiens.",
      draftPrompt:
        "Tulis copy landing page atau halaman marketing dengan alur yang menjual: masalah, solusi, manfaat, bukti, objection handling, dan CTA. Gunakan bahasa Indonesia yang persuasive tetapi tidak lebay.",
      outlinePrompt:
        "Buat outline halaman marketing yang terstruktur untuk conversion: hero, pain points, solusi, manfaat, proof, FAQ, dan CTA. Susun agar mudah dipindai dan kuat di above-the-fold.",
      outlineToPostPrompt:
        "Ubah outline menjadi copy landing page lengkap yang ringkas, persuasive, dan fokus pada conversion. Pastikan tiap section mendorong pembaca ke aksi berikutnya.",
    },
  },
  {
    label: "B2B Thought Leadership",
    values: {
      systemPrompt:
        "Anda adalah editor thought leadership B2B berbahasa Indonesia. Tulis seperti operator atau strategist yang berpengalaman, dengan insight kuat, argumentasi tajam, dan tone profesional. Fokus pada kredibilitas dan nilai pemikiran, bukan sekadar konten generik.",
      metadataPrompt:
        "Tulis metadata yang mencerminkan insight, perspektif, dan otoritas. Hindari clickbait. Gunakan judul yang relevan untuk audiens profesional dan decision-maker.",
      draftPrompt:
        "Tulis artikel B2B yang menunjukkan pemahaman pasar, pengalaman nyata, dan sudut pandang yang matang. Gunakan struktur argumentatif yang kuat, contoh relevan, dan poin praktis untuk pengambil keputusan.",
      outlinePrompt:
        "Buat outline artikel thought leadership B2B yang menggabungkan konteks pasar, tantangan, insight, argumen utama, rekomendasi, dan implikasi strategis.",
      outlineToPostPrompt:
        "Ubah outline menjadi artikel thought leadership yang bernas, credible, dan relevan untuk audiens B2B. Hindari gaya generik, tonjolkan insight dan pengalaman nyata.",
    },
  },
] as const;

function createModelFromPreset(preset: (typeof MODEL_PRESETS)[number]) {
  return {
    id: crypto.randomUUID(),
    name: preset.name,
    providerPreset: preset.providerPreset,
    apiBaseUrl: preset.apiBaseUrl,
    apiKey: "",
    hasApiKey: false,
    model: preset.model,
    maxTokens: preset.maxTokens,
  };
}

export function AiSettingsTab({
  aiSettings,
  setAiSettings,
  saveAiSettings,
  testAiSettings,
  isTestingAiSettings,
  aiConnectionTestResult,
  config,
}: AiSettingsTabProps) {
  const isInheritMode = Boolean(aiSettings && !aiSettings.isDefaultWorkspace && aiSettings.inheritFromDefault);
  const isModelsReadonly = isInheritMode;

  function updateModel(
    modelId: string,
    patch: Partial<NonNullable<AiSettingsTabProps["aiSettings"]>["models"][number]>
  ) {
    setAiSettings((current) =>
      current
        ? {
            ...current,
            models: current.models.map((model) => (model.id === modelId ? { ...model, ...patch } : model)),
          }
        : current
    );
  }

  function addModel(preset: (typeof MODEL_PRESETS)[number]) {
    const nextModel = createModelFromPreset(preset);
    setAiSettings((current) =>
      current
        ? {
            ...current,
            models: [...current.models, nextModel],
            defaultModelId: current.defaultModelId || nextModel.id,
          }
        : current
    );
  }

  function removeModel(modelId: string) {
    setAiSettings((current) => {
      if (!current) return current;
      const nextModels = current.models.filter((model) => model.id !== modelId);
      return {
        ...current,
        models: nextModels,
        defaultModelId:
          current.defaultModelId === modelId ? (nextModels[0]?.id ?? "") : current.defaultModelId,
      };
    });
  }

  function applyPromptPrefill(values: (typeof GLOBAL_PROMPT_PRESETS)[number]["values"]) {
    setAiSettings((current) => (current ? { ...current, ...values } : current));
  }

  function setInheritMode(checked: boolean) {
    setAiSettings((current) =>
      current
        ? {
            ...current,
            inheritFromDefault: checked,
          }
        : current
    );
  }

  return (
    <TabsContent value="ai" className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Settings</CardTitle>
          <CardDescription>
            Workspace `default` menjadi sumber model AI utama. Workspace lain bisa mewarisi model dari `default`, tetapi prompt tetap dikelola per workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 text-sm text-muted-foreground">
          {aiSettings ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Mode</CardTitle>
                  <CardDescription>
                    Tentukan apakah workspace ini memakai model AI dari `default` atau model khusus workspace aktif.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  {aiSettings.isDefaultWorkspace ? (
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      Workspace ini adalah sumber model AI utama untuk workspace lain. Model default, provider, endpoint, dan API key dari sini bisa dipakai workspace yang memilih inherit.
                    </div>
                  ) : (
                    <label className="flex items-start gap-3 rounded-xl border border-border p-4">
                      <Checkbox checked={aiSettings.inheritFromDefault} onCheckedChange={(checked) => setInheritMode(Boolean(checked))} />
                      <div className="grid gap-1">
                        <span className="font-medium text-foreground">Use default workspace AI settings</span>
                        <span>
                          Jika aktif, AI assist, batch, cron, dan rewrite preview akan memakai model aktif dari workspace `{aiSettings.sourceWorkspaceSlug}`. Prompt tetap milik workspace ini.
                        </span>
                      </div>
                    </label>
                  )}

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span>Source:</span>
                    <Badge variant="outline">{aiSettings.sourceWorkspaceSlug}</Badge>
                    <span>{aiSettings.sourceWorkspaceName}</span>
                    {isInheritMode ? <Badge>Inherited</Badge> : <Badge variant="outline">Custom / Active</Badge>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">AI Models</CardTitle>
                  <CardDescription>
                    Tambah beberapa profile model, lalu pilih satu default yang dipakai untuk AI assist dan batch generator.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="flex flex-wrap gap-2">
                    {MODEL_PRESETS.map((preset) => (
                      <Button key={preset.label} variant="outline" onClick={() => addModel(preset)} disabled={isModelsReadonly}>
                        Tambah {preset.label}
                      </Button>
                    ))}
                  </div>

                  {aiSettings.models.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-4 text-xs">
                      Belum ada model profile. Tambah salah satu preset di atas lalu set sebagai default.
                    </div>
                  ) : (
                    aiSettings.models.map((model, index) => {
                      const isDefault = aiSettings.defaultModelId === model.id;
                      return (
                        <details key={model.id} className="group rounded-xl border border-border" open={isDefault || index === 0}>
                          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <span className="font-medium text-foreground">{model.name || `Model ${index + 1}`}</span>
                              <Badge variant="outline">{model.providerPreset || "custom"}</Badge>
                              {isDefault ? <Badge>Default</Badge> : null}
                              <span className="truncate text-xs">{model.model || "Model ID belum diisi"}</span>
                            </div>
                            <ChevronDownIcon className="size-4 transition-transform group-open:rotate-180" />
                          </summary>

                          <div className="grid gap-4 border-t border-border p-4 pt-4">
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                variant={isDefault ? "default" : "outline"}
                                size="sm"
                                disabled={isModelsReadonly}
                                onClick={() =>
                                  setAiSettings((current) => (current ? { ...current, defaultModelId: model.id } : current))
                                }
                              >
                                {isDefault ? "Default aktif" : "Set default"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeModel(model.id)}
                                disabled={isModelsReadonly || aiSettings.models.length === 1}
                              >
                                Hapus
                              </Button>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="grid gap-2">
                                <FieldInfo label="Profile name" description="Nama internal untuk membedakan model profile per workspace." />
                                <Input disabled={isModelsReadonly} value={model.name} onChange={(event) => updateModel(model.id, { name: event.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <FieldInfo label="Provider preset" description="Label preset untuk memudahkan identifikasi. Tetap memakai endpoint OpenAI-compatible." />
                                <Input
                                  disabled={isModelsReadonly}
                                  value={model.providerPreset}
                                  onChange={(event) => updateModel(model.id, { providerPreset: event.target.value })}
                                />
                              </div>
                              <div className="grid gap-2 md:col-span-2">
                                <FieldInfo label="API base URL" description="Contoh: OpenRouter, Groq, Gemini OpenAI-compatible, atau provider kompatibel lain." />
                                <Input disabled={isModelsReadonly} value={model.apiBaseUrl} onChange={(event) => updateModel(model.id, { apiBaseUrl: event.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <FieldInfo label="Model" description="ID model default untuk profile ini." />
                                <Input disabled={isModelsReadonly} value={model.model} onChange={(event) => updateModel(model.id, { model: event.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <FieldInfo label="API key" description="Akan disimpan di backend app untuk profile model ini." />
                                <Input
                                  disabled={isModelsReadonly}
                                  value={model.apiKey}
                                  placeholder={model.hasApiKey ? "********" : "API key"}
                                  onChange={(event) => updateModel(model.id, { apiKey: event.target.value })}
                                />
                              </div>
                              <div className="grid gap-2">
                                <FieldInfo label="Max tokens" description="Maksimal token output untuk model ini. (misal 4096 atau 8192) untuk membatasi budget atau menghindari 402 error." />
                                <Input
                                  disabled={isModelsReadonly}
                                  type="number"
                                  value={model.maxTokens ?? ""}
                                  placeholder="Contoh: 4096"
                                  onChange={(event) => updateModel(model.id, { maxTokens: event.target.value ? Number(event.target.value) : undefined })}
                                />
                              </div>
                            </div>
                          </div>
                        </details>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Global Prompts</CardTitle>
                  <CardDescription>
                    Prompt ini tetap lokal per workspace, bahkan saat model diwarisi dari `default`. AI Batch template tetap bisa override outline dan content prompt sendiri.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {GLOBAL_PROMPT_PRESETS.map((preset) => (
                      <Button key={preset.label} variant="outline" onClick={() => applyPromptPrefill(preset.values)}>
                        {preset.label}
                      </Button>
                    ))}
                    <span className="text-xs">Pilih preset prompt sesuai gaya output default yang diinginkan.</span>
                  </div>

                  <div className="grid gap-2">
                    <FieldInfo label="System prompt" description="Instruksi global yang selalu dibawa untuk semua mode AI." />
                    <Textarea
                      value={aiSettings.systemPrompt}
                      onChange={(event) =>
                        setAiSettings((current) => (current ? { ...current, systemPrompt: event.target.value } : current))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <FieldInfo label="Company info" description="Konteks brand/workspace yang selalu dibawa ke semua mode AI sebelum prompt khusus task." />
                    <Textarea
                      value={aiSettings.companyInfo}
                      onChange={(event) =>
                        setAiSettings((current) => (current ? { ...current, companyInfo: event.target.value } : current))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <FieldInfo label="Metadata prompt" description="Khusus untuk judul, excerpt, SEO, dan OG metadata." />
                    <Textarea
                      value={aiSettings.metadataPrompt}
                      onChange={(event) =>
                        setAiSettings((current) => (current ? { ...current, metadataPrompt: event.target.value } : current))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <FieldInfo label="Draft prompt" description="Dipakai saat generate draft awal artikel." />
                    <Textarea
                      value={aiSettings.draftPrompt}
                      onChange={(event) =>
                        setAiSettings((current) => (current ? { ...current, draftPrompt: event.target.value } : current))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <FieldInfo label="Outline prompt" description="Dipakai saat generate outline default." />
                    <Textarea
                      value={aiSettings.outlinePrompt}
                      onChange={(event) =>
                        setAiSettings((current) => (current ? { ...current, outlinePrompt: event.target.value } : current))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <FieldInfo label="Outline to post prompt" description="Untuk mengubah outline menjadi artikel lengkap plus metadata." />
                    <Textarea
                      value={aiSettings.outlineToPostPrompt}
                      onChange={(event) =>
                        setAiSettings((current) =>
                          current ? { ...current, outlineToPostPrompt: event.target.value } : current
                        )
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Connection Test</CardTitle>
                  <CardDescription>
                    Tes ini mencoba model AI yang sedang efektif dipakai workspace sekarang. Saat mode inherit aktif, model diuji dari workspace `default`, tetapi prompt lokal workspace ini tetap dipertahankan.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="outline" onClick={() => void testAiSettings()} disabled={isTestingAiSettings}>
                      {isTestingAiSettings ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : null}
                      {isTestingAiSettings ? "Testing..." : "Test AI connection"}
                    </Button>
                    <div className="text-xs text-muted-foreground">
                      AI status: <Badge variant="outline">{config?.aiConfigured ? `ready (${config.aiModel})` : "not configured"}</Badge>
                    </div>
                  </div>

                  {aiConnectionTestResult ? (
                    <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs text-foreground">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>Success</Badge>
                        <Badge variant="outline">{aiConnectionTestResult.model}</Badge>
                        <Badge variant="outline">{aiConnectionTestResult.sourceWorkspaceSlug}</Badge>
                      </div>
                      <div className="mt-2 grid gap-1 text-muted-foreground">
                        <span>{aiConnectionTestResult.message}</span>
                        <span>Provider: {aiConnectionTestResult.provider}</span>
                        <span>Source workspace: {aiConnectionTestResult.sourceWorkspaceName}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border p-4 text-xs">
                      Belum ada hasil test. Jalankan test setelah memilih model default dan mengisi API key yang diperlukan.
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => void saveAiSettings()}>Save AI settings</Button>
                {isInheritMode ? (
                  <span className="text-xs">
                    Mode inherit aktif. Save menyimpan prompt workspace ini dan flag agar model memakai source dari workspace `{aiSettings.sourceWorkspaceSlug}`.
                  </span>
                ) : (
                  <span className="text-xs">Mode custom aktif. Save akan menyimpan model dan prompt untuk workspace ini.</span>
                )}
              </div>
            </>
          ) : (
            <span>Loading AI settings...</span>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
