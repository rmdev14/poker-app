import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import ScreenLayout from '../components/ScreenLayout'
import PlayerChipsSelector from '../components/PlayerChipsSelector'
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

  let checkDate = new Date(today)

  while (checkDate.getDay() !== 4) {
    checkDate.setDate(checkDate.getDate() - 1)
  }

  for (let i = 0; i < 52; i++) {
    const dateStr = formatDateForInput(checkDate)
    if (!existingSet.has(dateStr)) {
      return dateStr
    }
    checkDate.setDate(checkDate.getDate() - 7)
  }

  return formatDateForInput(today)
}

function NewGameScreen() {
  const navigate = useNavigate()
  const { isAdmin, loading: authLoading } = useAuth()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/admin/login')
    }
  }, [isAdmin, authLoading, navigate])

  // Loading and error states
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [saving, setSaving] = useState(false)

  // Data from Supabase
  const [players, setPlayers] = useState([])
  const [existingDates, setExistingDates] = useState([])

  // Form state
  const [gameDate, setGameDate] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [attendanceCount, setAttendanceCount] = useState(18)
  const [addWinnersNow, setAddWinnersNow] = useState(true)
  const [firstPlace, setFirstPlace] = useState('')
  const [secondPlace, setSecondPlace] = useState('')
  const [thirdPlace, setThirdPlace] = useState('')
  const [firstPrize, setFirstPrize] = useState(160)
  const [secondPrize, setSecondPrize] = useState(90)
  const [thirdPrize, setThirdPrize] = useState(50)
  const [potAmount, setPotAmount] = useState(60)
  const [prizesAdjusted, setPrizesAdjusted] = useState(false)
  const [validationOverride, setValidationOverride] = useState(false)

  // Attendance selection state
  const [addAttendeesNow, setAddAttendeesNow] = useState(true)
  const [selectedAttendees, setSelectedAttendees] = useState(new Set())

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showMismatchModal, setShowMismatchModal] = useState(false)

  // Fetch initial data on mount
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('id, name')
          .eq('is_active', true)
          .order('name')

        if (playersError) throw playersError
        setPlayers(playersData || [])

        const { data: datesData, error: datesError } = await supabase
          .from('game_nights')
          .select('game_date')

        if (datesError) throw datesError
        const dates = (datesData || []).map(d => d.game_date)
        setExistingDates(dates)

        const defaultDate = getSmartDefaultDate(dates)
        setGameDate(defaultDate)

        await fetchPrizeChart(18)

      } catch (err) {
        setError('Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  async function fetchPrizeChart(count) {
    try {
      const { data, error: prizeError } = await supabase
        .from('prize_chart')
        .select('*')
        .eq('num_players', count)
        .single()

      if (prizeError) throw prizeError

      if (data) {
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

  function handleAttendanceChange(delta) {
    const newCount = Math.min(36, Math.max(12, attendanceCount + delta))
    if (newCount !== attendanceCount) {
      setAttendanceCount(newCount)
      setPrizesAdjusted(false)
      fetchPrizeChart(newCount)
    }
  }

  function handlePrizeChange(setter, value) {
    const numValue = parseInt(value) || 0
    setter(numValue)
    setPrizesAdjusted(true)
  }

  // Handle new player added
  function handleNewPlayer(newPlayer) {
    setPlayers(prev => [...prev, newPlayer].sort((a, b) => a.name.localeCompare(b.name)))
  }

  // Toggle attendee selection
  function toggleAttendee(playerId) {
    setSelectedAttendees(prev => {
      const next = new Set(prev)
      if (next.has(playerId)) {
        next.delete(playerId)
      } else {
        next.add(playerId)
      }
      return next
    })
  }

  // Auto-select winners in attendance when they're chosen
  useEffect(() => {
    if (addWinnersNow) {
      setSelectedAttendees(prev => {
        const next = new Set(prev)
        if (firstPlace) next.add(firstPlace)
        if (secondPlace) next.add(secondPlace)
        if (thirdPlace) next.add(thirdPlace)
        return next
      })
    }
  }, [firstPlace, secondPlace, thirdPlace, addWinnersNow])

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

  // Check if date is more than 7 days ago
  const isDateOld = useMemo(() => {
    if (!gameDate) return false
    const selected = new Date(gameDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diffDays = (today - selected) / (1000 * 60 * 60 * 24)
    return diffDays > 7
  }, [gameDate])

  // Validation
  const prizeTotal = firstPrize + secondPrize + thirdPrize + potAmount
  const expectedTotal = attendanceCount * 20
  const prizeTotalsMatch = prizeTotal === expectedTotal
  const prizesValid = prizeTotalsMatch || validationOverride

  const isFormValid = useMemo(() => {
    const basicValid = gameDate && attendanceCount >= 12 && attendanceCount <= 36

    if (!addWinnersNow) {
      return basicValid
    }

    return (
      basicValid &&
      firstPlace &&
      secondPlace &&
      thirdPlace &&
      firstPlace !== secondPlace &&
      firstPlace !== thirdPlace &&
      secondPlace !== thirdPlace &&
      prizesValid
    )
  }, [gameDate, attendanceCount, addWinnersNow, firstPlace, secondPlace, thirdPlace, prizesValid])

  // Get locked winner IDs for attendance chips
  const lockedWinnerIds = useMemo(() => {
    if (!addWinnersNow) return new Set()
    const ids = new Set()
    if (firstPlace) ids.add(firstPlace)
    if (secondPlace) ids.add(secondPlace)
    if (thirdPlace) ids.add(thirdPlace)
    return ids
  }, [addWinnersNow, firstPlace, secondPlace, thirdPlace])

  // Check if attendee count mismatch
  function hasAttendeeMismatch() {
    return addAttendeesNow &&
           selectedAttendees.size > 0 &&
           selectedAttendees.size !== attendanceCount
  }

  // Check if confirmation is needed (no winners or attendees)
  function needsConfirmation() {
    const hasWinners = addWinnersNow && firstPlace && secondPlace && thirdPlace
    const hasAttendees = addAttendeesNow && selectedAttendees.size > 0
    return !hasWinners && !hasAttendees
  }

  // Handle save button click
  function handleSaveClick() {
    if (!isFormValid || saving) return

    // Check mismatch first (takes priority)
    if (hasAttendeeMismatch()) {
      setShowMismatchModal(true)
    } else if (needsConfirmation()) {
      setShowConfirmModal(true)
    } else {
      performSave()
    }
  }

  // Handle save
  async function performSave(skipAttendees = false) {
    if (!isFormValid || saving) return
    setShowConfirmModal(false)
    setShowMismatchModal(false)

    try {
      setSaving(true)
      setSaveError(null)

      const gameData = {
        game_date: gameDate,
        attendance_count: attendanceCount,
        is_complete: false
      }

      if (addWinnersNow) {
        gameData.first_place_player_id = firstPlace
        gameData.first_place_prize = firstPrize
        gameData.second_place_player_id = secondPlace
        gameData.second_place_prize = secondPrize
        gameData.third_place_player_id = thirdPlace
        gameData.third_place_prize = thirdPrize
        gameData.pot_amount = potAmount
        gameData.prizes_adjusted = Boolean(prizesAdjusted)
        gameData.validation_overridden = Boolean(validationOverride)
      } else {
        gameData.first_place_player_id = null
        gameData.first_place_prize = null
        gameData.second_place_player_id = null
        gameData.second_place_prize = null
        gameData.third_place_player_id = null
        gameData.third_place_prize = null
        gameData.pot_amount = null
        gameData.prizes_adjusted = false
      }

      // Insert the game night
      const { data: insertedGame, error: insertError } = await supabase
        .from('game_nights')
        .insert(gameData)
        .select('id')
        .single()

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('A game night already exists for this date')
        }
        throw insertError
      }

      // If attendees were selected and count matches, save them (unless skipping)
      if (!skipAttendees && selectedAttendees.size > 0 && selectedAttendees.size === attendanceCount) {
        const attendanceRecords = Array.from(selectedAttendees).map(playerId => ({
          game_night_id: insertedGame.id,
          player_id: playerId
        }))

        const { error: attendanceError } = await supabase
          .from('attendances')
          .insert(attendanceRecords)

        if (attendanceError) {
          console.error('Failed to save attendances:', attendanceError)
        } else {
          // Mark game as complete if we have both winners and attendees
          if (addWinnersNow) {
            const { error: completeError } = await supabase
              .from('game_nights')
              .update({ is_complete: true })
              .eq('id', insertedGame.id)

            if (completeError) {
              console.error('Failed to mark game as complete:', completeError)
            }
          }
        }
      }

      navigate('/games')
    } catch (err) {
      const message = err.message === 'A game night already exists for this date'
        ? err.message
        : 'Failed to save game night'
      setSaveError(message)
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
          {isDateOld && (
            <div className="date-warning">
              <span className="date-warning-icon">⚠</span>
              <span>This date is over a week ago — is that correct?</span>
            </div>
          )}
        </section>

        {/* Section 2: Attendance Count */}
        <section className="form-section">
          <label className="section-label">NUMBER OF PLAYERS</label>
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

        {/* Section 3: Winners Toggle & Selection */}
        <section className="form-section">
          <div className="section-header-with-toggle">
            <label className="section-label">WINNERS</label>
            <button
              className={`toggle ${addWinnersNow ? 'on' : 'off'}`}
              onClick={() => setAddWinnersNow(!addWinnersNow)}
            >
              <span className="toggle-label">Add winners now?</span>
              <span className="toggle-track">
                <span className="toggle-thumb" />
              </span>
            </button>
          </div>

          {addWinnersNow && (
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
          )}
        </section>

        {/* Section 4: Prize Breakdown - Always visible */}
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
                    readOnly={!addWinnersNow}
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
                    readOnly={!addWinnersNow}
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
                    readOnly={!addWinnersNow}
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
                    readOnly={!addWinnersNow}
                  />
                </div>
              </div>
            </div>

            <div className="prize-validation">
              <div className={`prize-total ${addWinnersNow && !prizesValid ? 'invalid' : ''}`}>
                Total: £{prizeTotal}
              </div>
              <div className="prize-expected">
                Expected: £{expectedTotal}
              </div>
              {addWinnersNow && (
                prizeTotalsMatch ? (
                  <span className="validation-check">✓</span>
                ) : validationOverride ? (
                  <span className="validation-override-badge">Manual override</span>
                ) : (
                  <span className="validation-error">
                    Prizes must equal {attendanceCount} × £20
                  </span>
                )
              )}
            </div>

            {/* Override toggle - show when prizes don't match and winners are being added */}
            {addWinnersNow && !prizeTotalsMatch && (
              <div className="override-toggle-row">
                <button
                  className={`toggle small ${validationOverride ? 'on' : 'off'}`}
                  onClick={() => setValidationOverride(!validationOverride)}
                >
                  <span className="toggle-label">Override validation</span>
                  <span className="toggle-track">
                    <span className="toggle-thumb" />
                  </span>
                </button>
                {validationOverride && (
                  <span className="override-hint">Prizes will be saved as entered</span>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Section 5: Attendees Selection */}
        <section className="form-section">
          <div className="section-header-with-toggle">
            <label className="section-label">ATTENDEES</label>
            <button
              className={`toggle ${addAttendeesNow ? 'on' : 'off'}`}
              onClick={() => setAddAttendeesNow(!addAttendeesNow)}
            >
              <span className="toggle-label">Add attendees now?</span>
              <span className="toggle-track">
                <span className="toggle-thumb" />
              </span>
            </button>
          </div>

          {addAttendeesNow && (
            <>
              <p className="section-hint">
                Select individual players who attended.
                {addWinnersNow && ' Winners are automatically included.'}
              </p>
              <PlayerChipsSelector
                players={players}
                selectedIds={selectedAttendees}
                onToggle={toggleAttendee}
                onPlayersChange={handleNewPlayer}
                lockedIds={lockedWinnerIds}
                targetCount={attendanceCount}
                showCounter={true}
              />
            </>
          )}
        </section>

        {/* Section 6: Save Button */}
        <section className="form-section save-section">
          <button
            className={`save-btn ${!isFormValid ? 'disabled' : ''}`}
            onClick={handleSaveClick}
            disabled={!isFormValid || saving}
          >
            {saving ? 'Saving...' : (addWinnersNow ? 'Save Game Night' : 'Save Without Winners')}
          </button>
          {saveError && (
            <div className="save-error">{saveError}</div>
          )}
        </section>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="confirm-modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <p className="confirm-message">No winners or attendees selected</p>
            <p className="confirm-subtitle">Save with just the date and player count?</p>
            <div className="confirm-buttons">
              <button
                className="confirm-btn confirm-btn-secondary"
                onClick={() => setShowConfirmModal(false)}
              >
                Go Back
              </button>
              <button
                className="confirm-btn confirm-btn-primary"
                onClick={() => performSave()}
              >
                Save Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendee Mismatch Modal */}
      {showMismatchModal && (
        <div className="confirm-modal-overlay" onClick={() => setShowMismatchModal(false)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <p className="confirm-message">
              {selectedAttendees.size < attendanceCount
                ? `You entered ${attendanceCount} players but have only selected ${selectedAttendees.size} attendee names`
                : `You entered ${attendanceCount} players but have selected ${selectedAttendees.size} attendee names — that's too many`
              }
            </p>
            <div className="confirm-buttons">
              <button
                className="confirm-btn confirm-btn-secondary"
                onClick={() => setShowMismatchModal(false)}
              >
                Fix Selection
              </button>
              <button
                className="confirm-btn confirm-btn-primary"
                onClick={() => performSave(true)}
              >
                Save Without Names
              </button>
            </div>
          </div>
        </div>
      )}
    </ScreenLayout>
  )
}

export default NewGameScreen
