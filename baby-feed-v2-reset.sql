-- 宝宝喂养卡 V2 重写后的可选清理 SQL
-- 目的：
-- 1. 保留页面里“累计 8000ml、当前半岁”的展示起点
-- 2. 旧的异常测试数据不再参与今天次数统计
-- 3. 新卡从 2026-07-09 16:12:05 +08:00 之后的记录开始重新累计“今天 0/4”

-- 方案 A：不清库
-- 直接使用前端新逻辑即可。新逻辑会自动忽略 2026-07-09 16:12:05 +08:00 之前的喂养记录。
-- 优点：最稳，不动库。

-- 方案 B：如果你想把 V2 表里旧的异常测试记录彻底删掉，再执行下面这句。
-- 注意：这会删除该时间点之前的所有 V2 喂养记录。

-- delete from public.couple_baby_feeds_v2
-- where created_at < timestamptz '2026-07-09 16:12:05.691+08';

-- 如果要检查删完还剩什么，可先看：
-- select person, feed_date, amount, created_at
-- from public.couple_baby_feeds_v2
-- order by created_at asc;
