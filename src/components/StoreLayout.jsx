import { Outlet } from 'react-router-dom'
import StoreBottomNav from './StoreBottomNav'

export default function StoreLayout() {
  return (
    <div className="flex h-[100dvh] flex-col bg-gray-50 font-sans text-gray-900 pb-[env(safe-area-inset-bottom)] overflow-hidden">
      {/* App Bar Placeholder */}
      <header className="flex h-14 items-center justify-center bg-[#191f28] shadow-sm shrink-0 z-10 relative">
        <h1 className="text-xl font-bold text-white">LoGym 점장용</h1>
      </header>
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto w-full relative">
        <div className="px-4 py-4 min-h-full">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation */}
      <StoreBottomNav />
    </div>
  )
}
