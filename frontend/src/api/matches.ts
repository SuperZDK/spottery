import client from "./client"
import type { Match, MatchListParams, MatchDetail } from "@/types/match"

export const matchesApi = {
  list: (params?: MatchListParams) =>
    client.get<Match[]>("/matches", { params }).then((r) => r.data),

  getById: (id: number) =>
    client.get<MatchDetail>(`/matches/${id}`).then((r) => r.data),
}
