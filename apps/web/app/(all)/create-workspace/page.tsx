/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useRef, useState } from "react";
import { observer } from "mobx-react";
// plane imports
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import type { IWorkspace } from "@plane/types";
// assets
import WorkspaceCreationDisabled from "@/app/assets/workspace/workspace-creation-disabled.png?url";
// components
import { ProjectsAppPowerKProvider } from "@/components/power-k/projects-app-provider";
import { CreateWorkspaceForm } from "@/components/workspace/create-workspace-form";
// hooks
import { useAppTheme } from "@/hooks/store/use-app-theme";
import { useUser, useUserProfile } from "@/hooks/store/user";
import { useInstance } from "@/hooks/store/use-instance";
import { useAppRouter } from "@/hooks/use-app-router";
// wrappers
import { AuthenticationWrapper } from "@/lib/wrappers/authentication-wrapper";
// sidebar
import { ProjectAppSidebar } from "../[workspaceSlug]/(projects)/_sidebar";

const CreateWorkspacePage = observer(function CreateWorkspacePage() {
  const { t } = useTranslation();
  // router
  const router = useAppRouter();
  // store hooks
  const { config } = useInstance();
  const { data: currentUser } = useUser();
  const { updateUserProfile } = useUserProfile();
  const { sidebarCollapsed, toggleSidebar } = useAppTheme();
  // states
  const [defaultValues, setDefaultValues] = useState<Pick<IWorkspace, "name" | "slug" | "organization_size">>({
    name: "",
    slug: "",
    organization_size: "",
  });
  const didNormalizeSidebarRef = useRef(false);
  // derived values
  const isWorkspaceCreationDisabled = config?.is_workspace_creation_disabled ?? false;

  // methods
  const getMailtoHref = () => {
    const subject = t("workspace_creation.request_email.subject");
    const body = t("workspace_creation.request_email.body", {
      firstName: currentUser?.first_name || "",
      lastName: currentUser?.last_name || "",
      email: currentUser?.email || "",
    });

    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const onSubmit = async (workspace: IWorkspace) => {
    await updateUserProfile({ last_workspace_id: workspace.id }).then(() => router.push(`/${workspace.slug}`));
  };

  useEffect(() => {
    if (didNormalizeSidebarRef.current) return;

    didNormalizeSidebarRef.current = true;
    if (sidebarCollapsed === false) toggleSidebar(true);
  }, [sidebarCollapsed, toggleSidebar]);

  return (
    <AuthenticationWrapper>
      <ProjectsAppPowerKProvider />
      <div className="flyers-soft-notion-layout flyers-soft-create-workspace-layout">
        <ProjectAppSidebar />
        <main className="flyers-soft-notion-main flyers-soft-create-workspace-main">
          {currentUser?.email && <div className="flyers-soft-create-workspace-email">{currentUser.email}</div>}
          <section className="flyers-soft-create-workspace-content">
            {isWorkspaceCreationDisabled ? (
              <div className="flyers-soft-create-workspace-disabled">
                <img src={WorkspaceCreationDisabled} alt="Workspace creation disabled" />
                <div className="flyers-soft-create-workspace-disabled-copy">
                  <h1>{t("workspace_creation.errors.creation_disabled.title")}</h1>
                  <p>{t("workspace_creation.errors.creation_disabled.description")}</p>
                </div>
                <div className="flyers-soft-create-workspace-actions">
                  <Button
                    variant="secondary"
                    onClick={() => router.back()}
                    className="flyers-soft-create-workspace-secondary-button"
                  >
                    {t("common.go_back")}
                  </Button>
                  <a href={getMailtoHref()} className="flyers-soft-create-workspace-secondary-button">
                    {t("workspace_creation.errors.creation_disabled.request_button")}
                  </a>
                </div>
              </div>
            ) : (
              <div className="flyers-soft-create-workspace-panel">
                <div className="flyers-soft-create-workspace-heading">
                  <h1>{t("workspace_creation.heading")}</h1>
                  <p>Set up a workspace to collaborate with your team and get all your work in one place.</p>
                </div>
                <CreateWorkspaceForm
                  onSubmit={onSubmit}
                  defaultValues={defaultValues}
                  setDefaultValues={setDefaultValues}
                />
              </div>
            )}
          </section>
        </main>
      </div>
    </AuthenticationWrapper>
  );
});

export default CreateWorkspacePage;
