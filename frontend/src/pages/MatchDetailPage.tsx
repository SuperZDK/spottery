import { useState, lazy, Suspense } from "react"
import { useParams } from "react-router-dom"
import { SearchX } from "lucide-react"
import { useMatchDetail } from "@/hooks/useMatches"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import MatchDetailSkeleton from "@/components/shared/MatchDetailSkeleton"
import { MATCH_STATUS } from "@/lib/constants"
import type { StandingSnapshot } from "@/types/match"
import BasicTab from "@/features/matches/detail/BasicTab"

const OddsTab = lazy(() => import("@/features/matches/detail/OddsTab"))
const PredictionTab = lazy(() => import("@/features/matches/detail/PredictionTab"))
const SentimentTab = lazy(() => import("@/features/matches/detail/SentimentTab"))
const ChartTab = lazy(() => import("@/features/matches/detail/ChartTab"))

const TABS = [
  { key: "basic", label: "基本数据" },
  { key: "odds", label: "赔率数据" },
  { key: "chart", label: "可视化分析" },
  { key: "sentiment", label: "舆情分析" },
  { key: "prediction", label: "预测分析" },
] as const

type TabKey = (typeof TABS)[number]["key"]

type StandingTab = "total" | "home" | "away"

function StandingPanel({
  league, standingTab, onTabChange, homeRows, awayRows, homeName, awayName, open, onClose,
}: {
  league: string
  standingTab: StandingTab
  onTabChange: (tab: StandingTab) => void
  homeRows: StandingSnapshot[]
  awayRows: StandingSnapshot[]
  homeName: string
  awayName: string
  open: boolean
  onClose: () => void
}) {
  const home = homeRows.find((s) => s.view === standingTab)
  const away = awayRows.find((s) => s.view === standingTab)
  const rows = [
    { name: homeName, d: home },
    { name: awayName, d: away },
  ]
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />}
      <div
        className={`fixed right-0 top-14 z-40 h-[calc(100%-3.5rem)] w-72 bg-card shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-bold">{league} 积分</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">&times;</button>
        </div>
        <div className="flex border-b">
          {([["total", "总"], ["home", "主"], ["away", "客"]] as [StandingTab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                standingTab === key
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="px-4 pb-4">
          {rows.every((r) => !r.d) ? (
            <p className="py-8 text-center text-xs text-muted-foreground/60">暂无积分数据</p>
          ) : (
            <div className="mt-2 space-y-3">
              {rows.map(({ name, d }) => (
                <div key={name} className="rounded-lg border bg-muted/10 p-3">
                  <div className="mb-2 text-sm font-bold text-primary">{name}</div>
                  {!d ? (
                    <p className="text-xs text-muted-foreground/60">暂无数据</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-y-1.5 text-xs">
                      <div className="text-muted-foreground">排名</div>
                      <div className="col-span-2 text-right font-bold tabular-nums">{d.position ?? "-"}</div>
                      <div className="text-muted-foreground">积分</div>
                      <div className="col-span-2 text-right font-bold tabular-nums">{d.points ?? "-"}</div>
                      <div className="text-muted-foreground">赛/胜/平/负</div>
                      <div className="col-span-2 text-right tabular-nums">
                        {d.played ?? "-"}/{d.wins ?? "-"}/{d.draws ?? "-"}/{d.losses ?? "-"}
                      </div>
                      <div className="text-muted-foreground">进/失/净</div>
                      <div className="col-span-2 text-right tabular-nums">
                        {d.goals_for ?? "-"}/{d.goals_against ?? "-"}/{d.goal_diff ?? "-"}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function TabFallback() {
  return (
    <div className="space-y-4" role="status" aria-label="加载中">
      <Card>
        <CardContent className="space-y-3 p-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    </div>
  )
}

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const matchId = Number(id)
  const { data: detail, isLoading: matchLoading } = useMatchDetail(matchId)
  const [activeTab, setActiveTab] = useState<TabKey>("basic")
  const [standingTab, setStandingTab] = useState<StandingTab>("total")
  const [standingsOpen, setStandingsOpen] = useState(false)

  if (matchLoading) return <MatchDetailSkeleton />
  if (!detail) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <div className="text-4xl"><SearchX className="mx-auto h-10 w-10 text-muted-foreground" /></div>
        <p className="text-sm font-medium">赛事不存在</p>
        <p className="text-xs text-muted-foreground">该比赛可能尚未导入或已被移除</p>
        <a href="/matches" className="mt-2 inline-flex items-center rounded-md border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted">
          返回赛事列表
        </a>
      </div>
    )
  }

  const { match } = detail
  const homeStanding = detail.standings.home.find((s) => s.view === "total")
  const awayStanding = detail.standings.away.find((s) => s.view === "total")

  return (
    <>
      {/* Floating Standings Panel */}
      <StandingPanel
        league={match.league}
        standingTab={standingTab}
        onTabChange={setStandingTab}
        homeRows={detail.standings.home}
        awayRows={detail.standings.away}
        homeName={match.home_team}
        awayName={match.away_team}
        open={standingsOpen}
        onClose={() => setStandingsOpen(false)}
      />

      <div className="lg:px-4">
        {/* Match Header */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span>{match.league}</span>
              <Badge>{MATCH_STATUS[match.status as keyof typeof MATCH_STATUS] ?? match.status}</Badge>
              {(homeStanding || awayStanding) && (
                <button
                  onClick={() => setStandingsOpen(true)}
                  className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  积分 &raquo;
                </button>
              )}
            </div>
            <div className="flex items-center justify-center gap-4 py-4">
              <div className="flex flex-1 flex-col items-center gap-1">
                <span className="text-lg font-bold">{match.home_team}</span>
                {homeStanding?.position != null && (
                  <span className="text-xs text-muted-foreground">
                    第{homeStanding.position}名 ({homeStanding.points ?? 0}分)
                  </span>
                )}
              </div>
              <div className="text-center">
                <div className="text-4xl font-extrabold tracking-wider">
                  {match.home_score != null ? `${match.home_score} : ${match.away_score}` : "VS"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {new Date(match.match_time).toLocaleString("zh-CN", {
                    month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
                  })}
                </div>
              </div>
              <div className="flex flex-1 flex-col items-center gap-1">
                <span className="text-lg font-bold">{match.away_team}</span>
                {awayStanding?.position != null && (
                  <span className="text-xs text-muted-foreground">
                    第{awayStanding.position}名 ({awayStanding.points ?? 0}分)
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab Navigation */}
        <div className="flex border-b mt-6 mb-6 overflow-x-auto">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`shrink-0 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === key
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-w-0 space-y-6">
          {activeTab === "basic" && (
            <BasicTab
              match={match}
              comparison={detail.comparison}
              form={detail.form}
              h2h={detail.h2h}
              injuries={detail.injuries}
            />
          )}
          {activeTab === "odds" && (
            <Suspense fallback={<TabFallback />}>
              <OddsTab odds={detail.odds} />
            </Suspense>
          )}
          {activeTab === "chart" && (
            <Suspense fallback={<TabFallback />}>
              <ChartTab />
            </Suspense>
          )}
          {activeTab === "sentiment" && (
            <Suspense fallback={<TabFallback />}>
              <SentimentTab briefing={detail.briefing} />
            </Suspense>
          )}
          {activeTab === "prediction" && (
            <Suspense fallback={<TabFallback />}>
              <PredictionTab prediction={detail.prediction} />
            </Suspense>
          )}
        </div>
      </div>
    </>
  )
}
