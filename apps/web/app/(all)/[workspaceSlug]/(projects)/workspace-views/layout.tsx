/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Outlet } from "react-router";
import { useParams } from "next/navigation";
import { AppHeader } from "@/components/core/app-header";
import { ContentWrapper } from "@/components/core/content-wrapper";
import { GlobalIssuesHeader } from "./header";

export default function GlobalIssuesLayout() {
  const { globalViewId } = useParams();
  const isAllIssues = globalViewId?.toString() === "all-issues";
  const isAssignedView = globalViewId?.toString() === "assigned";

  return (
    <>
      {!isAllIssues && !isAssignedView && <AppHeader header={<GlobalIssuesHeader />} />}
      <ContentWrapper className={isAssignedView ? "flyers-soft-projects-list-scroll" : undefined}>
        <Outlet />
      </ContentWrapper>
    </>
  );
}
