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
import { getErrorMessage } from '@/lib/utils'

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
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    Model <span className="text-destructive">*</span>
                  </label>
                  <form.Field name="model">
                    {(field) => {
                      const isInvalid = !field.state.meta.isValid && field.state.meta.isTouched
                      return (
                        <div>
                          <select
                            id="model"
                            aria-label="Model selection"
                            {...(isInvalid ? { 'aria-invalid': true } : {})}
                            value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value as 'recommend' | 'good-for')}
                          onBlur={field.handleBlur}
                          className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
                        >
                          <option value="recommend">Recommend</option>
                          <option value="good-for">Good For...</option>
                        </select>
                        {field.state.meta.errors.length > 0 && (
                          <p className="text-sm text-destructive mt-1">
                            {getErrorMessage(field.state.meta.errors[0])}
                          </p>
                        )}
                      </div>
                      )
                    }}
                  </form.Field>
                </div>

                {/* Grade */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    Grade <span className="text-destructive">*</span>
                  </label>
                  <form.Field name="grade">
                    {(field) => {
                      const isInvalid = !field.state.meta.isValid && field.state.meta.isTouched
                      return (
                        <div>
                          <input
                            type="number"
                            id="grade"
                            {...(isInvalid ? { 'aria-invalid': true } : {})}
                          value={field.state.value}
                          onChange={(e) => field.handleChange(Number(e.target.value))}
                          onBlur={field.handleBlur}
                          min="50"
                          max="100"
                          className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
                          placeholder="50-100"
                        />
                        {field.state.meta.errors.length > 0 && (
                          <p className="text-sm text-destructive mt-1">
                            {getErrorMessage(field.state.meta.errors[0])}
                          </p>
                        )}
                      </div>
                      )
                    }}
                  </form.Field>
                </div>
              </div>

              {/* Recruiter Name and Target Role Title */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Recruiter Name */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    Your Name <span className="text-destructive">*</span>
                  </label>
                  <form.Field name="recruiterName">
                    {(field) => {
                      const isInvalid = !field.state.meta.isValid && field.state.meta.isTouched
                      return (
                        <div>
                          <input
                            type="text"
                            id="recruiterName"
                            {...(isInvalid ? { 'aria-invalid': true } : {})}
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
                          placeholder="Enter your name"
                        />
                        {field.state.meta.errors.length > 0 && (
                          <p className="text-sm text-destructive mt-1">
                            {getErrorMessage(field.state.meta.errors[0])}
                          </p>
                        )}
                      </div>
                      )
                    }}
                  </form.Field>
                </div>

                {/* Target Role Title */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    Target Role Title <span className="text-destructive">*</span>
                  </label>
                  <form.Field name="targetRoleTitle">
                    {(field) => {
                      const isInvalid = !field.state.meta.isValid && field.state.meta.isTouched
                      return (
                        <div>
                          <input
                            type="text"
                            id="targetRoleTitle"
                            {...(isInvalid ? { 'aria-invalid': true } : {})}
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
                          placeholder="e.g. Senior Software Engineer"
                        />
                        {field.state.meta.errors.length > 0 && (
                          <p className="text-sm text-destructive mt-1">
                            {getErrorMessage(field.state.meta.errors[0])}
                          </p>
                        )}
                      </div>
                      )
                    }}
                  </form.Field>
                </div>
              </div>

              {/* Company Identifier and Language Requirement */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Company Identifier */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    Company Identifier <span className="text-destructive">*</span>
                  </label>
                  <form.Field name="companyIdentifier">
                    {(field) => {
                      const isInvalid = !field.state.meta.isValid && field.state.meta.isTouched
                      return (
                        <div>
                          <input
                            type="text"
                            id="companyIdentifier"
                            {...(isInvalid ? { 'aria-invalid': true } : {})}
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
                          placeholder="Your company name"
                        />
                        {field.state.meta.errors.length > 0 && (
                          <p className="text-sm text-destructive mt-1">
                            {getErrorMessage(field.state.meta.errors[0])}
                          </p>
                        )}
                      </div>
                      )
                    }}
                  </form.Field>
                </div>

                {/* Language Requirement */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    Language Requirement <span className="text-destructive">*</span>
                  </label>
                  <form.Field name="languageRequirement">
                    {(field) => {
                      const isInvalid = !field.state.meta.isValid && field.state.meta.isTouched
                      return (
                        <div>
                          <input
                            type="text"
                            id="languageRequirement"
                            {...(isInvalid ? { 'aria-invalid': true } : {})}
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
                          placeholder="e.g. English, Spanish"
                        />
                        {field.state.meta.errors.length > 0 && (
                          <p className="text-sm text-destructive mt-1">
                            {getErrorMessage(field.state.meta.errors[0])}
                          </p>
                        )}
                      </div>
                      )
                    }}
                  </form.Field>
                </div>
              </div>

              {/* Key Responsibilities */}
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  Key Responsibilities <span className="text-destructive">*</span>
                </label>
                <form.Field name="keyResponsibilities">
                  {(field) => {
                    const isInvalid = !field.state.meta.isValid && field.state.meta.isTouched
                    return (
                      <div>
                        <textarea
                          id="keyResponsibilities"
                          {...(isInvalid ? { 'aria-invalid': true } : {})}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        rows={6}
                        className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors resize-y"
                        placeholder="What are you expecting them to do?"
                      />
                      {field.state.meta.errors.length > 0 && (
                        <p className="text-sm text-destructive mt-1">
                          {getErrorMessage(field.state.meta.errors[0])}
                        </p>
                      )}
                    </div>
                    )
                  }}
                </form.Field>
              </div>

              {/* Core Skill Requirement and Familiar With */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Core Skill Requirement */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    Core Skill Requirement <span className="text-destructive">*</span>
                  </label>
                  <form.Field name="coreSkillRequirement">
                    {(field) => {
                      const isInvalid = !field.state.meta.isValid && field.state.meta.isTouched
                      return (
                        <div>
                          <input
                            type="text"
                            id="coreSkillRequirement"
                            {...(isInvalid ? { 'aria-invalid': true } : {})}
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
                          placeholder="e.g. Python, SQL, React"
                        />
                        {field.state.meta.errors.length > 0 && (
                          <p className="text-sm text-destructive mt-1">
                            {getErrorMessage(field.state.meta.errors[0])}
                          </p>
                        )}
                      </div>
                      )
                    }}
                  </form.Field>
                </div>

                {/* Familiar With */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    What are they familiar with? <span className="text-destructive">*</span>
                  </label>
                  <form.Field name="familiarWith">
                    {(field) => {
                      const isInvalid = !field.state.meta.isValid && field.state.meta.isTouched
                      return (
                        <div>
                          <input
                            type="text"
                            id="familiarWith"
                            {...(isInvalid ? { 'aria-invalid': true } : {})}
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
                          placeholder="e.g. AWS, Docker, Kubernetes"
                        />
                        {field.state.meta.errors.length > 0 && (
                          <p className="text-sm text-destructive mt-1">
                            {getErrorMessage(field.state.meta.errors[0])}
                          </p>
                        )}
                      </div>
                      )
                    }}
                  </form.Field>
                </div>
              </div>

              {/* Location and Work Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    Location <span className="text-destructive">*</span>
                  </label>
                  <form.Field name="location">
                    {(field) => {
                      const isInvalid = !field.state.meta.isValid && field.state.meta.isTouched
                      return (
                        <div>
                          <input
                            type="text"
                            id="location"
                            {...(isInvalid ? { 'aria-invalid': true } : {})}
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
                          placeholder="e.g. San Francisco, CA"
                        />
                        {field.state.meta.errors.length > 0 && (
                          <p className="text-sm text-destructive mt-1">
                            {getErrorMessage(field.state.meta.errors[0])}
                          </p>
                        )}
                      </div>
                      )
                    }}
                  </form.Field>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    Work Type <span className="text-destructive">*</span>
                  </label>
                  <form.Field name="workType">
                    {(field) => {
                      const isInvalid = !field.state.meta.isValid && field.state.meta.isTouched
                      return (
                        <div>
                          <select
                            id="workType"
                            aria-label="Work type selection"
                            {...(isInvalid ? { 'aria-invalid': true } : {})}
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value as 'onsite' | 'hybrid' | 'remote')}
                          onBlur={field.handleBlur}
                          className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
                        >
                          <option value="onsite">Onsite</option>
                          <option value="hybrid">Hybrid</option>
                          <option value="remote">Remote</option>
                        </select>
                        {field.state.meta.errors.length > 0 && (
                          <p className="text-sm text-destructive mt-1">
                            {getErrorMessage(field.state.meta.errors[0])}
                          </p>
                        )}
                      </div>
                      )
                    }}
                  </form.Field>
                </div>
              </div>

              {/* Years of Experience and Minimum Required Degree */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Years of Experience */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    Years of Experience <span className="text-destructive">*</span>
                  </label>
                  <form.Field name="yearsOfExperience">
                    {(field) => {
                      const isInvalid = !field.state.meta.isValid && field.state.meta.isTouched
                      return (
                        <div>
                          <input
                            type="number"
                            id="yearsOfExperience"
                            {...(isInvalid ? { 'aria-invalid': true } : {})}
                          value={field.state.value}
                          onChange={(e) => field.handleChange(Number(e.target.value))}
                          onBlur={field.handleBlur}
                          min="0"
                          max="50"
                          className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
                          placeholder="0"
                        />
                        {field.state.meta.errors.length > 0 && (
                          <p className="text-sm text-destructive mt-1">
                            {getErrorMessage(field.state.meta.errors[0])}
                          </p>
                        )}
                      </div>
                      )
                    }}
                  </form.Field>
                </div>

                {/* Minimum Required Degree */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    Minimum Required Degree <span className="text-destructive">*</span>
                  </label>
                  <form.Field name="minimumRequiredDegree">
                    {(field) => {
                      const isInvalid = !field.state.meta.isValid && field.state.meta.isTouched
                      return (
                        <div>
                          <input
                            type="text"
                            id="minimumRequiredDegree"
                            {...(isInvalid ? { 'aria-invalid': true } : {})}
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
                          placeholder="e.g. Bachelor's degree in Computer Science"
                        />
                        {field.state.meta.errors.length > 0 && (
                          <p className="text-sm text-destructive mt-1">
                            {getErrorMessage(field.state.meta.errors[0])}
                          </p>
                        )}
                      </div>
                      )
                    }}
                  </form.Field>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-border">
                <form.Subscribe
                  selector={(state) => [state.canSubmit, state.isSubmitting]}
                  children={([canSubmit, isSubmitting]) => (
                    <Button
                      type="submit"
                      disabled={!canSubmit || mutation.isPending || isSubmitting}
                      className="w-full cursor-pointer"
                    >
                      {mutation.isPending || isSubmitting ? 'Submitting...' : 'Submit Job Posting'}
                    </Button>
                  )}
                />
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
