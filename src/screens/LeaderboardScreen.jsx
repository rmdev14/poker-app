import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import ScreenLayout from '../components/ScreenLayout'
import './LeaderboardScreen.css'

function calculateLeaderboardData(gameNights, attendances, players) {
  // Build a map of player ID to player data
  const playerMap = new Map()
  players.forEach(p => {
    playerMap.set(p.id, {
      id: p.id,
      name: p.name,
      totalWinnings: 0,
      gamesPlayed: 0,
      winCount: 0,
      podiumCount: 0,
      secondCount: 0,
      thirdCount: 0,
      biggestWin: 0,
      lastPodiumDate: null
    })
  })

  // Count games played from attendance records
  const attendanceByPlayer = new Map()
  attendances.forEach(a => {
    const count = attendanceByPlayer.get(a.player_id) || 0
    attendanceByPlayer.set(a.player_id, count + 1)
  })

  // Helper to update podium date if more recent
  function updateLastPodiumDate(player, gameDate) {
    if (!player.lastPodiumDate || gameDate > player.lastPodiumDate) {
      player.lastPodiumDate = gameDate
    }
  }

  // Calculate winnings and placements from game_nights
  gameNights.forEach(game => {
    const gameDate = game.game_date

    // First place
    if (game.first_place_player_id && game.first_place_prize) {
      let player = playerMap.get(game.first_place_player_id)
      if (!player) {
        // Player might have won but isn't in active players list
        const existingPlayer = players.find(p => p.id === game.first_place_player_id)
        player = {
          id: game.first_place_player_id,
          name: existingPlayer?.name || 'Unknown',
          totalWinnings: 0,
          gamesPlayed: 0,
          winCount: 0,
          podiumCount: 0,
          secondCount: 0,
          thirdCount: 0,
          biggestWin: 0,
          lastPodiumDate: null
        }
        playerMap.set(game.first_place_player_id, player)
      }
      player.totalWinnings += game.first_place_prize
      player.winCount += 1
      player.podiumCount += 1
      if (game.first_place_prize > player.biggestWin) {
        player.biggestWin = game.first_place_prize
      }
      updateLastPodiumDate(player, gameDate)
    }

    // Second place
    if (game.second_place_player_id && game.second_place_prize) {
      let player = playerMap.get(game.second_place_player_id)
      if (!player) {
        const existingPlayer = players.find(p => p.id === game.second_place_player_id)
        player = {
          id: game.second_place_player_id,
          name: existingPlayer?.name || 'Unknown',
          totalWinnings: 0,
          gamesPlayed: 0,
          winCount: 0,
          podiumCount: 0,
          secondCount: 0,
          thirdCount: 0,
          biggestWin: 0,
          lastPodiumDate: null
        }
        playerMap.set(game.second_place_player_id, player)
      }
      player.totalWinnings += game.second_place_prize
      player.podiumCount += 1
      player.secondCount += 1
      if (game.second_place_prize > player.biggestWin) {
        player.biggestWin = game.second_place_prize
      }
      updateLastPodiumDate(player, gameDate)
    }

    // Third place
    if (game.third_place_player_id && game.third_place_prize) {
      let player = playerMap.get(game.third_place_player_id)
      if (!player) {
        const existingPlayer = players.find(p => p.id === game.third_place_player_id)
        player = {
          id: game.third_place_player_id,
          name: existingPlayer?.name || 'Unknown',
          totalWinnings: 0,
          gamesPlayed: 0,
          winCount: 0,
          podiumCount: 0,
          secondCount: 0,
          thirdCount: 0,
          biggestWin: 0,
          lastPodiumDate: null
        }
        playerMap.set(game.third_place_player_id, player)
      }
      player.totalWinnings += game.third_place_prize
      player.podiumCount += 1
      player.thirdCount += 1
      if (game.third_place_prize > player.biggestWin) {
        player.biggestWin = game.third_place_prize
      }
      updateLastPodiumDate(player, gameDate)
    }
  })

  // Apply games played counts
  attendanceByPlayer.forEach((count, playerId) => {
    const player = playerMap.get(playerId)
    if (player) {
      player.gamesPlayed = count
    } else {
      // Player has attendance but wasn't in initial player list
      // They should still appear
      const existingPlayer = players.find(p => p.id === playerId)
      if (existingPlayer) {
        playerMap.set(playerId, {
          id: playerId,
          name: existingPlayer.name,
          totalWinnings: 0,
          gamesPlayed: count,
          winCount: 0,
          podiumCount: 0,
          secondCount: 0,
          thirdCount: 0
        })
      }
    }
  })

  // Helper to determine best finish
  function getBestFinish(player) {
    if (player.winCount > 0) return '1st'
    if (player.secondCount > 0) return '2nd'
    if (player.thirdCount > 0) return '3rd'
    return 'N/A'
  }

  // Convert to array and filter for minimum 3 games played
  const playersWithStats = Array.from(playerMap.values())
    .filter(p => p.gamesPlayed >= 3)
    .map(p => ({
      ...p,
      buyInTotal: p.gamesPlayed * 20,
      profitLoss: p.totalWinnings - (p.gamesPlayed * 20),
      isQualified: p.gamesPlayed >= 20,
      bestFinish: getBestFinish(p)
    }))

  // Calculate P&L rankings with competition ranking (1224) and tie detection
  const sortedByPL = [...playersWithStats].sort((a, b) => b.profitLoss - a.profitLoss)

  // Count how many players have each P&L value
  const plCounts = new Map()
  sortedByPL.forEach(p => {
    plCounts.set(p.profitLoss, (plCounts.get(p.profitLoss) || 0) + 1)
  })

  // Assign competition ranks (1224 style)
  const plRankMap = new Map()
  let currentRank = 1
  let i = 0
  while (i < sortedByPL.length) {
    const currentPL = sortedByPL[i].profitLoss
    const count = plCounts.get(currentPL)
    const isJoint = count > 1

    // Assign same rank to all players with this P&L
    for (let j = 0; j < count; j++) {
      plRankMap.set(sortedByPL[i + j].id, { rank: currentRank, isJoint })
    }

    // Skip ahead by count and increase rank by count (competition ranking)
    i += count
    currentRank += count
  }

  // Add P&L ranking to each player
  const leaderboard = playersWithStats
    .map(p => ({
      ...p,
      plRanking: plRankMap.get(p.id).rank,
      plRankingIsJoint: plRankMap.get(p.id).isJoint
    }))
    .sort((a, b) => {
      // Primary: Total winnings descending
      if (b.totalWinnings !== a.totalWinnings) {
        return b.totalWinnings - a.totalWinnings
      }
      // First tiebreaker: Higher P&L wins
      if (b.profitLoss !== a.profitLoss) {
        return b.profitLoss - a.profitLoss
      }
      // Second tiebreaker: Fewer games played wins (more efficient)
      return a.gamesPlayed - b.gamesPlayed
    })

  return leaderboard
}

