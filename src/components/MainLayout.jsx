import { Outlet } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import BottomNav from './BottomNav'
import NotificationBell from './NotificationBell'

export default function MainLayout() {
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  return (
    <div className="flex h-[100dvh] flex-col bg-gray-50 font-sans text-gray-900 pb-[env(safe-area-inset-bottom)] overflow-hidden">
      {/* App Bar Placeholder */}
      <header className="flex h-14 items-center justify-between bg-white shadow-sm shrink-0 z-50 relative px-4">
        <h1 className="text-xl font-bold text-gray-800">LoGym</h1>
        <NotificationBell userId={userId} />
      </header>
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto w-full relative min-h-0">
        <div className="px-4 py-4 min-h-full">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
