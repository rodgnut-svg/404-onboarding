import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const avatarVariants = cva(
  "inline-flex items-center justify-center rounded-full font-semibold text-foreground",
  {
    variants: {
      size: {
        default: "h-10 w-10 text-base",
        sm: "h-8 w-8 text-sm",
        lg: "h-12 w-12 text-lg",
      },
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border-2 border-border bg-background",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
);

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  initial?: string;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size, variant, initial = "U", ...props }, ref) => {
    const displayInitial = initial ? initial.toUpperCase().charAt(0) : "U";

    return (
      <div
        ref={ref}
        className={cn(avatarVariants({ size, variant }), className)}
        {...props}
      >
        {displayInitial}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";

export { Avatar, avatarVariants };
