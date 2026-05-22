/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import useSWR, { mutate } from "swr";
// plane imports
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { IWorkspaceMemberInvitation } from "@plane/types";
import { getFileURL } from "@plane/utils";
import { USER_WORKSPACES_LIST } from "@/constants/fetch-keys";
// hooks
import { useWorkspace } from "@/hooks/store/use-workspace";
import { useUserProfile } from "@/hooks/store/user";
import { useAppRouter } from "@/hooks/use-app-router";
// services
import { AuthenticationWrapper } from "@/lib/wrappers/authentication-wrapper";
// plane web services
import { WorkspaceService } from "@/services/workspace.service";

const workspaceService = new WorkspaceService();
const USER_WORKSPACE_INVITATIONS_KEY = "USER_WORKSPACE_INVITATIONS";

type TProcessingInvitation = {
  action: "accept" | "decline";
  id: string;
};

type TInviteUserSummary = {
  display_name?: string | null;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
};

type TWorkspaceInvitationDisplay = IWorkspaceMemberInvitation & {
  created_at?: Date | string | null;
  created_by?: string | TInviteUserSummary | null;
  created_by_detail?: TInviteUserSummary | null;
  created_by_email?: string | null;
  created_by_name?: string | null;
  invited_by?: string | TInviteUserSummary | null;
  invited_by_detail?: TInviteUserSummary | null;
  inviter?: string | TInviteUserSummary | null;
  inviter_email?: string | null;
  inviter_name?: string | null;
  updated_at?: Date | string | null;
};

const isUuidLike = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const getWorkspaceInitials = (name: string | undefined) => {
  if (!name) return "?";

  const words = name
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  return (words.length > 1 ? `${words[0][0]}${words[1][0]}` : words[0]?.slice(0, 2) || "?").toUpperCase();
};

const getUserSummaryName = (user: TInviteUserSummary | undefined | null) => {
  if (!user) return undefined;

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return user.display_name || user.name || fullName || undefined;
};

const getStringUserDetails = (value: string | null | undefined) => {
  if (!value || isUuidLike(value)) return {};
  if (value.includes("@")) return { email: value };

  return { name: value };
};

const getInviterDetails = (invitation: IWorkspaceMemberInvitation) => {
  const invite = invitation as TWorkspaceInvitationDisplay;
  const candidates = [
    invite.invited_by_detail,
    invite.inviter,
    invite.invited_by,
    invite.created_by_detail,
    invite.created_by,
  ];
  let name = invite.inviter_name || invite.created_by_name || undefined;
  let email = invite.inviter_email || invite.created_by_email || undefined;

  for (const candidate of candidates) {
    if (!candidate) continue;

    if (typeof candidate === "string") {
      const details = getStringUserDetails(candidate);
      name ||= details.name;
      email ||= details.email;
    } else {
      name ||= getUserSummaryName(candidate);
      email ||= candidate.email || undefined;
    }

    if (name && email) break;
  }

  return { email, name };
};

const getInvitationDate = (invitation: IWorkspaceMemberInvitation) => {
  const invite = invitation as TWorkspaceInvitationDisplay;
  const dateValue = invite.created_at || invite.updated_at;

  if (!dateValue) return undefined;

  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return undefined;

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
};

function InvitationLineArt() {
  return (
    <svg
      aria-hidden="true"
      className="h-32 w-40 text-[#6b7280]"
      fill="none"
      viewBox="0 0 180 140"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M40 62h100v58H40V62Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m41 64 49 34 49-34" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m42 118 38-32m58 32-38-32" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M70 24h40v60H70V24Z" fill="#fff" stroke="currentColor" />
      <circle cx="90" cy="46" r="9" stroke="currentColor" />
      <path d="M76 70c4-9 24-9 28 0" stroke="currentColor" strokeLinecap="round" />
      <path d="M75 91c-15 11-28 17-42 17" stroke="currentColor" strokeDasharray="4 6" strokeLinecap="round" />
      <path d="M121 80c15-7 25-17 31-32" stroke="currentColor" strokeDasharray="4 6" strokeLinecap="round" />
      <path d="m151 48 12-16-22 7 10 9Z" stroke="currentColor" strokeLinejoin="round" />
      <path d="m31 108-14-10 22-4-8 14Z" stroke="currentColor" strokeLinejoin="round" />
    </svg>
  );
}

