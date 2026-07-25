import type { Plugin, ViteDevServer } from "vite"

const MOCK_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZXhwIjo0ODUxMzkwNDAwfQ.mock"
const VIP_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwiZXhwIjo0ODUxMzkwNDAwfQ.mock"

function isAuthed(req: any): { authed: boolean; isVip: boolean } {
  const auth = req.headers?.authorization ?? ""
  if (auth === `Bearer ${VIP_TOKEN}`) return { authed: true, isVip: true }
  if (auth === `Bearer ${MOCK_TOKEN}`) return { authed: true, isVip: false }
  return { authed: false, isVip: false }
}

// ─── Weekday helper ────────────────────────────────────────────
const WEEKDAYS_CN = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]

function getWeekday(dateStr: string): string {
  return WEEKDAYS_CN[new Date(dateStr).getDay()]
}

// ─── Betting matches by date ───────────────────────────────────
// Each date has matches that are available for betting on that date.
// A betting date may include matches from multiple actual match dates.
const bettingMatchesByDate: Record<string, any[]> = {
  "2026-07-21": [
    // Monday betting: includes Mon + Tue matches
    { match_id: 1, home_team: "上海海港", away_team: "山东泰山", match_time: "2026-07-21T19:35:00+08:00", league: "中超", league_id: 1, status: "SCHEDULED", home_team_id: 1, away_team_id: 2, home_score: null, away_score: null, half_score: null, spf: { home: 1.85, draw: 3.40, away: 3.60 }, rqspf: { handicap: "-1", home: 2.20, draw: 3.30, away: 2.80 }, bf: [{ label: "1:0", odds: 6.50 }, { label: "2:0", odds: 7.00 }, { label: "2:1", odds: 7.50 }, { label: "3:0", odds: 12.00 }, { label: "0:0", odds: 8.00 }, { label: "1:1", odds: 6.80 }, { label: "0:1", odds: 8.50 }, { label: "1:2", odds: 9.00 }], zjq: [{ label: "0球", odds: 12.00 }, { label: "1球", odds: 5.00 }, { label: "2球", odds: 3.50 }, { label: "3球", odds: 3.80 }, { label: "4球", odds: 5.50 }, { label: "5球", odds: 9.00 }, { label: "6球", odds: 18.00 }, { label: "7+球", odds: 25.00 }], bqc: [{ label: "胜-胜", odds: 3.50 }, { label: "胜-平", odds: 14.00 }, { label: "胜-负", odds: 30.00 }, { label: "平-胜", odds: 5.00 }, { label: "平-平", odds: 5.50 }, { label: "平-负", odds: 8.00 }, { label: "负-胜", odds: 25.00 }, { label: "负-平", odds: 12.00 }, { label: "负-负", odds: 6.00 }] },
    { match_id: 2, home_team: "广州队", away_team: "北京国安", match_time: "2026-07-21T19:35:00+08:00", league: "中超", league_id: 1, status: "SCHEDULED", home_team_id: 3, away_team_id: 4, home_score: null, away_score: null, half_score: null, spf: { home: 2.50, draw: 3.10, away: 2.70 }, rqspf: { handicap: "0", home: 1.90, draw: 3.25, away: 3.55 }, bf: [{ label: "1:0", odds: 7.00 }, { label: "2:0", odds: 9.00 }, { label: "2:1", odds: 8.00 }, { label: "0:0", odds: 7.50 }, { label: "1:1", odds: 6.00 }, { label: "0:1", odds: 7.50 }], zjq: [{ label: "0球", odds: 10.00 }, { label: "1球", odds: 4.50 }, { label: "2球", odds: 3.30 }, { label: "3球", odds: 3.80 }, { label: "4球", odds: 6.00 }, { label: "5球", odds: 12.00 }, { label: "6球", odds: 20.00 }, { label: "7+球", odds: 30.00 }], bqc: [{ label: "胜-胜", odds: 4.50 }, { label: "胜-平", odds: 15.00 }, { label: "胜-负", odds: 30.00 }, { label: "平-胜", odds: 5.50 }, { label: "平-平", odds: 5.00 }, { label: "平-负", odds: 7.00 }, { label: "负-胜", odds: 28.00 }, { label: "负-平", odds: 14.00 }, { label: "负-负", odds: 5.00 }] },
    { match_id: 3, home_team: "曼城", away_team: "阿森纳", match_time: "2026-07-22T03:00:00+08:00", league: "英超", league_id: 2, status: "SCHEDULED", home_team_id: 5, away_team_id: 6, home_score: null, away_score: null, half_score: null, spf: { home: 1.50, draw: 4.00, away: 5.50 }, rqspf: { handicap: "-1", home: 2.60, draw: 3.40, away: 2.30 }, bf: [{ label: "1:0", odds: 6.00 }, { label: "2:0", odds: 6.50 }, { label: "2:1", odds: 7.50 }, { label: "3:0", odds: 9.00 }, { label: "0:0", odds: 10.00 }, { label: "1:1", odds: 7.50 }, { label: "0:1", odds: 13.00 }], zjq: [{ label: "0球", odds: 14.00 }, { label: "1球", odds: 5.50 }, { label: "2球", odds: 3.50 }, { label: "3球", odds: 3.60 }, { label: "4球", odds: 5.00 }, { label: "5球", odds: 8.00 }, { label: "6球", odds: 18.00 }, { label: "7+球", odds: 25.00 }], bqc: [{ label: "胜-胜", odds: 2.50 }, { label: "胜-平", odds: 15.00 }, { label: "胜-负", odds: 35.00 }, { label: "平-胜", odds: 4.50 }, { label: "平-平", odds: 7.00 }, { label: "平-负", odds: 18.00 }, { label: "负-胜", odds: 30.00 }, { label: "负-平", odds: 20.00 }, { label: "负-负", odds: 12.00 }] },
    { match_id: 4, home_team: "皇家马德里", away_team: "巴塞罗那", match_time: "2026-07-22T03:00:00+08:00", league: "西甲", league_id: 3, status: "SCHEDULED", home_team_id: 7, away_team_id: 8, home_score: null, away_score: null, half_score: null, spf: { home: 2.10, draw: 3.20, away: 3.10 }, rqspf: { handicap: "0", home: 1.85, draw: 3.30, away: 3.60 }, bf: [{ label: "1:0", odds: 7.00 }, { label: "2:0", odds: 9.00 }, { label: "2:1", odds: 8.00 }, { label: "0:0", odds: 8.00 }, { label: "1:1", odds: 6.50 }, { label: "0:1", odds: 7.50 }], zjq: [{ label: "0球", odds: 11.00 }, { label: "1球", odds: 4.50 }, { label: "2球", odds: 3.50 }, { label: "3球", odds: 3.80 }, { label: "4球", odds: 5.50 }, { label: "5球", odds: 10.00 }, { label: "6球", odds: 18.00 }, { label: "7+球", odds: 25.00 }], bqc: [{ label: "胜-胜", odds: 4.00 }, { label: "胜-平", odds: 14.00 }, { label: "胜-负", odds: 30.00 }, { label: "平-胜", odds: 5.50 }, { label: "平-平", odds: 5.00 }, { label: "平-负", odds: 7.50 }, { label: "负-胜", odds: 28.00 }, { label: "负-平", odds: 13.00 }, { label: "负-负", odds: 5.50 }] },
  ],
  "2026-07-22": [
    { match_id: 5, home_team: "拜仁慕尼黑", away_team: "多特蒙德", match_time: "2026-07-22T21:30:00+08:00", league: "德甲", league_id: 4, status: "SCHEDULED", home_team_id: 9, away_team_id: 10, home_score: null, away_score: null, half_score: null, spf: { home: 1.60, draw: 3.80, away: 4.50 }, rqspf: { handicap: "-1", home: 2.80, draw: 3.40, away: 2.20 }, bf: [{ label: "1:0", odds: 6.00 }, { label: "2:0", odds: 6.50 }, { label: "2:1", odds: 7.50 }, { label: "3:0", odds: 9.00 }, { label: "0:0", odds: 10.00 }, { label: "1:1", odds: 7.00 }, { label: "0:1", odds: 12.00 }], zjq: [{ label: "0球", odds: 13.00 }, { label: "1球", odds: 5.00 }, { label: "2球", odds: 3.50 }, { label: "3球", odds: 3.60 }, { label: "4球", odds: 5.00 }, { label: "5球", odds: 8.50 }, { label: "6球", odds: 18.00 }, { label: "7+球", odds: 25.00 }], bqc: [{ label: "胜-胜", odds: 2.80 }, { label: "胜-平", odds: 15.00 }, { label: "胜-负", odds: 35.00 }, { label: "平-胜", odds: 4.50 }, { label: "平-平", odds: 7.00 }, { label: "平-负", odds: 18.00 }, { label: "负-胜", odds: 30.00 }, { label: "负-平", odds: 20.00 }, { label: "负-负", odds: 12.00 }] },
    { match_id: 6, home_team: "巴黎圣日耳曼", away_team: "马赛", match_time: "2026-07-22T03:00:00+08:00", league: "法甲", league_id: 5, status: "SCHEDULED", home_team_id: 11, away_team_id: 12, home_score: null, away_score: null, half_score: null, spf: { home: 1.40, draw: 4.20, away: 6.50 }, rqspf: { handicap: "-1.5", home: 2.00, draw: 3.50, away: 3.10 }, bf: [{ label: "1:0", odds: 5.50 }, { label: "2:0", odds: 5.00 }, { label: "2:1", odds: 7.00 }, { label: "3:0", odds: 6.50 }, { label: "0:0", odds: 12.00 }, { label: "1:1", odds: 8.00 }], zjq: [{ label: "0球", odds: 15.00 }, { label: "1球", odds: 5.00 }, { label: "2球", odds: 3.20 }, { label: "3球", odds: 3.50 }, { label: "4球", odds: 4.50 }, { label: "5球", odds: 7.00 }, { label: "6球", odds: 15.00 }, { label: "7+球", odds: 22.00 }], bqc: [{ label: "胜-胜", odds: 2.20 }, { label: "胜-平", odds: 14.00 }, { label: "胜-负", odds: 40.00 }, { label: "平-胜", odds: 4.00 }, { label: "平-平", odds: 6.50 }, { label: "平-负", odds: 20.00 }, { label: "负-胜", odds: 35.00 }, { label: "负-平", odds: 22.00 }, { label: "负-负", odds: 10.00 }] },
    { match_id: 7, home_team: "AC米兰", away_team: "国际米兰", match_time: "2026-07-23T02:45:00+08:00", league: "意甲", league_id: 6, status: "SCHEDULED", home_team_id: 13, away_team_id: 14, home_score: null, away_score: null, half_score: null, spf: { home: 2.60, draw: 3.10, away: 2.65 }, rqspf: { handicap: "0", home: 1.88, draw: 3.25, away: 3.50 }, bf: [{ label: "1:0", odds: 7.50 }, { label: "2:0", odds: 10.00 }, { label: "2:1", odds: 8.50 }, { label: "0:0", odds: 7.00 }, { label: "1:1", odds: 6.00 }, { label: "0:1", odds: 7.50 }], zjq: [{ label: "0球", odds: 10.00 }, { label: "1球", odds: 4.50 }, { label: "2球", odds: 3.30 }, { label: "3球", odds: 3.80 }, { label: "4球", odds: 6.00 }, { label: "5球", odds: 12.00 }, { label: "6球", odds: 22.00 }, { label: "7+球", odds: 30.00 }], bqc: [{ label: "胜-胜", odds: 4.50 }, { label: "胜-平", odds: 15.00 }, { label: "胜-负", odds: 30.00 }, { label: "平-胜", odds: 5.50 }, { label: "平-平", odds: 5.00 }, { label: "平-负", odds: 7.00 }, { label: "负-胜", odds: 28.00 }, { label: "负-平", odds: 14.00 }, { label: "负-负", odds: 5.00 }] },
  ],
  "2026-07-20": [
    { match_id: 101, home_team: "利物浦", away_team: "切尔西", match_time: "2026-07-20T20:30:00+08:00", league: "英超", league_id: 2, status: "FINISHED", home_team_id: 15, away_team_id: 16, home_score: 1, away_score: 1, half_score: "0:0", spf: { home: 1.95, draw: 3.30, away: 3.40 }, rqspf: { handicap: "-0.5", home: 2.00, draw: 3.30, away: 3.20 }, bf: [{ label: "1:0", odds: 6.50 }, { label: "2:0", odds: 8.00 }, { label: "2:1", odds: 7.50 }, { label: "0:0", odds: 8.50 }, { label: "1:1", odds: 6.50 }, { label: "0:1", odds: 8.00 }], zjq: [{ label: "0球", odds: 11.00 }, { label: "1球", odds: 4.80 }, { label: "2球", odds: 3.40 }, { label: "3球", odds: 3.60 }, { label: "4球", odds: 5.50 }, { label: "5球", odds: 10.00 }, { label: "6球", odds: 20.00 }, { label: "7+球", odds: 28.00 }], bqc: [{ label: "胜-胜", odds: 3.20 }, { label: "胜-平", odds: 14.00 }, { label: "胜-负", odds: 30.00 }, { label: "平-胜", odds: 5.00 }, { label: "平-平", odds: 5.50 }, { label: "平-负", odds: 8.00 }, { label: "负-胜", odds: 28.00 }, { label: "负-平", odds: 15.00 }, { label: "负-负", odds: 5.50 }] },
    { match_id: 102, home_team: "皇家马德里", away_team: "巴塞罗那", match_time: "2026-07-20T03:00:00+08:00", league: "西甲", league_id: 3, status: "FINISHED", home_team_id: 7, away_team_id: 8, home_score: 2, away_score: 1, half_score: "1:0", spf: { home: 2.10, draw: 3.20, away: 3.10 }, rqspf: { handicap: "0", home: 1.85, draw: 3.30, away: 3.60 }, bf: [{ label: "1:0", odds: 7.00 }, { label: "2:0", odds: 9.00 }, { label: "2:1", odds: 8.00 }, { label: "0:0", odds: 8.00 }, { label: "1:1", odds: 6.50 }, { label: "0:1", odds: 7.50 }], zjq: [{ label: "0球", odds: 11.00 }, { label: "1球", odds: 4.50 }, { label: "2球", odds: 3.50 }, { label: "3球", odds: 3.80 }, { label: "4球", odds: 5.50 }, { label: "5球", odds: 10.00 }, { label: "6球", odds: 18.00 }, { label: "7+球", odds: 25.00 }], bqc: [{ label: "胜-胜", odds: 4.00 }, { label: "胜-平", odds: 14.00 }, { label: "胜-负", odds: 30.00 }, { label: "平-胜", odds: 5.50 }, { label: "平-平", odds: 5.00 }, { label: "平-负", odds: 7.50 }, { label: "负-胜", odds: 28.00 }, { label: "负-平", odds: 13.00 }, { label: "负-负", odds: 5.50 }] },
    { match_id: 103, home_team: "AC米兰", away_team: "国际米兰", match_time: "2026-07-20T02:45:00+08:00", league: "意甲", league_id: 6, status: "FINISHED", home_team_id: 13, away_team_id: 14, home_score: 1, away_score: 1, half_score: "0:0", spf: { home: 2.60, draw: 3.10, away: 2.65 }, rqspf: { handicap: "0", home: 1.88, draw: 3.25, away: 3.50 }, bf: [{ label: "1:0", odds: 7.50 }, { label: "2:0", odds: 10.00 }, { label: "2:1", odds: 8.50 }, { label: "0:0", odds: 7.00 }, { label: "1:1", odds: 6.00 }, { label: "0:1", odds: 7.50 }], zjq: [{ label: "0球", odds: 10.00 }, { label: "1球", odds: 4.50 }, { label: "2球", odds: 3.30 }, { label: "3球", odds: 3.80 }, { label: "4球", odds: 6.00 }, { label: "5球", odds: 12.00 }, { label: "6球", odds: 22.00 }, { label: "7+球", odds: 30.00 }], bqc: [{ label: "胜-胜", odds: 4.50 }, { label: "胜-平", odds: 15.00 }, { label: "胜-负", odds: 30.00 }, { label: "平-胜", odds: 5.50 }, { label: "平-平", odds: 5.00 }, { label: "平-负", odds: 7.00 }, { label: "负-胜", odds: 28.00 }, { label: "负-平", odds: 14.00 }, { label: "负-负", odds: 5.00 }] },
  ],
  "2026-07-23": [
    { match_id: 104, home_team: "上海海港", away_team: "广州队", match_time: "2026-07-23T19:35:00+08:00", league: "中超", league_id: 1, status: "SCHEDULED", home_team_id: 1, away_team_id: 3, home_score: null, away_score: null, half_score: null, spf: { home: 1.70, draw: 3.50, away: 4.20 }, rqspf: { handicap: "-1", home: 2.30, draw: 3.20, away: 2.70 }, bf: [{ label: "1:0", odds: 6.00 }, { label: "2:0", odds: 6.50 }, { label: "2:1", odds: 7.00 }, { label: "0:0", odds: 9.00 }, { label: "1:1", odds: 6.50 }], zjq: [{ label: "0球", odds: 13.00 }, { label: "1球", odds: 5.00 }, { label: "2球", odds: 3.40 }, { label: "3球", odds: 3.70 }, { label: "4球", odds: 5.00 }, { label: "5球", odds: 8.00 }, { label: "6球", odds: 16.00 }, { label: "7+球", odds: 24.00 }], bqc: [{ label: "胜-胜", odds: 3.00 }, { label: "胜-平", odds: 13.00 }, { label: "胜-负", odds: 28.00 }, { label: "平-胜", odds: 5.50 }, { label: "平-平", odds: 5.50 }, { label: "平-负", odds: 9.00 }, { label: "负-胜", odds: 22.00 }, { label: "负-平", odds: 13.00 }, { label: "负-负", odds: 7.00 }] },
    { match_id: 105, home_team: "山东泰山", away_team: "北京国安", match_time: "2026-07-23T19:35:00+08:00", league: "中超", league_id: 1, status: "SCHEDULED", home_team_id: 2, away_team_id: 4, home_score: null, away_score: null, half_score: null, spf: { home: 2.20, draw: 3.20, away: 2.90 }, rqspf: { handicap: "0", home: 1.85, draw: 3.30, away: 3.65 }, bf: [{ label: "1:0", odds: 7.00 }, { label: "2:0", odds: 8.00 }, { label: "2:1", odds: 7.50 }, { label: "0:0", odds: 8.00 }, { label: "1:1", odds: 6.00 }, { label: "0:1", odds: 8.00 }], zjq: [{ label: "0球", odds: 11.00 }, { label: "1球", odds: 4.50 }, { label: "2球", odds: 3.30 }, { label: "3球", odds: 3.80 }, { label: "4球", odds: 5.50 }, { label: "5球", odds: 10.00 }, { label: "6球", odds: 18.00 }, { label: "7+球", odds: 26.00 }], bqc: [{ label: "胜-胜", odds: 3.80 }, { label: "胜-平", odds: 14.00 }, { label: "胜-负", odds: 28.00 }, { label: "平-胜", odds: 5.00 }, { label: "平-平", odds: 5.00 }, { label: "平-负", odds: 7.50 }, { label: "负-胜", odds: 25.00 }, { label: "负-平", odds: 13.00 }, { label: "负-负", odds: 5.50 }] },
  ],
}

