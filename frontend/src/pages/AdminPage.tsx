import { useEffect, useMemo, useRef, useState } from "react"
import { adminApi, type ImportInfo, type ImportJob, type ImportMode, type ImportPhase } from "@/api/admin"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const MODES: Array<{ value: ImportMode; label: string; desc: string }> = [
  { value: "incremental", label: "增量导入", desc: "按文件指纹跳过未变化文件，秒级完成" },
  { value: "resync", label: "重新同步", desc: "全文件幂等对账，导入所有文件" },
  { value: "full_rebuild", label: "全量重建", desc: "按所选阶段清空对应表后重建（需两次手输确认短语）" },
  { value: "test", label: "测试小批量", desc: "仅导入固定 50 个比赛文件，验证流程" },
]

const PHASES: Array<{ value: ImportPhase; label: string; desc: string }> = [
  { value: "A", label: "阶段 A", desc: "基础数据（比赛/球队/联赛/即时赔率）" },
  { value: "B", label: "阶段 B", desc: "完整数据（含 SPF/RQSPF/比分/总进球/半全场/指数榜等）" },
  { value: "AB", label: "阶段 AB", desc: "完整数据（阶段 A + 阶段 B）" },
]

const STAGE_LABELS: Record<string, string> = {
  scan: "扫描文件",
  clearing: "清空旧数据",
  import: "导入数据",
  done: "已完成",
}

const STATUS_LABELS: Record<string, string> = {
  idle: "空闲",
  running: "运行中",
  done: "已完成",
  failed: "失败",
  stopped: "已停止",
}

function fmtElapsed(startedAt: string | null, finishedAt: string | null): string {
  if (!startedAt) return "-"
  const start = new Date(startedAt).getTime()
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now()
  const s = Math.max(0, Math.round((end - start) / 1000))
  if (s < 60) return `${s} 秒`
  return `${Math.floor(s / 60)} 分 ${s % 60} 秒`
}

