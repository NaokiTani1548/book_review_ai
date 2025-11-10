import type { RunnableConfig } from "@langchain/core/runnables";
import { HumanMessage } from "@langchain/core/messages";
import dotenv from "dotenv";
import { model } from "./../model.js";

dotenv.config();

export async function extractRequestInfo(userInput: string, config: RunnableConfig): Promise<{ userId: string; is_upsert_prompt: boolean; is_book_review: boolean; }> {
    const prompt = `
あなたは入力文からユーザーの意図を抽出するAIです。
出力は必ず次のJSON形式にしてください。
JSON形式にする際、コードブロック等を用いるとJSONパースに失敗するので、出力には使わず文字列で返してください：

{
  "userId": "string | null",
  "is_book_review": "boolean" // 書評生成の意図がある場合はtrue、ない場合はfalse
  "is_upsert_prompt": "boolean" // プロンプト登録の意図がある場合はtrue、ない場合はfalse
}

例1：
入力：「私はUserId1のユーザーです。芥川龍之介作『羅生門』の書評を生成してください」
出力：{"userId": "1", "is_book_prompt": false, "is_book_review": true}

例2：
入力：私はUserId:naokitani48です。以下の過去に書いた書評を読んで私のプロンプトを作成してください
出力：{"userId": "1", "is_book_prompt": true, "is_book_review": false}

では、次の入力から抽出してください：

${userInput}
`;
    const response = await model.invoke([new HumanMessage(prompt)]);
    const text = Array.isArray(response.content)
        ? response.content.map((block) => (block.type === "text" ? block.text : "")).join("")
        : response.content;
    try {
        const parsed = JSON.parse(text);
        console.log("✅ 抽出結果:", parsed);
        return {
            userId: parsed.userId ?? "",
            is_upsert_prompt: parsed.is_upsert_prompt ?? false,
            is_book_review: parsed.is_book_review ?? false,
        };
    } catch (err) {
        console.error("❌ JSONパースに失敗:", text);
        throw err;
    }
}

export async function extractReviewBookInfo(userInput: string, config: RunnableConfig): Promise<{ userId: string; title: string; is_book_review: boolean; }> {
    const prompt = `
あなたは入力文から「UserId」「本のタイトル」「著者名」を抽出する抽出AIです。
出力は必ず次のJSON形式にしてください(そのままJSONパースを行うので、それ以外の文字は出力しないようにしてください)：

{
  "userId": "string | null",
  "title": "string | null",
  "is_book_review": "boolean" // 書評生成の意図がある場合はtrue、ない場合はfalse
}

例：
入力：「私はUserId1のユーザーです。芥川龍之介作『羅生門』の書評を生成してください」
出力：{"userId": "1", "title": "羅生門", "is_book_review": true}

では、次の入力から抽出してください：

${userInput}
`;
    const response = await model.invoke([new HumanMessage(prompt)]);
    const text = Array.isArray(response.content)
        ? response.content.map((block) => (block.type === "text" ? block.text : "")).join("")
        : response.content;
    try {
        const parsed = JSON.parse(text);
        console.log("✅ 抽出結果:", parsed);
        return {
            userId: parsed.userId ?? "",
            title: parsed.title ?? "",
            is_book_review: parsed.is_book_review ?? false,
        };
    } catch (err) {
        console.error("❌ JSONパースに失敗:", text);
        throw err;
    }
}

export async function extractUpsertPromptInfo(userInput: string, config: RunnableConfig): Promise<{ userId: string; example_sentence: string; prompt: string; is_upsert_prompt: boolean; }> {
    const prompt = `
あなたは入力文から「UserId」「ユーザーの書く文章の例文」「登録したいプロンプト」を抽出する抽出AIです。
出力は必ず次のJSON形式にしてください(そのままJSONパースを行うので、それ以外の文字は出力しないようにしてください)：

{
  "userId": "string", 
  "example_sentence": "string", // 空文字列の場合もある
  "prompt": "string", // 空文字列の場合もある
  "is_upsert_prompt": "boolean" // プロンプト登録の意図がある場合はtrue、ない場合はfalse
}

例1：
入力：私はUserId:naokitani48です。以下の過去に書いた書評を読んで私のプロンプトを新規登録してください
この本の最大の価値は、著者の実体験に基づいた生々しいエピソードだ。理論だけじゃなくて、実際に世界最高峰の環境で働いた人の言葉だから説得力がある。特に「ファクトの積み重ね」という考え方は、どんな技術領域でも応用できる
出力：{"userId": "naokitani48","example_sentence": "この本の最大の価値は、著者の実体験に基づいた生々しいエピソードだ。理論だけじゃなくて、実際に世界最高峰の環境で働いた人の言葉だから説得力がある。特に「ファクトの積み重ね」という考え方は、どんな技術領域でも応用できる","prompt": "","is_upsert_prompt": true}

例2：
入力：私はUserId:1です。以下の情報を私のプロンプトとして新規登録してください
ですます調で、箇条書きではなく文章形式で書く。段落ごとに改行を入れる
出力：{"userId": "1","example_sentence": "","prompt": "ですます調で、箇条書きではなく文章形式で書く。段落ごとに改行を入れる","is_upsert_prompt": true}

**出力では絶対にコードブロック（\`\`\`）や説明文を含めないでください。**
では、次の入力から抽出してください：

${userInput}
`;
    const response = await model.invoke([new HumanMessage(prompt)]);
    const text = Array.isArray(response.content)
        ? response.content.map((block) => (block.type === "text" ? block.text : "")).join("").replace(/^```json/, "").replace(/^```/, "").replace(/```$/, "").trim()
        : response.content;
    try {
        const parsed = JSON.parse(text);
        console.log("✅ 抽出結果:", parsed);
        return {
            userId: parsed.userId ?? "",
            example_sentence: parsed.example_sentence ?? "",
            prompt: parsed.prompt ?? "",
            is_upsert_prompt: parsed.is_upsert_prompt ?? false,
        };
    } catch (err) {
        console.error("❌ JSONパースに失敗:", text);
        throw err;
    }
}