import { RunnableSequence } from "@langchain/core/runnables";
import type { RunnableConfig } from "@langchain/core/runnables";
import { HumanMessage } from "@langchain/core/messages";
import type { MCPClient } from "../mcpClient.js";
import { extractReviewBookInfo } from "../chains/extractChain.js";
import { model } from "../model.js";
import dotenv from "dotenv";
import { book_review_prompt } from "../bookReviewPrompt.js";

dotenv.config();

// ---------- LangChainワークフロー ----------
export const reviewWorkflow = RunnableSequence.from([
  // Step 0: 入力から title, is_book_review を抽出
  async (input: { message: string; userId?: string; chapterSummary?: string; userRequest?: string }, config: RunnableConfig) => {
    const extractResult = await extractReviewBookInfo(input.message, config);
    return { ...extractResult, ...input };
  },

  // Step 1: MCP からユーザープロンプト取得
  async (
    context: {
      userId: string;
      title: string;
      is_book_review: boolean;
      chapterSummary: string;
      userRequest: string;
    },
    config: RunnableConfig
  ) => {
    if (!context.is_book_review) {
      throw new Error("書評生成の意図がない入力です。");
    }

    const mcp: MCPClient = (config as any).metadata.mcp;

    const promptRes = await mcp.callTool({ name: "get_prompt", arguments: { userId: context.userId } });
    const userPromptRaw = promptRes?.content;

    const userPromptText = Array.isArray(userPromptRaw)
      ? userPromptRaw.map((c: any) => c.text || "").join("\n")
      : String(userPromptRaw);

    return { ...context, userPrompt: userPromptText };
  },

  // Step 2: 書籍内容取得（Web検索 or API）
  async (context: { userId: string; title: string; userPrompt: string }, config: RunnableConfig) => {
    const mcp: MCPClient = (config as any).metadata.mcp;

    const bookInfo = await mcp.callTool({ name: "search_book", arguments: { title: context.title } });
    const bookContentText = Array.isArray(bookInfo?.content)
      ? bookInfo.content.map((c: any) => c.text || "").join("\n")
      : String(bookInfo?.content ?? "情報取得に失敗しました。");

    return { ...context, bookContent: bookContentText };
  },

  // Step 3: Claude による書評生成
  async (
    context: {
      userPrompt: string;
      title: string;
      bookContent: string;
      chapterSummary: string;
      userRequest: string;
    }
  ) => {
    console.log("✅ 書評生成を開始します。");
    console.log("📚 書籍タイトル:", context.title);
    console.log("🖊️ ユーザープロンプト:", context.userPrompt);
    console.log("📖 書籍内容:", context.bookContent)
    console.log("📝 各章のタイトル及び要約:", context.chapterSummary);
    console.log("💬 ユーザーのリクエスト:", context.userRequest);
    const prompt = `
あなたは書評家AIです。以下のユーザー特徴と書籍内容、各章の内容をもとに、ユーザーの特徴を捉えた自然な書評を作成してください。
また、素晴らしい書評とは以下の書評生成ルールに遵守することです。
ユーザーのリクエスト:${context.userRequest}
ユーザー特徴:${context.userPrompt}
書評生成ルール:${book_review_prompt}
書籍タイトル: ${context.title}
書籍内容/レビュー: ${context.bookContent}
各章のタイトル及び要約:${context.chapterSummary}
    `;

    const response = await model.invoke([new HumanMessage(prompt)]);
    return response.content;
  },
]);