function calculateSeasonStats(gameNights) {
  const totalGames = gameNights.length
  const totalPrizePool = gameNights.reduce((sum, g) => sum + (g.attendance_count || 0) * 20, 0)
  const christmasPot = gameNights.reduce((sum, g) => sum + (g.pot_amount || 0), 0)
  return { totalGames, totalPrizePool, christmasPot }
}

function formatPL(amount) {
  if (amount > 0) return `+£${amount}`
  if (amount < 0) return `-£${Math.abs(amount)}`
  return '£0'
}

function formatPodiumDate(dateString) {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const day = date.getDate()
  const suffix = (day >= 11 && day <= 13) ? 'th' : ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][day % 10]
  return `${days[date.getDay()]} ${day}${suffix} ${months[date.getMonth()]}`
}

function formatOrdinal(n) {
  const suffix = (n >= 11 && n <= 13) ? 'th' : ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][n % 10]
  return `${n}${suffix}`
}

function LeaderboardScreen() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [gameNights, setGameNights] = useState([])
  const [attendances, setAttendances] = useState([])
  const [players, setPlayers] = useState([])
  const [expandedPlayerId, setExpandedPlayerId] = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [gamesResult, attendancesResult, playersResult] = await Promise.all([
          supabase.from('game_nights').select('*'),
          supabase.from('attendances').select('player_id, game_night_id'),
          supabase.from('players').select('id, name').eq('is_active', true)
        ])

        if (gamesResult.error) throw gamesResult.error
        if (attendancesResult.error) throw attendancesResult.error
        if (playersResult.error) throw playersResult.error

        setGameNights(gamesResult.data || [])
        setAttendances(attendancesResult.data || [])
        setPlayers(playersResult.data || [])
      } catch (err) {
        console.error('Failed to fetch leaderboard data:', err)
        setError('Failed to load leaderboard')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const leaderboard = useMemo(
    () => calculateLeaderboardData(gameNights, attendances, players),
    [gameNights, attendances, players]
  )

  const seasonStats = useMemo(
    () => calculateSeasonStats(gameNights),
    [gameNights]
  )

  function toggleExpand(playerId) {
    setExpandedPlayerId(prev => prev === playerId ? null : playerId)
  }

  function getRankClass(rank) {
    if (rank === 1) return 'gold'
    if (rank === 2) return 'silver'
    if (rank === 3) return 'bronze'
    return ''
  }

  if (loading) {
    return (
      <ScreenLayout title="Leaderboard">
        <div className="leaderboard-loading">Loading leaderboard...</div>
      </ScreenLayout>
    )
  }

  if (error) {
    return (
      <ScreenLayout title="Leaderboard">
        <div className="leaderboard-error">{error}</div>
      </ScreenLayout>
    )
  }

  if (leaderboard.length === 0) {
    return (
      <ScreenLayout title="Leaderboard">
        <div className="leaderboard-empty">
          <p>No games recorded yet.</p>
          <p>Add your first game to see the leaderboard.</p>
        </div>
      </ScreenLayout>
    )
  }

  return (
    <ScreenLayout title="Leaderboard">
      <div className="leaderboard-content">
        {/* Season Summary Card */}
        <div className="season-card">
          <h2 className="season-title">2026</h2>
          <div className="season-stats">
            <div className="season-stat">
              <span className="season-stat-label">GAMES PLAYED</span>
              <span className="season-stat-value">{seasonStats.totalGames}</span>
            </div>
            <div className="season-stat-divider" />
            <div className="season-stat">
              <span className="season-stat-label">TOTAL PAID OUT</span>
              <span className="season-stat-value">£{seasonStats.totalPrizePool}</span>
            </div>
            <div className="season-stat-divider" />
            <div className="season-stat">
              <span className="season-stat-label">CHRISTMAS POT</span>
              <span className="season-stat-value">£{seasonStats.christmasPot}</span>
            </div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="leaderboard-table">
          <p className="leaderboard-hint">Tap player name for detailed stats</p>
          <div className="leaderboard-header">
            <span className="col-rank">#</span>
            <span className="col-name">Player</span>
            <span className="col-winnings">Winnings</span>
            <span className="col-pl">P&L</span>
            <span className="col-played">Played</span>
          </div>

          <div className="leaderboard-rows">
            {leaderboard.map((player, index) => {
              const rank = index + 1
              const rankClass = getRankClass(rank)
              const isExpanded = expandedPlayerId === player.id
              const isTopThree = rank <= 3

              return (
                <div key={player.id} className="player-row-wrapper">
                  <button
                    className={`player-row ${rankClass} ${isTopThree ? 'top-three' : ''} ${isExpanded ? 'expanded' : ''}`}
                    onClick={() => toggleExpand(player.id)}
                  >
                    <span className={`col-rank ${rankClass}`}>
                      {isTopThree ? (
                        <span className={`rank-badge ${rankClass}`}>{rank}</span>
                      ) : (
                        rank
                      )}
                    </span>
                    <span className="col-name">
                      <span className="player-name-text">{player.name}</span>
                      {player.isQualified && <span className="qualified-badge">Q</span>}
                    </span>
                    <span className="col-winnings">£{player.totalWinnings}</span>
                    <span className={`col-pl ${player.profitLoss > 0 ? 'positive' : player.profitLoss < 0 ? 'negative' : 'zero'}`}>
                      {formatPL(player.profitLoss)}
                    </span>
                    <span className="col-played">{player.gamesPlayed}</span>
                  </button>

                  {isExpanded && (
                    <div className="player-details">
                      <div className="detail-row">
                        <span className="detail-label">Wins:</span>
                        <span className="detail-value">{player.winCount}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Podiums:</span>
                        <span className="detail-value">{player.podiumCount}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Best Finish:</span>
                        <span className="detail-value">{player.bestFinish}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Biggest Win:</span>
                        <span className="detail-value">{player.biggestWin > 0 ? `£${player.biggestWin}` : 'N/A'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Last Podium:</span>
                        <span className="detail-value">{formatPodiumDate(player.lastPodiumDate)}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">P&L Ranking:</span>
                        <span className="detail-value">{player.plRankingIsJoint ? `Joint ${formatOrdinal(player.plRanking)}` : formatOrdinal(player.plRanking)}</span>
                      </div>
                      <div className="detail-row qualification-row">
                        <span className="detail-label">Qualification:</span>
                        {player.isQualified ? (
                          <span className="detail-value qualified">Qualified</span>
                        ) : (
                          <span className="detail-value">{player.gamesPlayed}/20 games</span>
                        )}
                      </div>
                      <div className="qualification-bar-container">
                        <div
                          className={`qualification-bar-fill ${player.isQualified ? 'qualified' : ''}`}
                          style={{ width: `${Math.min(100, (player.gamesPlayed / 20) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </ScreenLayout>
  )
}

export default LeaderboardScreen
