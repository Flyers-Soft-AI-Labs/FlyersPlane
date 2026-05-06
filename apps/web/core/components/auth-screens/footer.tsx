/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

export function AuthFooter() {
  return (
    <div className="flex flex-col items-center gap-6">
      <span className="text-13 whitespace-nowrap text-tertiary">A Flyers Soft Product</span>
      <span className="text-13 whitespace-nowrap text-tertiary">Join teams building with Flyers Soft</span>
      <div className="flex w-full flex-wrap items-center justify-center gap-x-10 gap-y-4">
        {BRAND_LOGOS.map((brand) => (
          <div className="flex h-7 flex-1 items-center justify-center" key={brand.id}>
            {brand.icon}
          </div>
        ))}
      </div>
    </div>
  );
}
