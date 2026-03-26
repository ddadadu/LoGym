import { NavLink, useLocation } from 'react-router-dom'
import { Dumbbell, Info, Building } from 'lucide-react'

export default function StoreBottomNav() {
  const location = useLocation()

  const navItems = [
    { name: '내 점포 관리',   path: '/store', icon: Dumbbell },
    { name: '정보 등록 요청', path: '/store/requests', icon: Info },
    { name: '관리 점포 변경', path: '/store/change', icon: Building },
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
