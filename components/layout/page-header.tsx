import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

export function PageHeader({ title, description, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-12 space-y-2", className)}>
      <h1 className="text-5xl font-serif font-semibold tracking-tight">{title}</h1>
      {description && (
        <p className="text-lg text-muted max-w-2xl">{description}</p>
      )}
    </div>
  );
}

