import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ScreenLayout from '../components/ScreenLayout'
import './NewGameScreen.css'

function getOrdinalSuffix(day) {
  if (day >= 11 && day <= 13) return 'th'
  switch (day % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

function formatDateDisplay(date) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December']
  const d = new Date(date)
  const dayName = days[d.getDay()]
  const dayNum = d.getDate()
  const month = months[d.getMonth()]
  const year = d.getFullYear()
  return `${dayName} ${dayNum}${getOrdinalSuffix(dayNum)} ${month} ${year}`
}

function formatDateForInput(date) {
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

function getSmartDefaultDate(existingDates) {
  const existingSet = new Set(existingDates.map(d => d.split('T')[0]))
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Start from today and work backwards
  let checkDate = new Date(today)

  // First, find the most recent Thursday on or before today
  while (checkDate.getDay() !== 4) {
    checkDate.setDate(checkDate.getDate() - 1)
  }

  // Check this Thursday and previous Thursdays until we find one without an entry
  for (let i = 0; i < 52; i++) { // Check up to a year back
    const dateStr = formatDateForInput(checkDate)
    if (!existingSet.has(dateStr)) {
      return dateStr
    }
    checkDate.setDate(checkDate.getDate() - 7) // Go back a week
  }

  // Fallback to today if all Thursdays have entries
  return formatDateForInput(today)
}

function NewGameScreen() {
  const navigate = useNavigate()

  // Loading and error states
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [saving, setSaving] = useState(false)

  // Data from Supabase
  const [players, setPlayers] = useState([])
  const [existingDates, setExistingDates] = useState([])
  const [prizeChart, setPrizeChart] = useState({})

  // Form state
  const [gameDate, setGameDate] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [attendanceCount, setAttendanceCount] = useState(18)
  const [firstPlace, setFirstPlace] = useState('')
  const [secondPlace, setSecondPlace] = useState('')
  const [thirdPlace, setThirdPlace] = useState('')
  const [firstPrize, setFirstPrize] = useState(160)
  const [secondPrize, setSecondPrize] = useState(90)
  const [thirdPrize, setThirdPrize] = useState(50)
  const [potAmount, setPotAmount] = useState(60)
  const [prizesAdjusted, setPrizesAdjusted] = useState(false)

  // Fetch initial data on mount
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        // Fetch all active players
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('id, name')
          .eq('is_active', true)
          .order('name')

        if (playersError) throw playersError
        setPlayers(playersData || [])

        // Fetch existing game night dates
        const { data: datesData, error: datesError } = await supabase
          .from('game_nights')
          .select('game_date')

        if (datesError) throw datesError
        const dates = (datesData || []).map(d => d.game_date)
        setExistingDates(dates)

        // Calculate smart default date
        const defaultDate = getSmartDefaultDate(dates)
        setGameDate(defaultDate)

        // Fetch prize chart for default attendance
        await fetchPrizeChart(18)

      } catch (err) {
        setError(err.message || 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Fetch prize chart when attendance changes
  async function fetchPrizeChart(count) {
    try {
      const { data, error: prizeError } = await supabase
        .from('prize_chart')
        .select('*')
        .eq('num_players', count)
        .single()

      if (prizeError) throw prizeError

      if (data) {
        setPrizeChart(data)
        if (!prizesAdjusted) {
          setFirstPrize(data.first_prize)
          setSecondPrize(data.second_prize)
          setThirdPrize(data.third_prize)
          setPotAmount(data.pot)
        }
      }
    } catch (err) {
      console.error('Failed to fetch prize chart:', err)
    }
  }

  // Handle attendance change
  function handleAttendanceChange(delta) {
    const newCount = Math.min(36, Math.max(12, attendanceCount + delta))
    if (newCount !== attendanceCount) {
      setAttendanceCount(newCount)
      setPrizesAdjusted(false) // Reset adjusted flag when attendance changes
      fetchPrizeChart(newCount)
    }
  }

  // Handle prize changes
  function handlePrizeChange(setter, value) {
    const numValue = parseInt(value) || 0
    setter(numValue)
    setPrizesAdjusted(true)
  }

  // Filter available players for each dropdown
  const availableForFirst = useMemo(() => {
    return players.filter(p => p.id !== secondPlace && p.id !== thirdPlace)
  }, [players, secondPlace, thirdPlace])

  const availableForSecond = useMemo(() => {
    return players.filter(p => p.id !== firstPlace && p.id !== thirdPlace)
  }, [players, firstPlace, thirdPlace])

  const availableForThird = useMemo(() => {
    return players.filter(p => p.id !== firstPlace && p.id !== secondPlace)
  }, [players, firstPlace, secondPlace])

  // Validation
  const prizeTotal = firstPrize + secondPrize + thirdPrize + potAmount
  const expectedTotal = attendanceCount * 20
  const prizesValid = prizeTotal === expectedTotal

  const isFormValid = useMemo(() => {
    return (
      gameDate &&
      attendanceCount >= 12 &&
      attendanceCount <= 36 &&
      firstPlace &&
      secondPlace &&
      thirdPlace &&
      firstPlace !== secondPlace &&
      firstPlace !== thirdPlace &&
      secondPlace !== thirdPlace &&
      prizesValid
    )
  }, [gameDate, attendanceCount, firstPlace, secondPlace, thirdPlace, prizesValid])

  // Handle save
  async function handleSave() {
    if (!isFormValid || saving) return

    try {
      setSaving(true)
      setSaveError(null)

      const { error: insertError } = await supabase
        .from('game_nights')
        .insert({
          game_date: gameDate,
          attendance_count: attendanceCount,
          first_place_player_id: firstPlace,
          first_place_prize: firstPrize,
          second_place_player_id: secondPlace,
          second_place_prize: secondPrize,
          third_place_player_id: thirdPlace,
          third_place_prize: thirdPrize,
          pot_amount: potAmount,
          prizes_adjusted: prizesAdjusted,
          is_complete: false
        })

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('A game night already exists for this date')
        }
        throw insertError
      }

      navigate('/games')
    } catch (err) {
      setSaveError(err.message || 'Failed to save game night')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <ScreenLayout title="New Game">
        <div className="loading-state">
          <span>Loading...</span>
        </div>
      </ScreenLayout>
    )
  }

  if (error) {
    return (
      <ScreenLayout title="New Game">
        <div className="error-state">
          <span>{error}</span>
        </div>
      </ScreenLayout>
    )
  }

  return (
    <ScreenLayout title="New Game">
      <div className="new-game-form">
        {/* Section 1: Game Date */}
        <section className="form-section">
          <label className="section-label">GAME DATE</label>
          <div className="date-display">
            <span className="date-text">{formatDateDisplay(gameDate)}</span>
            <button
              className="change-btn"
              onClick={() => setShowDatePicker(!showDatePicker)}
            >
              {showDatePicker ? 'Done' : 'Change'}
            </button>
          </div>
          {showDatePicker && (
            <input
              type="date"
              className="date-input"
              value={gameDate}
              onChange={(e) => setGameDate(e.target.value)}
            />
          )}
        </section>

        {/* Section 2: Attendance */}
        <section className="form-section">
          <label className="section-label">ATTENDEES</label>
          <div className="attendance-control">
            <button
              className="attendance-btn"
              onClick={() => handleAttendanceChange(-1)}
              disabled={attendanceCount <= 12}
            >
              −
            </button>
            <span className="attendance-number">{attendanceCount}</span>
            <button
              className="attendance-btn"
              onClick={() => handleAttendanceChange(1)}
              disabled={attendanceCount >= 36}
            >
              +
            </button>
          </div>
        </section>

        {/* Section 3: Winners */}
        <section className="form-section">
          <label className="section-label">WINNERS</label>
          <div className="winners-list">
            {/* 1st Place */}
            <div className="winner-row">
              <div className="position-badge position-gold">1st</div>
              <select
                className="player-select"
                value={firstPlace}
                onChange={(e) => setFirstPlace(e.target.value)}
              >
                <option value="">Select player...</option>
                {availableForFirst.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* 2nd Place */}
            <div className="winner-row">
              <div className="position-badge position-silver">2nd</div>
              <select
                className="player-select"
                value={secondPlace}
                onChange={(e) => setSecondPlace(e.target.value)}
              >
                <option value="">Select player...</option>
                {availableForSecond.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* 3rd Place */}
            <div className="winner-row">
              <div className="position-badge position-bronze">3rd</div>
              <select
                className="player-select"
                value={thirdPlace}
                onChange={(e) => setThirdPlace(e.target.value)}
              >
                <option value="">Select player...</option>
                {availableForThird.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Section 4: Prize Breakdown */}
        <section className="form-section">
          <label className="section-label">PRIZE BREAKDOWN</label>
          <div className="prize-card">
            <div className="prize-grid">
              <div className="prize-item">
                <span className="prize-label">1st Prize</span>
                <div className="prize-input-wrapper">
                  <span className="currency">£</span>
                  <input
                    type="number"
                    className="prize-input"
                    value={firstPrize}
                    onChange={(e) => handlePrizeChange(setFirstPrize, e.target.value)}
                  />
                </div>
              </div>
              <div className="prize-item">
                <span className="prize-label">2nd Prize</span>
                <div className="prize-input-wrapper">
                  <span className="currency">£</span>
                  <input
                    type="number"
                    className="prize-input"
                    value={secondPrize}
                    onChange={(e) => handlePrizeChange(setSecondPrize, e.target.value)}
                  />
                </div>
              </div>
              <div className="prize-item">
                <span className="prize-label">3rd Prize</span>
                <div className="prize-input-wrapper">
                  <span className="currency">£</span>
                  <input
                    type="number"
                    className="prize-input"
                    value={thirdPrize}
                    onChange={(e) => handlePrizeChange(setThirdPrize, e.target.value)}
                  />
                </div>
              </div>
              <div className="prize-item">
                <span className="prize-label">Pot</span>
                <div className="prize-input-wrapper">
                  <span className="currency">£</span>
                  <input
                    type="number"
                    className="prize-input"
                    value={potAmount}
                    onChange={(e) => handlePrizeChange(setPotAmount, e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="prize-validation">
              <div className={`prize-total ${!prizesValid ? 'invalid' : ''}`}>
                Total: £{prizeTotal}
              </div>
              <div className="prize-expected">
                Expected: £{expectedTotal}
              </div>
              {prizesValid ? (
                <span className="validation-check">✓</span>
              ) : (
                <span className="validation-error">
                  Prizes must equal {attendanceCount} × £20
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Section 5: Save Button */}
        <section className="form-section save-section">
          <button
            className={`save-btn ${!isFormValid ? 'disabled' : ''}`}
            onClick={handleSave}
            disabled={!isFormValid || saving}
          >
            {saving ? 'Saving...' : 'Save Game Night'}
          </button>
          {saveError && (
            <div className="save-error">{saveError}</div>
          )}
        </section>
      </div>
    </ScreenLayout>
  )
}

export default NewGameScreen
