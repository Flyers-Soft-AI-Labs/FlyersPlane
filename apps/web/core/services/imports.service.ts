/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { API_BASE_URL } from "@plane/constants";
import { APIService } from "@/services/api.service";

export type TCSVImportRow = {
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  assignee?: string;
};

export type TCSVImportStatus = "queued" | "processing" | "completed" | "failed";

export type TCSVImportErrorEntry = {
  row: number;
  field?: string;
  message: string;
  level: "error" | "warning";
};

export type TCSVImportHistory = {
  id: string;
  workspace: string;
  project: string;
  project_detail: {
    id: string;
    name: string;
    identifier: string;
  } | null;
  file_name: string;
  status: TCSVImportStatus;
  total_rows: number;
  imported_count: number;
  failed_count: number;
  error_report: TCSVImportErrorEntry[] | null;
  initiated_by: string;
  initiated_by_detail: {
    id: string;
    display_name: string;
    email: string;
  } | null;
  created_at: string;
  updated_at: string;
};

export const CSV_IMPORTS_ACTIVE_STATUSES: TCSVImportStatus[] = ["queued", "processing"];

export class ImportsService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async createCSVImport(
    workspaceSlug: string,
    projectId: string,
    data: { file_name: string; rows: TCSVImportRow[] }
  ): Promise<TCSVImportHistory> {
    return this.post(`/api/workspaces/${workspaceSlug}/projects/${projectId}/csv-import/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async getCSVImports(workspaceSlug: string): Promise<TCSVImportHistory[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/csv-import/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}

export const importsService = new ImportsService();
