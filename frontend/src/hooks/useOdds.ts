import { useQuery } from "@tanstack/react-query"
import { oddsApi } from "@/api/odds"

export function useOdds(matchId: number) {
  return useQuery({
    queryKey: ["odds", matchId],
    queryFn: () => oddsApi.getByMatch(matchId),
    enabled: !!matchId,
  })
}

export function useOddsHistory(matchId: number, oddsType: string = "SPF", bookmaker?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["odds-history", matchId, oddsType, bookmaker],
    queryFn: () => oddsApi.getHistory(matchId, oddsType, bookmaker),
    enabled: !!matchId && enabled,
  })
}
