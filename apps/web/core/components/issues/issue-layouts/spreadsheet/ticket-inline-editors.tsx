/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowUp, CheckCircle2, ChevronDown, Minus } from "lucide-react";
import { ISSUE_PRIORITIES } from "@plane/constants";
import type { IState, IUserLite, TIssuePriorities } from "@plane/types";
import { Avatar } from "@plane/ui";
import { cn, getFileURL } from "@plane/utils";

// Shared inline Status/Priority/Assignee editors used by the Tickets table
// (all-tickets-page-view.tsx) and reused as-is by the Drafts table so both
// get identical popup positioning, theme-correct pill styling, and
// close-on-select behavior.

export type InlineMenuField = "status" | "priority" | "assignee";

export const PRIORITY_ORDER: TIssuePriorities[] = ["none", "low", "medium", "high", "urgent"];
const STATUS_ORDER = ["todo", "in progress", "in review", "done", "blocked"];

export function getStateAccent(state: IState | undefined) {
  const name = state?.name?.toLowerCase() ?? "";
  const group = state?.group;

  if (name.includes("review")) return "#6b7280";
  if (group === "completed") return "#6b7280";
  if (group === "started") return "#6b7280";
  if (group === "cancelled" || name.includes("blocked")) return "#6b7280";
  return "#6b7280";
}

export function getPriorityTone(priority: TIssuePriorities | null | undefined) {
  switch (priority) {
    case "urgent":
    case "high":
      return {
        className: "text-tertiary",
        icon: ArrowUp,
        label: priority,
      };
    case "medium":
      return {
        className: "text-tertiary",
        icon: Minus,
        label: priority,
      };
    case "low":
      return {
        className: "text-tertiary",
        icon: ArrowDown,
        label: priority,
      };
    default:
      return {
        className: "text-tertiary",
        icon: Minus,
        label: "None",
      };
  }
}

export function getStateOrderIndex(state: IState) {
  const name = state.name.toLowerCase();
  const orderIndex = STATUS_ORDER.findIndex((status) => name === status || name.includes(status));

  return orderIndex === -1 ? STATUS_ORDER.length : orderIndex;
}

export function InlineDropdownMenu({
  children,
  disabled,
  isOpen,
  menuWidth = 190,
  onClose,
  onOpen,
  trigger,
}: {
  children: ReactNode;
  disabled: boolean;
  isOpen: boolean;
  menuWidth?: number;
  onClose: () => void;
  onOpen: () => void;
  trigger: ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !panelRef.current?.contains(target)) onClose();
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
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      const triggerRect = triggerRef.current?.getBoundingClientRect();
      if (!triggerRect) return;

      const left = Math.min(Math.max(12, triggerRect.left), window.innerWidth - menuWidth - 12);
      const top = Math.min(triggerRect.bottom + 6, window.innerHeight - 260);

      setPanelStyle({
        left,
        minWidth: Math.max(triggerRect.width, 148),
        top: Math.max(12, top),
        width: menuWidth,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, menuWidth]);

  return (
    <div ref={menuRef} className="flyers-soft-inline-menu">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-expanded={isOpen}
        className="flyers-soft-inline-trigger"
        onClick={(event) => {
          event.stopPropagation();
          if (disabled) return;
          isOpen ? onClose() : onOpen();
        }}
      >
        {trigger}
      </button>
      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            className="flyers-soft-inline-menu-panel"
            style={panelStyle}
            onClick={(event) => event.stopPropagation()}
          >
            {children}
          </div>,
          document.body
        )}
    </div>
  );
}

