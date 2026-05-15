/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { AccentureLogo, DolbyLogo, SonyLogo, ZerodhaLogo } from "@plane/propel/icons";

const BRAND_LOGOS = [
  { id: "accenture", icon: <AccentureLogo /> },
  { id: "dolby", icon: <DolbyLogo /> },
  { id: "sony", icon: <SonyLogo /> },
  { id: "zerodha", icon: <ZerodhaLogo /> },
];

export function AuthFooter() {
  return (
    <div className="flex flex-col items-center gap-6">
      <span className="text-13 whitespace-nowrap text-tertiary">A Flyers Soft Product</span>
      <span className="text-13 whitespace-nowrap text-tertiary">Join teams building with Flyers Soft</span>
    </div>
  );
}