// ─── Generator helpers for complete BF / ZJQ / BQC data ─────────
function generateBF(spf: { home: number; draw: number; away: number }) {
  const lowBase = (min: number, max: number) => +(min + Math.random() * max).toFixed(2)
  const homeW = spf.home
  const drawW = spf.draw
  const awayW = spf.away
  return [
    // home wins
    { label: "1:0", odds: homeW < 1.8 ? lowBase(4.5, 3) : homeW < 2.5 ? lowBase(5.5, 4) : lowBase(6.5, 5) },
    { label: "2:0", odds: homeW < 1.8 ? lowBase(5.0, 4) : homeW < 2.5 ? lowBase(6.5, 5) : lowBase(8.0, 6) },
    { label: "2:1", odds: lowBase(6.0, 3) },
    { label: "3:0", odds: homeW < 1.8 ? lowBase(7.0, 5) : lowBase(9.0, 7) },
    { label: "3:1", odds: lowBase(8.0, 5) },
    { label: "3:2", odds: lowBase(12.0, 8) },
    { label: "4:0", odds: homeW < 1.8 ? lowBase(12.0, 8) : lowBase(15.0, 10) },
    { label: "4:1", odds: lowBase(14.0, 10) },
    { label: "4:2", odds: lowBase(18.0, 12) },
    { label: "5:0", odds: homeW < 1.8 ? lowBase(20.0, 15) : lowBase(25.0, 20) },
    { label: "5:1", odds: lowBase(22.0, 18) },
    { label: "5:2", odds: lowBase(28.0, 22) },
    { label: "胜其它", odds: lowBase(8.0, 10) },
    // draws
    { label: "0:0", odds: drawW < 3.2 ? lowBase(7.0, 4) : lowBase(8.0, 6) },
    { label: "1:1", odds: drawW < 3.2 ? lowBase(5.5, 3) : lowBase(6.0, 4) },
    { label: "2:2", odds: lowBase(12.0, 8) },
    { label: "3:3", odds: lowBase(35.0, 25) },
    { label: "平其它", odds: lowBase(20.0, 15) },
    // away wins
    { label: "0:1", odds: awayW < 3.0 ? lowBase(5.5, 4) : awayW < 5.0 ? lowBase(6.5, 5) : lowBase(7.5, 6) },
    { label: "0:2", odds: awayW < 3.0 ? lowBase(6.5, 5) : awayW < 5.0 ? lowBase(8.0, 6) : lowBase(9.0, 7) },
    { label: "1:2", odds: lowBase(7.0, 5) },
    { label: "0:3", odds: awayW < 3.0 ? lowBase(10.0, 8) : lowBase(12.0, 10) },
    { label: "1:3", odds: lowBase(10.0, 8) },
    { label: "2:3", odds: lowBase(15.0, 12) },
    { label: "0:4", odds: awayW < 3.0 ? lowBase(16.0, 12) : lowBase(20.0, 15) },
    { label: "1:4", odds: lowBase(18.0, 14) },
    { label: "2:4", odds: lowBase(25.0, 20) },
    { label: "0:5", odds: awayW < 3.0 ? lowBase(28.0, 22) : lowBase(35.0, 25) },
    { label: "1:5", odds: lowBase(30.0, 25) },
    { label: "2:5", odds: lowBase(40.0, 30) },
    { label: "负其它", odds: lowBase(10.0, 12) },
  ]
}

