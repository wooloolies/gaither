'use client'

import { RecruiterForm } from '@/features/hire/components/recruiter-form'

export default function HirePage() {
  return (
    <div className="relative min-h-screen bg-background p-6">
      {/* Subtle pixel grid background */}
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05] pointer-events-none">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              'linear-gradient(to right, black 1px, transparent 1px), linear-gradient(to bottom, black 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        <RecruiterForm />
      </div>
    </div>
  )
}
