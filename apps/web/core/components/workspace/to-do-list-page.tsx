/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { CSSProperties, MutableRefObject, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const tagMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const actionMenuTriggerRef = useRef<HTMLButtonElement | null>(null);

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
    <div className="flyers-soft-todo-body text-primary">
      <div className="flyers-soft-todo-content flex flex-col gap-5">
          <section className="flex min-w-0 items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-[30px] leading-9 font-semibold tracking-normal text-primary">
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
                    className="grid h-10 w-10 place-items-center rounded-lg border border-strong bg-surface-1 text-secondary transition-colors hover:bg-surface-3"
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

          <div className="flex items-center gap-1 border-b border-strong">
            {views.map((view) => (
              <button
                key={view.key}
                type="button"
                className={cn(
                  "h-9 rounded-t-md px-3 text-[13px] font-medium text-secondary transition-colors hover:bg-surface-3",
                  activeView === view.key && "bg-layer-1-active text-primary"
                )}
                onClick={() => setActiveView(view.key)}
              >
                {view.label}
              </button>
            ))}
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-t-md px-3 text-[13px] font-medium text-tertiary transition-colors hover:bg-surface-3 hover:text-secondary"
              onClick={addView}
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              <span>Add view</span>
            </button>
          </div>

          <section className="overflow-x-auto overflow-y-hidden rounded-[10px] border border-strong bg-surface-1">
            <div className="grid min-h-10 min-w-[950px] grid-cols-[44px_minmax(260px,1.7fr)_150px_130px_160px_minmax(160px,1fr)_48px] items-center border-b border-strong bg-canvas text-[12px] font-medium text-tertiary">
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
                className="grid min-h-[52px] min-w-[950px] grid-cols-[44px_minmax(260px,1.7fr)_150px_130px_160px_minmax(160px,1fr)_48px] items-center border-b border-strong text-[13px] text-secondary transition-colors last:border-b-0 hover:bg-canvas"
              >
                <div className="flex justify-center">
                  <button
                    type="button"
                    className={cn(
                      "grid h-4 w-4 place-items-center rounded border border-strong bg-surface-1 text-on-color",
                      item.status === "Done" && "border-accent-strong bg-accent-primary"
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
                      "block h-8 w-full truncate rounded-md border border-transparent bg-transparent px-1 text-[13px] font-medium text-primary outline-none transition-colors hover:border-strong focus:border-strong focus:bg-surface-1",
                      item.status === "Done" && "text-tertiary line-through"
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
                    className="h-6 max-w-full rounded-full border border-strong bg-surface-3 px-2 text-[12px] font-medium text-secondary outline-none"
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
                    className="h-6 max-w-full rounded-full border border-strong bg-surface-1 px-2 text-[12px] font-medium text-secondary outline-none"
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

                <div className="flex min-w-0 items-center gap-1.5 px-3 text-tertiary">
                  <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.8} />
                  <input
                    type="date"
                    className="h-8 min-w-[110px] flex-1 rounded-md border border-transparent bg-transparent px-1 text-[13px] text-tertiary outline-none transition-colors hover:border-strong focus:border-strong focus:bg-surface-1"
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
                      className="inline-flex h-6 max-w-full items-center gap-1 rounded-full border border-strong bg-canvas px-2 text-[12px] font-medium text-tertiary transition-colors hover:bg-surface-3"
                      onClick={() => toggleTag(item, tag)}
                      title="Remove tag"
                    >
                      <Tag className="h-3 w-3 flex-shrink-0" strokeWidth={1.8} />
                      <span className="truncate">{tag}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    className="inline-flex h-6 items-center rounded-full border border-strong bg-surface-1 px-2 text-[12px] font-medium text-tertiary transition-colors hover:bg-surface-3 hover:text-secondary"
                    onClick={(event) => {
                      tagMenuTriggerRef.current = event.currentTarget;
                      setActiveTagMenuId(activeTagMenuId === item.id ? undefined : item.id);
                    }}
                  >
                    <Plus className="h-3 w-3" strokeWidth={2} />
                  </button>
                  <RowMenu
                    align="left"
                    isOpen={activeTagMenuId === item.id}
                    onClose={() => setActiveTagMenuId(undefined)}
                    triggerRef={tagMenuTriggerRef}
                    width={144}
                  >
                    {TAG_OPTIONS.map((tag) => (
                      <MenuButton
                        key={tag}
                        active={item.tags.includes(tag)}
                        onClick={() => {
                          toggleTag(item, tag);
                          setActiveTagMenuId(undefined);
                        }}
                      >
                        {tag}
                      </MenuButton>
                    ))}
                  </RowMenu>
                </div>

                <div className="relative flex justify-center">
                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center rounded-md text-tertiary transition-colors hover:bg-surface-3 hover:text-primary"
                    aria-label={`Actions for ${item.name}`}
                    onClick={(event) => {
                      actionMenuTriggerRef.current = event.currentTarget;
                      setActiveActionId(activeActionId === item.id ? undefined : item.id);
                    }}
                  >
                    <MoreHorizontal className="h-4 w-4" strokeWidth={1.8} />
                  </button>
                  <RowMenu
                    align="right"
                    isOpen={activeActionId === item.id}
                    onClose={() => setActiveActionId(undefined)}
                    triggerRef={actionMenuTriggerRef}
                    width={160}
                  >
                    <MenuButton
                      onClick={() => {
                        toggleTask(item.id);
                        setActiveActionId(undefined);
                      }}
                    >
                      {item.status === "Done" ? "Mark To Do" : "Mark Done"}
                    </MenuButton>
                    <MenuButton onClick={() => duplicateTask(item)}>
                      <Copy className="h-3.5 w-3.5" strokeWidth={1.8} />
                      Duplicate
                    </MenuButton>
                    <MenuButton
                      onClick={() => {
                        updateTask(item.id, { dueDate: "" });
                        setActiveActionId(undefined);
                      }}
                    >
                      Clear due date
                    </MenuButton>
                    <MenuButton tone="danger" onClick={() => deleteTask(item.id)}>
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                      Delete
                    </MenuButton>
                  </RowMenu>
                </div>
              </div>
            ))}

            <button
              type="button"
              className="flex min-h-[52px] min-w-[950px] items-center gap-2 px-3 text-left text-[13px] font-medium text-tertiary transition-colors hover:bg-canvas hover:text-primary"
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

