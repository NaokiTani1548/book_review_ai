// mcpClient.ts
import { Anthropic } from "@anthropic-ai/sdk";
import type { MessageParam, Tool } from "@anthropic-ai/sdk/resources/messages/messages.mjs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import readline from "readline/promises";
import { system_prompt } from "./SystemPrompt.js";
import { reviewWorkflow } from "./workflows/reviewWorkflow.js";
import { extractRequestInfo } from "./chains/extractChain.js";
import { anthropic } from "./model.js";
import { upsertPromptWorkflow } from "./workflows/upsertPromptWorkflow.js";

export class MCPClient {
  private mcp: Client;
  private anthropic: Anthropic;
  private transport: StdioClientTransport | null = null;
  private tools: Tool[] = [];

  // ✅ chatLoop と共通する readline を保持
  private rl: readline.Interface | null = null;

  constructor() {
    this.anthropic = anthropic;
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

  // ✅ 共通 readline を作る
  private createChatReadline() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  // ✅ 章要約入力モード（chatLoop を停止 → 専用 readline → 再開）
  async requestChapterSummary(): Promise<string> {
    console.log("\n📚 各章のタイトルと要約を入力してください");
    console.log("例:\n一章 タイトル - 要約: ...\n二章 タイトル - 要約: ...\n（入力が終わったら Enter を2回押してください）");

    // ✅ chatLoop の rl を中断
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }

    const rlChapter = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const lines: string[] = [];

    while (true) {
      const line = await rlChapter.question("");
      if (line.trim() === "") break;
      lines.push(line.trim());
    }

    rlChapter.close();

    console.log("✅ 章情報を受け取りました:\n" + lines.join("\n"));

    this.createChatReadline();

    return lines.join("\n");
  }

  // ✅ 特記事項入力モード（同様に readline を切り替え）
  async requestOthers(): Promise<string> {
    console.log("\n📚 その他リクエストしたい情報を入力してください（空行で終了）");
    console.log("\n例:○○という文言を入れてください\n例:箇条書きで出力してください\n例:400字以上で書評を書いてください。\n（入力が終わったら Enter を2回押してください）");

    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }

    const rlOthers = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const lines: string[] = [];

    while (true) {
      const line = await rlOthers.question("");
      if (line.trim() === "") break;
      lines.push(line.trim());
    }

    rlOthers.close();

    console.log("✅ その他情報を受け取りました:\n" + lines.join("\n"));

    this.createChatReadline();

    return lines.join("\n");
  }

  // -------------------------
  // Claude の通常処理
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
        max_tokens: 4000,
        messages,
        tools: this.tools,
      });
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
            const result = await this.mcp.callTool({
              name: toolName,
              arguments: { ...(toolArgs as Record<string, unknown> || {}) },
            });

            const toolResultContent =
              typeof result.content === "string"
                ? result.content
                : JSON.stringify(result.content);

            messages.push({
              role: "user",
              content: [{ type: "tool_result", tool_use_id: content.id, content: toolResultContent }],
            });

            response = await this.anthropic.messages.create({
              model: "claude-3-haiku-20240307",
              max_tokens: 4000,
              messages,
              tools: this.tools,
            });

            for (const block of response.content ?? []) {
              if (block.type === "text" && block.text) finalText.push(block.text);
            }
          } catch (err) {
            finalText.push(`❌ Tool "${toolName}" failed: ${err}`);
          }
        }
      }
    }

    return finalText.join("\n");
  }

//   // -------------------------
//   // チャットループ
//   // -------------------------
//   async chatLoop() {
//     this.createChatReadline();
//     const rl = this.rl;

//     if (!rl) throw new Error("Readline failed to initialize");

//     console.log("\n🧠 MCP Client Started!");
//     console.log("Type your queries or 'quit' to exit.");

//     while (true) {
//       const message = await rl.question("\nQuery: ");
//       if (message.toLowerCase() === "quit") break;

//       // -----------------------------  
//       // 書評生成判定  
//       // -----------------------------  
//       let extractResult: any = {};
//       let isBookReview = false;
//       let isUpsertPrompt = false;

//       try {
//         extractResult = await extractRequestInfo(message, { metadata: { mcp: this } });
//         isUpsertPrompt = !!extractResult.is_upsert_prompt;
//         isBookReview = !!extractResult.is_book_review;
//         console.log("[debug] is_upsert_prompt?:", isUpsertPrompt);
//         console.log("[debug] is_book_review?:", isBookReview);
//       } catch (_) {}

//       if (isUpsertPrompt) {
//         const result = await upsertPromptWorkflow.invoke(message, { metadata: { mcp: this } });
//         console.log("\n📘 プロンプト生成結果:\n" + result.new_prompt);
//         continue;
//       }

//       // -----------------------------  
//       // 書評生成  
//       // -----------------------------  
//       if (isBookReview) {
//         const output = await reviewWorkflow.invoke(message, { metadata: { mcp: this } });
//         console.log("\n📘 書評生成結果:\n" + output);
//         continue;
//       }

//       // -----------------------------  
//       // 通常会話  
//       // -----------------------------  
//       if (!isBookReview && !isUpsertPrompt) {
//         console.log("ℹ️ 書評生成またはプロンプト登録の意図がないため、通常会話モードで案内します");
//         const response = await this.processQuery(message);
//         console.log("\n📘 Claude's Response:\n" + response);
//       }
//     }

//     rl.close();
//   }

//   async cleanup() {
//     await this.mcp.close();
//   }
}

// // -------------------------
// // メイン実行
// // -------------------------
// async function main() {
//   const serverPath = process.argv[2];
//   if (!serverPath) {
//     console.log("Usage: node build/index.js <path_to_server_script>");
//     return;
//   }

//   const mcpClient = new MCPClient();
//   try {
//     await mcpClient.connectToServer(serverPath);
//     await mcpClient.chatLoop();
//   } finally {
//     await mcpClient.cleanup();
//     process.exit(0);
//   }
// }

// main();
