# 書評AI PoC (Book Review AI)

## 概要
このプロジェクトは、ユーザーごとに異なる書評スタイルを学習し、自動で書評を生成する AI システムの PoC（Proof of Concept）です。

現時点で以下を実装済み：
- NestJS を用いた MCP (Microservice Control Plane) サーバー
- gRPC サーバーの起動と RPC 呼び出し
- サーバー内 PoC クライアントから `GenerateReview` の呼び出し確認

書評の生成自体はダミー実装（Markdown形式でサンプルテキスト返却）です。

---

## 技術スタック

| 層 | 技術 |
|----|------|
| サーバー | NestJS + gRPC (`@nestjs/microservices`, `@grpc/grpc-js`, `@grpc/proto-loader`) |
| データベース | なし（次マイルストーンで Prisma + MySQL を追加予定） |
| クライアント | Node.js + gRPC (PoC) |
| 書式 | Markdown |

---


---

## セットアップ

### 1. サーバー起動
```bash
cd shohyo-mcp
npm install
npm run start
```

### 2. クライアントから呼び出し
```bash 
cd client
node grpcClient.js
```
