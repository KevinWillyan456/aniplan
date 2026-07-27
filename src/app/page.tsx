import { Suspense } from 'react'

import HomePageContent from './page-content'

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0a0a1a]">
          <div className="size-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
        </div>
      }
    >
      <HomePageContent />
    </Suspense>
  )
}
