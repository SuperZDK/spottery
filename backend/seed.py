"""Comprehensive seed data matching mock API richness."""
from datetime import datetime, timezone, timedelta
import json

from app.database import SessionLocal, engine, Base
from app.dependencies.auth import hash_password
from app.models.user import User
from app.models.league import League
from app.models.team import Team, TeamAlias
from app.models.match import Match
from app.models.odds import OddsHistory
from app.models.injury import Injury
from app.models.prediction import Prediction
from app.models.briefing import Briefing

Base.metadata.create_all(bind=engine)


def seed():
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)

        # ======================== LEAGUES ========================
        leagues_data = [
            ("中超", "中国", "2026"),
            ("英超", "英格兰", "2025-2026"),
            ("西甲", "西班牙", "2025-2026"),
            ("德甲", "德国", "2025-2026"),
            ("法甲", "法国", "2025-2026"),
            ("意甲", "意大利", "2025-2026"),
        ]
        leagues = []
        for name, country, season in leagues_data:
            l = League(name=name, country=country, season=season)
            db.add(l)
            leagues.append(l)
        db.flush()
        l1, l2, l3, l4, l5, l6 = leagues

        # ======================== USERS ========================
        demo = User(email="demo@test.com", password_hash=hash_password("demo123"), role="FREE")
        vip = User(email="vip@test.com", password_hash=hash_password("vip123"), role="VIP")
        db.add_all([demo, vip])
        db.flush()
        print(f"  Users: demo@test.com / demo123 (FREE),  vip@test.com / vip123 (VIP)")

        # ======================== TEAMS ========================
        team_defs = [
            (l1, "上海海港", "海港", "中国"),
            (l1, "山东泰山", "泰山", "中国"),
            (l1, "北京国安", "国安", "中国"),
            (l1, "成都蓉城", "蓉城", "中国"),
            (l1, "武汉三镇", "三镇", "中国"),
            (l2, "Manchester City", "Man City", "England"),
            (l2, "Arsenal", "Arsenal", "England"),
            (l2, "Liverpool", "Liverpool", "England"),
            (l2, "Chelsea", "Chelsea", "England"),
            (l2, "Manchester United", "Man Utd", "England"),
            (l3, "皇家马德里", "皇马", "西班牙"),
            (l3, "巴塞罗那", "巴萨", "西班牙"),
            (l3, "马德里竞技", "马竞", "西班牙"),
            (l3, "塞维利亚", "塞维", "西班牙"),
            (l4, "拜仁慕尼黑", "拜仁", "德国"),
            (l4, "多特蒙德", "多特", "德国"),
            (l4, "勒沃库森", "药厂", "德国"),
            (l4, "莱比锡红牛", "红牛", "德国"),
            (l5, "巴黎圣日耳曼", "巴黎", "法国"),
            (l5, "马赛", "马赛", "法国"),
            (l5, "摩纳哥", "摩纳哥", "法国"),
            (l5, "里昂", "里昂", "法国"),
            (l6, "国际米兰", "国米", "意大利"),
            (l6, "AC米兰", "A米", "意大利"),
            (l6, "尤文图斯", "尤文", "意大利"),
            (l6, "那不勒斯", "拿波里", "意大利"),
        ]
        teams = []
        for league, name, short, country in team_defs:
            t = Team(name=name, short_name=short, league_id=league.id, country=country)
            db.add(t)
            teams.append(t)
        db.flush()

        # ======================== ALIASES ========================
        alias_pairs = [
            (0, "上海海港", "上海海港"),
            (1, "山东泰山", "山东泰山"),
            (2, "北京国安", "北京国安"),
            (3, "成都蓉城", "成都蓉城"),
            (4, "武汉三镇", "武汉三镇"),
            (5, "曼城", "曼彻斯特城"),
            (6, "阿森纳", "阿森纳"),
            (7, "利物浦", "利物浦"),
            (8, "切尔西", "切尔西"),
            (9, "曼联", "曼联"),
            (10, "皇家马德里", "皇家马德里"),
            (11, "巴塞罗那", "巴塞罗那"),
            (12, "马德里竞技", "马德里竞技"),
            (13, "塞维利亚", "塞维利亚"),
            (14, "拜仁慕尼黑", "拜仁慕尼黑"),
            (15, "多特蒙德", "多特蒙德"),
            (16, "勒沃库森", "勒沃库森"),
            (17, "莱比锡红牛", "莱比锡红牛"),
            (18, "巴黎圣日耳曼", "巴黎圣日耳曼"),
            (19, "马赛", "马赛"),
            (20, "摩纳哥", "摩纳哥"),
            (21, "里昂", "里昂"),
            (22, "国际米兰", "国际米兰"),
            (23, "AC米兰", "AC米兰"),
            (24, "尤文图斯", "尤文图斯"),
            (25, "那不勒斯", "那不勒斯"),
        ]
        for idx, jc_name, qt_name in alias_pairs:
            db.add(TeamAlias(team_id=teams[idx].id, source="jingcai", name=jc_name))
            db.add(TeamAlias(team_id=teams[idx].id, source="qiutan", name=qt_name))
        db.flush()

        # ======================== MATCHES ========================
        matches = []

        # --- 中超 finished (10 matches) ---
        zc_finished = [
            (teams[0], teams[1], 2, 1, 1, 0, 1),
            (teams[2], teams[4], 1, 1, 0, 0, 1),
            (teams[3], teams[0], 0, 3, 0, 1, 2),
            (teams[1], teams[2], 2, 0, 1, 0, 2),
            (teams[4], teams[3], 1, 2, 1, 1, 2),
            (teams[0], teams[4], 3, 0, 2, 0, 3),
            (teams[2], teams[1], 1, 2, 1, 1, 3),
            (teams[3], teams[2], 2, 2, 1, 0, 4),
            (teams[1], teams[3], 1, 0, 0, 0, 4),
            (teams[4], teams[0], 0, 2, 0, 1, 5),
        ]
        for i, (ht, at, hs, aws, hhs, has, rnd) in enumerate(zc_finished):
            mt = now - timedelta(days=10 - i)
            m = Match(league_id=l1.id, home_team_id=ht.id, away_team_id=at.id,
                      match_time=mt, status="FINISHED",
                      home_score=hs, away_score=aws,
                      half_home_score=hhs, half_away_score=has, round=rnd)
            db.add(m)
            matches.append(m)

        # --- 英超 finished (8 matches) ---
        yc_finished = [
            (teams[5], teams[6], 3, 1, 2, 0, 8),
            (teams[7], teams[8], 1, 1, 0, 0, 8),
            (teams[9], teams[5], 0, 2, 0, 1, 9),
            (teams[6], teams[7], 2, 1, 1, 0, 9),
            (teams[8], teams[9], 2, 2, 2, 1, 9),
            (teams[5], teams[8], 4, 0, 2, 0, 10),
            (teams[7], teams[6], 1, 2, 0, 1, 10),
            (teams[9], teams[7], 0, 3, 0, 2, 11),
        ]
        for i, (ht, at, hs, aws, hhs, has, rnd) in enumerate(yc_finished):
            mt = now - timedelta(days=12 - i)
            m = Match(league_id=l2.id, home_team_id=ht.id, away_team_id=at.id,
                      match_time=mt, status="FINISHED",
                      home_score=hs, away_score=aws,
                      half_home_score=hhs, half_away_score=has, round=rnd)
            db.add(m)
            matches.append(m)

        # --- 西甲 finished (6 matches) ---
        xj_finished = [
            (teams[10], teams[11], 2, 1, 1, 0, 5),
            (teams[12], teams[13], 1, 0, 1, 0, 5),
            (teams[11], teams[12], 0, 0, 0, 0, 6),
            (teams[13], teams[10], 1, 3, 1, 1, 6),
            (teams[10], teams[12], 3, 1, 2, 0, 7),
            (teams[11], teams[13], 5, 1, 2, 0, 7),
        ]
        for i, (ht, at, hs, aws, hhs, has, rnd) in enumerate(xj_finished):
            mt = now - timedelta(days=14 - i)
            m = Match(league_id=l3.id, home_team_id=ht.id, away_team_id=at.id,
                      match_time=mt, status="FINISHED",
                      home_score=hs, away_score=aws,
                      half_home_score=hhs, half_away_score=has, round=rnd)
            db.add(m)
            matches.append(m)

        # --- 德甲 finished (6 matches) ---
        dj_finished = [
            (teams[14], teams[15], 3, 1, 2, 1, 12),
            (teams[16], teams[17], 2, 2, 1, 1, 12),
            (teams[15], teams[16], 1, 3, 1, 2, 13),
            (teams[17], teams[14], 0, 1, 0, 0, 13),
            (teams[14], teams[16], 4, 0, 2, 0, 14),
            (teams[15], teams[17], 3, 2, 2, 1, 14),
        ]
        for i, (ht, at, hs, aws, hhs, has, rnd) in enumerate(dj_finished):
            mt = now - timedelta(days=16 - i)
            m = Match(league_id=l4.id, home_team_id=ht.id, away_team_id=at.id,
                      match_time=mt, status="FINISHED",
                      home_score=hs, away_score=aws,
                      half_home_score=hhs, half_away_score=has, round=rnd)
            db.add(m)
            matches.append(m)

        # --- 法甲 finished (6 matches) ---
        fj_finished = [
            (teams[18], teams[19], 2, 0, 1, 0, 9),
            (teams[20], teams[21], 3, 1, 2, 0, 9),
            (teams[19], teams[20], 0, 1, 0, 0, 10),
            (teams[21], teams[18], 1, 4, 1, 2, 10),
            (teams[18], teams[20], 3, 0, 1, 0, 11),
            (teams[19], teams[21], 2, 2, 1, 1, 11),
        ]
        for i, (ht, at, hs, aws, hhs, has, rnd) in enumerate(fj_finished):
            mt = now - timedelta(days=18 - i)
            m = Match(league_id=l5.id, home_team_id=ht.id, away_team_id=at.id,
                      match_time=mt, status="FINISHED",
                      home_score=hs, away_score=aws,
                      half_home_score=hhs, half_away_score=has, round=rnd)
            db.add(m)
            matches.append(m)

        # --- 意甲 finished (6 matches) ---
        yj_finished = [
            (teams[22], teams[23], 1, 1, 0, 0, 10),
            (teams[24], teams[25], 2, 1, 2, 0, 10),
            (teams[23], teams[24], 0, 0, 0, 0, 11),
            (teams[25], teams[22], 0, 3, 0, 2, 11),
            (teams[22], teams[24], 2, 0, 1, 0, 12),
            (teams[23], teams[25], 3, 2, 1, 1, 12),
        ]
        for i, (ht, at, hs, aws, hhs, has, rnd) in enumerate(yj_finished):
            mt = now - timedelta(days=20 - i)
            m = Match(league_id=l6.id, home_team_id=ht.id, away_team_id=at.id,
                      match_time=mt, status="FINISHED",
                      home_score=hs, away_score=aws,
                      half_home_score=hhs, half_away_score=has, round=rnd)
            db.add(m)
            matches.append(m)

        db.flush()

        # --- Scheduled matches across dates ---
        scheduled = [
            # 中超 today (betting page default)
            (l1, teams[0], teams[1], now + timedelta(hours=12), 6, False),
            (l1, teams[2], teams[4], now + timedelta(hours=16), 6, False),
            # 英超 today
            (l2, teams[6], teams[7], now + timedelta(hours=14), 12, False),
            (l2, teams[5], teams[9], now + timedelta(hours=19), 12, False),
            # 中超 upcoming days
            (l1, teams[1], teams[3], now + timedelta(days=3), 7, False),
            (l1, teams[4], teams[2], now + timedelta(days=7), 7, False),
            (l1, teams[1], teams[0], now + timedelta(days=10), 8, False),
            # 英超 upcoming days
            (l2, teams[8], teams[6], now + timedelta(days=8), 13, False),
            # 西甲 upcoming
            (l3, teams[12], teams[10], now + timedelta(days=3), 8, False),
            (l3, teams[11], teams[13], now + timedelta(days=6), 8, False),
            # 德甲 upcoming
            (l4, teams[16], teams[14], now + timedelta(days=4), 15, False),
            (l4, teams[15], teams[17], now + timedelta(days=9), 15, False),
            # 法甲 upcoming
            (l5, teams[20], teams[18], now + timedelta(days=3), 12, False),
            (l5, teams[19], teams[21], now + timedelta(days=7), 12, False),
            # 意甲 upcoming
            (l6, teams[24], teams[22], now + timedelta(days=5), 13, False),
            (l6, teams[23], teams[25], now + timedelta(days=8), 13, False),
        ]
        scheduled_matches = []
        for league, ht, at, mt, rnd, _ in scheduled:
            m = Match(league_id=league.id, home_team_id=ht.id, away_team_id=at.id,
                      match_time=mt, status="SCHEDULED", round=rnd)
            db.add(m)
            scheduled_matches.append(m)
        db.flush()

        # ======================== ODDS ========================
        odds_list = []
        for m in scheduled_matches:
            h = 1.5 + (hash(str(m.home_team_id)) % 100) / 100.0
            d = 2.8 + (hash(str(m.away_team_id)) % 50) / 100.0
            a = 2.8 + (hash(str(m.league_id)) % 80) / 100.0
            h = round(min(max(h, 1.2), 6.0), 2)
            d = round(min(max(d, 2.5), 5.0), 2)
            a = round(min(max(a, 2.0), 7.0), 2)
            handicap = str(int((h - a) * 2 / 3)) if h < a else "-" + str(int((a - h) * 2 / 3))

            # 竞彩 SPF snapshots
            for days_ago in [3, 2, 1]:
                snap = m.match_time - timedelta(days=days_ago)
                odds_list.append(OddsHistory(
                    match_id=m.id, bookmaker="竞彩", odds_type="SPF",
                    snapshot_at=snap,
                    home_odds=round(h + (days_ago - 2) * 0.05, 2),
                    draw_odds=round(d + (days_ago - 2) * 0.03, 2),
                    away_odds=round(a + (days_ago - 2) * 0.05, 2),
                ))
            # 竞彩 RQSPF
            odds_list.append(OddsHistory(
                match_id=m.id, bookmaker="竞彩", odds_type="RQSPF",
                snapshot_at=m.match_time - timedelta(hours=48),
                home_odds=round(h * 1.2, 2), draw_odds=round(d * 1.1, 2),
                away_odds=round(a * 0.9, 2), handicap=handicap,
            ))
            # Bet365 SPF
            odds_list.append(OddsHistory(
                match_id=m.id, bookmaker="Bet365", odds_type="SPF",
                snapshot_at=m.match_time - timedelta(hours=48),
                home_odds=round(h - 0.05, 2), draw_odds=round(d + 0.1, 2),
                away_odds=round(a + 0.15, 2),
            ))
            # 威廉希尔 SPF
            odds_list.append(OddsHistory(
                match_id=m.id, bookmaker="威廉希尔", odds_type="SPF",
                snapshot_at=m.match_time - timedelta(hours=48),
                home_odds=round(h - 0.02, 2), draw_odds=round(d + 0.05, 2),
                away_odds=round(a + 0.1, 2),
            ))
            # 竞彩 BF options
            odds_list.append(OddsHistory(
                match_id=m.id, bookmaker="竞彩", odds_type="BF",
                snapshot_at=m.match_time - timedelta(hours=48),
                options=json.dumps({
                    "1:0": round(6.0 + (hash(str(m.id)) % 20) / 10, 2),
                    "2:0": round(7.0 + (hash(str(m.home_team_id)) % 30) / 10, 2),
                    "2:1": round(7.5 + (hash(str(m.away_team_id)) % 15) / 10, 2),
                    "3:0": round(9.0 + (hash(str(m.league_id)) % 40) / 10, 2),
                    "0:0": round(8.0 + (hash(str(m.match_time)) % 20) / 10, 2),
                    "1:1": round(6.8 + (hash(str(m.round)) % 10) / 10, 2),
                    "0:1": round(8.5 + (hash(str(m.id)) % 25) / 10, 2),
                    "1:2": round(9.0 + (hash(str(m.home_team_id)) % 20) / 10, 2),
                }, ensure_ascii=False),
            ))
            # 竞彩 ZJQ options
            odds_list.append(OddsHistory(
                match_id=m.id, bookmaker="竞彩", odds_type="ZJQ",
                snapshot_at=m.match_time - timedelta(hours=48),
                options=json.dumps({
                    "0球": 10.0, "1球": 5.0, "2球": 3.5, "3球": 3.8,
                    "4球": 5.5, "5球": 9.0, "6球": 18.0, "7+球": 25.0,
                }),
            ))
            # 竞彩 BQC options
            odds_list.append(OddsHistory(
                match_id=m.id, bookmaker="竞彩", odds_type="BQC",
                snapshot_at=m.match_time - timedelta(hours=48),
                options=json.dumps({
                    "胜-胜": round(3.5 + (hash(str(m.home_team_id)) % 15) / 10, 2),
                    "胜-平": 14.0, "胜-负": 30.0,
                    "平-胜": round(5.0 + (hash(str(m.away_team_id)) % 10) / 10, 2),
                    "平-平": 5.5, "平-负": 8.0,
                    "负-胜": 25.0, "负-平": 12.0,
                    "负-负": round(6.0 + (hash(str(m.league_id)) % 20) / 10, 2),
                }, ensure_ascii=False),
            ))

        db.add_all(odds_list)
        db.flush()

        # ======================== INJURIES ========================
        injury_data = {
            scheduled_matches[0].id: [
                ("home", "费莱尼", "中场", "伤疑"),
                ("home", "郑铮", "后卫", "停赛"),
                ("away", "张玉宁", "前锋", "受伤"),
            ],
            scheduled_matches[1].id: [
                ("home", "奥斯卡", "前腰", "核心"),
                ("home", "张琳芃", "右后卫", "主力"),
                ("away", "韦世豪", "左边锋", "主力"),
            ],
            scheduled_matches[4].id: [
                ("away", "Darwin Núñez", "前锋", "受伤"),
                ("home", "Mohamed Salah", "右边锋", "核心"),
            ],
            scheduled_matches[5].id: [
                ("home", "Kevin De Bruyne", "前腰", "核心"),
                ("away", "Bruno Fernandes", "前腰", "主力"),
            ],
            scheduled_matches[7].id: [
                ("home", "格列兹曼", "前锋", "主力"),
                ("away", "维尼修斯", "左边锋", "核心"),
            ],
            scheduled_matches[9].id: [
                ("home", "维尔茨", "前腰", "核心"),
                ("away", "哈里·凯恩", "前锋", "核心"),
            ],
        }
        for mid, entries in injury_data.items():
            for team_type, player, pos, tag in entries:
                db.add(Injury(match_id=mid, team_type=team_type,
                              player_name=player, position=pos, tag=tag))
        db.flush()

        # ======================== PREDICTIONS ========================
        for m in scheduled_matches:
            h = 40 + (hash(str(m.home_team_id)) % 20)
            d = 20 + (hash(str(m.away_team_id)) % 15)
            a = 100 - h - d
            conf = 3 + (hash(str(m.league_id)) % 3)
            result = "HOME" if h > a else "AWAY" if a > h else "DRAW"
            db.add(Prediction(
                match_id=m.id, home_prob=h, draw_prob=d, away_prob=a,
                confidence=conf, model_version="v1.0", predicted_result=result,
            ))
        db.flush()

        # ======================== BRIEFINGS ========================
        briefing_templates = {
            0: "{}主场对阵{}，历史交锋{}占优，近期状态火热。{}客场表现一般，防守端存在隐患。",
            1: "{}主场迎战{}，两队实力接近。{}主场优势明显，进攻火力充足。{}近期客场战绩不佳。",
            2: "{}对阵{}，{}目前排名靠前，士气正旺。{}客场挑战，需超水平发挥。",
            3: "{} vs {}，这是一场势均力敌的较量。{}主场未尝败绩，{}客场也有不错表现。",
            4: "{}主场对阵{}，{}攻击线状态正佳。{}需要立足防守，寻找反击机会。",
            5: "{}迎战{}，{}主场战绩出色。{}近期状态回升，有望给主队制造麻烦。",
            6: "{} vs {}，{}目前攻防俱佳。{}客场作战，需在防守端保持专注。",
            7: "{}主场对阵{}，实力占优。{}近期遭遇伤病困扰，阵容不整。",
        }
        teams_by_id = {t.id: t.name for t in teams}
        for i, m in enumerate(scheduled_matches):
            ht_name = teams_by_id.get(m.home_team_id, "未知")
            at_name = teams_by_id.get(m.away_team_id, "未知")
            tmpl = briefing_templates.get(i % len(briefing_templates))
            content = tmpl.format(ht_name, at_name, ht_name, at_name,
                                  ht_name, at_name, ht_name, at_name,
                                  ht_name, at_name, ht_name, at_name,
                                  ht_name, at_name, ht_name, at_name)
            db.add(Briefing(match_id=m.id, content=content))
        db.flush()

        db.commit()
        print("Seed data inserted successfully.")
        print(f"  Leagues: {len(leagues)}")
        print(f"  Teams: {len(teams)}")
        print(f"  Finished matches: {len(matches)}")
        print(f"  Scheduled matches: {len(scheduled_matches)}")
        print(f"  Odds records: {len(odds_list)}")
        print(f"  Injuries: {sum(len(v) for v in injury_data.values())}")
        print(f"  Predictions: {len(scheduled_matches)}")
        print(f"  Briefings: {len(scheduled_matches)}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
