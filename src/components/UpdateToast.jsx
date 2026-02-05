import { useState, useEffect, useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import './UpdateToast.css'

function UpdateToast() {
  const [showToast, setShowToast] = useState(false)
  const intervalRef = useRef(null)

  const {
    needRefresh: [needRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      // Check for updates every 60 seconds
      if (r) {
        intervalRef.current = setInterval(() => {
          r.update()
        }, 60 * 1000)
      }
    }
  })

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (needRefresh) {
      setShowToast(true)
    }
  }, [needRefresh])

  const handleRefresh = () => {
    updateServiceWorker(true)
  }

  if (!showToast) return null

  return (
    <div className="update-toast">
      <span className="update-toast-text">Update available</span>
      <button className="update-toast-btn" onClick={handleRefresh}>
        Refresh
      </button>
    </div>
  )
}

export default UpdateToast
