/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// components
import { ContentWrapper } from "@/components/core/content-wrapper";
import { PageHead } from "@/components/core/page-title";
import { TimeSheetPage } from "@/components/workspace/time-sheet-page";
// hooks
import { useWorkspace } from "@/hooks/store/use-workspace";

function WorkspaceTimeSheetPage() {
  const { currentWorkspace } = useWorkspace();
  const pageTitle = currentWorkspace?.name ? `${currentWorkspace.name} - Time Sheet` : "Time Sheet";

  return (
    <ContentWrapper>
      <PageHead title={pageTitle} />
      <TimeSheetPage />
    </ContentWrapper>
  );
}

export default observer(WorkspaceTimeSheetPage);
