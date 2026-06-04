import type { SettingsPageProps } from "./types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TabsContent } from "@/components/ui/tabs";
import { FieldInfo } from "./field-info";

type FrontendSettingsTabProps = Pick<
  SettingsPageProps,
  "apiBaseUrl" | "apiBaseUrlInput" | "setApiBaseUrlInput" | "saveApiBaseOverride" | "resetApiBaseOverride" | "getDefaultApiBaseUrl"
>;

export function FrontendSettingsTab({
  apiBaseUrl,
  apiBaseUrlInput,
  setApiBaseUrlInput,
  saveApiBaseOverride,
  resetApiBaseOverride,
  getDefaultApiBaseUrl,
}: FrontendSettingsTabProps) {
  return (
    <TabsContent value="frontend" className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Frontend</CardTitle>
          <CardDescription>Konfigurasi app web dan API endpoint yang sedang dipakai user.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
          <div className="grid gap-2">
            <FieldInfo label="API base override" description="Override worker base URL untuk testing manual dari browser ini." />
            <Input
              placeholder="https://your-worker.your-subdomain.workers.dev"
              value={apiBaseUrlInput}
              onChange={(event) => setApiBaseUrlInput(event.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={saveApiBaseOverride}>
                Save override
              </Button>
              <Button variant="outline" onClick={resetApiBaseOverride}>
                Reset default
              </Button>
            </div>
          </div>
          <div className="grid gap-1 text-xs text-muted-foreground">
            <span>
              API base: <code>{apiBaseUrl}</code>
            </span>
            <span>
              Default API base: <code>{getDefaultApiBaseUrl()}</code>
            </span>
            <span>Routing sekarang dipisah per hash route agar aman di Cloudflare Pages.</span>
            <span>Halaman editor utama ada di route `#/posts`.</span>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
