export type GitHubSourceType = "issue" | "pr";

export type GitHubSourceRef = {
  provider: "github";
  owner: string;
  repo: string;
  type: GitHubSourceType;
  number: number;
  url: string;
};

export type GitHubItem = {
  source: GitHubSourceRef;
  title: string;
  body: string;
  state: string;
  labels: string[];
  author: string;
  createdAt: string;
  updatedAt: string;
};

export type HydraMemoryItem = {
  id: string;
  title: string;
  text: string;
  is_markdown: true;
  infer: true;
  metadata: {
    provider: "github";
    repo: string;
    type: GitHubSourceType;
  };
  additional_metadata: {
    number: number;
    url: string;
    state: string;
    labels: string[];
    author: string;
  };
};
