/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { ArrowUpDown, CalendarDays, Check, Copy, Filter, MoreHorizontal, Plus, Tag, Trash2 } from "lucide-react";
import { cn } from "@plane/utils";

type TTodoStatus = "To Do" | "Done";
type TTodoPriority = "Low" | "Medium" | "High";
type TStatusFilter = "all" | "todo" | "done";
type TSortMode = "manual" | "due" | "priority";

type TTodoItem = {
  id: string;
  name: string;
  status: TTodoStatus;
  priority: TTodoPriority;
  dueDate: string;
  tags: string[];
};

type TTodoView = {
  key: string;
  label: string;
};

const INITIAL_TODO_ITEMS: TTodoItem[] = [
  {
    id: "todo-1",
    name: "Review workspace dashboard notes",
    status: "To Do",
    priority: "Medium",
    dueDate: "2026-05-13",
    tags: ["Planning"],
  },
  {
    id: "todo-2",
    name: "QA filter and table interactions",
    status: "To Do",
    priority: "High",
    dueDate: "2026-05-14",
    tags: ["QA"],
  },
  {
    id: "todo-3",
    name: "Prepare team sync checklist",
    status: "Done",
    priority: "Low",
    dueDate: "2026-05-15",
    tags: ["Team"],
  },
];

const BASE_TODO_VIEWS: TTodoView[] = [
  { key: "todo", label: "To Do" },
  { key: "done", label: "Done" },
  { key: "calendar", label: "Calendar" },
];

const STATUS_OPTIONS: TTodoStatus[] = ["To Do", "Done"];
const PRIORITY_OPTIONS: TTodoPriority[] = ["Low", "Medium", "High"];
const TAG_OPTIONS = ["Planning", "QA", "Team", "Personal", "Design", "Review"];
const PRIORITY_ORDER: Record<TTodoPriority, number> = { High: 0, Medium: 1, Low: 2 };