function generateZJQ() {
  return [
    { label: "0球", odds: +(8 + Math.random() * 15).toFixed(2) },
    { label: "1球", odds: +(3.5 + Math.random() * 4).toFixed(2) },
    { label: "2球", odds: +(3 + Math.random() * 2).toFixed(2) },
    { label: "3球", odds: +(3 + Math.random() * 2.5).toFixed(2) },
    { label: "4球", odds: +(4.5 + Math.random() * 4).toFixed(2) },
    { label: "5球", odds: +(7 + Math.random() * 8).toFixed(2) },
    { label: "6球", odds: +(14 + Math.random() * 12).toFixed(2) },
    { label: "7+球", odds: +(18 + Math.random() * 20).toFixed(2) },
  ]
}

function generateBQC(spf: { home: number; draw: number; away: number }) {
  const homeStrength = spf.home < 2.0 ? 2.5 : spf.home < 3.0 ? 3.5 : 5.0
  const awayStrength = spf.away < 3.0 ? 5.0 : spf.away < 5.0 ? 7.0 : 9.0
  const drawStrength = spf.draw
  return [
    { label: "胜-胜", odds: +(homeStrength + Math.random() * 2).toFixed(2) },
    { label: "胜-平", odds: +(12 + Math.random() * 6).toFixed(2) },
    { label: "胜-负", odds: +(28 + Math.random() * 20).toFixed(2) },
    { label: "平-胜", odds: +(drawStrength < 3.2 ? 4.0 : 5.0 + Math.random() * 3).toFixed(2) },
    { label: "平-平", odds: +(drawStrength < 3.2 ? 4.5 : 5.5 + Math.random() * 3).toFixed(2) },
    { label: "平-负", odds: +(drawStrength < 3.2 ? 7.0 : 8.0 + Math.random() * 5).toFixed(2) },
    { label: "负-胜", odds: +(22 + Math.random() * 20).toFixed(2) },
    { label: "负-平", odds: +(awayStrength < 7.0 ? 10.0 : 14.0 + Math.random() * 10).toFixed(2) },
    { label: "负-负", odds: +(awayStrength < 7.0 ? 5.0 : 7.0 + Math.random() * 5).toFixed(2) },
  ]
}

// ─── Patch every match with complete BF / ZJQ / BQC data ──────
for (const dateMatches of Object.values(bettingMatchesByDate)) {
  for (const m of dateMatches) {
    m.bf = generateBF(m.spf)
    m.zjq = generateZJQ()
    m.bqc = generateBQC(m.spf)
  }
}

// ─── All matches (flat for detail/odds lookup) ─────────────────
const allMatches: Record<number, any> = {}
for (const dateMatches of Object.values(bettingMatchesByDate)) {
  for (const m of dateMatches) {
    allMatches[m.match_id] = { ...m, id: m.match_id }
  }
}

function matchToResponse(m: any) {
  return { ...m, id: m.match_id }
}

// ─── Teams ─────────────────────────────────────────────────────
// Original teams (IDs 1-16) keep their historical IDs for match data compatibility
const originalTeamDefs: Array<{ id: number; name: string; league_id: number }> = [
  { id: 1, name: "上海海港", league_id: 1 },
  { id: 2, name: "山东泰山", league_id: 1 },
  { id: 3, name: "广州队", league_id: 1 },
  { id: 4, name: "北京国安", league_id: 1 },
  { id: 5, name: "曼城", league_id: 2 },
  { id: 6, name: "阿森纳", league_id: 2 },
  { id: 7, name: "皇家马德里", league_id: 3 },
  { id: 8, name: "巴塞罗那", league_id: 3 },
  { id: 9, name: "拜仁慕尼黑", league_id: 4 },
  { id: 10, name: "多特蒙德", league_id: 4 },
  { id: 11, name: "巴黎圣日耳曼", league_id: 5 },
  { id: 12, name: "马赛", league_id: 5 },
  { id: 13, name: "AC米兰", league_id: 6 },
  { id: 14, name: "国际米兰", league_id: 6 },
  { id: 15, name: "利物浦", league_id: 2 },
  { id: 16, name: "切尔西", league_id: 2 },
]

const additionalTeamNames: Record<number, string[]> = {
  1: ["成都蓉城", "武汉三镇", "浙江队", "天津津门虎", "河南队", "长春亚泰"],
  2: ["曼联", "热刺", "阿斯顿维拉", "纽卡斯尔", "布莱顿", "西汉姆联", "水晶宫", "布伦特福德", "富勒姆", "伯恩茅斯", "狼队", "诺丁汉森林", "埃弗顿", "莱斯特城", "南安普顿", "伊普斯维奇"],
  3: ["马德里竞技", "塞维利亚", "皇家社会", "毕尔巴鄂竞技", "比利亚雷亚尔", "贝蒂斯", "瓦伦西亚", "赫罗纳"],
  4: ["莱比锡红牛", "勒沃库森", "法兰克福", "斯图加特", "沃尔夫斯堡", "门兴格拉德巴赫", "柏林联合", "弗赖堡"],
  5: ["摩纳哥", "里昂", "里尔", "尼斯", "朗斯", "雷恩", "斯特拉斯堡", "图卢兹"],
  6: ["尤文图斯", "那不勒斯", "罗马", "亚特兰大", "拉齐奥", "佛罗伦萨", "博洛尼亚", "都灵"],
}

const teams: Array<{ id: number; name: string; short_name: string; league_id: number; country: string }> = []
let nextNewId = 17
for (const def of originalTeamDefs) {
  teams.push({ id: def.id, name: def.name, short_name: def.name.slice(0, 4), logo_url: null, league_id: def.league_id, country: "" })
}
for (const [lid, names] of Object.entries(additionalTeamNames)) {
  for (const name of names) {
    teams.push({ id: nextNewId++, name, short_name: name.slice(0, 4), logo_url: null, league_id: Number(lid), country: "" })
  }
}

