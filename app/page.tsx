"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Tenant3DGraph } from "./Tenant3DGraph";

type SourceType = "issues" | "pull";

type TenantNode = {
  id: string;
  label: string;
  type: string;
  url?: string;
  sourceId?: string;
};

type TenantEdge = {
  source: string;
  target: string;
  type: string;
  evidence?: string;
  sourceDocumentId?: string;
  confidence?: number;
};

type TenantGraphResponse =
  | {
      data: {
        nodes: TenantNode[];
        edges: TenantEdge[];
        meta: {
          tenantId: string;
          subTenantId?: string;
          sourceCount: number;
          relationSourceCount: number;
          maxSources: number;
        };
      };
    }
  | {
      error: {
        message: string;
      };
    };

type LoadResponse =
  | {
      data: {
        memory: {
          id: string;
          title: string;
          documentId: string | null;
        };
        hydraProcessing: {
          status: string;
          message?: string;
        } | null;
        stages: Array<{
          name: string;
          status: string;
          note?: string;
        }>;
        edges: {
          deterministic: unknown[];
          proposed: unknown[];
        };
      };
    }
  | {
      error: {
        message: string;
      };
    };

const REPOSITORY_PRESETS = [
  { value: "openclaw/openclaw", owner: "openclaw", repo: "openclaw" },
  { value: "vercel/next.js", owner: "vercel", repo: "next.js" },
  { value: "facebook/react", owner: "facebook", repo: "react" }
];

