/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useState } from "react";
import { observer } from "mobx-react";
import { useTheme } from "next-themes";
import useSWR, { mutate } from "swr";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
// plane imports
import { useTranslation } from "@plane/i18n";
import { Spinner } from "@plane/ui";
import { cn, renderFormattedDate } from "@plane/utils";
// services
import { CSV_IMPORTS_ACTIVE_STATUSES, importsService, type TCSVImportStatus } from "@/services/imports.service";
// assets
import darkImportsAsset from "@/app/assets/empty-state/workspace-settings/imports-dark.webp?url";
import lightImportsAsset from "@/app/assets/empty-state/workspace-settings/imports-light.webp?url";

export const WORKSPACE_CSV_IMPORTS_KEY = (workspaceSlug: string) => `WORKSPACE_CSV_IMPORTS_${workspaceSlug}`;

const STATUS_PILL_CLASSNAME: Record<TCSVImportStatus, string> = {
  completed: "bg-success-subtle text-success-primary",
  failed: "bg-danger-subtle text-danger-primary",
  processing: "bg-layer-2 text-secondary",
  queued: "bg-layer-2 text-secondary",
};

type Props = {
  workspaceSlug: string;
};

export const PreviousImportsList = observer(function PreviousImportsList(props: Props) {
  const { workspaceSlug } = props;
  const { resolvedTheme } = useTheme();
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: imports, error } = useSWR(
    workspaceSlug ? WORKSPACE_CSV_IMPORTS_KEY(workspaceSlug) : null,
    workspaceSlug ? () => importsService.getCSVImports(workspaceSlug) : null
  );

  useEffect(() => {
    const interval = setInterval(() => {
      if (imports?.some((item) => CSV_IMPORTS_ACTIVE_STATUSES.includes(item.status))) {
        mutate(WORKSPACE_CSV_IMPORTS_KEY(workspaceSlug));
      } else {
        clearInterval(interval);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [imports, workspaceSlug]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-lg border border-subtle px-5 py-10 text-center">
        <p className="text-13 text-danger-primary">Could not load previous imports.</p>
        <p className="text-12 text-tertiary">{error?.error ?? "Please refresh the page to try again."}</p>
      </div>
    );
  }

  if (!imports) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (imports.length === 0) {
    const emptyStateAsset = resolvedTheme === "light" ? lightImportsAsset : darkImportsAsset;
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-subtle px-5 py-16 text-center">
        <img src={emptyStateAsset} alt="" className="h-40 w-auto object-contain" />
        <div className="flex flex-col items-center gap-1.5">
          <h3 className="text-16 font-semibold text-primary">{t("workspace_settings.empty_state.imports.title")}</h3>
          <p className="max-w-[350px] text-13 text-tertiary">
            {t("workspace_settings.empty_state.imports.description")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-subtle">
      <h3 className="border-b border-subtle px-4 py-3 text-14 font-medium text-primary">Previous Imports</h3>
      <div className="divide-y divide-subtle">
        {imports.map((item) => {
          const errors = (item.error_report ?? []).filter((entry) => entry.level === "error");
          const warnings = (item.error_report ?? []).filter((entry) => entry.level === "warning");
          const isExpanded = expandedId === item.id;

          return (
            <div key={item.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-tertiary" strokeWidth={1.8} />
                  <span className="text-13 text-primary">
                    Import from CSV to <span className="font-medium">{item.project_detail?.name ?? "project"}</span>
                  </span>
                  <span className={cn("rounded-sm px-2 py-0.5 text-11 capitalize", STATUS_PILL_CLASSNAME[item.status])}>
                    {item.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-11 text-tertiary">
                  <span>
                    {item.imported_count} work item{item.imported_count === 1 ? "" : "s"} imported
                  </span>
                  <span>·</span>
                  <span>{renderFormattedDate(item.created_at)}</span>
                </div>
              </div>

              {(errors.length > 0 || warnings.length > 0) && (
                <div className="mt-1.5">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="flex items-center gap-1 text-11 text-tertiary hover:text-secondary"
                  >
                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    {errors.length > 0 && <span>{errors.length} row{errors.length === 1 ? "" : "s"} failed</span>}
                    {errors.length > 0 && warnings.length > 0 && <span>·</span>}
                    {warnings.length > 0 && <span>{warnings.length} warning{warnings.length === 1 ? "" : "s"}</span>}
                  </button>
                  {isExpanded && (
                    <ul className="mt-1.5 space-y-1 rounded-sm bg-surface-2 p-2 text-11">
                      {[...errors, ...warnings].map((entry, index) => (
                        <li key={index} className={entry.level === "error" ? "text-danger-primary" : "text-tertiary"}>
                          Row {entry.row}: {entry.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
