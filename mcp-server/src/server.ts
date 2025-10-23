import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getPrompt } from './tools/getPrompt.js';
import { updatePrompt } from './tools/updatePrompt.js';
import { getReview } from './tools/getReview.js';

export async function startMCPServer() {
    const server = new McpServer({
        name: 'book-review-mcp',
        version: '1.0.0',
        description: 'MCP server for Book Review AI',
    });

    server.tool('prompt_get', getPrompt as any);
    server.tool('prompt_create', updatePrompt as any);
    server.tool('prompt_update', updatePrompt as any);
    server.tool('review_get', getReview as any);

    const transport = new StdioServerTransport();
    await server.connect(transport);
}
