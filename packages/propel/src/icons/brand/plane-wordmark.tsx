/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import * as React from "react";

import type { ISvgIcons } from "../type";

export function PlaneWordmark({ width = "146", height = "44", className, color = "currentColor" }: ISvgIcons) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 146 44"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Flyers Soft"
    >
      <text
        x="0"
        y="30"
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
