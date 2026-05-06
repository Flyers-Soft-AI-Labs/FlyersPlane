/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { useParams } from "next/navigation";
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import type { RowData } from "@/components/workspace/settings/member-columns";
import {
  AccountTypeColumn,
  MemberActionsColumn,
  MemberStatusColumn,
  NameColumn,
} from "@/components/workspace/settings/member-columns";
import { useUser, useUserPermissions } from "@/hooks/store/user";

export const useMemberColumns = () => {
  // states
  const [removeMemberModal, setRemoveMemberModal] = useState<RowData | null>(null);

  const { workspaceSlug } = useParams();

  const { data: currentUser } = useUser();
  const { allowPermissions } = useUserPermissions();
  // derived values
  const isAdmin = allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.WORKSPACE);

  const columns = [
    {
      key: "Member",
      content: "Member",
      tdRender: (rowData: RowData) => (
        <NameColumn
          rowData={rowData}
          workspaceSlug={workspaceSlug}
        />
      ),
    },
    {
      key: "Email",
      content: "Email",
      tdRender: (rowData: RowData) => (
        <div className={`flyers-soft-teams-email truncate ${rowData.is_active === false ? "text-placeholder" : ""}`}>
          {rowData.member.email}
        </div>
      ),
    },
    {
      key: "Role",
      content: "Role",
      tdRender: (rowData: RowData) => <AccountTypeColumn rowData={rowData} workspaceSlug={workspaceSlug} />,
    },
    {
      key: "Status",
      content: "Status",
      tdRender: (rowData: RowData) => <MemberStatusColumn rowData={rowData} />,
    },
    {
      key: "Actions",
      content: "Actions",
      tdRender: (rowData: RowData) => (
        <MemberActionsColumn
          rowData={rowData}
          isAdmin={isAdmin}
          currentUser={currentUser}
          setRemoveMemberModal={setRemoveMemberModal}
        />
      ),
    },
  ];
  return { columns, workspaceSlug, removeMemberModal, setRemoveMemberModal };
};
