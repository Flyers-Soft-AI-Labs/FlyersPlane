/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React from "react";
import { Command } from "cmdk";
// plane imports
import { useTranslation } from "@plane/i18n";
// local imports
import type { TPowerKCommandConfig, TPowerKCommandGroup, TPowerKContext } from "../../core/types";
import { PowerKModalCommandItem } from "../modal/command-item";
import { CONTEXT_ENTITY_MAP } from "../pages/context-based";
import { POWER_K_GROUP_PRIORITY, POWER_K_GROUP_I18N_TITLES } from "./shared";

type Props = {
  commands: TPowerKCommandConfig[];
  context: TPowerKContext;
  onCommandSelect: (command: TPowerKCommandConfig) => void;
};

export function CommandRenderer(props: Props) {
  const { commands, context, onCommandSelect } = props;
  // derived values
  const { activeContext } = context;
  // translation
  const { t } = useTranslation();

  const commandsByGroup = commands.reduce(
    (acc, command) => {
      const group = command.group || "general";
      if (!acc[group]) acc[group] = [];
      acc[group].push(command);
      return acc;
    },
    {} as Record<TPowerKCommandGroup, TPowerKCommandConfig[]>
  );

  const sortedGroups = Object.keys(commandsByGroup).reduce<TPowerKCommandGroup[]>((groups, group) => {
    const groupKey = group as TPowerKCommandGroup;
    const groupPriority = POWER_K_GROUP_PRIORITY[groupKey];
    const insertAt = groups.findIndex((existingGroup) => groupPriority < POWER_K_GROUP_PRIORITY[existingGroup]);

    if (insertAt === -1) {
      groups.push(groupKey);
    } else {
      groups.splice(insertAt, 0, groupKey);
    }

    return groups;
  }, []);

  return (
    <>
      {sortedGroups.map((groupKey) => {
        const groupCommands = commandsByGroup[groupKey];
        if (!groupCommands || groupCommands.length === 0) return null;

        const title =
          groupKey === "contextual" && activeContext
            ? t(CONTEXT_ENTITY_MAP[activeContext].i18n_title)
            : t(POWER_K_GROUP_I18N_TITLES[groupKey]);

        return (
          <Command.Group key={groupKey} heading={title}>
            {groupCommands.map((command) => {
              const commandTitle = t(command.i18n_title);

              return (
                <PowerKModalCommandItem
                  key={command.id}
                  icon={command.icon}
                  iconNode={command.iconNode}
                  label={commandTitle}
                  keySequence={command.keySequence}
                  keywords={command.keywords}
                  shortcut={command.shortcut || command.modifierShortcut}
                  value={[commandTitle, command.i18n_title, ...(command.keywords ?? [])].join(" ")}
                  onSelect={() => onCommandSelect(command)}
                />
              );
            })}
          </Command.Group>
        );
      })}
    </>
  );
}
