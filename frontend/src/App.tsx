import { useState, useEffect, useRef } from "react";
import { Box, Typography, TextField, Button, Paper, Avatar, CircularProgress, Tooltip, IconButton, } from "@mui/material";
import SendIcon from '@mui/icons-material/Send';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import type { WSMessage } from "./types";
import "./App.css"; // ← CSS を適用

export default function App() {
  const wsRef = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<WSMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [connected, setConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- WebSocket 接続 ---
  const connectWS = () => {
    const socket = new WebSocket("ws://localhost:8080");
    wsRef.current = socket;

    socket.onopen = () => {
      setConnected(true);
      addLog({ type: "info", content: "✅ WebSocket Connected", is_user: false });
    };

    socket.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        addLog({ type: msg.type, content: msg.content, is_user: false, hint: msg.hint });
        setIsTyping(false);
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    };

    socket.onclose = () => {
      setConnected(false);
      addLog({ type: "error", content: "❌ WebSocket Closed", is_user: false });
      setTimeout(connectWS, 2000);
    };
  };

  useEffect(() => {
    connectWS();
    return () => wsRef.current?.close();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const addLog = (msg: WSMessage) => setMessages((prev) => [...prev, msg]);

  const sendMessage = () => {
    if (!wsRef.current || !connected || input.trim() === "") return;
    addLog({ type: "chat", content: input, is_user: true });
    wsRef.current.send(input);
    setInput("");
    setIsTyping(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Box className="chat-background">
      <Paper elevation={5} className="chat-container">
        <Box className="chat-header">
          <Typography variant="h6">📚 Book Review AI</Typography>
          <Box className="connection-status">
            <Typography variant="body2" color={connected ? "green" : "red"}>
              {connected ? "● Connected" : "× Disconnected"}
            </Typography>
          </Box>
        </Box>

        {/* メッセージ表示エリア */}
        <Box className="chat-messages">
          {messages.map((msg, idx) => {
            const isUser = msg.is_user === true;
            const bubbleClass = isUser ? "bubble-user" : "bubble-system";
            return (
              <Box key={idx} className={`chat-row ${isUser ? "right" : "left"}`}>
                <Box className={`chat-bubble ${bubbleClass}`}>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {msg.content}
                  </Typography>
                </Box>
                {/* ヒントアイコン表示 */}
                {msg.hint && msg.hint.trim() !== "" && (
                  <Tooltip title={msg.hint} arrow>
                    <IconButton size="small" sx={{ ml: 1 }}>
                      <HelpOutlineIcon fontSize="small" color="action" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            );
          })}
          {isTyping && (
            <Box className="chat-row left">
              <Box className="chat-bubble bubble-system" sx={{ display: "flex", alignItems: "center" }}>
                <Avatar sx={{ bgcolor: "#1976d2", width: 28, height: 28, mr: 1 }}>🤖</Avatar>
                <CircularProgress size={16} sx={{ mr: 1, color: "#1976d2" }} />
                <Typography variant="body2">AIが入力中…</Typography>
              </Box>
            </Box>
          )}
          <div ref={scrollRef} />
        </Box>

        {/* 入力エリア */}
        <Box className="chat-input">
          <TextField
            fullWidth
            variant="outlined"
            placeholder="メッセージを入力..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            multiline
            maxRows={20}
          />
          <Button variant="contained" onClick={sendMessage} disabled={!connected}>
            <SendIcon />
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
