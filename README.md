# Spottery Pro

一站式足球赛事数据分析平台 — 实时比赛数据、竞彩赔率、AI 预测分析、球队对比。

---

## 启动

```bash
# 终端 1 — 后端
cd backend && python -m uvicorn app.main:app --reload --port 8000

# 终端 2 — 前端
cd frontend && npm run dev
```

前端 → http://localhost:5173 · API 文档 → http://localhost:8000/docs

首次运行前需先执行 `cd backend && pip install -r requirements.txt && python seed.py` 和 `cd frontend && npm install`。

---

## 技术栈

| 端 | 技术 |
|---|---|
| 后端 | FastAPI, SQLAlchemy, Pydantic, bcrypt + JWT, SQLite / PostgreSQL |
| 前端 | React 19, TypeScript, Vite 6, TanStack React Query 5, Zustand 5, Tailwind CSS 4, shadcn/ui, ECharts 6 |
| 测试 | pytest / Vitest + Testing Library |

---

## 快速开始

```bash
# 后端
cd backend
pip install -r requirements.txt
python seed.py                          # 初始化种子数据
uvicorn app.main:app --reload --port 8000
# API 文档 → http://localhost:8000/docs

# 前端 (新开终端)
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

使用 Mock API 独立运行前端：`.env.development` 中设置 `VITE_USE_MOCK=true` 后 `npm run dev`。

```bash
# Docker
cd backend
docker build -t spottery-backend .
docker run -p 8000:8000 spottery-backend
```

---

## 项目结构

```
spottery_pro/
├── backend/
│   ├── app/
│   │   ├── main.py           # 入口、路由注册
│   │   ├── config.py / database.py
│   │   ├── models/           # SQLAlchemy 模型
│   │   ├── schemas/          # Pydantic 模型
│   │   ├── routers/          # auth, users, teams, matches, internal
│   │   ├── services/         # 业务逻辑
│   │   └── dependencies/     # 依赖注入（认证等）
│   ├── tests/
│   ├── seed.py
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/              # Axios + API 模块
│   │   ├── components/       # shared/ + ui/ (shadcn)
│   │   ├── features/         # auth, betting, matches, analysis
│   │   ├── pages/            # 页面组件
│   │   ├── hooks/ / stores/ / types/ / lib/
│   │   └── vite-plugin-mock-api.ts
│   └── package.json
├── frontend_v1.1/             # 迭代版（动画组件）
└── README.md
```

---

## API 概览

所有接口以 `/api/v1` 为前缀。

### 公开

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/health` | 健康检查 |
| POST | `/auth/register` | 注册 |
| POST | `/auth/login` | 登录，返回 JWT |
| GET | `/leagues` | 联赛列表 |
| GET | `/leagues/{id}/standings` | 积分榜 |
| GET | `/matches/betting` | 今日竞彩（含赔率） |
| GET | `/matches/{id}/briefing` | 赛前简报 |

### 登录（Bearer Token）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/users/me` | 当前用户信息 |
| GET | `/teams` | 球队列表 |
| GET | `/teams/{id}` | 球队详情 |
| GET | `/matches` | 比赛列表 |
| GET | `/matches/{id}` | 比赛详情 |
| GET | `/matches/{id}/odds` | 赔率汇总 |
| GET | `/matches/{id}/odds/history` | 赔率历史 |
| GET | `/matches/{id}/analysis` | AI 预测 |
| GET | `/matches/{id}/comparison` | 球队对比 |
| GET | `/matches/{id}/injuries` | 伤病名单 |
| GET | `/analysis/h2h` | 历史交锋 |
| GET | `/analysis/teams/{id}/form` | 近期状态 |

### 内部（`X-Internal-Token`）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/internal/matches/upsert` | 创建/更新比赛 |
| POST | `/internal/odds/snapshot` | 写入赔率快照 |

---

## 数据库模型

### 数据库概览

- 引擎：SQLite（默认 `backend/data.db`），启用 WAL 模式与 `PRAGMA foreign_keys=ON`；可通过 `DATABASE_URL` 切换 PostgreSQL
- 共 **27 张表**，分两组：

| 分组 | 数量 | 数据性质 |
|---|---|---|
| 平台基础模型 | 10 | 用户/球队/联赛/比赛等核心业务（种子与演示数据） |
| 竞彩数据模型 | 17 | 竞彩网 sporttery 全量导入的真实数据 |

