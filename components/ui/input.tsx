import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md px-3 py-2 text-sm focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      style={{
        border: '1px solid var(--c-borPri)',
        background: 'var(--c-bacPri)',
        color: 'var(--c-texPri)',
      }}
      onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px var(--c-bacPri), 0 0 0 4px var(--nx-blue)'; }}
      onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
      ref={ref}
      {...props}
    />
  )
)
Input.displayName = "Input"

export { Input }
