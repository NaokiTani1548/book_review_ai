import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { MCPClient } from "./mcpClient.js";
import { reviewWorkflow } from "./workflows/reviewWorkflow.js";
import { upsertPromptWorkflow } from "./workflows/upsertPromptWorkflow.js";
import { extractRequestInfo } from "./chains/extractChain.js";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const mcp = new MCPClient();
const serverPath = process.argv[2] ?? "./mcpServer.js";
await mcp.connectToServer(serverPath);

// -----------------------------
// クライアントセッションごとの状態
// -----------------------------
interface ClientState {
  step:
    | "normal"
    | "awaiting_userId"
    | "awaiting_chapter"
    | "awaiting_request"
    | "ready";
  userId?: string;
  chapterSummary?: string;
  userRequest?: string;
  extractResult?: any;
  isUpsertPrompt?: boolean;
  isBookReview?: boolean;
  firstMeesage?: string;
}

const clientStates = new Map<WebSocket, ClientState>();

// ======================================================
// ✅ WebSocket 接続
// ======================================================
wss.on("connection", (ws: WebSocket) => {
  console.log("💬 Client connected");
  clientStates.set(ws, { step: "normal" });

  ws.send(
    JSON.stringify({
      type: "info",
      content: "🧠 MCP Client Started! Type your queries.",
    })
  );

  // ======================================================
  // ✅ メッセージ受信
  // ======================================================
  ws.on("message", async (msg: WebSocket.RawData) => {
    const message = msg.toString();
    const state = clientStates.get(ws);
    console.log("📩 Received message:", message);
    console.log("Current state:", state);
    if (!state) return;

    // quit
    if (message.toLowerCase() === "quit") {
      ws.close();
      return;
    }

    try {
      // ------------------------------------
      // ✅ 意図抽出
      // ------------------------------------

        if (state.step === "normal") {
            try {
                const extractResult = await extractRequestInfo(message, { metadata: { mcp } });
                state.firstMeesage = message;
                state.extractResult = extractResult;
                state.isUpsertPrompt = !!extractResult.is_upsert_prompt;
                state.isBookReview = !!extractResult.is_book_review;
                state.userId = extractResult.userId ?? "";
                if(state.userId != "") {
                    state.step = "awaiting_chapter";
                }
                console.log("✅ 抽出結果:", extractResult);
            } catch (_) {}
        } else {
            const extractResult = state.extractResult;
            state.isBookReview = !!extractResult?.is_book_review;
        }
    
        const isUpsertPrompt = state.isUpsertPrompt ?? false;
        const isBookReview = state.isBookReview ?? false;

      // ------------------------------------
      // ✅ プロンプト登録
      // ------------------------------------
      if (isUpsertPrompt) {
        const result = await upsertPromptWorkflow.invoke(message, {
          metadata: { mcp },
        });

        ws.send(
          JSON.stringify({
            type: "upsert_prompt",
            content: result.new_prompt,
          })
        );
        return;
      }

      // ------------------------------------
      // ✅ 書評生成フロー
      // ------------------------------------
      if (isBookReview) {
        switch (state.step) {
          case "normal":
            state.step = "awaiting_userId";
            ws.send(
              JSON.stringify({
                type: "prompt",
                content: "ユーザーIDを入力してください。入力は数字のみでお願いします。",
                hint: "例: 1121"
              })
            );
            break;

          case "awaiting_userId":
            state.userId = message;
            state.step = "awaiting_chapter";
            ws.send(
              JSON.stringify({
                type: "prompt",
                content: "各章のタイトルと要約を入力してください",
                hint: "例: 第1章: <タイトル> 要約: <2~3文> 第2章: <タイトル> 要約: <2~3文> ..."
              })
            );
            break;

          case "awaiting_chapter":
            state.chapterSummary = message;
            state.step = "awaiting_request";
            ws.send(
              JSON.stringify({
                type: "prompt",
                content: "その他特記事項を入力してください",
                hint: "例: 箇条書きで、2000文字程度で書いてください。"
              })
            );
            break;

          case "awaiting_request":
            state.userRequest = message;
            state.step = "ready";

            // ✅ undefined チェック
            const workflowInput = {
              message: state.firstMeesage ?? "",
              userId: state.userId ?? "",
              is_book_review: true,
              chapterSummary: state.chapterSummary ?? "",
              userRequest: state.userRequest ?? "",
            };

            const review = await reviewWorkflow.invoke(workflowInput, {
              metadata: { mcp },
            });

            ws.send(
              JSON.stringify({
                type: "review",
                content: review,
              })
            );

            // リセット
            state.step = "normal";
            state.userId = "";
            state.chapterSummary = "";
            state.userRequest = "";
            state.extractResult = "";
            state.isUpsertPrompt = false;
            state.isBookReview = false;
            state.firstMeesage = "";
            break;

          default:
            ws.send(
              JSON.stringify({
                type: "error",
                content: "フロー状態が不正です",
              })
            );
        }
        return;
      }

      // ------------------------------------
      // ✅ 通常会話
      // ------------------------------------
      if (!isBookReview && !isUpsertPrompt) {
        ws.send(
          JSON.stringify({
            type: "info",
            content: "ℹ️ 通常会話モードです",
          })
        );

        const response = await mcp.processQuery(message);
        ws.send(JSON.stringify({ type: "chat", content: response }));
      }
    } catch (err) {
      console.error(err);
      ws.send(
        JSON.stringify({
          type: "error",
          content: "サーバー側でエラーが発生しました",
        })
      );
    }
  });

  ws.on("close", () => {
    clientStates.delete(ws);
    console.log("💬 Client disconnected");
  });
});

server.listen(8080, () =>
  console.log("🚀 WebSocket server running on ws://localhost:8080")
);
