import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import ScreenLayout from '../components/ScreenLayout'
import PlayerChipsSelector from '../components/PlayerChipsSelector'
import './GameDetailScreen.css'

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

function getGameStatus(game) {
  const hasWinners = game.first_place_player_id !== null

  if (game.is_complete && hasWinners) {
    return { label: 'Complete', className: 'complete' }
  } else if (hasWinners && !game.is_complete) {
    return { label: 'Attendees Required', className: 'attendees-required' }
  } else {
    return { label: 'Winners Required', className: 'winners-required' }
  }
}

function GameDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [game, setGame] = useState(null)
  const [allPlayers, setAllPlayers] = useState([])
  const [attendees, setAttendees] = useState([])
  const [selectedAttendees, setSelectedAttendees] = useState(new Set())
  const [saving, setSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false)
  const [editSelectedAttendees, setEditSelectedAttendees] = useState(new Set())
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState(null)

  // Add winners state
  const [firstPlace, setFirstPlace] = useState('')
  const [secondPlace, setSecondPlace] = useState('')
  const [thirdPlace, setThirdPlace] = useState('')
  const [firstPrize, setFirstPrize] = useState(0)
  const [secondPrize, setSecondPrize] = useState(0)
  const [thirdPrize, setThirdPrize] = useState(0)
  const [potAmount, setPotAmount] = useState(0)
  const [prizesAdjusted, setPrizesAdjusted] = useState(false)
  const [savingWinners, setSavingWinners] = useState(false)
  const [winnersError, setWinnersError] = useState(null)

  // Add new player state
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [addingPlayer, setAddingPlayer] = useState(false)
  const [addPlayerError, setAddPlayerError] = useState(null)

  // Unsaved changes tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showUnsavedModal, setShowUnsavedModal] = useState(false)

  // Track initial state for comparison
  const [initialAttendees, setInitialAttendees] = useState(new Set())

  useEffect(() => {
    fetchGameData()
  }, [id])

  async function fetchGameData() {
    try {
      setLoading(true)
      setError(null)

      // Fetch game details with winner names
      const { data: gameData, error: gameError } = await supabase
        .from('game_nights')
        .select(`
          *,
          first_place_player:first_place_player_id(id, name),
          second_place_player:second_place_player_id(id, name),
          third_place_player:third_place_player_id(id, name)
        `)
        .eq('id', id)
        .single()

      if (gameError) throw gameError
      setGame(gameData)

      // Fetch all active players
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, name')
        .eq('is_active', true)
        .order('name')

      if (playersError) throw playersError
      setAllPlayers(playersData || [])

      // Fetch existing attendees
      const { data: attendeesData, error: attendeesError } = await supabase
        .from('attendances')
        .select('player_id, players(name)')
        .eq('game_night_id', id)

      if (attendeesError) throw attendeesError
      setAttendees(attendeesData || [])

      // Set up attendance selection
      const hasWinners = gameData.first_place_player_id !== null
      if (!gameData.is_complete && hasWinners) {
        // Pre-select the winners for attendance
        const winners = new Set([
          gameData.first_place_player_id,
          gameData.second_place_player_id,
          gameData.third_place_player_id
        ])
        setSelectedAttendees(winners)
      } else if (!gameData.is_complete && !hasWinners) {
        // No winners yet, start with empty selection
        setSelectedAttendees(new Set())
      }

      // Fetch prize chart for this game's attendance count (for add winners form)
      if (!hasWinners) {
        const { data: prizeData } = await supabase
          .from('prize_chart')
          .select('*')
          .eq('num_players', gameData.attendance_count)
          .single()

        if (prizeData) {
          setFirstPrize(prizeData.first_prize)
          setSecondPrize(prizeData.second_prize)
          setThirdPrize(prizeData.third_prize)
          setPotAmount(prizeData.pot)
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load game')
    } finally {
      setLoading(false)
    }
  }

  function toggleAttendee(playerId) {
    // Don't allow deselecting winners if game has winners
    const hasWinners = game.first_place_player_id !== null
    if (hasWinners && (
      playerId === game.first_place_player_id ||
      playerId === game.second_place_player_id ||
      playerId === game.third_place_player_id
    )) {
      return
    }

    setSelectedAttendees(prev => {
      const next = new Set(prev)
      if (next.has(playerId)) {
        next.delete(playerId)
      } else {
        next.add(playerId)
      }
      return next
    })
    setHasUnsavedChanges(true)
  }

  const attendanceValid = selectedAttendees.size === game?.attendance_count

  async function handleCompleteAttendance() {
    if (!attendanceValid || saving) return

    try {
      setSaving(true)

      // Insert all attendances
      const attendanceRecords = Array.from(selectedAttendees).map(playerId => ({
        game_night_id: id,
        player_id: playerId
      }))

      const { error: insertError } = await supabase
        .from('attendances')
        .insert(attendanceRecords)

      if (insertError) throw insertError

      // Only mark as complete if winners also exist
      if (hasWinners) {
        const { error: updateError } = await supabase
          .from('game_nights')
          .update({ is_complete: true })
          .eq('id', id)

        if (updateError) throw updateError
      }

      // Refresh the data
      setHasUnsavedChanges(false)
      await fetchGameData()
    } catch (err) {
      setError(err.message || 'Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  // Handle adding new player
  async function handleAddPlayer() {
    if (!newPlayerName.trim() || addingPlayer) return

    try {
      setAddingPlayer(true)
      setAddPlayerError(null)

      const { data, error: insertError } = await supabase
        .from('players')
        .insert({ name: newPlayerName.trim(), is_active: true })
        .select('id, name')
        .single()

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('Player already exists')
        }
        throw insertError
      }

      // Add new player to the list and sort
      setAllPlayers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewPlayerName('')
      setShowAddPlayer(false)
    } catch (err) {
      setAddPlayerError(err.message || 'Failed to add player')
    } finally {
      setAddingPlayer(false)
    }
  }

  // Prize validation for add winners
  const prizeTotal = firstPrize + secondPrize + thirdPrize + potAmount
  const expectedTotal = game?.attendance_count * 20
  const prizesValid = prizeTotal === expectedTotal

  // Filter available players for winner dropdowns
  const availableForFirst = useMemo(() => {
    return allPlayers.filter(p => p.id !== secondPlace && p.id !== thirdPlace)
  }, [allPlayers, secondPlace, thirdPlace])

  const availableForSecond = useMemo(() => {
    return allPlayers.filter(p => p.id !== firstPlace && p.id !== thirdPlace)
  }, [allPlayers, firstPlace, thirdPlace])

  const availableForThird = useMemo(() => {
    return allPlayers.filter(p => p.id !== firstPlace && p.id !== secondPlace)
  }, [allPlayers, firstPlace, secondPlace])

  const winnersFormValid = useMemo(() => {
    return (
      firstPlace &&
      secondPlace &&
      thirdPlace &&
      firstPlace !== secondPlace &&
      firstPlace !== thirdPlace &&
      secondPlace !== thirdPlace &&
      prizesValid
    )
  }, [firstPlace, secondPlace, thirdPlace, prizesValid])

  async function handleSaveWinners() {
    if (!winnersFormValid || savingWinners) return

    try {
      setSavingWinners(true)
      setWinnersError(null)

      // If attendees already exist, mark as complete when adding winners
      const willBeComplete = attendees.length === game.attendance_count

      const { error: updateError } = await supabase
        .from('game_nights')
        .update({
          first_place_player_id: firstPlace,
          first_place_prize: firstPrize,
          second_place_player_id: secondPlace,
          second_place_prize: secondPrize,
          third_place_player_id: thirdPlace,
          third_place_prize: thirdPrize,
          pot_amount: potAmount,
          prizes_adjusted: Boolean(prizesAdjusted),
          is_complete: Boolean(willBeComplete)
        })
        .eq('id', id)

      if (updateError) throw updateError

      setHasUnsavedChanges(false)
      await fetchGameData()
    } catch (err) {
      setWinnersError(err.message || 'Failed to save winners')
    } finally {
      setSavingWinners(false)
    }
  }

  function handlePrizeChange(setter, value) {
    const numValue = parseInt(value) || 0
    setter(numValue)
    setPrizesAdjusted(true)
    setHasUnsavedChanges(true)
  }

  // Track winner selection changes
  function handleFirstPlaceChange(value) {
    setFirstPlace(value)
    setHasUnsavedChanges(true)
  }

  function handleSecondPlaceChange(value) {
    setSecondPlace(value)
    setHasUnsavedChanges(true)
  }

  function handleThirdPlaceChange(value) {
    setThirdPlace(value)
    setHasUnsavedChanges(true)
  }

  async function handleDelete() {
    if (deleting) return

    try {
      setDeleting(true)

      // Delete attendances first (foreign key constraint)
      await supabase
        .from('attendances')
        .delete()
        .eq('game_night_id', id)

      // Delete the game
      const { error: deleteError } = await supabase
        .from('game_nights')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      navigate('/games')
    } catch (err) {
      setError(err.message || 'Failed to delete game')
      setShowDeleteModal(false)
    } finally {
      setDeleting(false)
    }
  }

  // Get locked winner IDs for attendance (can't deselect winners)
  const lockedWinnerIds = useMemo(() => {
    if (!game) return new Set()
    const hasWinners = game.first_place_player_id !== null
    if (!hasWinners) return new Set()

    return new Set([
      game.first_place_player_id,
      game.second_place_player_id,
      game.third_place_player_id
    ])
  }, [game])

  // Handle new player added via PlayerChipsSelector
  function handleNewPlayerForAttendance(newPlayer) {
    setAllPlayers(prev => [...prev, newPlayer].sort((a, b) => a.name.localeCompare(b.name)))
  }

  // Enter edit mode
  async function enterEditMode() {
    // Pre-populate winners
    setFirstPlace(game.first_place_player_id || '')
    setSecondPlace(game.second_place_player_id || '')
    setThirdPlace(game.third_place_player_id || '')

    // If game has winners, use their prizes; otherwise fetch from prize chart
    if (game.first_place_player_id) {
      setFirstPrize(game.first_place_prize || 0)
      setSecondPrize(game.second_place_prize || 0)
      setThirdPrize(game.third_place_prize || 0)
      setPotAmount(game.pot_amount || 0)
      setPrizesAdjusted(game.prizes_adjusted || false)
    } else {
      // Fetch prize chart for games without winners
      const { data: prizeData } = await supabase
        .from('prize_chart')
        .select('*')
        .eq('num_players', game.attendance_count)
        .single()

      if (prizeData) {
        setFirstPrize(prizeData.first_prize)
        setSecondPrize(prizeData.second_prize)
        setThirdPrize(prizeData.third_prize)
        setPotAmount(prizeData.pot)
      }
      setPrizesAdjusted(false)
    }

    // Pre-populate attendees from existing records
    const existingAttendeeIds = new Set(attendees.map(a => a.player_id))
    // Also include winners if they exist
    if (game.first_place_player_id) existingAttendeeIds.add(game.first_place_player_id)
    if (game.second_place_player_id) existingAttendeeIds.add(game.second_place_player_id)
    if (game.third_place_player_id) existingAttendeeIds.add(game.third_place_player_id)
    setEditSelectedAttendees(existingAttendeeIds)

    setEditError(null)
    setIsEditMode(true)
  }

  // Exit edit mode
  function cancelEditMode() {
    setIsEditMode(false)
    setEditError(null)
  }

  // Toggle attendee in edit mode
  function toggleEditAttendee(playerId) {
    // Don't allow deselecting winners
    if (
      playerId === firstPlace ||
      playerId === secondPlace ||
      playerId === thirdPlace
    ) {
      return
    }

    setEditSelectedAttendees(prev => {
      const next = new Set(prev)
      if (next.has(playerId)) {
        next.delete(playerId)
      } else {
        next.add(playerId)
      }
      return next
    })
    setHasUnsavedChanges(true)
  }

  // Auto-add winners to edit attendees when changed
  useEffect(() => {
    if (isEditMode) {
      setEditSelectedAttendees(prev => {
        const next = new Set(prev)
        if (firstPlace) next.add(firstPlace)
        if (secondPlace) next.add(secondPlace)
        if (thirdPlace) next.add(thirdPlace)
        return next
      })
    }
  }, [firstPlace, secondPlace, thirdPlace, isEditMode])

  // Locked winner IDs in edit mode
  const editLockedWinnerIds = useMemo(() => {
    if (!isEditMode) return new Set()
    const ids = new Set()
    if (firstPlace) ids.add(firstPlace)
    if (secondPlace) ids.add(secondPlace)
    if (thirdPlace) ids.add(thirdPlace)
    return ids
  }, [isEditMode, firstPlace, secondPlace, thirdPlace])

  // Edit mode attendance validation
  const editAttendanceValid = editSelectedAttendees.size === game?.attendance_count

  // Edit form validation
  const editFormValid = useMemo(() => {
    const hasWinnersData = game?.first_place_player_id !== null
    const hasAttendeesData = attendees.length > 0

    // If game has winners, require valid winners
    if (hasWinnersData || firstPlace || secondPlace || thirdPlace) {
      if (!winnersFormValid) return false
    }

    // If game has attendees, require valid attendee count
    if (hasAttendeesData || editSelectedAttendees.size > 0) {
      if (!editAttendanceValid) return false
    }

    return true
  }, [game, attendees, firstPlace, secondPlace, thirdPlace, winnersFormValid, editSelectedAttendees, editAttendanceValid])

  // Save edit changes
  async function handleSaveEdit() {
    if (!editFormValid || savingEdit) return

    try {
      setSavingEdit(true)
      setEditError(null)

      const hasWinners = game.first_place_player_id !== null

      // Update game data
      const updateData = {}

      // Always update winners if we're editing them
      const willHaveWinners = !!(firstPlace && secondPlace && thirdPlace)
      if (hasWinners || willHaveWinners) {
        updateData.first_place_player_id = firstPlace || null
        updateData.first_place_prize = firstPrize
        updateData.second_place_player_id = secondPlace || null
        updateData.second_place_prize = secondPrize
        updateData.third_place_player_id = thirdPlace || null
        updateData.third_place_prize = thirdPrize
        updateData.pot_amount = potAmount
        updateData.prizes_adjusted = Boolean(prizesAdjusted)
      }

      // Update is_complete status
      const willHaveAttendees = editSelectedAttendees.size === game.attendance_count
      updateData.is_complete = willHaveWinners && willHaveAttendees

      const { error: updateError } = await supabase
        .from('game_nights')
        .update(updateData)
        .eq('id', id)

      if (updateError) throw updateError

      // Replace attendance records if we have attendees
      if (attendees.length > 0 || editSelectedAttendees.size > 0) {
        // Delete existing attendances
        await supabase
          .from('attendances')
          .delete()
          .eq('game_night_id', id)

        // Insert new attendances if count matches
        if (editSelectedAttendees.size === game.attendance_count) {
          const attendanceRecords = Array.from(editSelectedAttendees).map(playerId => ({
            game_night_id: id,
            player_id: playerId
          }))

          const { error: insertError } = await supabase
            .from('attendances')
            .insert(attendanceRecords)

          if (insertError) throw insertError
        }
      }

      setIsEditMode(false)
      setHasUnsavedChanges(false)
      await fetchGameData()
    } catch (err) {
      setEditError(err.message || 'Failed to save changes')
    } finally {
      setSavingEdit(false)
    }
  }

  // Handle back button with unsaved changes check
  function handleBeforeBack() {
    if (hasUnsavedChanges) {
      setShowUnsavedModal(true)
      return false // Block navigation
    }
    return true // Allow navigation
  }

  // Proceed with navigation (discard changes)
  function handleDiscardChanges() {
    setShowUnsavedModal(false)
    setHasUnsavedChanges(false)
    navigate('/games')
  }

  // Determine if we need sticky button spacing
  const showStickyButton = isEditMode || (attendees.length === 0 && !loading && isAdmin)

  if (loading) {
    return (
      <ScreenLayout title="Game Details" backPath="/games">
        <div className="loading-state">Loading...</div>
      </ScreenLayout>
    )
  }

  if (error && !game) {
    return (
      <ScreenLayout title="Game Details" backPath="/games">
        <div className="error-state">{error}</div>
      </ScreenLayout>
    )
  }

  const hasWinners = game.first_place_player_id !== null
  const status = getGameStatus(game)

  return (
    <ScreenLayout title="Game Details" backPath="/games" onBeforeBack={handleBeforeBack}>
      <div className={`game-detail-content ${showStickyButton ? 'has-sticky-button' : ''}`}>
        {/* Game Date Header */}
        <div className="detail-header">
          <h2 className="detail-date">{formatGameDate(game.game_date)}</h2>
          <span className={`status-badge ${status.className}`}>
            {status.label}
          </span>
        </div>

        {/* Results Section */}
        {hasWinners && !isEditMode ? (
          <section className="detail-section">
            <h3 className="section-label">RESULTS</h3>
            <div className="results-podium">
              {/* 2nd Place */}
              <div className="podium-place second">
                <div className="podium-badge silver">2nd</div>
                <div className="podium-name">{game.second_place_player?.name}</div>
                <div className="podium-prize">£{game.second_place_prize}</div>
              </div>

              {/* 1st Place */}
              <div className="podium-place first">
                <div className="podium-badge gold">1st</div>
                <div className="podium-name">{game.first_place_player?.name}</div>
                <div className="podium-prize">£{game.first_place_prize}</div>
              </div>

              {/* 3rd Place */}
              <div className="podium-place third">
                <div className="podium-badge bronze">3rd</div>
                <div className="podium-name">{game.third_place_player?.name}</div>
                <div className="podium-prize">£{game.third_place_prize}</div>
              </div>
            </div>
          </section>
        ) : isAdmin && (isEditMode || !hasWinners) ? (
          <section className="detail-section">
            <h3 className="section-label">{isEditMode ? 'EDIT WINNERS' : 'ADD WINNERS'}</h3>
            <div className="add-winners-form">
              <div className="winners-list">
                {/* 1st Place */}
                <div className="winner-row">
                  <div className="position-badge position-gold">1st</div>
                  <select
                    className="player-select"
                    value={firstPlace}
                    onChange={(e) => handleFirstPlaceChange(e.target.value)}
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
                    onChange={(e) => handleSecondPlaceChange(e.target.value)}
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
                    onChange={(e) => handleThirdPlaceChange(e.target.value)}
                  >
                    <option value="">Select player...</option>
                    {availableForThird.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Add new player */}
              {!showAddPlayer ? (
                <button
                  className="add-player-link"
                  onClick={() => setShowAddPlayer(true)}
                >
                  + Add new player
                </button>
              ) : (
                <div className="add-player-form">
                  <input
                    type="text"
                    className="add-player-input"
                    placeholder="Player name"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    autoFocus
                  />
                  <div className="add-player-buttons">
                    <button
                      className="add-player-cancel"
                      onClick={() => {
                        setShowAddPlayer(false)
                        setNewPlayerName('')
                        setAddPlayerError(null)
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="add-player-submit"
                      onClick={handleAddPlayer}
                      disabled={!newPlayerName.trim() || addingPlayer}
                    >
                      {addingPlayer ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                  {addPlayerError && (
                    <div className="add-player-error">{addPlayerError}</div>
                  )}
                </div>
              )}

              {/* Prize Breakdown */}
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
                      Prizes must equal {game.attendance_count} × £20
                    </span>
                  )}
                </div>
              </div>

              {!isEditMode && (
                <>
                  <button
                    className={`save-winners-btn ${!winnersFormValid ? 'disabled' : ''}`}
                    onClick={handleSaveWinners}
                    disabled={!winnersFormValid || savingWinners}
                  >
                    {savingWinners ? 'Saving...' : 'Save Winners'}
                  </button>

                  {winnersError && (
                    <div className="save-error">{winnersError}</div>
                  )}
                </>
              )}
            </div>
          </section>
        ) : null}

        {/* Game Stats */}
        <section className="detail-section">
          <h3 className="section-label">GAME INFO</h3>
          <div className="stats-card">
            <div className="stat-row">
              <span className="stat-label">Players</span>
              <span className="stat-value">{game.attendance_count}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Buy-in Total</span>
              <span className="stat-value">£{game.attendance_count * 20}</span>
            </div>
            {hasWinners && (
              <div className="stat-row">
                <span className="stat-label">Christmas Pot</span>
                <span className="stat-value">£{game.pot_amount}</span>
              </div>
            )}
            {game.prizes_adjusted && (
              <div className="stat-note">Prizes were manually adjusted</div>
            )}
          </div>
        </section>

        {/* Attendance Section */}
        {attendees.length > 0 && !isEditMode ? (
          <section className="detail-section">
            <h3 className="section-label">ATTENDEES ({attendees.length})</h3>
            <div className="attendees-list">
              {attendees.map(a => (
                <div key={a.player_id} className="attendee-chip">
                  {a.players?.name}
                </div>
              ))}
            </div>
          </section>
        ) : isEditMode ? (
          <section className="detail-section">
            <h3 className="section-label">
              EDIT ATTENDEES ({editSelectedAttendees.size}/{game.attendance_count})
            </h3>
            <p className="section-hint">
              Select all {game.attendance_count} players who attended.
              {(firstPlace || secondPlace || thirdPlace) && ' Winners are locked.'}
            </p>

            <PlayerChipsSelector
              players={allPlayers}
              selectedIds={editSelectedAttendees}
              onToggle={toggleEditAttendee}
              onPlayersChange={handleNewPlayerForAttendance}
              lockedIds={editLockedWinnerIds}
              targetCount={game.attendance_count}
              showCounter={false}
            />
          </section>
        ) : isAdmin ? (
          <section className="detail-section">
            <h3 className="section-label">
              COMPLETE ATTENDANCE ({selectedAttendees.size}/{game.attendance_count})
            </h3>
            <p className="section-hint">
              Select all {game.attendance_count} players who attended.
              {hasWinners && ' Winners are pre-selected.'}
            </p>

            <PlayerChipsSelector
              players={allPlayers}
              selectedIds={selectedAttendees}
              onToggle={toggleAttendee}
              onPlayersChange={handleNewPlayerForAttendance}
              lockedIds={lockedWinnerIds}
              targetCount={game.attendance_count}
              showCounter={false}
            />

            {error && <div className="save-error">{error}</div>}
          </section>
        ) : null}

        {/* Actions Section - only show when not in edit mode and user is admin */}
        {!isEditMode && isAdmin && (
          <>
            {/* Edit Button - show for complete or partial games */}
            {(game.is_complete || hasWinners || attendees.length > 0) && (
              <section className="detail-section">
                <button
                  className="edit-game-btn"
                  onClick={enterEditMode}
                >
                  Edit Game Night
                </button>
              </section>
            )}

            {/* Delete Section */}
            <section className="detail-section danger-zone">
              <h3 className="section-label danger">DANGER ZONE</h3>
              <button
                className="delete-btn"
                onClick={() => setShowDeleteModal(true)}
              >
                Delete Game Night
              </button>
            </section>
          </>
        )}

        {/* Edit mode error display (non-sticky) */}
        {isEditMode && editError && (
          <div className="save-error">{editError}</div>
        )}
      </div>

      {/* Sticky Complete Attendance Button */}
      {!isEditMode && attendees.length === 0 && isAdmin && (
        <div className="sticky-button-bar">
          <button
            className={`complete-btn ${!attendanceValid ? 'disabled' : ''}`}
            onClick={handleCompleteAttendance}
            disabled={!attendanceValid || saving}
          >
            {saving ? 'Saving...' : 'Complete Attendance'}
          </button>
        </div>
      )}

      {/* Sticky Edit Mode Actions */}
      {isEditMode && (
        <div className="sticky-button-bar">
          <div className="edit-actions">
            <button
              className="cancel-edit-btn"
              onClick={cancelEditMode}
              disabled={savingEdit}
            >
              Cancel
            </button>
            <button
              className={`save-edit-btn ${!editFormValid ? 'disabled' : ''}`}
              onClick={handleSaveEdit}
              disabled={!editFormValid || savingEdit}
            >
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <p className="modal-message">Delete this game night?</p>
            <p className="modal-subtitle">This cannot be undone</p>
            <div className="modal-buttons">
              <button
                className="modal-btn modal-btn-secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="modal-btn modal-btn-danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Modal */}
      {showUnsavedModal && (
        <div className="modal-overlay" onClick={() => setShowUnsavedModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <p className="modal-message">You have unsaved changes</p>
            <p className="modal-subtitle">Your selections will be lost</p>
            <div className="modal-buttons">
              <button
                className="modal-btn modal-btn-secondary"
                onClick={handleDiscardChanges}
              >
                Discard
              </button>
              <button
                className="modal-btn modal-btn-primary"
                onClick={() => setShowUnsavedModal(false)}
              >
                Keep Editing
              </button>
            </div>
          </div>
        </div>
      )}
    </ScreenLayout>
  )
}

export default GameDetailScreen
