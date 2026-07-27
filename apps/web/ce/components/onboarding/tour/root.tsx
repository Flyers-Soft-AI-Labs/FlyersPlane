import { useEffect, useRef, useState } from "react";
import { observer } from "mobx-react";
import { ChevronLeft, ChevronRight, Sparkles, X } from "lucide-react";
// plane imports
import { Button } from "@plane/propel/button";
import { cn } from "@plane/utils";
// hooks
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { useUser } from "@/hooks/store/user";
import { FlyersLogo } from "@/components/common/flyers-logo";
// local imports
import { TourScreenshot } from "./screenshot";
import { TourStepRail } from "./step-rail";
import { TOUR_STEPS, type TTourStepKey } from "./steps";

export type TOnboardingTourProps = {
  onComplete: () => void;
};

const TOTAL_SLIDES = TOUR_STEPS.length + 1;

export const TourRoot = observer(function TourRoot(props: TOnboardingTourProps) {
  const { onComplete } = props;
  // states
  const [step, setStep] = useState<"welcome" | TTourStepKey>("welcome");
  // store hooks
  const { toggleCreateProjectModal } = useCommandPalette();
  const { data: currentUser } = useUser();
  // refs
  const primaryActionRef = useRef<HTMLButtonElement>(null);

  const currentIndex = TOUR_STEPS.findIndex((tourStep) => tourStep.key === step);
  const currentStep = currentIndex >= 0 ? TOUR_STEPS[currentIndex] : undefined;
  const slideNumber = step === "welcome" ? 1 : currentIndex + 2;
  const progressPercent = Math.round((slideNumber / TOTAL_SLIDES) * 100);
  const isFirstTourStep = currentIndex === 0;
  const isLastTourStep = currentIndex === TOUR_STEPS.length - 1;

  useEffect(() => {
    primaryActionRef.current?.focus();
  }, [step]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onComplete();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onComplete]);

  const goToStep = (key: TTourStepKey) => setStep(key);
  const goNext = () => {
    if (step === "welcome") {
      setStep(TOUR_STEPS[0].key);
      return;
    }
    if (!isLastTourStep) setStep(TOUR_STEPS[currentIndex + 1].key);
  };
  const goBack = () => {
    if (isFirstTourStep) {
      setStep("welcome");
      return;
    }
    if (currentIndex > 0) setStep(TOUR_STEPS[currentIndex - 1].key);
  };
  const handleFinish = () => {
    onComplete();
    toggleCreateProjectModal(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="FlyersPlane product tour"
      className={cn(
        "flyers-tour-card relative flex max-h-[90vh] w-[92%] flex-col overflow-hidden rounded-2xl border border-subtle bg-surface-1 shadow-2xl transition-all duration-300",
        step === "welcome" ? "sm:w-[26rem] md:w-[28rem]" : "sm:w-[85%] lg:w-[64rem]"
      )}
    >
      <div className="flyers-tour-progress-track" aria-hidden="true">
        <div className="flyers-tour-progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>
      <div
        role="progressbar"
        aria-valuenow={slideNumber}
        aria-valuemin={1}
        aria-valuemax={TOTAL_SLIDES}
        className="sr-only"
      >
        Step {slideNumber} of {TOTAL_SLIDES}
      </div>

      <button
        type="button"
        onClick={onComplete}
        aria-label="Close product tour"
        className="absolute top-4 right-4 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-subtle bg-surface-1/90 text-secondary transition-colors hover:bg-surface-3 hover:text-primary"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>

      {step === "welcome" ? (
        <div key="welcome" className="flyers-tour-slide-enter flex flex-col overflow-y-auto">
          <div className="flyers-tour-hero grid h-56 place-items-center">
            <FlyersLogo className="h-12 max-w-44 object-contain" />
          </div>
          <div className="flex flex-col p-6">
            <span className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#8b5cf6]/10 px-2.5 py-1 text-11 font-medium text-[#7c3aed]">
              <Sparkles className="h-3 w-3" strokeWidth={2} />
              Step 1 of {TOTAL_SLIDES}
            </span>
            <h3 className="text-18 font-semibold text-primary">Welcome to FlyersPlane</h3>
            <p className="mt-3 text-13 text-secondary">
              Welcome to FlyersPlane by Flyers Soft{currentUser?.first_name ? `, ${currentUser.first_name}` : ""}.
              Manage tickets, projects, templates, and team collaboration from one modern workspace.
            </p>
            <div className="mt-8 flex items-center gap-5">
              <Button ref={primaryActionRef} variant="primary" onClick={goNext}>
                Start Tour
              </Button>
              <button
                type="button"
                className="bg-transparent text-12 font-medium text-secondary underline-offset-2 hover:text-primary hover:underline"
                onClick={onComplete}
              >
                Skip tour
              </button>
            </div>
          </div>
        </div>
      ) : (
        currentStep && (
          <div className="flex min-h-0 flex-1">
            <TourStepRail steps={TOUR_STEPS} currentIndex={currentIndex} onSelect={goToStep} />
            <div key={currentStep.key} className="flyers-tour-slide-enter flex min-h-0 flex-1 flex-col overflow-y-auto">
              <div className="flyers-tour-screenshot-area relative h-56 shrink-0 overflow-hidden sm:h-72 lg:h-96">
                <TourScreenshot
                  src={currentStep.screenshot}
                  alt={`${currentStep.title} in FlyersPlane`}
                  Icon={currentStep.Icon}
                />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#8b5cf6]/10 text-[#7c3aed]">
                  <currentStep.Icon className="h-4.5 w-4.5" strokeWidth={2} aria-hidden="true" />
                </span>
                <h3 className="text-18 font-semibold text-primary">{currentStep.title}</h3>
                <p className="mt-2 text-13 text-secondary">{currentStep.description}</p>

                <div className="mt-6 flex items-center gap-1.5 lg:hidden" aria-hidden="true">
                  {TOUR_STEPS.map((tourStep, index) => (
                    <span
                      key={tourStep.key}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-200",
                        index === currentIndex ? "w-5 bg-[#8b5cf6]" : "w-1.5 bg-[#8b5cf6]/20"
                      )}
                    />
                  ))}
                </div>

                <div className="mt-6 flex flex-1 items-end justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Button variant="secondary" onClick={goBack} prependIcon={<ChevronLeft />}>
                      Back
                    </Button>
                    {!isLastTourStep && (
                      <Button ref={primaryActionRef} variant="primary" onClick={goNext} appendIcon={<ChevronRight />}>
                        Next
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    {!isLastTourStep && (
                      <button
                        type="button"
                        className="hidden bg-transparent text-12 font-medium text-secondary underline-offset-2 hover:text-primary hover:underline sm:inline"
                        onClick={onComplete}
                      >
                        Skip tour
                      </button>
                    )}
                    {isLastTourStep && (
                      <Button ref={primaryActionRef} variant="primary" onClick={handleFinish}>
                        {currentStep.buttonLabel ?? "Create Your First Project"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
});
