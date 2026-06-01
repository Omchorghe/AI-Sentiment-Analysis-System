import { useState } from 'react'
import { motion } from 'framer-motion'
import Chart from 'react-apexcharts'
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'
import { analyzeFinancePulse } from '../services/api'
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react'

export default function FinancePulse() {
  const [ticker, setTicker] = useState('')
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAllNews, setShowAllNews] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!ticker.trim()) {
      setError('Please enter a stock ticker.')
      return
    }
    
    setIsLoading(true)
    setError('')
    try {
      const data = await analyzeFinancePulse(ticker.trim().toUpperCase())
      setResult(data)
      setShowAllNews(false)
    } catch (apiError) {
      setResult(null)
      setError(apiError.message || 'Failed to analyze Finance Pulse.')
    } finally {
      setIsLoading(false)
    }
  }

  const sectionClass =
    'rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-md transition-all duration-300 hover:border-white/30 hover:shadow-purple-500/20'

  // Determine badge colors based on sentiment or AI recommendation
  const getBadgeStyles = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'bullish':
      case 'buy':
        return 'bg-green-500/20 text-green-300 border-green-500/50'
      case 'bearish':
      case 'sell':
        return 'bg-red-500/20 text-red-300 border-red-500/50'
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/50'
    }
  }

  const getBadgeIcon = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'bullish':
      case 'buy':
        return <TrendingUp size={14} className="mr-1" />
      case 'bearish':
      case 'sell':
        return <TrendingDown size={14} className="mr-1" />
      default:
        return <Minus size={14} className="mr-1" />
    }
  }

  const CustomDot = (props) => {
    const { cx, cy, payload } = props
    if (!cx || !cy) return null
    const isNegative = payload.sentiment_score < 0
    return (
      <circle 
        cx={cx} 
        cy={cy} 
        r={5} 
        stroke={isNegative ? '#ef4444' : '#8b5cf6'} 
        strokeWidth={3} 
        fill="#111" 
      />
    )
  }

  let trendColor = '#10b981' // Green
  let isLoss = false
  let candlestickSeries = []
  let apexOptions = {}
  
  if (result && result.historical_prices.length > 0) {
    const prices = result.historical_prices
    const firstClose = prices[0].price
    const lastClose = prices[prices.length - 1].price
    
    if (lastClose < firstClose) {
      trendColor = '#ef4444' // Red
      isLoss = true
    }

    candlestickSeries = [{
      name: 'candle',
      data: prices.map(p => ({
        x: p.date,
        y: [p.open, p.high, p.low, p.price]
      }))
    }]

    apexOptions = {
      chart: { type: 'candlestick', toolbar: { show: false }, background: 'transparent' },
      theme: { mode: 'dark' },
      xaxis: { type: 'category', labels: { style: { colors: '#aaa' } } },
      yaxis: { tooltip: { enabled: true }, labels: { style: { colors: '#aaa' } } },
      plotOptions: {
        candlestick: {
          colors: { upward: '#10b981', downward: '#ef4444' },
          wick: { useFillColor: true }
        }
      },
      grid: { borderColor: '#ffffff10' }
    }
  }

  const newsFeed = result?.news_feed || []
  const displayedNews = showAllNews ? newsFeed : newsFeed.slice(0, 3)

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <h1 className="mb-3 text-3xl font-bold tracking-wide text-white md:text-4xl">Finance Pulse</h1>
        <p className="mb-8 text-base text-slate-300 md:text-lg">
          Search a stock ticker to view 7-day price history vs financial news sentiment.
        </p>

        <form onSubmit={handleSubmit} className={`${sectionClass} mb-6 flex flex-wrap items-center gap-3`}>
          <input
            type="text"
            placeholder="Enter ticker (e.g. NVDA, AAPL)"
            value={ticker}
            onChange={(event) => setTicker(event.target.value)}
            className="min-w-[230px] flex-1 rounded-xl border border-white/20 bg-black/30 px-4 py-2.5 text-slate-200 placeholder:text-slate-500 uppercase"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {isLoading ? 'Analyzing...' : 'Search'}
          </button>
        </form>

        {isLoading && (
          <p className="mb-5 animate-pulse text-emerald-300">
            Analyzing financial data and running FinBERT model... (this may take up to 30 seconds on first run)
          </p>
        )}
        
        {error && (
          <div className="mb-5 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-red-300">
            {error}
          </div>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-6"
          >
            {/* Row 4 (Moved to top): Summary Profile */}
            <div className={`${sectionClass} flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-white/10 to-transparent`}>
              <div>
                <h2 className="text-2xl font-bold text-white">{result.company_name} <span className="text-slate-400">({result.ticker})</span></h2>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-300">
                  <p><span className="text-slate-500">Avg Price:</span> ${result.average_price?.toFixed(2)}</p>
                  <p><span className="text-slate-500">All-Time High:</span> ${result.all_time_high?.toFixed(2)}</p>
                  <p><span className="text-slate-500">All-Time Low:</span> ${result.all_time_low?.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <p className="mb-1 text-sm text-slate-400 uppercase tracking-wider">AI Recommendation</p>
                <div className={`flex items-center rounded-xl border px-4 py-2 text-lg font-bold shadow-lg ${getBadgeStyles(result.ai_recommendation)}`}>
                  {getBadgeIcon(result.ai_recommendation)}
                  {result.ai_recommendation}
                </div>
              </div>
            </div>

            {/* Row 1: The Top Charts */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className={sectionClass}>
                <h3 className="mb-4 text-lg font-semibold tracking-wide text-white">Dual-Axis Pulse Chart</h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={result.historical_prices} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis dataKey="date" stroke="#aaa" tick={{ fill: '#aaa', fontSize: 12 }} />
                      <YAxis yAxisId="left" stroke="#aaa" tick={{ fill: '#aaa', fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" stroke="#aaa" tick={{ fill: '#aaa', fontSize: 12 }} domain={[-1.2, 1.2]} />
                      <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '10px', color: '#fff' }} />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="price" name="Closing Price ($)" stroke="#aaa" strokeWidth={2} dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="sentiment_score" name="Avg Sentiment (-1 to 1)" stroke="#8b5cf6" strokeWidth={3} dot={<CustomDot />} activeDot={{ r: 6 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={sectionClass}>
                <h3 className="mb-4 text-lg font-semibold tracking-wide text-white">7-Day Candlestick</h3>
                <div className="h-72 w-full">
                  <Chart options={apexOptions} series={candlestickSeries} type="candlestick" height="100%" />
                </div>
              </div>
            </div>

            {/* Row 2: The Trend Area Chart */}
            <div className={sectionClass}>
              <h3 className="mb-4 text-lg font-semibold tracking-wide text-white">7-Day Price Trend</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={result.historical_prices} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={trendColor} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={trendColor} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="date" stroke="#aaa" tick={{ fill: '#aaa', fontSize: 12 }} />
                    <YAxis stroke="#aaa" tick={{ fill: '#aaa', fontSize: 12 }} domain={['dataMin - 5', 'dataMax + 5']} />
                    <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '10px', color: '#fff' }} />
                    <Area type="monotone" dataKey="price" stroke={trendColor} strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Row 3: The "Why" Feed */}
            <div className={sectionClass}>
              <h3 className="mb-4 text-lg font-semibold tracking-wide text-white">The "Why" Feed</h3>
              {newsFeed.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {displayedNews.map((news, idx) => (
                      <div key={idx} className="flex flex-col rounded-xl border border-white/10 bg-black/20 p-4 transition hover:bg-white/5 hover:border-white/30">
                        <a href={news.url} target="_blank" rel="noopener noreferrer" className="mb-3 font-medium text-slate-200 line-clamp-3 hover:text-emerald-400 hover:underline flex-1">
                          {news.headline}
                        </a>
                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/10">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getBadgeStyles(news.sentiment)}`}>
                            {getBadgeIcon(news.sentiment)}
                            {news.sentiment}
                          </span>
                          <span className="text-xs text-slate-500">
                            Score: {(news.score).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {newsFeed.length > 3 && (
                    <div className="mt-6 flex justify-center">
                      <button 
                        onClick={() => setShowAllNews(!showAllNews)}
                        className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                      >
                        {showAllNews ? (
                          <>Show Less <ChevronUp size={16} /></>
                        ) : (
                          <>See More ({newsFeed.length - 3} additional articles) <ChevronDown size={16} /></>
                        )}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-400">No recent news found for this ticker.</p>
              )}
            </div>

          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
