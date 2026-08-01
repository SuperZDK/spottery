# Git 提交记录

> 本文件记录项目每次 git 提交的工作内容，便于日后回溯。
>
> **维护规则：每次提交推送时，必须在本文件末尾新增一条提交记录（hash、日期、说明、改动概要），并随该次提交一起提交。** 即：先改代码 → 更新本文件 → `git add`（含本文件）→ commit → push。

## 提交总览（最新在前）

| Commit | 日期 | 类型 | 说明 |
|--------|------|------|------|
| `e5953b7` | 2026-08-01 | feat | 管理员导入功能：管理后台一键导入竞彩数据 |
| `d59fde3` | 2026-08-01 | fix | 修复赔率显示缺陷：幽灵历史行 / options 被 f 标志误剔 / 其它→其他 |
| `1d0469f` | 2026-08-01 | feat | 详情页聚合真实竞彩数据，拆分五大 Tab |
| `2ec181c` | 2026-07-31 | merge | merge: feature/detail-skeleton（详情页 Skeleton 与数据模型文档） |
| `bdd8435` | 2026-07-31 | feat | 详情页 Skeleton 加载态 |
| `2c7496d` | 2026-07-31 | docs | 数据模型与数据库结构文档 |
| `18d0e24` | 2026-07-31 | merge | merge: feature/jingcai-import（竞彩数据导入与真实赔率接口） |
| `bddc581` | 2026-07-31 | feat | 导入体彩真实竞彩数据并对外提供实时赔率 |
| `4632ad9` | 2026-07-25 | init | Initial commit：平台基础框架 |

## 各次提交详情（按时间正序）

### `4632ad9` 2026-07-25 — Initial commit：平台基础框架
一次性搭建脚手架：

- 后端 FastAPI + SQLAlchemy 完整骨架：auth/JWT（`app/dependencies/auth.py`、`app/utils/jwt_handler.py`）、用户/比赛/球队/联赛/赔率/伤病/预测等模型与路由、限流、scraper 路由。
- 前端 React 项目基础。
- Dockerfile、`.gitignore`、`.env.example`。

### `bddc581` + `18d0e24` 2026-07-31 — 竞彩数据导入与真实赔率接口
核心数据能力落地：

- 新增 `backend/import_jingcai.py`（766 行）：从体彩真实数据目录导入竞彩数据（比赛/球队/联赛/赔率历史/指数榜等），建 17 张 `jingcai_*` 表。
- `matches.py` 路由扩展：对外提供真实赔率（SPF / 让球 SPF / 比分 / 总进球 / 半全场 / 指数榜等）。
- 前端今日赛列表（`TodayMatchList.tsx`）改读真实数据。
- README 补充 192 行；`requirements.txt` 新增依赖。

### `2c7496d` 2026-07-31 — 数据模型与数据库结构文档
README 新增 371 行数据模型与数据库结构参考：字段表、表关系、查询说明。

### `bdd8435` + `2ec181c` 2026-07-31 — 详情页 Skeleton 加载态
- 新增 `MatchDetailSkeleton.tsx`（169 行骨架屏组件）+ 基础 `skeleton.tsx`。
- 详情页数据加载时显示骨架屏，提升体验。

### `1d0469f` 2026-08-01 — 详情页聚合真实竞彩数据
大重构：

- `matches.py` 扩展 331 行：用竞彩数据聚合赛前信息 / 赔率 / 阵容 / 预测等详情。
- 删除 `seed.py`（441 行假数据）。
- 前端 `MatchDetailPage.tsx` 由 946 行拆分为五个 Tab：`BasicTab` / `ChartTab` / `OddsTab` / `PredictionTab` / `SentimentTab`，全部接真实接口。
- `useMatches` / `useOdds` / `useAnalysis` 等 hooks 同步适配。

### `d59fde3` 2026-08-01 — 修复赔率显示缺陷
- 去掉 `f == "-1"` 误剔 options 的逻辑（原先误过滤了"其他"赔率选项）。
- `import_jingcai.py` 的 `_phase_a` 不再写 SPF/RQSPF 历史 → 消除幽灵历史行。
- `matches.py` 历史查询加 `filter_phantom` 过滤幽灵行。
- `OddsTab.tsx` 统一"其它"→"其他"。
- 五张赔率历史表清空重导：SPF 261,485 / RQSPF 268,489 行全为真实记录、0 幽灵行。

### `e5953b7` 2026-08-01 — 管理员导入功能
在管理后台新增"导入竞彩数据"功能：

- 4 种导入模式：增量（指纹跳过未变化文件）/ 重同步（全文件幂等对账）/ 全量重建（按所选阶段清对应 4 或 17 张表）/ 测试小批量（固定 50 文件）。
- 实时进度 + 可停止；全量重建需两次手输确认短语"清空重建竞彩数据"防误触。
- 数据目录配置化：`JINGCAI_DATA_DIR` 环境变量 / `backend/.env` 可覆盖。
- 新增 `JingcaiImportFile` 指纹表，导入幂等 upsert 增量对账。
- 新增 `import_jobs.py` 任务管理器、`admin.py` 4 个接口（均 `require_admin` 保护）、`create_admin.py` 建管理员账号 CLI。
- 前端：`AdminPage.tsx`（模式/阶段选择、双重确认、进度条/耗时/停止、counts 结果表、只读数据目录面板）、`/admin` 路由、ADMIN 专属导航、`isAdmin()` 鉴权。

---

_最后一次更新：2026-08-01（commit `e5953b7`）_
