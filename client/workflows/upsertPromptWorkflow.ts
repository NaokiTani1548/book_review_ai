// reviewWorkflow.ts
import { RunnableSequence } from "@langchain/core/runnables";
import type { RunnableConfig } from "@langchain/core/runnables";
import { HumanMessage } from "@langchain/core/messages";
import type { MCPClient } from "./../mcpClient.js";
import { extractUpsertPromptInfo } from "./../chains/extractChain.js";
import { model } from "./../model.js";
import dotenv from "dotenv";

dotenv.config();

// ---------- LangChainワークフロー ----------
export const upsertPromptWorkflow = RunnableSequence.from([

  // Step 0: 入力から userId, title, author, is_book_review を抽出
  async (input: string, config: RunnableConfig) => {
    return await extractUpsertPromptInfo(input, config);
  },

  // Step 1: ユーザーのプロンプト取得・新規登録または更新の判断
  async (input: { userId: string; example_sentence: string; prompt: string; is_upsert_prompt: boolean }, config: RunnableConfig) => {
    if (!input.is_upsert_prompt) {
      throw new Error("プロンプト登録の意図がない入力です。");
    }

    const mcp: MCPClient = (config as any).metadata.mcp;

    let userPromptRaw = null;
    const promptRes = await mcp.callTool({ name: "get_prompt", arguments: { userId: input.userId } });
    userPromptRaw = promptRes?.content;

    if (!userPromptRaw) {
        return { ...input, userPrompt: "", is_new_user: true };
    }

    const userPromptText = Array.isArray(userPromptRaw)
      ? userPromptRaw.map((c: any) => c.text || "").join("\n")
      : String(userPromptRaw);

    return { ...input, oldPrompt: userPromptText, is_new_user: true };
  },

  // Step 2:　プロンプト作成
  async (context: { userId: string; example_sentence: string; prompt: string; oldPrompt: string; is_new_user: boolean }, config: RunnableConfig) => {
    const prompt = `
あなたは「ユーザー固有の文体・思考の癖・語彙の傾向」を抽出してまとめる専門アナリストAIです。
あなたのタスクは、以下2つの情報から、ユーザーの文章特徴を正確に抽出し、1つの「ユーザー特徴プロンプト」として統合することです。
【1】ユーザーが実際に書いた文章（文体の実例）
【2】ユーザーが登録したい特徴プロンプト（希望する文体・思考・語彙の方向性）
【3】今まで使っていたプロンプト

#1 ユーザーが実際に書いた文章の分析
以下を重点的に分析し、特徴を抽出してください。かっこの中はあくまでも例なので、書評生成AIがユーザーを真似やすいように特徴をまとめてください：
- 文字数の傾向（平均文字数など）
- 文の構成（小見出しをつける/箇条書き形式/完全な文章形式（段落区切り））
- 文体（丁寧 / 砕けた / ロジカル / 事実中心 / 感情中心など）
- 語彙の傾向（抽象語が多い / 比喩が多い / 外来語が多い など）
- 文章構造（結論先行・起承転結・短文中心・長文中心 など）
- 思考タイプ（論理型 / 物語型 / 感情型 / 批評型 / 深掘り型）
- 口調（ですます / だ・である 調）
- 一人称（私 / 僕 / 俺 / 自分 など）
- よく使う表現・フレーズ
- その他ユーザを真似て書評を生成する場合に役立つ特徴

#2 ユーザーが登録したい特徴プロンプトの考慮
ユーザーが追加してほしい特徴を読み取る：
- ユーザーが指定した特徴を漏れなく反映すること
- ユーザーが指定した特徴はそのまま書き写すこと
ユーザーが指定したことは **必ず反映** してください。

#3 今まで使っていたプロンプトの考慮
ユーザーが以前に使っていたプロンプトを参考に、そこに含まれる特徴も考慮してください。
- ユーザーが以前に使っていたプロンプトをベースに、新しい特徴を統合すること
- 基本的にはユーザーが以前に使っていたプロンプトに追加する形で#1と#2の特徴を反映すること
- もし#1と#2の特徴と矛盾する場合は、#1と#2を優先して反映すること

上記#1,#2,#3を融合した「完全版ユーザー特徴プロンプト」を作成してください。
生成する文章は、次の書評生成AIがそのまま利用できる **指示文形式** にしてください。

# 制約
- 出力はstring形式のみ
- コードブロックは使用しないでください
- JSON形式で返さない
- 解説や余計な文章は禁止
- 「ユーザー特徴プロンプト」の本文のみをコンパクトにまとめる

以下がユーザーの情報です：
ユーザーが実際に書いた文章：
${context.example_sentence}
ユーザーが登録したい特徴プロンプト：
${context.prompt}
今まで使っていたプロンプト：
${context.oldPrompt}
    `;  

    const response = await model.invoke(
        [new HumanMessage(prompt)],
    );

    return { ...context, new_prompt: response.content };
  },

  // Step 3: Claude による書評生成
  async (context: { userId: string; is_new_user: boolean; new_prompt: string }, config: RunnableConfig) => {
    const mcp: MCPClient = (config as any).metadata.mcp;


    if (!context.is_new_user) {
        const response = await mcp.callTool({ name: "update_prompt", arguments: { userId: context.userId, content: context.new_prompt } });
        return { new_prompt: context.new_prompt, response: response };
    }
    else {
        const response = await mcp.callTool({ name: "create_prompt", arguments: { userId: context.userId, content: context.new_prompt } });
        return { new_prompt: context.new_prompt, response: response };
    }
  },
]);

