import { startMCPServer } from "./server.js";
async function bootstrap() {
    console.log('🚀 Starting MCP server...');
    await startMCPServer();
    console.log('✅ MCP server is running.');
}
bootstrap();
//# sourceMappingURL=main.js.map