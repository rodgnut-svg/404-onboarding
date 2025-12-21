"use client";

import { useEffect, useCallback } from "react";
import { useDebouncedCallback } from "use-debounce";

interface StepWrapperProps {
  projectId: string;
  step: number;
  children: React.ReactNode;
  onSave?: (data: Record<string, any>) => Promise<void>;
}

export function StepWrapper({ projectId, step, children, onSave }: StepWrapperProps) {
  const debouncedSave = useDebouncedCallback(
    async (data: Record<string, any>) => {
      if (onSave) {
        await onSave(data);
      }
    },
    800
  );

  // This will be used by child components to trigger autosave
  useEffect(() => {
    // Expose save function via window for child components
    (window as any)[`step${step}Autosave`] = debouncedSave;
    return () => {
      delete (window as any)[`step${step}Autosave`];
    };
  }, [step, debouncedSave]);

  return <>{children}</>;
}

