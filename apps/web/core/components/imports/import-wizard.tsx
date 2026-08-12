/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { mutate } from "swr";
// plane imports
import { setToast, TOAST_TYPE } from "@plane/propel/toast";
import { cn } from "@plane/utils";
// services
import { importsService, type TCSVImportRow } from "@/services/imports.service";
// local imports
import { SelectProjectStep } from "./select-project-step";
import { UploadCSVStep } from "./upload-csv-step";
import { WORKSPACE_CSV_IMPORTS_KEY } from "./previous-imports-list";

type TWizardStep = 1 | 2;

const STEPS: { step: TWizardStep; label: string }[] = [
  { step: 1, label: "Select project" },
  { step: 2, label: "Upload CSV" },
];

type Props = {
  workspaceSlug: string;
};

export function ImportWizard(props: Props) {
  const { workspaceSlug } = props;
  const [step, setStep] = useState<TWizardStep>(1);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (payload: { fileName: string; rows: TCSVImportRow[] }) => {
    if (!projectId) return;
    setIsSubmitting(true);
    try {
      await importsService.createCSVImport(workspaceSlug, projectId, {
        file_name: payload.fileName,
        rows: payload.rows,
      });
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: "Import started",
        message: `${payload.rows.length} row${payload.rows.length === 1 ? "" : "s"} queued for import. This may take a moment to finish.`,
      });
      mutate(WORKSPACE_CSV_IMPORTS_KEY(workspaceSlug));
      setStep(1);
      setProjectId(null);
    } catch (error) {
      const message =
        error && typeof error === "object" && "error" in error ? String((error as { error: string }).error) : null;
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Import failed to start",
        message: message ?? "Something went wrong while starting the import. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-subtle p-4">
      <div className="flex items-center gap-3">
        {STEPS.map(({ step: stepNumber, label }, index) => (
          <div key={stepNumber} className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-11 font-medium",
                  step === stepNumber
                    ? "bg-accent-primary text-on-color"
                    : step > stepNumber
                      ? "bg-layer-2 text-tertiary"
                      : "bg-layer-2 text-placeholder"
                )}
              >
                {stepNumber}
              </span>
              <span className={cn("text-12", step === stepNumber ? "text-primary" : "text-tertiary")}>{label}</span>
            </div>
            {index < STEPS.length - 1 && <span className="h-px w-6 bg-subtle" />}
          </div>
        ))}
      </div>

      {step === 1 ? (
        <SelectProjectStep projectId={projectId} onChange={setProjectId} onNext={() => setStep(2)} />
      ) : (
        <UploadCSVStep onBack={() => setStep(1)} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      )}
    </div>
  );
}
