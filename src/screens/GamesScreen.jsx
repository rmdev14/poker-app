import { useNavigate } from 'react-router-dom'
import ScreenLayout from '../components/ScreenLayout'
import './GamesScreen.css'

function GamesScreen() {
  const navigate = useNavigate()

  return (
    <ScreenLayout title="Games">
      <div className="games-content">
        <button
          className="new-game-btn"
          onClick={() => navigate('/games/new')}
        >
          New Game Night
        </button>

        <section className="game-history">
          <h2 className="history-title">GAME HISTORY</h2>
          <p className="history-empty">No games recorded yet</p>
        </section>
      </div>
    </ScreenLayout>
  )
}

export default GamesScreen