const leagues = [
  { id: 1, name: "中超", country: "中国", season: "2026", logo_url: null },
  { id: 2, name: "英超", country: "英格兰", season: "2026/27", logo_url: null },
  { id: 3, name: "西甲", country: "西班牙", season: "2026/27", logo_url: null },
  { id: 4, name: "德甲", country: "德国", season: "2026/27", logo_url: null },
  { id: 5, name: "法甲", country: "法国", season: "2026/27", logo_url: null },
  { id: 6, name: "意甲", country: "意大利", season: "2026/27", logo_url: null },
]

// ─── Standings ─────────────────────────────────────────────────
const leagueSizes: Record<number, number> = { 1: 30, 2: 38, 3: 38, 4: 34, 5: 34, 6: 38 }

function splitHomeAway(total: number, rate: number): number {
  return Math.round(total * rate)
}

const standingsData: Record<number, any[]> = {}
const leagueTeamsById: Record<number, number[]> = {}
for (const t of teams) {
  if (!leagueTeamsById[t.league_id]) leagueTeamsById[t.league_id] = []
  leagueTeamsById[t.league_id].push(t.id)
}

for (const [lid, tids] of Object.entries(leagueTeamsById)) {
  const lidNum = Number(lid)
  const totalGames = leagueSizes[lidNum] ?? 34
  const homeGames = Math.round(totalGames / 2)
  const awayGames = totalGames - homeGames
  const entries = tids.map((tid, idx) => {
    const seed = tid * 7 + 3
    const winPct = 0.55 - (idx / tids.length) * 0.55 + (seed % 7) * 0.008
    const drawPct = 0.15 + (seed % 5) * 0.005
    const wins = Math.round(totalGames * Math.max(0.05, Math.min(0.65, winPct)))
    const draws = Math.round(totalGames * Math.max(0.08, Math.min(0.25, drawPct)))
    const losses = totalGames - wins - draws
    const gf = Math.round(wins * 1.8 + draws * 0.8 + (seed % 11))
    const ga = Math.round(losses * 1.6 + draws * 0.9 + (seed % 7))
    const teamName = teams.find((t) => t.id === tid)?.name ?? ""
    const homeWins = splitHomeAway(wins, 0.55 + (seed % 5) * 0.02)
    const homeDraws = splitHomeAway(draws, 0.5 + (seed % 3) * 0.02)
    const homeLosses = homeGames - homeWins - homeDraws
    const awayWins = wins - homeWins
    const awayDraws = draws - homeDraws
    const awayLosses = awayGames - awayWins - awayDraws
    const homeGf = Math.round(homeWins * 1.9 + homeDraws * 0.9 + (seed % 5))
    const homeGa = Math.round(homeLosses * 1.4 + homeDraws * 0.8 + (seed % 3))
    const awayGf = gf - homeGf
    const awayGa = ga - homeGa
    return {
      position: 0,
      team_id: tid,
      team_name: teamName,
      played: totalGames,
      wins, draws, losses,
      goals_for: Math.max(10, gf),
      goals_against: Math.max(8, ga),
      goal_diff: gf - ga,
      points: wins * 3 + draws,
      home_played: homeGames,
      home_wins: Math.max(0, homeWins),
      home_draws: Math.max(0, homeDraws),
      home_losses: Math.max(0, homeLosses),
      home_goals_for: Math.max(3, homeGf),
      home_goals_against: Math.max(3, homeGa),
      away_played: awayGames,
      away_wins: Math.max(0, awayWins),
      away_draws: Math.max(0, awayDraws),
      away_losses: Math.max(0, awayLosses),
      away_goals_for: Math.max(3, awayGf),
      away_goals_against: Math.max(3, awayGa),
      form: [],
    }
  })
  entries.sort((a, b) => b.points - a.points || (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against))
  entries.forEach((e, i) => { e.position = i + 1 })
  standingsData[lidNum] = entries
}

// ─── Odds data ─────────────────────────────────────────────────
const oddsData: Record<number, any[]> = {}
for (const [matchId, m] of Object.entries(allMatches)) {
  const id = Number(matchId)
  oddsData[id] = [
    { id: id * 100 + 1, match_id: id, bookmaker: "竞彩", odds_type: "SPF", initial_home: m.spf.home, initial_draw: m.spf.draw, initial_away: m.spf.away, current_home: +(m.spf.home + (Math.random() - 0.5) * 0.1).toFixed(2), current_draw: +(m.spf.draw + (Math.random() - 0.5) * 0.08).toFixed(2), current_away: +(m.spf.away + (Math.random() - 0.5) * 0.1).toFixed(2) },
    { id: id * 100 + 2, match_id: id, bookmaker: "威廉希尔", odds_type: "SPF", initial_home: +(m.spf.home - 0.05).toFixed(2), initial_draw: +(m.spf.draw + 0.1).toFixed(2), initial_away: +(m.spf.away + 0.15).toFixed(2), current_home: +(m.spf.home - 0.03).toFixed(2), current_draw: +(m.spf.draw + 0.05).toFixed(2), current_away: +(m.spf.away + 0.1).toFixed(2) },
    { id: id * 100 + 3, match_id: id, bookmaker: "Bet365", odds_type: "SPF", initial_home: +(m.spf.home - 0.02).toFixed(2), initial_draw: +(m.spf.draw + 0.05).toFixed(2), initial_away: +(m.spf.away + 0.1).toFixed(2), current_home: +(m.spf.home + 0.01).toFixed(2), current_draw: +(m.spf.draw + 0.02).toFixed(2), current_away: +(m.spf.away + 0.08).toFixed(2) },
  ]
}

// ─── Odds history ──────────────────────────────────────────────
function generateOddsHistory(baseHome: number, baseDraw: number, baseAway: number): any[] {
  const history: any[] = []
  const now = new Date("2026-07-21T14:00:00+08:00")
  for (let i = 0; i < 12; i++) {
    const t = new Date(now.getTime() - (11 - i) * 30 * 60 * 1000)
    history.push({
      time: t.toISOString(),
      home: +(baseHome + (Math.random() - 0.5) * 0.15).toFixed(2),
      draw: +(baseDraw + (Math.random() - 0.5) * 0.1).toFixed(2),
      away: +(baseAway + (Math.random() - 0.5) * 0.15).toFixed(2),
    })
  }
  return history
}

function generateAsianHandicapHistory(baseHome: number, baseAway: number, baseHandicap: string): any[] {
  const history: any[] = []
  const now = new Date("2026-07-21T14:00:00+08:00")
  const hcap = parseFloat(baseHandicap)
  for (let i = 0; i < 12; i++) {
    const t = new Date(now.getTime() - (11 - i) * 30 * 60 * 1000)
    const hcapDelta = (Math.random() - 0.5) * 1.0
    history.push({
      time: t.toISOString(),
      home: +(baseHome + (Math.random() - 0.5) * 0.2).toFixed(2),
      draw: +((baseHome + baseAway) / 2 + (Math.random() - 0.5) * 0.3).toFixed(2),
      away: +(baseAway + (Math.random() - 0.5) * 0.2).toFixed(2),
      handicap: `${(hcap + hcapDelta) >= 0 ? "+" : ""}${(hcap + hcapDelta).toFixed(1)}`,
    })
  }
  return history
}

// bookmaker-specific base variation
function varyOdds(v: number): number {
  return +(v + (Math.random() - 0.5) * 0.3).toFixed(2)
}

function generateOptionsHistory(baseOptions: { label: string; odds: number }[]): any[] {
  const history: any[] = []
  const now = new Date("2026-07-21T14:00:00+08:00")
  for (let i = 0; i < 12; i++) {
    const t = new Date(now.getTime() - (11 - i) * 30 * 60 * 1000)
    const options: Record<string, number> = {}
    for (const { label, odds } of baseOptions) {
      options[label] = +(odds + (Math.random() - 0.5) * 0.5 * odds * 0.15).toFixed(2)
    }
    history.push({ time: t.toISOString(), home: null, draw: null, away: null, options })
  }
  return history
}

