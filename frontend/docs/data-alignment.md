# 三源数据对齐方案

## 背景

爬虫从三个数据源抓取数据：
- **Sofascore**：赛程、积分榜、伤停信息、投票 (vote) 等
- **竞彩网**：竞彩赔率数据
- **球探体育**：亚盘（澳门/Bet365/易胜博/香港马会）、欧赔（威廉希尔/Bet365/易胜博/香港马会）、舆论指向、历史对战、近期战绩

三个源对同一支球队的命名不同，需要通过匹配机制映射到统一的比赛记录。

---

## 核心标识规则

主键使用 `日期_主队名_客队名` 作为初步匹配桥梁，但不单独依赖字符串匹配，而是通过**缓存型映射表**提升精度。

---

## 三层匹配策略

### 第一层：源 ID 映射（最精确）

每次爬虫爬到一个比赛时，携带该数据源的内部 ID。查询映射表决定是 UPDATE 还是 INSERT。

**映射表结构：**

```sql
CREATE TABLE match_source_mappings (
    match_id  INTEGER NOT NULL REFERENCES matches(id),
    source    TEXT NOT NULL CHECK(source IN ('sofascore','jingcai','qiutan')),
    source_id TEXT NOT NULL,
    UNIQUE(source, source_id)
);
```

**写入逻辑：**

```
爬虫获取 (source, source_id) →
  IF EXISTS in match_source_mappings:
    获取对应的 match_id → UPDATE 该比赛详情
  ELSE:
    尝试用"日期+主队+客队"匹配已有 matches 表
    IF 匹配到:
      INSERT INTO match_source_mappings → 关联到已有 match_id
    ELSE:
      INSERT INTO matches → 新建比赛 → INSERT INTO match_source_mappings
```

### 第二层：模糊匹配（一次性历史数据对齐）

用于首次处理 2015–2025/26 的历史数据：

```
用 Python 脚本 + thefuzz (fuzzywuzzy) 库：
  1. 预处理：
     - 全角字符 → 半角
     - 去除首尾空格
     - 括号归一（全角括号→半角，去除括号内容）
     - "FC"、"SC"、"俱乐部" 等后缀归一
  2. 精确匹配：
     同日期 + 主客队名完全一致 → 自动确认
  3. 模糊匹配：
     同日期 + Levenshtein 距离 ≥ 0.85 → 自动确认
  4. 人工兜底：
     未匹配记录输出到 unmatched.csv，手工确认后补入映射表
     同时补充 team_aliases 记录，后续同队名自动命中
```

### 第三层：队名映射表

```sql
CREATE TABLE team_aliases (
    id      INTEGER PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(id),
    source  TEXT NOT NULL,      -- 'sofascore' | 'jingcai' | 'qiutan'
    name    TEXT NOT NULL,      -- 源内的原始名称
    UNIQUE(team_id, source, name)
);
```

人工确认时写入 `team_aliases`，后续同名自动匹配，不再需要 fuzzy match。

---

## 关键约定

- 跨源对齐是一次性 ETL 管道，不作为 API 暴露给前端
- 写入 `matches` 主表时，统一使用规范队名（优先使用 Sofascore 英文名作为规范名，建立中文对照）
- `match_source_mappings` 只由聚合脚本维护，API 不读
- 后续增量爬虫直接走源 ID 匹配，只有新出现的比赛才触发队名匹配

---

## 聚合脚本位置（待实现）

```
backend/
└── scripts/
    └── align_matches.py    # 历史数据对齐（一次性运行）
    └── crawler_pipeline.py # 每日增量爬虫 + 对齐
```

---

# 积分榜方案

## 决策

**不单独爬取积分榜，从赛果数据计算。**

## 理由

### 1. 延期比赛自动正确排除

某场比赛延期两个月执行后，按比赛时间 (`match_time`) 自然排在后面，不会影响之前轮次的分析。

例如：
- 第 9 轮 A 队 vs B 队延期到 12 月
- 分析第 10 轮（10 月）A 队的近期状态时，查询条件为 `match_time < 第10轮时间`
- 延期的第 9 轮比赛 `match_time` 在 12 月，**自然被排除**

**不需要额外逻辑，不需要轮次字段。**

### 2. 需求 A（积分榜展示）和需求 B（赛前参考）用同一套数据源

| 前端需求 | 对应 SQL |
|----------|----------|
| 联赛积分榜（给用户看） | `WHERE league_id=? AND status='FINISHED' AND match_time < NOW() GROUP BY team_id` |
| 主客队数据对比 | 同一套 GROUP BY，加 `home_team_id` / `away_team_id` 过滤 |
| 近期战绩 | `WHERE (home_team_id=? OR away_team_id=?) AND status='FINISHED' AND match_time < 当前比赛时间 ORDER BY match_time DESC LIMIT 6` |
| 历史交锋 | `WHERE ((home_team_id=A AND away_team_id=B) OR (home_team_id=B AND away_team_id=A)) AND status='FINISHED' ORDER BY match_time DESC` |

### 3. 避免数据对账问题

从第三方爬的积分榜和自己算的不一致时，需要额外的对账工作。从赛果计算则保证**所有衍生数据自洽**。

## 例外场景（暂不实现）

如果需要**按轮次查询历史任意时间点**的积分榜（如"第 10 轮结束时的排名"），需要每场比赛关联轮次信息：

```sql
CREATE TABLE matches (
    ...
    round INTEGER,   -- Sofascore 提供，如 9
    ...
);

-- 查询第 10 轮结束时的积分榜
SELECT home_team_id, ...
FROM matches
WHERE league_id = 2
  AND status = 'FINISHED'
  AND (round < 10 OR (round = 10 AND match_time <= '2026-10-15T23:59:59+08:00'))
GROUP BY home_team_id
```

当前阶段不需要，后续有需求再加 `round` 字段即可。

## 结论

| 做法 | 结论 |
|------|------|
| **单独爬积分榜** | ❌ 不推荐。延期处理繁琐、数据对账问题 |
| **从赛果计算** | ✅ 推荐。一条 SQL 搞定，延期自然排除，任意历史时间点可回溯 |