export default function Home() {
  const [darkMode, setDarkMode] = useState(true);
  const [graphLoading, setGraphLoading] = useState(true);
  const [tenantGraph, setTenantGraph] = useState<TenantGraphResponse | null>(null);
  const [owner, setOwner] = useState("openclaw");
  const [repo, setRepo] = useState("openclaw");
  const [sourceType, setSourceType] = useState<SourceType>("issues");
  const [sourceNumber, setSourceNumber] = useState("79960");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<LoadResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadGraph() {
      setGraphLoading(true);

      try {
        const response = await fetch("/api/tenant-graph?maxSources=10", {
          cache: "no-store"
        });
        const json = (await response.json()) as TenantGraphResponse;

        if (!cancelled) {
          setTenantGraph(json);
        }
      } catch (error) {
        if (!cancelled) {
          setTenantGraph({
            error: {
              message: error instanceof Error ? error.message : "Graph request failed"
            }
          });
        }
      } finally {
        if (!cancelled) {
          setGraphLoading(false);
        }
      }
    }

    void loadGraph();

    return () => {
      cancelled = true;
    };
  }, []);

  const graphSucceeded = tenantGraph && "data" in tenantGraph;
  const graphFailed = tenantGraph && "error" in tenantGraph;
  const githubUrl = `https://github.com/${owner.trim() || "owner"}/${repo.trim() || "repo"}/${sourceType}/${sourceNumber.trim() || "1234"}`;
  const nodesByType = useMemo(() => {
    if (!graphSucceeded) {
      return [];
    }

    const counts = new Map<string, number>();

    for (const node of tenantGraph.data.nodes) {
      counts.set(node.type, (counts.get(node.type) ?? 0) + 1);
    }

    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [graphSucceeded, tenantGraph]);

  async function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploading(true);
    setUploadResult(null);

    try {
      const response = await fetch("/api/load-and-connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: githubUrl })
      });
      const json = (await response.json()) as LoadResponse;
      setUploadResult(json);
    } catch (error) {
      setUploadResult({
        error: {
          message: error instanceof Error ? error.message : "Upload request failed"
        }
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className={cn("app-shell", darkMode && "dark")}>
      <div className="min-h-screen bg-background p-4 text-foreground md:p-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4">
          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-1">
                <CardTitle className="text-2xl">AgentGraph</CardTitle>
                <CardDescription>
                  Context compiler for AI engineering agents across GitHub repositories.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">HydraDB tenant graph</Badge>
                <Button type="button" variant="outline" onClick={() => setDarkMode((value) => !value)}>
                  {darkMode ? "Light mode" : "Dark mode"}
                </Button>
              </div>
            </CardHeader>
          </Card>

          <Tabs defaultValue="graph" className="gap-4">
            <TabsList>
              <TabsTrigger value="graph">Graph</TabsTrigger>
              <TabsTrigger value="upload">Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="graph" className="grid gap-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                <Card className="min-w-0">
                  <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle>Repository Memory Graph</CardTitle>
                      <CardDescription>
                        Loaded from HydraDB relations for the selected tenant sample.
                      </CardDescription>
                    </div>
                    {graphSucceeded ? (
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">Sources {tenantGraph.data.meta.sourceCount}</Badge>
                        <Badge variant="outline">Nodes {tenantGraph.data.nodes.length}</Badge>
                        <Badge variant="outline">Edges {tenantGraph.data.edges.length}</Badge>
                      </div>
                    ) : null}
                  </CardHeader>
                  <CardContent>
                    {graphLoading ? (
                      <Skeleton className="h-[560px] w-full rounded-lg" />
                    ) : null}

                    {graphSucceeded ? (
                      <Tenant3DGraph
                        nodes={tenantGraph.data.nodes}
                        edges={tenantGraph.data.edges}
                        darkMode={darkMode}
                      />
                    ) : null}

                    {graphFailed ? (
                      <Alert variant="destructive">
                        <AlertTitle>Graph load failed</AlertTitle>
                        <AlertDescription>{tenantGraph.error.message}</AlertDescription>
                      </Alert>
                    ) : null}
                  </CardContent>
                </Card>

                <Card className="min-w-0">
                  <CardHeader>
                    <CardTitle>Nodes</CardTitle>
                    <CardDescription>Entity types extracted from source documents.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-2">
                      {nodesByType.map(([type, count]) => (
                        <Badge key={type} variant="secondary">
                          {type} {count}
                        </Badge>
                      ))}
                    </div>
                    <Separator />
                    <div className="max-h-[560px] overflow-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Node</TableHead>
                            <TableHead>Type</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {graphSucceeded ?
                            tenantGraph.data.nodes.slice(0, 80).map((node) => (
                              <TableRow key={node.id}>
                                <TableCell className="max-w-[220px] truncate font-mono text-xs">
                                  {node.label}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{node.type}</Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          : null}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="upload">
              <Card>
                <CardHeader>
                  <CardTitle>Upload GitHub Context</CardTitle>
                  <CardDescription>
                    Choose any GitHub repository and issue or pull request number to load into HydraDB.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={submitUpload} className="grid gap-5">
                    <div className="grid gap-4 md:grid-cols-[1fr_1fr_160px_160px]">
                      <div className="grid gap-2">
                        <Label htmlFor="repo-preset">Repository preset</Label>
                        <Select
                          value={`${owner}/${repo}`}
                          onValueChange={(value) => {
                            const preset = REPOSITORY_PRESETS.find((item) => item.value === value);

                            if (preset) {
                              setOwner(preset.owner);
                              setRepo(preset.repo);
                            }
                          }}
                        >
                          <SelectTrigger id="repo-preset" className="w-full">
                            <SelectValue placeholder="Choose repository" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {REPOSITORY_PRESETS.map((preset) => (
                                <SelectItem key={preset.value} value={preset.value}>
                                  {preset.value}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor="owner">Owner</Label>
                          <Input id="owner" value={owner} onChange={(event) => setOwner(event.target.value)} />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="repo">Repo</Label>
                          <Input id="repo" value={repo} onChange={(event) => setRepo(event.target.value)} />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="source-type">Type</Label>
                        <Select value={sourceType} onValueChange={(value) => setSourceType(value as SourceType)}>
                          <SelectTrigger id="source-type" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="issues">Issue</SelectItem>
                              <SelectItem value="pull">Pull request</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="source-number">Number</Label>
                        <Input
                          id="source-number"
                          inputMode="numeric"
                          value={sourceNumber}
                          onChange={(event) => setSourceNumber(event.target.value)}
                        />
                      </div>
                    </div>

                    <Alert>
                      <AlertTitle>Generated source URL</AlertTitle>
                      <AlertDescription className="break-all font-mono text-xs">{githubUrl}</AlertDescription>
                    </Alert>

                    <div className="flex flex-wrap items-center gap-3">
                      <Button type="submit" disabled={uploading}>
                        {uploading ? "Loading into HydraDB..." : "Load and Connect"}
                      </Button>
                      <Badge variant="outline">Works with public GitHub issue and PR URLs</Badge>
                    </div>

                    {uploadResult && "data" in uploadResult ? (
                      <Alert>
                        <AlertTitle>{uploadResult.data.memory.title}</AlertTitle>
                        <AlertDescription className="grid gap-2">
                          <span className="font-mono text-xs">{uploadResult.data.memory.id}</span>
                          <span>
                            HydraDB document ID:{" "}
                            <span className="font-mono">
                              {uploadResult.data.memory.documentId ?? "not returned"}
                            </span>
                          </span>
                          <span>
                            Processing: {uploadResult.data.hydraProcessing?.status ?? "unknown"} · deterministic
                            edges {uploadResult.data.edges.deterministic.length} · LLM proposals{" "}
                            {uploadResult.data.edges.proposed.length}
                          </span>
                        </AlertDescription>
                      </Alert>
                    ) : null}

                    {uploadResult && "error" in uploadResult ? (
                      <Alert variant="destructive">
                        <AlertTitle>Upload failed</AlertTitle>
                        <AlertDescription>{uploadResult.error.message}</AlertDescription>
                      </Alert>
                    ) : null}
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
}
