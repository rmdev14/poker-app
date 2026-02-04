import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import ScreenLayout from '../components/ScreenLayout'
import './GamesScreen.css'

function getOrdinalSuffix(day) {
  if (day >= 11 && day <= 13) return 'th'
  switch (day % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

function formatGameDate(dateStr) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December']
  const d = new Date(dateStr)
  const dayName = days[d.getDay()]
  const dayNum = d.getDate()
  const month = months[d.getMonth()]
  const year = d.getFullYear()
  const currentYear = new Date().getFullYear()

  const dateFormatted = `${dayName} ${dayNum}${getOrdinalSuffix(dayNum)} ${month}`
  return year !== currentYear ? `${dateFormatted} ${year}` : dateFormatted
}

function getGameStatus(game, hasAttendees) {
  const hasWinners = game.first_place_player_id !== null

  if (hasWinners && hasAttendees) {
    return { label: 'Complete', className: 'complete' }
  } else if (hasWinners && !hasAttendees) {
    return { label: 'Attendees Required', className: 'attendees-required' }
  } else if (!hasWinners && hasAttendees) {
    return { label: 'Winners Required', className: 'winners-required' }
  } else {
    return { label: 'Winners & Attendees Required', className: 'both-required' }
  }
}

function GamesScreen() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [games, setGames] = useState([])
  const [gamesWithAttendees, setGamesWithAttendees] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchGames()
  }, [])

  async function fetchGames() {
    try {
      setLoading(true)
      setError(null)

      // Fetch game nights
      const { data, error: fetchError } = await supabase
        .from('game_nights')
        .select(`
          *,
          first_place_player:first_place_player_id(name),
          second_place_player:second_place_player_id(name),
          third_place_player:third_place_player_id(name)
        `)
        .order('game_date', { ascending: false })

      if (fetchError) throw fetchError
      setGames(data || [])

      // Fetch which games have attendance records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendances')
        .select('game_night_id')

      if (attendanceError) throw attendanceError

      // Create a Set of game IDs that have at least one attendance record
      const gameIdsWithAttendees = new Set(
        (attendanceData || []).map(a => a.game_night_id)
      )
      setGamesWithAttendees(gameIdsWithAttendees)
    } catch (err) {
      setError(err.message || 'Failed to load games')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScreenLayout title="Games">
      <div className="games-content">
        {isAdmin && (
          <button
            className="new-game-btn"
            onClick={() => navigate('/games/new')}
          >
            New Game Night
          </button>
        )}

        <section className="game-history">
          <h2 className="history-title">GAME HISTORY</h2>

          {loading && (
            <div className="loading-state">Loading games...</div>
          )}

          {error && (
            <div className="error-state">{error}</div>
          )}

          {!loading && !error && games.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon">🃏</span>
              <p className="empty-text">No games recorded yet</p>
            </div>
          )}

          {!loading && !error && games.length > 0 && (
            <div className="games-list">
              {games.map(game => {
                const hasAttendees = gamesWithAttendees.has(game.id)
                const status = getGameStatus(game, hasAttendees)
                const hasWinners = game.first_place_player_id !== null

                return (
                  <button
                    key={game.id}
                    className="game-card"
                    onClick={() => navigate(`/games/${game.id}`)}
                  >
                    <div className="game-card-main">
                      <div className="game-card-header">
                        <span className="game-date">{formatGameDate(game.game_date)}</span>
                        <span className={`status-badge ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                      {hasWinners ? (
                        <div className="game-winners">
                          <div className="winner-line first">
                            <span className="position">1st</span>
                            <span className="amount">£{game.first_place_prize}</span>
                            <span className="name">{game.first_place_player?.name}</span>
                          </div>
                          <div className="winner-line second">
                            <span className="position">2nd</span>
                            <span className="amount">£{game.second_place_prize}</span>
                            <span className="name">{game.second_place_player?.name}</span>
                          </div>
                          <div className="winner-line third">
                            <span className="position">3rd</span>
                            <span className="amount">£{game.third_place_prize}</span>
                            <span className="name">{game.third_place_player?.name}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="no-winners">
                          Winners not recorded
                        </div>
                      )}
                      <div className="game-meta">
                        {game.attendance_count} players
                      </div>
                    </div>
                    <span className="game-card-arrow">→</span>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </ScreenLayout>
  )
}

export default GamesScreen
