export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-black/10 ${className}`}
      {...props}
    />
  )
}
