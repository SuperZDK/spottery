import { useState, useMemo, useCallback, useEffect } from "react"
import { useQueries } from "@tanstack/react-query"
import type { BetOption } from "@/types/odds"
import { useBetSlipStore } from "@/stores/betSlipStore"
import LoadingSpinner from "@/components/shared/LoadingSpinner"
import { ChevronLeft, ChevronRight, Calendar, Search } from "lucide-react"

type TabKey = "spf" | "rqspf" | "bf" | "zjq" | "bqc"

const tabs: { key: TabKey; label: string }[] = [
  { key: "spf", label: "胜平负" },
  { key: "rqspf", label: "让球胜平负" },
  { key: "bf", label: "比分" },
  { key: "zjq", label: "总进球" },
  { key: "bqc", label: "半全场" },
]

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]

function formatDateLabel(dateStr: string, isSelected: boolean): string {
  const d = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(d)
  target.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return `今天`
  if (diff === 1) return `明天`
  if (diff === -1) return `昨天`
  return `${WEEKDAYS[d.getDay()]}`
}

function addDays(dateStr: string, delta: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}

interface BettingMatch {
  match_id: number
  home_team: string
  away_team: string
  match_time: string
  league: string
  league_id: number
  status: string
  home_team_id: number
  away_team_id: number
  home_score: number | null
  away_score: number | null
  betting_code: string
  spf: { home: number; draw: number; away: number }
  rqspf: { handicap: string; home: number; draw: number; away: number }
  bf: BetOption[]
  zjq: BetOption[]
  bqc: BetOption[]
}

interface BettingResponse {
  date: string
  weekday: string
  matches: BettingMatch[]
}

function nearbyDates(center: string, count: number): string[] {
  const result: string[] = []
  const half = Math.floor(count / 2)
  for (let i = -half; i <= half; i++) {
    result.push(addDays(center, i))
  }
  return result
}

function todayString(): string {
  const d = new Date()
  const off = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - off).toISOString().slice(0, 10)
}

const BASE_DATE = todayString()

function fetchBetting(date: string) {
  return fetch(`/api/v1/matches/betting?date=${date}`).then<BettingResponse>((r) => r.json())
}