数据规模（截至全量导入完成）：

| 表 | 行数 |
|---|---|
| `jingcai_matches` | 76,969 |
| `jingcai_h2h` | 421,051 |
| `jingcai_players` | 381,905 |
| `jingcai_standings` | 354,042 |
| `jingcai_odds` | 349,234 |
| `jingcai_odds_rqspf` | 345,458 |
| `jingcai_odds_spf` | 336,077 |
| `jingcai_pools` | 325,588 |
| `jingcai_recent_results` | 243,271 |
| `jingcai_odds_hafu` | 158,270 |
| `jingcai_odds_crs` | 139,285 |
| `jingcai_odds_ttg` | 145,285 |
| `jingcai_injuries` | 138,925 |
| `jingcai_season_features` | 65,896 |
| `jingcai_fixtures` | 5,482 |
| `jingcai_teams` | 2,771 |
| `jingcai_leagues` | 134 |

---

### 平台基础模型（10 张）

#### `users`

| 字段 | 类型 | 可空 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | Integer | 否 | PK, autoincrement | 用户 ID |
| `email` | String | 否 | UNIQUE, index | 登录邮箱 |
| `password_hash` | String | 否 | | bcrypt 密码哈希 |
| `role` | String | 否 | 默认 `FREE` | 角色：FREE / VIP / ADMIN |
| `created_at` | DateTime | 否 | 默认 `now()` | 注册时间 |

#### `leagues`

| 字段 | 类型 | 可空 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | Integer | 否 | PK, autoincrement | 联赛 ID |
| `name` | String | 否 | | 联赛名称 |
| `country` | String | 是 | | 所属国家/地区 |
| `season` | String | 是 | | 赛季标识 |
| `logo_url` | String | 是 | | 联赛 Logo 地址 |

#### `teams`

| 字段 | 类型 | 可空 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | Integer | 否 | PK, autoincrement | 球队 ID |
| `name` | String | 否 | | 球队名称 |
| `short_name` | String | 是 | | 简称 |
| `logo_url` | String | 是 | | 队徽地址 |
| `league_id` | Integer | 是 | FK → `leagues.id` | 所属联赛 |
| `country` | String | 是 | | 所属国家/地区 |

#### `team_aliases`

| 字段 | 类型 | 可空 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | Integer | 否 | PK, autoincrement | 别名 ID |
| `team_id` | Integer | 否 | FK → `teams.id` | 关联球队 |
| `source` | String | 否 | UNIQUE(`team_id`,`source`,`name`) | 数据源标识 |
| `name` | String | 否 | | 各数据源下的球队名 |

#### `matches`

| 字段 | 类型 | 可空 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | Integer | 否 | PK, autoincrement | 比赛 ID |
| `league_id` | Integer | 是 | FK → `leagues.id` | 所属联赛 |
| `home_team_id` | Integer | 否 | FK → `teams.id` | 主队 |
| `away_team_id` | Integer | 否 | FK → `teams.id` | 客队 |
| `match_time` | DateTime | 否 | index | 开赛时间 |
| `status` | String | 否 | 默认 `SCHEDULED`, index | 状态：SCHEDULED / LIVE / FINISHED |
| `home_score` | Integer | 是 | | 主队比分 |
| `away_score` | Integer | 是 | | 客队比分 |
| `half_home_score` | Integer | 是 | | 半场主队比分 |
| `half_away_score` | Integer | 是 | | 半场客队比分 |
| `round` | Integer | 是 | | 轮次 |
| `created_at` | DateTime | 否 | 默认 `now()` | 创建时间 |
| `updated_at` | DateTime | 否 | 默认 `now()`, 更新自动刷新 | 更新时间 |

#### `match_source_mappings`

| 字段 | 类型 | 可空 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | Integer | 否 | PK, autoincrement | 映射 ID |
| `match_id` | Integer | 否 | FK → `matches.id` | 平台比赛 ID |
| `source` | String | 否 | UNIQUE(`source`,`source_id`) | 数据源标识 |
| `source_id` | String | 否 | | 数据源比赛 ID |

#### `odds_history`

