/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { ChangeEvent, Dispatch, ReactNode, SetStateAction } from "react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Combobox, Dialog, Transition } from "@headlessui/react";
import { orderBy } from "lodash-es";
import { observer } from "mobx-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import * as XLSX from "xlsx";
import {
  CalendarDays,
  CheckCircle2,
  Download,
  ExternalLink,
  Folder,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Upload,
  User,
  X,
} from "lucide-react";
// plane imports
import { ALL_ISSUES } from "@plane/constants";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { TIssue } from "@plane/types";
import { EIssuesStoreType } from "@plane/types";
import { CustomSelect } from "@plane/ui";
import { cn, generateWorkItemLink } from "@plane/utils";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useIssues } from "@/hooks/store/use-issues";
import { getValueFromLocalStorage, setValueIntoLocalStorage } from "@/hooks/use-local-storage";
import { useMember } from "@/hooks/store/use-member";
import { useProject } from "@/hooks/store/use-project";
import { useUser } from "@/hooks/store/user";

type TTimeSheetStatus = "Draft" | "Submitted" | "Approved" | "Rejected";
type TDateRangeFilter = "all" | "this-week" | "last-7-days" | "this-month";

type TProjectOption = {
  id: string;
  name: string;
};

type TEmployeeOption = {
  id: string;
  name: string;
};

type TTicketOption = {
  id: string;
  ticketNo: string;
  projectId: string;
  projectIdentifier: string;
  projectName: string;
  task: string;
  issue: TIssue;
};

type TTimeEntry = {
  id: string;
  date: string;
  employeeId: string;
  employeeName: string;
  projectId: string;
  projectName: string;
  task: string;
  ticketId: string;
  ticketNo: string;
  hours: number;
  notes?: string;
  status: TTimeSheetStatus;
};

type TEntryDraft = Omit<TTimeEntry, "id" | "hours"> & {
  hours: string;
  notes: string;
};

type TImportedTimesheetRow = Record<string, unknown>;

type TNormalizeTimesheetContext = {
  defaultEmployee: TEmployeeOption | undefined;
  employeeOptions: TEmployeeOption[];
  projectOptions: TProjectOption[];
  ticketOptions: TTicketOption[];
};

type TTimeSheetSelectOption = {
  value: string;
  label: string;
};

type TAddEntryStep = "ticket" | "confirm";

const STATUS_OPTIONS: TTimeSheetStatus[] = ["Draft", "Submitted", "Approved", "Rejected"];

const TIMESHEET_EXPORT_COLUMNS = ["Date", "Employee Name", "Project", "Task", "Ticket No", "Hours", "Status"] as const;

type TTimeSheetExportColumn = (typeof TIMESHEET_EXPORT_COLUMNS)[number];
type TTimeSheetExportRow = Record<TTimeSheetExportColumn, string | number>;

const IMPORT_COLUMN_ALIASES = {
  date: ["date"],
  employeeName: ["employee name"],
  projectName: ["project"],
  task: ["task"],
  ticketNo: ["ticket no", "devops/jira ticket no"],
  hours: ["hours"],
  status: ["status"],
} as const;

const DATE_RANGE_OPTIONS: { value: TDateRangeFilter; label: string }[] = [
  { value: "all", label: "Date range" },
  { value: "this-week", label: "This week" },
  { value: "last-7-days", label: "Last 7 days" },
  { value: "this-month", label: "This month" },
];

const STATUS_PILL_STYLES: Record<TTimeSheetStatus, string> = {
  Draft: "border-[#e5e7eb] bg-[#f5f5f4] text-[#374151] before:bg-[#6b7280]",
  Submitted: "border-[#dbeafe] bg-[#eff6ff] text-[#1f2937] before:bg-[#2563eb]",
  Approved: "border-[#dcfce7] bg-[#f0fdf4] text-[#1f2937] before:bg-[#16a34a]",
  Rejected: "border-[#fee2e2] bg-[#fef2f2] text-[#1f2937] before:bg-[#dc2626]",
};

const TIME_SHEET_SELECT_MENU_CLASS =
  "z-[70] my-1 min-w-0 overflow-hidden rounded-[10px] border border-[#e5e7eb] bg-white p-1 text-13 shadow-[0_12px_28px_rgba(15,23,42,0.12)] focus:outline-none";

const TIME_SHEET_SELECT_OPTION_CLASS = "h-9 rounded-md px-2 py-0 text-13 font-medium text-[#374151] hover:bg-[#f5f5f5]";

const EMPTY_FILTER_VALUE = "all";
const TIME_SHEET_STORAGE_KEY_PREFIX = "flyers-soft-timesheet-entries";

const getTimeSheetStorageKey = (workspaceSlug: string | undefined) =>
  workspaceSlug ? `${TIME_SHEET_STORAGE_KEY_PREFIX}/${workspaceSlug}` : undefined;

const getDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTodayInputValue = () => getDateInputValue(new Date());

const getDisplayDate = (date: string) => {
  if (!date) return "-";
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;
  return `${month}/${day}/${year}`;
};

const getInputDate = (value: string | null | undefined) => {
  if (!value) return getTodayInputValue();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return getTodayInputValue();
  return getDateInputValue(date);
};

const getHoursValue = (value: string | number | null | undefined) => {
  const hours = Number.parseFloat(`${value ?? ""}`);
  if (!Number.isFinite(hours) || hours < 0) return 0;
  return hours;
};

const getMemberName = (member: { display_name?: string; first_name?: string; last_name?: string; email?: string }) => {
  const fullName = [member.first_name, member.last_name].filter(Boolean).join(" ").trim();
  return member.display_name || fullName || member.email || "Unassigned";
};

const getTicketIdentifierParts = (ticketNo: string) => {
  const identifierMatch = /^(.+)-(\d+)$/.exec(ticketNo.trim());
  if (!identifierMatch) return undefined;

  return {
    projectIdentifier: identifierMatch[1].toUpperCase(),
    sequenceId: identifierMatch[2],
  };
};

const createTicketOptionFromIssue = (
  issue: TIssue,
  projectIdentifier: string,
  projectOptions: TProjectOption[]
): TTicketOption | undefined => {
  if (!issue.project_id) return undefined;

  const project = projectOptions.find((option) => option.id === issue.project_id);
  if (!project) return undefined;

  return {
    id: issue.id,
    issue,
    projectId: issue.project_id,
    projectIdentifier,
    projectName: project.name,
    task: issue.name,
    ticketNo: `${projectIdentifier}-${issue.sequence_id}`,
  };
};

const getTicketAutofillUpdates = (
  ticketOption: TTicketOption,
  employeeOptions: TEmployeeOption[],
  currentEmployee: TEmployeeOption | undefined
): Partial<TEntryDraft> => {
  const assigneeId = ticketOption.issue.assignee_ids?.[0];
  const assignee = assigneeId ? employeeOptions.find((employee) => employee.id === assigneeId) : undefined;
  const employee = assignee ?? currentEmployee;

  return {
    ...(employee ? { employeeId: employee.id, employeeName: employee.name } : {}),
    projectId: ticketOption.projectId,
    projectName: ticketOption.projectName,
    task: ticketOption.task,
    ticketId: ticketOption.id,
    ticketNo: ticketOption.ticketNo,
    date: getTodayInputValue(),
    hours: "0.00",
    status: "Draft",
  };
};

