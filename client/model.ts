import { ChatAnthropic } from "@langchain/anthropic";
import dotenv from "dotenv";
dotenv.config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
export const model = new ChatAnthropic({
  model: "claude-3-haiku-20240307",
  temperature: 0.7,
  apiKey: ANTHROPIC_API_KEY,
});