import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B6BF5]/35 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[#5B6BF5] text-white shadow-[0_10px_24px_rgba(91,107,245,0.24)] hover:bg-[#4F5DE0] hover:shadow-[0_14px_30px_rgba(91,107,245,0.28)] active:scale-[0.98]",
        destructive:
          "bg-red-500 text-white shadow-[0_10px_24px_rgba(239,68,68,0.18)] hover:bg-red-600 active:scale-[0.98]",
        outline:
          "border border-[#D8E0EE] bg-white text-[#27324D] shadow-[0_6px_16px_rgba(29,41,75,0.04)] hover:border-[#C8D2E4] hover:bg-[#F8FAFC] active:scale-[0.98]",
        secondary:
          "bg-[#F3F6FF] text-[#4F5DE0] hover:bg-[#EBEFFF]",
        ghost: "text-[#27324D] hover:bg-[#F1F5F9] active:scale-[0.98]",
        link: "text-[#5B6BF5] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
