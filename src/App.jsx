import { useState, useMemo, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import './App.css'

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
)

function parseCSV(text) {
  const lines = text.trim().split('\n').filter((l) => l.trim())
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim())
    return {
      SubCount: Number(values[0]),
      SeatsCount: Number(values[1]),
      SecondaryHolderCount: Number(values[1]) - 1,
      Country: values[2],
      YearMonth: values[3],
    }
  })
}

function formatYM(ym) {
  const y = ym.slice(0, 4)
  const m = ym.slice(4)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[Number(m) - 1]} ${y}`
}

function App() {
  const [data, setData] = useState([])
  const [selectedCountry, setSelectedCountry] = useState('All')
  const [selectedYearMonth, setSelectedYearMonth] = useState('All')
  const [selectedSHC, setSelectedSHC] = useState('All')

  useEffect(() => {
    fetch('/Seats_STAT.ss.csv')
      .then((res) => res.text())
      .then((text) => setData(parseCSV(text)))
  }, [])

  const countries = useMemo(() => [...new Set(data.map((d) => d.Country))].sort(), [data])
  const yearMonths = useMemo(() => [...new Set(data.map((d) => d.YearMonth))].sort(), [data])
  const shcLevels = useMemo(() => [...new Set(data.map((d) => d.SecondaryHolderCount))].sort((a,b) => a-b), [data])

  const filteredData = useMemo(() => {
    return data.filter((d) => {
      const countryMatch = selectedCountry === 'All' || d.Country === selectedCountry
      const ymMatch = selectedYearMonth === 'All' || d.YearMonth === selectedYearMonth
      const shcMatch = selectedSHC === 'All' || d.SecondaryHolderCount === Number(selectedSHC)
      return countryMatch && ymMatch && shcMatch
    })
  }, [data, selectedCountry, selectedYearMonth, selectedSHC])

  // KPIs
  const totalSubs = useMemo(() => filteredData.reduce((a, d) => a + d.SubCount, 0), [filteredData])
  const totalCountries = useMemo(() => new Set(filteredData.map((d) => d.Country)).size, [filteredData])
  const avgSubPerCountry = useMemo(() => totalCountries ? Math.round(totalSubs / totalCountries) : 0, [totalSubs, totalCountries])
  const peakEntry = useMemo(() => filteredData.reduce((max, d) => d.SubCount > max.SubCount ? d : max, filteredData[0] || { SubCount: 0 }), [filteredData])

  // Chart 1: SubCount by SHC (Bar)
  const barAggregated = useMemo(() => {
    const map = {}
    filteredData.forEach((d) => { map[d.SecondaryHolderCount] = (map[d.SecondaryHolderCount] || 0) + d.SubCount })
    const keys = Object.keys(map).sort((a, b) => Number(a) - Number(b))
    return { labels: keys, counts: keys.map((k) => map[k]) }
  }, [filteredData])

  // Chart 2: Trend over YearMonth (Line)
  const trendData = useMemo(() => {
    const map = {}
    filteredData.forEach((d) => { map[d.YearMonth] = (map[d.YearMonth] || 0) + d.SubCount })
    const sortedKeys = Object.keys(map).sort()
    return { labels: sortedKeys, counts: sortedKeys.map((k) => map[k]) }
  }, [filteredData])

  // Chart 3: Country breakdown (Doughnut)
  const countryBreakdown = useMemo(() => {
    const map = {}
    filteredData.forEach((d) => { map[d.Country] = (map[d.Country] || 0) + d.SubCount })
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1])
    return { labels: sorted.map(([k]) => k), counts: sorted.map(([, v]) => v) }
  }, [filteredData])

  // Observations
  const observations = useMemo(() => {
    const obs = []
    if (trendData.labels.length >= 2) {
      const first = trendData.counts[0]
      const last = trendData.counts[trendData.counts.length - 1]
      const change = ((last - first) / first * 100).toFixed(1)
      if (change > 0) obs.push(`📈 Subscriptions grew ${change}% from ${formatYM(trendData.labels[0])} to ${formatYM(trendData.labels[trendData.labels.length - 1])}`)
      else obs.push(`📉 Subscriptions declined ${Math.abs(change)}% from ${formatYM(trendData.labels[0])} to ${formatYM(trendData.labels[trendData.labels.length - 1])}`)
    }
    if (countryBreakdown.labels.length > 0) {
      obs.push(`🏆 Top country: ${countryBreakdown.labels[0]} with ${countryBreakdown.counts[0].toLocaleString()} subscriptions`)
    }
    if (barAggregated.labels.length > 0) {
      const maxIdx = barAggregated.counts.indexOf(Math.max(...barAggregated.counts))
      obs.push(`🎯 Highest volume at SHC ${barAggregated.labels[maxIdx]} (${barAggregated.counts[maxIdx].toLocaleString()} subs)`)
    }
    if (peakEntry && peakEntry.SubCount > 0) {
      obs.push(`⚡ Peak single entry: ${peakEntry.SubCount.toLocaleString()} subs — ${peakEntry.Country}, SHC ${peakEntry.SecondaryHolderCount}, ${formatYM(peakEntry.YearMonth)}`)
    }
    if (barAggregated.counts.length >= 2) {
      const shc4Plus = barAggregated.labels.filter((l, i) => Number(l) >= 4).reduce((sum, l) => sum + barAggregated.counts[barAggregated.labels.indexOf(l)], 0)
      const pct = ((shc4Plus / totalSubs) * 100).toFixed(1)
      obs.push(`👥 SHC 4+ accounts for ${pct}% of total subscriptions — higher seat tiers drive volume`)
    }
    return obs
  }, [trendData, countryBreakdown, barAggregated, peakEntry, totalSubs])

  // Chart configs
  const barChartData = {
    labels: barAggregated.labels.map((s) => `SHC ${s}`),
    datasets: [{
      label: 'Subscription Count',
      data: barAggregated.counts,
      backgroundColor: '#5bf58d',
      borderRadius: 4,
      hoverBackgroundColor: '#7fff9e',
    }],
  }

  const handleBarClick = (_, elements) => {
    if (elements.length > 0) {
      const idx = elements[0].index
      const val = barAggregated.labels[idx]
      setSelectedSHC(selectedSHC === val ? 'All' : val)
    }
  }

  const handleLineClick = (_, elements) => {
    if (elements.length > 0) {
      const idx = elements[0].index
      const val = trendData.labels[idx]
      setSelectedYearMonth(selectedYearMonth === val ? 'All' : val)
    }
  }

  const handleDoughnutClick = (_, elements) => {
    if (elements.length > 0) {
      const idx = elements[0].index
      const val = countryBreakdown.labels[idx]
      setSelectedCountry(selectedCountry === val ? 'All' : val)
    }
  }

  const barChartOptions = {
    responsive: true, maintainAspectRatio: false,
    onClick: handleBarClick,
    plugins: { legend: { display: false }, title: { display: false },
      tooltip: { backgroundColor: '#1e293b', titleColor: '#fff', bodyColor: '#5bf58d', borderColor: '#334155', borderWidth: 1 } },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'SubCount', color: '#94a3b8', font: { size: 11 } }, grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } },
      x: { title: { display: true, text: 'Secondary Holder Count', color: '#94a3b8', font: { size: 11 } }, grid: { display: false }, ticks: { color: '#94a3b8' } },
    },
  }

  const lineChartData = {
    labels: trendData.labels.map(formatYM),
    datasets: [{
      label: 'Total Subscriptions',
      data: trendData.counts,
      borderColor: '#5bf58d',
      backgroundColor: 'rgba(91, 245, 141, 0.1)',
      tension: 0.3,
      fill: true,
      pointBackgroundColor: '#5bf58d',
      pointRadius: 4,
      pointHoverRadius: 6,
    }],
  }

  const lineChartOptions = {
    responsive: true, maintainAspectRatio: false,
    onClick: handleLineClick,
    plugins: { legend: { display: false }, title: { display: false },
      tooltip: { backgroundColor: '#1e293b', titleColor: '#fff', bodyColor: '#5bf58d', borderColor: '#334155', borderWidth: 1 } },
    scales: {
      y: { beginAtZero: true, grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } },
      x: { grid: { display: false }, ticks: { color: '#94a3b8', maxRotation: 45 } },
    },
  }

  const doughnutColors = ['#5bf58d', '#0ea5e9', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#6366f1']
  const doughnutData = {
    labels: countryBreakdown.labels,
    datasets: [{
      data: countryBreakdown.counts,
      backgroundColor: countryBreakdown.labels.map((_, i) => doughnutColors[i % doughnutColors.length]),
      borderColor: '#1e293b',
      borderWidth: 2,
    }],
  }

  const doughnutOptions = {
    responsive: true, maintainAspectRatio: false,
    onClick: handleDoughnutClick,
    plugins: {
      legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 11 }, padding: 12, usePointStyle: true } },
      tooltip: { backgroundColor: '#1e293b', titleColor: '#fff', bodyColor: '#5bf58d', borderColor: '#334155', borderWidth: 1 },
    },
  }

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <svg className="xbox-logo" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 1.5c1.529 0 2.985.33 4.3.92-1.086.396-2.14 1.13-3.12 2.05-.38.36-.76.76-1.18 1.21-.42-.45-.8-.85-1.18-1.21-.98-.92-2.034-1.654-3.12-2.05A10.46 10.46 0 0112 1.5zM5.13 3.64c1.358.177 2.69.894 3.88 2.01.68.64 1.34 1.4 1.97 2.27C9.2 10.17 7.72 12.91 6.8 15.58c-.92 2.65-1.32 5.15-.95 7.08A10.48 10.48 0 011.5 12c0-3.28 1.5-6.21 3.63-8.36zM18.87 3.64A10.48 10.48 0 0122.5 12c0 4.16-2.42 7.76-5.93 9.46.37-1.93-.03-4.43-.95-7.08-.92-2.67-2.4-5.41-4.18-7.66.63-.87 1.29-1.63 1.97-2.27 1.19-1.116 2.522-1.833 3.88-2.01h-.42zM12 9.71c1.54 2.04 2.84 4.45 3.63 6.72.73 2.12 1.1 4.12.93 5.7A10.44 10.44 0 0112 22.5a10.44 10.44 0 01-4.56-1.05c-.17-1.58.2-3.58.93-5.7.79-2.27 2.09-4.68 3.63-6.72z"/>
          </svg>
          <span className="sidebar-title">XBOX Metrics</span>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section-label">VIEWS</div>
          <button className="nav-item active">
            <span className="nav-icon">📈</span>
            <span className="nav-label">Valencia</span>
          </button>
        </nav>
      </aside>

      {/* Main */}
      <div className="main">
        <header className="top-bar">
          <div className="top-bar-left">
            <span className="page-context">Valencia Report — Subscription Analysis</span>
          </div>
          <div className="top-bar-right">
            <span className="latest-week">Data: Jan 2023 – Aug 2023</span>
          </div>
        </header>

        <div className="content">
          {/* Slicers Row */}
          <div className="slicers-bar">
            <div className="slicer">
              <label htmlFor="country-select">Country</label>
              <select id="country-select" value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)}>
                <option value="All">All Countries</option>
                {countries.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="slicer">
              <label htmlFor="yearmonth-select">Year-Month</label>
              <select id="yearmonth-select" value={selectedYearMonth} onChange={(e) => setSelectedYearMonth(e.target.value)}>
                <option value="All">All Periods</option>
                {yearMonths.map((ym) => <option key={ym} value={ym}>{formatYM(ym)}</option>)}
              </select>
            </div>
            <div className="slicer">
              <label htmlFor="shc-select">SHC Level</label>
              <select id="shc-select" value={selectedSHC} onChange={(e) => setSelectedSHC(e.target.value)}>
                <option value="All">All SHC</option>
                {shcLevels.map((s) => <option key={s} value={s}>SHC {s}</option>)}
              </select>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="kpi-row">
            <div className="kpi-card">
              <div className="kpi-label">Total Subscriptions</div>
              <div className="kpi-value">{totalSubs.toLocaleString()}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Countries</div>
              <div className="kpi-value">{totalCountries}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Avg Subs / Country</div>
              <div className="kpi-value">{avgSubPerCountry.toLocaleString()}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Peak Entry</div>
              <div className="kpi-value">{peakEntry?.SubCount?.toLocaleString() || '—'}</div>
              <div className="kpi-sub">{peakEntry?.Country || ''}</div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="charts-grid">
            {/* Bar Chart */}
            <div className="chart-card">
              <h3 className="chart-card-title">SubCount by Secondary Holder Count<span className="chart-hint">(click bar to filter)</span></h3>
              <div className="chart-wrapper">
                <Bar data={barChartData} options={barChartOptions} />
              </div>
            </div>

            {/* Line Chart - Trend */}
            <div className="chart-card">
              <h3 className="chart-card-title">Subscription Trend Over Time<span className="chart-hint">(click point to filter)</span></h3>
              <div className="chart-wrapper">
                <Line data={lineChartData} options={lineChartOptions} />
              </div>
            </div>

            {/* Doughnut - Country */}
            <div className="chart-card">
              <h3 className="chart-card-title">Country Distribution<span className="chart-hint">(click slice to filter)</span></h3>
              <div className="chart-wrapper doughnut-wrapper">
                <Doughnut data={doughnutData} options={doughnutOptions} />
              </div>
            </div>

            {/* Observations Panel */}
            <div className="chart-card observations-card">
              <h3 className="chart-card-title">Key Observations & Trends</h3>
              <ul className="observations-list">
                {observations.map((obs, i) => (
                  <li key={i} className="observation-item">{obs}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
