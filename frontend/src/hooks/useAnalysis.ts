import { useQuery } from "@tanstack/react-query"
import { analysisApi } from "@/api/analysis"

export function usePrediction(matchId: number) {
  return useQuery({
    queryKey: ["prediction", matchId],
    queryFn: () => analysisApi.getPrediction(matchId),
    enabled: !!matchId,
  })
}

export function useH2H(team1Id: number, team2Id: number) {
  return useQuery({
    queryKey: ["h2h", team1Id, team2Id],
    queryFn: () => analysisApi.getH2H(team1Id, team2Id),
    enabled: !!team1Id && !!team2Id,
  })
}

export function useTeamForm(teamId: number) {
  return useQuery({
    queryKey: ["team-form", teamId],
    queryFn: () => analysisApi.getTeamForm(teamId),
    enabled: !!teamId,
  })
}

export function useBriefing(matchId: number) {
  return useQuery({
    queryKey: ["briefing", matchId],
    queryFn: () => analysisApi.getBriefing(matchId),
    enabled: !!matchId,
  })
}

export function useMatchComparison(matchId: number) {
  return useQuery({
    queryKey: ["match-comparison", matchId],
    queryFn: () => analysisApi.getComparison(matchId),
    enabled: !!matchId,
  })
}

export function useMatchInjuries(matchId: number) {
  return useQuery({
    queryKey: ["match-injuries", matchId],
    queryFn: () => analysisApi.getInjuries(matchId),
    enabled: !!matchId,
  })
}
