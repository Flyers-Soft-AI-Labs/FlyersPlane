/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import * as React from "react";

import type { ISvgIcons } from "../type";

export function PlaneLogo({ width = "85", height = "52", className }: ISvgIcons) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 85 52"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Flyers Soft"
    >
      <rect x="8" y="4" width="69" height="44" rx="12" fill="#6C2BD9" />
      <text
        x="42.5"
        y="33"
        fill="#FFFFFF"
        fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        fontSize="23"
        fontWeight="700"
        letterSpacing="0"
        textAnchor="middle"
      >
        FS
      </text>
    </svg>
  );
}
