import { useState } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import {
  ArrowRight,
  FileText,
  HomeIcon,
  MessageSquare,
  PlayCircle,
  TrendingUp,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import Navbar from './components/Navbar'
import { analyzeRawText, analyzeBluesky, analyzeText, analyzeYoutube, exportAnalysisData } from './services/api'
import FinancePulsePage from './pages/FinancePulse'

const cards = [
  {
    title: 'Text Analysis',
    path: '/text-analysis',
    description: 'Analyze direct text sentiment from TXT and CSV files.',
    icon: FileText,
    gradient: 'from-purple-500 to-blue-500',
  },
  {
    title: 'Bluesky Analysis',
    path: '/bluesky-analysis',
    description: 'Analyze Bluesky posts and social trends by keyword.',
    icon: MessageSquare,
    gradient: 'from-pink-500 to-red-500',
  },
  {
    title: 'YouTube Analysis',
    path: '/youtube-analysis',
    description: 'Fetch video comments and generate sentiment insights.',
    icon: PlayCircle,
    gradient: 'from-indigo-500 to-purple-500',
  },
  {
    title: 'Finance Pulse',
    path: '/finance-pulse',
    description: 'Track stock prices vs financial news sentiment.',
    icon: TrendingUp,
    gradient: 'from-emerald-500 to-teal-500',
  },
]

const PIE_COLORS = ['#22c55e', '#94a3b8', '#ef4444']

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
}

const sectionClass =
  'rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-md transition-all duration-300 hover:border-white/30 hover:shadow-purple-500/20'

function PageWrapper({ title, subtitle, children }) {
  return (
    <motion.main
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6"
    >
      <h1 className="mb-3 text-3xl font-bold tracking-wide text-white md:text-4xl">{title}</h1>
      <p className="mb-8 text-base text-slate-300 md:text-lg">{subtitle}</p>
      {children}
    </motion.main>
  )
}

function HomePage() {
  return (
    <PageWrapper
      title=""
      subtitle=""
    >
      <section className="mb-10 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-4xl bg-gradient-to-r from-purple-400 via-blue-400 to-pink-400 bg-clip-text text-4xl font-extrabold tracking-wide text-transparent md:text-6xl"
        >
          Sentiment Analysis Dashboard
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="mx-auto mt-5 max-w-2xl text-slate-300"
        >
          Run modern sentiment workflows across text, Bluesky, and YouTube with clean visual insights.
        </motion.p>
      </section>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, index) => {
          const Icon = card.icon
          return (
            <motion.div
              key={card.path}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 + index * 0.1 }}
            >
              <Link
                to={card.path}
                className="group block rounded-2xl border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:scale-105 hover:border-white/30 hover:shadow-purple-500/40"
              >
                <div
                  className={`mb-5 inline-flex rounded-xl bg-gradient-to-r p-3 text-white shadow-lg ${card.gradient}`}
                >
                  <Icon size={22} />
                </div>
                <h3 className="mb-2 text-xl font-bold tracking-wide text-white">{card.title}</h3>
                <p className="mb-5 text-sm leading-relaxed text-slate-300">{card.description}</p>
                <div className="inline-flex items-center gap-2 text-sm font-medium text-purple-300 transition group-hover:gap-3">
                  Open Module <ArrowRight size={16} />
                </div>
              </Link>
            </motion.div>
          )
        })}
      </section>
    </PageWrapper>
  )
}

