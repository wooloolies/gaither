'use client'

import { useRouter } from 'next/navigation'
import { useSession, listAccounts } from '@/lib/auth/auth-client'
import { useMutation } from '@tanstack/react-query'
import { revalidateLogic } from '@tanstack/react-form'
import { useAppForm } from '@/hooks/use-form'
import { recruiterFormSchema, type RecruiterFormData } from '@/schemas/recruiter-form-schema'
import { Button } from '@/components/ui/button'
import { jobsApi } from '@/lib/api'
import { useAgentStore } from '@/store/agent-store'
import { useEffect, useState } from 'react'

export default function HirePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { setSelectedModel } = useAgentStore()
  const [isLinkedIn, setIsLinkedIn] = useState(false)

  // Create mutation for form submission
  const mutation = useMutation({
    mutationFn: async (data: RecruiterFormData) => {
      // Map recruiter form data to JobRequest format with individual fields
      const jobData = {
        title: data.targetRoleTitle,
        company_name: data.companyIdentifier,
        location: `${data.location} (${data.workType})`,
        description: data.keyResponsibilities,
        requirements: [
          data.coreSkillRequirement,
          data.familiarWith,
          `Years of Experience: ${data.yearsOfExperience}`,
          `Minimum Required Degree: ${data.minimumRequiredDegree}`,
        ].filter(Boolean),
        model_provider: data.model === 'recommend' ? 'claude' : 'gemini',
        // Additional recruiter form fields
        recruiter_name: data.recruiterName,
        language_requirement: data.languageRequirement,
        key_responsibilities: data.keyResponsibilities,
        core_skill_requirement: data.coreSkillRequirement,
        familiar_with: data.familiarWith,
        work_type: data.workType,
        years_of_experience: data.yearsOfExperience,
        minimum_required_degree: data.minimumRequiredDegree,
        grade: data.grade,
      }

      // Set the selected model in the store
      setSelectedModel(jobData.model_provider || 'claude')

      // Create the job
      const job = await jobsApi.create(jobData)
      
      // Start the job
      await jobsApi.start(job.id)
      
      return job
    },
    onSuccess: (_job) => {
      // Navigate to sample page which shows the Dashboard
      router.push('/sample')
    },
    onError: (error) => {
      console.error('Error submitting form:', error)
      alert('Error submitting form. Please try again.')
    },
  })

  // Determine default values with LinkedIn auto-fill
  const getDefaultValues = (): RecruiterFormData => {
    const defaults: RecruiterFormData = {
      model: 'recommend',
      recruiterName: '',
      targetRoleTitle: '',
      companyIdentifier: '',
      languageRequirement: '',
      keyResponsibilities: '',
      coreSkillRequirement: '',
      familiarWith: '',
      location: '',
      workType: 'remote',
      yearsOfExperience: 0,
      minimumRequiredDegree: '',
      grade: 50,
    }

    // Auto-fill from LinkedIn session if available
    if (session?.user && isLinkedIn) {
      const user = session.user
      // Extract name from user object
      const name = user.name || (user.email?.split('@')[0] ?? '')
      if (name) {
        defaults.recruiterName = name
      }

      // Try to extract company info if available
      // Note: company might not be in standard user object, may need customSession plugin
      const company = ''
      if (company) {
        defaults.companyIdentifier = company
      }
    }

    return defaults
  }

  const form = useAppForm({
    defaultValues: getDefaultValues(),
    validators: {
      onDynamic: recruiterFormSchema,
    },
    validationLogic: revalidateLogic(),
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value)
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

  // Check for LinkedIn account and update form values when session loads
  useEffect(() => {
    const checkLinkedInAccount = async () => {
      if (session?.user) {
        try {
          const accountsResult = await listAccounts()
          // Handle the result type - Data type has a .data property
          if (accountsResult && 'data' in accountsResult) {
            const accounts = accountsResult.data
            if (Array.isArray(accounts)) {
              const hasLinkedIn = accounts.some(
                (account: { providerId: string }) => account.providerId === 'linkedin'
              )
              setIsLinkedIn(hasLinkedIn)

              if (hasLinkedIn) {
                const user = session.user
                const name = user.name || (user.email?.split('@')[0] ?? '')
                if (name && !form.state.values.recruiterName) {
                  form.setFieldValue('recruiterName', name)
                }

                // Note: company might not be in standard user object, may need customSession plugin
                const company = ''
                if (company && !form.state.values.companyIdentifier) {
                  form.setFieldValue('companyIdentifier', company)
                }
              }
            }
          }
        } catch (error) {
          console.error('Error checking accounts:', error)
        }
      }
    }

    checkLinkedInAccount()
  }, [session, form])

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-panel border border-border p-8 rounded-2xl shadow-xl">
          <h1 className="text-3xl font-bold mb-6 text-foreground">Recruiter Fill-out Form</h1>
          
          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              void form.handleSubmit()
            }}
            className="space-y-6"
          >
              {/* Model Selection and Grade */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Model Selection */}
                <form.AppField name="model">
                  {(field) => (
                    <field.SelectField
                      label="Model"
                      required
                      ariaLabel="Model selection"
                      options={[
                        { value: 'recommend' as const, label: 'Recommend' },
                        { value: 'good-for' as const, label: 'Good For...' },
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
                      max={100}
                      placeholder="50-100"
                    />
                  )}
                </form.AppField>
              </div>

              {/* Recruiter Name and Target Role Title */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Recruiter Name */}
                <form.AppField name="recruiterName">
                  {(field) => (
                    <field.TextField
                      label="Your Name"
                      required
                      placeholder="Enter your name"
                    />
                  )}
                </form.AppField>

                {/* Target Role Title */}
                <form.AppField name="targetRoleTitle">
                  {(field) => (
                    <field.TextField
                      label="Target Role Title"
                      required
                      placeholder="e.g. Senior Software Engineer"
                    />
                  )}
                </form.AppField>
              </div>

              {/* Company Identifier and Language Requirement */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Company Identifier */}
                <form.AppField name="companyIdentifier">
                  {(field) => (
                    <field.TextField
                      label="Company Identifier"
                      required
                      placeholder="Your company name"
                    />
                  )}
                </form.AppField>

                {/* Language Requirement */}
                <form.AppField name="languageRequirement">
                  {(field) => (
                    <field.TextField
                      label="Language Requirement"
                      required
                      placeholder="e.g. English, Spanish"
                    />
                  )}
                </form.AppField>
              </div>

              {/* Key Responsibilities */}
              <form.AppField name="keyResponsibilities">
                {(field) => (
                  <field.TextareaField
                    label="Key Responsibilities"
                    required
                    rows={6}
                    placeholder="What are you expecting them to do?"
                  />
                )}
              </form.AppField>

              {/* Core Skill Requirement and Familiar With */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Core Skill Requirement */}
                <form.AppField name="coreSkillRequirement">
                  {(field) => (
                    <field.TextField
                      label="Core Skill Requirement"
                      required
                      placeholder="e.g. Python, SQL, React"
                    />
                  )}
                </form.AppField>

                {/* Familiar With */}
                <form.AppField name="familiarWith">
                  {(field) => (
                    <field.TextField
                      label="What are they familiar with?"
                      required
                      placeholder="e.g. AWS, Docker, Kubernetes"
                    />
                  )}
                </form.AppField>
              </div>

              {/* Location and Work Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form.AppField name="location">
                  {(field) => (
                    <field.TextField
                      label="Location"
                      required
                      placeholder="e.g. San Francisco, CA"
                    />
                  )}
                </form.AppField>

                <form.AppField name="workType">
                  {(field) => (
                    <field.SelectField
                      label="Work Type"
                      required
                      ariaLabel="Work type selection"
                      options={[
                        { value: 'onsite' as const, label: 'Onsite' },
                        { value: 'hybrid' as const, label: 'Hybrid' },
                        { value: 'remote' as const, label: 'Remote' },
                      ]}
                    />
                  )}
                </form.AppField>
              </div>

              {/* Years of Experience and Minimum Required Degree */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Years of Experience */}
                <form.AppField name="yearsOfExperience">
                  {(field) => (
                    <field.NumberField
                      label="Years of Experience"
                      required
                      min={0}
                      max={50}
                      placeholder="0"
                    />
                  )}
                </form.AppField>

                {/* Minimum Required Degree */}
                <form.AppField name="minimumRequiredDegree">
                  {(field) => (
                    <field.TextField
                      label="Minimum Required Degree"
                      required
                      placeholder="e.g. Bachelor's degree in Computer Science"
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
                      disabled={!canSubmit || mutation.isPending || isSubmitting}
                      className="w-full cursor-pointer"
                    >
                      {mutation.isPending || isSubmitting ? 'Submitting...' : 'Submit Job Posting'}
                    </Button>
                  )}
                </form.Subscribe>
                {mutation.isError && (
                  <p className="text-sm text-destructive mt-2">
                    Error submitting form. Please try again.
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
  )
}
