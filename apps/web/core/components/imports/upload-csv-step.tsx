/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback, useMemo, useState } from "react";
import type { FileRejection } from "react-dropzone";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { UploadCloud, X } from "lucide-react";
import { Button } from "@plane/propel/button";
import { cn } from "@plane/utils";
// services
import type { TCSVImportRow } from "@/services/imports.service";

export const MAX_CSV_IMPORT_ROWS = 5000;
const PREVIEW_ROW_COUNT = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

type TTargetField = keyof TCSVImportRow;

const TARGET_FIELDS: { key: TTargetField; label: string; required?: boolean; aliases: string[] }[] = [
  { key: "title", label: "Title", required: true, aliases: ["title", "name", "summary"] },
  { key: "description", label: "Description", aliases: ["description", "desc", "details"] },
  { key: "priority", label: "Priority", aliases: ["priority"] },
  { key: "status", label: "Status", aliases: ["status", "state"] },
  { key: "assignee", label: "Assignee (email)", aliases: ["assignee", "assignee email", "assigned to", "email"] },
];

type TParsedRow = Record<string, unknown>;
type TMapping = Partial<Record<TTargetField, string>>;

function detectMapping(headers: string[]): TMapping {
  const mapping: TMapping = {};
  for (const field of TARGET_FIELDS) {
    const match = headers.find((header) => field.aliases.includes(header.trim().toLowerCase()));
    if (match) mapping[field.key] = match;
  }
  return mapping;
}

function isRowEmpty(row: TParsedRow) {
  return Object.values(row).every((value) => `${value ?? ""}`.trim() === "");
}

type Props = {
  onBack: () => void;
  onSubmit: (payload: { fileName: string; rows: TCSVImportRow[] }) => void;
  isSubmitting: boolean;
};