const oddsHistoryData: Record<string, any> = {}
for (const [matchId, m] of Object.entries(allMatches)) {
  const id = Number(matchId)

  // 竞彩 - SPF
  oddsHistoryData[`${id}_竞彩_SPF`] = {
    match_id: id, bookmaker: "竞彩", odds_type: "SPF",
    history: generateOddsHistory(m.spf.home, m.spf.draw, m.spf.away),
  }

  // 竞彩 - RQSPF (让球胜平负)
  oddsHistoryData[`${id}_竞彩_RQSPF`] = {
    match_id: id, bookmaker: "竞彩", odds_type: "RQSPF",
    history: generateAsianHandicapHistory(
      m.rqspf.home, m.rqspf.away, m.rqspf.handicap,
    ),
  }

  // 竞彩 - BF (比分)
  oddsHistoryData[`${id}_竞彩_BF`] = {
    match_id: id, bookmaker: "竞彩", odds_type: "BF",
    history: generateOptionsHistory(m.bf),
  }

  // 竞彩 - ZJQ (总进球)
  oddsHistoryData[`${id}_竞彩_ZJQ`] = {
    match_id: id, bookmaker: "竞彩", odds_type: "ZJQ",
    history: generateOptionsHistory(m.zjq),
  }

  // 竞彩 - BQC (半全场)
  oddsHistoryData[`${id}_竞彩_BQC`] = {
    match_id: id, bookmaker: "竞彩", odds_type: "BQC",
    history: generateOptionsHistory(m.bqc),
  }

  // 亚盘 bookmakers (澳门, Bet365, 易胜博, 香港马会)
  const yapanBks = ["澳门", "Bet365", "易胜博", "香港马会"]
  for (const bk of yapanBks) {
    oddsHistoryData[`${id}_${bk}_RQSPF`] = {
      match_id: id, bookmaker: bk, odds_type: "RQSPF",
      history: generateAsianHandicapHistory(
        varyOdds(m.rqspf.home), varyOdds(m.rqspf.away), m.rqspf.handicap,
      ),
    }
  }

  // 欧赔 bookmakers (威廉希尔, Bet365, 易胜博, 香港马会)
  const oupelBks = ["威廉希尔", "Bet365", "易胜博", "香港马会"]
  for (const bk of oupelBks) {
    oddsHistoryData[`${id}_${bk}_SPF`] = {
      match_id: id, bookmaker: bk, odds_type: "SPF",
      history: generateOddsHistory(varyOdds(m.spf.home), varyOdds(m.spf.draw), varyOdds(m.spf.away)),
    }
  }
}

// ─── Team form ─────────────────────────────────────────────────
function makeForm(teamId: number, teamName: string, results: Array<{ r: string; opp: string; score: string; date: string }>) {
  return {
    team_id: teamId,
    team_name: teamName,
    results: results.map((r, i) => ({ match_id: teamId * 1000 + i, result: r.r, home: (teamId + i) % 2 === 0, opponent: r.opp, score: r.score, match_time: r.date })),
  }
}

function spfForResult(result: string): { home_spf: number; draw_spf: number; away_spf: number } {
  if (result === "W") {
    return { home_spf: +(1.6 + Math.random() * 0.8).toFixed(2), draw_spf: +(3.2 + Math.random() * 0.5).toFixed(2), away_spf: +(3.5 + Math.random() * 2.0).toFixed(2) }
  }
  if (result === "D") {
    return { home_spf: +(2.0 + Math.random() * 0.8).toFixed(2), draw_spf: +(3.0 + Math.random() * 0.3).toFixed(2), away_spf: +(2.5 + Math.random() * 1.0).toFixed(2) }
  }
  return { home_spf: +(3.5 + Math.random() * 2.0).toFixed(2), draw_spf: +(3.2 + Math.random() * 0.5).toFixed(2), away_spf: +(1.6 + Math.random() * 0.8).toFixed(2) }
}

function spfForScore(homeScore: number | null, awayScore: number | null): { home_spf: number | null; draw_spf: number | null; away_spf: number | null } {
  if (homeScore == null || awayScore == null) return { home_spf: null, draw_spf: null, away_spf: null }
  if (homeScore > awayScore) {
    return { home_spf: +(1.6 + Math.random() * 0.8).toFixed(2), draw_spf: +(3.2 + Math.random() * 0.5).toFixed(2), away_spf: +(3.5 + Math.random() * 2.0).toFixed(2) }
  }
  if (homeScore === awayScore) {
    return { home_spf: +(2.0 + Math.random() * 0.8).toFixed(2), draw_spf: +(3.0 + Math.random() * 0.3).toFixed(2), away_spf: +(2.5 + Math.random() * 1.0).toFixed(2) }
  }
  return { home_spf: +(3.5 + Math.random() * 2.0).toFixed(2), draw_spf: +(3.2 + Math.random() * 0.5).toFixed(2), away_spf: +(1.6 + Math.random() * 0.8).toFixed(2) }
}

const existingForms: Record<number, Array<{ r: string; opp: string; score: string; date: string }>> = {
  1: [
    { r: "W", opp: "山东泰山", score: "2:1", date: "2026-07-15T19:35:00+08:00" },
    { r: "W", opp: "北京国安", score: "3:0", date: "2026-07-08T19:35:00+08:00" },
    { r: "D", opp: "广州队", score: "1:1", date: "2026-07-01T19:35:00+08:00" },
    { r: "W", opp: "武汉三镇", score: "2:0", date: "2026-06-24T19:35:00+08:00" },
    { r: "L", opp: "成都蓉城", score: "0:1", date: "2026-06-17T19:35:00+08:00" },
  ],
  2: [
    { r: "L", opp: "上海海港", score: "1:2", date: "2026-07-15T19:35:00+08:00" },
    { r: "W", opp: "广州队", score: "2:0", date: "2026-07-08T19:35:00+08:00" },
    { r: "W", opp: "武汉三镇", score: "3:1", date: "2026-07-01T19:35:00+08:00" },
    { r: "L", opp: "北京国安", score: "0:2", date: "2026-06-24T19:35:00+08:00" },
    { r: "W", opp: "成都蓉城", score: "1:0", date: "2026-06-17T19:35:00+08:00" },
  ],
  3: [
    { r: "L", opp: "北京国安", score: "0:2", date: "2026-07-15T19:35:00+08:00" },
    { r: "L", opp: "山东泰山", score: "0:2", date: "2026-07-08T19:35:00+08:00" },
    { r: "D", opp: "上海海港", score: "1:1", date: "2026-07-01T19:35:00+08:00" },
    { r: "W", opp: "武汉三镇", score: "2:1", date: "2026-06-24T19:35:00+08:00" },
    { r: "L", opp: "成都蓉城", score: "1:3", date: "2026-06-17T19:35:00+08:00" },
  ],
  4: [
    { r: "W", opp: "广州队", score: "2:0", date: "2026-07-15T19:35:00+08:00" },
    { r: "L", opp: "上海海港", score: "0:3", date: "2026-07-08T19:35:00+08:00" },
    { r: "W", opp: "山东泰山", score: "2:0", date: "2026-07-01T19:35:00+08:00" },
    { r: "D", opp: "武汉三镇", score: "1:1", date: "2026-06-24T19:35:00+08:00" },
    { r: "L", opp: "成都蓉城", score: "0:1", date: "2026-06-17T19:35:00+08:00" },
  ],
  5: [
    { r: "W", opp: "阿森纳", score: "3:1", date: "2026-07-14T23:00:00+08:00" },
    { r: "W", opp: "切尔西", score: "2:0", date: "2026-07-07T23:00:00+08:00" },
    { r: "W", opp: "曼联", score: "4:1", date: "2026-06-30T23:00:00+08:00" },
    { r: "D", opp: "利物浦", score: "2:2", date: "2026-06-23T23:00:00+08:00" },
    { r: "W", opp: "热刺", score: "3:0", date: "2026-06-16T23:00:00+08:00" },
  ],
  6: [
    { r: "L", opp: "曼城", score: "1:3", date: "2026-07-14T23:00:00+08:00" },
    { r: "W", opp: "利物浦", score: "2:1", date: "2026-07-07T23:00:00+08:00" },
    { r: "D", opp: "切尔西", score: "1:1", date: "2026-06-30T23:00:00+08:00" },
    { r: "W", opp: "热刺", score: "3:0", date: "2026-06-23T23:00:00+08:00" },
    { r: "W", opp: "曼联", score: "2:0", date: "2026-06-16T23:00:00+08:00" },
  ],
  7: [
    { r: "W", opp: "巴塞罗那", score: "2:1", date: "2026-07-20T03:00:00+08:00" },
    { r: "W", opp: "马竞", score: "3:0", date: "2026-07-13T03:00:00+08:00" },
    { r: "D", opp: "塞维利亚", score: "1:1", date: "2026-07-06T03:00:00+08:00" },
    { r: "W", opp: "瓦伦西亚", score: "2:0", date: "2026-06-29T03:00:00+08:00" },
    { r: "L", opp: "皇家社会", score: "0:1", date: "2026-06-22T03:00:00+08:00" },
  ],
  8: [
    { r: "L", opp: "皇家马德里", score: "1:2", date: "2026-07-20T03:00:00+08:00" },
    { r: "W", opp: "塞维利亚", score: "3:1", date: "2026-07-13T03:00:00+08:00" },
    { r: "W", opp: "马竞", score: "2:0", date: "2026-07-06T03:00:00+08:00" },
    { r: "D", opp: "瓦伦西亚", score: "2:2", date: "2026-06-29T03:00:00+08:00" },
    { r: "W", opp: "皇家社会", score: "4:0", date: "2026-06-22T03:00:00+08:00" },
  ],
  9: [
    { r: "W", opp: "多特蒙德", score: "3:1", date: "2026-07-14T21:30:00+08:00" },
    { r: "W", opp: "莱比锡", score: "2:0", date: "2026-07-07T21:30:00+08:00" },
    { r: "W", opp: "勒沃库森", score: "4:2", date: "2026-06-30T21:30:00+08:00" },
    { r: "D", opp: "法兰克福", score: "1:1", date: "2026-06-23T21:30:00+08:00" },
    { r: "W", opp: "沃尔夫斯堡", score: "3:0", date: "2026-06-16T21:30:00+08:00" },
  ],
  10: [
    { r: "L", opp: "拜仁慕尼黑", score: "1:3", date: "2026-07-14T21:30:00+08:00" },
    { r: "W", opp: "勒沃库森", score: "2:1", date: "2026-07-07T21:30:00+08:00" },
    { r: "D", opp: "莱比锡", score: "2:2", date: "2026-06-30T21:30:00+08:00" },
    { r: "W", opp: "法兰克福", score: "3:0", date: "2026-06-23T21:30:00+08:00" },
    { r: "L", opp: "沃尔夫斯堡", score: "0:2", date: "2026-06-16T21:30:00+08:00" },
  ],
  11: [
    { r: "W", opp: "马赛", score: "2:0", date: "2026-07-13T03:00:00+08:00" },
    { r: "W", opp: "摩纳哥", score: "3:1", date: "2026-07-06T03:00:00+08:00" },
    { r: "D", opp: "里昂", score: "1:1", date: "2026-06-29T03:00:00+08:00" },
    { r: "W", opp: "尼斯", score: "2:0", date: "2026-06-22T03:00:00+08:00" },
    { r: "W", opp: "里尔", score: "4:1", date: "2026-06-15T03:00:00+08:00" },
  ],
  12: [
    { r: "L", opp: "巴黎圣日耳曼", score: "0:2", date: "2026-07-13T03:00:00+08:00" },
    { r: "W", opp: "里尔", score: "2:1", date: "2026-07-06T03:00:00+08:00" },
    { r: "L", opp: "摩纳哥", score: "1:3", date: "2026-06-29T03:00:00+08:00" },
    { r: "D", opp: "尼斯", score: "0:0", date: "2026-06-22T03:00:00+08:00" },
    { r: "W", opp: "里昂", score: "3:1", date: "2026-06-15T03:00:00+08:00" },
  ],
  13: [
    { r: "D", opp: "国际米兰", score: "1:1", date: "2026-07-14T02:45:00+08:00" },
    { r: "W", opp: "尤文图斯", score: "2:0", date: "2026-07-07T02:45:00+08:00" },
    { r: "L", opp: "那不勒斯", score: "0:2", date: "2026-06-30T02:45:00+08:00" },
    { r: "W", opp: "罗马", score: "3:1", date: "2026-06-23T02:45:00+08:00" },
    { r: "D", opp: "亚特兰大", score: "2:2", date: "2026-06-16T02:45:00+08:00" },
  ],
  14: [
    { r: "D", opp: "AC米兰", score: "1:1", date: "2026-07-14T02:45:00+08:00" },
    { r: "W", opp: "那不勒斯", score: "2:1", date: "2026-07-07T02:45:00+08:00" },
    { r: "W", opp: "尤文图斯", score: "3:0", date: "2026-06-30T02:45:00+08:00" },
    { r: "L", opp: "罗马", score: "1:2", date: "2026-06-23T02:45:00+08:00" },
    { r: "W", opp: "亚特兰大", score: "2:0", date: "2026-06-16T02:45:00+08:00" },
  ],
  15: [
    { r: "D", opp: "切尔西", score: "1:1", date: "2026-07-20T20:30:00+08:00" },
    { r: "L", opp: "阿森纳", score: "1:2", date: "2026-07-14T20:30:00+08:00" },
    { r: "W", opp: "曼联", score: "3:0", date: "2026-07-07T20:30:00+08:00" },
    { r: "D", opp: "曼城", score: "2:2", date: "2026-06-30T20:30:00+08:00" },
    { r: "W", opp: "热刺", score: "2:0", date: "2026-06-23T20:30:00+08:00" },
  ],
  16: [
    { r: "D", opp: "利物浦", score: "1:1", date: "2026-07-20T20:30:00+08:00" },
    { r: "L", opp: "曼城", score: "0:2", date: "2026-07-14T20:30:00+08:00" },
    { r: "D", opp: "阿森纳", score: "1:1", date: "2026-07-07T20:30:00+08:00" },
    { r: "W", opp: "热刺", score: "3:1", date: "2026-06-30T20:30:00+08:00" },
    { r: "L", opp: "曼联", score: "1:2", date: "2026-06-23T20:30:00+08:00" },
  ],
}

