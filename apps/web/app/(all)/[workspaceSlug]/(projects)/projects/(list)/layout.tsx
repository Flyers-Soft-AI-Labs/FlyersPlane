/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Outlet } from "react-router";
// components
import { ContentWrapper } from "@/components/core/content-wrapper";
// local components
import { ProjectsListMobileHeader } from "@/plane-web/components/projects/mobile-header";

export default function ProjectListLayout() {
  return (
    <>
      <ProjectsListMobileHeader />
      <ContentWrapper className="flyers-soft-projects-list-scroll">
        <Outlet />
      </ContentWrapper>
    </>
  );
}
