/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { usePathname } from "next/navigation";
import { ChevronRight, Folder } from "lucide-react";
import { Header } from "@plane/ui";
// hooks
import { useWorkspace } from "@/hooks/store/use-workspace";

export const ProjectsBaseHeader = observer(function ProjectsBaseHeader() {
  const { currentWorkspace } = useWorkspace();
  const pathname = usePathname();
  const isArchived = pathname.includes("/archives");

  return (
    <Header className="flyers-soft-projects-header mx-auto w-full max-w-[1360px] items-center px-6 py-3 lg:px-8">
      <Header.LeftItem className="!max-w-none min-w-0 flex-1 overflow-hidden">
        <div className="flyers-soft-projects-breadcrumb" aria-label="Projects breadcrumb">
          <Folder className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.8} aria-hidden="true" />
          <span className="truncate">{currentWorkspace?.name ?? "Workspace"}</span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-tertiary" strokeWidth={1.8} aria-hidden="true" />
          <span className="truncate text-primary">{isArchived ? "Archived Projects" : "Projects"}</span>
        </div>
      </Header.LeftItem>
    </Header>
  );
});