export function UploadCSVStep(props: Props) {
  const { onBack, onSubmit, isSubmitting } = props;

  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<TParsedRow[]>([]);
  const [mapping, setMapping] = useState<TMapping>({});
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const resetFile = () => {
    setFile(null);
    setHeaders([]);
    setParsedRows([]);
    setMapping({});
    setParseError(null);
  };

  const onDrop = useCallback(async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
    if (fileRejections.length > 0) {
      setParseError(fileRejections[0]?.errors?.[0]?.message ?? "This file could not be accepted.");
      return;
    }
    const nextFile = acceptedFiles[0];
    if (!nextFile) return;

    setIsParsing(true);
    setParseError(null);
    try {
      const workbook = XLSX.read(await nextFile.arrayBuffer(), { type: "array", cellDates: true });
      const worksheetName = workbook.SheetNames[0];
      const worksheet = worksheetName ? workbook.Sheets[worksheetName] : undefined;
      if (!worksheet) throw new Error("No data found in this file.");

      const rows = XLSX.utils.sheet_to_json<TParsedRow>(worksheet, { defval: "", raw: false }).filter(
        (row) => !isRowEmpty(row)
      );
      if (rows.length === 0) throw new Error("No rows found in this file.");
      if (rows.length > MAX_CSV_IMPORT_ROWS) {
        throw new Error(`A single import is limited to ${MAX_CSV_IMPORT_ROWS} rows (found ${rows.length}).`);
      }

      const detectedHeaders = Object.keys(rows[0]);
      setFile(nextFile);
      setHeaders(detectedHeaders);
      setParsedRows(rows);
      setMapping(detectMapping(detectedHeaders));
    } catch (error) {
      resetFile();
      setParseError(error instanceof Error ? error.message : "Could not read this file.");
    } finally {
      setIsParsing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxSize: MAX_FILE_SIZE,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".csv"],
    },
  });

  const previewRows = useMemo(() => parsedRows.slice(0, PREVIEW_ROW_COUNT), [parsedRows]);

  const mappedRows = useMemo<TCSVImportRow[]>(
    () =>
      parsedRows
        .map((row) => ({
          title: mapping.title ? `${row[mapping.title] ?? ""}`.trim() : "",
          description: mapping.description ? `${row[mapping.description] ?? ""}`.trim() : undefined,
          priority: mapping.priority ? `${row[mapping.priority] ?? ""}`.trim() : undefined,
          status: mapping.status ? `${row[mapping.status] ?? ""}`.trim() : undefined,
          assignee: mapping.assignee ? `${row[mapping.assignee] ?? ""}`.trim() : undefined,
        }))
        .filter((row) => row.title !== ""),
    [parsedRows, mapping]
  );

  const canSubmit = !!file && !!mapping.title && mappedRows.length > 0 && !isSubmitting;

  const handleSubmit = () => {
    if (!file || !canSubmit) return;
    onSubmit({ fileName: file.name, rows: mappedRows });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h4 className="text-13 font-medium text-primary">Upload CSV</h4>
        <p className="text-12 text-tertiary">
          The first row should contain column headers. Common headers (title, description, priority, status,
          assignee) are mapped automatically.
        </p>
      </div>

      {!file ? (
        <div
          {...getRootProps()}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-subtle px-5 py-10 text-center transition-colors",
            isDragActive && "border-primary bg-layer-transparent-hover"
          )}
        >
          <input {...getInputProps()} />
          <UploadCloud className="h-6 w-6 text-tertiary" strokeWidth={1.5} />
          <p className="text-13 text-secondary">
            {isParsing ? "Reading file…" : "Drag and drop a .csv file here, or click to browse"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 rounded-lg border border-subtle p-4">
          <div className="flex items-center justify-between">
            <span className="truncate text-13 text-secondary">
              {file.name} · {parsedRows.length} row{parsedRows.length === 1 ? "" : "s"}
            </span>
            <button
              type="button"
              onClick={resetFile}
              className="flex items-center gap-1 text-12 text-tertiary hover:text-secondary"
            >
              <X className="h-3.5 w-3.5" /> Remove
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {TARGET_FIELDS.map((field) => (
              <label key={field.key} className="flex flex-col gap-1 text-12">
                <span className="text-tertiary">
                  {field.label}
                  {field.required && <span className="text-danger"> *</span>}
                </span>
                <select
                  className="rounded-sm border border-subtle bg-surface-1 px-2 py-1.5 text-12 text-primary focus:outline-none"
                  value={mapping[field.key] ?? ""}
                  onChange={(e) =>
                    setMapping((prev) => ({ ...prev, [field.key]: e.target.value || undefined }))
                  }
                >
                  <option value="">— None —</option>
                  {headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          {!mapping.title && <p className="text-12 text-danger">Map a column to Title to continue.</p>}

          <div className="overflow-x-auto rounded-sm border border-subtle">
            <table className="w-full text-left text-12">
              <thead className="bg-surface-2 text-tertiary">
                <tr>
                  {TARGET_FIELDS.map((field) => (
                    <th key={field.key} className="whitespace-nowrap px-3 py-2 font-medium">
                      {field.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, index) => (
                  <tr key={index} className="border-t border-subtle">
                    {TARGET_FIELDS.map((field) => (
                      <td key={field.key} className="max-w-48 truncate px-3 py-2 text-secondary">
                        {mapping[field.key] ? `${row[mapping[field.key] as string] ?? ""}` : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedRows.length > previewRows.length && (
              <p className="border-t border-subtle px-3 py-1.5 text-12 text-tertiary">
                +{parsedRows.length - previewRows.length} more row{parsedRows.length - previewRows.length === 1 ? "" : "s"}
              </p>
            )}
          </div>
        </div>
      )}

      {parseError && <p className="text-12 text-danger">{parseError}</p>}

      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onBack} disabled={isSubmitting}>
          Back
        </Button>
        <Button variant="primary" size="sm" onClick={handleSubmit} disabled={!canSubmit} loading={isSubmitting}>
          Import {mappedRows.length > 0 ? mappedRows.length : ""} work item{mappedRows.length === 1 ? "" : "s"}
        </Button>
      </div>
    </div>
  );
}
