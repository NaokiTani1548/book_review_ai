import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getPrompt } from './tools/getPrompt.js';
import { updatePrompt } from './tools/updatePrompt.js';
import { getReview } from './tools/getReview.js';
import { searchBook } from './tools/searchBook.js';

export async function startMCPServer() {
    const server = new McpServer({
        name: 'book-review-mcp',
        version: '1.0.0',
        description: 'MCP server for Book Review AI',
    });

    server.tool('get_prompt', getPrompt as any);
    server.tool('create_prompt', updatePrompt as any);
    server.tool('update_prompt', updatePrompt as any);
    server.tool('get_review', getReview as any);
    server.tool('search_book', searchBook as any);

    const transport = new StdioServerTransport();
    await server.connect(transport);
}
