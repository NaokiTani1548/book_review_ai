import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { handlePromptGet, handlePromptCreate, handlePromptUpdate } from './handlers/prompt.handler.js';
export async function startMCPServer() {
    const server = new McpServer({
        name: 'book-review-mcp',
        version: '1.0.0',
        description: 'MCP server for Book Review AI',
    });
    // Prompt 関連ハンドラ登録
    server.tool('prompt.get', handlePromptGet);
    server.tool('prompt.create', handlePromptCreate);
    server.tool('prompt.update', handlePromptUpdate);
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
//# sourceMappingURL=server.js.map