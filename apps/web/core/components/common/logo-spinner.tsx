/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { FlyersLogo } from "@/components/common/flyers-logo";

export function LogoSpinner() {
  return (
    <div className="flex items-center justify-center">
      <FlyersLogo className="flyers-logo-spinner h-11 object-contain" />
    </div>
  );
}