const isDateWithinRange = (dateValue: string, filter: TDateRangeFilter) => {
  if (filter === "all") return true;

  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (filter === "last-7-days") {
    const start = new Date(startOfToday);
    start.setDate(start.getDate() - 6);
    return date >= start && date <= startOfToday;
  }

  if (filter === "this-month") {
    return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
  }

  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  return date >= startOfWeek && date <= endOfWeek;
};

const createEmptyDraft = (employee: TEmployeeOption | undefined): TEntryDraft => ({
  date: getTodayInputValue(),
  employeeId: employee?.id ?? "",
  employeeName: employee?.name ?? "",
  projectId: "",
  projectName: "",
  task: "",
  ticketId: "",
  ticketNo: "",
  hours: "0.00",
  notes: "",
  status: "Draft",
});

const getTimeSheetEntryId = () => {
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `timesheet-${randomId}`;
};

const getTimeEntryFromTicketOption = (
  ticketOption: TTicketOption,
  index: number,
  getEmployeeDetails: (employeeId: string) => ({ id?: string } & Parameters<typeof getMemberName>[0]) | undefined,
  fallbackEmployee: TEmployeeOption | undefined
): TTimeEntry => {
  const assigneeId = ticketOption.issue.assignee_ids?.[0];
  const assignee = assigneeId ? getEmployeeDetails(assigneeId) : undefined;
  const employeeId = assignee?.id ?? fallbackEmployee?.id ?? "";
  const employeeName = assignee ? getMemberName(assignee) : fallbackEmployee?.name || "Unassigned";

  return {
    id: `ticket-${ticketOption.id}`,
    date: getInputDate(ticketOption.issue.updated_at || ticketOption.issue.created_at),
    employeeId,
    employeeName,
    projectId: ticketOption.projectId,
    projectName: ticketOption.projectName,
    task: ticketOption.task,
    ticketId: ticketOption.id,
    ticketNo: ticketOption.ticketNo,
    hours: getHoursValue(ticketOption.issue.estimate_point),
    status: index < 2 ? "Draft" : index < 4 ? "Submitted" : "Approved",
  };
};

const isTimeSheetStatus = (value: unknown): value is TTimeSheetStatus =>
  STATUS_OPTIONS.includes(value as TTimeSheetStatus);

const normalizeStoredTimeEntry = (entry: unknown): TTimeEntry | undefined => {
  if (!entry || typeof entry !== "object") return undefined;

  const row = entry as Partial<TTimeEntry>;
  const id = getStringCellValue(row.id);
  const task = getStringCellValue(row.task);
  const ticketNo = getStringCellValue(row.ticketNo);
  if (!id || !task) return undefined;

  return {
    id,
    date: getInputDate(row.date),
    employeeId: getStringCellValue(row.employeeId),
    employeeName: getStringCellValue(row.employeeName) || "Unassigned",
    projectId: getStringCellValue(row.projectId),
    projectName: getStringCellValue(row.projectName),
    task,
    ticketId: getStringCellValue(row.ticketId),
    ticketNo,
    hours: getHoursValue(row.hours),
    notes: getStringCellValue(row.notes),
    status: isTimeSheetStatus(row.status) ? row.status : "Draft",
  };
};

const loadPersistedTimeEntries = (storageKey: string): TTimeEntry[] | undefined => {
  const storedEntries = getValueFromLocalStorage(storageKey, undefined);
  if (storedEntries === undefined) return undefined;
  if (!Array.isArray(storedEntries)) return [];

  return storedEntries.map((entry) => normalizeStoredTimeEntry(entry)).filter((entry): entry is TTimeEntry => !!entry);
};

const persistTimeEntries = (storageKey: string | undefined, entries: TTimeEntry[]) => {
  if (!storageKey) return false;
  return setValueIntoLocalStorage(storageKey, entries);
};

const normalizeColumnName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ");

const getStringCellValue = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return getDateInputValue(value);
  return `${value}`.trim();
};

const getImportedCellValue = (row: TImportedTimesheetRow, aliases: readonly string[]) => {
  const normalizedAliases = new Set(aliases.map(normalizeColumnName));

  for (const [columnName, value] of Object.entries(row)) {
    if (normalizedAliases.has(normalizeColumnName(columnName))) return value;
  }

  return "";
};

const getValidImportedDateInputValue = (
  yearValue: string | number,
  monthValue: string | number,
  dayValue: string | number
) => {
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return "";
  }

  return getDateInputValue(date);
};

const getInputDateFromExcelSerial = (value: number) => {
  const parsedDate = XLSX.SSF.parse_date_code(value);
  if (!parsedDate) return "";

  return getValidImportedDateInputValue(parsedDate.y, parsedDate.m, parsedDate.d);
};

const getImportedDateValue = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return getDateInputValue(value);
  if (typeof value === "number" && Number.isFinite(value)) return getInputDateFromExcelSerial(value);

  const textValue = getStringCellValue(value);
  if (!textValue) return "";

  const isoMatch = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(textValue);
  if (isoMatch) return getValidImportedDateInputValue(isoMatch[1], isoMatch[2], isoMatch[3]);

  const slashMatch = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/.exec(textValue);
  if (slashMatch) {
    const year = slashMatch[3].length === 2 ? `20${slashMatch[3]}` : slashMatch[3];
    const firstDatePart = Number(slashMatch[1]);
    const month = firstDatePart > 12 ? slashMatch[2] : slashMatch[1];
    const day = firstDatePart > 12 ? slashMatch[1] : slashMatch[2];
    return getValidImportedDateInputValue(year, month, day);
  }

  const parsedDate = new Date(textValue);
  if (Number.isNaN(parsedDate.getTime())) return "";
  return getDateInputValue(parsedDate);
};

const getImportedHoursValue = (value: unknown) => {
  const hours = typeof value === "number" ? value : Number.parseFloat(getStringCellValue(value).replace(/,/g, ""));
  if (!Number.isFinite(hours)) return undefined;
  return hours;
};

const getImportedStatusValue = (value: unknown): TTimeSheetStatus => {
  const statusValue = getStringCellValue(value).toLowerCase();
  return STATUS_OPTIONS.find((status) => status.toLowerCase() === statusValue) ?? "Draft";
};

const findOptionByName = <TOption extends { name: string }>(options: TOption[], name: string) =>
  options.find((option) => option.name.toLowerCase() === name.toLowerCase());

const isImportedRowEmpty = (row: TImportedTimesheetRow) =>
  Object.values(row).every((value) => getStringCellValue(value).length === 0);

function normalizeTimesheetRow(
  row: TImportedTimesheetRow,
  context: TNormalizeTimesheetContext
): Omit<TTimeEntry, "id"> {
  const date = getImportedDateValue(getImportedCellValue(row, IMPORT_COLUMN_ALIASES.date));
  const task = getStringCellValue(getImportedCellValue(row, IMPORT_COLUMN_ALIASES.task));
  const hours = getImportedHoursValue(getImportedCellValue(row, IMPORT_COLUMN_ALIASES.hours));

  if (!date) throw new Error("Date required");
  if (!task) throw new Error("Task required");
  if (hours === undefined) throw new Error("Hours must be a number");

  const employeeName =
    getStringCellValue(getImportedCellValue(row, IMPORT_COLUMN_ALIASES.employeeName)) ||
    context.defaultEmployee?.name ||
    "Unassigned";
  const employee = findOptionByName(context.employeeOptions, employeeName);
  const projectName = getStringCellValue(getImportedCellValue(row, IMPORT_COLUMN_ALIASES.projectName));
  const project = findOptionByName(context.projectOptions, projectName);
  const ticketNo = getStringCellValue(getImportedCellValue(row, IMPORT_COLUMN_ALIASES.ticketNo));
  const ticket = context.ticketOptions.find(
    (ticketOption) => ticketOption.ticketNo.toLowerCase() === ticketNo.toLowerCase()
  );
  const ticketProject =
    !projectName && ticket ? context.projectOptions.find((option) => option.id === ticket.projectId) : undefined;
  const resolvedProject = project ?? ticketProject;
  const resolvedProjectName = projectName || resolvedProject?.name || ticket?.projectName || "";

  return {
    date,
    employeeId: employee?.id ?? context.defaultEmployee?.id ?? "",
    employeeName,
    projectId: resolvedProject?.id ?? "",
    projectName: resolvedProjectName,
    task,
    ticketId: ticket?.id ?? "",
    ticketNo,
    hours,
    status: getImportedStatusValue(getImportedCellValue(row, IMPORT_COLUMN_ALIASES.status)),
  };
}

