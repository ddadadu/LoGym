import PullToRefresh from 'react-simple-pull-to-refresh'
import { RefreshCw } from 'lucide-react'

export default function PullToRefreshWrapper({ onRefresh, children }) {
  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh()
    } else {
      // 기본적으로 1초 대기 (테스트용)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  const CustomRefresh = () => (
    <div className="flex w-full items-center justify-center py-4 text-[#8b95a1]">
      <RefreshCw className="h-5 w-5 animate-spin" />
    </div>
  )

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      pullingContent={''}
      refreshingContent={<CustomRefresh />}
      className="h-full"
    >
      {children}
    </PullToRefresh>
  )
}
