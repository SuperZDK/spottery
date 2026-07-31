import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import type { Match } from "@/types/match"
import type { MatchComparison, MatchInjuries } from "@/types/team"
import type { TeamForm, H2HRecord } from "@/types/analysis"
import type { StatRow } from "@/types/team"
import { fmtOdds, matchResult, oddsHighlightClass, h2hResultColor, FormBadge } from "./shared"

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

function TeamFormCard({ teamName, results }: { teamName: string; results: any[] }) {
  if (!results.length) return null
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{teamName} 近期战绩</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex gap-1.5">
          {results.map((r) => <FormBadge key={r.match_id} result={r.result} />)}
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
            {results.map((r) => {
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
  )
}

export default function BasicTab({
  match, comparison, form, h2h, injuries,
}: {
  match: Match
  comparison: MatchComparison | null
  form: { home: TeamForm; away: TeamForm } | null
  h2h: H2HRecord[]
  injuries: MatchInjuries | null
}) {
  const sortedHomeForm = [...(form?.home.results ?? [])]
    .sort((a, b) => new Date(b.match_time).getTime() - new Date(a.match_time).getTime())
    .slice(0, 6)
  const sortedAwayForm = [...(form?.away.results ?? [])]
    .sort((a, b) => new Date(b.match_time).getTime() - new Date(a.match_time).getTime())
    .slice(0, 6)
  const sortedH2H = [...(h2h ?? [])]
    .sort((a, b) => new Date(b.match_time).getTime() - new Date(a.match_time).getTime())
    .slice(0, 6)

  return (
    <div className="space-y-6">
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
            <TeamFormCard teamName={form!.home.team_name} results={sortedHomeForm} />
          )}
          {sortedAwayForm.length > 0 && (
            <TeamFormCard teamName={form!.away.team_name} results={sortedAwayForm} />
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
    </div>
  )
}