export function InlineStatusEditor({
  disabled,
  isOpen,
  onChange,
  onClose,
  onOpen,
  selectedStateId,
  state,
  states,
}: {
  disabled: boolean;
  isOpen: boolean;
  onChange: (stateId: string) => void;
  onClose: () => void;
  onOpen: () => void;
  selectedStateId: string | null | undefined;
  state: IState | undefined;
  states: IState[];
}) {
  const statusStyle = { "--flyers-status-color": getStateAccent(state) } as CSSProperties;

  return (
    <div className="flyers-soft-inline-field min-w-0">
      <InlineDropdownMenu
        disabled={disabled}
        isOpen={isOpen}
        menuWidth={190}
        onClose={onClose}
        onOpen={onOpen}
        trigger={
          <span
            className={cn(
              "flyers-soft-status-pill inline-flex max-w-full items-center gap-2",
              disabled && "cursor-not-allowed opacity-70"
            )}
            style={statusStyle}
          >
            <span className="min-w-0 truncate">{state?.name ?? "No status"}</span>
            {!disabled && <ChevronDown className="size-3.5 flex-shrink-0 opacity-70" />}
          </span>
        }
      >
        {states.length ? (
          states.map((stateOption) => {
            const isSelected = stateOption.id === selectedStateId;

            return (
              <button
                key={stateOption.id}
                type="button"
                className="flyers-soft-inline-menu-option"
                data-selected={isSelected ? "true" : undefined}
                onClick={() => onChange(stateOption.id)}
              >
                <span
                  className="size-2.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: getStateAccent(stateOption) }}
                />
                <span className="min-w-0 flex-1 truncate text-left">{stateOption.name}</span>
                {isSelected && <CheckCircle2 className="size-3.5 flex-shrink-0 text-tertiary" strokeWidth={2.4} />}
              </button>
            );
          })
        ) : (
          <span className="block px-3 py-2 text-13 text-tertiary">No statuses found</span>
        )}
      </InlineDropdownMenu>
    </div>
  );
}

export function InlinePriorityEditor({
  disabled,
  isOpen,
  onChange,
  onClose,
  onOpen,
  PriorityToneIcon,
  priorityTone,
  selectedPriority,
}: {
  disabled: boolean;
  isOpen: boolean;
  onChange: (priority: TIssuePriorities) => void;
  onClose: () => void;
  onOpen: () => void;
  PriorityToneIcon: typeof ArrowUp;
  priorityTone: ReturnType<typeof getPriorityTone>;
  selectedPriority: TIssuePriorities | null | undefined;
}) {
  const priorityKey = `${selectedPriority ?? "none"}`.toLowerCase();
  const priorityOptions = PRIORITY_ORDER.map((priority) => {
    const priorityDetails = ISSUE_PRIORITIES.find((item) => item.key === priority);
    return { key: priority, title: priorityDetails?.title ?? priority };
  });

  return (
    <div className="flyers-soft-inline-field min-w-0">
      <InlineDropdownMenu
        disabled={disabled}
        isOpen={isOpen}
        menuWidth={190}
        onClose={onClose}
        onOpen={onOpen}
        trigger={
          <span
            className={cn(
              "flyers-soft-priority-pill inline-flex max-w-full items-center gap-2 capitalize",
              `flyers-soft-priority-${priorityKey}`,
              disabled && "cursor-not-allowed opacity-70"
            )}
          >
            <PriorityToneIcon className={cn("size-3.5 flex-shrink-0", priorityTone.className)} strokeWidth={2.2} />
            <span className="min-w-0 truncate">{priorityTone.label}</span>
            {!disabled && <ChevronDown className="size-3.5 flex-shrink-0 opacity-70" />}
          </span>
        }
      >
        {priorityOptions.map((priority) => {
          const optionTone = getPriorityTone(priority.key);
          const OptionIcon = optionTone.icon;
          const isSelected = priority.key === (selectedPriority ?? "none");

          return (
            <button
              key={priority.key}
              type="button"
              className="flyers-soft-inline-menu-option"
              data-selected={isSelected ? "true" : undefined}
              onClick={() => onChange(priority.key)}
            >
              <OptionIcon className={cn("size-3.5 flex-shrink-0", optionTone.className)} strokeWidth={2.2} />
              <span className="min-w-0 flex-1 truncate text-left">{priority.title}</span>
              {isSelected && <CheckCircle2 className="size-3.5 flex-shrink-0 text-tertiary" strokeWidth={2.4} />}
            </button>
          );
        })}
      </InlineDropdownMenu>
    </div>
  );
}

