import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-navy-100 text-navy-700 border border-navy-200',
        verified:
          'bg-emerald-50 text-emerald-700 border border-emerald-200',
        featured:
          'bg-gold-100 text-gold-700 border border-gold-300',
        pending:
          'bg-yellow-50 text-yellow-700 border border-yellow-200',
        rejected:
          'bg-red-50 text-red-700 border border-red-200',
        gray:
          'bg-gray-100 text-gray-600 border border-gray-200',
        blue:
          'bg-blue-50 text-blue-700 border border-blue-200',
        purple:
          'bg-purple-50 text-purple-700 border border-purple-200',
        success:
          'bg-emerald-50 text-emerald-700 border border-emerald-200',
        warning:
          'bg-yellow-50 text-yellow-700 border border-yellow-200',
        destructive:
          'bg-red-50 text-red-700 border border-red-200',
        secondary:
          'bg-gray-100 text-gray-600 border border-gray-200',
      },
      size: {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-3 py-1',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {children}
    </span>
  )
}

export { Badge, badgeVariants }
