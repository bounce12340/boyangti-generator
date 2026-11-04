-- 伯洋體產生器使用統計（Cloudflare D1）
-- counters：visitors（不重複訪客）、generated（總篇數）、kind:post／reply／rewrite／checklist（各模式篇數）
CREATE TABLE IF NOT EXISTS counters (
  name TEXT PRIMARY KEY,
  n    INTEGER NOT NULL DEFAULT 0
);

-- visitors：只存隨機代號的雜湊值，不存原始代號、IP 或任何輸入文字
-- win_start／win_count：每個代號每分鐘最多計 RATE_LIMIT 次，擋掉連點灌票
CREATE TABLE IF NOT EXISTS visitors (
  id         TEXT PRIMARY KEY,
  first_seen INTEGER NOT NULL,
  win_start  INTEGER NOT NULL DEFAULT 0,
  win_count  INTEGER NOT NULL DEFAULT 0
);
