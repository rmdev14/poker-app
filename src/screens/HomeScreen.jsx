import { useNavigate } from 'react-router-dom'
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
  const nextGameDate = getNextThursday()

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
        <span className="brand-top">MINNESOTA FATS</span>
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
            <span className="stat-value">0</span>
          </div>
          <div className="stats-divider" />
          <div className="stat">
            <span className="stat-label">CHRISTMAS POT</span>
            <span className="stat-value">£0</span>
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

      {/* Footer */}
      <footer className="home-footer">
        <span>Est. 2026</span>
      </footer>
    </div>
  )
}

export default HomeScreen
