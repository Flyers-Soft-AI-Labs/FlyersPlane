/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { usePathname } from "next/navigation";
// i18n
import { EUserPermissions, EUserPermissionsLevel, PROJECT_TRACKER_ELEMENTS } from "@plane/constants";
// ui
import { Button } from "@plane/propel/button";
import { PlusIcon } from "@plane/propel/icons";
import { Header } from "@plane/ui";
// hooks
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { useUserPermissions } from "@/hooks/store/user";
// plane web constants
// components
import HeaderFilters from "./filters";
import { ProjectSearch } from "./search-projects";

export const ProjectsBaseHeader = observer(function ProjectsBaseHeader() {
  // store hooks
  const { toggleCreateProjectModal } = useCommandPalette();
  const { allowPermissions } = useUserPermissions();

  const pathname = usePathname();
  // auth
  const isAuthorizedUser = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.WORKSPACE
  );
  const isArchived = pathname.includes("/archives");

  return (
    <Header className="flyers-soft-projects-header mx-auto w-full max-w-[1520px] flex-wrap items-center gap-x-6 gap-y-2 px-6 pt-[22px] pb-3 lg:px-8 xl:flex-nowrap">
      <Header.LeftItem className="!max-w-none min-w-0 flex-1 basis-[220px] flex-nowrap overflow-hidden">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-lg tracking-normal truncate leading-6 font-semibold text-primary">
            {isArchived ? "Archived Projects" : "Projects"}
          </h1>
          <p className="truncate text-11 leading-4 text-secondary">
            Manage and collaborate on your team&apos;s projects
          </p>
        </div>
      </Header.LeftItem>
      <Header.RightItem className="ml-auto w-full shrink-0 flex-wrap items-center justify-start gap-2.5 sm:w-auto sm:justify-end md:flex-nowrap">
        <ProjectSearch />
        <div className="hidden md:flex">
          <HeaderFilters />
        </div>
        {isAuthorizedUser && !isArchived ? (
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              toggleCreateProjectModal(true);
            }}
            data-ph-element={PROJECT_TRACKER_ELEMENTS.CREATE_HEADER_BUTTON}
            className="!h-9 items-center gap-1 !rounded-lg bg-accent-primary px-3 !text-12 !text-primary shadow-[0_8px_18px_rgba(255,193,7,0.18)] transition-transform hover:-translate-y-0.5 hover:bg-accent-primary"
          >
            <PlusIcon className="h-3.5 w-3.5" strokeWidth={2} />
            <span className="hidden sm:inline-block">Add Project</span>
            <span className="inline-block sm:hidden">Project</span>
          </Button>
        ) : (
          <></>
        )}
      </Header.RightItem>
    </Header>
  );
});