function UserInvitationsPage() {
  // states
  const [processingInvitation, setProcessingInvitation] = useState<TProcessingInvitation | null>(null);
  // router
  const router = useAppRouter();
  // store hooks
  const { updateUserProfile } = useUserProfile();
  const { fetchWorkspaces } = useWorkspace();

  const {
    data: invitations,
    isLoading: isInvitationsLoading,
    mutate: mutateInvitations,
  } = useSWR(USER_WORKSPACE_INVITATIONS_KEY, () => workspaceService.userWorkspaceInvitations());

  const handleAcceptInvitation = async (invitation: IWorkspaceMemberInvitation) => {
    setProcessingInvitation({ action: "accept", id: invitation.id });

    try {
      await workspaceService.joinWorkspaces({ invitations: [invitation.id] });
      await mutate(USER_WORKSPACES_LIST);
      await updateUserProfile({ last_workspace_id: invitation.workspace.id });
      await fetchWorkspaces();
      router.push(`/${invitation.workspace.slug}`);
    } catch (_err) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Error",
        message: "Something went wrong. Please try again.",
      });
      setProcessingInvitation(null);
    }
  };

  const handleDeclineInvitation = async (invitation: IWorkspaceMemberInvitation) => {
    setProcessingInvitation({ action: "decline", id: invitation.id });

    try {
      await workspaceService.joinWorkspace(invitation.workspace.slug, invitation.id, {
        accepted: false,
        token: invitation.token,
      });
      await mutateInvitations(
        (currentInvitations) =>
          currentInvitations?.filter((currentInvitation) => currentInvitation.id !== invitation.id),
        { revalidate: false }
      );
      setProcessingInvitation(null);
    } catch (_err) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Error",
        message: "Something went wrong. Please try again.",
      });
      setProcessingInvitation(null);
    }
  };

  return (
    <AuthenticationWrapper>
      <main className="min-h-screen w-full overflow-y-auto bg-white text-[#111827]">
        <section className="mx-auto flex min-h-screen w-full max-w-[1520px] flex-col px-6 py-10 sm:px-10 lg:px-12">
          <h1 className="text-2xl tracking-normal font-semibold text-[#111827]">Invitations</h1>

          {isInvitationsLoading ? (
            <div className="mt-14 w-full max-w-[1240px]">
              <div className="mb-7 space-y-2">
                <div className="h-5 w-52 rounded bg-[#f0f1f2]" />
                <div className="h-4 w-72 rounded bg-[#f5f5f4]" />
              </div>
              <div className="overflow-hidden rounded-lg border border-[#d8dee4] bg-white">
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className="grid min-h-[96px] grid-cols-[minmax(0,1fr)_180px_260px] items-center gap-8 border-b border-[#eceff3] px-7 py-5 last:border-b-0"
                  >
                    <div className="flex items-center gap-5">
                      <div className="h-12 w-12 rounded-lg bg-[#f1f2f3]" />
                      <div className="space-y-2">
                        <div className="h-4 w-44 rounded bg-[#f0f1f2]" />
                        <div className="h-3 w-64 rounded bg-[#f5f5f4]" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 w-20 rounded bg-[#f5f5f4]" />
                      <div className="h-4 w-28 rounded bg-[#f0f1f2]" />
                    </div>
                    <div className="flex justify-end gap-4">
                      <div className="h-10 w-28 rounded-lg bg-[#f5f5f4]" />
                      <div className="h-10 w-28 rounded-lg bg-[#e5e7eb]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : invitations && invitations.length > 0 ? (
            <div className="mt-14 w-full max-w-[1240px]">
              <div className="mb-7">
                <h2 className="text-lg tracking-normal font-semibold text-[#111827]">
                  Pending invitations ({invitations.length})
                </h2>
                <p className="text-base font-normal mt-3 leading-6 text-[#5f6b7a]">
                  Invitations to workspaces you can join.
                </p>
              </div>

              <div className="overflow-hidden rounded-lg border border-[#d8dee4] bg-white">
                {invitations.map((invitation) => {
                  const inviteDate = getInvitationDate(invitation);
                  const inviter = getInviterDetails(invitation);
                  const inviterLabel = inviter.name || inviter.email;
                  const isAccepting =
                    processingInvitation?.id === invitation.id && processingInvitation.action === "accept";
                  const isDeclining =
                    processingInvitation?.id === invitation.id && processingInvitation.action === "decline";
                  const isProcessing = processingInvitation?.id === invitation.id;

                  return (
                    <div
                      key={invitation.id}
                      className="grid min-h-[96px] grid-cols-1 items-center gap-5 border-b border-[#eceff3] px-5 py-5 last:border-b-0 sm:px-7 lg:grid-cols-[minmax(0,1fr)_180px_260px] lg:gap-8"
                    >
                      <div className="flex min-w-0 items-center gap-5">
                        <div className="text-base grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#ebeef2] bg-[#f5f5f4] font-semibold text-[#111827]">
                          {invitation.workspace.logo_url ? (
                            <img
                              src={getFileURL(invitation.workspace.logo_url)}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            getWorkspaceInitials(invitation.workspace.name)
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base truncate leading-5 font-semibold text-[#111827]">
                            {invitation.workspace.name}
                          </h3>
                          {inviterLabel ? (
                            <>
                              <p className="text-sm mt-1 truncate leading-5 text-[#5f6b7a]">
                                Invited by {inviterLabel}
                              </p>
                              {inviter.email && inviter.email !== inviterLabel && (
                                <p className="text-sm truncate leading-5 text-[#5f6b7a]">{inviter.email}</p>
                              )}
                            </>
                          ) : (
                            <p className="text-sm mt-1 truncate leading-5 text-[#5f6b7a]">
                              Inviter details unavailable
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-sm leading-5 text-[#5f6b7a]">
                        {inviteDate && (
                          <>
                            <p>Invited on</p>
                            <p>{inviteDate}</p>
                          </>
                        )}
                      </div>

                      <div className="flex items-center justify-start gap-4 lg:justify-end">
                        <button
                          type="button"
                          onClick={() => handleDeclineInvitation(invitation)}
                          disabled={Boolean(processingInvitation)}
                          className="text-base inline-flex h-10 min-w-28 items-center justify-center rounded-lg border border-[#d8dee4] bg-white px-4 font-medium text-[#111827] shadow-none transition-colors hover:bg-[#f7f7f5] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isDeclining ? "Declining..." : "Decline"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAcceptInvitation(invitation)}
                          disabled={Boolean(processingInvitation)}
                          className="text-base inline-flex h-10 min-w-28 items-center justify-center rounded-lg border border-[#111827] bg-[#111827] px-4 font-medium text-white shadow-[0_6px_18px_rgba(17,24,39,0.14)] transition-colors hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isAccepting ? "Accepting..." : isProcessing ? "Accept" : "Accept"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center px-4 pt-20 pb-12">
              <div className="flex max-w-[460px] flex-col items-center text-center">
                <InvitationLineArt />
                <h2 className="text-xl tracking-normal mt-5 font-semibold text-[#111827]">No pending invites</h2>
                <p className="text-base mt-3 leading-6 text-[#5f6b7a]">
                  You&apos;ll see workspace invitations here when someone invites you.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="text-base mt-7 inline-flex h-11 items-center justify-center rounded-lg border border-[#d8dee4] bg-white px-5 font-medium text-[#111827] shadow-none transition-colors hover:bg-[#f7f7f5]"
                >
                  Back to home
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </AuthenticationWrapper>
  );
}

export default observer(UserInvitationsPage);
