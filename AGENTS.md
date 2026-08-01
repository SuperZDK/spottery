# AGENTS.md

工作目录说明与协作约定（供 AI 编码助手在会话开始时读取）。

## 项目结构

- `backend/` — FastAPI 后端（SQLAlchemy，SQLite `data.db`）。
- `frontend/` — React + Vite 前端（开发态 `VITE_USE_MOCK=false` 走真实后端）。
- 竞彩原始数据目录默认：`D:\data\VSCode_file\vscode_file\spottery\scrapers\data\jingcai`，可用 `JINGCAI_DATA_DIR` 或 `backend/.env` 覆盖（`app/config.py`）。

## 提交约定（重要）

每次 git 提交推送**必须**：

1. 更新 `GIT_COMMITS.md`：在提交总览表顶部插入一行（hash、日期、类型、一句说明），并在文末"各次提交详情"按时间追加一条记录（改动内容概要）。
2. 本文件随该次提交一起 `git add`，与代码改动在同一 commit 中推送。
3. commit message 遵循仓库风格（Conventional Commits）：`feat(scope): ...` / `fix(scope): ...` / `docs: ...` / `merge: ...`。

## 已知约束

- `data.db` 被 gitignore，不入库；导入任务写入属重操作，建议低峰执行。
- 内存 job 状态（`app/services/import_jobs.py`）仅限单 uvicorn worker。
- 前端存在与本项目无关的基线 TypeScript 错误（`vite-plugin-mock-api.ts`、`TodayMatchList.tsx`），修编译问题时勿误改。
