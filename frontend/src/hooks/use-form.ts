import { createFormHookContexts, createFormHook } from '@tanstack/react-form'

// Create form contexts for field and form components
export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts()

// Create the form hook with contexts
export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {},
  formComponents: {},
})

