'use client'

import { RecruiterForm } from '@/features/hire/components/recruiter-form'

export default function HirePage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <RecruiterForm />
      </div>
    </div>
  )
}
