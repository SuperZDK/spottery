import { lazy, Suspense } from "react"
import { Routes, Route } from "react-router-dom"
import Layout from "@/components/shared/Layout"
import ProtectedRoute from "@/components/shared/ProtectedRoute"
import HomePage from "@/pages/HomePage"
import LoginPage from "@/pages/LoginPage"
import RegisterPage from "@/pages/RegisterPage"
import MatchesPage from "@/pages/MatchesPage"
import TeamsPage from "@/pages/TeamsPage"
import TeamDetailPage from "@/pages/TeamDetailPage"
import AnalysisPage from "@/pages/AnalysisPage"
import ProfilePage from "@/pages/ProfilePage"
import NotFoundPage from "@/pages/NotFoundPage"

const MatchDetailPage = lazy(() => import("@/pages/MatchDetailPage"))

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/matches"
            element={
              <ProtectedRoute>
                <MatchesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/matches/:id"
            element={
              <ProtectedRoute>
                <MatchDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teams"
            element={
              <ProtectedRoute>
                <TeamsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teams/:id"
            element={
              <ProtectedRoute>
                <TeamDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analysis"
            element={
              <ProtectedRoute requireVIP>
                <AnalysisPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
