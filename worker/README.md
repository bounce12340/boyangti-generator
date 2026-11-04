# 使用統計 Worker

頁尾那一行「已有 N 位訪客，產生了 M 篇廢話」的後端。Cloudflare Workers ＋ D1（免費方案就夠用）。

## 收什麼、不收什麼

| 收 | 不收 |
|---|---|
| 模式名稱：`post`／`reply`／`rewrite`／`checklist` | 使用者輸入的任何文字 |
| 瀏覽器產生的隨機代號（存在 `localStorage` 的 `byt_vid_v1`），資料庫只存它加鹽後的 SHA-256 | IP、User-Agent、Cookie |

「訪客」是**不重複的瀏覽器**，不是人：同一個人換手機會算兩次，開無痕模式每次都算新訪客。

## API

| 方法 | 路徑 | 內容 | 回傳 |
|---|---|---|---|
| `POST` | `/hit` | `{"vid":"…"}` 記一次造訪；`{"vid":"…","kind":"post"}` 記一篇 | 目前累計 |
| `GET` | `/stats` | — | `{"visitors":…,"generated":…,"byKind":{…}}`（快取 30 秒） |

防灌票：只接受 `ALLOWED_ORIGINS` 列出的來源；同一代號每分鐘最多計 30 篇；請求內容上限 256 位元組。
這是防君子不防小人的程度——有心人換代號一樣能灌，數字請當成「大概」看。

## 部署（已部署好的不用再做）

正式版已部署在 `https://boyangti-stats.bounceto12340.workers.dev`，資料庫 `boyangti-stats`。要部署到別的帳號：

```bash
cd worker
npx wrangler d1 create boyangti-stats          # 把印出的 database_id 填進 wrangler.toml
npx wrangler d1 execute boyangti-stats --remote --file=schema.sql
npx wrangler secret put SALT                   # 隨便一串夠長的亂碼
npx wrangler deploy
```

然後把 Worker 網址填進 `index.html` 的 `<meta name="byt-stats" content="…">`。留空就完全關閉統計。

## 查看分模式數字

```bash
curl https://boyangti-stats.bounceto12340.workers.dev/stats
```

## 歸零

```bash
npx wrangler d1 execute boyangti-stats --remote --command "DELETE FROM counters; DELETE FROM visitors;"
```
