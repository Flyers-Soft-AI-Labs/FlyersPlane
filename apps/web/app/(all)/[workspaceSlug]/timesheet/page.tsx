/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
// components
import { AppHeader } from "@/components/core/app-header";
import { ContentWrapper } from "@/components/core/content-wrapper";
import { PageHead } from "@/components/core/page-title";
import {
  EMPTY_FILTER_VALUE,
  TimeSheetPage,
  type TDateRangeFilter,
  type TTimeSheetStatus,
} from "@/components/workspace/time-sheet-page";
// hooks
import { useWorkspace } from "@/hooks/store/use-workspace";
// local components
import { TimeSheetFilterHeader } from "./header";

function WorkspaceTimeSheetPage() {
  const { currentWorkspace } = useWorkspace();
  const pageTitle = currentWorkspace?.name ? `${currentWorkspace.name} - Time Sheet` : "Time Sheet";

  const [dateRange, setDateRange] = useState<TDateRangeFilter>("all");
  const [employeeFilter, setEmployeeFilter] = useState(EMPTY_FILTER_VALUE);
  const [projectFilter, setProjectFilter] = useState(EMPTY_FILTER_VALUE);
  const [statusFilter, setStatusFilter] = useState<TTimeSheetStatus | typeof EMPTY_FILTER_VALUE>(EMPTY_FILTER_VALUE);
  const [searchText, setSearchText] = useState("");

  const clearFilters = () => {
    setDateRange("all");
    setEmployeeFilter(EMPTY_FILTER_VALUE);
    setProjectFilter(EMPTY_FILTER_VALUE);
    setStatusFilter(EMPTY_FILTER_VALUE);
    setSearchText("");
  };

  return (
    <>
      <AppHeader
        header={
          <TimeSheetFilterHeader
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            employeeFilter={employeeFilter}
            onEmployeeFilterChange={setEmployeeFilter}
            projectFilter={projectFilter}
            onProjectFilterChange={setProjectFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            searchText={searchText}
            onSearchTextChange={setSearchText}
            onClearFilters={clearFilters}
          />
        }
      />
      <ContentWrapper>
        <PageHead title={pageTitle} />
        <TimeSheetPage
          dateRange={dateRange}
          employeeFilter={employeeFilter}
          projectFilter={projectFilter}
          statusFilter={statusFilter}
          searchText={searchText}
        />
      </ContentWrapper>
    </>
  );
}

export default observer(WorkspaceTimeSheetPage);