| 字段 | 类型 | 可空 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | Integer | 否 | PK, autoincrement | 记录 ID |
| `match_id` | Integer | 否 | FK → `matches.id`, index | 比赛 ID |
| `bookmaker` | String | 否 | | 博彩公司 |
| `odds_type` | String | 否 | | 赔率类型：SPF / RQSPF / BF / ZJQ / BQC |
| `snapshot_at` | DateTime | 否 | | 快照时间 |
| `home_odds` | Float | 是 | | 主胜赔率 |
| `draw_odds` | Float | 是 | | 平局赔率 |
| `away_odds` | Float | 是 | | 客胜赔率 |
| `handicap` | String | 是 | | 让球盘口 |
| `options` | String | 是 | | 比分/进球/半全场选项 JSON |
| `created_at` | DateTime | 否 | 默认 `now()` | 创建时间 |

#### `injuries`

| 字段 | 类型 | 可空 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | Integer | 否 | PK, autoincrement | 记录 ID |
| `match_id` | Integer | 否 | FK → `matches.id`, index | 比赛 ID |
| `team_type` | String | 否 | | 主队/客队标识 |
| `player_name` | String | 否 | | 球员名 |
| `position` | String | 是 | | 位置 |
| `tag` | String | 是 | | 伤停标签 |
| `created_at` | DateTime | 否 | 默认 `now()` | 创建时间 |

#### `predictions`

| 字段 | 类型 | 可空 | 约束 | 说明 |
|---|---|---|---|---|
| `match_id` | Integer | 否 | PK, FK → `matches.id` (CASCADE) | 比赛 ID（1:1） |
| `home_prob` | Integer | 否 | | 主胜概率 |
| `draw_prob` | Integer | 否 | | 平局概率 |
| `away_prob` | Integer | 否 | | 客胜概率 |
| `confidence` | Integer | 否 | | 置信度 |
| `model_version` | String | 否 | | 模型版本 |
| `predicted_result` | String | 否 | | 预测结果 |
| `updated_at` | DateTime | 否 | 默认 `now()`, 更新自动刷新 | 更新时间 |

#### `briefings`

| 字段 | 类型 | 可空 | 约束 | 说明 |
|---|---|---|---|---|
| `match_id` | Integer | 否 | PK, FK → `matches.id` (CASCADE) | 比赛 ID（1:1） |
| `content` | String | 否 | | 赛前简报正文 |
| `updated_at` | DateTime | 否 | 默认 `now()`, 更新自动刷新 | 更新时间 |

---

### 竞彩数据模型（17 张）

#### `jingcai_matches` — 竞彩比赛主体

| 字段 | 类型 | 可空 | 约束 | 说明 |
|---|---|---|---|---|
| `match_id` | Integer | 否 | PK | sporttery 比赛 ID（即 API 的 `match_id`） |
| `business_date` | Date | 否 | index | 竞彩业务日期（`/matches/betting` 查询键） |
| `match_date` | Date | 否 | index | 比赛自然日 |
| `kickoff_time` | DateTime | 是 | | 开赛时间 |
| `match_num` | String | 否 | | 竞彩场次编号（如 `周三001`） |
| `home_team` | String | 否 | | 主队名 |
| `away_team` | String | 否 | | 客队名 |
| `league` | String | 是 | | 联赛名 |
| `sporttery_home_id` / `sporttery_away_id` | Integer | 是 | | 主/客队 sporttery ID |
| `uniform_home_id` / `uniform_away_id` | Integer | 是 | | 主/客队统一 ID |
| `sporttery_league_id` | Integer | 是 | | 联赛 sporttery ID |
| `uniform_league_id` | Integer | 是 | | 联赛统一 ID |
| `tournament_id` / `season_id` | Integer | 是 | | 赛事/赛季 ID |
| `season_name` / `phase_name` | String | 是 | | 赛季名 / 阶段名 |
| `home_score` / `away_score` | Integer | 是 | | 主/客比分 |
| `status` | String | 否 | 默认 `FINISHED`, index | 比赛状态 |
| `pool_status` | String | 是 | | 奖池状态 |
| `scraped_at` | DateTime | 是 | | 抓取时间 |

#### `jingcai_teams` — 球队映射

| 字段 | 类型 | 可空 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | Integer | 否 | PK, autoincrement | 记录 ID |
| `name` | String | 否 | | 球队名 |
| `short_name` | String | 是 | | 简称 |
| `sporttery_id` | Integer | 是 | UNIQUE | sporttery ID |
| `uniform_id` | Integer | 是 | | 统一 ID |

