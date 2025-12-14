import type { JobCreate } from '@/lib/api/model/job-create'

interface SessionUser {
  name?: string | null
  email?: string | null
}

export function getDefaultValues(
  isLinkedIn: boolean,
  sessionUser?: SessionUser | null
): JobCreate {
  const defaults: JobCreate = {
    model_provider: 'gemini',
    recruiter_name: '',
    title: '',
    company_name: '',
    language_requirement: '',
    description: '',
    core_skill_requirement: '',
    familiar_with: '',
    location: '',
    work_type: undefined,
    years_of_experience: undefined,
    minimum_required_degree: '',
    grade: 50,
  }

  // Auto-fill from LinkedIn session if available
  if (sessionUser && isLinkedIn) {
    // Extract name from user object
    const name = sessionUser.name || (sessionUser.email?.split('@')[0] ?? '')
    if (name) {
      defaults.recruiter_name = name
    }

    // Try to extract company info if available
    // Note: company might not be in standard user object, may need customSession plugin
    const company = ''
    if (company) {
      defaults.company_name = company
    }
  }

  return defaults
}
