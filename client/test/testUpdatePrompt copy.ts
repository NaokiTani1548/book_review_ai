import { MCPClient } from "./../mcpClient.js";
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
            name: "update_prompt",
            arguments: { userId: "1", content: "ですます調・語尾がb" },
    });

        console.log("✅ callTool result:");
        console.dir(result, { depth: null });
    } catch (err) {
        console.error("❌ callTool failed:", err);
    }
}

testCallTool();
