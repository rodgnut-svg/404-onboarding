import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

export function PageHeader({ title, description, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-8 space-y-2", className)}>
      <h1 className="font-sans font-semibold tracking-tight" style={{ fontSize: "2.5rem" }}>{title}</h1>
      {description && (
        <p className="text-base text-muted max-w-2xl" style={{ fontSize: "1rem" }}>{description}</p>
      )}
    </div>
  );
}

