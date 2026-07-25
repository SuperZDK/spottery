export enum MatchStatus {
  SCHEDULED = "SCHEDULED",
  LIVE = "LIVE",
  FINISHED = "FINISHED",
  POSTPONED = "POSTPONED",
  CANCELLED = "CANCELLED",
}

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
