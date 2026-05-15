/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { Mail, Send } from "lucide-react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// plane imports
import { ROLE, EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { TrashIcon, ChevronDownIcon } from "@plane/propel/icons";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { CustomSelect } from "@plane/ui";
import { copyTextToClipboard, renderFormattedDate } from "@plane/utils";
// components
import { ConfirmWorkspaceMemberRemove } from "@/components/workspace/confirm-workspace-member-remove";
// hooks
import { useMember } from "@/hooks/store/use-member";
import { useUserPermissions } from "@/hooks/store/user";

type Props = {
  invitationId: string;
};

export const WorkspaceInvitationsListItem = observer(function WorkspaceInvitationsListItem(props: Props) {
  const { invitationId } = props;
  // router
  const { workspaceSlug } = useParams();
  // states
  const [removeMemberModal, setRemoveMemberModal] = useState(false);
  // plane hooks
  const { t } = useTranslation();
  // store hooks
  const { allowPermissions, workspaceInfoBySlug } = useUserPermissions();
  const {
    workspace: { updateMemberInvitation, deleteMemberInvitation, getWorkspaceInvitationDetails },
  } = useMember();
  // derived values
  const invitationDetails = getWorkspaceInvitationDetails(invitationId);
  const currentWorkspaceMemberInfo = workspaceInfoBySlug(workspaceSlug.toString());
  const currentWorkspaceRole = currentWorkspaceMemberInfo?.role;
  // is the current logged in user admin
  const isAdmin = allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.WORKSPACE);
  // role change access-
  // 1. user cannot change their own role
  // 2. only admin or member can change role
  // 3. user cannot change role of higher role
  const hasRoleChangeAccess = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.WORKSPACE
  );

  const handleRemoveInvitation = async () => {
    try {
      if (!workspaceSlug || !invitationDetails) return;

      await deleteMemberInvitation(workspaceSlug.toString(), invitationDetails.id);
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: "Success!",
        message: "Invitation removed successfully.",
      });
    } catch (err: unknown) {
      const error = err as { error?: string };
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Error!",
        message: error?.error || "Something went wrong. Please try again.",
      });
    }
  };

  if (!invitationDetails || !currentWorkspaceMemberInfo) return null;

  const handleCopyText = async () => {
    try {
      const inviteLink = new URL(invitationDetails.invite_link, window.location.origin).href;
      await copyTextToClipboard(inviteLink);
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("common.link_copied"),
        message: t("entity.link_copied_to_clipboard", { entity: t("common.invite") }),
      });
    } catch (error) {
      console.error("Error generating invite link:", error);
    }
  };
  const invitationSentAt = (invitationDetails as { created_at?: string | Date }).created_at;

  return (
    <>
      <ConfirmWorkspaceMemberRemove
        isOpen={removeMemberModal}
        onClose={() => setRemoveMemberModal(false)}
        userDetails={{
          id: invitationDetails.id,
          display_name: `${invitationDetails.email}`,
        }}
        onSubmit={handleRemoveInvitation}
      />
      <div className="flyers-soft-team-invite-row group">
        <div className="flyers-soft-team-invite-email-cell">
          <span className="flyers-soft-team-invite-avatar">
            <Mail className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <h4 className="cursor-default truncate text-13 font-medium text-primary">{invitationDetails.email}</h4>
            <p className="text-11 text-tertiary">Invitation sent</p>
          </div>
        </div>

        <CustomSelect
          customButton={
            <div className="flyers-soft-team-invite-role">
              <span className={hasRoleChangeAccess ? "" : "text-placeholder"}>{ROLE[invitationDetails.role]}</span>
              {hasRoleChangeAccess && <ChevronDownIcon className="h-3 w-3" />}
            </div>
          }
          value={invitationDetails.role}
          onChange={(value: EUserPermissions) => {
            if (!workspaceSlug || !value) return;

            updateMemberInvitation(workspaceSlug.toString(), invitationDetails.id, {
              role: value,
            }).catch((err: unknown) => {
              const error = err as { error?: string };
              setToast({
                type: TOAST_TYPE.ERROR,
                title: "Error!",
                message: error?.error || "An error occurred while updating member role. Please try again.",
              });
            });
          }}
          disabled={!hasRoleChangeAccess}
          placement="bottom-end"
        >
          {Object.keys(ROLE).map((key) => {
            if (
              currentWorkspaceRole &&
              Number(currentWorkspaceRole) !== 20 &&
              Number(currentWorkspaceRole) < parseInt(key)
            )
              return null;

            return (
              <CustomSelect.Option key={key} value={parseInt(key, 10)}>
                <>{ROLE[parseInt(key) as keyof typeof ROLE]}</>
              </CustomSelect.Option>
            );
          })}
        </CustomSelect>

        <div className="flyers-soft-team-pending-badge">
          <span>{t("common.pending")}</span>
        </div>

        <div className="flyers-soft-team-invite-date">
          {invitationSentAt ? renderFormattedDate(invitationSentAt) : "-"}
        </div>

        <div className="flyers-soft-team-invite-actions">
          {invitationDetails.invite_link && (
            <button type="button" title={t("common.actions.copy_link")} onClick={() => void handleCopyText()}>
              <Send className="h-3.5 w-3.5" />
            </button>
          )}
          {isAdmin && (
            <button type="button" title={t("common.remove")} onClick={() => setRemoveMemberModal(true)}>
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </>
  );
});
