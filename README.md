# 書評 AI PoC (Book Review AI)

## 概要

書評を自動で書く AI「書評 AI」
書評はユーザーごとに書き方が違うので、利用ユーザーの書評を DB に保存しておき、特徴をプロンプトにまとめ、プロンプトを基に新たな書評を生成します。ユーザーの特徴をまとめたプロンプトも DB へ保存
書評は Notion から取得

### 利用イメージ

・ユーザーが AI に自分の情報を登録依頼
→ ユーザーの文章の書き方を抽出し、特徴プロンプトを生成
→ ＡＩはそのユーザーの特徴をまとめた prompt の保存を user_id と紐づけてバックエンドに依頼
・ユーザーが本のタイトルを指定し、ＡＩに書評の作成を依頼
→ ＡＩはそのユーザーの特徴をまとめた prompt の取得（ＤＢに保存されている）をバックエンドに依頼
→ ＡＩは本のタイトルを基に本の内容を検索
→ ＡＩは取得した prompt と本の内容に従って書評を作成（Notion にそのまま貼れる形）し、ユーザーに回答

---

## 技術スタック

| 層           | 技術                 |
| ------------ | -------------------- |
| サーバー     | NestJS + gRPC        |
| データベース | Prisma + MySQL       |
| クライアント | Node.js + gRPC (PoC) |
| 書式         | Markdown             |

---

---

## プロジェクトのあれこれ

### MCP サーバーに登録されている tool

- create_prompt: ユーザーが書いた書評の書き方をまとめた文章特徴プロンプトをユーザーと紐づけて新規保存する
- update_prompt: ユーザーが書いた書評の書き方をまとめた文章特徴プロンプトをユーザーと紐づけて更新する
- get_prompt: ユーザーに紐づけられた文章特徴プロンプトを取得する
- get_review: ユーザーが過去に書いた書評を取得します
- book_search: 本のタイトルからその書籍に関するレビューや要約を検索します

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

### 2. サーバー起動

```bash
cd backend
npm install
npm run start:dev

# RPC疎通確認(ルートから)
grpcurl -plaintext   -proto backend/src/proto/review.proto   -d '{"userId":1}'   localhost:5000 review.ReviewService/GetPrompt
grpcurl -plaintext   -proto backend/src/proto/review.proto   -d '{"userId":1, "content":"口語的で短文多め。語尾がa"}'   localhost:5000 review.ReviewService/UpdatePrompt
grpcurl -plaintext   -proto backend/src/proto/review.proto   -d '{"userId":1}'   localhost:5000 review.ReviewService/GetReviews

```

### 3. クライアント起動（MCP サーバー～ MCP クライアント）

```bash
cd client
npm run dev

# 各ツールのテスト
cd client
npm run test_get_prompt
npm run test_create_prompt
npm run test_update_prompt
npm run test_get_review
npm run test_search_book

# MCPサーバーのみ起動(クライアントの起動で一緒に起動する）
cd mcp-server
npm run build
npm start
```

### 4. フロントエンド起動

```bash
cd frontend
npm run dev

# 以下で画面表示
http://localhost:5173/
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

### Query 例

```bash
「世界一流エンジニアの思考法」の書評を生成してください
UserId：1121
一章　世界一流エンジニアは何が違うのだろう -生産性の高さの秘密　要約:障害調査は自分の仮説を証明する作業　- 試行錯誤はNG
二章　アメリカで見つけたマインドセット　-日本にいるときはきづかなかったこと 要約:BeLazy(怠惰であれ)というマインドセット
三章　脳に余裕を生む情報整理・記憶術　-ガチで才能のある同僚たちの極意 要約:脳の負荷を減らす
四章　コミュニケーションの極意　-伝え方・聞き方・ディスカッション 要約:情報量は少なく
五章　生産性を高めるチームビルディング 　-「サーバントリーダーシップ「自己組織型チーム」へ 要約:リーダーがビジョンとKPIを示し、動き方はチームが主体的に意思決定することの大事さ
六章　仕事と人生の質を高める生活習慣術　-タイムボックス制から身体作りまで 要約:生産性を上げるために定時に上がる 無理やりでもきっかりやめる
七章　AI時代をどう生き残るか　-変化に適応する力と脱「批判文化」 要約:日米のエンジニアに取り巻く文化の違い
```