const teamForm: Record<number, any> = {}
for (const t of teams) {
  if (existingForms[t.id]) {
    teamForm[t.id] = makeForm(t.id, t.name, existingForms[t.id])
  } else {
    teamForm[t.id] = { team_id: t.id, team_name: t.name, results: [] }
  }
}

// Inject initial SPF odds into form results
for (const form of Object.values(teamForm) as any[]) {
  for (const r of form.results) {
    const spf = spfForResult(r.result)
    r.home_spf = spf.home_spf
    r.draw_spf = spf.draw_spf
    r.away_spf = spf.away_spf
  }
}

// Inject form data into standings
for (const leagueStandings of Object.values(standingsData) as any[][]) {
  for (const s of leagueStandings) {
    const f = teamForm[s.team_id]
    s.form = f?.results?.slice(0, 6).map((r: any) => r.result) ?? []
  }
}

// ─── H2H data ──────────────────────────────────────────────────
const h2hData: Record<string, any[]> = {
  "1_2": [
    { match_id: 401, home_team: "上海海港", away_team: "山东泰山", home_score: 2, away_score: 1, match_time: "2026-07-21T19:35:00+08:00", league: "中超" },
    { match_id: 402, home_team: "山东泰山", away_team: "上海海港", home_score: 1, away_score: 1, match_time: "2026-03-15T19:35:00+08:00", league: "中超" },
    { match_id: 403, home_team: "上海海港", away_team: "山东泰山", home_score: 3, away_score: 0, match_time: "2025-10-25T19:35:00+08:00", league: "中超" },
    { match_id: 404, home_team: "山东泰山", away_team: "上海海港", home_score: 2, away_score: 1, match_time: "2025-06-15T19:35:00+08:00", league: "中超" },
  ],
  "3_4": [
    { match_id: 410, home_team: "广州队", away_team: "北京国安", home_score: 0, away_score: 2, match_time: "2026-07-15T19:35:00+08:00", league: "中超" },
    { match_id: 411, home_team: "北京国安", away_team: "广州队", home_score: 1, away_score: 0, match_time: "2026-02-20T19:35:00+08:00", league: "中超" },
    { match_id: 412, home_team: "广州队", away_team: "北京国安", home_score: 2, away_score: 2, match_time: "2025-09-10T19:35:00+08:00", league: "中超" },
  ],
  "5_6": [
    { match_id: 420, home_team: "曼城", away_team: "阿森纳", home_score: 3, away_score: 1, match_time: "2026-07-14T23:00:00+08:00", league: "英超" },
    { match_id: 421, home_team: "阿森纳", away_team: "曼城", home_score: 1, away_score: 0, match_time: "2026-02-15T23:00:00+08:00", league: "英超" },
    { match_id: 422, home_team: "曼城", away_team: "阿森纳", home_score: 2, away_score: 2, match_time: "2025-09-22T23:00:00+08:00", league: "英超" },
    { match_id: 423, home_team: "阿森纳", away_team: "曼城", home_score: 0, away_score: 1, match_time: "2025-04-26T23:00:00+08:00", league: "英超" },
  ],
  "7_8": [
    { match_id: 430, home_team: "皇家马德里", away_team: "巴塞罗那", home_score: 2, away_score: 1, match_time: "2026-07-20T03:00:00+08:00", league: "西甲" },
    { match_id: 431, home_team: "巴塞罗那", away_team: "皇家马德里", home_score: 3, away_score: 2, match_time: "2026-03-10T03:00:00+08:00", league: "西甲" },
    { match_id: 432, home_team: "皇家马德里", away_team: "巴塞罗那", home_score: 1, away_score: 1, match_time: "2025-10-28T03:00:00+08:00", league: "西甲" },
  ],
  "9_10": [
    { match_id: 440, home_team: "拜仁慕尼黑", away_team: "多特蒙德", home_score: 3, away_score: 1, match_time: "2026-07-14T21:30:00+08:00", league: "德甲" },
    { match_id: 441, home_team: "多特蒙德", away_team: "拜仁慕尼黑", home_score: 2, away_score: 2, match_time: "2026-02-08T21:30:00+08:00", league: "德甲" },
    { match_id: 442, home_team: "拜仁慕尼黑", away_team: "多特蒙德", home_score: 4, away_score: 0, match_time: "2025-11-09T21:30:00+08:00", league: "德甲" },
  ],
  "11_12": [
    { match_id: 470, home_team: "巴黎圣日耳曼", away_team: "马赛", home_score: 2, away_score: 0, match_time: "2026-07-13T03:00:00+08:00", league: "法甲" },
    { match_id: 471, home_team: "马赛", away_team: "巴黎圣日耳曼", home_score: 1, away_score: 3, match_time: "2026-02-22T03:00:00+08:00", league: "法甲" },
  ],
  "13_14": [
    { match_id: 450, home_team: "AC米兰", away_team: "国际米兰", home_score: 1, away_score: 1, match_time: "2026-07-14T02:45:00+08:00", league: "意甲" },
    { match_id: 451, home_team: "国际米兰", away_team: "AC米兰", home_score: 2, away_score: 0, match_time: "2026-02-02T02:45:00+08:00", league: "意甲" },
    { match_id: 452, home_team: "AC米兰", away_team: "国际米兰", home_score: 3, away_score: 2, match_time: "2025-10-06T02:45:00+08:00", league: "意甲" },
  ],
  "15_16": [
    { match_id: 460, home_team: "利物浦", away_team: "切尔西", home_score: 1, away_score: 1, match_time: "2026-07-20T20:30:00+08:00", league: "英超" },
    { match_id: 461, home_team: "切尔西", away_team: "利物浦", home_score: 0, away_score: 1, match_time: "2026-01-25T20:30:00+08:00", league: "英超" },
    { match_id: 462, home_team: "利物浦", away_team: "切尔西", home_score: 2, away_score: 2, match_time: "2025-08-17T20:30:00+08:00", league: "英超" },
  ],
}