#### `jingcai_leagues` — 联赛映射

| 字段 | 类型 | 可空 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | Integer | 否 | PK, autoincrement | 记录 ID |
| `name` | String | 否 | | 联赛名 |
| `short_name` | String | 是 | | 简称 |
| `sporttery_id` | Integer | 是 | UNIQUE | sporttery ID |
| `uniform_id` | Integer | 是 | | 统一 ID |
| `season_id` | Integer | 是 | | 赛季 ID |
| `season_name` | String | 是 | | 赛季名 |

#### `jingcai_odds` — 赔率汇总

| 字段 | 类型 | 可空 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | Integer | 否 | PK, autoincrement | 记录 ID |
| `match_id` | Integer | 否 | index, UNIQUE(`match_id`,`odds_type`) | 比赛 ID |
| `odds_type` | String | 否 | | 类型：SPF / RQSPF / CRS / TTG / HAFU |
| `snapshot_at` | DateTime | 是 | | 最新快照时间 |
| `home` / `draw` / `away` | Float | 是 | | 胜/平/负赔率（SPF/RQSPF） |
| `handicap` | String | 是 | | 让球盘口 |
| `options` | Text | 是 | | CRS/TTG/HAFU 的选项 JSON |

#### `jingcai_odds_spf` — 胜平负赔率明细快照

| 字段 | 类型 | 可空 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | Integer | 否 | PK, autoincrement | 记录 ID |
| `match_id` | Integer | 否 | index, UNIQUE(`match_id`,`snapshot_at`) | 比赛 ID |
| `snapshot_at` | DateTime | 否 | | 快照时间 |
| `update_date` / `update_time` | String | 是 | | 源站更新时间 |
| `home` / `draw` / `away` | Float | 是 | | 胜/平/负赔率 |

#### `jingcai_odds_rqspf` — 让球胜平负明细快照

| 字段 | 类型 | 可空 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | Integer | 否 | PK, autoincrement | 记录 ID |
| `match_id` | Integer | 否 | index, UNIQUE(`match_id`,`snapshot_at`) | 比赛 ID |
| `snapshot_at` | DateTime | 否 | | 快照时间 |
| `update_date` / `update_time` | String | 是 | | 源站更新时间 |
| `home` / `draw` / `away` | Float | 是 | | 胜/平/负赔率 |
| `handicap` | String | 是 | | 让球盘口 |

#### `jingcai_odds_crs` / `jingcai_odds_ttg` / `jingcai_odds_hafu` — 比分 / 总进球 / 半全场明细快照

三者结构相同：

| 字段 | 类型 | 可空 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | Integer | 否 | PK, autoincrement | 记录 ID |
| `match_id` | Integer | 否 | index, UNIQUE(`match_id`,`snapshot_at`) | 比赛 ID |
| `snapshot_at` | DateTime | 否 | | 快照时间 |
| `options` | Text | 是 | | 选项 JSON（比分/进球/半全场组合与赔率） |

#### `jingcai_pools` — 奖池

| 字段 | 类型 | 可空 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | Integer | 否 | PK, autoincrement | 记录 ID |
| `match_id` | Integer | 否 | index, UNIQUE(`match_id`,`code`) | 比赛 ID |
| `code` | String | 否 | | 玩法代码 |
| `combination` | String | 是 | | 组合选项 |
| `combination_desc` | String | 是 | | 组合描述 |
| `odds` | Float | 是 | | 赔率 |
| `goal_line` | String | 是 | | 进球数线 |
| `pool_id` | Integer | 是 | | 奖池 ID |
| `pool_totals` | String | 是 | | 奖池金额 |
| `refund_status` | String | 是 | | 退款状态 |

#### `jingcai_standings` — 积分榜快照

| 字段 | 类型 | 可空 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | Integer | 否 | PK, autoincrement | 记录 ID |
| `match_id` | Integer | 否 | index, UNIQUE(`match_id`,`team_type`,`view`) | 比赛 ID |
| `team_type` | String | 否 | | 主/客队标识 |
| `view` | String | 否 | | 积分榜视角 |
| `team_name` | String | 是 | | 球队名 |
| `team_id` | Integer | 是 | | 球队 ID |
| `ranking` / `points` | Integer | 是 | | 排名 / 积分 |
| `played` / `wins` / `draws` / `losses` | Integer | 是 | | 场次 / 胜 / 平 / 负 |
| `goals_for` / `goals_against` / `goal_diff` | Integer | 是 | | 进 / 失 / 净胜球 |
| `win_probability` | String | 是 | | 胜率 |
| `phase_name` | String | 是 | | 阶段名 |

