import type { RunnableConfig } from "@langchain/core/runnables";
import { HumanMessage } from "@langchain/core/messages";
import dotenv from "dotenv";
import { model } from "./../model.js";

dotenv.config();

export async function extractInfo(userInput: string, config: RunnableConfig): Promise<{ userId: string; title: string; author: string }> {
    const prompt = `
あなたは入力文から「UserId」「本のタイトル」「著者名」を抽出する抽出AIです。
出力は必ず次のJSON形式にしてください：

{
  "userId": "string | null",
  "title": "string | null",
  "author": "string | null"
  "is_book_review": "boolean" // 書評生成の意図がある場合はtrue、ない場合はfalse
}

例：
入力：「私はUserId1のユーザーです。芥川龍之介作『羅生門』の書評を生成してください」
出力：
{"userId": "1", "title": "羅生門", "author": "芥川龍之介" , "is_book_review": true}

では、次の入力から抽出してください：

${userInput}
`;
    const response = await model.invoke([new HumanMessage(prompt)]);
    const text = Array.isArray(response.content)
        ? response.content.map((block) => (block.type === "text" ? block.text : "")).join("")
        : response.content;

    try {
        const parsed = JSON.parse(text);
        if (!parsed.is_book_review) {
            throw new Error("書評生成の意図がない入力です");
        }
        console.log("✅ 抽出結果:", parsed);
        return {
            userId: parsed.userId ?? "",
            title: parsed.title ?? "",
            author: parsed.author ?? "",
        };
    } catch (err) {
        console.error("❌ JSONパースに失敗:", text);
        throw err;
    }
}