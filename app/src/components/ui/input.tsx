import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        // h-11 (44px): a thumb target. These forms are used standing up.
        'flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base',
        'ring-offset-background placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

/** Number input that brings up the numeric keypad on a phone. Always ≥ 0. */
const NumberInput = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, ...props }, ref) => (
    <Input
      ref={ref}
      type="number"
      inputMode="decimal"
      min={0}
      className={cn('num', className)}
      {...props}
    />
  ),
)
NumberInput.displayName = 'NumberInput'

export { Input, NumberInput }
