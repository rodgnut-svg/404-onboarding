import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

export function PageHeader({ title, description, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-10 space-y-3", className)}>
      <h1 className="font-sans font-bold tracking-tight text-foreground" style={{ fontSize: "2.5rem", lineHeight: "1.1", letterSpacing: "-0.03em" }}>{title}</h1>
      {description && (
        <p className="text-base text-muted-foreground max-w-2xl leading-relaxed" style={{ fontSize: "1rem", lineHeight: "1.6" }}>{description}</p>
      )}
    </div>
  );
}