export function InlineAssigneeEditor({
  assignee,
  disabled,
  getUserDetails,
  isOpen,
  memberIds,
  onChange,
  onClose,
  onOpen,
  selectedAssigneeId,
}: {
  assignee: IUserLite | undefined;
  disabled: boolean;
  getUserDetails: (userId: string) => IUserLite | undefined;
  isOpen: boolean;
  memberIds: string[] | undefined;
  onChange: (assigneeIds: string[]) => void;
  onClose: () => void;
  onOpen: () => void;
  selectedAssigneeId: string | undefined;
}) {
  const [query, setQuery] = useState("");
  const members = (memberIds ?? [])
    .map((memberId) => getUserDetails(memberId))
    .filter((member): member is IUserLite => !!member);
  const filteredMembers = members.filter((member) => {
    const searchableText = `${member.display_name} ${member.first_name} ${member.last_name} ${member.email ?? ""}`;
    return searchableText.toLowerCase().includes(query.trim().toLowerCase());
  });

  useEffect(() => {
    if (!isOpen) setQuery("");
  }, [isOpen]);

  return (
    <div className="flyers-soft-inline-field min-w-0">
      <InlineDropdownMenu
        disabled={disabled}
        isOpen={isOpen}
        menuWidth={240}
        onClose={onClose}
        onOpen={onOpen}
        trigger={
          <span
            className={cn(
              "flyers-soft-assignee-pill inline-flex max-w-full items-center gap-2 rounded-full border border-strong bg-surface-1 px-2 py-1 text-13 font-medium text-secondary",
              disabled && "cursor-not-allowed opacity-70"
            )}
          >
            {assignee ? (
              <>
                <Avatar
                  name={assignee.display_name}
                  src={getFileURL(assignee.avatar_url ?? "")}
                  size={20}
                  shape="circle"
                  className="flex-shrink-0"
                />
                <span className="min-w-0 truncate">{assignee.display_name}</span>
              </>
            ) : (
              <>
                <span className="size-5 flex-shrink-0 rounded-full border border-dashed border-strong" />
                <span className="min-w-0 truncate text-tertiary">Unassigned</span>
              </>
            )}
            {!disabled && <ChevronDown className="size-3.5 flex-shrink-0 text-tertiary" />}
          </span>
        }
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search members..."
          className="flyers-soft-inline-menu-search"
          onClick={(e) => e.stopPropagation()}
        />
        <button
          type="button"
          className="flyers-soft-inline-menu-option"
          data-selected={!selectedAssigneeId ? "true" : undefined}
          onClick={() => onChange([])}
        >
          <span className="size-5 flex-shrink-0 rounded-full border border-dashed border-strong" />
          <span className="min-w-0 flex-1 truncate text-left">Unassigned</span>
          {!selectedAssigneeId && <CheckCircle2 className="size-3.5 flex-shrink-0 text-tertiary" strokeWidth={2.4} />}
        </button>
        {filteredMembers.length ? (
          filteredMembers.map((member) => {
            const isSelected = member.id === selectedAssigneeId;

            return (
              <button
                key={member.id}
                type="button"
                className="flyers-soft-inline-menu-option"
                data-selected={isSelected ? "true" : undefined}
                onClick={() => onChange([member.id])}
              >
                <Avatar
                  name={member.display_name}
                  src={getFileURL(member.avatar_url ?? "")}
                  size={20}
                  shape="circle"
                  className="flex-shrink-0"
                />
                <span className="min-w-0 flex-1 truncate text-left">{member.display_name}</span>
                {isSelected && <CheckCircle2 className="size-3.5 flex-shrink-0 text-tertiary" strokeWidth={2.4} />}
              </button>
            );
          })
        ) : (
          <span className="block px-3 py-2 text-13 text-tertiary">No members found</span>
        )}
      </InlineDropdownMenu>
    </div>
  );
}
