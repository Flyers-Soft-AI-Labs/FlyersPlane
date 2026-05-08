/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { observer } from "mobx-react";
import { usePathname } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpToLine,
  Building2,
  Clock3,
  Copy,
  ExternalLink,
  HelpCircle,
  Link2,
  Save,
  Settings2,
  UploadCloud,
  UsersRound,
  Webhook,
} from "lucide-react";
// Plane Imports
import { ORGANIZATION_SIZE, EUserPermissions, EUserPermissionsLevel, WORKSPACE_SETTINGS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { IWorkspace } from "@plane/types";
import { CustomSelect, Input } from "@plane/ui";
import { cn, copyUrlToClipboard, getFileURL, joinUrlPath, validateWorkspaceName } from "@plane/utils";
// components
import { WorkspaceImageUploadModal } from "@/components/core/modals/workspace-image-upload-modal";
import { TimezoneSelect } from "@/components/global/timezone-select";
// hooks
import { useWorkspace } from "@/hooks/store/use-workspace";
import { useUserPermissions } from "@/hooks/store/user";
// plane web components
import { DeleteWorkspaceSection } from "@/plane-web/components/workspace/delete-workspace-section";

const defaultValues: Partial<IWorkspace> = {
  name: "",
  url: "",
  organization_size: "2-10",
  logo_url: null,
  timezone: "UTC",
};

const SETTINGS_NAV_ITEMS = [
  { key: "general", label: "General", href: WORKSPACE_SETTINGS.general.href, icon: Settings2 },
  { key: "members", label: "Members", href: WORKSPACE_SETTINGS.members.href, icon: UsersRound },
  { key: "export", label: "Exports", href: WORKSPACE_SETTINGS.export.href, icon: ArrowUpToLine },
  { key: "webhooks", label: "Webhooks", href: WORKSPACE_SETTINGS.webhooks.href, icon: Webhook },
] as const;

type TWorkspaceSettingsFieldRow = {
  children: React.ReactNode;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
  label: string;
};

function WorkspaceSettingsFieldRow(props: TWorkspaceSettingsFieldRow) {
  const { children, description, icon: Icon, iconClassName, label } = props;

  return (
    <div className="flyers-soft-settings-row grid gap-4 py-6 lg:grid-cols-[minmax(260px,1fr)_minmax(320px,520px)] lg:items-center">
      <div className="flex min-w-0 items-center gap-4">
        <span className={cn("grid size-12 shrink-0 place-items-center rounded-xl", iconClassName)}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <h3 className="text-14 leading-5 font-semibold text-primary">{label}</h3>
          <p className="mt-0.5 text-12 leading-5 text-secondary">{description}</p>
        </div>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export const WorkspaceDetails = observer(function WorkspaceDetails() {
  // states
  const [isLoading, setIsLoading] = useState(false);
  const [isImageUploadModalOpen, setIsImageUploadModalOpen] = useState(false);
  // store hooks
  const { currentWorkspace, updateWorkspace } = useWorkspace();
  const { allowPermissions } = useUserPermissions();
  const { t } = useTranslation();
  const pathname = usePathname();

  // form info
  const {
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<IWorkspace>({
    defaultValues: { ...defaultValues, ...currentWorkspace },
  });
  // derived values
  const workspaceLogo = watch("logo_url");

  const onSubmit = async (formData: IWorkspace) => {
    if (!currentWorkspace) return;

    setIsLoading(true);

    const payload: Partial<IWorkspace> = {
      name: formData.name,
      organization_size: formData.organization_size,
      timezone: formData.timezone,
    };

    try {
      await updateWorkspace(currentWorkspace.slug, payload);
      setToast({
        title: "Success!",
        type: TOAST_TYPE.SUCCESS,
        message: "Workspace updated successfully",
      });
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 300);
    }
  };

  const handleRemoveLogo = async () => {
    if (!currentWorkspace) return;

    try {
      await updateWorkspace(currentWorkspace.slug, {
        logo_url: "",
      });
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: "Success!",
        message: "Workspace picture removed successfully.",
      });
    } catch {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Error!",
        message: "There was some error in deleting your profile picture. Please try again.",
      });
    }
  };

  const handleCopyUrl = () => {
    if (!currentWorkspace) return;

    void copyUrlToClipboard(`${currentWorkspace.slug}`)
      .then(() => {
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: "Workspace URL copied to the clipboard.",
        });
        return undefined;
      })
      .catch(() => {
        // Silently handle clipboard errors
      });
  };

  useEffect(() => {
    if (currentWorkspace) reset({ ...currentWorkspace });
  }, [currentWorkspace, reset]);

  const isAdmin = allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.WORKSPACE);

  if (!currentWorkspace) return null;

  const workspaceUrl = `${
    typeof window !== "undefined" && window.location.origin.replace("http://", "").replace("https://", "")
  }/${currentWorkspace.slug}`;
  const workspaceName = watch("name") || currentWorkspace.name;

  return (
    <>
      <Controller
        control={control}
        name="logo_url"
        render={({ field: { onChange, value } }) => (
          <WorkspaceImageUploadModal
            isOpen={isImageUploadModalOpen}
            onClose={() => setIsImageUploadModalOpen(false)}
            handleRemove={handleRemoveLogo}
            onSuccess={(imageUrl) => {
              onChange(imageUrl);
              setIsImageUploadModalOpen(false);
            }}
            value={value}
          />
        )}
      />
      <div className="flyers-soft-workspace-settings-page">
        <div className="relative z-[1] mx-auto flex w-full max-w-[1500px] flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl leading-8 font-semibold text-primary">Workspace settings</h1>
            <p className="text-14 leading-6 text-secondary">Manage your workspace preferences and configuration</p>
          </div>

          <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="flex flex-col gap-5">
              <nav className="flyers-soft-settings-side-card flex flex-col gap-2 p-5" aria-label="Workspace settings">
                {SETTINGS_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const href = joinUrlPath(currentWorkspace.slug, item.href);
                  const normalizedPathname = pathname?.replace(/\/$/, "");
                  const normalizedHref = href.replace(/\/$/, "");
                  const isActive =
                    item.key === "general"
                      ? normalizedPathname === normalizedHref
                      : normalizedPathname === normalizedHref || normalizedPathname?.startsWith(`${normalizedHref}/`);

                  return (
                    <Link
                      key={item.key}
                      href={href}
                      className={cn("flyers-soft-settings-nav-item", {
                        "is-active": isActive,
                      })}
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg">
                        <Icon className="h-4 w-4" strokeWidth={2} />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="flyers-soft-settings-side-card p-5">
                <div className="flex items-start gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border border-[#eadfcb] bg-white text-secondary">
                    <HelpCircle className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-14 font-semibold text-primary">Need help?</h2>
                    <p className="mt-2 text-13 leading-5 text-secondary">
                      Learn more about workspace settings and preferences.
                    </p>
                  </div>
                </div>
                <a
                  href="https://docs.plane.so/"
                  target="_blank"
                  rel="noreferrer"
                  className="flyers-soft-settings-docs-link mt-5"
                >
                  <span>View documentation</span>
                  <ExternalLink className="h-4 w-4" strokeWidth={2} />
                </a>
              </div>
            </aside>

            <div className="flex min-w-0 flex-col gap-6">
              <form
                className={cn("flyers-soft-settings-main-card", {
                  "opacity-70": !isAdmin,
                })}
                onSubmit={(e) => {
                  void handleSubmit(onSubmit)(e);
                }}
              >
                <div className="flex flex-col gap-6 px-6 py-7 sm:px-8 lg:px-10">
                  <div className="flex flex-col gap-5 md:flex-row md:items-center">
                    <button
                      type="button"
                      className="flyers-soft-settings-logo-button"
                      onClick={() => setIsImageUploadModalOpen(true)}
                      disabled={!isAdmin}
                    >
                      {workspaceLogo && workspaceLogo !== "" ? (
                        <img src={getFileURL(workspaceLogo)} className="size-full object-cover" alt="Workspace Logo" />
                      ) : (
                        <span>{currentWorkspace.name?.charAt(0) ?? "N"}</span>
                      )}
                    </button>

                    <div className="flex min-w-0 flex-1 flex-col gap-3">
                      <h2 className="text-xl truncate leading-7 font-semibold text-primary">{workspaceName}</h2>
                      <button type="button" onClick={handleCopyUrl} className="flyers-soft-settings-url-pill">
                        <span className="truncate">{workspaceUrl}</span>
                        <Copy className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          className="flex w-fit items-center gap-2 text-13 font-semibold text-[#d99300] transition hover:text-[#a86400]"
                          onClick={() => setIsImageUploadModalOpen(true)}
                        >
                          <UploadCloud className="h-4 w-4" strokeWidth={2} />
                          <span>{workspaceLogo && workspaceLogo !== "" ? "Edit logo" : "Upload logo"}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="h-px bg-[#eadfcb]" />

                  <div className="divide-y divide-[#eadfcb]">
                    <WorkspaceSettingsFieldRow
                      icon={Building2}
                      iconClassName="bg-[#f1ecff] text-[#6554d9]"
                      label="Workspace name"
                      description="This is the name of your workspace"
                    >
                      <div className="flex flex-col gap-1.5">
                        <Controller
                          control={control}
                          name="name"
                          rules={{
                            validate: (value) => validateWorkspaceName(value, true),
                          }}
                          render={({ field: { value, onChange, ref } }) => (
                            <Input
                              id="name"
                              name="name"
                              type="text"
                              value={value}
                              onChange={onChange}
                              ref={ref}
                              hasError={Boolean(errors.name)}
                              placeholder={t("workspace_settings.settings.general.name")}
                              className="flyers-soft-settings-control w-full"
                              disabled={!isAdmin}
                            />
                          )}
                        />
                        {errors.name && (
                          <p className="text-caption-sm-regular text-danger-primary">{errors.name.message}</p>
                        )}
                      </div>
                    </WorkspaceSettingsFieldRow>

                    <WorkspaceSettingsFieldRow
                      icon={UsersRound}
                      iconClassName="bg-[#e9fbf1] text-[#00a66a]"
                      label="Company size"
                      description="Select the size of your company"
                    >
                      <Controller
                        name="organization_size"
                        control={control}
                        render={({ field: { value, onChange } }) => (
                          <CustomSelect
                            value={value}
                            onChange={onChange}
                            label={
                              ORGANIZATION_SIZE.find((c) => c === value) ??
                              t("workspace_settings.settings.general.errors.company_size.select_a_range")
                            }
                            className="w-full"
                            buttonClassName="flyers-soft-settings-control w-full !justify-between !px-4 !py-0"
                            input
                            disabled={!isAdmin}
                          >
                            {ORGANIZATION_SIZE.map((item) => (
                              <CustomSelect.Option key={item} value={item}>
                                {item}
                              </CustomSelect.Option>
                            ))}
                          </CustomSelect>
                        )}
                      />
                    </WorkspaceSettingsFieldRow>

                    <WorkspaceSettingsFieldRow
                      icon={Link2}
                      iconClassName="bg-[#eaf2ff] text-[#2276ff]"
                      label="Workspace URL"
                      description="This is your workspace unique URL"
                    >
                      <Controller
                        control={control}
                        name="url"
                        render={({ field: { onChange, ref } }) => (
                          <div className="relative">
                            <Input
                              id="url"
                              name="url"
                              type="url"
                              value={workspaceUrl}
                              onChange={onChange}
                              ref={ref}
                              hasError={Boolean(errors.url)}
                              className="flyers-soft-settings-control w-full cursor-not-allowed pr-11"
                              disabled
                            />
                            <button
                              type="button"
                              className="absolute top-1/2 right-3 grid size-7 -translate-y-1/2 place-items-center rounded-md text-tertiary transition hover:bg-[#fff8e1] hover:text-primary"
                              onClick={handleCopyUrl}
                              aria-label="Copy workspace URL"
                            >
                              <Copy className="h-3.5 w-3.5" strokeWidth={2} />
                            </button>
                          </div>
                        )}
                      />
                    </WorkspaceSettingsFieldRow>

                    <WorkspaceSettingsFieldRow
                      icon={Clock3}
                      iconClassName="bg-[#fff0f1] text-[#ff3b4f]"
                      label="Workspace Timezone"
                      description="Set the timezone for your workspace"
                    >
                      <Controller
                        name="timezone"
                        control={control}
                        render={({ field: { value, onChange } }) => (
                          <TimezoneSelect
                            value={value}
                            onChange={onChange}
                            disabled={!isAdmin}
                            className="w-full"
                            buttonClassName="flyers-soft-settings-control w-full !justify-between !px-4 !py-0"
                          />
                        )}
                      />
                    </WorkspaceSettingsFieldRow>
                  </div>

                  {isAdmin && (
                    <div className="flex pt-1">
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="flyers-soft-settings-update-button !h-11 !rounded-lg px-5 !text-13 !font-semibold !text-primary"
                        loading={isLoading}
                        prependIcon={<Save />}
                      >
                        {isLoading ? t("updating") : "Update workspace"}
                      </Button>
                    </div>
                  )}
                </div>
              </form>

              {isAdmin && (
                <div className="flyers-soft-settings-danger-zone">
                  <DeleteWorkspaceSection workspace={currentWorkspace} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
});
