/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";

import { MoreHorizontal } from "lucide-react";
// plane imports
import { ROLE, EUserPermissions, EUserPermissionsLevel, MEMBER_TRACKER_ELEMENTS } from "@plane/constants";
import { TrashIcon, SuspendedUserIcon } from "@plane/propel/icons";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { IUser, IWorkspaceMember } from "@plane/types";
// plane ui
import { CustomSelect, PopoverMenu } from "@plane/ui";
// helpers
import { cn, getFileURL } from "@plane/utils";
// hooks
import { useMember } from "@/hooks/store/use-member";
import { useUser, useUserPermissions } from "@/hooks/store/user";

export interface RowData {
  member: IWorkspaceMember;
  role: EUserPermissions;
  is_active: boolean;
}

type NameProps = {
  rowData: RowData;
  workspaceSlug: string;
};

type MemberActionsProps = {
  rowData: RowData;
  isAdmin: boolean;
  currentUser: IUser | undefined;
  setRemoveMemberModal: (rowData: RowData) => void;
};

type AccountTypeProps = {
  rowData: RowData;
  workspaceSlug: string;
};

export function NameColumn(props: NameProps) {
  const { rowData, workspaceSlug } = props;
  // derived values
  const { avatar_url, display_name, email, first_name, id, last_name } = rowData.member;
  const isSuspended = rowData.is_active === false;
  const fullName = `${first_name ?? ""} ${last_name ?? ""}`.trim() || display_name || email;

  return (
    <div className="flyers-soft-team-member-cell flex min-w-0 items-center gap-2.5">
      {isSuspended ? (
        <div className="flyers-soft-team-avatar rounded-full bg-layer-1">
          <SuspendedUserIcon className="size-6 text-placeholder" />
        </div>
      ) : avatar_url && avatar_url.trim() !== "" ? (
        <Link href={`/${workspaceSlug}/profile/${id}`}>
          <span className="flyers-soft-team-avatar relative flex size-7 items-center justify-center rounded-full text-on-color capitalize">
            <img
              src={getFileURL(avatar_url)}
              className="absolute top-0 left-0 h-full w-full rounded-full object-cover"
              alt={display_name || email}
            />
          </span>
        </Link>
      ) : (
        <Link href={`/${workspaceSlug}/profile/${id}`}>
          <span className="flyers-soft-team-avatar relative flex size-7 items-center justify-center rounded-full bg-layer-3 text-11 text-tertiary capitalize">
            {(email ?? display_name ?? "?")[0]}
          </span>
        </Link>
      )}
      <div className="min-w-0">
        <p className={cn("truncate text-13 font-medium text-primary", { "text-placeholder": isSuspended })}>
          {fullName}
        </p>
        {display_name && display_name !== fullName && (
          <p className="truncate text-11 text-tertiary">{display_name}</p>
        )}
      </div>
    </div>
  );
}

export function MemberStatusColumn({ rowData }: { rowData: RowData }) {
  const isSuspended = rowData.is_active === false;

  return (
    <span
      className={cn("flyers-soft-team-status-badge", {
        "flyers-soft-team-status-active": !isSuspended,
        "flyers-soft-team-status-suspended": isSuspended,
      })}
    >
      {isSuspended ? "Suspended" : "Active"}
    </span>
  );
}

export function MemberActionsColumn(props: MemberActionsProps) {
  const { rowData, isAdmin, currentUser, setRemoveMemberModal } = props;
  const { id } = rowData.member;
  const isSuspended = rowData.is_active === false;
  const canShowActions = !isSuspended && (isAdmin || id === currentUser?.id);

  if (!canShowActions) return <span className="flyers-soft-team-actions-empty">-</span>;

  return (
    <PopoverMenu
      data={["actions"]}
      keyExtractor={(item) => item}
      popoverClassName="justify-end"
      button={<MoreHorizontal className="size-4" />}
      buttonClassName="flyers-soft-team-actions-button outline-none size-7 aspect-square flex-shrink-0 grid place-items-center"
      render={() => (
        <div
          role="button"
          tabIndex={0}
          className="flex cursor-pointer items-center gap-x-3"
          onClick={() => setRemoveMemberModal(rowData)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setRemoveMemberModal(rowData);
            }
          }}
          data-ph-element={MEMBER_TRACKER_ELEMENTS.WORKSPACE_MEMBER_TABLE_CONTEXT_MENU}
        >
          <TrashIcon className="size-3.5 align-middle" /> {id === currentUser?.id ? "Leave" : "Remove"}
        </div>
      )}
    />
  );
}

export const AccountTypeColumn = observer(function AccountTypeColumn(props: AccountTypeProps) {
  const { rowData, workspaceSlug } = props;
  // form info
  const {
    control,
    formState: { errors },
  } = useForm();
  // store hooks
  const { allowPermissions } = useUserPermissions();

  const {
    workspace: { updateMember },
  } = useMember();
  const { data: currentUser } = useUser();

  // derived values
  const isCurrentUser = currentUser?.id === rowData.member.id;
  const isAdminRole = allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.WORKSPACE);
  const isRoleNonEditable = isCurrentUser || !isAdminRole;
  const isSuspended = rowData.is_active === false;

  return (
    <>
      {isSuspended || isRoleNonEditable ? (
        <div className={cn("flex w-32", { "text-placeholder": isSuspended })}>
          <span>{ROLE[rowData.role]}</span>
        </div>
      ) : (
        <Controller
          name="role"
          control={control}
          rules={{ required: "Role is required." }}
          render={({ field: { value } }) => (
            <CustomSelect
              value={value as EUserPermissions}
              onChange={async (value: EUserPermissions) => {
                if (!workspaceSlug) return;
                try {
                  await updateMember(workspaceSlug.toString(), rowData.member.id, {
                    role: value as unknown as EUserPermissions,
                  });
                } catch (err: unknown) {
                  const error = err as { error?: string | string[] };
                  const errorString = Array.isArray(error?.error) ? error.error[0] : error?.error;

                  setToast({
                    type: TOAST_TYPE.ERROR,
                    title: "Error!",
                    message: errorString ?? "An error occurred while updating member role. Please try again.",
                  });
                }
              }}
              label={
                <div className="flex">
                  <span>{ROLE[rowData.role]}</span>
                </div>
              }
              buttonClassName={`!px-0 !justify-start hover:bg-surface-1 ${errors.role ? "border-danger-strong" : "border-none"}`}
              className="w-32 rounded-md p-0"
              input
            >
              {Object.keys(ROLE).map((item) => (
                <CustomSelect.Option key={item} value={item as unknown as EUserPermissions}>
                  {ROLE[item as unknown as keyof typeof ROLE]}
                </CustomSelect.Option>
              ))}
            </CustomSelect>
          )}
        />
      )}
    </>
  );
});
