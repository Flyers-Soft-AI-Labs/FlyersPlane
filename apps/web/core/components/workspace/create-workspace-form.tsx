/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";
import { observer } from "mobx-react";
import { Controller, useForm } from "react-hook-form";
import { ORGANIZATION_SIZE, RESTRICTED_URLS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { IWorkspace } from "@plane/types";
// ui
import { CustomSelect, Input } from "@plane/ui";
import { validateWorkspaceName, validateSlug } from "@plane/utils";
// hooks
import { useWorkspace } from "@/hooks/store/use-workspace";
import { useAppRouter } from "@/hooks/use-app-router";
// services
import { WorkspaceService } from "@/services/workspace.service";

type Props = {
  onSubmit?: (res: IWorkspace) => Promise<void>;
  defaultValues: {
    name: string;
    slug: string;
    organization_size: string;
  };
  setDefaultValues: Dispatch<SetStateAction<Pick<IWorkspace, "name" | "slug" | "organization_size">>>;
  secondaryButton?: React.ReactNode;
  primaryButtonText?: {
    loading: string;
    default: string;
  };
};

const workspaceService = new WorkspaceService();

export const CreateWorkspaceForm = observer(function CreateWorkspaceForm(props: Props) {
  const { t } = useTranslation();
  const {
    onSubmit,
    defaultValues,
    setDefaultValues,
    secondaryButton,
    primaryButtonText = {
      loading: "workspace_creation.button.loading",
      default: "workspace_creation.button.default",
    },
  } = props;
  // states
  const [slugError, setSlugError] = useState(false);
  const [invalidSlug, setInvalidSlug] = useState(false);
  // router
  const router = useAppRouter();
  // store hooks
  const { createWorkspace } = useWorkspace();
  // form info
  const {
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors, isSubmitting, isValid },
  } = useForm<IWorkspace>({ defaultValues, mode: "onChange" });

  const handleCreateWorkspace = async (formData: IWorkspace) => {
    try {
      const res = (await workspaceService.workspaceSlugCheck(formData.slug)) as { status: boolean };
      if (res.status === true && !RESTRICTED_URLS.includes(formData.slug)) {
        setSlugError(false);
        try {
          const workspaceResponse = await createWorkspace(formData);
          setToast({
            type: TOAST_TYPE.SUCCESS,
            title: t("workspace_creation.toast.success.title"),
            message: t("workspace_creation.toast.success.message"),
          });

          if (onSubmit) await onSubmit(workspaceResponse);
        } catch {
          setToast({
            type: TOAST_TYPE.ERROR,
            title: t("workspace_creation.toast.error.title"),
            message: t("workspace_creation.toast.error.message"),
          });
        }
      } else {
        setSlugError(true);
      }
    } catch {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("workspace_creation.toast.error.title"),
        message: t("workspace_creation.toast.error.message"),
      });
    }
  };

  useEffect(
    () => () => {
      // when the component unmounts set the default values to whatever user typed in
      setDefaultValues(getValues());
    },
    [getValues, setDefaultValues]
  );

  return (
    <form
      className="flyers-soft-create-workspace-form"
      onSubmit={(e) => {
        void handleSubmit(handleCreateWorkspace)(e);
      }}
    >
      <div className="flyers-soft-create-workspace-fields">
        <div className="flyers-soft-create-workspace-field">
          <label htmlFor="workspaceName">
            {t("workspace_creation.form.name.label")}
            <span className="ml-0.5 text-danger-primary">*</span>
          </label>
          <div className="flyers-soft-create-workspace-control">
            <Controller
              control={control}
              name="name"
              rules={{
                required: t("common.errors.required"),
                validate: (value) => validateWorkspaceName(value, true),
                maxLength: {
                  value: 80,
                  message: t("workspace_creation.errors.validation.name_length"),
                },
              }}
              render={({ field: { value, ref, onChange } }) => (
                <Input
                  id="workspaceName"
                  type="text"
                  value={value}
                  onChange={(e) => {
                    onChange(e.target.value);
                    setValue("name", e.target.value);
                    setValue("slug", e.target.value.toLocaleLowerCase().trim().replace(/ /g, "-"), {
                      shouldValidate: true,
                    });
                  }}
                  ref={ref}
                  hasError={Boolean(errors.name)}
                  placeholder={t("workspace_creation.form.name.placeholder")}
                  className="flyers-soft-create-workspace-input"
                />
              )}
            />
            <span className="flyers-soft-create-workspace-error">{errors?.name?.message}</span>
          </div>
        </div>
        <div className="flyers-soft-create-workspace-field">
          <label htmlFor="workspaceUrl">
            {t("workspace_creation.form.url.label")}
            <span className="ml-0.5 text-danger-primary">*</span>
          </label>
          <div className="flyers-soft-create-workspace-url-field">
            <span>{typeof window !== "undefined" ? window.location.host : ""}/</span>
            <Controller
              control={control}
              name="slug"
              rules={{
                required: t("common.errors.required"),
                maxLength: {
                  value: 48,
                  message: t("workspace_creation.errors.validation.url_length"),
                },
              }}
              render={({ field: { onChange, value, ref } }) => (
                <Input
                  id="workspaceUrl"
                  type="text"
                  value={value.toLocaleLowerCase().trim().replace(/ /g, "-")}
                  onChange={(e) => {
                    const validation = validateSlug(e.target.value);
                    if (validation === true) setInvalidSlug(false);
                    else setInvalidSlug(true);
                    onChange(e.target.value.toLowerCase());
                  }}
                  ref={ref}
                  hasError={Boolean(errors.slug)}
                  placeholder={t("workspace_creation.form.url.placeholder")}
                  className="flyers-soft-create-workspace-url-input"
                />
              )}
            />
          </div>
          {slugError && (
            <p className="flyers-soft-create-workspace-error">
              {t("workspace_creation.errors.validation.url_already_taken")}
            </p>
          )}
          {invalidSlug && (
            <p className="flyers-soft-create-workspace-error">
              {t("workspace_creation.errors.validation.url_alphanumeric")}
            </p>
          )}
          {errors.slug && <span className="flyers-soft-create-workspace-error">{errors.slug.message}</span>}
        </div>
        <div className="flyers-soft-create-workspace-field">
          <span className="flyers-soft-create-workspace-label">
            {t("workspace_creation.form.organization_size.label")}
            <span className="ml-0.5 text-danger-primary">*</span>
          </span>
          <div className="w-full">
            <Controller
              name="organization_size"
              control={control}
              rules={{ required: t("common.errors.required") }}
              render={({ field: { value, onChange } }) => (
                <CustomSelect
                  value={value}
                  onChange={onChange}
                  label={
                    ORGANIZATION_SIZE.find((c) => c === value) ?? (
                      <span className="text-placeholder">
                        {t("workspace_creation.form.organization_size.placeholder")}
                      </span>
                    )
                  }
                  buttonClassName="flyers-soft-create-workspace-select-button"
                  optionsClassName="flyers-soft-create-workspace-select-options"
                  input
                >
                  {ORGANIZATION_SIZE.map((item) => (
                    <CustomSelect.Option key={item} value={item} className="flyers-soft-create-workspace-select-option">
                      {item}
                    </CustomSelect.Option>
                  ))}
                </CustomSelect>
              )}
            />
            {errors.organization_size && (
              <span className="flyers-soft-create-workspace-error">{errors.organization_size.message}</span>
            )}
          </div>
        </div>
      </div>
      <div className="flyers-soft-create-workspace-actions">
        {secondaryButton}
        <Button
          variant="primary"
          type="submit"
          size="xl"
          disabled={!isValid}
          loading={isSubmitting}
          className="flyers-soft-create-workspace-primary-button"
        >
          {isSubmitting ? t(primaryButtonText.loading) : t(primaryButtonText.default)}
        </Button>
        {!secondaryButton && (
          <Button
            variant="secondary"
            type="button"
            size="xl"
            onClick={() => router.back()}
            className="flyers-soft-create-workspace-secondary-button"
          >
            {t("common.go_back")}
          </Button>
        )}
      </div>
    </form>
  );
});
