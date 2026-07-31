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

`users`, `leagues`, `teams`, `team_aliases`, `matches`, `match_source_mappings`, `odds_history`, `injuries`, `predictions`, `briefings`

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
