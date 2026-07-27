'use client'

import { CircleCheckIcon, InfoIcon, OctagonXIcon, TriangleAlertIcon } from 'lucide-react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      closeButton
      icons={{
        error: <OctagonXIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        success: <CircleCheckIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
      }}
      style={
        {
          '--border-radius': '12px',
          '--error-bg': '#450a0a',
          '--error-border': 'rgba(239, 68, 68, 0.2)',
          '--error-text': '#e2e8f0',
          '--info-bg': '#172554',
          '--info-border': 'rgba(59, 130, 246, 0.2)',
          '--info-text': '#e2e8f0',
          '--normal-bg': '#1e1b4b',
          '--normal-border': 'rgba(139, 92, 246, 0.2)',
          '--normal-text': '#e2e8f0',
          '--success-bg': '#052e16',
          '--success-border': 'rgba(34, 197, 94, 0.2)',
          '--success-text': '#e2e8f0',
          '--warning-bg': '#422006',
          '--warning-border': 'rgba(234, 179, 8, 0.2)',
          '--warning-text': '#e2e8f0',
        } as React.CSSProperties
      }
      theme="dark"
      toastOptions={{
        classNames: {
          toast: 'border shadow-lg shadow-purple-500/10',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
