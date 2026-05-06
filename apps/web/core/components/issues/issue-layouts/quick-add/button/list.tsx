/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";

import { useTranslation } from "@plane/i18n";
import { PlusIcon } from "@plane/propel/icons";
import { EIssuesStoreType } from "@plane/types";
import { Row } from "@plane/ui";
import { cn } from "@plane/utils";
import { useIssueStoreType } from "@/hooks/use-issue-layout-store";
import type { TQuickAddIssueButton } from "../root";

export const ListQuickAddIssueButton = observer(function ListQuickAddIssueButton(props: TQuickAddIssueButton) {
  const { onClick, isEpic = false } = props;
  const { t } = useTranslation();
  const storeType = useIssueStoreType();
  const isProjectTicketsList = storeType === EIssuesStoreType.PROJECT && !isEpic;

  return (
    <Row
      className={cn(
        "flex w-full cursor-pointer items-center gap-2 bg-layer-transparent py-3 hover:bg-layer-transparent-hover",
        {
          "flyers-soft-project-ticket-quick-add-button": isProjectTicketsList,
        }
      )}
      onClick={onClick}
    >
      <PlusIcon className="h-3.5 w-3.5 stroke-2" />
      <span className="text-13 font-medium">
        {isEpic ? t("epic.new") : isProjectTicketsList ? "Create Ticket" : t("issue.new")}
      </span>
    </Row>
  );
});
