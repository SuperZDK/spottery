import TodayMatchList from "@/features/matches/TodayMatchList"
import BetSimulator from "@/features/betting/BetSimulator"

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">竞彩足球数据分析</h1>
        <p className="text-muted-foreground">今日竞彩开放赛事 · 点击赔率加入投注模拟</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TodayMatchList />
        </div>
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6">
            <BetSimulator />
          </div>
        </div>
      </div>
    </div>
  )
}
