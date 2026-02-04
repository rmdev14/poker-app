import { useState } from 'react'
import { supabase } from '../lib/supabase'
import './PlayerChipsSelector.css'

function PlayerChipsSelector({
  players,
  selectedIds,
  onToggle,
  onPlayersChange,
  lockedIds = new Set(),
  targetCount = null,
  showCounter = true
}) {
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [addingPlayer, setAddingPlayer] = useState(false)
  const [addPlayerError, setAddPlayerError] = useState(null)

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

      // Notify parent of new player
      if (onPlayersChange) {
        onPlayersChange(data)
      }
      setNewPlayerName('')
      setShowAddPlayer(false)
    } catch (err) {
      setAddPlayerError(err.message || 'Failed to add player')
    } finally {
      setAddingPlayer(false)
    }
  }

  const countMismatch = targetCount && selectedIds.size > 0 && selectedIds.size !== targetCount

  return (
    <div className="player-chips-selector">
      {showCounter && targetCount && (
        <div className={`selection-counter ${countMismatch ? 'mismatch' : ''}`}>
          {selectedIds.size} of {targetCount} selected
          {countMismatch && selectedIds.size > 0 && (
            <span className="counter-warning"> (count mismatch)</span>
          )}
        </div>
      )}

      <div className="player-chips">
        {players.map(p => {
          const isSelected = selectedIds.has(p.id)
          const isLocked = lockedIds.has(p.id)

          return (
            <button
              key={p.id}
              className={`player-chip ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
              onClick={() => !isLocked && onToggle(p.id)}
              disabled={isLocked}
            >
              {p.name}
            </button>
          )
        })}
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
    </div>
  )
}

export default PlayerChipsSelector
