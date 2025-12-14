import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extracts error message from TanStack Form field errors.
 * Handles both string errors and StandardSchemaV1Issue objects from Zod v4.
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'Invalid value'
}
