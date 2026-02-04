import { useNavigate } from 'react-router-dom'
import './ScreenLayout.css'

function ScreenLayout({ children, title, showBack = true, backPath = '/' }) {
  const navigate = useNavigate()

  return (
    <div className="screen-layout">
      {showBack && (
        <header className="screen-header">
          <div className="header-row">
            <button className="back-button" onClick={() => navigate(backPath)}>
              <span className="back-arrow">←</span>
              <span>BACK</span>
            </button>
            <span className="header-branding">MINNESOTA FATS</span>
          </div>
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
