/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// types
import { API_BASE_URL } from "@plane/constants";
import type { IInstanceInfo } from "@plane/types";
// helpers
// services
import { APIService } from "@/services/api.service";

export class InstanceService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async requestCSRFToken(): Promise<{ csrf_token: string }> {
    return this.get("/auth/get-csrf-token/")
      .then((response) => response.data)
      .catch((error) => {
        throw error;
      });
  }

  async getInstanceInfo(): Promise<IInstanceInfo> {
    // Longer timeout than the app default: this is the very first request on
    // page load, so it's the one most likely to hit a Render free-tier cold
    // start. 60s wasn't always enough - cold starts occasionally ran to
    // ~90s - so this stays a single longer wait rather than a client-side
    // retry loop (which was tried and reverted; see instance.store.ts).
    return this.get("/api/instances/", {}, { timeout: 90000 })
      .then((response) => response.data)
      .catch((error) => {
        throw error;
      });
  }
}