// Inject initial SPF odds into H2H entries
for (const entries of Object.values(h2hData) as any[]) {
  for (const h of entries) {
    const spf = spfForScore(h.home_score, h.away_score)
    h.home_spf = spf.home_spf
    h.draw_spf = spf.draw_spf
    h.away_spf = spf.away_spf
  }
}

// ─── Comparison data ──────────────────────────────────────────
const comparisonData: Record<number, any> = {}

function statRowFromStanding(s: any, type: "total" | "home" | "away", recentForm?: string[]): any {
  const prefix = type === "total" ? "" : type === "home" ? "home_" : "away_"
  const played = s[`${prefix}played`] ?? s.played
  const wins = s[`${prefix}wins`] ?? s.wins
  const draws = s[`${prefix}draws`] ?? s.draws
  const losses = s[`${prefix}losses`] ?? s.losses
  const gf = s[`${prefix}goals_for`] ?? s.goals_for
  const ga = s[`${prefix}goals_against`] ?? s.goals_against
  const points = wins * 3 + draws
  const rank = type === "total" ? s.position : Math.max(1, s.position - Math.round(Math.random() * 3))
  const recentPlayed = recentForm?.length ?? played
  const recentWins = recentForm ? recentForm.filter((r: string) => r === "W").length : wins
  const recentDraws = recentForm ? recentForm.filter((r: string) => r === "D").length : draws
  const recentLosses = recentForm ? recentForm.filter((r: string) => r === "L").length : losses
  return {
    played: type === "recent6" ? Math.min(6, recentPlayed) : played,
    wins: type === "recent6" ? recentWins : wins,
    draws: type === "recent6" ? recentDraws : draws,
    losses: type === "recent6" ? recentLosses : losses,
    goals_for: gf,
    goals_against: ga,
    goal_diff: gf - ga,
    points: type === "recent6" ? recentWins * 3 + recentDraws : points,
    rank: type === "recent6" ? null : rank,
    win_rate: type === "recent6"
      ? +(((recentWins) / Math.max(1, Math.min(6, recentPlayed))) * 100).toFixed(1)
      : +((wins / Math.max(1, played)) * 100).toFixed(1),
  }
}

function makeComparison(teamId: number, leagueId: number): any {
  const league = leagues.find((l) => l.id === leagueId)
  const team = teams.find((t) => t.id === teamId)
  const standing = standingsData[leagueId]?.find((s) => s.team_id === teamId)
  if (!team || !standing) return null
  const form = teamForm[teamId]?.results?.map((r: any) => r.result) ?? []
  const leagueLabel = `[${league?.name}-${standing.position}]`
  function makeRow(type: "total" | "home" | "away" | "recent6", f?: string[]) {
    if (type === "recent6") return statRowFromStanding(standing, "recent6", f ?? form.slice(0, 6))
    return statRowFromStanding(standing, type)
  }
  const recent6Form = form.slice(0, 6)
  return {
    league_label: leagueLabel,
    team_name: team.name,
    fulltime: {
      total: makeRow("total"),
      home: makeRow("home"),
      away: makeRow("away"),
      recent6: makeRow("recent6", recent6Form),
    },
    halftime: {
      total: { ...makeRow("total"), goals_for: Math.round(standing.goals_for * 0.35), goals_against: Math.round(standing.goals_against * 0.3), goal_diff: Math.round(standing.goal_diff * 0.3), points: Math.round(standing.points * 0.35), win_rate: +(Math.random() * 50).toFixed(1) },
      home: { ...makeRow("home"), goals_for: Math.round(standing.home_goals_for * 0.35), goals_against: Math.round(standing.home_goals_against * 0.3), goal_diff: Math.round((standing.home_goals_for - standing.home_goals_against) * 0.3), points: Math.round((standing.home_wins * 3 + standing.home_draws) * 0.35), win_rate: +(Math.random() * 45).toFixed(1) },
      away: { ...makeRow("away"), goals_for: Math.round(standing.away_goals_for * 0.35), goals_against: Math.round(standing.away_goals_against * 0.3), goal_diff: Math.round((standing.away_goals_for - standing.away_goals_against) * 0.3), points: Math.round((standing.away_wins * 3 + standing.away_draws) * 0.35), win_rate: +(Math.random() * 50).toFixed(1) },
      recent6: { ...makeRow("recent6", recent6Form), goals_for: Math.round(standing.goals_for * 0.3), goals_against: Math.round(standing.goals_against * 0.3), goal_diff: 0, points: Math.round((recent6Form.filter((r: string) => r === "W").length * 3 + recent6Form.filter((r: string) => r === "D").length) * 0.3), win_rate: +(Math.random() * 45).toFixed(1) },
    },
  }
}

for (const [mid, m] of Object.entries(allMatches)) {
  const id = Number(mid)
  const homeData = makeComparison(m.home_team_id, m.league_id)
  const awayData = makeComparison(m.away_team_id, m.league_id)
  if (homeData && awayData) {
    comparisonData[id] = { match_id: id, home: homeData, away: awayData }
  }
}

// ─── Injuries ─────────────────────────────────────────────────
const positions = ["前锋", "左边锋", "右边锋", "前腰", "中前卫", "后腰", "左中场", "右中场", "左后卫", "右后卫", "左中卫", "右中卫", "中后卫", "门将"]
const injuryNames = ["张玉宁", "武磊", "吴曦", "郑智", "蒿俊闵", "王燊超", "张琳芃", "蒋光太", "颜骏凌", "刘彬彬", "金敬道", "刘洋", "徐新", "廖力生"]
const homeInjuriesByMatch: Record<number, any[]> = {
  1: [{ name: "奥斯卡", position: "前腰", tag: "核心" }, { name: "张琳芃", position: "右后卫", tag: "主力" }],
  2: [{ name: "韦世豪", position: "左边锋", tag: "主力" }],
  3: [{ name: "德布劳内", position: "前腰", tag: "核心" }, { name: "斯通斯", position: "中后卫", tag: null }],
  4: [{ name: "本泽马", position: "前锋", tag: "核心" }],
  5: [{ name: "穆勒", position: "右边锋", tag: "主力" }, { name: "格雷茨卡", position: "中前卫", tag: "主力" }],
  6: [{ name: "内马尔", position: "左边锋", tag: "核心" }],
  7: [{ name: "伊布", position: "前锋", tag: null }],
}
const awayInjuriesByMatch: Record<number, any[]> = {
  1: [{ name: "费莱尼", position: "中前卫", tag: "主力" }, { name: "王大雷", position: "门将", tag: "主力" }],
  2: [{ name: "张玉宁", position: "前锋", tag: "主力" }, { name: "于大宝", position: "中后卫", tag: null }],
  3: [{ name: "热苏斯", position: "前锋", tag: "主力" }],
  4: [{ name: "佩德里", position: "前腰", tag: "核心" }, { name: "登贝莱", position: "右边锋", tag: null }],
  5: [{ name: "罗伊斯", position: "前腰", tag: "核心" }],
  6: [{ name: "帕耶", position: "前腰", tag: "主力" }],
  7: [{ name: "恰尔汉奥卢", position: "前腰", tag: null }],
}
const injuriesData: Record<number, any> = {}
for (const [mid, m] of Object.entries(allMatches)) {
  const id = Number(mid)
  injuriesData[id] = {
    match_id: id,
    home: homeInjuriesByMatch[id] ?? [],
    away: awayInjuriesByMatch[id] ?? [],
  }
}

// ─── Predictions ───────────────────────────────────────────────
const predictions: Record<number, any> = {}
for (const [matchId, m] of Object.entries(allMatches)) {
  const id = Number(matchId)
  const homeStrength = m.spf.home < m.spf.away ? 55 : m.spf.home > m.spf.away ? 35 : 40
  const awayStrength = 100 - homeStrength - 28
  predictions[id] = {
    match_id: id,
    home_prob: homeStrength,
    draw_prob: 28,
    away_prob: Math.max(15, awayStrength),
    confidence: 60 + Math.floor(Math.random() * 20),
    model_version: "v1.0",
    predicted_result: homeStrength > awayStrength ? "主胜" : homeStrength < awayStrength ? "客胜" : "平局",
  }
}

