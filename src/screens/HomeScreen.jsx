import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './HomeScreen.css'

function getOrdinalSuffix(day) {
  if (day >= 11 && day <= 13) return 'th'
  switch (day % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

function getNextThursday() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  // Thursday is day 4
  let daysUntilThursday = (4 - dayOfWeek + 7) % 7
  // If today is Thursday, show today
  if (dayOfWeek === 4) {
    daysUntilThursday = 0
  }
  const nextThursday = new Date(now)
  nextThursday.setDate(now.getDate() + daysUntilThursday)

  const day = nextThursday.getDate()
  const month = nextThursday.toLocaleDateString('en-GB', { month: 'short' })
  return `${day}${getOrdinalSuffix(day)} ${month}`
}

function HomeScreen() {
  const navigate = useNavigate()
  const { isAdmin, signOut } = useAuth()
  const nextGameDate = getNextThursday()

  const [lastGameWithWinners, setLastGameWithWinners] = useState(null)
  const [gamesPlayed, setGamesPlayed] = useState(0)
  const [christmasPot, setChristmasPot] = useState(0)
  const [loading, setLoading] = useState(true)

  // Triple-tap login on brand name
  const tapCountRef = useRef(0)
  const tapTimerRef = useRef(null)

  function handleBrandTap() {
    if (isAdmin) return

    tapCountRef.current += 1

    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current)
    }

    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0
      navigate('/admin/login')
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0
      }, 500)
    }
  }

  async function handleLogout() {
    try {
      await signOut()
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  // Cleanup triple-tap timeout on unmount
  useEffect(() => {
    return () => {
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    async function fetchHomeData() {
      try {
        // Fetch all game_nights to calculate stats
        const { data: allGames, error: gamesError } = await supabase
          .from('game_nights')
          .select(`
            *,
            first_place_player:first_place_player_id(name),
            second_place_player:second_place_player_id(name),
            third_place_player:third_place_player_id(name)
          `)
          .order('game_date', { ascending: false })

        if (gamesError) throw gamesError

        if (allGames && allGames.length > 0) {
          // Games played = total count
          setGamesPlayed(allGames.length)

          // Christmas pot = sum of all pot_amount values
          const potTotal = allGames.reduce((sum, game) => sum + (game.pot_amount || 0), 0)
          setChristmasPot(potTotal)

          // Find most recent game that has winners
          const gameWithWinners = allGames.find(game => game.first_place_player_id !== null)
          if (gameWithWinners) {
            setLastGameWithWinners(gameWithWinners)
          }
        }
      } catch (err) {
        console.error('Failed to fetch home data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchHomeData()
  }, [])

  const navCards = [
    {
      id: 'leaderboard',
      icon: '#1',
      title: 'Leaderboard',
      subtitle: 'Rankings, P&L & Stats',
      path: '/leaderboard'
    },
    {
      id: 'games',
      icon: '♠',
      title: 'Games',
      subtitle: 'Weekly Results & History',
      path: '/games'
    },
    {
      id: 'prize-chart',
      icon: '£',
      title: 'Prize Chart',
      subtitle: 'Payout Structure',
      path: '/prize-chart'
    }
  ]

  return (
    <div className="home-screen">
      {/* Branding */}
      <header className="branding">
        <span className="brand-top" onClick={handleBrandTap}>MINNESOTA FATS</span>
        <div className="brand-main-wrapper">
          {/* Left card pair */}
          <div className="decorative-cards cards-left">
            {/* King of Clubs - back card */}
            <div className="pcard pcard-back pcard-black">
              <div className="pcard-corner pcard-corner-top">
                <span className="pcard-rank">K</span>
                <span className="pcard-pip">♣</span>
              </div>
              <div className="pcard-center pcard-center-king">
                <span className="pcard-line" />
                <span className="pcard-crown">♛</span>
                <span className="pcard-center-suit">♣</span>
                <span className="pcard-line" />
              </div>
              <div className="pcard-corner pcard-corner-bottom">
                <span className="pcard-rank">K</span>
                <span className="pcard-pip">♣</span>
              </div>
            </div>
            {/* Ace of Hearts - front card */}
            <div className="pcard pcard-front pcard-red">
              <div className="pcard-corner pcard-corner-top">
                <span className="pcard-rank">A</span>
                <span className="pcard-pip">♥</span>
              </div>
              <div className="pcard-center pcard-center-ace">
                <span className="pcard-ace-suit">♥</span>
              </div>
              <div className="pcard-corner pcard-corner-bottom">
                <span className="pcard-rank">A</span>
                <span className="pcard-pip">♥</span>
              </div>
            </div>
          </div>

          <h1 className="brand-main">POKER</h1>

          {/* Right card pair */}
          <div className="decorative-cards cards-right">
            {/* King of Spades - back card */}
            <div className="pcard pcard-back pcard-black">
              <div className="pcard-corner pcard-corner-top">
                <span className="pcard-rank">K</span>
                <span className="pcard-pip">♠</span>
              </div>
              <div className="pcard-center pcard-center-king">
                <span className="pcard-line" />
                <span className="pcard-crown">♛</span>
                <span className="pcard-center-suit">♠</span>
                <span className="pcard-line" />
              </div>
              <div className="pcard-corner pcard-corner-bottom">
                <span className="pcard-rank">K</span>
                <span className="pcard-pip">♠</span>
              </div>
            </div>
            {/* Ace of Diamonds - front card */}
            <div className="pcard pcard-front pcard-red">
              <div className="pcard-corner pcard-corner-top">
                <span className="pcard-rank">A</span>
                <span className="pcard-pip">♦</span>
              </div>
              <div className="pcard-center pcard-center-ace">
                <span className="pcard-ace-suit">♦</span>
              </div>
              <div className="pcard-corner pcard-corner-bottom">
                <span className="pcard-rank">A</span>
                <span className="pcard-pip">♦</span>
              </div>
            </div>
          </div>
        </div>
        <div className="brand-divider">
          <span className="divider-line divider-left" />
          <span className="divider-diamond">◆</span>
          <span className="divider-line divider-right" />
        </div>
        <span className="brand-season">SEASON 2026</span>
      </header>

      {/* Stats */}
      <section className="stats">
        <div className="stats-row">
          <div className="stat">
            <span className="stat-label">GAMES PLAYED</span>
            <span className="stat-value">{gamesPlayed}</span>
          </div>
          <div className="stats-divider" />
          <div className="stat">
            <span className="stat-label">CHRISTMAS POT</span>
            <span className="stat-value">£{christmasPot}</span>
          </div>
        </div>
        <div className="next-game">
          <span className="stat-label">NEXT GAME</span>
          <span className="next-game-date">{nextGameDate}</span>
        </div>
      </section>

      {/* Navigation Cards */}
      <nav className="nav-cards">
        {navCards.map((card) => (
          <button
            key={card.id}
            className="nav-card"
            onClick={() => navigate(card.path)}
          >
            <span className="card-icon">{card.icon}</span>
            <div className="card-text">
              <span className="card-title">{card.title}</span>
              <span className="card-subtitle">{card.subtitle}</span>
            </div>
            <span className="card-arrow">→</span>
          </button>
        ))}
      </nav>

      {/* Last Week's Winners */}
      <section className="winners">
        <span className="winners-title">LAST WEEK'S WINNERS</span>
        {loading ? (
          <div className="winners-loading">Loading...</div>
        ) : lastGameWithWinners ? (
          <div className="winners-podium">
            {/* 2nd place - left */}
            <div className="winner">
              <div className="winner-medal winner-medal-silver">2nd</div>
              <span className="winner-name">{lastGameWithWinners.second_place_player?.name}</span>
              <span className="winner-prize">£{lastGameWithWinners.second_place_prize}</span>
            </div>
            {/* 1st place - centre */}
            <div className="winner">
              <div className="winner-medal winner-medal-gold">1st</div>
              <span className="winner-name">{lastGameWithWinners.first_place_player?.name}</span>
              <span className="winner-prize">£{lastGameWithWinners.first_place_prize}</span>
            </div>
            {/* 3rd place - right */}
            <div className="winner">
              <div className="winner-medal winner-medal-bronze">3rd</div>
              <span className="winner-name">{lastGameWithWinners.third_place_player?.name}</span>
              <span className="winner-prize">£{lastGameWithWinners.third_place_prize}</span>
            </div>
          </div>
        ) : (
          <div className="winners-pending">Results pending</div>
        )}
      </section>

      {/* Footer */}
      <footer className="home-footer">
        {isAdmin ? (
          <div className="admin-footer">
            <span className="admin-indicator">Admin Mode</span>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        ) : (
          <span className="footer-text">Est. 2026</span>
        )}
      </footer>
    </div>
  )
}

export default HomeScreen
