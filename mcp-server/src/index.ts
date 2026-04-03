#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const FORKHUB_API_URL = process.env.FORKHUB_API_URL ?? "https://www.theforkhub.net";
const FORKHUB_API_KEY = process.env.FORKHUB_API_KEY ?? "";

function headers(extra?: Record<string, string>): Record<string, string> {
  return {
    Authorization: `Bearer ${FORKHUB_API_KEY}`,
    ...extra,
  };
}

function url(path: string): string {
  return `${FORKHUB_API_URL.replace(/\/+$/, "")}${path}`;
}

async function apiGet(path: string) {
  const res = await fetch(url(path), { headers: headers() });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GET ${path} failed (${res.status}): ${body}`);
  }
  return res.json();
}

async function apiPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(url(path), {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function apiPostMultipart(path: string, fields: Record<string, string>, file?: { name: string; content: string }) {
  const boundary = `----FormBoundary${Date.now()}`;
  let body = "";

  for (const [key, value] of Object.entries(fields)) {
    body += `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`;
  }

  if (file) {
    body += `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${file.name}"\r\nContent-Type: application/octet-stream\r\n\r\n${file.content}\r\n`;
  }

  body += `--${boundary}--\r\n`;

  const res = await fetch(url(path), {
    method: "POST",
    headers: headers({ "Content-Type": `multipart/form-data; boundary=${boundary}` }),
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

// --- Server setup ---

const server = new McpServer({
  name: "forkhub",
  version: "1.0.0",
});

// --- Tools ---

server.tool(
  "search_tools",
  "Search for tools on ForkHub by query, category, classification, or sort order",
  {
    query: z.string().describe("Search query"),
    category: z.string().optional().describe("Filter by category"),
    classification: z.string().optional().describe("Filter by classification"),
    sort: z.string().optional().describe("Sort order (e.g. rating, recent, forks)"),
    limit: z.number().optional().default(5).describe("Max results to return (default 5)"),
  },
  async ({ query, category, classification, sort, limit }) => {
    const params = new URLSearchParams({ q: query });
    if (category) params.set("category", category);
    if (classification) params.set("classification", classification);
    if (sort) params.set("sort", sort);
    if (limit) params.set("limit", String(limit));

    const data = await apiGet(`/api/tools?${params}`);
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "get_tool",
  "Get full details for a specific tool by ID",
  {
    tool_id: z.string().describe("The tool ID"),
  },
  async ({ tool_id }) => {
    const data = await apiGet(`/api/tools/${encodeURIComponent(tool_id)}`);
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "upload_tool",
  "Upload a new tool to ForkHub",
  {
    title: z.string().describe("Tool title"),
    description: z.string().describe("Tool description"),
    category: z.string().describe("Tool category"),
    classification: z.string().describe("Tool classification"),
    code: z.string().describe("File contents of the tool"),
    filename: z.string().describe("Filename for the tool code"),
    security_doc: z.string().optional().describe("Security documentation as JSON string"),
  },
  async ({ title, description, category, classification, code, filename, security_doc }) => {
    const fields: Record<string, string> = { title, description, category, classification };
    if (security_doc) fields.security_doc = security_doc;

    const data = await apiPostMultipart("/api/tools/upload", fields, { name: filename, content: code });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "fork_tool",
  "Fork an existing tool with modifications",
  {
    tool_id: z.string().describe("ID of the tool to fork"),
    code: z.string().describe("Modified file contents"),
    filename: z.string().describe("Filename for the forked tool"),
    change_type: z.enum(["minor_change", "major_change"]).describe("Type of change"),
    change_description: z.string().describe("Description of changes made"),
    classification: z.string().describe("Classification of the forked tool"),
    title: z.string().optional().describe("New title (optional)"),
    description: z.string().optional().describe("New description (optional)"),
    security_doc: z.string().optional().describe("Security documentation as JSON string"),
  },
  async ({ tool_id, code, filename, change_type, change_description, classification, title, description, security_doc }) => {
    const fields: Record<string, string> = { change_type, change_description, classification };
    if (title) fields.title = title;
    if (description) fields.description = description;
    if (security_doc) fields.security_doc = security_doc;

    const data = await apiPostMultipart(
      `/api/tools/${encodeURIComponent(tool_id)}/fork`,
      fields,
      { name: filename, content: code },
    );
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "rate_tool",
  "Rate a tool on ForkHub (1-5 stars)",
  {
    tool_id: z.string().describe("The tool ID to rate"),
    score: z.number().min(1).max(5).describe("Rating score (1-5)"),
    comment: z.string().optional().describe("Optional review comment"),
  },
  async ({ tool_id, score, comment }) => {
    const body: Record<string, unknown> = { score };
    if (comment) body.comment = comment;

    const data = await apiPost(`/api/tools/${encodeURIComponent(tool_id)}/rate`, body);
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "share_tool",
  "Update sharing settings for a tool",
  {
    tool_id: z.string().describe("The tool ID"),
    mode: z.enum(["private", "link", "public"]).describe("Sharing mode"),
  },
  async ({ tool_id, mode }) => {
    const data = await apiPost(`/api/tools/${encodeURIComponent(tool_id)}/sharing`, { mode });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "my_tools",
  "List your uploaded tools on ForkHub",
  {},
  async () => {
    const data = await apiGet("/api/tools/my-uploads");
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "reviews",
  "List pending reviews",
  {
    status: z.string().optional().default("pending").describe("Review status filter (default: pending)"),
  },
  async ({ status }) => {
    const params = new URLSearchParams({ status });
    const data = await apiGet(`/api/reviews?${params}`);
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "approve_tool",
  "Approve a tool review",
  {
    review_id: z.string().describe("The review ID to approve"),
    notes: z.string().optional().describe("Optional approval notes"),
  },
  async ({ review_id, notes }) => {
    const body: Record<string, unknown> = {};
    if (notes) body.notes = notes;

    const data = await apiPost(`/api/reviews/${encodeURIComponent(review_id)}/approve`, body);
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  "reject_tool",
  "Reject a tool review",
  {
    review_id: z.string().describe("The review ID to reject"),
    notes: z.string().describe("Rejection reason (required)"),
  },
  async ({ review_id, notes }) => {
    const data = await apiPost(`/api/reviews/${encodeURIComponent(review_id)}/reject`, { notes });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  },
);

// --- Start ---

async function main() {
  if (!FORKHUB_API_KEY) {
    console.error("Warning: FORKHUB_API_KEY is not set. API calls will fail.");
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
