/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { range } from "lodash-es";

export function ProjectsLoader() {
  return (
    <div className="flyers-soft-projects-loader animate-pulse">
      <div className="flyers-soft-projects-table-scroll">
        <div className="flyers-soft-projects-table">
          <div className="flyers-soft-projects-table-header">
            {range(7).map((i) => (
              <span key={i} className="h-3 w-16 rounded bg-layer-1" />
            ))}
          </div>
          {range(5).map((i) => (
            <div key={i} className="flyers-soft-projects-table-row">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-4 w-4 rounded bg-layer-1" />
                <span className="h-4 w-40 rounded bg-layer-1" />
              </div>
              <span className="h-5 w-24 rounded-full bg-layer-1" />
              <span className="h-4 w-20 rounded bg-layer-1" />
              <span className="h-4 w-20 rounded bg-layer-1" />
              <span className="h-4 w-24 rounded bg-layer-1" />
              <span className="h-5 w-16 rounded-full bg-layer-1" />
              <span className="h-6 w-6 rounded bg-layer-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
