export type MatchStatus = "UPCOMING" | "LIVE" | "FINISHED" | string

export interface Match {
  id: number
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  half_score: string | null
  match_time: string
  status: MatchStatus
  league: string
  league_id: number | null
  home_team_id: number | null
  away_team_id: number | null
}

export interface MatchListParams {
  league?: string
  date?: string
  status?: MatchStatus
  page?: number
  page_size?: number
}

export interface StandingSnapshot {
  view: string
  team_name: string
  position: number | null
  points: number | null
  played: number | null
  wins: number | null
  draws: number | null
  losses: number | null
  goals_for: number | null
  goals_against: number | null
  goal_diff: number | null
}

export interface MatchStandings {
  home: StandingSnapshot[]
  away: StandingSnapshot[]
}

export interface MatchOdds {
  current: import("@/types/odds").OddsItem[]
  history: Record<string, import("@/types/odds").OddsHistoryPoint[]>
}

export interface MatchDetail {
  match: Match
  standings: MatchStandings
  comparison: import("@/types/team").MatchComparison
  form: { home: import("@/types/analysis").TeamForm; away: import("@/types/analysis").TeamForm }
  h2h: import("@/types/analysis").H2HRecord[]
  injuries: import("@/types/team").MatchInjuries
  odds: MatchOdds
  prediction: import("@/types/analysis").Prediction | null
  briefing: import("@/types/analysis").Briefing | null
  sentiment: null
}
