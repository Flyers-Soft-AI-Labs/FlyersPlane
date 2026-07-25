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
import { InstanceNotReady, MaintenanceView } from "@/components/instance";
// hooks
import { useInstance } from "@/hooks/store/use-instance";

type TInstanceWrapper = {
  children: ReactNode;
};

const InstanceWrapper = observer(function InstanceWrapper(props: TInstanceWrapper) {
  const { children } = props;
  // store
  const { isLoading, instance, error, fetchInstanceInfo } = useInstance();

  const { isLoading: isInstanceSWRLoading, error: instanceSWRError } = useSWR(
    "INSTANCE_INFORMATION",
    async () => await fetchInstanceInfo(),
    { revalidateOnFocus: false }
  );

  // loading state
  if ((isLoading || isInstanceSWRLoading) && !instance)
    return (
      <div className="relative flex h-screen w-full items-center justify-center">
        <LogoSpinner />
      </div>
    );

  if (instanceSWRError) return <MaintenanceView />;

  // The instance-info fetch failed (e.g. a slow/cold backend hitting the
  // request timeout). Previously this rendered children anyway with
  // `config` still undefined, which made AuthRoot conclude no auth methods
  // were enabled and show "No authentication methods available" even
  // though the instance is configured correctly. Offer a retry instead of
  // silently rendering with missing data.
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
