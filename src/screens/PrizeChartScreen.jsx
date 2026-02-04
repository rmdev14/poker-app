import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ScreenLayout from '../components/ScreenLayout'
import './PrizeChartScreen.css'

function PrizeChartScreen() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [prizeChart, setPrizeChart] = useState([])

  useEffect(() => {
    async function fetchData() {
      try {
        const { data, error } = await supabase
          .from('prize_chart')
          .select('*')
          .order('num_players', { ascending: true })

        if (error) throw error
        setPrizeChart(data || [])
      } catch (err) {
        console.error('Failed to fetch prize chart:', err)
        setError('Failed to load prize chart')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <ScreenLayout title="Prize Chart">
        <div className="prize-chart-loading">Loading...</div>
      </ScreenLayout>
    )
  }

  if (error) {
    return (
      <ScreenLayout title="Prize Chart">
        <div className="prize-chart-error">{error}</div>
      </ScreenLayout>
    )
  }

  if (prizeChart.length === 0) {
    return (
      <ScreenLayout title="Prize Chart">
        <div className="prize-chart-empty">No prize data available</div>
      </ScreenLayout>
    )
  }

  return (
    <ScreenLayout title="Prize Chart">
      <div className="prize-chart-content">
        <div className="prize-table-container">
          <div className="prize-table">
            <div className="prize-table-header">
              <span className="col-players">Players</span>
              <span className="col-first">1st</span>
              <span className="col-second">2nd</span>
              <span className="col-third">3rd</span>
              <span className="col-pot">Pot</span>
            </div>

            <div className="prize-table-body">
              {prizeChart.map((row, index) => (
                <div
                  key={row.num_players}
                  className={`prize-table-row ${index % 2 === 1 ? 'even' : ''}`}
                >
                  <span className="col-players">{row.num_players}</span>
                  <span className="col-first">£{row.first_prize}</span>
                  <span className="col-second">£{row.second_prize}</span>
                  <span className="col-third">£{row.third_prize}</span>
                  <span className="col-pot">£{row.pot}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </ScreenLayout>
  )
}

export default PrizeChartScreen
