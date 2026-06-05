import { useEffect, useMemo, useState } from "react";
import { Loader2Icon, RefreshCcwIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { notesApi, type WorkerLogSnapshot } from "@/lib/api";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (["completed", "published"].includes(status)) return "default";
  if (["failed"].includes(status)) return "destructive";
  if (["cancelled", "paused"].includes(status)) return "secondary";
  return "outline";
}

function SummaryCard({ title, value, description }: { title: string; value: number; description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl font-semibold">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{description}</CardContent>
    </Card>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center text-muted-foreground">
        {label}
      </TableCell>
    </TableRow>
  );
}

export function WorkerLogsPage() {
  const [snapshot, setSnapshot] = useState<WorkerLogSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadLogs() {
    setIsLoading(true);
    try {
      setSnapshot(await notesApi.getWorkerLogs());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load worker logs");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadLogs();
  }, []);

  const summary = useMemo(() => {
    const aiActive = snapshot?.aiAssistJobs.filter((job) => job.status === "queued" || job.status === "processing").length ?? 0;
    const aiFailed = snapshot?.aiAssistJobs.filter((job) => job.status === "failed").length ?? 0;
    const batchActive = snapshot?.aiBatches.filter((batch) => batch.status === "queued" || batch.status === "processing").length ?? 0;
    const publishActive = snapshot?.publishJobs.filter((job) => job.status === "scheduled" || job.status === "processing").length ?? 0;
    return { aiActive, aiFailed, batchActive, publishActive };
  }, [snapshot]);

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Worker Logs</h2>
          <p className="text-sm text-muted-foreground">Cek semua AI assist, AI batch, dan publish worker dalam satu tempat.</p>
        </div>
        <Button variant="outline" onClick={() => void loadLogs()} disabled={isLoading}>
          {isLoading ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <RefreshCcwIcon data-icon="inline-start" />}
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard title="AI Assist Active" value={summary.aiActive} description="Queued atau processing" />
        <SummaryCard title="AI Assist Failed" value={summary.aiFailed} description="Butuh retry/manual check" />
        <SummaryCard title="AI Batch Active" value={summary.batchActive} description="Batch queued/processing" />
        <SummaryCard title="Publish Active" value={summary.publishActive} description="Scheduled/processing publish" />
      </div>

      <Tabs defaultValue="assist" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="assist">AI Assist</TabsTrigger>
          <TabsTrigger value="batches">AI Batch</TabsTrigger>
          <TabsTrigger value="items">Batch Items</TabsTrigger>
          <TabsTrigger value="publish">Publish</TabsTrigger>
        </TabsList>

        <TabsContent value="assist">
          <Card>
            <CardHeader>
              <CardTitle>AI Assist Jobs</CardTitle>
              <CardDescription>50 job terakhir lintas note di workspace aktif.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? <EmptyRow colSpan={6} label="Loading logs..." /> : null}
                  {!isLoading && snapshot?.aiAssistJobs.length === 0 ? <EmptyRow colSpan={6} label="No AI assist jobs." /> : null}
                  {snapshot?.aiAssistJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell><Badge variant={statusVariant(job.status)}>{job.status}</Badge></TableCell>
                      <TableCell>{job.mode}</TableCell>
                      <TableCell className="font-mono text-xs">{job.noteId}</TableCell>
                      <TableCell>{job.attempts}</TableCell>
                      <TableCell>{formatDate(job.updatedAt)}</TableCell>
                      <TableCell className="max-w-md truncate text-xs text-muted-foreground">{job.error ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batches">
          <Card>
            <CardHeader>
              <CardTitle>AI Batch Runs</CardTitle>
              <CardDescription>Batch terakhir dan agregat hasilnya.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? <EmptyRow colSpan={6} label="Loading logs..." /> : null}
                  {!isLoading && snapshot?.aiBatches.length === 0 ? <EmptyRow colSpan={6} label="No AI batch runs." /> : null}
                  {snapshot?.aiBatches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell><Badge variant={statusVariant(batch.status)}>{batch.status}</Badge></TableCell>
                      <TableCell>{batch.name}</TableCell>
                      <TableCell>{batch.mode}</TableCell>
                      <TableCell>{batch.completedItems}/{batch.totalItems} done, {batch.failedItems} failed</TableCell>
                      <TableCell>{formatDate(batch.updatedAt)}</TableCell>
                      <TableCell className="max-w-md truncate text-xs text-muted-foreground">{batch.lastError ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items">
          <Card>
            <CardHeader>
              <CardTitle>AI Batch Items</CardTitle>
              <CardDescription>50 item terakhir dari worker AI batch.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Keyword</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? <EmptyRow colSpan={6} label="Loading logs..." /> : null}
                  {!isLoading && snapshot?.aiBatchItems.length === 0 ? <EmptyRow colSpan={6} label="No AI batch items." /> : null}
                  {snapshot?.aiBatchItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell><Badge variant={statusVariant(item.status)}>{item.status}</Badge></TableCell>
                      <TableCell>{item.keyword}</TableCell>
                      <TableCell>{item.attempts}</TableCell>
                      <TableCell className="font-mono text-xs">{item.noteId ?? "-"}</TableCell>
                      <TableCell>{formatDate(item.updatedAt)}</TableCell>
                      <TableCell className="max-w-md truncate text-xs text-muted-foreground">{item.lastError ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="publish">
          <Card>
            <CardHeader>
              <CardTitle>Publish Jobs</CardTitle>
              <CardDescription>50 publish worker job terakhir.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Run At</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? <EmptyRow colSpan={5} label="Loading logs..." /> : null}
                  {!isLoading && snapshot?.publishJobs.length === 0 ? <EmptyRow colSpan={5} label="No publish jobs." /> : null}
                  {snapshot?.publishJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell><Badge variant={statusVariant(job.status)}>{job.status}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{job.noteId}</TableCell>
                      <TableCell>{formatDate(job.runAt)}</TableCell>
                      <TableCell>{formatDate(job.updatedAt)}</TableCell>
                      <TableCell className="max-w-md truncate text-xs text-muted-foreground">{job.message ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
}
