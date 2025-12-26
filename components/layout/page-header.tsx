import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
  rightContent?: ReactNode;
}

export function PageHeader({ title, description, className, rightContent }: PageHeaderProps) {
  return (
    <div className={cn("mb-8", className)}>
      <div className="flex items-start justify-between gap-6 mb-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900 leading-tight mb-2">
            {title}
          </h1>
          {description && (
            <p className="text-sm md:text-base text-slate-600 max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {rightContent && (
          <div className="flex-shrink-0 mt-1">
            {rightContent}
          </div>
        )}
      </div>
    </div>
  );
}

