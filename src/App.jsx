import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { RequireAuth, GuestOnly } from './components/layout/Guards'
import { AdminLayout } from './admin/AdminLayout'
import { useAuthStore } from './store/authStore'
import { LoadingState } from './components/common/States'

const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Verify = lazy(() => import('./pages/Verify'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const SpinArena = lazy(() => import('./pages/SpinArena'))
const LuckyDraw = lazy(() => import('./pages/LuckyDraw'))
const Winners = lazy(() => import('./pages/Winners'))
const Rewards = lazy(() => import('./pages/Rewards'))
const Profile = lazy(() => import('./pages/Profile'))
const AdminLogin = lazy(() => import('./admin/AdminLogin'))
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'))
const Participants = lazy(() => import('./admin/Participants'))
const PrizeManager = lazy(() => import('./admin/PrizeManager'))
const SpinSettings = lazy(() => import('./admin/SpinSettings'))
const LuckyDrawManager = lazy(() => import('./admin/LuckyDrawManager'))
const WinnerManager = lazy(() => import('./admin/WinnerManager'))
const RewardManager = lazy(() => import('./admin/RewardManager'))
const Analytics = lazy(() => import('./admin/Analytics'))
const SettingsPage = lazy(() => import('./admin/Settings'))
const ActivityLogs = lazy(() => import('./admin/Settings').then((m) => ({ default: m.ActivityLogs })))

function Fallback() {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <LoadingState label="Loading Luckyverse" />
    </div>
  )
}

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap)
  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  return (
    <BrowserRouter>
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Home />} />
            <Route
              path="/login"
              element={
                <GuestOnly>
                  <Login />
                </GuestOnly>
              }
            />
            <Route
              path="/register"
              element={
                <GuestOnly>
                  <Register />
                </GuestOnly>
              }
            />
            <Route path="/verify" element={<Verify />} />
            <Route path="/winners" element={<Winners />} />
            <Route path="/lucky-draw" element={<LuckyDraw />} />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/spin"
              element={
                <RequireAuth>
                  <SpinArena />
                </RequireAuth>
              }
            />
            <Route
              path="/rewards"
              element={
                <RequireAuth>
                  <Rewards />
                </RequireAuth>
              }
            />
            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <Profile />
                </RequireAuth>
              }
            />
          </Route>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <RequireAuth role="admin">
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="participants" element={<Participants />} />
            <Route path="prizes" element={<PrizeManager />} />
            <Route path="spin-settings" element={<SpinSettings />} />
            <Route path="lucky-draws" element={<LuckyDrawManager />} />
            <Route path="winners" element={<WinnerManager />} />
            <Route path="rewards" element={<RewardManager />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="logs" element={<ActivityLogs />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