export function ToDoListPage() {
  const [items, setItems] = useState<TTodoItem[]>(INITIAL_TODO_ITEMS);
  const [views, setViews] = useState<TTodoView[]>(BASE_TODO_VIEWS);
  const [activeView, setActiveView] = useState<string>("todo");
  const [nextTaskNumber, setNextTaskNumber] = useState(INITIAL_TODO_ITEMS.length + 1);
  const [editingTaskId, setEditingTaskId] = useState<string | undefined>();
  const [openMenu, setOpenMenu] = useState<"filter" | "sort" | "more" | undefined>();
  const [activeActionId, setActiveActionId] = useState<string | undefined>();
  const [activeTagMenuId, setActiveTagMenuId] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<TStatusFilter>("all");
  const [sortMode, setSortMode] = useState<TSortMode>("manual");

  const visibleItems = useMemo(() => {
    let nextItems = [...items];

    if (activeView === "todo") nextItems = nextItems.filter((item) => item.status !== "Done");
    if (activeView === "done") nextItems = nextItems.filter((item) => item.status === "Done");
    if (statusFilter === "todo") nextItems = nextItems.filter((item) => item.status === "To Do");
    if (statusFilter === "done") nextItems = nextItems.filter((item) => item.status === "Done");

    if (activeView === "calendar" || sortMode === "due") {
      nextItems.sort((a, b) => (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31"));
    }

    if (sortMode === "priority") {
      nextItems.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    }

    return nextItems;
  }, [activeView, items, sortMode, statusFilter]);

  const addTask = () => {
    const taskNumber = nextTaskNumber;
    const taskId = `todo-${taskNumber}`;

    setItems((currentItems) => [
      ...currentItems,
      {
        id: taskId,
        name: "Untitled task",
        status: "To Do",
        priority: "Medium",
        dueDate: "",
        tags: ["Personal"],
      },
    ]);
    setNextTaskNumber((currentNumber) => currentNumber + 1);
    setActiveView("todo");
    setEditingTaskId(taskId);
  };

  const addView = () => {
    const viewNumber = Math.max(1, views.length - BASE_TODO_VIEWS.length + 1);
    const viewKey = `custom-${viewNumber}`;

    setViews((currentViews) => [...currentViews, { key: viewKey, label: `View ${viewNumber}` }]);
    setActiveView(viewKey);
  };

  const updateTask = (taskId: string, updates: Partial<TTodoItem>) => {
    setItems((currentItems) => currentItems.map((item) => (item.id === taskId ? { ...item, ...updates } : item)));
  };

  const toggleTask = (taskId: string) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === taskId ? { ...item, status: item.status === "Done" ? "To Do" : "Done" } : item
      )
    );
  };

  const duplicateTask = (task: TTodoItem) => {
    const taskNumber = nextTaskNumber;
    const taskId = `todo-${taskNumber}`;

    setItems((currentItems) => [
      ...currentItems,
      {
        ...task,
        id: taskId,
        name: `${task.name} copy`,
        status: "To Do",
      },
    ]);
    setNextTaskNumber((currentNumber) => currentNumber + 1);
    setActiveActionId(undefined);
    setEditingTaskId(taskId);
  };

  const deleteTask = (taskId: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== taskId));
    setActiveActionId(undefined);
  };

  const toggleTag = (task: TTodoItem, tag: string) => {
    updateTask(task.id, {
      tags: task.tags.includes(tag) ? task.tags.filter((itemTag) => itemTag !== tag) : [...task.tags, tag],
    });
  };

  const clearCompleted = () => {
    setItems((currentItems) => currentItems.filter((item) => item.status !== "Done"));
    setOpenMenu(undefined);
  };

  return (
    <div className="flyers-soft-todo-body text-[#111827]">
      <div className="flyers-soft-todo-content flex flex-col gap-5">
          <section className="flex min-w-0 items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-[30px] leading-9 font-semibold tracking-normal text-[#111827]">
                To Do List
              </h1>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <TodoActionButton variant="primary" onClick={addTask}>
                <Plus className="h-4 w-4" strokeWidth={2} />
                <span>New task</span>
              </TodoActionButton>
              <HeaderMenu
                active={openMenu === "filter"}
                button={
                  <TodoActionButton onClick={() => setOpenMenu(openMenu === "filter" ? undefined : "filter")}>
                    <Filter className="h-4 w-4" strokeWidth={1.8} />
                    <span>Filter</span>
                  </TodoActionButton>
                }
              >
                <MenuButton active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
                  All tasks
                </MenuButton>
                <MenuButton active={statusFilter === "todo"} onClick={() => setStatusFilter("todo")}>
                  To Do
                </MenuButton>
                <MenuButton active={statusFilter === "done"} onClick={() => setStatusFilter("done")}>
                  Done
                </MenuButton>
              </HeaderMenu>
              <HeaderMenu
                active={openMenu === "sort"}
                button={
                  <TodoActionButton onClick={() => setOpenMenu(openMenu === "sort" ? undefined : "sort")}>
                    <ArrowUpDown className="h-4 w-4" strokeWidth={1.8} />
                    <span>Sort</span>
                  </TodoActionButton>
                }
              >
                <MenuButton active={sortMode === "manual"} onClick={() => setSortMode("manual")}>
                  Manual
                </MenuButton>
                <MenuButton active={sortMode === "due"} onClick={() => setSortMode("due")}>
                  Due date
                </MenuButton>
                <MenuButton active={sortMode === "priority"} onClick={() => setSortMode("priority")}>
                  Priority
                </MenuButton>
              </HeaderMenu>
              <HeaderMenu
                active={openMenu === "more"}
                align="right"
                button={
                  <button
                    type="button"
                    className="grid h-10 w-10 place-items-center rounded-lg border border-[#e5e7eb] bg-white text-[#374151] transition-colors hover:bg-[#f5f5f4]"
                    aria-label="More options"
                    onClick={() => setOpenMenu(openMenu === "more" ? undefined : "more")}
                  >
                    <MoreHorizontal className="h-4 w-4" strokeWidth={1.8} />
                  </button>
                }
              >
                <MenuButton onClick={clearCompleted}>Clear completed</MenuButton>
                <MenuButton
                  onClick={() => {
                    setItems(INITIAL_TODO_ITEMS);
                    setOpenMenu(undefined);
                  }}
                >
                  Reset sample tasks
                </MenuButton>
              </HeaderMenu>
            </div>
          </section>

          <div className="flex items-center gap-1 border-b border-[#e5e7eb]">
            {views.map((view) => (
              <button
                key={view.key}
                type="button"
                className={cn(
                  "h-9 rounded-t-md px-3 text-[13px] font-medium text-[#374151] transition-colors hover:bg-[#f5f5f4]",
                  activeView === view.key && "bg-[#f1f1ef] text-[#111827]"
                )}
                onClick={() => setActiveView(view.key)}
              >
                {view.label}
              </button>
            ))}
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-t-md px-3 text-[13px] font-medium text-[#6b7280] transition-colors hover:bg-[#f5f5f4] hover:text-[#374151]"
              onClick={addView}
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              <span>Add view</span>
            </button>
          </div>

          <section className="overflow-x-auto overflow-y-hidden rounded-[10px] border border-[#e5e7eb] bg-white">
            <div className="grid min-h-10 min-w-[920px] grid-cols-[44px_minmax(260px,1.7fr)_150px_130px_130px_minmax(160px,1fr)_48px] items-center border-b border-[#e5e7eb] bg-[#fbfbfa] text-[12px] font-medium text-[#6b7280]">
              <div />
              <div className="px-3">Task name</div>
              <div className="px-3">Status</div>
              <div className="px-3">Priority</div>
              <div className="px-3">Due date</div>
              <div className="px-3">Tags</div>
              <div />
            </div>

            {visibleItems.map((item) => (
              <div
                key={item.id}
                className="grid min-h-[52px] min-w-[920px] grid-cols-[44px_minmax(260px,1.7fr)_150px_130px_130px_minmax(160px,1fr)_48px] items-center border-b border-[#e5e7eb] text-[13px] text-[#374151] transition-colors last:border-b-0 hover:bg-[#fbfbfa]"
              >
                <div className="flex justify-center">
                  <button
                    type="button"
                    className={cn(
                      "grid h-4 w-4 place-items-center rounded border border-[#d1d5db] bg-white text-white",
                      item.status === "Done" && "border-[#111827] bg-[#111827]"
                    )}
                    aria-label={item.status === "Done" ? "Mark task as not done" : "Mark task as done"}
                    onClick={() => toggleTask(item.id)}
                  >
                    {item.status === "Done" && <Check className="h-3 w-3" strokeWidth={2.4} />}
                  </button>
                </div>

                <div className="min-w-0 px-3">
                  <input
                    className={cn(
                      "block h-8 w-full truncate rounded-md border border-transparent bg-transparent px-1 text-[13px] font-medium text-[#111827] outline-none transition-colors hover:border-[#e5e7eb] focus:border-[#e5e7eb] focus:bg-white",
                      item.status === "Done" && "text-[#6b7280] line-through"
                    )}
                    value={item.name}
                    autoFocus={editingTaskId === item.id}
                    onFocus={() => setEditingTaskId(item.id)}
                    onChange={(event) => updateTask(item.id, { name: event.target.value })}
                    onBlur={() => setEditingTaskId(undefined)}
                    aria-label="Task name"
                  />
                </div>

                <div className="px-3">
                  <select
                    className="h-6 max-w-full rounded-full border border-[#e5e7eb] bg-[#f5f5f4] px-2 text-[12px] font-medium text-[#374151] outline-none"
                    value={item.status}
                    onChange={(event) => updateTask(item.id, { status: event.target.value as TTodoStatus })}
                    aria-label="Task status"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="px-3">
                  <select
                    className="h-6 max-w-full rounded-full border border-[#e5e7eb] bg-white px-2 text-[12px] font-medium text-[#374151] outline-none"
                    value={item.priority}
                    onChange={(event) => updateTask(item.id, { priority: event.target.value as TTodoPriority })}
                    aria-label="Task priority"
                  >
                    {PRIORITY_OPTIONS.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex min-w-0 items-center gap-1.5 px-3 text-[#6b7280]">
                  <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.8} />
                  <input
                    type="date"
                    className="h-8 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 text-[13px] text-[#6b7280] outline-none transition-colors hover:border-[#e5e7eb] focus:border-[#e5e7eb] focus:bg-white"
                    value={item.dueDate}
                    onChange={(event) => updateTask(item.id, { dueDate: event.target.value })}
                    aria-label="Due date"
                  />
                </div>

                <div className="relative flex min-w-0 flex-wrap items-center gap-1.5 px-3">
                  {item.tags.map((tag) => (
                    <button
                      key={`${item.id}-${tag}`}
                      type="button"
                      className="inline-flex h-6 max-w-full items-center gap-1 rounded-full border border-[#e5e7eb] bg-[#fbfbfa] px-2 text-[12px] font-medium text-[#6b7280] transition-colors hover:bg-[#f5f5f4]"
                      onClick={() => toggleTag(item, tag)}
                      title="Remove tag"
                    >
                      <Tag className="h-3 w-3 flex-shrink-0" strokeWidth={1.8} />
                      <span className="truncate">{tag}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    className="inline-flex h-6 items-center rounded-full border border-[#e5e7eb] bg-white px-2 text-[12px] font-medium text-[#6b7280] transition-colors hover:bg-[#f5f5f4] hover:text-[#374151]"
                    onClick={() => setActiveTagMenuId(activeTagMenuId === item.id ? undefined : item.id)}
                  >
                    <Plus className="h-3 w-3" strokeWidth={2} />
                  </button>
                  {activeTagMenuId === item.id && (
                    <div className="absolute top-7 left-3 z-20 w-36 rounded-lg border border-[#e5e7eb] bg-white p-1">
                      {TAG_OPTIONS.map((tag) => (
                        <MenuButton key={tag} active={item.tags.includes(tag)} onClick={() => toggleTag(item, tag)}>
                          {tag}
                        </MenuButton>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative flex justify-center">
                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center rounded-md text-[#6b7280] transition-colors hover:bg-[#f5f5f4] hover:text-[#111827]"
                    aria-label={`Actions for ${item.name}`}
                    onClick={() => setActiveActionId(activeActionId === item.id ? undefined : item.id)}
                  >
                    <MoreHorizontal className="h-4 w-4" strokeWidth={1.8} />
                  </button>
                  {activeActionId === item.id && (
                    <div className="absolute top-8 right-2 z-20 w-40 rounded-lg border border-[#e5e7eb] bg-white p-1">
                      <MenuButton onClick={() => toggleTask(item.id)}>
                        {item.status === "Done" ? "Mark To Do" : "Mark Done"}
                      </MenuButton>
                      <MenuButton onClick={() => duplicateTask(item)}>
                        <Copy className="h-3.5 w-3.5" strokeWidth={1.8} />
                        Duplicate
                      </MenuButton>
                      <MenuButton onClick={() => updateTask(item.id, { dueDate: "" })}>Clear due date</MenuButton>
                      <MenuButton tone="danger" onClick={() => deleteTask(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                        Delete
                      </MenuButton>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              className="flex min-h-[52px] min-w-[920px] items-center gap-2 px-3 text-left text-[13px] font-medium text-[#6b7280] transition-colors hover:bg-[#fbfbfa] hover:text-[#111827]"
              onClick={addTask}
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              <span>New task</span>
            </button>
          </section>
      </div>
    </div>
  );
}

function HeaderMenu({
  active,
  align = "left",
  button,
  children,
}: {
  active: boolean;
  align?: "left" | "right";
  button: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      {button}
      {active && (
        <div
          className={cn(
            "absolute top-11 z-30 w-40 rounded-lg border border-[#e5e7eb] bg-white p-1",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function MenuButton({
  active = false,
  children,
  onClick,
  tone = "default",
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] font-medium transition-colors",
        active ? "bg-[#f1f1ef] text-[#111827]" : "text-[#374151] hover:bg-[#f5f5f4]",
        tone === "danger" && "text-[#374151]"
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function TodoActionButton({
  children,
  onClick,
  variant = "secondary",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition-colors",
        variant === "primary"
          ? "border-[#111827] bg-[#111827] text-white hover:bg-[#374151]"
          : "border-[#e5e7eb] bg-white text-[#374151] hover:bg-[#f5f5f4]"
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
