/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import * as React from "react";

import type { ISvgIcons } from "../type";

export function PlaneLockup({ width = "253", height = "53", className, color = "currentColor" }: ISvgIcons) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 253 53"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Flyers Soft"
    >
      <rect x="0" y="4" width="45" height="45" rx="12" fill="#6C2BD9" />
      <text
        x="22.5"
        y="33"
        fill="#FFFFFF"
        fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        fontSize="20"
        fontWeight="700"
        letterSpacing="0"
        textAnchor="middle"
      >
        FS
      </text>
      <text
        x="59"
        y="34"
        fill={color}
        fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        fontSize="29"
        fontWeight="700"
        letterSpacing="0"
      >
        Flyers Soft
      </text>
    </svg>
  );
}
