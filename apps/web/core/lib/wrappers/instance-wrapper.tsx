/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { ReactNode } from "react";
import { observer } from "mobx-react";
import useSWR from "swr";
// components
import { LogoSpinner } from "@/components/common/logo-spinner";
import { InstanceNotReady } from "@/components/instance";
// hooks
import { useInstance } from "@/hooks/store/use-instance";

type TInstanceWrapper = {
  children: ReactNode;
};

const InstanceWrapper = observer(function InstanceWrapper(props: TInstanceWrapper) {
  const { children } = props;
  // store
  const { isLoading, instance, error, fetchInstanceInfo } = useInstance();

  // `fetchInstanceInfo` re-throws on failure so SWR's own retry/backoff below
  // actually engages. Deliberately not reading SWR's own `error`/`isValidating`
  // for rendering here - only the store's `error` (set once per attempt, by
  // `fetchInstanceInfo` itself) drives the fallback UI. Two independent error
  // states (SWR's + the store's) toggling the same subtree on every retry tick
  // is what caused rapid mount/unmount cycles previously; there is now exactly
  // one state driving the branch below, and it flips at the bounded cadence
  // errorRetryCount/errorRetryInterval allow.
  const { isLoading: isInstanceSWRLoading } = useSWR("INSTANCE_INFORMATION", async () => await fetchInstanceInfo(), {
    revalidateOnFocus: false,
    // A cold Render backend can reconnect mid-boot and flip the browser's
    // online/offline state; without this, that event fires its own fetch on
    // top of the error-retry timer below, doubling up attempts.
    revalidateOnReconnect: false,
    shouldRetryOnError: true,
    errorRetryCount: 3,
    errorRetryInterval: 3000,
  });

  // loading state
  if ((isLoading || isInstanceSWRLoading) && !instance)
    return (
      <div className="relative flex h-screen w-full items-center justify-center">
        <LogoSpinner />
      </div>
    );

  // The instance-info fetch failed (e.g. a slow/cold backend hitting the
  // request timeout). Previously this rendered children anyway with
  // `config` still undefined, which made AuthRoot conclude no auth methods
  // were enabled and show "No authentication methods available" even
  // though the instance is configured correctly. SWR retries a few times
  // with backoff first (see errorRetryCount above); this only shows once
  // those are exhausted.
  if (error && error?.status === "error")
    return (
      <div className="relative flex h-screen w-full flex-col items-center justify-center gap-4">
        <p className="text-13 text-tertiary">{error.message || "Something went wrong. Please try again."}</p>
        <button
          type="button"
          onClick={() => fetchInstanceInfo()}
          className="rounded-md border border-strong px-4 py-2 text-13 font-medium text-primary hover:bg-surface-2"
        >
          Retry
        </button>
      </div>
    );

  // instance is not ready and setup is not done
  if (instance?.is_setup_done === false) return <InstanceNotReady />;

  return <>{children}</>;
});

export default InstanceWrapper;
