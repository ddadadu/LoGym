import { NavLink, useLocation } from 'react-router-dom'
import { Home, Dumbbell, Search, MapPin, User, Users } from 'lucide-react'

export default function BottomNav() {
  const location = useLocation()

  const navItems = [
    { name: '홈',   path: '/', icon: Home },
    { name: '운동상황', path: '/workout', icon: Dumbbell },
    { name: '커뮤니티', path: '/community', icon: Users },
    { name: '내 헬스장', path: '/mygym', icon: MapPin },
    { name: '프로필', path: '/profile', icon: User },
  ]

  return (
    <nav className="shrink-0 bg-white shadow-[0_-1px_0_0_#e5e8eb] z-20 w-full relative">
      <ul className="flex justify-around items-center h-[60px] max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <li key={item.path} className="flex-1">
              <NavLink
                to={item.path}
                className={`flex flex-col items-center justify-center h-full w-full gap-1 transition-colors ${
                  isActive ? 'text-[#3182f6]' : 'text-[#8b95a1]'
                }`}
              >
                <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.2 : 1.6} />
                <span className="text-[11px]" style={{ fontWeight: isActive ? 600 : 400 }}>
                  {item.name}
                </span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
