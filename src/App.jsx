import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import HomeScreen from './screens/HomeScreen'
import LeaderboardScreen from './screens/LeaderboardScreen'
import GamesScreen from './screens/GamesScreen'
import NewGameScreen from './screens/NewGameScreen'
import GameDetailScreen from './screens/GameDetailScreen'
import PrizeChartScreen from './screens/PrizeChartScreen'
import AdminLoginScreen from './screens/AdminLoginScreen'
import ProtectedRoute from './components/ProtectedRoute'
import UpdateToast from './components/UpdateToast'

function App() {
  return (
    <AuthProvider>
      <UpdateToast />
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/leaderboard" element={<LeaderboardScreen />} />
        <Route path="/games" element={<GamesScreen />} />
        <Route path="/games/new" element={<ProtectedRoute><NewGameScreen /></ProtectedRoute>} />
        <Route path="/games/:id" element={<GameDetailScreen />} />
        <Route path="/prize-chart" element={<PrizeChartScreen />} />
        <Route path="/admin/login" element={<AdminLoginScreen />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
