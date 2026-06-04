import type { SettingsPageProps } from "./types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TabsContent } from "@/components/ui/tabs";
import { FieldInfo } from "./field-info";

type SanitySettingsTabProps = Pick<
  SettingsPageProps,
  "sanitySettings" | "setSanitySettings" | "testSanitySettings" | "saveSanitySettings" | "isTestingSanity" | "isSavingSanity" | "config"
>;

export function SanitySettingsTab({
  sanitySettings,
  setSanitySettings,
  testSanitySettings,
  saveSanitySettings,
  isTestingSanity,
  isSavingSanity,
  config,
}: SanitySettingsTabProps) {
  return (
    <TabsContent value="sanity" className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Sanity Settings</CardTitle>
          <CardDescription>
            Pengaturan Sanity untuk workspace aktif. Semua penjelasan diletakkan di atas field agar form tetap jelas saat terisi.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
          {sanitySettings ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <FieldInfo label="Project ID" description="Project Sanity yang dipakai workspace aktif." />
                  <Input
                    value={sanitySettings.projectId}
                    onChange={(event) =>
                      setSanitySettings((current) => (current ? { ...current, projectId: event.target.value } : current))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <FieldInfo label="Dataset" description="Dataset aktif untuk query dan publish." />
                  <Input
                    value={sanitySettings.dataset}
                    onChange={(event) =>
                      setSanitySettings((current) => (current ? { ...current, dataset: event.target.value } : current))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <FieldInfo label="API version" description="Versi API Sanity saat ini." />
                  <Input
                    value={sanitySettings.apiVersion}
                    onChange={(event) =>
                      setSanitySettings((current) => (current ? { ...current, apiVersion: event.target.value } : current))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <FieldInfo label="Write token" description="Token tidak disimpan di browser. Test tetap dilakukan lewat backend." />
                  <Input
                    value={sanitySettings.writeToken}
                    placeholder={sanitySettings.hasWriteToken ? "********" : "Sanity write token"}
                    onChange={(event) =>
                      setSanitySettings((current) => (current ? { ...current, writeToken: event.target.value } : current))
                    }
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => void testSanitySettings()} disabled={isTestingSanity}>
                  {isTestingSanity ? "Testing..." : "Test connection"}
                </Button>
                <Button onClick={() => void saveSanitySettings()} disabled={isSavingSanity}>
                  {isSavingSanity ? "Saving..." : "Save Sanity settings"}
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Sanity status: <Badge variant="outline">{config?.sanityConfigured ? "ready" : "not configured"}</Badge>
              </div>
            </>
          ) : (
            <span>Loading Sanity settings...</span>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
