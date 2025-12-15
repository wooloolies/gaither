'use client'

import { revalidateLogic } from '@tanstack/react-form'
import { useAppForm } from '@/hooks/use-form'
import { createJobApiJobsPostBody } from '@/lib/api/zod/jobs/jobs.zod'
import { Button } from '@/components/ui/button'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLinkedInAccount } from '@/features/hire/hooks/use-linkedin-account'
import { useCreateJobApiJobsPost } from '@/lib/api/jobs/jobs'
import { getDefaultValues } from '@/features/hire/utils/get-default-values'

export function RecruiterForm() {
  const router = useRouter()
  const { isLinkedIn, session } = useLinkedInAccount()

  const createJobMutation = useCreateJobApiJobsPost({
    mutation: {
      onSuccess: (job) => {
        // Navigate to job detail page where job will be fetched and validated
        if (job.id) {
          router.push(`/hire/${job.id}`)
        }
      },
      onError: (error) => {
        console.error('Error creating job:', error)
        alert('Error creating job. Please try again.')
      },
    },
  })

  const defaultValues = getDefaultValues(isLinkedIn, session?.user)
  const form = useAppForm({
    defaultValues,
    validators: {
      onDynamic: createJobApiJobsPostBody,
    },
    validationLogic: revalidateLogic(),
    onSubmit: async ({ value }) => {
      createJobMutation.mutate({ data: value })
    },
    onSubmitInvalid: () => {
      // Focus the first invalid input using aria-invalid attribute
      const firstInvalidInput = document.querySelector(
        '[aria-invalid="true"]'
      ) as HTMLElement
      if (firstInvalidInput) {
        firstInvalidInput.focus()
        firstInvalidInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    },
  })

  // Update form values when LinkedIn account is detected
  useEffect(() => {
    if (isLinkedIn && session?.user) {
      const name = session.user.name || (session.user.email?.split('@')[0] ?? '')

      if (name && !form.state.values.recruiter_name) {
        form.setFieldValue('recruiter_name', name)
      }

      // Note: company might not be in standard user object, may need customSession plugin
      const company = ''
      if (company && !form.state.values.company_name) {
        form.setFieldValue('company_name', company)
      }
    }
  }, [isLinkedIn, session?.user, form])

  return (
    <div className="bg-white dark:bg-[#3c3c3c] border-2 border-black dark:border-white p-8 md:p-10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-colors duration-500">
      <h1 className="font-pixelify text-3xl md:text-4xl mb-8 text-black dark:text-white">Recruiter Fill-out Form</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          void form.handleSubmit()
        }}
        className="space-y-6"
      >
        {/* Recruiter and Company */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Your Name */}
          <form.AppField name="recruiter_name">
            {(field) => (
              <field.TextField
                label="Your Name"
                placeholder="Enter your name"
              />
            )}
          </form.AppField>

          {/* Company Name */}
          <form.AppField name="company_name">
            {(field) => (
              <field.TextField
                label="Company Name"
                required
                placeholder="Your company name"
              />
            )}
          </form.AppField>
        </div>

        {/* Role Basics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Target Role Title */}
          <form.AppField name="title">
            {(field) => (
              <field.TextField
                label="Target Role Title"
                required
                placeholder="e.g. Senior Software Engineer"
              />
            )}
          </form.AppField>

          {/* Location */}
          <form.AppField name="location">
            {(field) => (
              <field.TextField
                label="Location"
                required
                placeholder="e.g. San Francisco, CA"
              />
            )}
          </form.AppField>
        </div>

        {/* Key Responsibilities */}
        <form.AppField name="description">
          {(field) => (
            <field.TextareaField
              label="Key Responsibilities"
              required
              rows={6}
              placeholder="What are you expecting them to do?"
            />
          )}
        </form.AppField>

        {/* Core Requirements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Core Skill Requirement */}
          <form.AppField name="core_skill_requirement">
            {(field) => (
              <field.TextField
                label="Core Skill Requirement"
                required
                placeholder="e.g. Python, SQL, React"
              />
            )}
          </form.AppField>

          {/* Familiar With */}
          <form.AppField name="familiar_with">
            {(field) => (
              <field.TextField
                label="What are they familiar with?"
                placeholder="e.g. AWS, Docker, Kubernetes"
              />
            )}
          </form.AppField>
        </div>

        {/* Work Setup */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Work Type */}
          <form.AppField name="work_type">
            {(field) => (
              <field.SelectField
                label="Work Type"
                ariaLabel="Work type selection"
                options={[
                  { value: '', label: 'Any' },
                  { value: 'onsite' as const, label: 'Onsite' },
                  { value: 'hybrid' as const, label: 'Hybrid' },
                  { value: 'remote' as const, label: 'Remote' },
                ]}
              />
            )}
          </form.AppField>

          {/* Language Requirement */}
          <form.AppField name="language_requirement">
            {(field) => (
              <field.TextField
                label="Language Requirement"
                placeholder="e.g. English, Spanish"
              />
            )}
          </form.AppField>
        </div>

        {/* Years of Experience and Minimum Required Degree */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Years of Experience */}
          <form.AppField name="years_of_experience">
            {(field) => (
              <field.NumberField
                label="Years of Experience"
                min={0}
                max={50}
                placeholder="1"
              />
            )}
          </form.AppField>

          {/* Minimum Required Degree */}
          <form.AppField name="minimum_required_degree">
            {(field) => (
              <field.TextField
                label="Minimum Required Degree"
                placeholder="e.g. Bachelor's degree in Computer Science"
              />
            )}
          </form.AppField>
        </div>

        {/* Model Selection and Grade */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Model Selection */}
          <form.AppField name="model_provider">
            {(field) => (
              <field.SelectField
                label="Model"
                required
                ariaLabel="Model selection"
                options={[
                  { value: 'gemini' as const, label: 'Gemini (gemini)' },
                  { value: 'claude' as const, label: 'Claude (claude)' },
                ]}
              />
            )}
          </form.AppField>

          {/* Grade */}
          <form.AppField name="grade">
            {(field) => (
              <field.NumberField
                label="Grade"
                required
                min={50}
                max={90}
                placeholder="50-90"
              />
            )}
          </form.AppField>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-border">
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                disabled={!canSubmit || createJobMutation.isPending || isSubmitting}
                className="w-full cursor-pointer"
              >
                {createJobMutation.isPending || isSubmitting ? 'Submitting...' : 'Submit Job Posting'}
              </Button>
            )}
          </form.Subscribe>
          {createJobMutation.isError && (
            <p className="text-sm text-destructive mt-2">
              Error submitting form. Please try again.
            </p>
          )}
        </div>
      </form>
    </div>
  )
}
