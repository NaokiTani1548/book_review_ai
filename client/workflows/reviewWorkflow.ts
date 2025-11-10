// reviewWorkflow.ts
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

  // Step 0: 入力から userId, title, author, is_book_review を抽出
  async (input: string, config: RunnableConfig) => {
    return await extractReviewBookInfo(input, config);
  },

  // Step 1: ユーザー用プロンプト取得または生成
  async (input: { userId: string; title: string; is_book_review: boolean }, config: RunnableConfig) => {
    if (!input.is_book_review) {
      throw new Error("書評生成の意図がない入力です。");
    }

    const mcp: MCPClient = (config as any).metadata.mcp;

    //　章情報の入力
    const chapterSummary = await mcp.requestChapterSummary();
    // その他リクエスト情報の入力
    const userRequest = await mcp.requestOthers();

    let userPromptRaw = null;
    const promptRes = await mcp.callTool({ name: "get_prompt", arguments: { userId: input.userId } });
    userPromptRaw = promptRes?.content;

    const userPromptText = Array.isArray(userPromptRaw)
      ? userPromptRaw.map((c: any) => c.text || "").join("\n")
      : String(userPromptRaw);

    return { ...input, userPrompt: userPromptText, chapterSummary: chapterSummary, userRequest: userRequest };
  },

  // Step 2: 書籍内容取得（Web検索 or API）
  async (context: { userId: string; title: string; author: string; userPrompt: string }, config: RunnableConfig) => {
    const mcp: MCPClient = (config as any).metadata.mcp;
    const bookInfo = await mcp.callTool({ name: "search_book", arguments: { title: context.title } });

    const bookContentText = Array.isArray(bookInfo?.content)
      ? bookInfo.content.map((c: any) => c.text || "").join("\n")
      : String(bookInfo?.content ?? "情報取得に失敗しました。");

    return { ...context, bookContent: bookContentText };
  },

  // Step 3: Claude による書評生成
  async (context: { userPrompt: string; title: string; bookContent: string; chapterSummary: string; userRequest: string}) => {
    console.log("userPrompt:", context.userPrompt)
    console.log("bookContent:", context.bookContent)
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

    const response = await model.invoke(
        [new HumanMessage(prompt)],
    );
    return response.content;
  },
]);