#### `jingcai_h2h` — 历史交锋

| 字段 | 类型 | 可空 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | Integer | 否 | PK, autoincrement | 记录 ID |
| `match_id` | Integer | 否 | index, UNIQUE(`match_id`,`match_date`,`home_team_id`,`away_team_id`) | 比赛 ID |
| `match_date` | Date | 是 | | 交锋日期 |
| `home_team_id` / `away_team_id` | Integer | 是 | | 主/客队 ID |
| `home_score` / `away_score` | Integer | 是 | | 比分 |
| `half_home_score` / `half_away_score` | Integer | 是 | | 半场比分 |
| `season_id` / `tournament_id` | Integer | 是 | | 赛季 / 赛事 ID |
| `winning_team` | String | 是 | | 获胜方 |

#### `jingcai_recent_results` — 近期赛果

| 字段 | 类型 | 可空 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | Integer | 否 | PK, autoincrement | 记录 ID |
| `team_uniform_id` | Integer | 否 | index, UNIQUE(`team_uniform_id`,`match_date`,`source_match_id`) | 球队统一 ID |
| `match_date` | Date | 是 | | 比赛日期 |
| `opponent_uniform_id` | Integer | 是 | | 对手统一 ID |
| `home_score` / `away_score` | Integer | 是 | | 比分 |
| `half_home_score` / `half_away_score` | Integer | 是 | | 半场比分 |
| `result` | String | 是 | | 结果：胜/平/负 |
| `season_id` / `tournament_id` | Integer | 是 | | 赛季 / 赛事 ID |
| `source_match_id` | Integer | 是 | | 源站比赛 ID |

#### `jingcai_fixtures` — 赛程

| 字段 | 类型 | 可空 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | Integer | 否 | PK, autoincrement | 记录 ID |
| `team_uniform_id` | Integer | 否 | index, UNIQUE(`team_uniform_id`,`match_date`,`source_match_id`) | 球队统一 ID |
| `match_date` | DateTime | 是 | | 开赛时间 |
| `opponent_uniform_id` | Integer | 是 | | 对手统一 ID |
| `gameweek` | String | 是 | | 轮次 |
| `season_id` / `tournament_id` | Integer | 是 | | 赛季 / 赛事 ID |
| `source_match_id` | Integer | 是 | | 源站比赛 ID |

#### `jingcai_injuries` — 伤停名单

| 字段 | 类型 | 可空 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | Integer | 否 | PK, autoincrement | 记录 ID |
| `match_id` | Integer | 否 | index, UNIQUE(`match_id`,`team_type`,`person_id`) | 比赛 ID |
| `team_type` | String | 否 | | 主/客队标识 |
| `person_id` | Integer | 是 | | 球员 ID |
| `person_name` | String | 是 | | 球员名 |
| `position_code` / `position_desc` | String | 是 | | 位置代码 / 描述 |
| `injury_flag` / `suspension_flag` | Integer | 是 | | 伤 / 停标记 |
| `appearance_cnt` / `started_cnt` | Integer | 是 | | 出场 / 首发次数 |
| `uniform_no` | String | 是 | | 球衣号 |

#### `jingcai_players` — 球员

| 字段 | 类型 | 可空 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | Integer | 否 | PK, autoincrement | 记录 ID |
| `match_id` | Integer | 否 | index, UNIQUE(`match_id`,`team_type`,`person_id`) | 比赛 ID |
| `team_type` | String | 否 | | 主/客队标识 |
| `person_id` | Integer | 是 | | 球员 ID |
| `person_name` | String | 是 | | 球员名 |
| `position_code` / `position_desc` | String | 是 | | 位置代码 / 描述 |
| `goal_cnt` / `assist_cnt` | Integer | 是 | | 进球 / 助攻数 |
| `appearance_cnt` / `started_cnt` | Integer | 是 | | 出场 / 首发次数 |
| `injury_flag` / `suspension_flag` | Integer | 是 | | 伤 / 停标记 |
| `uniform_no` | String | 是 | | 球衣号 |

