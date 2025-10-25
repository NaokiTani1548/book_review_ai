import fetch from "node-fetch";

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
  if (!res.ok) throw new Error("SerpAPI request failed");

  const data = await res.json() as {
    organic_results?: { title: string; link: string; snippet?: string }[];
  };
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
    `${title} レビュー`,
    `${title} 要約`,
    `${title} 内容`,
  ];

  const allResults = await Promise.all(
    queries.map(async (q) => {
      try {
        const res = await fetchSerpSnippets(q);
        return res;
      } catch {
        return [];
      }
    })
  );

  const merged = allResults.flat();
  const unique = Array.from(new Map(merged.map((r) => [r.link, r])).values());

  return unique;
}

export const searchBook = {
    name: 'search_book',
    description: '指定された書籍タイトルに関するレビューや要約を検索し、スニペットを返します',
    inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
    },
    required: ['title'],
    },
    func: async ({ title }: { title: string }) => {
        console.log(`🔍 Searching book info for: ${title}`);

        // SerpAPI（Google検索）でレビュー記事取得
        const reviews = await fetchBookReviews(title);

        const reviewSnippets = reviews
          .map((r) => `- ${r.title}\n${r.snippet}\n${r.link}`)
          .join("\n\n");

        return {
          content: [{ type: 'text', text: reviewSnippets }]
        };
      },
};