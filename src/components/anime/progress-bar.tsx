'use client'

import { motion } from 'motion/react'

interface ProgressBarProps {
  className?: string
  current: number
  showLabel?: boolean
  size?: 'lg' | 'md' | 'sm'
  total: number
}

export function ProgressBar({
  className = '',
  current,
  showLabel = true,
  size = 'md',
  total,
}: ProgressBarProps) {
  const percentage = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0

  const heights = {
    lg: 'h-4',
    md: 'h-2.5',
    sm: 'h-1.5',
  }

  return (
    <div className={`${className}`}>
      {showLabel && (
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs text-white/50">
            {current}/{total} episódios
          </span>
          <span className="text-xs font-medium text-purple-400">{percentage}%</span>
        </div>
      )}
      <div className={`${heights[size]} relative overflow-hidden rounded-full bg-white/10`}>
        <motion.div
          animate={{ width: `${percentage}%` }}
          className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-purple-500 to-blue-500"
          initial={{ width: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
        {/* Shimmer effect */}
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <div className="animate-shimmer absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent" />
        </div>
      </div>
    </div>
  )
}