function exportTimesheetToExcel(entries: TTimeEntry[]) {
  const worksheetRows: TTimeSheetExportRow[] = entries.map((entry) => ({
    Date: getDisplayDate(entry.date),
    "Employee Name": entry.employeeName,
    Project: entry.projectName,
    Task: entry.task,
    "Ticket No": entry.ticketNo,
    Hours: entry.hours,
    Status: entry.status,
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(worksheetRows, { header: [...TIMESHEET_EXPORT_COLUMNS] });
  XLSX.utils.book_append_sheet(workbook, worksheet, "Time Sheet");

  const fileName = `FlyersPlane-Timesheet-${getTodayInputValue()}.xlsx`;
  XLSX.writeFile(workbook, fileName);
  return fileName;
}

async function importTimesheetFromExcel(file: File, context: TNormalizeTimesheetContext) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const firstWorksheetName = workbook.SheetNames[0];
  const worksheet = firstWorksheetName ? workbook.Sheets[firstWorksheetName] : undefined;
  if (!worksheet) throw new Error("No worksheet found");

  const rows = XLSX.utils.sheet_to_json<TImportedTimesheetRow>(worksheet, { defval: "", raw: true });
  const populatedRows = rows.filter((row) => !isImportedRowEmpty(row));
  if (populatedRows.length === 0) throw new Error("No rows found");

  const importId = Date.now();
  return populatedRows.map((row, index) => {
    const normalizedRow = normalizeTimesheetRow(row, context);
    return Object.assign(normalizedRow, { id: `import-${importId}-${index}` });
  });
}

export const TimeSheetPage = observer(function TimeSheetPage() {
  const { workspaceSlug } = useParams();
  const workspaceSlugString = workspaceSlug?.toString();
  const timeSheetStorageKey = getTimeSheetStorageKey(workspaceSlugString);

  const projectStore = useProject();
  const memberStore = useMember();
  const { data: currentUser } = useUser();
  const {
    issueMap,
    issues: { fetchIssues, groupedIssueIds },
    issuesFilter: { fetchFilters },
  } = useIssues(EIssuesStoreType.GLOBAL);

  const [entries, setEntries] = useState<TTimeEntry[]>([]);
  const [hasSeededEntries, setHasSeededEntries] = useState(false);
  const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState(false);
  const [draft, setDraft] = useState<TEntryDraft>(() => createEmptyDraft(undefined));
  const [editingRowId, setEditingRowId] = useState<string | undefined>();
  const [activeActionId, setActiveActionId] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<TDateRangeFilter>("all");
  const [employeeFilter, setEmployeeFilter] = useState(EMPTY_FILTER_VALUE);
  const [projectFilter, setProjectFilter] = useState(EMPTY_FILTER_VALUE);
  const [statusFilter, setStatusFilter] = useState<TTimeSheetStatus | typeof EMPTY_FILTER_VALUE>(EMPTY_FILTER_VALUE);
  const [searchText, setSearchText] = useState("");
  const importFileInputRef = useRef<HTMLInputElement | null>(null);

  useSWR(
    workspaceSlugString ? `TIMESHEET_PROJECTS_${workspaceSlugString}` : null,
    workspaceSlugString ? () => projectStore.fetchPartialProjects(workspaceSlugString) : null,
    { revalidateIfStale: false, revalidateOnFocus: false }
  );

  useSWR(
    workspaceSlugString ? `TIMESHEET_MEMBERS_${workspaceSlugString}` : null,
    workspaceSlugString ? () => memberStore.workspace.fetchWorkspaceMembers(workspaceSlugString) : null,
    { revalidateIfStale: false, revalidateOnFocus: false }
  );

  useSWR(
    workspaceSlugString ? `TIMESHEET_TICKETS_${workspaceSlugString}` : null,
    workspaceSlugString
      ? async () => {
          await fetchFilters(workspaceSlugString, "all-issues");
          await fetchIssues(workspaceSlugString, "all-issues", groupedIssueIds ? "mutation" : "init-loader", {
            canGroup: false,
            perPageCount: 100,
          });
        }
      : null,
    { revalidateIfStale: false, revalidateOnFocus: false }
  );

  const currentUserName = currentUser ? getMemberName(currentUser) : "";

  const employeeOptions = useMemo(() => {
    const employeeMap = new Map<string, TEmployeeOption>();
    const memberIds = memberStore.workspace.workspaceMemberIds ?? memberStore.getMemberIds();

    memberIds.forEach((memberId) => {
      const member = memberStore.getUserDetails(memberId);
      if (member) employeeMap.set(member.id, { id: member.id, name: getMemberName(member) });
    });

    if (currentUser?.id && currentUserName) {
      employeeMap.set(currentUser.id, { id: currentUser.id, name: currentUserName });
    }

    return orderBy([...employeeMap.values()], [(employee) => employee.name.toLowerCase()], ["asc"]);
  }, [currentUser?.id, currentUserName, memberStore]);

  const defaultEmployee = employeeOptions[0];
  const currentEmployee = currentUser?.id
    ? employeeOptions.find((employee) => employee.id === currentUser.id)
    : undefined;

  const projectOptions = useMemo(() => {
    const projectIds = projectStore.workspaceProjectIds ?? projectStore.joinedProjectIds ?? [];

    const projects = projectIds
      .map((projectId) => projectStore.getProjectById(projectId))
      .filter((project): project is NonNullable<ReturnType<typeof projectStore.getProjectById>> => !!project)
      .map((project): TProjectOption => ({ id: project.id, name: project.name }));

    return orderBy(projects, [(project) => project.name.toLowerCase()], ["asc"]);
  }, [projectStore]);

  const issueIds = useMemo(() => {
    const groupedIds = groupedIssueIds?.[ALL_ISSUES];
    if (Array.isArray(groupedIds) && groupedIds.length > 0) return groupedIds;
    return Object.keys(issueMap);
  }, [groupedIssueIds, issueMap]);

  const ticketOptions = useMemo(() => {
    const tickets: TTicketOption[] = [];

    issueIds.forEach((issueId) => {
      const issue = issueMap[issueId];
      if (!issue?.project_id || !issue.sequence_id) return;

      const project = projectStore.getProjectById(issue.project_id);
      const projectIdentifier = projectStore.getProjectIdentifierById(issue.project_id) || project?.identifier;
      if (!project?.name || !projectIdentifier) return;

      tickets.push({
        id: issue.id,
        issue,
        projectId: issue.project_id,
        projectIdentifier,
        projectName: project.name,
        task: issue.name,
        ticketNo: `${projectIdentifier}-${issue.sequence_id}`,
      });
    });

    return orderBy(tickets, [(ticket) => ticket.issue.updated_at], ["desc"]);
  }, [issueIds, issueMap, projectStore]);

  const updatePersistedEntries = (getNextEntries: (currentEntries: TTimeEntry[]) => TTimeEntry[]) => {
    setEntries((currentEntries) => {
      const nextEntries = getNextEntries(currentEntries);
      persistTimeEntries(timeSheetStorageKey, nextEntries);
      return nextEntries;
    });
  };

  useEffect(() => {
    setEntries([]);
    setHasSeededEntries(false);
  }, [timeSheetStorageKey]);

  useEffect(() => {
    if (hasSeededEntries || !timeSheetStorageKey) return;

    const persistedEntries = loadPersistedTimeEntries(timeSheetStorageKey);
    if (persistedEntries) {
      setEntries(persistedEntries);
      setHasSeededEntries(true);
      return;
    }

    if (ticketOptions.length === 0) return;

    const fallbackEmployee = currentUser?.id
      ? {
          id: currentUser.id,
          name: currentUserName || "Unassigned",
        }
      : undefined;
    const seededEntries = ticketOptions
      .slice(0, 6)
      .map((ticketOption, index) =>
        getTimeEntryFromTicketOption(
          ticketOption,
          index,
          (memberId) => memberStore.getUserDetails(memberId),
          fallbackEmployee
        )
      );

    setEntries(seededEntries);
    persistTimeEntries(timeSheetStorageKey, seededEntries);
    setHasSeededEntries(true);
  }, [currentUser?.id, currentUserName, hasSeededEntries, memberStore, ticketOptions, timeSheetStorageKey]);

  const filteredEntries = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const selectedEmployee = employeeOptions.find((employee) => employee.id === employeeFilter);
    const selectedProject = projectOptions.find((project) => project.id === projectFilter);

    return entries.filter((entry) => {
      const searchableText = [entry.employeeName, entry.projectName, entry.task, entry.ticketNo]
        .join(" ")
        .toLowerCase();
      const matchesEmployee =
        employeeFilter === EMPTY_FILTER_VALUE ||
        entry.employeeId === employeeFilter ||
        (!!selectedEmployee && entry.employeeName.toLowerCase() === selectedEmployee.name.toLowerCase());
      const matchesProject =
        projectFilter === EMPTY_FILTER_VALUE ||
        entry.projectId === projectFilter ||
        (!!selectedProject && entry.projectName.toLowerCase() === selectedProject.name.toLowerCase());

      if (!isDateWithinRange(entry.date, dateRange)) return false;
      if (!matchesEmployee) return false;
      if (!matchesProject) return false;
      if (statusFilter !== EMPTY_FILTER_VALUE && entry.status !== statusFilter) return false;
      if (query && !searchableText.includes(query)) return false;
      return true;
    });
  }, [dateRange, employeeFilter, employeeOptions, entries, projectFilter, projectOptions, searchText, statusFilter]);

  const totalHours = filteredEntries.reduce((total, entry) => total + entry.hours, 0);

  const handleExportClick = () => {
    if (filteredEntries.length === 0) {
      setToast({
        type: TOAST_TYPE.WARNING,
        title: "Nothing to export",
        message: "No timesheet entries to export.",
      });
      return;
    }

    try {
      exportTimesheetToExcel(filteredEntries);
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: "Export complete",
        message: "Timesheet entries exported successfully.",
      });
    } catch (error) {
      console.error("Failed to export timesheet:", error);
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Export failed",
        message: "Unable to export timesheet entries.",
      });
    }
  };

  const handleImportClick = () => {
    importFileInputRef.current?.click();
  };

  const handleImportFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    try {
      if (!file) return;
      if (!/\.(csv|xls|xlsx)$/i.test(file.name)) throw new Error("Unsupported file type");

      const importedEntries = await importTimesheetFromExcel(file, {
        defaultEmployee,
        employeeOptions,
        projectOptions,
        ticketOptions,
      });

      updatePersistedEntries((currentEntries) => [...currentEntries, ...importedEntries]);
      setHasSeededEntries(true);
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: "Import complete",
        message: `Imported ${importedEntries.length} entries successfully.`,
      });
    } catch (error) {
      console.error("Failed to import timesheet:", error);
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Import failed",
        message: "Invalid timesheet file.",
      });
    } finally {
      event.target.value = "";
    }
  };

  const updateEntry = (entryId: string, updates: Partial<TTimeEntry>) => {
    updatePersistedEntries((currentEntries) =>
      currentEntries.map((entry) => (entry.id === entryId ? { ...entry, ...updates } : entry))
    );
  };

  const handleEntryProjectChange = (entryId: string, projectId: string) => {
    const project = projectOptions.find((option) => option.id === projectId);

    updateEntry(entryId, {
      projectId,
      projectName: project?.name ?? "",
      ticketId: "",
      ticketNo: "",
    });
  };

  const handleEntryTicketChange = (entryId: string, ticketId: string) => {
    const ticketOption = ticketOptions.find((option) => option.id === ticketId);
    if (!ticketOption) {
      updateEntry(entryId, { ticketId: "", ticketNo: "" });
      return;
    }

    updateEntry(entryId, {
      projectId: ticketOption.projectId,
      projectName: ticketOption.projectName,
      task: ticketOption.task,
      ticketId: ticketOption.id,
      ticketNo: ticketOption.ticketNo,
    });
  };

  const openAddEntryModal = () => {
    setDraft(createEmptyDraft(defaultEmployee));
    setIsAddEntryModalOpen(true);
  };

  const closeAddEntryModal = () => {
    setIsAddEntryModalOpen(false);
  };

  const saveEntry = () => {
    if (!draft.ticketId || !draft.projectId || !draft.task.trim()) return;

    updatePersistedEntries((currentEntries) => [
      ...currentEntries,
      {
        ...draft,
        id: getTimeSheetEntryId(),
        employeeName: draft.employeeName || defaultEmployee?.name || "Unassigned",
        hours: getHoursValue(draft.hours),
      },
    ]);
    setIsAddEntryModalOpen(false);
    setHasSeededEntries(true);
  };

  const deleteEntry = (entryId: string) => {
    updatePersistedEntries((currentEntries) => currentEntries.filter((entry) => entry.id !== entryId));
    setActiveActionId(undefined);
  };

  const clearFilters = () => {
    setDateRange("all");
    setEmployeeFilter(EMPTY_FILTER_VALUE);
    setProjectFilter(EMPTY_FILTER_VALUE);
    setStatusFilter(EMPTY_FILTER_VALUE);
    setSearchText("");
  };

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
    <div className="min-h-full bg-white text-[#111827]">
      <main className="mx-auto flex w-full max-w-[1440px] flex-col px-7 py-8">
        <section className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <h1 className="tracking-normal truncate text-[30px] leading-9 font-semibold text-[#111827]">Time Sheet</h1>
            <p className="mt-1 text-14 leading-5 text-[#4b5563]">Track daily work, projects, tickets, and hours</p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <input
              ref={importFileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleImportFileChange}
            />
            <TimeSheetButton onClick={handleExportClick}>
              <Download className="size-4" strokeWidth={2} />
              Export
            </TimeSheetButton>
            <TimeSheetButton onClick={handleImportClick}>
              <Upload className="size-4" strokeWidth={2} />
              Import Excel
            </TimeSheetButton>
            <TimeSheetButton variant="primary" onClick={openAddEntryModal}>
              <Plus className="size-4" strokeWidth={2} />
              Add Entry
            </TimeSheetButton>
          </div>
        </section>

        <section className="mt-8 border-t border-[#e5e7eb] pt-5">
          <div className="flex flex-wrap items-center gap-3">
            <FilterSelect
              ariaLabel="Date range"
              icon={<CalendarDays className="size-4" strokeWidth={2} />}
              value={dateRange}
              options={DATE_RANGE_OPTIONS}
              onChange={(value) => setDateRange(value as TDateRangeFilter)}
            />
            <FilterSelect
              ariaLabel="Employee"
              icon={<User className="size-4" strokeWidth={2} />}
              value={employeeFilter}
              options={employeeFilterOptions}
              onChange={setEmployeeFilter}
            />
            <FilterSelect
              ariaLabel="Project"
              icon={<Folder className="size-4" strokeWidth={2} />}
              value={projectFilter}
              options={projectFilterOptions}
              onChange={setProjectFilter}
            />
            <FilterSelect
              ariaLabel="Status"
              icon={<CheckCircle2 className="size-4" strokeWidth={2} />}
              value={statusFilter}
              options={statusFilterOptions}
              onChange={(value) => setStatusFilter(value as TTimeSheetStatus | typeof EMPTY_FILTER_VALUE)}
            />
            <div className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3 text-[#374151] transition focus-within:border-[#d1d5db]">
              <Search className="size-4 flex-shrink-0" strokeWidth={2} />
              <input
                type="text"
                value={searchText}
                placeholder="Search entries..."
                onChange={(event) => setSearchText(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-13 font-medium text-[#111827] outline-none placeholder:text-[#6b7280]"
              />
            </div>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-4 text-13 font-semibold text-[#111827] transition hover:bg-[#fbfbfa]"
              onClick={clearFilters}
            >
              <SlidersHorizontal className="size-4" strokeWidth={2} />
              Filters
            </button>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-lg border border-[#e5e7eb] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1158px] table-fixed border-separate border-spacing-0 text-left">
              <colgroup>
                <col className="w-[128px]" />
                <col className="w-[180px]" />
                <col className="w-[160px]" />
                <col className="w-[280px]" />
                <col className="w-[120px]" />
                <col className="w-[88px]" />
                <col className="w-[126px]" />
                <col className="w-[76px]" />
              </colgroup>
              <thead>
                <tr className="h-12 border-b border-[#e5e7eb] bg-[#fbfbfa] text-12 font-semibold text-[#374151]">
                  {["Date", "Employee Name", "Project", "Task", "Ticket No", "Hours", "Status", "Actions"].map(
                    (column) => (
                      <th
                        key={column}
                        className={cn(
                          "border-b border-[#e5e7eb] px-4 font-semibold",
                          column === "Date" && "whitespace-nowrap"
                        )}
                      >
                        {column}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="h-36 border-b border-[#e5e7eb] px-4 text-center text-13 text-[#6b7280]">
                      No time entries match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => (
                    <TimeSheetRow
                      key={entry.id}
                      entry={entry}
                      isEditing={editingRowId === entry.id}
                      isActionMenuOpen={activeActionId === entry.id}
                      employeeOptions={employeeOptions}
                      projectOptions={projectOptions}
                      ticketOptions={ticketOptions}
                      workspaceSlug={workspaceSlugString}
                      onEdit={() => setEditingRowId(entry.id)}
                      onUpdate={(updates) => updateEntry(entry.id, updates)}
                      onProjectChange={(projectId) => handleEntryProjectChange(entry.id, projectId)}
                      onTicketChange={(ticketId) => handleEntryTicketChange(entry.id, ticketId)}
                      onToggleActions={() => setActiveActionId(activeActionId === entry.id ? undefined : entry.id)}
                      onCloseActions={() => setActiveActionId(undefined)}
                      onDelete={() => deleteEntry(entry.id)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            className="flex min-h-[52px] w-full items-center gap-2 border-b border-[#e5e7eb] px-4 text-left text-13 font-medium text-[#374151] transition hover:bg-[#fbfbfa] hover:text-[#111827]"
            onClick={openAddEntryModal}
          >
            <Plus className="size-4" strokeWidth={2} />
            Add new entry
          </button>

          <div className="flex min-h-[58px] flex-wrap items-center justify-between gap-3 px-4 text-13 text-[#374151]">
            <span>
              Showing {filteredEntries.length} of {entries.length} entries
            </span>
            <div className="flex items-center gap-4">
              <span className="font-medium text-[#374151]">Total Hours</span>
              <span className="rounded-md bg-[#f5f5f4] px-4 py-2 font-semibold text-[#111827]">
                {totalHours.toFixed(2)} h
              </span>
            </div>
          </div>
        </section>
      </main>

      <TimeEntryModal
        currentEmployee={currentEmployee}
        draft={draft}
        employeeOptions={employeeOptions}
        isOpen={isAddEntryModalOpen}
        projectOptions={projectOptions}
        ticketOptions={ticketOptions}
        workspaceSlug={workspaceSlugString}
        onChange={setDraft}
        onClose={closeAddEntryModal}
        onSave={saveEntry}
      />
    </div>
  );
});

function TimeSheetRow({
  entry,
  employeeOptions,
  isActionMenuOpen,
  isEditing,
  onCloseActions,
  onDelete,
  onEdit,
  onProjectChange,
  onTicketChange,
  onToggleActions,
  onUpdate,
  projectOptions,
  ticketOptions,
  workspaceSlug,
}: {
  entry: TTimeEntry;
  employeeOptions: TEmployeeOption[];
  isActionMenuOpen: boolean;
  isEditing: boolean;
  onCloseActions: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onProjectChange: (projectId: string) => void;
  onTicketChange: (ticketId: string) => void;
  onToggleActions: () => void;
  onUpdate: (updates: Partial<TTimeEntry>) => void;
  projectOptions: TProjectOption[];
  ticketOptions: TTicketOption[];
  workspaceSlug: string | undefined;
}) {
  const availableTickets = entry.projectId
    ? ticketOptions.filter((ticketOption) => ticketOption.projectId === entry.projectId)
    : ticketOptions;
  const matchedTicketOption = ticketOptions.find(
    (option) => option.id === entry.ticketId || option.ticketNo.toLowerCase() === entry.ticketNo.toLowerCase()
  );
  const ticketLink =
    matchedTicketOption && workspaceSlug
      ? generateWorkItemLink({
          workspaceSlug,
          projectId: matchedTicketOption.projectId,
          issueId: matchedTicketOption.id,
          projectIdentifier: matchedTicketOption.projectIdentifier,
          sequenceId: matchedTicketOption.issue.sequence_id,
          isEpic: matchedTicketOption.issue.is_epic,
        })
      : undefined;
  const actionCellRef = useRef<HTMLTableCellElement | null>(null);

  useEffect(() => {
    if (!isActionMenuOpen) return;

    const handleOutsideMouseDown = (event: MouseEvent) => {
      if (event.target instanceof Node && !actionCellRef.current?.contains(event.target)) onCloseActions();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseActions();
    };

    document.addEventListener("mousedown", handleOutsideMouseDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleOutsideMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActionMenuOpen, onCloseActions]);

  return (
    <tr className="group h-[60px] cursor-default text-13 text-[#111827] transition hover:bg-[#fbfbfa]" onClick={onEdit}>
      <td className="border-b border-[#e5e7eb] px-4 whitespace-nowrap tabular-nums">
        {isEditing ? (
          <InlineInput
            type="date"
            value={entry.date}
            onChange={(value) => onUpdate({ date: value })}
            ariaLabel="Entry date"
          />
        ) : (
          getDisplayDate(entry.date)
        )}
      </td>
      <td className="border-b border-[#e5e7eb] px-4">
        {isEditing ? (
          <InlineSelect
            value={entry.employeeId}
            options={employeeOptions.map((employee) => ({ value: employee.id, label: employee.name }))}
            onChange={(employeeId) => {
              const employee = employeeOptions.find((option) => option.id === employeeId);
              onUpdate({ employeeId, employeeName: employee?.name ?? entry.employeeName });
            }}
            ariaLabel="Employee name"
          />
        ) : (
          <span className="line-clamp-2">{entry.employeeName || "Unassigned"}</span>
        )}
      </td>
      <td className="border-b border-[#e5e7eb] px-4">
        {isEditing ? (
          <InlineSelect
            value={entry.projectId}
            options={projectOptions.map((project) => ({ value: project.id, label: project.name }))}
            onChange={onProjectChange}
            ariaLabel="Project"
          />
        ) : (
          <span className="line-clamp-2 font-medium">{entry.projectName || "-"}</span>
        )}
      </td>
      <td className="border-b border-[#e5e7eb] px-4">
        {isEditing ? (
          <InlineInput value={entry.task} onChange={(task) => onUpdate({ task })} ariaLabel="Task" />
        ) : (
          <span className="line-clamp-2 leading-5">{entry.task || "-"}</span>
        )}
      </td>
      <td className="border-b border-[#e5e7eb] px-4">
        {isEditing ? (
          <InlineSelect
            value={entry.ticketId}
            placeholder="Ticket"
            options={availableTickets.map((ticketOption) => ({
              value: ticketOption.id,
              label: ticketOption.ticketNo,
            }))}
            onChange={onTicketChange}
            ariaLabel="Ticket number"
          />
        ) : ticketLink && entry.ticketNo ? (
          <Link
            href={ticketLink}
            className="inline-flex max-w-full items-center gap-1.5 rounded-md text-13 font-semibold text-[#2563eb] transition hover:bg-[#eff6ff] hover:text-[#1d4ed8] hover:underline focus:ring-2 focus:ring-[#bfdbfe] focus:outline-none"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="truncate">{entry.ticketNo}</span>
            <ExternalLink className="size-3.5 flex-shrink-0" strokeWidth={2} />
          </Link>
        ) : (
          <span className="font-medium">{entry.ticketNo || "-"}</span>
        )}
      </td>
      <td className="border-b border-[#e5e7eb] px-4">
        {isEditing ? (
          <InlineInput
            type="number"
            value={entry.hours.toFixed(2)}
            onChange={(hours) => onUpdate({ hours: getHoursValue(hours) })}
            ariaLabel="Hours"
          />
        ) : (
          entry.hours.toFixed(2)
        )}
      </td>
      <td className="border-b border-[#e5e7eb] px-4">
        {isEditing ? (
          <InlineSelect
            value={entry.status}
            options={STATUS_OPTIONS.map((status) => ({ value: status, label: status }))}
            onChange={(status) => onUpdate({ status: status as TTimeSheetStatus })}
            ariaLabel="Status"
          />
        ) : (
          <StatusPill status={entry.status} />
        )}
      </td>
      <td ref={actionCellRef} className="relative border-b border-[#e5e7eb] px-4">
        <button
          type="button"
          className="grid size-8 place-items-center rounded-md text-[#6b7280] transition hover:bg-[#f5f5f4] hover:text-[#374151] focus-visible:ring-2 focus-visible:ring-[#d1d5db] focus-visible:outline-none"
          aria-label={`Actions for ${entry.task || entry.ticketNo || "time entry"}`}
          aria-expanded={isActionMenuOpen}
          aria-haspopup="menu"
          onClick={(event) => {
            event.stopPropagation();
            onToggleActions();
          }}
        >
          <MoreHorizontal className="size-4" strokeWidth={2} />
        </button>
        {isActionMenuOpen && (
          <div
            role="menu"
            className="absolute top-10 right-3 z-20 w-32 rounded-lg border border-[#e5e7eb] bg-white p-1 shadow-[0_12px_28px_rgba(15,23,42,0.12)]"
            onMouseDown={(event) => event.stopPropagation()}
            onMouseLeave={onCloseActions}
          >
            <button
              type="button"
              className="flex h-8 w-full items-center rounded-md px-2 text-left text-13 font-medium text-[#374151] hover:bg-[#f5f5f4]"
              onClick={(event) => {
                event.stopPropagation();
                onEdit();
                onCloseActions();
              }}
            >
              Edit row
            </button>
            <button
              type="button"
              className="flex h-8 w-full items-center rounded-md px-2 text-left text-13 font-medium text-[#374151] hover:bg-[#f5f5f4]"
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
            >
              Delete
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

function TimeEntryModal({
  currentEmployee,
  draft,
  employeeOptions,
  isOpen,
  onChange,
  onClose,
  onSave,
  projectOptions,
  ticketOptions,
  workspaceSlug,
}: {
  currentEmployee: TEmployeeOption | undefined;
  draft: TEntryDraft;
  employeeOptions: TEmployeeOption[];
  isOpen: boolean;
  onChange: Dispatch<SetStateAction<TEntryDraft>>;
  onClose: () => void;
  onSave: () => void;
  projectOptions: TProjectOption[];
  ticketOptions: TTicketOption[];
  workspaceSlug: string | undefined;
}) {
  const { fetchIssueWithIdentifier } = useIssueDetail();
  const [step, setStep] = useState<TAddEntryStep>("ticket");
  const [ticketQuery, setTicketQuery] = useState("");
  const [ticketLookupError, setTicketLookupError] = useState<string | undefined>();
  const [isTicketLookupLoading, setIsTicketLookupLoading] = useState(false);
  const ticketLookupRequestRef = useRef(0);
  const canSave = !!draft.projectId && !!draft.task.trim();
  const normalizedTicketQuery = ticketQuery.trim().toLowerCase();
  const selectedTicketOption = ticketOptions.find((ticketOption) => ticketOption.id === draft.ticketId) ?? null;
  const exactTicketOption = ticketOptions.find(
    (ticketOption) => ticketOption.ticketNo.toLowerCase() === normalizedTicketQuery
  );
  const ticketIdentifier = getTicketIdentifierParts(ticketQuery);
  const visibleTicketOptions = ticketOptions
    .filter((ticketOption) => {
      if (!normalizedTicketQuery) return true;

      return [ticketOption.ticketNo, ticketOption.task, ticketOption.projectName]
        .join(" ")
        .toLowerCase()
        .includes(normalizedTicketQuery);
    })
    .slice(0, 8);

  const updateDraft = (updates: Partial<TEntryDraft>) => onChange((currentDraft) => ({ ...currentDraft, ...updates }));

  useEffect(() => {
    ticketLookupRequestRef.current += 1;
    if (!isOpen) return;

    setStep("ticket");
    setTicketQuery("");
    setTicketLookupError(undefined);
    setIsTicketLookupLoading(false);
  }, [isOpen]);

  const fillTicketDetails = (ticketOption: TTicketOption) => {
    onChange((currentDraft) => ({
      ...currentDraft,
      ...getTicketAutofillUpdates(ticketOption, employeeOptions, currentEmployee),
    }));
    setTicketQuery(ticketOption.ticketNo);
    setTicketLookupError(undefined);
    setIsTicketLookupLoading(false);
    setStep("confirm");
  };

  const lookupTicket = async (ticketNo: string) => {
    const storedTicketOption = ticketOptions.find(
      (ticketOption) => ticketOption.ticketNo.toLowerCase() === ticketNo.trim().toLowerCase()
    );
    if (storedTicketOption) {
      fillTicketDetails(storedTicketOption);
      return;
    }

    const typedIdentifier = getTicketIdentifierParts(ticketNo);
    if (!typedIdentifier || !workspaceSlug) {
      setTicketLookupError("No matching ticket found.");
      return;
    }

    const ticketLookupRequest = ++ticketLookupRequestRef.current;
    setIsTicketLookupLoading(true);
    setTicketLookupError(undefined);

    try {
      const issue = await fetchIssueWithIdentifier(
        workspaceSlug,
        typedIdentifier.projectIdentifier,
        typedIdentifier.sequenceId
      );
      if (ticketLookupRequest !== ticketLookupRequestRef.current) return;

      const fetchedTicketOption =
        ticketOptions.find((ticketOption) => ticketOption.id === issue.id) ??
        createTicketOptionFromIssue(issue, typedIdentifier.projectIdentifier, projectOptions);

      if (!fetchedTicketOption) {
        setTicketLookupError("No matching ticket found.");
        setIsTicketLookupLoading(false);
        return;
      }

      fillTicketDetails(fetchedTicketOption);
    } catch {
      if (ticketLookupRequest === ticketLookupRequestRef.current) {
        setTicketLookupError("No matching ticket found.");
        setIsTicketLookupLoading(false);
      }
    }
  };

  return (
    <Transition.Root show={isOpen} appear as={Fragment}>
      <Dialog as="div" className="relative z-[80]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-[rgba(17,24,39,0.34)] backdrop-blur-[3px] transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-[80] overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="translate-y-2 scale-95 opacity-0"
              enterTo="translate-y-0 scale-100 opacity-100"
              leave="ease-in duration-150"
              leaveFrom="translate-y-0 scale-100 opacity-100"
              leaveTo="translate-y-2 scale-95 opacity-0"
            >
              <Dialog.Panel className="w-full max-w-[620px] transform overflow-hidden rounded-[10px] border border-[#e5e7eb] bg-white text-[#111827] shadow-[0_28px_80px_rgba(15,23,42,0.28)] transition-all">
                <header className="flex h-14 items-center justify-between border-b border-[#e5e7eb] px-5">
                  <Dialog.Title className="text-16 font-semibold">Add Time Entry</Dialog.Title>
                  <button
                    type="button"
                    className="grid size-8 place-items-center rounded-md text-[#4b5563] transition hover:bg-[#f5f5f4] hover:text-[#111827]"
                    onClick={onClose}
                    aria-label="Close add time entry modal"
                  >
                    <X className="size-4" strokeWidth={2} />
                  </button>
                </header>

                <div className="px-5 py-5">
                  <TimeEntryStepper step={step} />

                  {step === "ticket" ? (
                    <div className="mt-5">
                      <label htmlFor="timesheet-ticket-search" className="flex flex-col gap-1.5">
                        <span className="text-13 font-semibold">Ticket No</span>
                        <span className="text-12 text-[#6b7280]">Search or select a ticket to auto-fill details</span>
                      </label>

                      <Combobox
                        value={selectedTicketOption}
                        onChange={(ticketOption: TTicketOption | null) => {
                          if (ticketOption) fillTicketDetails(ticketOption);
                        }}
                      >
                        <div className="relative mt-3">
                          <div className="flex h-11 items-center gap-2 rounded-lg border border-[#d1d5db] bg-white px-3 transition focus-within:border-[#111827]">
                            <Search className="size-4 flex-shrink-0 text-[#6b7280]" strokeWidth={2} />
                            <Combobox.Input
                              id="timesheet-ticket-search"
                              value={ticketQuery}
                              displayValue={(ticketOption: TTicketOption | null) =>
                                ticketQuery || ticketOption?.ticketNo || ""
                              }
                              placeholder="Select or type ticket number"
                              className="min-w-0 flex-1 bg-transparent text-13 font-medium outline-none placeholder:text-[#6b7280]"
                              onChange={(event) => {
                                setTicketQuery(event.target.value);
                                setTicketLookupError(undefined);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" && getTicketIdentifierParts(ticketQuery)) {
                                  event.preventDefault();
                                  void lookupTicket(ticketQuery);
                                }
                              }}
                            />
                          </div>

                          <Combobox.Options
                            static
                            className="mt-2 max-h-[264px] overflow-y-auto rounded-lg border border-[#e5e7eb] bg-white p-1 shadow-[0_18px_42px_rgba(15,23,42,0.12)] focus:outline-none"
                          >
                            {visibleTicketOptions.map((ticketOption) => (
                              <Combobox.Option
                                key={ticketOption.id}
                                value={ticketOption}
                                className={({ active, selected }) =>
                                  cn(
                                    "flex cursor-pointer items-center justify-between gap-4 rounded-md border border-transparent px-3 py-2.5 text-left text-13 transition",
                                    active && "bg-[#f5f5f4]",
                                    selected && "border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb]"
                                  )
                                }
                              >
                                <span className="min-w-[92px] flex-shrink-0 font-semibold">
                                  {ticketOption.ticketNo}
                                </span>
                                <span className="min-w-0 flex-1 truncate text-[#4b5563]">{ticketOption.task}</span>
                              </Combobox.Option>
                            ))}

                            {visibleTicketOptions.length === 0 && (
                              <div className="px-3 py-2 text-13 text-[#6b7280]">
                                No loaded tickets match this search.
                              </div>
                            )}

                            {ticketIdentifier && !exactTicketOption && (
                              <button
                                type="button"
                                className="mt-1 flex h-10 w-full items-center justify-between rounded-md border border-[#e5e7eb] px-3 text-left text-13 font-semibold text-[#111827] transition hover:bg-[#fbfbfa] disabled:cursor-wait disabled:text-[#6b7280]"
                                disabled={isTicketLookupLoading}
                                onClick={() => void lookupTicket(ticketQuery)}
                              >
                                <span>
                                  {isTicketLookupLoading ? "Searching ticket..." : `Find ${ticketQuery.trim()}`}
                                </span>
                                <span className="text-12 font-medium text-[#6b7280]">Existing ticket</span>
                              </button>
                            )}
                          </Combobox.Options>
                        </div>
                      </Combobox>

                      {ticketLookupError && (
                        <p aria-live="polite" className="mt-2 text-12 font-medium text-[#b91c1c]">
                          {ticketLookupError}
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="mt-5 rounded-lg border border-[#e5e7eb] bg-white p-4">
                        <h3 className="text-13 font-semibold">Ticket Details</h3>
                        <div className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                          <TimeEntryDetail label="Ticket No">{draft.ticketNo || "-"}</TimeEntryDetail>
                          <TimeEntryDetail label="Task">{draft.task || "-"}</TimeEntryDetail>
                          <TimeEntryDetail label="Project">{draft.projectName || "-"}</TimeEntryDetail>
                          <TimeEntryDetail label="Status">
                            <StatusPill status={draft.status} />
                          </TimeEntryDetail>
                          <TimeEntryDetail label="Assignee">{draft.employeeName || "Unassigned"}</TimeEntryDetail>
                          <TimeEntryDetail label="Date">{getDisplayDate(draft.date)}</TimeEntryDetail>
                          <ModalField label="Hours">
                            <input
                              type="number"
                              value={draft.hours}
                              step="0.25"
                              min="0"
                              className="h-10 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-13 font-medium transition outline-none focus:border-[#111827]"
                              onChange={(event) => updateDraft({ hours: event.target.value })}
                            />
                          </ModalField>
                          <ModalField label="Notes (optional)">
                            <textarea
                              rows={2}
                              value={draft.notes}
                              placeholder="Add a note..."
                              className="min-h-10 w-full resize-none rounded-lg border border-[#d1d5db] bg-white px-3 py-2.5 text-13 font-medium transition outline-none placeholder:text-[#6b7280] focus:border-[#111827]"
                              onChange={(event) => updateDraft({ notes: event.target.value })}
                            />
                          </ModalField>
                        </div>
                      </div>
                      <p className="mt-3 text-12 text-[#6b7280]">Details auto-filled from the selected ticket.</p>
                    </>
                  )}
                </div>

                {step === "confirm" && (
                  <footer className="flex items-center justify-between border-t border-[#e5e7eb] px-5 py-4">
                    <button
                      type="button"
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white px-4 text-13 font-semibold text-[#111827] transition hover:bg-[#fbfbfa]"
                      onClick={() => setStep("ticket")}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={!canSave}
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-[#2563eb] bg-[#2563eb] px-5 text-13 font-semibold text-white transition hover:border-[#1d4ed8] hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:border-[#d1d5db] disabled:bg-[#d1d5db]"
                      onClick={onSave}
                    >
                      Add Entry
                    </button>
                  </footer>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

function TimeEntryStepper({ step }: { step: TAddEntryStep }) {
  return (
    <ol className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
      <li className="flex flex-col items-center gap-2 text-center">
        <span
          className={cn(
            "grid size-8 place-items-center rounded-full border text-13 font-semibold",
            step === "ticket" ? "border-[#2563eb] bg-[#2563eb] text-white" : "border-[#d1d5db] bg-white text-[#111827]"
          )}
        >
          1
        </span>
        <span className="text-12 font-medium text-[#374151]">Select Ticket</span>
      </li>
      <li aria-hidden="true" className="mt-4 h-px w-24 bg-[#e5e7eb] sm:w-48" />
      <li className="flex flex-col items-center gap-2 text-center">
        <span
          className={cn(
            "grid size-8 place-items-center rounded-full border text-13 font-semibold",
            step === "confirm"
              ? "border-[#2563eb] bg-[#2563eb] text-white"
              : "border-[#e5e7eb] bg-[#f5f5f4] text-[#6b7280]"
          )}
        >
          2
        </span>
        <span className="text-12 font-medium text-[#374151]">Confirm Details</span>
      </li>
    </ol>
  );
}

function TimeEntryDetail({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="min-w-0">
      <p className="text-12 font-medium text-[#4b5563]">{label}</p>
      <div className="mt-1 min-h-6 min-w-0 text-13 font-medium text-[#111827]">{children}</div>
    </div>
  );
}

function ModalField({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-12 font-medium text-[#4b5563]">{label}</span>
      {children}
    </label>
  );
}

function TimeSheetSelect({
  buttonClassName,
  className,
  icon,
  menuWidthClassName,
  onChange,
  options,
  placeholder,
  value,
}: {
  buttonClassName: string;
  className: string;
  icon?: ReactNode;
  menuWidthClassName: string;
  onChange: (value: string) => void;
  options: TTimeSheetSelectOption[];
  placeholder?: string;
  value: string;
}) {
  const selectOptions = placeholder ? [{ value: "", label: placeholder }, ...options] : options;
  const selectedOption = selectOptions.find((option) => option.value === value);

  return (
    <CustomSelect
      value={value}
      label={
        <span className="flex min-w-0 items-center gap-2">
          {icon && <span className="flex-shrink-0 text-[#374151]">{icon}</span>}
          <span className={cn("truncate", !value && placeholder && "text-[#6b7280]")}>
            {selectedOption?.label ?? placeholder ?? ""}
          </span>
        </span>
      }
      onChange={onChange}
      className={className}
      buttonClassName={buttonClassName}
      optionsClassName={cn(TIME_SHEET_SELECT_MENU_CLASS, menuWidthClassName)}
      maxHeight="lg"
      placement="bottom-start"
    >
      {selectOptions.map((option) => (
        <CustomSelect.Option
          key={option.value || "empty-option"}
          value={option.value}
          className={TIME_SHEET_SELECT_OPTION_CLASS}
        >
          <span className={cn("truncate", !option.value && placeholder && "text-[#6b7280]")}>{option.label}</span>
        </CustomSelect.Option>
      ))}
    </CustomSelect>
  );
}

function FilterSelect({
  ariaLabel,
  icon,
  onChange,
  options,
  value,
}: {
  ariaLabel: string;
  icon: ReactNode;
  onChange: (value: string) => void;
  options: TTimeSheetSelectOption[];
  value: string;
}) {
  return (
    <div aria-label={ariaLabel}>
      <TimeSheetSelect
        value={value}
        icon={icon}
        options={options}
        onChange={onChange}
        className="h-10 min-w-[150px]"
        buttonClassName="h-10 min-w-[150px] rounded-lg border border-[#e5e7eb] bg-white px-3 py-0 text-13 font-semibold text-[#111827] shadow-none transition hover:bg-[#fbfbfa] focus:border-[#d1d5db] focus:outline-none focus:ring-0"
        menuWidthClassName="w-[150px] min-w-[150px]"
      />
    </div>
  );
}

function TimeSheetButton({
  children,
  onClick,
  variant = "secondary",
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-13 font-semibold transition",
        variant === "primary"
          ? "border-[#111827] bg-[#111827] text-white hover:bg-[#374151]"
          : "border-[#e5e7eb] bg-white text-[#111827] hover:bg-[#fbfbfa]"
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function StatusPill({ status }: { status: TTimeSheetStatus }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-12 font-medium before:size-1.5 before:rounded-full before:content-['']",
        STATUS_PILL_STYLES[status]
      )}
    >
      {status}
    </span>
  );
}

function InlineInput({
  ariaLabel,
  onChange,
  type = "text",
  value,
}: {
  ariaLabel: string;
  onChange: (value: string) => void;
  type?: "date" | "number" | "text";
  value: string;
}) {
  return (
    <input
      aria-label={ariaLabel}
      type={type}
      value={value}
      step={type === "number" ? "0.25" : undefined}
      min={type === "number" ? "0" : undefined}
      className="h-8 w-full rounded-md border border-[#e5e7eb] bg-white px-2 text-13 font-medium text-[#111827] outline-none focus:border-[#d1d5db]"
      onChange={(event) => onChange(event.target.value)}
      onClick={(event) => event.stopPropagation()}
    />
  );
}

function InlineSelect({
  ariaLabel,
  onChange,
  options,
  placeholder,
  value,
}: {
  ariaLabel: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  value: string;
}) {
  return (
    <div aria-label={ariaLabel}>
      <TimeSheetSelect
        value={value}
        options={options}
        placeholder={placeholder}
        onChange={onChange}
        className="w-full"
        buttonClassName="h-8 w-full rounded-md border border-[#e5e7eb] bg-white px-2 py-0 text-13 font-medium text-[#111827] shadow-none transition hover:bg-[#fbfbfa] focus:border-[#d1d5db] focus:outline-none focus:ring-0"
        menuWidthClassName="w-[180px] min-w-[180px]"
      />
    </div>
  );
}
