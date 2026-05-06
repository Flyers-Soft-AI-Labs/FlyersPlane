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

  return (
    <>
      {!isAllIssues && <AppHeader header={<GlobalIssuesHeader />} />}
      <ContentWrapper>
        <Outlet />
      </ContentWrapper>
    </>
  );
}
