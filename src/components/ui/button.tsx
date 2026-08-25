'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import styles from './button.module.css';

const buttonVariants = cva(
  styles.buttonBase,
  {
    variants: {
      variant: {
        default: styles.variantDefault,
        gold: styles.variantGold,
        secondary: styles.variantSecondary,
        outline: styles.variantOutline,
        ghost: styles.variantGhost,
        link: styles.variantLink,
      },
      size: {
        default: styles.sizeDefault,
        sm: styles.sizeSm,
        lg: styles.sizeLg,
        icon: styles.sizeIcon,
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