#### `jingcai_season_features` — 赛季特征

| 字段 | 类型 | 可空 | 约束 | 说明 |
|---|---|---|---|---|
| `id` | Integer | 否 | PK, autoincrement | 记录 ID |
| `match_id` | Integer | 否 | UNIQUE | 比赛 ID（1:1） |
| `home_team` / `away_team` | String | 是 | | 主/客队名 |
| `goal_avg_home` / `goal_avg_away` | Float | 是 | | 主/客场场均进球 |
| `loss_goal_avg_home` / `loss_goal_avg_away` | Float | 是 | | 主/客场场均失球 |
| `recent_home_wins` / `recent_home_draws` / `recent_home_losses` | Integer | 是 | | 主队近期胜/平/负 |
| `recent_away_wins` / `recent_away_draws` / `recent_away_losses` | Integer | 是 | | 客队近期胜/平/负 |
| `data` | Text | 是 | | 扩展特征 JSON |

---

### 关联关系与设计说明

- **竞彩表锚点**：`jingcai_matches.match_id`（sporttery 比赛 ID）是赔率、奖池、积分、交锋、伤停、球员、赛季特征等明细表的关联键；`jingcai_teams.uniform_id` / `jingcai_leagues.uniform_id` 用于跨源统一球队与联赛。
- **幂等约束**：所有竞彩明细表均带 `UniqueConstraint`，导入脚本据此使用 `on_conflict_do_update` 实现重复抓取时的幂等更新：
  - `jingcai_odds`：`(match_id, odds_type)`
  - 赔率明细 spf/rqspf/crs/ttg/hafu：`(match_id, snapshot_at)`
  - `jingcai_pools`：`(match_id, code)`；`jingcai_standings`：`(match_id, team_type, view)`
  - `jingcai_h2h`：`(match_id, match_date, home_team_id, away_team_id)`
  - `jingcai_recent_results` / `jingcai_fixtures`：`(team_uniform_id, match_date, source_match_id)`
  - `jingcai_injuries` / `jingcai_players`：`(match_id, team_type, person_id)`
- **平台表外键**：`matches.league_id → leagues.id`、`matches.home/away_team_id → teams.id`、`odds_history.match_id → matches.id`、`injuries.match_id → matches.id`、`predictions.match_id` 与 `briefings.match_id` 为 1:1 主键外键且 `ON DELETE CASCADE`。
- **数据来源**：竞彩数据由 `backend/import_jingcai.py` 从竞彩网全量导入（Phase A：比赛列表；Phase B：比赛详情，支持 `--phase A|B|AB` 与 `--max-files` 局部导入）；平台基础表由 `seed.py` 生成种子/演示数据。

---

## 用户角色

| 角色 | 权限 |
|---|---|
| FREE | 基础浏览，每日有限次分析 |
| VIP | 全部数据 + AI 预测 |
| ADMIN | 管理权限 |

默认账户：`demo@test.com` / `demo123` (FREE) · `vip@test.com` / `vip123` (VIP)

---

## 前端页面

| 路径 | 页面 | 权限 |
|---|---|---|
| `/` | 首页 | 公开 |
| `/login` / `/register` | 登录 / 注册 | 公开 |
| `/matches` | 赛事中心 | 登录 |
| `/matches/:id` | 比赛详情 | 登录 |
| `/teams` | 球队档案 | 登录 |
| `/teams/:id` | 球队详情 | 登录 |
| `/analysis` | 数据分析 | VIP |
| `/profile` | 个人中心 | 登录 |

---

## 测试

```bash
cd backend && pytest -v
cd frontend && npm test
```

---

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./data.db` | 数据库连接 |
| `JWT_SECRET_KEY` | `change-me-in-production` | JWT 密钥 |
| `JWT_EXPIRE_DAYS` | `30` | Token 有效期 |
| `VITE_API_BASE_URL` | `/api/v1` | API 路径 |
| `VITE_USE_MOCK` | `false` | 启用 Mock |

---

## 开发说明

- 赔率类型：SPF（胜平负）、RQSPF（让球）、BF（比分）、ZJQ（总进球）、BQC（半全场）
- 支持数据源：Sofascore、竞彩网、球探体育
- Mock API 数据定义在 `vite-plugin-mock-api.ts`
