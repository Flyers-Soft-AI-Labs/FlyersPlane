/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// plane imports
import { ScrollArea } from "@plane/propel/scrollarea";
import { cn } from "@plane/utils";
import { usePathname } from "next/navigation";
// local imports
import { WorkspaceSettingsSidebarHeader } from "./header";
import { WorkspaceSettingsSidebarItemCategories } from "./item-categories";

type Props = {
  className?: string;
};

export function WorkspaceSettingsSidebarRoot(props: Props) {
  const { className } = props;
  const pathname = usePathname();
  const isTeamsSettingsPage = /\/settings\/members\/?$/.test(pathname ?? "");

  return (
    <ScrollArea
      scrollType="hover"
      orientation="vertical"
      size="sm"
      rootClassName={cn(
        "h-full w-[250px] shrink-0 animate-fade-in overflow-y-scroll border-r border-r-subtle bg-surface-1",
        {
          "flyers-soft-teams-settings-sidebar": isTeamsSettingsPage,
        },
        className
      )}
    >
      <WorkspaceSettingsSidebarHeader />
      <WorkspaceSettingsSidebarItemCategories />
    </ScrollArea>
  );
}
