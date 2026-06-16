import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-[#DDE5F2] bg-white/85 px-3.5 py-2 text-sm text-[#27324D] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] ring-offset-background transition-all duration-200 placeholder:text-[#9AA6B8] file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:border-[#AEB9FF] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#5B6BF5]/10 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:opacity-60",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