// ─── Pre-match briefing ────────────────────────────────────────
const briefings: Record<number, string> = {
  1: "上海海港本赛季主场表现出色，10个主场取得6胜2平2负的战绩，进球效率联赛前列。山东泰山近期状态起伏，客场表现一般，近5个客场仅取得1胜。历史交锋中上海海港占据优势，近10次主场对阵山东泰山取得6胜3平1负。上海海港中场核心奥斯卡状态火热，是球队进攻的发动机。",
  2: "广州队近期陷入低迷，近5场比赛仅取得1胜1平3负，防守端漏洞明显。北京国安虽然客场作战，但球队整体实力占优，攻击线火力充足。历史交锋中北京国安略占优势。广州队伤停情况较为严重，多名主力缺阵。",
  3: "曼城本赛季主场战绩恐怖，19个主场取得16胜2平1负，场均进球超过2.5个。阿森纳虽然排名紧随其后，但客场面对曼城胜率较低。历史交锋中曼城占据绝对优势。德布劳内和哈兰德的组合是英超最具威胁的进攻组合。",
  4: "这是西甲最受瞩目的国家德比。皇马本赛季主场表现强势，巴萨客场也有不俗战绩。两队近期状态都非常出色，这场比赛很可能决定本赛季冠军归属。历史交锋中双方互有胜负，近10次交手各取4胜2平4负。",
  5: "拜仁慕尼黑主场对阵多特蒙德有着极佳的历史战绩，近10次主场取得8胜2平。多特蒙德客场面对拜仁胜率极低。拜仁目前阵容齐整，多特蒙德有部分球员伤停。这场比赛是德甲最受关注的对决之一。",
  6: "巴黎圣日耳曼主场对阵马赛的法国国家德比。巴黎主场战绩出色，马赛客场表现一般。历史交锋中巴黎占据绝对优势。巴黎三叉戟状态火热，马赛需要超水平发挥才有机会。",
  7: "米兰德比是意大利足球最具看点的比赛之一。两队实力接近，近期状态也相当。AC米兰主场作战有一定优势，但国际米兰客场也有不错的战绩。历史交锋中双方势均力敌。",
  101: "利物浦主场对阵切尔西的英超焦点战。利物浦主场氛围出色，切尔西近期状态有所回升。两队历史交锋多次出现平局，这场比赛同样充满悬念。",
  102: "西甲国家德比战，皇马主场迎战巴萨。皇马近期状态出色，巴萨客场也有不俗发挥。这场比赛将直接影响联赛冠军走势。",
  103: "米兰德比，两队在联赛中积分相近。AC米兰主场有一定优势，但国际米兰整体实力略强。预计这将是一场激烈的对决。",
  104: "上海海港主场对阵广州队，海港主场战绩出色，广州队近期状态低迷。海港有望在主场取得胜利。",
  105: "山东泰山主场迎战北京国安，两队实力接近。泰山主场有一定优势，国安客场也有不错的发挥。",
}

// ─── Users ─────────────────────────────────────────────────────
const users: Record<string, { id: number; email: string; role: string; password: string; created_at: string }> = {
  "vip@test.com": { id: 2, email: "vip@test.com", role: "VIP", password: "vip123", created_at: "2026-01-15T10:00:00Z" },
  "free@test.com": { id: 3, email: "free@test.com", role: "FREE", password: "free123", created_at: "2026-01-15T10:00:00Z" },
}
let nextUserId = 4

// ─── Plugin ────────────────────────────────────────────────────
export default function mockApiPlugin(): Plugin {
  return {
    name: "mock-api",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next()

        const url = new URL(req.url, `http://${req.headers.host}`)
        const method = req.method ?? "GET"
        const auth = isAuthed(req)

        const readBody = async (): Promise<any> => {
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(Buffer.from(chunk))
          const raw = Buffer.concat(chunks).toString()
          try { return JSON.parse(raw || "{}") } catch { return {} }
        }

        function end(data: unknown, status = 200) {
          res.statusCode = status
          res.setHeader("Content-Type", "application/json")
          return res.end(JSON.stringify(data))
        }

        const path = url.pathname.replace("/api/v1", "").replace(/\/$/, "")

        // ── Public: betting matches by date ──
        if (path === "/matches/betting" && method === "GET") {
          const date = url.searchParams.get("date") ?? "2026-07-21"
          const matchesForDate = bettingMatchesByDate[date] ?? []
          const weekday = getWeekday(date)
          const numbered = matchesForDate.map((m, i) => ({
            ...m,
            betting_code: `${weekday}${String(i + 1).padStart(3, "0")}`,
          }))
          return end({ date, weekday, matches: numbered })
        }

        // ── Public: today matches (legacy, redirects to betting) ──
        if (path === "/matches/today" && method === "GET") {
          const todayMatches = bettingMatchesByDate["2026-07-21"] ?? []
          const numbered = todayMatches.map((m, i) => ({
            ...m,
            betting_code: `周一${String(i + 1).padStart(3, "0")}`,
          }))
          return end(numbered)
        }

        // ── AUTH ──
        if (path === "/auth/register" && method === "POST") {
          const body = await readBody()
          const exists = Object.values(users).find((u) => u.email === body.email)
          if (exists) return end({ detail: "Email already registered" }, 400)
          const newUser = { id: nextUserId++, email: body.email, role: "FREE", password: body.password, created_at: new Date().toISOString() }
          users[body.email] = newUser
          return end({ id: newUser.id, email: newUser.email, role: newUser.role, created_at: newUser.created_at })
        }

        if (path === "/auth/login" && method === "POST") {
          const body = await readBody()
          const user = Object.values(users).find((u) => u.email === body.email)
          if (!user || user.password !== body.password) return end({ detail: "Incorrect email or password" }, 401)
          const token = user.role === "VIP" ? VIP_TOKEN : MOCK_TOKEN
          return end({ access_token: token, token_type: "bearer" })
        }

        // ── USER ──
        if (path === "/users/me" && method === "GET") {
          if (!auth.authed) return end({ detail: "Not authenticated" }, 401)
          const user = auth.isVip ? Object.values(users).find((u) => u.role === "VIP") : Object.values(users).find((u) => u.role === "FREE")
          return end({ id: user!.id, email: user!.email, role: user!.role, created_at: user!.created_at })
        }

        // ── MATCHES ──
        if (path === "/matches" && method === "GET") {
          if (!auth.authed) return end({ detail: "Not authenticated" }, 401)
          const all = Object.values(allMatches)
          let filtered = [...all]
          const l = url.searchParams.get("league")
          const s = url.searchParams.get("status")
          const d = url.searchParams.get("date")
          if (l) filtered = filtered.filter((m) => m.league === l)
          if (s) filtered = filtered.filter((m) => m.status === s)
          if (d) filtered = filtered.filter((m) => m.match_time.startsWith(d))
          return end(filtered.map(matchToResponse))
        }

        const mid = path.match(/^\/matches\/(\d+)$/)
        if (mid && method === "GET") {
          if (!auth.authed) return end({ detail: "Not authenticated" }, 401)
          const m = allMatches[Number(mid[1])]
          return m ? end(matchToResponse(m)) : end({ detail: "Not found" }, 404)
        }

        const oid = path.match(/^\/matches\/(\d+)\/odds$/)
        if (oid && method === "GET") {
          if (!auth.authed) return end({ detail: "Not authenticated" }, 401)
          return end(oddsData[Number(oid[1])] ?? [])
        }

        const ohid = path.match(/^\/matches\/(\d+)\/odds\/history$/)
        if (ohid && method === "GET") {
          if (!auth.authed) return end({ detail: "Not authenticated" }, 401)
          const bk = url.searchParams.get("bookmaker") ?? "竞彩"
          const ot = url.searchParams.get("odds_type") ?? "SPF"
          const key = `${Number(ohid[1])}_${bk}_${ot}`
          return end(oddsHistoryData[key] ?? null)
        }

        const aid = path.match(/^\/matches\/(\d+)\/analysis$/)
        if (aid && method === "GET") {
          if (!auth.authed) return end({ detail: "Not authenticated" }, 401)
          return end(predictions[Number(aid[1])] ?? { match_id: Number(aid[1]), home_prob: 40, draw_prob: 30, away_prob: 30, confidence: 60, model_version: "v1.0", predicted_result: "待定" })
        }

        // ── BRIEFING ──
        const bid = path.match(/^\/matches\/(\d+)\/briefing$/)
        if (bid && method === "GET") {
          return end({ match_id: Number(bid[1]), content: briefings[Number(bid[1])] ?? "暂无赛前简报" })
        }

        const cid = path.match(/^\/matches\/(\d+)\/comparison$/)
        if (cid && method === "GET") {
          if (!auth.authed) return end({ detail: "Not authenticated" }, 401)
          return end(comparisonData[Number(cid[1])] ?? null)
        }

        const iid = path.match(/^\/matches\/(\d+)\/injuries$/)
        if (iid && method === "GET") {
          if (!auth.authed) return end({ detail: "Not authenticated" }, 401)
          return end(injuriesData[Number(iid[1])] ?? { match_id: Number(iid[1]), home: [], away: [] })
        }

        // ── ANALYSIS ──
        if (path === "/analysis/h2h" && method === "GET") {
          if (!auth.authed) return end({ detail: "Not authenticated" }, 401)
          const t1 = url.searchParams.get("team1_id")
          const t2 = url.searchParams.get("team2_id")
          return end(h2hData[`${t1}_${t2}`] ?? h2hData[`${t2}_${t1}`] ?? [])
        }

        const tf = path.match(/^\/analysis\/teams\/(\d+)\/form$/)
        if (tf && method === "GET") {
          if (!auth.authed) return end({ detail: "Not authenticated" }, 401)
          return end(teamForm[Number(tf[1])] ?? { team_id: Number(tf[1]), team_name: "未知", results: [] })
        }

        // ── TEAMS ──
        if (path === "/teams" && method === "GET") {
          if (!auth.authed) return end({ detail: "Not authenticated" }, 401)
          const lid = url.searchParams.get("league_id")
          let result = [...teams]
          if (lid) result = result.filter((t) => t.league_id === Number(lid))
          return end(result)
        }

        const t = path.match(/^\/teams\/(\d+)$/)
        if (t && method === "GET") {
          if (!auth.authed) return end({ detail: "Not authenticated" }, 401)
          const found = teams.find((x) => x.id === Number(t[1]))
          return found ? end(found) : end({ detail: "Not found" }, 404)
        }

        // ── LEAGUES ──
        if (path === "/leagues" && method === "GET") return end(leagues)

        const st = path.match(/^\/leagues\/(\d+)\/standings$/)
        if (st && method === "GET") return end(standingsData[Number(st[1])] ?? [])

        next()
      })
    },
  }
}
