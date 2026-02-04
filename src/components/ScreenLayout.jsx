import { useNavigate } from 'react-router-dom'
import './ScreenLayout.css'

function ScreenLayout({ children, title, showBack = true }) {
  const navigate = useNavigate()

  return (
    <div className="screen-layout">
      {showBack && (
        <header className="screen-header">
          <button className="back-button" onClick={() => navigate('/')}>
            <span className="back-arrow">←</span>
            <span>Back</span>
          </button>
          {title && <h1 className="screen-title">{title}</h1>}
        </header>
      )}
      <main className="screen-content">
        {children}
      </main>
    </div>
  )
}

export default ScreenLayout