export default function AdminPage() {
  const [info, setInfo] = useState<ImportInfo | null>(null)
  const [job, setJob] = useState<ImportJob | null>(null)
  const [mode, setMode] = useState<ImportMode>("incremental")
  const [phase, setPhase] = useState<ImportPhase>("AB")
  const [confirm1, setConfirm1] = useState("")
  const [confirm2, setConfirm2] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)

  const confirmPhrase = info?.confirm_phrase ?? ""
  const confirmOk = confirm1 === confirmPhrase && confirm2 === confirmPhrase

  useEffect(() => {
    let cancelled = false
    adminApi
      .info()
      .then((d) => {
        if (cancelled) return
        setInfo(d)
        if (d.last_job && d.last_job.status === "running") {
          setJob(d.last_job)
          startPolling()
        }
      })
      .catch(() => setError("无法加载导入配置，请确认后端已启动"))
    return () => {
      cancelled = true
      stopPolling()
    }
  }, [])

  function stopPolling() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  function startPolling() {
    stopPolling()
    timerRef.current = window.setInterval(async () => {
      try {
        const s = await adminApi.status()
        setJob(s)
        if (s.status !== "running") stopPolling()
      } catch {
        stopPolling()
      }
    }, 1000)
  }

  const isRunning = job?.status === "running"

  async function doStart() {
    if (isRunning) return
    setError(null)
    setBusy(true)
    try {
      const started = await adminApi.start(mode, phase, mode === "full_rebuild" ? confirmPhrase : undefined)
      setJob(started)
      setConfirm1("")
      setConfirm2("")
      startPolling()
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "启动失败，请稍后重试")
    } finally {
      setBusy(false)
    }
  }

  async function doStop() {
    try {
      const s = await adminApi.stop()
      setJob(s)
    } catch {
      setError("停止失败")
    }
  }

  const progressPct = useMemo(() => {
    if (!job || !job.total) return 0
    return Math.min(100, Math.round((job.done / job.total) * 100))
  }, [job])

  const countsRows = useMemo(() => {
    if (!job?.counts) return []
    return Object.entries(job.counts).filter(([, v]) => typeof v === "number")
  }, [job?.counts])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">管理后台</h1>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ─── 数据目录 ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">数据源</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between gap-4 border-b pb-2">
            <span className="shrink-0 text-muted-foreground">数据目录</span>
            <span className="truncate font-mono text-xs">{info?.data_dir ?? "-"}</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span className="text-muted-foreground">每日快照（即时赔率）</span>
            <span className="font-medium">{info?.daily_files ?? "-"} 个文件</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span className="text-muted-foreground">完整历史（详情）</span>
            <span className="font-medium">{info?.matches_files ?? "-"} 个文件</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span className="text-muted-foreground">目录可用</span>
            <span className={info?.data_dir_exists ? "font-medium" : "font-medium text-destructive"}>
              {info?.data_dir_exists ? "是" : "否"}
            </span>
          </div>
          {info?.tables && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 pt-1">
              {Object.entries(info.tables).map(([t, n]) => (
                <span key={t} className="text-xs text-muted-foreground">
                  {t.replace("jingcai_", "")} <span className="font-medium text-foreground">{n}</span>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── 导入模式 ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">导入数据</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3">
            {MODES.map((m) => (
              <label
                key={m.value}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 transition-colors",
                  mode === m.value ? "border-primary bg-primary/5" : "hover:bg-muted"
                )}
              >
                <input
                  type="radio"
                  name="mode"
                  checked={mode === m.value}
                  onChange={() => setMode(m.value)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium">{m.label}</span>
                  <span className="block text-xs text-muted-foreground">{m.desc}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <Label>导入阶段</Label>
            <div className="flex gap-3">
              {PHASES.map((p) => (
                <label
                  key={p.value}
                  className={cn(
                    "flex-1 cursor-pointer rounded-md border px-3 py-2 text-center transition-colors",
                    phase === p.value ? "border-primary bg-primary/5" : "hover:bg-muted",
                    mode === "test" && "pointer-events-none opacity-50"
                  )}
                >
                  <input
                    type="radio"
                    name="phase"
                    checked={phase === p.value}
                    onChange={() => setPhase(p.value)}
                    disabled={mode === "test"}
                    className="sr-only"
                  />
                  <span className="block text-sm font-medium">{p.label}</span>
                  <span className="block text-xs text-muted-foreground">{p.desc}</span>
                </label>
              ))}
            </div>
            {mode === "test" && (
              <p className="text-xs text-muted-foreground">测试小批量固定使用阶段 B，最多 50 个文件。</p>
            )}
          </div>

          {mode === "full_rebuild" && (
            <div className="space-y-3 rounded-md border border-destructive/40 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-destructive">
                全量重建将清空所选阶段的竞彩数据后重新导入，耗时约 15 分钟。请连续输入确认短语两次：
              </p>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  输入确认短语：<span className="font-mono">{confirmPhrase}</span>
                </Label>
                <Input value={confirm1} onChange={(e) => setConfirm1(e.target.value)} placeholder="清空重建竞彩数据" />
                <Input value={confirm2} onChange={(e) => setConfirm2(e.target.value)} placeholder="再次输入确认短语" />
              </div>
            </div>
          )}

          <Button
            onClick={doStart}
            disabled={isRunning || busy || (mode === "full_rebuild" && !confirmOk)}
            variant={mode === "full_rebuild" ? "destructive" : "default"}
          >
            {busy ? "启动中…" : isRunning ? "导入进行中" : "开始导入"}
          </Button>
        </CardContent>
      </Card>

      {/* ─── 任务进度 ─── */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">任务进度</CardTitle>
          {job && (
            <span
              className={cn(
                "rounded px-2 py-0.5 text-xs font-medium",
                job.status === "running" && "bg-primary/10 text-primary",
                job.status === "done" && "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
                job.status === "failed" && "bg-destructive/10 text-destructive",
                job.status === "stopped" && "bg-muted text-muted-foreground"
              )}
            >
              {STATUS_LABELS[job.status]}
            </span>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {!job ? (
            <p className="text-sm text-muted-foreground">暂无任务记录。</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span className="text-muted-foreground">
                  模式 <span className="font-medium text-foreground">{MODES.find((m) => m.value === job.mode)?.label ?? job.mode}</span>
                </span>
                <span className="text-muted-foreground">
                  阶段 <span className="font-medium text-foreground">{job.phase ?? "-"}</span>
                </span>
                <span className="text-muted-foreground">
                  耗时 <span className="font-medium text-foreground">{fmtElapsed(job.started_at, job.finished_at)}</span>
                </span>
                <span className="text-muted-foreground">
                  处理 <span className="font-medium text-foreground">{job.done}/{job.total}</span>
                </span>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {job.stage ? (STAGE_LABELS[job.stage] ?? job.stage) : "-"}
                {job.total ? ` · ${progressPct}%` : ""}
              </p>

              {job.status === "failed" && job.error && (
                <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {job.error}
                </div>
              )}

              {countsRows.length > 0 && (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <tbody>
                      {countsRows.map(([k, v]) => (
                        <tr key={k} className="border-b last:border-0">
                          <td className="px-3 py-1.5 text-muted-foreground">{k}</td>
                          <td className="px-3 py-1.5 text-right font-mono">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {isRunning && (
                <Button variant="secondary" onClick={doStop}>
                  停止导入
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
