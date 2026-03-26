import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function MainLayout() {
  return (
    <div className="flex h-[100dvh] flex-col bg-gray-50 font-sans text-gray-900 pb-[env(safe-area-inset-bottom)] overflow-hidden">
      {/* App Bar Placeholder */}
      <header className="flex h-14 items-center justify-center bg-white shadow-sm shrink-0 z-10 relative">
        <h1 className="text-xl font-bold text-gray-800">LoGym</h1>
      </header>
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto w-full relative">
        <div className="px-4 py-4 min-h-full">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
