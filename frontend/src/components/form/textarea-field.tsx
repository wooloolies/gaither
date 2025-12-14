import { useFieldContext } from '@/hooks/use-form'
import { getErrorMessage } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface TextareaFieldProps {
  label: string
  placeholder?: string
  required?: boolean
  rows?: number
  className?: string
  textareaClassName?: string
}

export function TextareaField({
  label,
  placeholder,
  required = false,
  rows = 6,
  className,
  textareaClassName,
}: TextareaFieldProps) {
  const field = useFieldContext<string>()

  const isInvalid = !field.state.meta.isValid && field.state.meta.isTouched

  return (
    <div className={className}>
      <label className="block text-sm font-medium mb-2 text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <textarea
        id={field.name}
        {...(isInvalid ? { 'aria-invalid': true } : {})}
        value={field.state.value ?? ''}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        rows={rows}
        className={cn(
          'w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors resize-y',
          textareaClassName
        )}
        placeholder={placeholder}
      />
      {field.state.meta.errors.length > 0 && (
        <p className="text-sm text-destructive mt-1">
          {getErrorMessage(field.state.meta.errors[0])}
        </p>
      )}
    </div>
  )
}
