import { useState, useMemo, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import './App.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

function parseCSV(text) {
  const lines = text.trim().split('\n')
  return lines.slice(1).map((line) => {
    const values = line.split(',')
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
  const [activeNav, setActiveNav] = useState('Valencia')

  useEffect(() => {
    fetch('/Seats_STAT.ss.csv')
      .then((res) => res.text())
      .then((text) => setData(parseCSV(text)))
  }, [])

  const countries = useMemo(() => [...new Set(data.map((d) => d.Country))].sort(), [data])
  const yearMonths = useMemo(() => [...new Set(data.map((d) => d.YearMonth))].sort(), [data])

  const filteredData = useMemo(() => {
    return data.filter((d) => {
      const countryMatch = selectedCountry === 'All' || d.Country === selectedCountry
      const ymMatch = selectedYearMonth === 'All' || d.YearMonth === selectedYearMonth
      return countryMatch && ymMatch
    })
  }, [data, selectedCountry, selectedYearMonth])

  const aggregated = useMemo(() => {
    const map = {}
    filteredData.forEach((d) => {
      const shc = d.SecondaryHolderCount
      map[shc] = (map[shc] || 0) + d.SubCount
    })
    const keys = Object.keys(map).sort((a, b) => Number(a) - Number(b))
    return { shcLabels: keys, counts: keys.map((k) => map[k]) }
  }, [filteredData])

  const totalSubs = useMemo(() => aggregated.counts.reduce((a, b) => a + b, 0), [aggregated])
  const totalCountries = useMemo(() => {
    const set = new Set(filteredData.map((d) => d.Country))
    return set.size
  }, [filteredData])

  const chartData = {
    labels: aggregated.shcLabels.map((s) => `SHC ${s}`),
    datasets: [
      {
        label: 'Subscription Count',
        data: aggregated.counts,
        backgroundColor: '#5bf58d',
        borderRadius: 4,
        hoverBackgroundColor: '#7fff9e',
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#fff',
        bodyColor: '#5bf58d',
        borderColor: '#334155',
        borderWidth: 1,
        callbacks: {
          label: (ctx) => ` SubCount: ${ctx.raw.toLocaleString()}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Subscription Count', color: '#94a3b8', font: { size: 11 } },
        grid: { color: '#1e293b' },
        ticks: { color: '#94a3b8' },
      },
      x: {
        title: { display: true, text: 'Secondary Holder Count (Seats - 1)', color: '#94a3b8', font: { size: 11 } },
        grid: { display: false },
        ticks: { color: '#94a3b8' },
      },
    },
  }

  const navItems = [
    { id: 'Valencia', icon: '📈' },
  ]

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
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => setActiveNav(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.id}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="main">
        {/* Top Bar */}
        <header className="top-bar">
          <div className="top-bar-left">
            <span className="page-context">Valencia Report</span>
          </div>
          <div className="top-bar-right">
            <span className="latest-week">Latest data: Jun 2026</span>
          </div>
        </header>

        {/* Content */}
        <div className="content">
          {/* KPI Cards */}
          <div className="kpi-row">
            <div className="kpi-card">
              <div className="kpi-label">Total Subscriptions</div>
              <div className="kpi-value">{totalSubs.toLocaleString()}</div>
              <div className="kpi-sub">Filtered result</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Countries</div>
              <div className="kpi-value">{totalCountries}</div>
              <div className="kpi-sub">In selection</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">SHC Levels</div>
              <div className="kpi-value">{aggregated.shcLabels.length}</div>
              <div className="kpi-sub">Distinct seat tiers</div>
            </div>
          </div>

          {/* Chart Section */}
          <div className="chart-section">
            <div className="chart-header">
              <h2 className="chart-title">Subscription Count by Secondary Holder Count</h2>
              <div className="slicers">
                <div className="slicer">
                  <label htmlFor="country-select">Country</label>
                  <select
                    id="country-select"
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                  >
                    <option value="All">All Countries</option>
                    {countries.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="slicer">
                  <label htmlFor="yearmonth-select">Year-Month</label>
                  <select
                    id="yearmonth-select"
                    value={selectedYearMonth}
                    onChange={(e) => setSelectedYearMonth(e.target.value)}
                  >
                    <option value="All">All Periods</option>
                    {yearMonths.map((ym) => (
                      <option key={ym} value={ym}>{formatYM(ym)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="chart-wrapper">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