function RowMenu({
  align = "left",
  children,
  isOpen,
  onClose,
  triggerRef,
  width = 160,
}: {
  align?: "left" | "right";
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  triggerRef: MutableRefObject<HTMLButtonElement | null>;
  width?: number;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, triggerRef]);

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      const triggerRect = triggerRef.current?.getBoundingClientRect();
      if (!triggerRect) return;

      const margin = 12;
      const gap = 6;
      const panelHeight = panelRef.current?.offsetHeight ?? 200;
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      const openUpward = spaceBelow < panelHeight + margin && triggerRect.top > panelHeight + margin;

      const left =
        align === "right"
          ? Math.min(Math.max(margin, triggerRect.right - width), window.innerWidth - width - margin)
          : Math.min(Math.max(margin, triggerRect.left), window.innerWidth - width - margin);
      const top = openUpward
        ? Math.max(margin, triggerRect.top - panelHeight - gap)
        : Math.min(triggerRect.bottom + gap, window.innerHeight - panelHeight - margin);

      setPanelStyle({ position: "fixed", left, top, width, zIndex: 50 });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [align, isOpen, triggerRef, width]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      className="rounded-lg border border-strong bg-surface-1 p-1 shadow-lg"
      style={panelStyle}
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </div>,
    document.body
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
            "absolute top-11 z-30 w-40 rounded-lg border border-strong bg-surface-1 p-1",
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
        active ? "bg-layer-1-active text-primary" : "text-secondary hover:bg-surface-3",
        tone === "danger" && "text-secondary"
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
          ? "border-accent-strong bg-accent-primary text-on-color hover:bg-accent-primary/80"
          : "border-strong bg-surface-1 text-secondary hover:bg-surface-3"
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
