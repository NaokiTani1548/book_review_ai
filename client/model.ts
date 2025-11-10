import { ChatAnthropic } from "@langchain/anthropic";
import { Anthropic } from "@anthropic-ai/sdk";
import dotenv from "dotenv";
dotenv.config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is not set");
}

export const model = new ChatAnthropic({
  model: "claude-sonnet-4-20250514",
  temperature: 0.7,
  apiKey: ANTHROPIC_API_KEY,
});
// 安いモデル:claude-3-haiku-20240307

export const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
