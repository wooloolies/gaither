import { useFieldContext } from '@/hooks/use-form'
import { getErrorMessage, cn } from '@/lib/utils'

interface NumberFieldProps {
  label: string
  placeholder?: string
  required?: boolean
  min?: number
  max?: number
  className?: string
  inputClassName?: string
}

export function NumberField({
  label,
  placeholder,
  required = false,
  min,
  max,
  className,
  inputClassName,
}: NumberFieldProps) {
  const field = useFieldContext<number>()

  const isInvalid = !field.state.meta.isValid && field.state.meta.isTouched

  return (
    <div className={className}>
      <label className="block text-sm font-medium mb-2 text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <input
        type="number"
        id={field.name}
        {...(isInvalid ? { 'aria-invalid': true } : {})}
        value={field.state.value ?? ''}
        onChange={(e) => {
          const value = e.target.value
          field.handleChange(value === '' ? undefined : Number(value))
        }}
        onBlur={field.handleBlur}
        min={min !== undefined ? String(min) : undefined}
        max={max !== undefined ? String(max) : undefined}
        className={cn(
          'w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors',
          inputClassName
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
