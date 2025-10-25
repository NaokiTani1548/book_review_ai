import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

// 環境変数からAPIキーを取得
const SERPAPI_KEY = process.env.SERPAPI_KEY!;

async function fetchSerpSnippets(query: string) {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("hl", "ja");
  url.searchParams.set("num", "10");
  url.searchParams.set("api_key", SERPAPI_KEY);

  const res = await fetch(url.toString());
    if (!res.ok) {
        console.error("❌ SerpAPI request failed:", res.status, await res.text());
        throw new Error("SerpAPI request failed");
    }

  const data = await res.json() as {
    organic_results?: { title: string; link: string; snippet?: string }[];
  };
  console.log("✅ SerpAPI response:", JSON.stringify(data, null, 2));
  const snippets =
    data.organic_results?.map((r: any) => ({
      title: r.title,
      link: r.link,
      snippet: r.snippet,
    })) || [];

  return snippets;
}

async function fetchBookReviews(title: string) {
  const queries = [
    `${title} 書評`,
    `${title} 感想`,
    `${title} 要約`,
    `${title} レビュー`,
  ];

  const allResults = await Promise.all(
    queries.map(async (q) => {
      try {
        const res = await fetchSerpSnippets(q);
        console.log(`🔍 Query "${q}" returned ${res.length} results`);
        return res;
      } catch(err) {
        console.warn(`❌ Query "${q}" failed:`, err);
        return [];
      }
    })
  );

  const merged = allResults.flat();
  const unique = Array.from(new Map(merged.map((r) => [r.link, r])).values());

  return unique;
}

// ==========================
// 統合ハンドラ関数（メイン）
// ==========================
export async function searchBookEnhanced(title: string) {
  console.log(`🔍 Searching book info for: ${title}`);


  // SerpAPI（Google検索）でレビュー記事取得
  const reviews = await fetchBookReviews(title);

  const reviewSnippets = reviews
    .map((r) => `- ${r.title}\n${r.snippet}\n${r.link}`)
    .join("\n\n");

  return {
    reviewSnippets,
  };
}

(async () => {
  const title = process.argv[2] || "世界一流エンジニアの思考法";
  console.log(`🚀 Running book search for: ${title}`);

  try {
    const result = await searchBookEnhanced(title);
    console.log("\n=== 📝 Review Snippets (first 1500 chars) ===");
    console.log(result.reviewSnippets.slice(0, 1500));
  } catch (err) {
    console.error("❌ Error during book search:", err);
  }
})();