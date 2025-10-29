import { MCPClient } from "./../mcpClient.js"; // MCPクライアントのパスに合わせて調整
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
dotenv.config();

async function testCallTool() {
    const mcp = new MCPClient();

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const serverPath = path.resolve(__dirname, "./../../../mcp-server/dist/main.js");
    await mcp.connectToServer(serverPath);

    try {
        const result = await mcp.callTool({
            name: "get_prompt",
            arguments: { userId: "1" },
    });

        console.log("✅ callTool result:");
        console.dir(result, { depth: null });
    } catch (err) {
        console.error("❌ callTool failed:", err);
    } finally {
        await mcp.cleanup();
    }
}

testCallTool();
