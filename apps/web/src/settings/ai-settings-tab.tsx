import type { SettingsPageProps } from "./types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { FieldInfo } from "./field-info";

type AiSettingsTabProps = Pick<SettingsPageProps, "aiSettings" | "setAiSettings" | "saveAiSettings" | "config">;

export function AiSettingsTab({ aiSettings, setAiSettings, saveAiSettings, config }: AiSettingsTabProps) {
  return (
    <TabsContent value="ai" className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Settings</CardTitle>
          <CardDescription>Semua AI setting disimpan di aplikasi, bukan env Worker.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
          {aiSettings ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <FieldInfo label="API base URL" description="Endpoint provider AI. Contoh OpenAI kompatibel." />
                  <Input
                    value={aiSettings.apiBaseUrl}
                    onChange={(event) =>
                      setAiSettings((current) => (current ? { ...current, apiBaseUrl: event.target.value } : current))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <FieldInfo label="Model" description="Model default yang dipakai untuk generate metadata, draft, dan outline." />
                  <Input
                    value={aiSettings.model}
                    onChange={(event) =>
                      setAiSettings((current) => (current ? { ...current, model: event.target.value } : current))
                    }
                  />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <FieldInfo label="API key" description="Disimpan di backend app, bukan env Worker." />
                  <Input
                    value={aiSettings.apiKey}
                    placeholder={aiSettings.hasApiKey ? "********" : "API key"}
                    onChange={(event) =>
                      setAiSettings((current) => (current ? { ...current, apiKey: event.target.value } : current))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4">
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
                  <FieldInfo label="Metadata prompt" description="Khusus untuk judul, excerpt, SEO, dan OG metadata." />
                  <Textarea
                    value={aiSettings.metadataPrompt}
                    onChange={(event) =>
                      setAiSettings((current) => (current ? { ...current, metadataPrompt: event.target.value } : current))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <FieldInfo label="Draft prompt" description="Dipakai saat generate draft awal." />
                  <Textarea
                    value={aiSettings.draftPrompt}
                    onChange={(event) =>
                      setAiSettings((current) => (current ? { ...current, draftPrompt: event.target.value } : current))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <FieldInfo label="Outline prompt" description="Dipakai saat generate outline." />
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
              </div>
              <Button onClick={() => void saveAiSettings()}>Save AI settings</Button>
              <div className="text-xs text-muted-foreground">
                AI status: <Badge variant="outline">{config?.aiConfigured ? `ready (${config.aiModel})` : "not configured"}</Badge>
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
