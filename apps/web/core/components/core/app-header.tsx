/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { ReactNode } from "react";
import { observer } from "mobx-react";
// plane imports
import { Row } from "@plane/ui";
// components
import { cn } from "@plane/utils";
import { ExtendedAppHeader } from "@/plane-web/components/common/extended-app-header";

export interface AppHeaderProps {
  header: ReactNode;
  mobileHeader?: ReactNode;
  className?: string;
  rowClassName?: string;
}

export const AppHeader = observer(function AppHeader(props: AppHeaderProps) {
  const { header, mobileHeader, className, rowClassName } = props;

  return (
    <div className={cn("relative z-[24]", className)}>
      <Row
        className={cn(
          "flyers-soft-app-header flex min-h-[56px] w-full items-stretch gap-2 border-b border-subtle bg-surface-1",
          rowClassName
        )}
      >
        <ExtendedAppHeader header={header} />
      </Row>
      {mobileHeader}
    </div>
  );
});
