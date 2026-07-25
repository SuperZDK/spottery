# 后端实现方案

---

## 一、技术选型

| 层 | 技术 | 备注 |
|----|------|------|
| 框架 | FastAPI (Python 3.11+) | 异步支持 + 自动 OpenAPI |
| ORM | SQLAlchemy 2.0 | 同时支持 SQLite/PostgreSQL |
| 密码 | passlib[bcrypt] | 免费开源 |
| JWT | python-jose | 免费开源 |
| 迁移 | Alembic | 可选，初期可手动建表 |
| 数据库（开发） | SQLite | 零配置 |
| 数据库（生产） | PostgreSQL | 部署时切换连接串 |

---

## 二、数据库全表设计

### 2.1 users

```sql
CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'FREE' CHECK(role IN ('FREE','VIP','ADMIN')),
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 2.2 leagues

```sql
CREATE TABLE leagues (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    name     TEXT NOT NULL,
    country  TEXT,
    season   TEXT,
    logo_url TEXT
);
```

### 2.3 teams

```sql
CREATE TABLE teams (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    short_name TEXT,
    logo_url   TEXT,
    league_id  INTEGER REFERENCES leagues(id),
    country    TEXT
);
```

### 2.4 team_aliases

```sql
CREATE TABLE team_aliases (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL REFERENCES teams(id),
    source  TEXT NOT NULL CHECK(source IN ('sofascore','jingcai','qiutan')),
    name    TEXT NOT NULL,
    UNIQUE(team_id, source, name)
);
```

### 2.5 match_source_mappings

```sql
CREATE TABLE match_source_mappings (
    match_id  INTEGER NOT NULL REFERENCES matches(id),
    source    TEXT NOT NULL CHECK(source IN ('sofascore','jingcai','qiutan')),
    source_id TEXT NOT NULL,
    UNIQUE(source, source_id)
);
```

### 2.6 matches

```sql
CREATE TABLE matches (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    league_id        INTEGER REFERENCES leagues(id),
    home_team_id     INTEGER NOT NULL REFERENCES teams(id),
    away_team_id     INTEGER NOT NULL REFERENCES teams(id),
    match_time       TEXT NOT NULL,
    status           TEXT NOT NULL DEFAULT 'SCHEDULED'
                       CHECK(status IN ('SCHEDULED','LIVE','FINISHED','POSTPONED','CANCELLED')),
    home_score       INTEGER,
    away_score       INTEGER,
    half_home_score  INTEGER,
    half_away_score  INTEGER,
    round            INTEGER,
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_matches_time   ON matches(match_time);
CREATE INDEX idx_matches_league ON matches(league_id);
CREATE INDEX idx_matches_home   ON matches(home_team_id);
CREATE INDEX idx_matches_away   ON matches(away_team_id);
CREATE INDEX idx_matches_status ON matches(status);
```

### 2.7 odds_history

```sql
CREATE TABLE odds_history (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id     INTEGER NOT NULL REFERENCES matches(id),
    bookmaker    TEXT NOT NULL,           -- 竞彩 / 澳门 / Bet365 / 易胜博 / 香港马会 / 威廉希尔
    odds_type    TEXT NOT NULL
                   CHECK(odds_type IN ('SPF','RQSPF','BF','ZJQ','BQC')),
    snapshot_at  TEXT NOT NULL,           -- ISO8601
    home_odds    REAL,                    -- SPF/RQSPF 用
    draw_odds    REAL,                    -- SPF/RQSPF 用
    away_odds    REAL,                    -- SPF/RQSPF 用
    handicap     TEXT,                    -- RQSPF 用，如 "-1", "+0.5"
    options      TEXT,                    -- BF/ZJQ/BQC 用，JSON 字符串
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_odds_lookup ON odds_history(match_id, bookmaker, odds_type, snapshot_at);
```

**即时赔率查询**：`SELECT DISTINCT ON (bookmaker, odds_type) ... WHERE match_id=? ORDER BY bookmaker, odds_type, snapshot_at DESC`

### 2.8 injuries

```sql
CREATE TABLE injuries (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id     INTEGER NOT NULL REFERENCES matches(id),
    team_type    TEXT NOT NULL CHECK(team_type IN ('home','away')),
    player_name  TEXT NOT NULL,
    position     TEXT,
    tag          TEXT CHECK(tag IN ('主力','核心')),
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_injuries_match ON injuries(match_id);
```

### 2.9 predictions

```sql
CREATE TABLE predictions (
    match_id         INTEGER PRIMARY KEY REFERENCES matches(id) ON DELETE CASCADE,
    home_prob        INTEGER NOT NULL,
    draw_prob        INTEGER NOT NULL,
    away_prob        INTEGER NOT NULL,
    confidence       INTEGER NOT NULL,
    model_version    TEXT NOT NULL,
    predicted_result TEXT NOT NULL,
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 2.10 briefings

```sql
CREATE TABLE briefings (
    match_id   INTEGER PRIMARY KEY REFERENCES matches(id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## 三、数据关系图

```
leagues ──┬── teams
          └── matches ──┬── odds_history
                        ├── injuries
                        ├── predictions
                        └── briefings

teams ──── team_aliases

matches ── match_source_mappings
```

**衍生数据（不建表，SQL 实时计算）**：积分榜、主客队数据对比、近期战绩、历史交锋。

---

## 四、API 端点全表

### 4.1 鉴权（公开）

| Method | Path | 请求体 | 响应 |
|--------|------|--------|------|
| POST | `/auth/register` | `{ username, password }` | `{ id, username, role, created_at }` |
| POST | `/auth/login` | `{ username, password }` | `{ access_token, token_type }` |

### 4.2 用户（需 Bearer）

| Method | Path | 响应 |
|--------|------|------|
| GET | `/users/me` | `{ id, username, role, created_at }` |

### 4.3 公开数据

| Method | Path | 参数 | 响应 |
|--------|------|------|------|
| GET | `/matches/betting` | `?date=` | 当日竞彩赛事列表（含即时赔率） |
| GET | `/matches/:id/briefing` | — | 赛前简报 |
| GET | `/leagues` | — | 联赛列表 |
| GET | `/leagues/:id/standings` | — | 积分榜（实时计算） |

### 4.4 需认证

| Method | Path | 参数 | 响应 |
|--------|------|------|------|
| GET | `/matches` | `?league=&status=&date=` | 赛事列表（含筛选） |
| GET | `/matches/:id` | — | 赛事详情 |
| GET | `/matches/:id/odds` | — | 即时赔率对比 |
| GET | `/matches/:id/odds/history` | `?bookmaker=&odds_type=` | 赔率历史时间序列 |
| GET | `/matches/:id/analysis` | — | 预测分析 |
| GET | `/matches/:id/comparison` | — | 主客队数据对比 |
| GET | `/matches/:id/injuries` | — | 伤停信息 |
| GET | `/analysis/h2h` | `?team1_id=&team2_id=` | 历史交锋 |
| GET | `/analysis/teams/:id/form` | — | 球队近期战绩 |
| GET | `/teams` | `?league_id=` | 球队列表 |
| GET | `/teams/:id` | — | 球队详情 |

### 4.5 爬虫写入（白名单 token）

| Method | Path | 请求体 |
|--------|------|--------|
| POST | `/internal/odds/snapshot` | `{ match_id, bookmaker, odds_type, home_odds?, draw_odds?, ... }` |
| POST | `/internal/matches/upsert` | `{ source, source_id, home_team, away_team, ... }` |

---

## 五、认证流程

```python
# 注册
POST /auth/register  { username: "test", password: "xxx" }
  → passlib.hash(password) → INSERT users → return User

# 登录
POST /auth/login  { username: "test", password: "xxx" }
  → passlib.verify(password, user.password_hash) 
  → python-jose encode({sub: user.id, role: user.role, exp: ...})
  → return { access_token: "xxx", token_type: "bearer" }

# 鉴权中间件
Authorization: Bearer xxx
  → decode JWT → 提取 user_id → 查库 → 注入 request.state.user
  → 路由通过 Depends(get_current_user) 获取当前用户
```

**环境变量**：`JWT_SECRET_KEY`（随机字符串），`JWT_EXPIRE_DAYS=30`

---

## 六、前端适配方案

### 6.1 迁移计划

```
阶段1：后端搭好框架，前端切到后端 API（两套共存）
  - vite-plugin-mock-api.ts 保留
  - 新增环境变量 VITE_USE_MOCK=true/false
  - 当 VITE_USE_MOCK=false 时，axios 请求指向 FastAPI 后端

阶段2：全量切到后端
  - mock 路由全部移除
  - 前端直接调后端

阶段3：删除 mock 文件
```

### 6.2 前端改动清单

| 文件 | 改动 |
|------|------|
| `src/api/client.ts` | baseURL 保留 `/api/v1`，proxy 指向 FastAPI |
| `vite.config.ts` | 开发环境 proxy `/api/v1` → `http://localhost:8000` |
| `src/lib/constants.ts` | 增加 `VITE_USE_MOCK` 判断 |
| `src/api/odds.ts` | 调整 `/matches/:id/odds` 响应用于兼容（后端返回与 mock 匹配） |
| `src/api/teams.ts` | 无变化（接口已对齐） |
| `src/api/matches.ts` | 无变化 |
| `src/api/auth.ts` | 无变化 |
| `src/api/analysis.ts` | 无变化 |
| `src/hooks/useAnalysis.ts` | 调整 `h2h` 参数名若后端不一致 |
| `vite-plugin-mock-api.ts` | 最终删除 |

---

## 七、部署架构

### 7.1 开发阶段

```
Vite (5173) ──proxy──→ FastAPI uvicorn (8000) ──→ SQLite
```

### 7.2 生产阶段

```
nginx (80/443) ─┬── / → Vite build dist (静态文件)
                └── /api/v1/* → FastAPI uvicorn (8000) ──→ PostgreSQL
```

### 7.3 环境变量

```
# 数据库
DATABASE_URL=sqlite:///data.db          # 开发
DATABASE_URL=postgresql://user:pass@...  # 生产

# JWT
JWT_SECRET_KEY=<随机字符串>
JWT_EXPIRE_DAYS=30
```

---

## 八、实现顺序（优先级）

| Phase | 模块 | 依赖 |
|-------|------|------|
| **P0** | FastAPI 项目初始化 + 数据库连接 + 建表 | 无 |
| **P0** | users 注册/登录 + JWT 鉴权 | P0 建表 |
| **P0** | matches CRUD 接口 | P0 建表 + 鉴权 |
| **P0** | /matches/betting（首页） | P0 matches |
| **P0** | teams + leagues + standings（实时计算） | P0 matches |
| **P0** | odds_history 查询接口（即时 + 历史） | P0 matches |
| **P0** | 分析类接口（comparison/h2h/form） | P0 matches + teams |
| **P1** | injuries 接口 | P0 matches |
| **P1** | predictions + briefings 接口 | P0 matches |
| **P1** | internal 爬虫写入接口 | P0 matches + odds |
| **P2** | 前端切到后端（VITE_USE_MOCK=false 模式） | P0 接口就绪 |
| **P2** | Alembic 迁移 + Docker Compose 部署 | P0-P1 完成 |
| **P3** | 删除 mock 插件 | P2 验证稳定后 |

---

## 九、未解决问题（待定）

- 赔率快照去重策略：爬虫同一分钟重复推送如何防重？（UNIQUE 或应用层去重）
- 历史数据首次导入性能：10 年 × 1 万场/年 × 1250 行/场 = 1.25 亿行，SQLite 是否能一次写入？
- 前端 BetSimulator 的提交按钮目前 onClick 为空——后端是否需要投注单接口？
