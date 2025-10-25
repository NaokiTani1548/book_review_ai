import { ChatAnthropic } from "@langchain/anthropic";
import { RunnableSequence } from "@langchain/core/runnables";
import type { RunnableConfig } from "@langchain/core/runnables";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { MCPClient } from "./mcpClient.js";
import { extractInfo } from "./chains/extractChain.js";
import { model } from "./model.js";
import dotenv from "dotenv";

dotenv.config();

// ---------- LangChainワークフロー ----------
const reviewWorkflow = RunnableSequence.from([
    async (input: string, config) => {
        return await extractInfo(input, config);
    },

  // Step 1: プロンプト取得 or 生成
  async (input: { userId: string; title: string; author: string }, config) => {
    console.log("userId:", input.userId);
    console.log("title:", input.title);
    const mcp = (config as { metadata: { mcp: MCPClient } }).metadata.mcp;
    const prompt = await mcp.callTool({ name: "get_prompt", arguments: { user_id: input.userId } });
    let userPromptRaw = prompt?.content;
    if (!userPromptRaw) {
        console.log("[debug] No prompt found, creating one...");
        const reviewHistory = await mcp.callTool({ name: "get_review", arguments: { user_id: input.userId } });
        const newPrompt = await mcp.callTool({
        name: "create_prompt",
        arguments: {
            user_id: input.userId,
            content_type: "book_review",
            content: reviewHistory?.content ?? "",
        },
        });
        userPromptRaw = newPrompt.content;
    }

    const userPromptText = Array.isArray(userPromptRaw)
        ? userPromptRaw.map((c: any) => c.text || "").join("\n")
        : String(userPromptRaw);
    return { ...input, userPrompt: userPromptText };
  },

  // Step 2: 本の内容を取得（Web検索 or API）
  async (context, config) => {
    const mcp = (config as { metadata: { mcp: MCPClient } }).metadata.mcp;
    const bookInfo = await mcp.callTool({
        name: "search_book",
        arguments: { title: context.title},
    });
    const bookContentText = Array.isArray(bookInfo?.content)
        ? bookInfo.content.map((c: any) => c.text || "").join("\n")
        : String(bookInfo?.content ?? "情報取得に失敗しました。");
    return { ...context, bookContent: bookContentText };
  },

  // Step 3: Claudeによる書評生成
  async (context) => {
    console.log("userPrompt:", context.userPrompt);
    console.log("bookContent", context.bookContent);
    const prompt = `
あなたは書評家AIです。以下のユーザー特徴と書籍内容をもとに、ユーザーの特徴を捉えた、自然な書評を作成してください。

ユーザー特徴:
${context.userPrompt}

書籍タイトル: ${context.title}
著者: ${context.author}
書籍内容/レビュー: ${context.bookContent}
    `;

    const response = await model.invoke([new HumanMessage(prompt)]);
    return response.content;
  },
]);

// ---------- 実行 ----------
(async () => {
  const mcp = new MCPClient();
  await mcp.connectToServer("../mcp-server/dist/main.js");
  const userInput = "私はUserId1のユーザーです。芥川龍之介作『羅生門』の書評を生成してください。";
  const output = await reviewWorkflow.invoke(
    userInput,
    { metadata: { mcp } }
  );

  console.log("📘 書評生成結果:\n", output);
})();
