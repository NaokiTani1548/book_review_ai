// mcpClient.ts
import { Anthropic } from "@anthropic-ai/sdk";
import type { MessageParam, Tool } from "@anthropic-ai/sdk/resources/messages/messages.mjs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import readline from "readline/promises";
import dotenv from "dotenv";
import { system_prompt } from "./SystemPrompt.js";
import { reviewWorkflow } from "./reviewWorkflow.js";
import { extractInfo } from "./chains/extractChain.js";

dotenv.config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is not set");
}

export class MCPClient {
  private mcp: Client;
  private anthropic: Anthropic;
  private transport: StdioClientTransport | null = null;
  private tools: Tool[] = [];

  constructor() {
    this.anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    this.mcp = new Client({ name: "mcp-client-cli", version: "1.0.0" });
  }

  async callTool(params: { name: string; arguments: Record<string, unknown> }) {
    return this.mcp.callTool(params);
  }

  async connectToServer(serverScriptPath: string) {
    if (!serverScriptPath.endsWith(".js")) throw new Error("Server script must be a .js file");
    const command = process.execPath;

    this.transport = new StdioClientTransport({ command, args: [serverScriptPath] });
    await this.mcp.connect(this.transport);

    const toolsResult = await this.mcp.listTools();
    this.tools = toolsResult.tools.map((tool) => ({
      name: tool.name,
      description: tool.description ?? "",
      input_schema: { ...tool.inputSchema, required: tool.inputSchema.required ?? null },
    }));

    console.log("✅ Connected to MCP server with tools:", this.tools.map((t) => t.name));
  }

  async requestChapterSummary(): Promise<string> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    console.log("\n📚 書籍内容理解のため、各章のタイトルと一言要約を入力してください。");
    console.log("例:\n一章 タイトル - 要約: ...\n二章 タイトル - 要約: ...\n（入力が終わったら Enter を2回押してください）");

    const lines: string[] = [];
    while (true) {
        const line = await rl.question("> ");
        if (line.trim() === "") break;
        lines.push(line);
    }

    rl.close();

    const summary = lines.join("\n").trim();
    console.log("✅ 章情報を受け取りました:\n" + summary);
    return summary;
  }

  async requestOthers(): Promise<string> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    console.log("\n📚 その他リクエストしたい情報を入力してください");
    console.log("\n例:○○という文言を入れてください\n例:箇条書きで出力してください\n例:400字以上で書評を書いてください。\n（入力が終わったら Enter を2回押してください）");

    const lines: string[] = [];
    while (true) {
        const line = await rl.question("> ");
        if (line.trim() === "") break;
        lines.push(line);
    }

    rl.close();

    const request = lines.join("\n").trim();
    console.log("✅ リクエストを受け取りました:\n" + request);
    return request;
  }

  // -------------------------
  // 通常のClaude会話処理
  // -------------------------
  async processQuery(query: string) {
    console.log("[debug] Query:", query);
    console.log("[debug] Tools:", this.tools.map((t) => t.name));

    const messages: MessageParam[] = [
      { role: "assistant", content: system_prompt },
      { role: "user", content: query },
    ];

    let response;
    try {
      response = await this.anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 2500,
        messages,
        tools: this.tools,
      });
      console.log("[debug] Claude response:", response);
    } catch (err) {
      console.error("[debug] Error calling Claude API:", err);
      return "⚠️ Claude API did not return a response";
    }

    const finalText: string[] = [];
    const MAX_ROUNDS = 10;
    let rounds = 0;

    while (response.content.some((c) => c.type === "tool_use")) {
      if (++rounds > MAX_ROUNDS) break;

      for (const content of response.content) {
        if (content.type === "text") {
          finalText.push(content.text);
        } else if (content.type === "tool_use") {
          const toolName = content.name;
          const toolArgs = content.input;

          messages.push({ role: "assistant", content: [content] });

          try {
            console.log("[debug] Calling tool:", toolName, toolArgs);
            const safeArgs = { ...(toolArgs as Record<string, unknown> || {}) };
            const result = await this.mcp.callTool({ name: toolName, arguments: safeArgs });

            const toolResultContent: string =
              typeof result.content === "string" ? result.content : JSON.stringify(result.content);

            messages.push({
              role: "user",
              content: [{ type: "tool_result", tool_use_id: content.id, content: toolResultContent }],
            });

            response = await this.anthropic.messages.create({
              model: "claude-3-haiku-20240307",
              max_tokens: 1000,
              messages,
              tools: this.tools,
            });

            for (const block of response.content ?? []) {
              if (block.type === "text" && block.text) finalText.push(block.text);
            }
          } catch (err) {
            const errorMessage = `❌ Tool "${toolName}" failed: ${err}`;
            finalText.push(errorMessage);
            messages.push({
              role: "user",
              content: [{ type: "tool_result", tool_use_id: content.id, content: errorMessage }],
            });
          }
        }
      }
    }

    return finalText.join("\n");
  }

  // -------------------------
  // チャットループ（通常会話と書評生成を切り替え）
  // -------------------------
  async chatLoop() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    try {
      console.log("\n🧠 MCP Client Started!");
      console.log("Type your queries or 'quit' to exit.");

      while (true) {
        const message = await rl.question("\nQuery: ");
        if (message.toLowerCase() === "quit") break;

        // -----------------------------
        // 入力解析：書評生成か通常会話か判定
        // -----------------------------
        let isBookReview = false;
        let extractResult: { userId?: string; title?: string; is_book_review?: boolean } = {};
        try {
          extractResult = await extractInfo(message, { metadata: { mcp: this } });
          isBookReview = !!extractResult.is_book_review;
        } catch (err) {
          console.log("[debug] 書評生成判定に失敗、通常会話として処理します");
        }

        // -----------------------------
        // 書評生成の場合はLangChain workflowを実行
        // -----------------------------
        if (isBookReview) {
          try {
            const output = await reviewWorkflow.invoke(message, { metadata: { mcp: this } });
            console.log("\n📘 書評生成結果:\n" + output);
            continue;
          } catch (err) {
            console.error("❌ 書評生成に失敗:", err);
            console.log("通常会話として処理します...");
          }
        }

        // -----------------------------
        // 通常会話
        // -----------------------------
        const response = await this.processQuery(message);
        console.log("\n📘 Claude's Response:\n" + response);
      }
    } finally {
      rl.close();
    }
  }

  async cleanup() {
    await this.mcp.close();
  }
}

// -------------------------
// メイン実行
// -------------------------
async function main() {
  if (process.argv.length < 3) {
    console.log("Usage: node build/index.js <path_to_server_script>");
    return;
  }

  const mcpClient = new MCPClient();
  try {
    const serverPath = process.argv[2];
    if (!serverPath) {
      console.log("Usage: node build/index.js <path_to_server_script>");
      return;
    }

    await mcpClient.connectToServer(serverPath);
    await mcpClient.chatLoop();
  } finally {
    await mcpClient.cleanup();
    process.exit(0);
  }
}

main();
