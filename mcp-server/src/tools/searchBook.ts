import fetch from "node-fetch";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

// Create a writable stream for the log file
const logFile = fs.createWriteStream("server.log", { flags: "a" });
const logStdout = process.stdout;

// Override console.log to write to both the console and the log file
console.log = function (message, ...optionalParams) {
    logFile.write(`${new Date().toISOString()} - ${message}\n`);
    logStdout.write(`${new Date().toISOString()} - ${message}\n`);
    if (optionalParams.length > 0) {
        logFile.write(`${optionalParams.map(param => JSON.stringify(param)).join(" ")}\n`);
        logStdout.write(`${optionalParams.map(param => JSON.stringify(param)).join(" ")}\n`);
    }
};

// 環境変数からAPIキーを取得
const SERPAPI_KEY = process.env.SERPAPI_KEY!;
if (!SERPAPI_KEY) {
  console.error("❌ SERPAPI_KEY is not defined in environment variables.");
}

async function fetchSerpSnippets(query: string) {
    console.log(`🔍 fetchSerpSnippets: 開始 - クエリ: "${query}"`);
    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google");
    url.searchParams.set("q", query);
    url.searchParams.set("hl", "ja");
    url.searchParams.set("num", "10");
    url.searchParams.set("api_key", SERPAPI_KEY);

    try {
        const res = await fetch(url.toString());
        console.log("📡 SerpAPI レスポンスステータス:", res.status);
        if (!res.ok) throw new Error("SerpAPI request failed");

        const data = await res.json() as {
          organic_results?: { title: string; link: string; snippet?: string }[];
        };
        console.log("📦 SerpAPI レスポンスデータ:", data);
        const snippets =
          data.organic_results?.map((r: any) => ({
            title: r.title,
            link: r.link,
            snippet: r.snippet,
          })) || [];
        console.log(`✅ ${snippets.length} 件のスニペットを取得`);
        return snippets;
    }catch (err) {
        console.error("❌ fetchSerpSnippets エラー:", err);
        throw err;
    }

}

export async function fetchBookReviews(title: string) {
    console.log(`📘 fetchBookReviews: 開始 - タイトル: "${title}"`);
    const queries = [
      `${title} レビュー`,
      `${title} 要約`,
      `${title} 内容`,
    ];

  const allResults = await Promise.all(
    queries.map(async (q) => {
      try {
        console.log(`➡️ クエリ実行: "${q}"`);
        const res = await fetchSerpSnippets(q);
        console.log(`📥 クエリ "${q}" の結果件数: ${res.length}`);
        return res;
      } catch(err) {
        console.error(`⚠️ クエリ "${q}" の取得に失敗:`, err);
        return [];
      }
    })
  );

  const merged = allResults.flat();
  console.log(`📊 全クエリ合計取得件数（重複含む）: ${merged.length}`);

  const unique = Array.from(new Map(merged.map((r) => [r.link, r])).values());
  console.log(`🧹 重複除去後のユニーク件数: ${unique.length}`);

  return unique;
}