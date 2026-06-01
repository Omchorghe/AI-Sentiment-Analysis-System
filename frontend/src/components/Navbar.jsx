import { Link, NavLink } from 'react-router-dom'

const navItems = [
  { label: 'Home', path: '/' },
  { label: 'Text Analysis', path: '/text-analysis' },
  { label: 'Bluesky Analysis', path: '/bluesky-analysis' },
  { label: 'YouTube Analysis', path: '/youtube-analysis' },
  { label: 'Finance Pulse', path: '/finance-pulse' },
]

function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-md">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 md:px-6">
        <Link
          to="/"
          className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-lg font-bold tracking-wide text-transparent md:text-xl"
        >
          Sentiment Analysis Dashboard
        </Link>

        <ul className="hidden items-center gap-5 lg:flex">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `group relative text-sm font-medium tracking-wide transition ${
                    isActive ? 'text-white' : 'text-gray-300 hover:text-white'
                  }`
                }
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 h-[2px] w-0 bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300 group-hover:w-full" />
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}

export default Navbar
