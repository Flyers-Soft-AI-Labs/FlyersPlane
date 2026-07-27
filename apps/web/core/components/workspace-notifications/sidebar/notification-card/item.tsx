/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import { Clock } from "lucide-react";
// plane imports
import { Avatar } from "@plane/ui";
import { cn, calculateTimeAgo, renderFormattedDate, renderFormattedTime, getFileURL } from "@plane/utils";
// hooks
import { useWorkspaceNotifications } from "@/hooks/store/notifications";
import { useNotification } from "@/hooks/store/notifications/use-notification";
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useWorkspace } from "@/hooks/store/use-workspace";
// local imports
import { NotificationContent } from "./content";
import { NotificationOption } from "./options";

type TNotificationItem = {
  workspaceSlug: string;
  notificationId: string;
};

export const NotificationItem = observer(function NotificationItem(props: TNotificationItem) {
  const { workspaceSlug, notificationId } = props;
  // hooks
  const { currentSelectedNotificationId, setCurrentSelectedNotificationId } = useWorkspaceNotifications();
  const { asJson: notification, markNotificationAsRead } = useNotification(notificationId);
  const { getIsIssuePeeked, setPeekIssue } = useIssueDetail();
  const { getWorkspaceBySlug } = useWorkspace();
  // states
  const [isSnoozeStateModalOpen, setIsSnoozeStateModalOpen] = useState(false);
  const [customSnoozeModal, setCustomSnoozeModal] = useState(false);

  // derived values
  const projectId = notification?.project || undefined;
  const issueId = notification?.data?.issue?.id || undefined;
  const workspace = getWorkspaceBySlug(workspaceSlug);

  const notificationField = notification?.data?.issue_activity.field || undefined;
  const notificationTriggeredBy = notification.triggered_by_details || undefined;

  const handleNotificationIssuePeekOverview = async () => {
    if (workspaceSlug && projectId && issueId && !isSnoozeStateModalOpen && !customSnoozeModal) {
      setPeekIssue(undefined);
      setCurrentSelectedNotificationId(notificationId);

      // make the notification as read
      if (notification.read_at === null) {
        try {
          await markNotificationAsRead(workspaceSlug);
        } catch (error) {
          console.error(error);
        }
      }

      if (notification?.is_inbox_issue === false) {
        if (!getIsIssuePeeked(issueId)) {
          setPeekIssue({ workspaceSlug, projectId, issueId });
        }
      }
    }
  };

  if (!workspaceSlug || !notificationId || !notification?.id || !notificationField || !workspace?.id || !projectId)
    return <></>;

  return (
    <div
      className={cn("flyers-soft-notification-row group relative border-b border-subtle transition-colors", {
        "flyers-soft-notification-row-selected": currentSelectedNotificationId === notification?.id,
        "flyers-soft-notification-row-unread": notification.read_at === null,
      })}
    >
      <button
        type="button"
        className="relative flex w-full cursor-pointer items-center gap-3 bg-transparent px-8 py-3.5 text-left outline-none"
        onClick={handleNotificationIssuePeekOverview}
      >
        <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#f1f1ef]">
          {notificationTriggeredBy && (
            <Avatar
              name={notificationTriggeredBy.display_name || notificationTriggeredBy?.first_name}
              src={getFileURL(notificationTriggeredBy.avatar_url)}
              size={34}
              shape="circle"
              className="bg-[#f1f1ef] text-13 font-medium text-primary"
            />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="relative flex min-h-5 items-start gap-3">
            <div className="line-clamp-1 min-w-0 flex-1 truncate overflow-hidden text-13 leading-5 font-medium break-all whitespace-normal text-primary">
              <NotificationContent
                notification={notification}
                workspaceId={workspace.id}
                workspaceSlug={workspaceSlug}
                projectId={projectId}
              />
            </div>
          </div>

          <div className="relative flex items-center gap-3 text-13 leading-5 text-secondary">
            <div className="line-clamp-1 min-w-0 flex-1 truncate overflow-hidden break-words whitespace-normal">
              {notification?.data?.issue?.identifier}-{notification?.data?.issue?.sequence_id}&nbsp;
              {notification?.data?.issue?.name}
            </div>
            <div className="flex flex-shrink-0 items-center gap-3">
              {notification?.snoozed_till ? (
                <p className="flex flex-shrink-0 items-center justify-end gap-x-1 text-tertiary">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    Till {renderFormattedDate(notification.snoozed_till)},&nbsp;
                    {renderFormattedTime(notification.snoozed_till, "12-hour")}
                  </span>
                </p>
              ) : (
                <p className="mt-auto flex-shrink-0 text-tertiary">
                  {notification.created_at && calculateTimeAgo(notification.created_at)}
                </p>
              )}
              {notification.read_at === null && (
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#5b3cc4]" aria-label="Unread" />
              )}
            </div>
          </div>
        </div>
      </button>
      <div className="flyers-soft-notification-row-actions absolute top-3 right-8 z-[1]">
        <NotificationOption
          workspaceSlug={workspaceSlug}
          notificationId={notification?.id}
          isSnoozeStateModalOpen={isSnoozeStateModalOpen}
          setIsSnoozeStateModalOpen={setIsSnoozeStateModalOpen}
          customSnoozeModal={customSnoozeModal}
          setCustomSnoozeModal={setCustomSnoozeModal}
        />
      </div>
    </div>
  );
});
