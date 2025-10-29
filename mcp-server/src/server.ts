import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getPrompt } from './tools/getPrompt.js';
import { updatePrompt } from './tools/updatePrompt.js';
import { getReview } from './tools/getReview.js';
import { fetchBookReviews } from './tools/searchBook.js';
import { grpcClient } from './grpc/client.js';
import { z } from "zod";
import fs from "fs";

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

const getPromptParams = {
  userId: z.string(),
};
const searchBookParams = {
  title: z.string(),
};

export async function startMCPServer() {
    const server = new McpServer({
        name: 'book-review-mcp',
        version: '1.0.0',
        description: 'MCP server for Book Review AI',
    });

    server.tool('create_prompt', updatePrompt as any);
    server.tool('update_prompt', updatePrompt as any);
    server.tool('get_review', getReview as any);
    server.tool(
        'search_book',
        searchBookParams,
        { title: "本のタイトルからその書籍に関するレビューや要約を検索します" },
        async ({ title }) => {
            try {
                const reviews = await fetchBookReviews(title);
                const reviewSnippets = reviews
                  .map((r) => `- ${r.title}\n${r.snippet}\n${r.link}`)
                  .join("\n\n");
                console.log(`🔍 search_book found ${reviews.length} reviews for title: ${title}`);
                return {
                  content: [{ type: 'text', text: reviewSnippets }]
                };
            } catch (err: any) {
                console.log("❌ Error in search_book tool:", err);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: ${err.message || String(err)}`,
                        },
                    ],
                    isError: true,
                };
            }
        }

    );
    server.tool(
        "get_prompt",
        getPromptParams,
        { title: "ユーザーに紐づけられた文章特徴プロンプトを取得します" },
        async ({ userId }) => {
            try {
                const res = await new Promise<any>((resolve, reject) => {
                    grpcClient.GetPrompt({ userId }, (err: any, res: any) => {
                        if (err) {
                            console.error("❌ gRPC GetPrompt error:", err);
                            return reject(err);
                        }
                        resolve(res);
                    });
                });

                const content = Array.isArray(res.content)
                    ? res.content
                    : [{ type: "text", text: String(res.content) }];
                return { content };
            } catch (err: any) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: ${err.message || String(err)}`,
                        },
                    ],
                    isError: true,
                };
            }
        }
    );

    const transport = new StdioServerTransport();
    await server.connect(transport);
}
