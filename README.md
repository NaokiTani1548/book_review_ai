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

### 1. DB起動
```bash
cd backend
docker-compose up -d
npx prisma migrate dev --name init
npx prisma generate
npm run seed

# テーブル確認
docker exec -it bookreview_db psql -U user -d bookreview -c "\dt"
docker exec -it bookreview_db psql -U user -d bookreview -c "SELECT * FROM \"Prompt\";"
docker exec -it bookreview_db psql -U user -d bookreview -c "SELECT * FROM \"Review\";"
# docker停止
docker compose down
docker-compose down -v
```

### 1. サーバー起動
```bash
cd backend
npm install
npm run start:dev

# RPC疎通確認
grpcurl -plaintext   -proto backend/src/proto/review.proto   -d '{"userId":1}'   localhost:5000 review.ReviewService/GetPrompt
grpcurl -plaintext   -proto backend/src/proto/review.proto   -d '{"userId":1, "content":"口語的で短文多め。語尾がa"}'   localhost:5000 review.ReviewService/UpdatePrompt
grpcurl -plaintext   -proto backend/src/proto/review.proto   -d '{"userId":1}'   localhost:5000 review.ReviewService/GetReviews

```

### 2. クライアントから呼び出し
```bash 
cd client
```

## 開発Tips
### Prismaのスキーマ変更時
```bash
npx prisma migrate dev --name <Name>
npx prisma generate

# DBリセット
npx prisma migrate reset
# 初期データ投入
npx prisma db seed(npm run seed)
```


### Todo
- proto消える問題 => nest-cli.jsonに設定を書き込むと解決