export default function TodayMatchList() {
  const [activeTab, setActiveTab] = useState<TabKey>("spf")
  const [selectedDate, setSelectedDate] = useState(BASE_DATE)
  const [dateInputValue, setDateInputValue] = useState(BASE_DATE)
  const addOption = useBetSlipStore((s) => s.addOption)

  useEffect(() => {
    setDateInputValue(selectedDate)
  }, [selectedDate])

  const prevDate = useMemo(() => addDays(selectedDate, -1), [selectedDate])
  const nextDate = useMemo(() => addDays(selectedDate, 1), [selectedDate])
  const datePills = useMemo(() => nearbyDates(selectedDate, 5), [selectedDate])

  const results = useQueries({
    queries: [
      { queryKey: ["betting-matches", prevDate], queryFn: () => fetchBetting(prevDate) },
      { queryKey: ["betting-matches", selectedDate], queryFn: () => fetchBetting(selectedDate) },
      { queryKey: ["betting-matches", nextDate], queryFn: () => fetchBetting(nextDate) },
    ],
  })

  const [prevResult, currentResult, nextResult] = results

  const prevEmpty = prevResult.data?.matches?.length === 0
  const nextEmpty = nextResult.data?.matches?.length === 0
  const matches = currentResult.data?.matches ?? []

  const handleDateChange = useCallback((newDate: string) => {
    if (newDate) {
      setSelectedDate(newDate)
      setDateInputValue(newDate)
    }
  }, [])

  const handleJumpDate = useCallback(() => {
    if (dateInputValue) {
      handleDateChange(dateInputValue)
    }
  }, [dateInputValue, handleDateChange])

  const handleDateInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleJumpDate()
    }
  }, [handleJumpDate])

  const handlePrev = useCallback(() => {
    if (!prevEmpty) setSelectedDate(prevDate)
  }, [prevEmpty, prevDate])

  const handleNext = useCallback(() => {
    if (!nextEmpty) setSelectedDate(nextDate)
  }, [nextEmpty, nextDate])

  const bettable = useMemo(
    () => matches.filter((m) => m.status === "SCHEDULED"),
    [matches]
  )
  const liveMatches = useMemo(
    () => matches.filter((m) => m.status === "LIVE"),
    [matches]
  )
  const finishedMatches = useMemo(
    () => matches.filter((m) => m.status === "FINISHED"),
    [matches]
  )

  if (currentResult.isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* ─── Date Picker ─── */}
      <div className="flex items-center gap-2">
        <button
          onClick={handlePrev}
          disabled={prevEmpty}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex flex-1 gap-2 overflow-x-auto pb-1">
          {datePills.map((date) => (
            <button
              key={date}
              onClick={() => handleDateChange(date)}
              className={`flex shrink-0 flex-col items-center rounded-xl px-4 py-1.5 text-sm font-medium transition-colors ${
                selectedDate === date
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              <span className="text-xs">{date.slice(5)}</span>
              <span>{formatDateLabel(date, selectedDate === date)}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={nextEmpty}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className="flex h-8 shrink-0 items-center gap-0 rounded-lg border bg-background text-xs text-muted-foreground">
          <div className="flex items-center gap-1 px-2">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <input
              type="date"
              value={dateInputValue}
              onChange={(e) => setDateInputValue(e.target.value)}
              onKeyDown={handleDateInputKeyDown}
              className="h-full w-[8.5rem] bg-transparent text-xs text-foreground outline-none [color-scheme:light]"
            />
          </div>
          <button
            onClick={handleJumpDate}
            className="flex h-full items-center gap-1 rounded-r-lg bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Search className="h-3 w-3" />
            跳转
          </button>
        </div>
      </div>

      {/* ─── Odds Tabs ─── */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === t.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── 可投注赛事 ─── */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <span className="inline-block h-3 w-1 rounded bg-green-500" />
          可投注赛事
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
            {bettable.length}场
          </span>
        </h3>
        {bettable.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">暂无待开始的赛事</p>
        ) : (
          <div className="space-y-3">
            {bettable.map((match) => (
              <TodayMatchRow
                key={match.match_id}
                match={match}
                activeTab={activeTab}
                canBet
                onAdd={(betType, option, odds) =>
                  addOption({
                    matchId: match.match_id,
                    matchLabel: `${match.betting_code} ${match.home_team} vs ${match.away_team}`,
                    betType,
                    option,
                    odds,
                  })
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* ─── 进行中 ─── */}
      {liveMatches.length > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-muted-foreground">
            <span className="inline-block h-3 w-1 rounded bg-red-500" />
            进行中
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">
              {liveMatches.length}场
            </span>
          </h3>
          <div className="space-y-3 opacity-60">
            {liveMatches.map((match) => (
              <TodayMatchRow
                key={match.match_id}
                match={match}
                activeTab={activeTab}
                canBet={false}
                onAdd={() => {}}
              />
            ))}
          </div>
        </section>
      )}

      {/* ─── 已结束 ─── */}
      {finishedMatches.length > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-muted-foreground">
            <span className="inline-block h-3 w-1 rounded bg-gray-400" />
            已结束
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              {finishedMatches.length}场
            </span>
          </h3>
          <div className="space-y-3 opacity-60">
            {finishedMatches.map((match) => (
              <TodayMatchRow
                key={match.match_id}
                match={match}
                activeTab={activeTab}
                canBet={false}
                onAdd={() => {}}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-red-600 px-2 py-0.5 text-xs text-white">
      <span className="h-1.5 w-1.5 rounded-full bg-white" />
      进行中
    </span>
  )
}

function TodayMatchRow({
  match,
  activeTab,
  canBet,
  onAdd,
}: {
  match: BettingMatch
  activeTab: TabKey
  canBet: boolean
  onAdd: (betType: string, option: string, odds: number) => void
}) {
  const renderOdds = (label: string, odds: number, betType: string) => (
    <button
      key={`${betType}_${label}`}
      onClick={() => canBet && onAdd(betType, label, odds)}
      disabled={!canBet}
      className={`flex min-w-[64px] flex-col items-center gap-0.5 rounded-md border bg-card px-3 py-1.5 text-center transition-colors ${
        canBet
          ? "cursor-pointer hover:border-primary hover:bg-primary/5"
          : "cursor-default opacity-50"
      }`}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-bold text-primary">{odds.toFixed(2)}</span>
    </button>
  )

  const statusBadge = () => {
    if (match.status === "LIVE") return <LiveBadge />
    if (match.status === "FINISHED") {
      return <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600">已结束</span>
    }
    return <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">未开始</span>
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
            {match.betting_code}
          </span>
          <span className="text-xs text-muted-foreground">{match.league}</span>
          {statusBadge()}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open(`/matches/${match.match_id}`, "_blank")}
            className="group inline-flex items-center gap-1 rounded-md border bg-background px-2.5 py-1 text-xs font-medium text-foreground shadow-sm transition-all hover:border-primary hover:bg-primary/5 hover:text-primary hover:shadow-md active:scale-95"
          >
            详情
            <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
          </button>
          <span className="text-xs text-muted-foreground">
            {new Date(match.match_time).toLocaleString("zh-CN", {
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-base font-semibold">{match.home_team}</span>
        <span className="mx-4 text-sm text-muted-foreground">VS</span>
        <span className="text-base font-semibold">{match.away_team}</span>
      </div>

      {/* Odds */}
      <div className="border-t px-4 py-3">
        {activeTab === "spf" && (
          <div className="flex justify-center gap-3">
            {renderOdds("主胜", match.spf.home, "胜平负")}
            {renderOdds("平局", match.spf.draw, "胜平负")}
            {renderOdds("客胜", match.spf.away, "胜平负")}
          </div>
        )}
        {activeTab === "rqspf" && (
          <div className="space-y-2">
            <div className="text-center text-xs text-muted-foreground">
              让球: <span className="font-bold">{match.rqspf.handicap}</span>
            </div>
            <div className="flex justify-center gap-3">
              {renderOdds("主胜", match.rqspf.home, "让球胜平负")}
              {renderOdds("平局", match.rqspf.draw, "让球胜平负")}
              {renderOdds("客胜", match.rqspf.away, "让球胜平负")}
            </div>
          </div>
        )}
        {activeTab === "bf" && (
          <div className="flex flex-wrap justify-center gap-2">
            {match.bf.map((o: BetOption) => renderOdds(o.label, o.odds, "比分"))}
          </div>
        )}
        {activeTab === "zjq" && (
          <div className="flex flex-wrap justify-center gap-2">
            {match.zjq.map((o: BetOption) => renderOdds(o.label, o.odds, "总进球"))}
          </div>
        )}
        {activeTab === "bqc" && (
          <div className="flex flex-wrap justify-center gap-2">
            {match.bqc.map((o: BetOption) => renderOdds(o.label, o.odds, "半全场"))}
          </div>
        )}
      </div>
    </div>
  )
}
