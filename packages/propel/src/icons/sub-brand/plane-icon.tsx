/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import * as React from "react";

import { IconWrapper } from "../icon-wrapper";
import type { ISvgIcons } from "../type";

export function PlaneNewIcon({ color = "currentColor", ...rest }: ISvgIcons) {
  return (
    <IconWrapper color={color} {...rest}>
      <rect x="1" y="1" width="14" height="14" rx="4" fill="#6C2BD9" />
      <text
        x="8"
        y="10.75"
        fill="#FFFFFF"
        fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        fontSize="6"
        fontWeight="700"
        letterSpacing="0"
        textAnchor="middle"
      >
        FS
      </text>
    </IconWrapper>
  );
}
