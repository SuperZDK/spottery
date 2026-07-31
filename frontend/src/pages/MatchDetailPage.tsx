import { useState } from "react"
import { useParams } from "react-router-dom"
import { SearchX } from "lucide-react"
import { useMatch } from "@/hooks/useMatches"
import { useOdds, useOddsHistory } from "@/hooks/useOdds"
import { usePrediction, useTeamForm, useH2H, useBriefing, useMatchComparison, useMatchInjuries } from "@/hooks/useAnalysis"
import { useStandings } from "@/hooks/useTeams"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import MatchDetailSkeleton from "@/components/shared/MatchDetailSkeleton"
import { MATCH_STATUS } from "@/lib/constants"
import type { OddsItem, OddsHistoryPoint } from "@/types/odds"
import type { Standing, StatRow } from "@/types/team"

const TABS = [
  { key: "basic", label: "基本数据" },
  { key: "odds", label: "赔率数据" },
  { key: "chart", label: "可视化分析" },
  { key: "sentiment", label: "舆情分析" },
  { key: "prediction", label: "预测分析" },
] as const

type TabKey = (typeof TABS)[number]["key"]

function FormBadge({ result }: { result: string }) {
  const color = result === "W" ? "bg-green-500" : result === "D" ? "bg-yellow-500" : "bg-red-500"
  return (
    <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${color}`}>
      {result}
    </span>
  )
}

function h2hResultColor(homeScore: number | null, awayScore: number | null): string {
  if (homeScore == null || awayScore == null) return "text-muted-foreground"
  if (homeScore > awayScore) return "text-green-600 font-bold"
  if (homeScore === awayScore) return "text-yellow-600 font-bold"
  return "text-red-600 font-bold"
}

function fmtOdds(v: number | null | undefined): string {
  return v != null ? v.toFixed(2) : "-"
}

function matchResult(home: number | null, away: number | null): "home" | "draw" | "away" | null {
  if (home == null || away == null) return null
  if (home > away) return "home"
  if (home === away) return "draw"
  return "away"
}

function oddsHighlightClass(result: string | null, target: "home" | "draw" | "away"): string {
  if (result !== target) return "text-muted-foreground/60"
  return "text-primary font-bold"
}

type StandingTab = "total" | "home" | "away"

function getStandingData(s: Standing, tab: StandingTab) {
  if (tab === "home") return {
    position: s.position, played: s.home_played, wins: s.home_wins, draws: s.home_draws,
    losses: s.home_losses, goals_for: s.home_goals_for, goals_against: s.home_goals_against,
    points: s.home_wins * 3 + s.home_draws,
  }
  if (tab === "away") return {
    position: s.position, played: s.away_played, wins: s.away_wins, draws: s.away_draws,
    losses: s.away_losses, goals_for: s.away_goals_for, goals_against: s.away_goals_against,
    points: s.away_wins * 3 + s.away_draws,
  }
  return s
}

function StatTable({ data, label }: { data: StatRow; label?: string }) {
  return (
    <TableRow className="border-b border-dashed border-muted/30 hover:bg-transparent">
      <TableCell className="py-1.5 text-xs text-muted-foreground w-6">{label ?? ""}</TableCell>
      <TableCell className="py-1.5 text-xs text-center">{data.played}</TableCell>
      <TableCell className="py-1.5 text-xs text-center text-green-600">{data.wins}</TableCell>
      <TableCell className="py-1.5 text-xs text-center text-yellow-600">{data.draws}</TableCell>
      <TableCell className="py-1.5 text-xs text-center text-red-600">{data.losses}</TableCell>
      <TableCell className="py-1.5 text-xs text-right tabular-nums">{data.goals_for}</TableCell>
      <TableCell className="py-1.5 text-xs text-right tabular-nums">{data.goals_against}</TableCell>
      <TableCell className="py-1.5 text-xs text-right tabular-nums">{data.goal_diff > 0 ? "+" : ""}{data.goal_diff}</TableCell>
      <TableCell className="py-1.5 text-xs text-right font-bold">{data.points}</TableCell>
      <TableCell className="py-1.5 text-xs text-right w-10">{data.win_rate != null ? `${data.win_rate}%` : "-"}</TableCell>
    </TableRow>
  )
}

function TeamComparisonCard({ data }: { data: any }) {
  if (!data) return null
  return (
    <Card className="flex-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{data.league_label} {data.team_name}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 px-3 pb-3">
        <div className="text-[10px] font-bold text-muted-foreground/60 mt-2 mb-1">全场</div>
        <Table className="text-[10px]">
          <colgroup>
            <col className="w-6" />
            <col className="w-4" />
            <col className="w-4" />
            <col className="w-4" />
            <col className="w-4" />
            <col className="w-6" />
            <col className="w-6" />
            <col className="w-6" />
            <col className="w-6" />
            <col className="w-10" />
          </colgroup>
          <TableHeader>
            <TableRow className="text-muted-foreground/50 border-b hover:bg-transparent">
              <TableHead className="text-left font-normal pb-1" />
              <TableHead className="text-center font-normal pb-1 whitespace-nowrap">赛</TableHead>
              <TableHead className="text-center font-normal pb-1 whitespace-nowrap">胜</TableHead>
              <TableHead className="text-center font-normal pb-1 whitespace-nowrap">平</TableHead>
              <TableHead className="text-center font-normal pb-1 whitespace-nowrap">负</TableHead>
              <TableHead className="text-right font-normal pb-1 whitespace-nowrap">得</TableHead>
              <TableHead className="text-right font-normal pb-1 whitespace-nowrap">失</TableHead>
              <TableHead className="text-right font-normal pb-1 whitespace-nowrap">净</TableHead>
              <TableHead className="text-right font-normal pb-1 whitespace-nowrap">积</TableHead>
              <TableHead className="text-right font-normal pb-1 whitespace-nowrap">胜率</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <StatTable data={data.fulltime.total} label="总" />
            <StatTable data={data.fulltime.home} label="主" />
            <StatTable data={data.fulltime.away} label="客" />
            <StatTable data={data.fulltime.recent6} label="近6" />
          </TableBody>
        </Table>
        <div className="text-[10px] font-bold text-muted-foreground/60 mt-2 mb-1">半场</div>
        <Table className="text-[10px]">
          <colgroup>
            <col className="w-6" />
            <col className="w-4" />
            <col className="w-4" />
            <col className="w-4" />
            <col className="w-4" />
            <col className="w-6" />
            <col className="w-6" />
            <col className="w-6" />
            <col className="w-6" />
            <col className="w-10" />
          </colgroup>
          <TableHeader>
            <TableRow className="text-muted-foreground/50 border-b hover:bg-transparent">
              <TableHead className="text-left font-normal pb-1" />
              <TableHead className="text-center font-normal pb-1 whitespace-nowrap">赛</TableHead>
              <TableHead className="text-center font-normal pb-1 whitespace-nowrap">胜</TableHead>
              <TableHead className="text-center font-normal pb-1 whitespace-nowrap">平</TableHead>
              <TableHead className="text-center font-normal pb-1 whitespace-nowrap">负</TableHead>
              <TableHead className="text-right font-normal pb-1 whitespace-nowrap">得</TableHead>
              <TableHead className="text-right font-normal pb-1 whitespace-nowrap">失</TableHead>
              <TableHead className="text-right font-normal pb-1 whitespace-nowrap">净</TableHead>
              <TableHead className="text-right font-normal pb-1 whitespace-nowrap">积</TableHead>
              <TableHead className="text-right font-normal pb-1 whitespace-nowrap">胜率</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <StatTable data={data.halftime.total} label="总" />
            <StatTable data={data.halftime.home} label="主" />
            <StatTable data={data.halftime.away} label="客" />
            <StatTable data={data.halftime.recent6} label="近6" />
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function StandingPanel({
  league, standingTab, onTabChange, standingRows, homeTeamId, awayTeamId, open, onClose,
}: {
  league: string
  standingTab: StandingTab
  onTabChange: (tab: StandingTab) => void
  standingRows: Standing[]
  homeTeamId: number | null
  awayTeamId: number | null
  open: boolean
  onClose: () => void
}) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />}
      <div
        className={`fixed right-0 top-14 z-40 h-[calc(100%-3.5rem)] w-72 bg-card shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-bold">{league} 积分榜</span>
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
          <Table className="text-xs mt-2">
            <TableHeader>
              <TableRow className="text-[10px] text-muted-foreground/50 border-b hover:bg-transparent">
                <TableHead className="text-center font-normal pb-1 w-4 whitespace-nowrap">#</TableHead>
                <TableHead className="text-left font-normal pb-1 pl-1 whitespace-nowrap">球队</TableHead>
                <TableHead className="text-right font-normal pb-1 w-6 whitespace-nowrap">积分</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standingRows.map((s: Standing) => {
                const d = getStandingData(s, standingTab)
                const highlight = s.team_id === homeTeamId || s.team_id === awayTeamId
                return (
                  <TableRow key={s.team_id} className={highlight ? "bg-primary/15 font-bold text-primary hover:bg-primary/15" : ""}>
                    <TableCell className="text-center text-muted-foreground py-0.5 text-xs">{d.position}</TableCell>
                    <TableCell className="truncate py-0.5 text-xs pl-1">{s.team_name}</TableCell>
                    <TableCell className="text-right tabular-nums py-0.5 text-xs">{d.points}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  )
}

function OddsArrow({ cur, prev }: { cur: number | null | undefined; prev: number | null | undefined }) {
  if (prev == null || cur == null || cur === prev) return null
  if (cur > prev) return <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-sm bg-red-200 text-red-800 font-bold text-[10px] leading-none">▲</span>
  return <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-sm bg-green-200 text-green-800 font-bold text-[10px] leading-none">▼</span>
}

function OddsHistoryTable({ data, showDraw = true }: { data: OddsHistoryPoint[]; showDraw?: boolean }) {
  const rows = [...data].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  const hasHandicap = rows.some((r) => r.handicap != null)
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground/60 py-3 text-center">暂无历史赔率数据</p>
  }
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b text-muted-foreground hover:bg-transparent">
          <TableHead className="p-1 text-left font-normal whitespace-nowrap">时间</TableHead>
          {hasHandicap && <TableHead className="p-1 text-center font-normal whitespace-nowrap">让球</TableHead>}
          <TableHead className="p-1 text-right font-normal whitespace-nowrap">主胜</TableHead>
          {showDraw && <TableHead className="p-1 text-right font-normal whitespace-nowrap">平局</TableHead>}
          <TableHead className="p-1 text-right font-normal whitespace-nowrap">客胜</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => {
          const prev = rows[i + 1]
          const isInitial = i === rows.length - 1
          return (
            <TableRow key={i} className="border-b border-dashed border-muted/30 hover:bg-muted/5">
              <TableCell className="p-1 text-muted-foreground whitespace-nowrap">
                {r.time.slice(5, 16).replace("T", " ")}
                {isInitial && <span className="ml-1.5 text-[10px] text-muted-foreground/50 border border-muted/20 rounded px-1">初赔</span>}
              </TableCell>
              {hasHandicap && <TableCell className="p-1 text-center font-medium text-blue-600 whitespace-nowrap">{r.handicap ?? "-"}</TableCell>}
              <TableCell className="p-1 text-right tabular-nums whitespace-nowrap">
                {r.home != null ? r.home.toFixed(2) : "-"}
                <OddsArrow cur={r.home} prev={prev?.home} />
              </TableCell>
              {showDraw && <TableCell className="p-1 text-right tabular-nums whitespace-nowrap">
                {r.draw != null ? r.draw.toFixed(2) : "-"}
                <OddsArrow cur={r.draw} prev={prev?.draw} />
              </TableCell>}
              <TableCell className="p-1 text-right tabular-nums whitespace-nowrap">
                {r.away != null ? r.away.toFixed(2) : "-"}
                <OddsArrow cur={r.away} prev={prev?.away} />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

const BF_HOME = ["1:0","2:0","2:1","3:0","3:1","3:2","4:0","4:1","4:2","5:0","5:1","5:2","胜其它"]
const BF_DRAW = ["0:0","1:1","2:2","3:3","平其它"]
const BF_AWAY = ["0:1","0:2","1:2","0:3","1:3","2:3","0:4","1:4","2:4","0:5","1:5","2:5","负其它"]
const ZJQ_LABELS = ["0球","1球","2球","3球","4球","5球","6球","7+球"]
const BQC_LABELS = ["胜-胜","胜-平","胜-负","平-胜","平-平","平-负","负-胜","负-平","负-负"]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-dashed border-muted/30 last:border-b-0">
      <div className="px-2 py-1.5 text-sm font-bold text-muted-foreground/80 bg-muted/10 border-b">{title}</div>
      <div className="px-2 py-1">{children}</div>
    </div>
  )
}

function BfGrid({ data }: { data: OddsHistoryPoint[] }) {
  const items = [...data].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  const fmt = (v: number | null | undefined) => v != null ? v.toFixed(2) : "-"
  const getVal = (r: OddsHistoryPoint | undefined, label: string) => r?.options?.[label] ?? null
  if (!items.length) return <p className="text-sm text-muted-foreground/60 py-2 text-center">暂无数据</p>
  const timeStr = (r: OddsHistoryPoint) => {
    const t = r.time.slice(5, 16).replace("T", " ")
    return <>{t.slice(0, 5)}<br />{t.slice(6)}</>
  }
  return (
    <Table className="border-collapse table-fixed">
      <TableBody>
        {items.flatMap((r, i) => {
          const prev = items[i + 1]
          const isInitial = i === items.length - 1
          const homeCells = BF_HOME.map(l => (
            <TableCell key={l} className="p-1.5 text-right tabular-nums font-medium text-green-800 bg-green-50/40">
              {fmt(getVal(r, l))}<OddsArrow cur={getVal(r, l)} prev={getVal(prev, l)} />
            </TableCell>
          ))
          const drawCells = BF_DRAW.map(l => (
            <TableCell key={l} className="p-1.5 text-right tabular-nums font-medium text-yellow-800 bg-yellow-50/40">
              {fmt(getVal(r, l))}<OddsArrow cur={getVal(r, l)} prev={getVal(prev, l)} />
            </TableCell>
          ))
          const awayCells = BF_AWAY.map(l => (
            <TableCell key={l} className="p-1.5 text-right tabular-nums font-medium text-red-800 bg-red-50/40">
              {fmt(getVal(r, l))}<OddsArrow cur={getVal(r, l)} prev={getVal(prev, l)} />
            </TableCell>
          ))
          return [
            <TableRow key={`${i}-hdr`} className="bg-muted/20 border-b hover:bg-transparent">
              <TableHead className="p-1.5 text-left font-semibold whitespace-nowrap w-20">
                发布时间
                {isInitial && <span className="ml-1.5 text-[10px] text-muted-foreground/50 border border-muted/20 rounded px-1">初赔</span>}
              </TableHead>
              {BF_HOME.map(l => <TableHead key={l} className="p-1.5 text-right font-semibold whitespace-nowrap">{l}</TableHead>)}
            </TableRow>,
            <TableRow key={`${i}-h`} className="border-b border-muted/20 hover:bg-transparent">
              <TableHead rowSpan={5} className="p-1.5 font-semibold text-muted-foreground whitespace-nowrap align-top bg-muted/5">{timeStr(r)}</TableHead>
              {homeCells}
            </TableRow>,
            <TableRow key={`${i}-dl`} className="hover:bg-transparent">
              {BF_DRAW.map(l => <TableHead key={l} className="p-1.5 text-right font-bold text-yellow-800 whitespace-nowrap bg-yellow-50 border-b border-yellow-100">{l}</TableHead>)}
              <TableCell colSpan={8} rowSpan={2} className="bg-yellow-50 border-b border-yellow-100" />
            </TableRow>,
            <TableRow key={`${i}-dd`} className="border-b border-muted/20 hover:bg-transparent">
              {drawCells}
            </TableRow>,
            <TableRow key={`${i}-al`} className="hover:bg-transparent">
              {BF_AWAY.map(l => <TableHead key={l} className="p-1.5 text-right font-bold text-red-800 whitespace-nowrap bg-red-50 border-b border-red-100">{l}</TableHead>)}
            </TableRow>,
            <TableRow key={`${i}-ad`} className="border-b-2 border-muted/30 hover:bg-transparent">
              {awayCells}
            </TableRow>,
          ]
        })}
      </TableBody>
    </Table>
  )
}

function ZjqTable({ data }: { data: OddsHistoryPoint[] }) {
  const rows = [...data].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  const fmt = (v: number | null | undefined) => v != null ? v.toFixed(2) : "-"
  const getVal = (r: OddsHistoryPoint | undefined, label: string) => r?.options?.[label] ?? null
  if (!rows.length) return <p className="text-sm text-muted-foreground/60 py-2 text-center">暂无数据</p>
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b text-muted-foreground/70 hover:bg-transparent">
          <TableHead className="p-1 text-left font-normal whitespace-nowrap">时间</TableHead>
          {ZJQ_LABELS.map((l) => <TableHead key={l} className="p-1 text-right font-normal whitespace-nowrap">{l}</TableHead>)}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => {
          const prev = rows[i + 1]
          const isInitial = i === rows.length - 1
          return (
            <TableRow key={i} className="border-b border-dashed border-muted/20 hover:bg-muted/5">
              <TableCell className="p-1 text-muted-foreground whitespace-nowrap">
                {r.time.slice(5, 16).replace("T", " ")}
                {isInitial && <span className="ml-1.5 text-[10px] text-muted-foreground/50 border border-muted/20 rounded px-1">初赔</span>}
              </TableCell>
              {ZJQ_LABELS.map((l) => <TableCell key={l} className="p-1 text-right tabular-nums">{fmt(getVal(r, l))}<OddsArrow cur={getVal(r, l)} prev={getVal(prev, l)} /></TableCell>)}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function BqcTable({ data }: { data: OddsHistoryPoint[] }) {
  const rows = [...data].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  const fmt = (v: number | null | undefined) => v != null ? v.toFixed(2) : "-"
  const getVal = (r: OddsHistoryPoint | undefined, label: string) => r?.options?.[label] ?? null
  if (!rows.length) return <p className="text-sm text-muted-foreground/60 py-2 text-center">暂无数据</p>
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b text-muted-foreground/70 hover:bg-transparent">
          <TableHead className="p-1 text-left font-normal whitespace-nowrap">时间</TableHead>
          {BQC_LABELS.map((l) => <TableHead key={l} className="p-1 text-right font-normal whitespace-nowrap">{l}</TableHead>)}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => {
          const prev = rows[i + 1]
          const isInitial = i === rows.length - 1
          return (
            <TableRow key={i} className="border-b border-dashed border-muted/20 hover:bg-muted/5">
              <TableCell className="p-1 text-muted-foreground whitespace-nowrap">
                {r.time.slice(5, 16).replace("T", " ")}
                {isInitial && <span className="ml-1.5 text-[10px] text-muted-foreground/50 border border-muted/20 rounded px-1">初赔</span>}
              </TableCell>
              {BQC_LABELS.map((l) => <TableCell key={l} className="p-1 text-right tabular-nums">{fmt(getVal(r, l))}<OddsArrow cur={getVal(r, l)} prev={getVal(prev, l)} /></TableCell>)}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const matchId = Number(id)
  const { data: match, isLoading: matchLoading } = useMatch(matchId)
  const { data: odds } = useOdds(matchId)
  const { data: prediction } = usePrediction(matchId)
  const { data: briefing } = useBriefing(matchId)
  const { data: homeForm } = useTeamForm(match?.home_team_id ?? 0)
  const { data: awayForm } = useTeamForm(match?.away_team_id ?? 0)
  const { data: h2h } = useH2H(match?.home_team_id ?? 0, match?.away_team_id ?? 0)
  const { data: standings } = useStandings(match?.league_id ?? 0)
  const [activeTab, setActiveTab] = useState<TabKey>("basic")
  const [standingTab, setStandingTab] = useState<StandingTab>("total")
  const [standingsOpen, setStandingsOpen] = useState(false)
  const [oddsSubTab, setOddsSubTab] = useState<"jingcai" | "yapan" | "oupei">("jingcai")
  const [yapanBookmaker, setYapanBookmaker] = useState("澳门")
  const [oupeiBookmaker, setoupeiBookmaker] = useState("威廉希尔")

  const { data: comparison } = useMatchComparison(matchId)
  const { data: injuries } = useMatchInjuries(matchId)
  const { data: jingcaiHistory } = useOddsHistory(matchId, "SPF", "竞彩")
  const { data: jingcaiRQSPF } = useOddsHistory(matchId, "RQSPF", "竞彩")
  const { data: jingcaiBF } = useOddsHistory(matchId, "BF", "竞彩")
  const { data: jingcaiZJQ } = useOddsHistory(matchId, "ZJQ", "竞彩")
  const { data: jingcaiBQC } = useOddsHistory(matchId, "BQC", "竞彩")
  const { data: yapanHistory } = useOddsHistory(matchId, "RQSPF", yapanBookmaker, oddsSubTab === "yapan")
  const { data: oupelHistory } = useOddsHistory(matchId, "SPF", oupeiBookmaker, oddsSubTab === "oupei")

  if (matchLoading) return <MatchDetailSkeleton />
  if (!match) {
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

  const standingRows = standings ?? []
  const homeStanding = standingRows.find((s: Standing) => s.team_id === match.home_team_id)
  const awayStanding = standingRows.find((s: Standing) => s.team_id === match.away_team_id)

  const sortedHomeForm = [...(homeForm?.results ?? [])]
    .sort((a, b) => new Date(b.match_time).getTime() - new Date(a.match_time).getTime())
    .slice(0, 6)
  const sortedAwayForm = [...(awayForm?.results ?? [])]
    .sort((a, b) => new Date(b.match_time).getTime() - new Date(a.match_time).getTime())
    .slice(0, 6)
  const sortedH2H = [...(h2h ?? [])]
    .sort((a, b) => new Date(b.match_time).getTime() - new Date(a.match_time).getTime())
    .slice(0, 6)

  return (
    <>
      {/* Floating Standings Panel */}
      <StandingPanel
        league={match.league}
        standingTab={standingTab}
        onTabChange={setStandingTab}
        standingRows={standingRows}
        homeTeamId={match.home_team_id}
        awayTeamId={match.away_team_id}
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
              <button
                onClick={() => setStandingsOpen(true)}
                className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                积分榜 &raquo;
              </button>
            </div>
            <div className="flex items-center justify-center gap-4 py-4">
              <div className="flex flex-1 flex-col items-center gap-1">
                <span className="text-lg font-bold">{match.home_team}</span>
                {homeStanding && (
                  <span className="text-xs text-muted-foreground">
                    第{homeStanding.position}名 ({homeStanding.points}分)
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
                {awayStanding && (
                  <span className="text-xs text-muted-foreground">
                    第{awayStanding.position}名 ({awayStanding.points}分)
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
            <>
              {/* Team Comparison */}
              {comparison && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <TeamComparisonCard data={comparison.home} />
                  <TeamComparisonCard data={comparison.away} />
                </div>
              )}

              {/* Injuries */}
              {injuries && (injuries.home.length > 0 || injuries.away.length > 0) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">伤停情况</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div>
                        <h4 className="mb-2 text-xs font-bold text-muted-foreground">{match.home_team}</h4>
                        {injuries.home.length === 0 ? (
                          <p className="text-xs text-muted-foreground/60">暂无伤病</p>
                        ) : (
                          <div className="space-y-1.5">
                            {injuries.home.map((p: any, i: number) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                <span className="font-medium">{p.name}</span>
                                <span className="text-muted-foreground">{p.position}</span>
                                {p.tag && (
                                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${
                                    p.tag === "核心" ? "bg-red-500" : "bg-blue-500"
                                  }`}>
                                    {p.tag}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="mb-2 text-xs font-bold text-muted-foreground">{match.away_team}</h4>
                        {injuries.away.length === 0 ? (
                          <p className="text-xs text-muted-foreground/60">暂无伤病</p>
                        ) : (
                          <div className="space-y-1.5">
                            {injuries.away.map((p: any, i: number) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                <span className="font-medium">{p.name}</span>
                                <span className="text-muted-foreground">{p.position}</span>
                                {p.tag && (
                                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${
                                    p.tag === "核心" ? "bg-red-500" : "bg-blue-500"
                                  }`}>
                                    {p.tag}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Team Forms */}
              {(sortedHomeForm.length > 0 || sortedAwayForm.length > 0) && (
                <div className="grid gap-6 lg:grid-cols-2">
                  {sortedHomeForm.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{homeForm!.team_name} 近期战绩</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-3 flex gap-1.5">
                          {sortedHomeForm.map((r) => <FormBadge key={r.match_id} result={r.result} />)}
                        </div>
                        <Table className="text-xs">
                          <TableHeader>
                            <TableRow className="text-muted-foreground/50 border-b hover:bg-transparent">
                              <TableHead className="text-left font-normal pb-1 whitespace-nowrap">日期</TableHead>
                              <TableHead className="text-center font-normal pb-1 whitespace-nowrap">绩</TableHead>
                              <TableHead className="text-center font-normal pb-1 whitespace-nowrap">主/客</TableHead>
                              <TableHead className="text-left font-normal pb-1 whitespace-nowrap">对手</TableHead>
                              <TableHead className="text-center font-normal pb-1 whitespace-nowrap">比分</TableHead>
                              <TableHead className="text-right font-normal pb-1 whitespace-nowrap">主</TableHead>
                              <TableHead className="text-right font-normal pb-1 whitespace-nowrap">平</TableHead>
                              <TableHead className="text-right font-normal pb-1 whitespace-nowrap">客</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sortedHomeForm.map((r) => {
                              const color = r.result === "W" ? "text-green-600" : r.result === "D" ? "text-yellow-600" : "text-red-600"
                              const result = r.result === "W" ? "home" as const : r.result === "D" ? "draw" as const : "away" as const
                              return (
                                <TableRow key={r.match_id} className="border-b border-dashed border-muted/30 hover:bg-muted/5">
                                  <TableCell className="py-1.5 pr-2 text-muted-foreground whitespace-nowrap">{r.match_time.slice(5, 10)}</TableCell>
                                  <TableCell className={`py-1.5 px-1 text-center font-bold whitespace-nowrap ${color}`}>
                                    {r.result === "W" ? "胜" : r.result === "D" ? "平" : "负"}
                                  </TableCell>
                                  <TableCell className="py-1.5 px-1 text-center text-xs text-muted-foreground whitespace-nowrap">{r.home ? "主" : "客"}</TableCell>
                                  <TableCell className="py-1.5 pr-2 truncate text-muted-foreground">{r.opponent}</TableCell>
                                  <TableCell className="py-1.5 px-2 text-center font-medium whitespace-nowrap">{r.score}</TableCell>
                                  <TableCell className={`py-1.5 pl-2 text-right tabular-nums whitespace-nowrap ${oddsHighlightClass(result, "home")}`}>{fmtOdds(r.home_spf)}</TableCell>
                                  <TableCell className={`py-1.5 pl-2 text-right tabular-nums whitespace-nowrap ${oddsHighlightClass(result, "draw")}`}>{fmtOdds(r.draw_spf)}</TableCell>
                                  <TableCell className={`py-1.5 pl-2 text-right tabular-nums whitespace-nowrap ${oddsHighlightClass(result, "away")}`}>{fmtOdds(r.away_spf)}</TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                  {sortedAwayForm.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{awayForm!.team_name} 近期战绩</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-3 flex gap-1.5">
                          {sortedAwayForm.map((r) => <FormBadge key={r.match_id} result={r.result} />)}
                        </div>
                        <Table className="text-xs">
                          <TableHeader>
                            <TableRow className="text-muted-foreground/50 border-b hover:bg-transparent">
                              <TableHead className="text-left font-normal pb-1 whitespace-nowrap">日期</TableHead>
                              <TableHead className="text-center font-normal pb-1 whitespace-nowrap">绩</TableHead>
                              <TableHead className="text-center font-normal pb-1 whitespace-nowrap">主/客</TableHead>
                              <TableHead className="text-left font-normal pb-1 whitespace-nowrap">对手</TableHead>
                              <TableHead className="text-center font-normal pb-1 whitespace-nowrap">比分</TableHead>
                              <TableHead className="text-right font-normal pb-1 whitespace-nowrap">主</TableHead>
                              <TableHead className="text-right font-normal pb-1 whitespace-nowrap">平</TableHead>
                              <TableHead className="text-right font-normal pb-1 whitespace-nowrap">客</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sortedAwayForm.map((r) => {
                              const color = r.result === "W" ? "text-green-600" : r.result === "D" ? "text-yellow-600" : "text-red-600"
                              const result = r.result === "W" ? "home" as const : r.result === "D" ? "draw" as const : "away" as const
                              return (
                                <TableRow key={r.match_id} className="border-b border-dashed border-muted/30 hover:bg-muted/5">
                                  <TableCell className="py-1.5 pr-2 text-muted-foreground whitespace-nowrap">{r.match_time.slice(5, 10)}</TableCell>
                                  <TableCell className={`py-1.5 px-1 text-center font-bold whitespace-nowrap ${color}`}>
                                    {r.result === "W" ? "胜" : r.result === "D" ? "平" : "负"}
                                  </TableCell>
                                  <TableCell className="py-1.5 px-1 text-center text-xs text-muted-foreground whitespace-nowrap">{r.home ? "主" : "客"}</TableCell>
                                  <TableCell className="py-1.5 pr-2 truncate text-muted-foreground">{r.opponent}</TableCell>
                                  <TableCell className="py-1.5 px-2 text-center font-medium whitespace-nowrap">{r.score}</TableCell>
                                  <TableCell className={`py-1.5 pl-2 text-right tabular-nums whitespace-nowrap ${oddsHighlightClass(result, "home")}`}>{fmtOdds(r.home_spf)}</TableCell>
                                  <TableCell className={`py-1.5 pl-2 text-right tabular-nums whitespace-nowrap ${oddsHighlightClass(result, "draw")}`}>{fmtOdds(r.draw_spf)}</TableCell>
                                  <TableCell className={`py-1.5 pl-2 text-right tabular-nums whitespace-nowrap ${oddsHighlightClass(result, "away")}`}>{fmtOdds(r.away_spf)}</TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* H2H */}
              {sortedH2H.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">历史交锋</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow className="text-muted-foreground/50 border-b hover:bg-transparent">
                          <TableHead className="text-left font-normal pb-1 whitespace-nowrap">日期</TableHead>
                          <TableHead className="text-right font-normal pb-1 whitespace-nowrap">主队</TableHead>
                          <TableHead className="text-center font-normal pb-1 whitespace-nowrap">比分</TableHead>
                          <TableHead className="text-left font-normal pb-1 whitespace-nowrap">客队</TableHead>
                          <TableHead className="text-right font-normal pb-1 whitespace-nowrap">主</TableHead>
                          <TableHead className="text-right font-normal pb-1 whitespace-nowrap">平</TableHead>
                          <TableHead className="text-right font-normal pb-1 whitespace-nowrap">客</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedH2H.map((h) => {
                          const result = matchResult(h.home_score, h.away_score)
                          return (
                            <TableRow key={h.match_id} className="border-b border-dashed border-muted/30 hover:bg-muted/5">
                              <TableCell className="py-1.5 pr-2 text-muted-foreground whitespace-nowrap">{h.match_time.slice(5, 10)}</TableCell>
                              <TableCell className="py-1.5 pl-2 pr-1 text-right whitespace-nowrap">{h.home_team}</TableCell>
                              <TableCell className={`py-1.5 px-2 text-center font-bold whitespace-nowrap ${h2hResultColor(h.home_score, h.away_score)}`}>
                                {h.home_score != null ? `${h.home_score}:${h.away_score}` : "VS"}
                              </TableCell>
                              <TableCell className="py-1.5 pr-1 whitespace-nowrap">{h.away_team}</TableCell>
                              <TableCell className={`py-1.5 pl-2 text-right tabular-nums whitespace-nowrap ${oddsHighlightClass(result, "home")}`}>{fmtOdds(h.home_spf)}</TableCell>
                              <TableCell className={`py-1.5 pl-2 text-right tabular-nums whitespace-nowrap ${oddsHighlightClass(result, "draw")}`}>{fmtOdds(h.draw_spf)}</TableCell>
                              <TableCell className={`py-1.5 pl-2 text-right tabular-nums whitespace-nowrap ${oddsHighlightClass(result, "away")}`}>{fmtOdds(h.away_spf)}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {activeTab === "odds" && (
            <div className="space-y-2">
              {/* Instant odds comparison */}
              {!!odds?.length ? (
                <div className="rounded-lg border overflow-hidden">
                  <div className="px-2 py-1.5 text-sm font-bold text-muted-foreground/80 bg-muted/10 border-b">即时赔率对比</div>
                  <div className="px-2 py-1">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b text-muted-foreground/70 hover:bg-transparent">
                          <TableHead className="p-1.5 text-left font-normal whitespace-nowrap">公司</TableHead>
                          <TableHead className="p-1.5 text-right font-normal whitespace-nowrap">主胜</TableHead>
                          <TableHead className="p-1.5 text-right font-normal whitespace-nowrap">平局</TableHead>
                          <TableHead className="p-1.5 text-right font-normal whitespace-nowrap">客胜</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {odds.map((o: OddsItem) => (
                          <TableRow key={o.id} className="border-b border-dashed border-muted/20 hover:bg-muted/5">
                            <TableCell className="p-1.5 font-medium whitespace-nowrap">{o.bookmaker}</TableCell>
                            <TableCell className="p-1.5 text-right tabular-nums whitespace-nowrap">
                              <span className="font-semibold text-primary">{fmtOdds(o.current_home)}</span>
                              {o.initial_home != null && o.current_home != null && o.initial_home !== o.current_home && (
                                <span className="ml-1 text-[10px] text-muted-foreground">({fmtOdds(o.initial_home)})</span>
                              )}
                            </TableCell>
                            <TableCell className="p-1.5 text-right tabular-nums whitespace-nowrap">
                              <span className="font-semibold">{fmtOdds(o.current_draw)}</span>
                              {o.initial_draw != null && o.current_draw != null && o.initial_draw !== o.current_draw && (
                                <span className="ml-1 text-[10px] text-muted-foreground">({fmtOdds(o.initial_draw)})</span>
                              )}
                            </TableCell>
                            <TableCell className="p-1.5 text-right tabular-nums whitespace-nowrap">
                              <span className="font-semibold">{fmtOdds(o.current_away)}</span>
                              {o.initial_away != null && o.current_away != null && o.initial_away !== o.current_away && (
                                <span className="ml-1 text-[10px] text-muted-foreground">({fmtOdds(o.initial_away)})</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground/60">暂无赔率数据</p>
              )}

              {/* Sub-tab navigation */}
              <div className="flex border-b">
                {[
                  { key: "jingcai" as const, label: "竞彩赔率" },
                  { key: "yapan" as const, label: "亚盘" },
                  { key: "oupei" as const, label: "欧赔" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setOddsSubTab(key)}
                    className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                      oddsSubTab === key
                        ? "border-b-2 border-primary text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* 竞彩赔率 */}
              {oddsSubTab === "jingcai" && (
                <div className="rounded-lg border overflow-hidden">
                  <Section title="胜平负赔率变化">
                    <OddsHistoryTable data={jingcaiHistory?.history ?? []} />
                  </Section>
                  <Section title="让球胜平负赔率变化">
                    <OddsHistoryTable data={jingcaiRQSPF?.history ?? []} />
                  </Section>
                  <Section title="比分固定奖金">
                    <BfGrid data={jingcaiBF?.history ?? []} />
                  </Section>
                  <Section title="总进球固定奖金">
                    <ZjqTable data={jingcaiZJQ?.history ?? []} />
                  </Section>
                  <Section title="半全场胜平负固定奖金">
                    <BqcTable data={jingcaiBQC?.history ?? []} />
                  </Section>
                </div>
              )}

              {/* 亚盘 */}
              {oddsSubTab === "yapan" && (
                <div className="rounded-lg border overflow-hidden">
                  <div className="px-2 py-1.5 border-b bg-muted/10">
                    <span className="text-sm font-bold text-muted-foreground/80">亚盘赔率变化</span>
                    <div className="flex gap-1 mt-1">
                      {["澳门", "Bet365", "易胜博", "香港马会"].map((bk) => (
                        <button
                          key={bk}
                          onClick={() => setYapanBookmaker(bk)}
                          className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                            yapanBookmaker === bk
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {bk}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="px-2 py-1">
                    <OddsHistoryTable data={yapanHistory?.history ?? []} showDraw={false} />
                  </div>
                </div>
              )}

              {/* 欧赔 */}
              {oddsSubTab === "oupei" && (
                <div className="rounded-lg border overflow-hidden">
                  <div className="px-2 py-1.5 border-b bg-muted/10">
                    <span className="text-sm font-bold text-muted-foreground/80">欧赔赔率变化</span>
                    <div className="flex gap-1 mt-1">
                      {["威廉希尔", "Bet365", "易胜博", "香港马会"].map((bk) => (
                        <button
                          key={bk}
                          onClick={() => setoupeiBookmaker(bk)}
                          className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                            oupeiBookmaker === bk
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {bk}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="px-2 py-1">
                    <OddsHistoryTable data={oupelHistory?.history ?? []} />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "prediction" && (
            <>
              {prediction ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">预测分析</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { label: "主胜", value: prediction.home_prob, color: "bg-primary" },
                        { label: "平局", value: prediction.draw_prob, color: "bg-yellow-500" },
                        { label: "客胜", value: prediction.away_prob, color: "bg-blue-500" },
                      ].map(({ label, value, color }) => (
                        <div key={label}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span>{label}</span>
                            <span className="font-bold">{value}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.min(value, 100)}%` }} />
                          </div>
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground">
                        置信度: {prediction.confidence}% | 模型: {prediction.model_version}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <p className="text-sm text-muted-foreground/60">暂无预测数据</p>
              )}
            </>
          )}

          {activeTab === "chart" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">可视化分析</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/60">
                  <p className="text-sm">可视化分析功能开发中</p>
                  <p className="text-xs mt-1">后续将支持赔率走势图、球队数据对比图表等</p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "sentiment" && (
            <>
              {briefing && (
                <Card className="border-l-4 border-l-primary">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">赛前情报</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">{briefing.content}</p>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">舆情分析</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/60">
                    <p className="text-sm">舆情分析功能开发中</p>
                    <p className="text-xs mt-1">后续将支持新闻聚合、社交媒体舆论分析等</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  )
}