function TextAnalysisPage() {
  const [inputMode, setInputMode] = useState('paste')
  const [pastedText, setPastedText] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [analysisData, setAnalysisData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState('')
  const [downloadError, setDownloadError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setAnalysisData(null)

    if (inputMode === 'paste' && !pastedText.trim()) {
      setError('Please enter some text to analyze.')
      return
    }

    if (inputMode === 'file' && !selectedFile) {
      setError('Please choose a .txt or .csv file.')
      return
    }

    setIsLoading(true)
    try {
      let result
      if (inputMode === 'paste') {
        result = await analyzeRawText(pastedText)
      } else {
        result = await analyzeText(selectedFile)
      }
      setAnalysisData(result)
    } catch (apiError) {
      setError(apiError.message || 'Failed to analyze text.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!analysisData || !analysisData.results) {
      setDownloadError('No data to download.')
      return
    }

    setIsDownloading(true)
    setDownloadError('')
    try {
      const blob = await exportAnalysisData(analysisData.results)
      const url = window.URL.createObjectURL(new Blob([blob]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'analysis.csv')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      setDownloadError(error.message || 'Failed to download CSV.')
    } finally {
      setIsDownloading(false)
    }
  }

  // Prepare chart data
  const sentimentChartData = analysisData
    ? [
        { name: 'Positive', value: analysisData.summary.positive },
        { name: 'Neutral', value: analysisData.summary.neutral },
        { name: 'Negative', value: analysisData.summary.negative },
      ]
    : []

  const topWordsData = analysisData?.top_words || []

  return (
    <PageWrapper
      title="Text Analysis"
      subtitle="Analyze sentiment from pasted text or uploaded files with comprehensive insights."
    >
      {/* Input Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`${sectionClass} mb-6`}>
        {/* Toggle Buttons */}
        <div className="mb-5 flex gap-3">
          <button
            onClick={() => {
              setInputMode('paste')
              setError('')
            }}
            className={`rounded-lg px-4 py-2 font-semibold transition ${
              inputMode === 'paste'
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                : 'border border-white/20 text-slate-300 hover:border-white/40'
            }`}
          >
            Paste Text
          </button>
          <button
            onClick={() => {
              setInputMode('file')
              setError('')
            }}
            className={`rounded-lg px-4 py-2 font-semibold transition ${
              inputMode === 'file'
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                : 'border border-white/20 text-slate-300 hover:border-white/40'
            }`}
          >
            Upload File
          </button>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit}>
          {inputMode === 'paste' ? (
            <div className="mb-4 flex flex-col gap-3">
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste text here (one line per entry)..."
                className="min-h-32 rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-slate-200 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              />
            </div>
          ) : (
            <div className="mb-4">
              <input
                type="file"
                accept=".txt,.csv"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-2 text-slate-200 file:mr-4 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-purple-500 file:to-blue-500 file:px-4 file:py-2 file:text-white"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 px-6 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {isLoading ? (
              <motion.div
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 1 }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                Analyzing...
              </motion.div>
            ) : (
              'Analyze'
            )}
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </motion.div>

      {/* Results Section */}
      {analysisData && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {/* Top Section: Sentiment Distribution */}
          <motion.div className={`${sectionClass} mb-6`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold tracking-wide text-white">Sentiment Overview</h3>
              <span className="rounded-lg bg-purple-500/20 px-3 py-1 text-sm text-purple-200">
                {analysisData.summary.total} entries
              </span>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sentimentChartData} dataKey="value" nameKey="name" outerRadius={100} label>
                    {sentimentChartData.map((entry, index) => (
                      <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: '1px solid rgba(255, 255, 255, 0.2)' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Middle Section: Top Words Chart */}
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className={sectionClass}>
              <h3 className="mb-4 text-lg font-semibold tracking-wide text-white">Top Words</h3>
              {topWordsData.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topWordsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                      <XAxis dataKey="word" stroke="rgba(255, 255, 255, 0.5)" />
                      <YAxis stroke="rgba(255, 255, 255, 0.5)" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                        }}
                      />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-slate-400">No words to display</p>
              )}
            </div>
          </motion.div>

          {/* Download Button Section */}
          <motion.div
            className={`${sectionClass} mb-6 flex items-center justify-between`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div>
              <h3 className="text-lg font-semibold tracking-wide text-white">Export Results</h3>
              <p className="text-sm text-slate-400">Download your analysis as a CSV file</p>
            </div>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {isDownloading ? (
                <motion.div
                  initial={{ opacity: 0.6 }}
                  animate={{ opacity: 1 }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  Downloading...
                </motion.div>
              ) : (
                'Download CSV'
              )}
            </button>
          </motion.div>

          {downloadError && <p className="mb-5 text-sm text-red-400">{downloadError}</p>}

          {/* Results Table */}
          <motion.div
            className={`${sectionClass} overflow-x-auto`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="mb-4 text-lg font-semibold tracking-wide text-white">Detailed Results</h3>
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="text-slate-300">
                <tr className="border-b border-white/20">
                  <th className="px-4 py-3">Text</th>
                  <th className="px-4 py-3">Sentiment</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">VADER</th>
                  <th className="px-4 py-3">TextBlob</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {analysisData.results.map((result) => (
                  <motion.tr
                    key={`${result.line_number}-${result.original_text}`}
                    className="border-b border-white/10 transition hover:bg-white/5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <td className="px-4 py-3 max-w-xs truncate text-slate-200">{result.original_text}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          result.sentiment === 'positive'
                            ? 'bg-green-500/20 text-green-200'
                            : result.sentiment === 'negative'
                              ? 'bg-red-500/20 text-red-200'
                              : 'bg-slate-500/20 text-slate-200'
                        }`}
                      >
                        {result.sentiment.charAt(0).toUpperCase() + result.sentiment.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{(result.confidence * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{result.vader_score.toFixed(3)}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{result.textblob_score.toFixed(3)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </motion.div>
      )}

      {/* Empty State */}
      {!analysisData && !isLoading && (
        <motion.div
          className={`${sectionClass} py-12 text-center`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-slate-400">
            {inputMode === 'paste'
              ? 'Paste your text above to get started with sentiment analysis.'
              : 'Upload a text file to analyze sentiments and extract insights.'}
          </p>
        </motion.div>
      )}
    </PageWrapper>
  )
}

function BlueskyAnalysisPage() {
  const [keyword, setKeyword] = useState('')
  const [limit, setLimit] = useState(10)
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!keyword.trim()) {
      setError('Please enter a search keyword.')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      setResult(await analyzeBluesky({ keyword: keyword.trim(), limit: Number(limit) }))
    } catch (apiError) {
      setResult(null)
      setError(apiError.message || 'Failed to analyze Bluesky posts.')
    } finally {
      setIsLoading(false)
    }
  }

  const sentimentChartData = result
    ? [
        { name: 'Positive', value: result.positive ?? 0, color: '#22c55e' },
        { name: 'Negative', value: result.negative ?? 0, color: '#ef4444' },
        { name: 'Neutral', value: result.neutral ?? 0, color: '#facc15' },
      ]
    : []

  const posts = result?.posts ?? []

  return (
    <PageWrapper title="Bluesky Analysis" subtitle="Analyze Bluesky posts and social trends by keyword.">
      <form onSubmit={handleSubmit} className={`${sectionClass} mb-6 flex flex-wrap items-center gap-3`}>
        <input
          type="text"
          placeholder="Enter keyword (e.g. AI, tech, news)"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          className="min-w-[230px] flex-1 rounded-xl border border-white/20 bg-black/30 px-4 py-2.5 text-slate-200 placeholder:text-slate-500"
        />
        <input
          type="number"
          min="1"
          max="100"
          value={limit}
          onChange={(event) => setLimit(event.target.value)}
          className="w-28 rounded-xl border border-white/20 bg-black/30 px-4 py-2.5 text-slate-200"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 px-5 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {isLoading ? 'Analyzing...' : 'Search'}
        </button>
      </form>

      {isLoading && <p className="mb-5 animate-pulse text-sky-300">Analyzing Bluesky posts...</p>}
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
        >
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              ['Total Posts', result.total ?? 0],
              ['Positive', result.positive ?? 0],
              ['Negative', result.negative ?? 0],
              ['Neutral', result.neutral ?? 0],
            ].map(([label, value]) => (
              <div key={label} className={sectionClass}>
                <p className="text-sm text-slate-400">{label}</p>
                <p className="mt-2 text-2xl font-bold text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className={`${sectionClass} bg-gradient-to-br from-purple-500/15 to-blue-500/15`}>
              <h3 className="mb-4 text-lg font-semibold tracking-wide text-white">Sentiment Distribution</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentChartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {sentimentChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={`${sectionClass} bg-gradient-to-br from-slate-700/20 to-slate-900/40`}>
              <h3 className="mb-4 text-lg font-semibold tracking-wide text-white">Summary Stats</h3>
              <div className="overflow-hidden rounded-xl border border-white/10">
                <table className="w-full text-left text-sm text-slate-200">
                  <tbody>
                    {[
                      ['Total Posts Analyzed', result.total ?? 0],
                      ['Positive Sentiment', result.positive ?? 0],
                      ['Negative Sentiment', result.negative ?? 0],
                      ['Neutral Sentiment', result.neutral ?? 0],
                      ['Average Confidence', `${((result.summary?.average_confidence ?? 0) * 100).toFixed(1)}%`],
                    ].map(([label, value]) => (
                      <tr key={label} className="border-b border-white/10 last:border-b-0">
                        <td className="px-4 py-3 text-slate-400">{label}</td>
                        <td className="px-4 py-3 font-semibold text-white">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className={`${sectionClass} overflow-x-auto`}>
            <h3 className="mb-4 text-lg font-semibold tracking-wide text-white">Posts</h3>
            {posts.length > 0 ? (
              <table className="w-full min-w-[760px] text-left text-sm text-slate-300">
                <thead className="text-slate-200">
                  <tr className="border-b border-white/20">
                    <th className="px-3 py-3">Author</th>
                    <th className="px-3 py-3">Post Text</th>
                    <th className="px-3 py-3">Sentiment</th>
                    <th className="px-3 py-3">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post, idx) => (
                    <tr key={`${idx}-${post.author}`} className="border-b border-white/10 hover:bg-white/5">
                      <td className="px-3 py-3 text-xs font-medium text-slate-300">{post.author}</td>
                      <td className="px-3 py-3 max-w-xs truncate">{post.text}</td>
                      <td className="px-3 py-3 capitalize text-white">{post.sentiment}</td>
                      <td className="px-3 py-3">{(post.confidence * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-slate-400">No posts to display</p>
            )}
          </div>
        </motion.div>
      )}

      {!result && !isLoading && (
        <motion.div
          className={`${sectionClass} py-12 text-center`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-slate-400">
            Enter a keyword above to search and analyze Bluesky posts by sentiment.
          </p>
        </motion.div>
      )}
    </PageWrapper>
  )
}

function YouTubeAnalysisPage() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!url.trim()) {
      setError('Please enter a YouTube video URL.')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      setResult(await analyzeYoutube({ url: url.trim(), limit: 50 }))
    } catch (apiError) {
      setResult(null)
      setError(apiError.message || 'Failed to analyze YouTube comments.')
    } finally {
      setIsLoading(false)
    }
  }

  const sentimentChartData = result
    ? [
        { name: 'Positive', value: result.sentiment_counts?.positive ?? 0, color: '#22c55e' },
        { name: 'Negative', value: result.sentiment_counts?.negative ?? 0, color: '#ef4444' },
        { name: 'Neutral', value: result.sentiment_counts?.neutral ?? 0, color: '#facc15' },
      ]
    : []

  const getConfidenceSentimentData = (comments) => {
    const buckets = {
      low: { positive: 0, negative: 0, neutral: 0 },
      medium: { positive: 0, negative: 0, neutral: 0 },
      high: { positive: 0, negative: 0, neutral: 0 },
    }

    comments.forEach((c) => {
      const confidence = Number(c.confidence) || 0
      const sentiment = c.sentiment
      let bucket

      if (confidence < 0.4) bucket = 'low'
      else if (confidence < 0.7) bucket = 'medium'
      else bucket = 'high'

      if (sentiment in buckets[bucket]) {
        buckets[bucket][sentiment] += 1
      }
    })

    return [
      { name: 'Low', ...buckets.low },
      { name: 'Medium', ...buckets.medium },
      { name: 'High', ...buckets.high },
    ]
  }

  const comments = result?.comments ?? []
  const confidenceData = getConfidenceSentimentData(comments)

  return (
    <PageWrapper title="YouTube Analysis" subtitle="Analyze YouTube comment sentiment and engagement insights.">
      <form onSubmit={handleSubmit} className={`${sectionClass} mb-6 flex flex-wrap items-center gap-3`}>
        <input
          type="text"
          placeholder="https://www.youtube.com/watch?v=..."
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          className="min-w-[250px] flex-1 rounded-xl border border-white/20 bg-black/30 px-4 py-2.5 text-slate-200 placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 px-5 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {isLoading ? 'Analyzing...' : 'Submit'}
        </button>
      </form>

      {isLoading && <p className="mb-5 animate-pulse text-sky-300">Analyzing YouTube comments...</p>}
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
        >
          <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className={`${sectionClass} bg-gradient-to-br from-purple-500/15 to-blue-500/15`}>
              <h3 className="mb-4 text-lg font-semibold tracking-wide text-white">Sentiment Distribution</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentChartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {sentimentChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={`${sectionClass} bg-gradient-to-br from-slate-700/20 to-slate-900/40`}>
              <h3 className="mb-4 text-lg font-semibold tracking-wide text-white">Video Stats</h3>
              <div className="overflow-hidden rounded-xl border border-white/10">
                <table className="w-full text-left text-sm text-slate-200">
                  <tbody>
                    {[
                      ['Total Comments', result.video_info?.total_comments ?? result.comments?.length ?? 0],
                      ['Positive', result.sentiment_counts?.positive ?? 0],
                      ['Negative', result.sentiment_counts?.negative ?? 0],
                      ['Neutral', result.sentiment_counts?.neutral ?? 0],
                      ['Views', result.video_info?.views ?? 0],
                      ['Likes', result.video_info?.likes ?? 0],
                      ['Channel Name', result.video_info?.channel ?? '-'],
                    ].map(([label, value]) => (
                      <tr key={label} className="border-b border-white/10 last:border-b-0">
                        <td className="px-4 py-3 text-slate-400">{label}</td>
                        <td className="px-4 py-3 font-semibold text-white">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-lg">
              <h2 className="mb-4 text-xl font-semibold text-white">
                Confidence Distribution by Sentiment
              </h2>

              {comments.length === 0 ? (
                <div className="py-10 text-center text-gray-400">No data available</div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={confidenceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="name" stroke="#aaa" tick={{ fill: '#aaa' }} />
                    <YAxis stroke="#aaa" tick={{ fill: '#aaa' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111',
                        border: '1px solid #333',
                        borderRadius: '10px',
                        color: '#fff',
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="positive"
                      stackId="a"
                      fill="#22c55e"
                      radius={[6, 6, 0, 0]}
                      isAnimationActive
                    />
                    <Bar dataKey="negative" stackId="a" fill="#ef4444" isAnimationActive />
                    <Bar dataKey="neutral" stackId="a" fill="#eab308" isAnimationActive />
                  </BarChart>
                </ResponsiveContainer>
              )}

              <p className="mt-3 text-sm text-gray-400">
                This chart shows how confident the model is for each sentiment category.
              </p>
            </div>
          </motion.div>

          <div className={`${sectionClass} mb-6 bg-gradient-to-r from-purple-600/15 via-blue-600/10 to-cyan-500/15`}>
            <h3 className="mb-3 text-lg font-semibold tracking-wide text-white">Video Summary</h3>
            <div className="grid grid-cols-1 gap-3 text-sm text-slate-300 md:grid-cols-2">
              <p>
                <span className="font-semibold text-slate-200">Video Title:</span>{' '}
                {result.video_info?.title || '-'}
              </p>
              <p>
                <span className="font-semibold text-slate-200">Channel Name:</span>{' '}
                {result.video_info?.channel || '-'}
              </p>
              <p className="md:col-span-2">
                <span className="font-semibold text-slate-200">Topic:</span>{' '}
                {result.summary?.video_topic || '-'}
              </p>
              <p className="md:col-span-2">
                <span className="font-semibold text-slate-200">Public Opinion Summary:</span>{' '}
                {result.summary?.overall_public_opinion || '-'}
              </p>
            </div>
          </div>

          <div className={`${sectionClass} overflow-x-auto`}>
            <table className="w-full min-w-[760px] text-left text-sm text-slate-300">
              <thead className="text-slate-200">
                <tr className="border-b border-white/20">
                  <th className="px-3 py-3">Comment</th>
                  <th className="px-3 py-3">Sentiment</th>
                  <th className="px-3 py-3">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {result.comments?.map((comment, idx) => (
                  <tr key={`${idx}-${comment.text}`} className="border-b border-white/10">
                    <td className="px-3 py-3">{comment.text}</td>
                    <td className="px-3 py-3 capitalize text-white">{comment.sentiment}</td>
                    <td className="px-3 py-3">{comment.confidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </motion.div>
      )}
    </PageWrapper>
  )
}

function Layout({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#020617] to-[#020617] text-slate-200">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.24),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.2),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(236,72,153,0.12),transparent_35%)]" />
      <div className="relative z-10">
        <Navbar />
        {children}
        <footer className="border-t border-white/10 py-5 text-center text-sm tracking-wide text-slate-400">
          Sentiment Analysis Dashboard
        </footer>
      </div>
    </div>
  )
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomePage />} />
        <Route path="/text-analysis" element={<TextAnalysisPage />} />
        <Route path="/bluesky-analysis" element={<BlueskyAnalysisPage />} />
        <Route path="/youtube-analysis" element={<YouTubeAnalysisPage />} />
        <Route path="/finance-pulse" element={<FinancePulsePage />} />
        <Route path="*" element={<PageWrapper title="Not Found" subtitle="This page does not exist yet."><Link to="/" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-slate-200 transition hover:bg-white/20"><HomeIcon size={16} />Back Home</Link></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <Layout>
      <AnimatedRoutes />
    </Layout>
  )
}

export default App
