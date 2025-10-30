# 書評 AI PoC (Book Review AI)

## 概要

書評を自動で書く AI「書評 AI」
書評はユーザーごとに書き方が違うので、利用ユーザーの書評を DB に保存しておき、特徴をプロンプトにまとめ、プロンプトを基に新たな書評を生成します。ユーザーの特徴をまとめたプロンプトも DB へ保存
書評は Notion から取得

### 利用イメージ

・ユーザーが AI に自分の情報を登録依頼
→ ユーザーの文章の書き方を抽出し、特徴プロンプトを生成
→ 　 → ＡＩはそのユーザーの特徴をまとめた prompt の保存を user_id と紐づけてバックエンドに依頼
・ユーザーが本のタイトルを指定し、ＡＩに書評の作成を依頼
→ ＡＩはそのユーザーの特徴をまとめた prompt の取得（ＤＢに保存されている）をバックエンドに依頼
→ ＡＩは本のタイトルを基に本の内容を検索
→ ＡＩは取得した prompt と本の内容に従って書評を作成（Notion にそのまま貼れる形）し、ユーザーに回答

---

## 技術スタック

| 層           | 技術                                                 |
| ------------ | ---------------------------------------------------- |
| サーバー     | NestJS + gRPC                                        |
| データベース | なし（次マイルストーンで Prisma + MySQL を追加予定） |
| クライアント | Node.js + gRPC (PoC)                                 |
| 書式         | Markdown                                             |

---

## ファイル構成

backend/
├── src/
│ ├── main.ts
│ ├── app.module.ts
│ ├── review/
│ ├── prompt/
│ └── proto/
│ └── review.proto
├── prisma/
│ ├── schema.prisma
│ └── seed.ts
├── docker/
│ ├── init.sql
│ └── init.sh
├── Dockerfile
├── docker-compose.yml
└── package.json
mcp-server/
├── package.json
├── tsconfig.json
├── src/
│ ├── main.ts
│ ├── server.ts
│ ├── grpc/
│ │ ├── client.ts
│ │ └── proto/review.proto
│ └── handlers/
│ ├── prompt.handler.ts
│ └── review.handler.ts
└── Dockerfile
client/

---

## セットアップ

### 1. DB 起動

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

### 2. クライアント起動（MCP サーバー～ MCP クライアント）

```bash
cd client
npm run dev

# 各ツールのテスト
cd client
npm run test_extract
npm run test_get_prompt
npm run test_create_prompt
npm run test_update_prompt
npm run test_get_review
npm run test_search_book

# MCPサーバーのみ起動
cd mcp-server
npm run build
npm start
```

## 開発 Tips

### Prisma のスキーマ変更時

```bash
npx prisma migrate dev --name <Name>
npx prisma generate

# DBリセット
npx prisma migrate reset
# 初期データ投入
npx prisma db seed(npm run seed)
```

### Todo

- proto 消える問題 => nest-cli.json に設定を書き込むと解決
