/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { ReactNode } from "react";
import { observer } from "mobx-react";

export const ExtendedAppHeader = observer(function ExtendedAppHeader(props: { header: ReactNode }) {
  const { header } = props;

  return (
    <div className="flyers-soft-extended-app-header flex w-full min-w-0 items-center">
      <div className="min-w-0 flex-1">{header}</div>
    </div>
  );
});
