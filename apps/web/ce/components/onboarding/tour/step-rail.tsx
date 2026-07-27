import { Check } from "lucide-react";
import { cn } from "@plane/utils";
// local imports
import type { TTourStep, TTourStepKey } from "./steps";

type Props = {
  steps: TTourStep[];
  currentIndex: number;
  onSelect: (key: TTourStepKey) => void;
};

export function TourStepRail({ steps, currentIndex, onSelect }: Props) {
  return (
    <div className="hidden shrink-0 border-r border-subtle bg-surface-2 p-6 lg:block lg:w-64">
      <h3 className="text-15 font-semibold text-primary">Let{"'"}s get started!</h3>
      <p className="mt-1 text-12 text-secondary">A quick look around FlyersPlane.</p>
      <ol className="mt-6 space-y-1">
        {steps.map((step, index) => {
          const isActive = index === currentIndex;
          const isDone = index < currentIndex;
          return (
            <li key={step.key}>
              <button
                type="button"
                onClick={() => onSelect(step.key)}
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "flyers-tour-rail-item flex w-full items-center gap-2.5 rounded-lg border-l-[3px] px-3 py-2 text-left text-13 font-medium transition-colors duration-150",
                  isActive
                    ? "flyers-tour-rail-item-active"
                    : "border-transparent text-secondary hover:bg-surface-3 hover:text-primary"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-11",
                    isActive && "flyers-tour-rail-dot-active",
                    isDone && !isActive && "bg-[#8b5cf6]/15 text-[#7c3aed]"
                  )}
                >
                  {isDone && !isActive ? <Check className="h-3 w-3" strokeWidth={2.5} /> : <step.Icon className="h-3.5 w-3.5" strokeWidth={2} />}
                </span>
                {step.label}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
