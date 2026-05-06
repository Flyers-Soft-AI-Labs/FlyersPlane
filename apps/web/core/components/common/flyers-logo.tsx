/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { cn } from "@plane/utils";

type FlyersLogoProps = {
  className?: string;
};

export function FlyersLogo({ className }: FlyersLogoProps) {
  return <img src="/flyers-logo.png" alt="Flyers Soft" className={cn("flyers-logo h-10 w-auto", className)} />;
}
