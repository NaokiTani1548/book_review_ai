export interface WSMessage {
  type: "info" | "prompt" | "review" | "chat" | "upsert_prompt" | "error";
  content: string;
  is_user?: boolean;
  hint?: string;
}
