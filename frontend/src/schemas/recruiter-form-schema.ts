import { z } from 'zod'

export const recruiterFormSchema = z.object({
  model: z.enum(['recommend', 'good-for'], {
    error: (issue) => issue.input === undefined 
      ? 'Please select a model type' 
      : 'Invalid model type selected',
  }),
  recruiterName: z.string().min(1, 'Your name is required'),
  targetRoleTitle: z.string().min(1, 'Target role title is required'),
  companyIdentifier: z.string().min(1, 'Company identifier is required'),
  languageRequirement: z.string().min(1, 'Language requirement is required'),
  keyResponsibilities: z.string().min(10, 'Key responsibilities must be at least 10 characters'),
  coreSkillRequirement: z.string().min(1, 'Core skill requirement is required'),
  familiarWith: z.string().min(1, 'Please specify what they should be familiar with'),
  location: z.string().min(1, 'Location is required'),
  workType: z.enum(['onsite', 'hybrid', 'remote'], {
    error: (issue) => issue.input === undefined 
      ? 'Please select a work type' 
      : 'Invalid work type selected',
  }),
  yearsOfExperience: z
    .number({
      error: (issue) => {
        if (issue.input === undefined) {
          return 'Years of experience is required'
        }
        return 'Years of experience must be a number'
      },
    })
    .min(0, 'Years of experience must be 0 or greater')
    .max(50, 'Years of experience must be 50 or less'),
  minimumRequiredDegree: z.string().min(1, 'Minimum required degree is required'),
  grade: z
    .number({
      error: (issue) => {
        if (issue.input === undefined) {
          return 'Grade is required'
        }
        return 'Grade must be a number'
      },
    })
    .min(50, 'Grade must be 50 or greater')
    .max(90, 'Grade must be 90 or less'),
})

export type RecruiterFormData = z.infer<typeof recruiterFormSchema>

