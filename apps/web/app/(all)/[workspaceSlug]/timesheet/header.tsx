/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { CalendarDays, CheckCircle2, Folder, Search, SlidersHorizontal, User } from "lucide-react";
// components
import {
  DATE_RANGE_OPTIONS,
  EMPTY_FILTER_VALUE,
  FilterSelect,
  STATUS_OPTIONS,
  useTimeSheetFilterOptions,
  type TDateRangeFilter,
  type TTimeSheetStatus,
} from "@/components/workspace/time-sheet-page";

export interface TimeSheetFilterHeaderProps {
  dateRange: TDateRangeFilter;
  onDateRangeChange: (value: TDateRangeFilter) => void;
  employeeFilter: string;
  onEmployeeFilterChange: (value: string) => void;
  projectFilter: string;
  onProjectFilterChange: (value: string) => void;
  statusFilter: TTimeSheetStatus | typeof EMPTY_FILTER_VALUE;
  onStatusFilterChange: (value: TTimeSheetStatus | typeof EMPTY_FILTER_VALUE) => void;
  searchText: string;
  onSearchTextChange: (value: string) => void;
  onClearFilters: () => void;
}

export const TimeSheetFilterHeader = observer(function TimeSheetFilterHeader(props: TimeSheetFilterHeaderProps) {
  const {
    dateRange,
    onDateRangeChange,
    employeeFilter,
    onEmployeeFilterChange,
    projectFilter,
    onProjectFilterChange,
    statusFilter,
    onStatusFilterChange,
    searchText,
    onSearchTextChange,
    onClearFilters,
  } = props;

  const { employeeOptions, projectOptions } = useTimeSheetFilterOptions();

  const employeeFilterOptions = [
    { value: EMPTY_FILTER_VALUE, label: "Employee" },
    ...employeeOptions.map((employee) => ({ value: employee.id, label: employee.name })),
  ];
  const projectFilterOptions = [
    { value: EMPTY_FILTER_VALUE, label: "Project" },
    ...projectOptions.map((project) => ({ value: project.id, label: project.name })),
  ];
  const statusFilterOptions = [
    { value: EMPTY_FILTER_VALUE, label: "Status" },
    ...STATUS_OPTIONS.map((status) => ({ value: status, label: status })),
  ];

  return (
    <div className="flex w-full flex-wrap items-center gap-3">
      <FilterSelect
        ariaLabel="Date range"
        icon={<CalendarDays className="size-4" strokeWidth={2} />}
        value={dateRange}
        options={DATE_RANGE_OPTIONS}
        onChange={(value) => onDateRangeChange(value as TDateRangeFilter)}
      />
      <FilterSelect
        ariaLabel="Employee"
        icon={<User className="size-4" strokeWidth={2} />}
        value={employeeFilter}
        options={employeeFilterOptions}
        onChange={onEmployeeFilterChange}
      />
      <FilterSelect
        ariaLabel="Project"
        icon={<Folder className="size-4" strokeWidth={2} />}
        value={projectFilter}
        options={projectFilterOptions}
        onChange={onProjectFilterChange}
      />
      <FilterSelect
        ariaLabel="Status"
        icon={<CheckCircle2 className="size-4" strokeWidth={2} />}
        value={statusFilter}
        options={statusFilterOptions}
        onChange={(value) => onStatusFilterChange(value as TTimeSheetStatus | typeof EMPTY_FILTER_VALUE)}
      />
      <div className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-subtle bg-surface-1 px-3 text-secondary transition focus-within:border-strong">
        <Search className="size-4 flex-shrink-0" strokeWidth={2} />
        <input
          type="text"
          value={searchText}
          placeholder="Search entries..."
          onChange={(event) => onSearchTextChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-13 font-medium text-primary outline-none placeholder:text-tertiary"
        />
      </div>
      <button
        type="button"
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-subtle bg-surface-1 px-4 text-13 font-semibold text-primary transition hover:bg-canvas"
        onClick={onClearFilters}
      >
        <SlidersHorizontal className="size-4" strokeWidth={2} />
        Filters
      </button>
    </div>
  );
});
