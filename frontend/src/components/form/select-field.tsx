import { useFieldContext } from '@/hooks/use-form'
import { getErrorMessage } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface SelectFieldProps<T extends string = string> {
  label: string
  required?: boolean
  className?: string
  selectClassName?: string
  options: Array<{ value: T; label: string }>
  ariaLabel?: string
}

export function SelectField<T extends string = string>({
  label,
  required = false,
  className,
  selectClassName,
  options,
  ariaLabel,
}: SelectFieldProps<T>) {
  const field = useFieldContext<T>()

  const isInvalid = !field.state.meta.isValid && field.state.meta.isTouched

  return (
    <div className={className}>
      <label className="block text-sm font-medium mb-2 text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <select
        id={field.name}
        aria-label={ariaLabel || label}
        {...(isInvalid ? { 'aria-invalid': true } : {})}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value as T)}
        onBlur={field.handleBlur}
        className={cn(
          'w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors',
          selectClassName
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {field.state.meta.errors.length > 0 && (
        <p className="text-sm text-destructive mt-1">
          {getErrorMessage(field.state.meta.errors[0])}
        </p>
      )}
    </div>
  )
}
