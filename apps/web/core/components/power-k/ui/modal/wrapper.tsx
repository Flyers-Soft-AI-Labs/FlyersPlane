/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Command } from "cmdk";
import { observer } from "mobx-react";
import { Dialog, Transition } from "@headlessui/react";
// hooks
import { usePowerK } from "@/hooks/store/use-power-k";
// local imports
import { formatModifierShortcut, isTypingInInput } from "../../core/shortcut-handler";
import type { TPowerKCommandConfig, TPowerKContext } from "../../core/types";
import type { TPowerKCommandsListProps } from "./commands-list";
import { PowerKModalFooter } from "./footer";
import { PowerKModalHeader } from "./header";

type Props = {
  commandsListComponent: React.FC<TPowerKCommandsListProps>;
  context: TPowerKContext;
  hideFooter?: boolean;
  isOpen: boolean;
  onClose: () => void;
};

export const ProjectsAppPowerKModalWrapper = observer(function ProjectsAppPowerKModalWrapper(props: Props) {
  const { commandsListComponent: CommandsListComponent, context, hideFooter = false, isOpen, onClose } = props;
  // states
  const [searchTerm, setSearchTerm] = useState("");
  const [isWorkspaceLevel, setIsWorkspaceLevel] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  // store hooks
  const { activePage, commandRegistry, setActivePage } = usePowerK();

  const canExecuteCommand = useCallback(
    (command: TPowerKCommandConfig) => {
      if (command.isVisible && !command.isVisible(context)) return false;
      if (command.isEnabled && !command.isEnabled(context)) return false;
      if ("contextType" in command && (!context.activeContext || context.activeContext !== command.contextType)) {
        return false;
      }

      return true;
    },
    [context]
  );

  // Handle command selection
  const handleCommandSelect = useCallback(
    (command: TPowerKCommandConfig) => {
      if (command.type === "action") {
        // Direct action - execute and potentially close
        command.action(context);
        if (command.closeOnSelect === true) {
          context.closePalette();
        }
      } else if (command.type === "change-page") {
        // Opens a selection page
        context.setActiveCommand(command);
        setActivePage(command.page);
        setSearchTerm("");
      }
    },
    [context, setActivePage]
  );

  // Handle selection page item selection
  const handlePageDataSelection = useCallback(
    (data: unknown) => {
      if (context.activeCommand?.type === "change-page") {
        context.activeCommand.onSelect(data, context);
      }
      // Go back to main page
      if (context.activeCommand?.closeOnSelect === true) {
        context.closePalette();
      }
    },
    [context]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const nativeEvent = e.nativeEvent;

      // Cmd/Ctrl+K closes palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onClose();
        return;
      }

      // Modifier shortcuts should keep working while the command input is focused.
      const shouldHandleModifierShortcut =
        nativeEvent.metaKey ||
        nativeEvent.ctrlKey ||
        nativeEvent.altKey ||
        (!isTypingInInput(nativeEvent.target) && nativeEvent.shiftKey);

      if (shouldHandleModifierShortcut) {
        const command = commandRegistry.findByModifierShortcut(context, formatModifierShortcut(nativeEvent));

        if (command && canExecuteCommand(command)) {
          e.preventDefault();
          handleCommandSelect(command);
          return;
        }
      }

      // Escape closes the palette, or steps back from a nested command page.
      if (e.key === "Escape") {
        e.preventDefault();
        if (activePage) {
          setActivePage(null);
          context.setActiveCommand(null);
          setSearchTerm("");
        } else {
          onClose();
        }
        return;
      }

      // Backspace clears context or goes back from page
      if (e.key === "Backspace" && !searchTerm) {
        e.preventDefault();
        if (activePage) {
          // Go back from selection page
          setActivePage(null);
          context.setActiveCommand(null);
        } else {
          // Hide context based actions
          context.setShouldShowContextBasedActions(false);
        }
        return;
      }
    },
    [activePage, canExecuteCommand, commandRegistry, context, handleCommandSelect, onClose, searchTerm, setActivePage]
  );

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setSearchTerm("");
        setActivePage(null);
        context.setActiveCommand(null);
        context.setShouldShowContextBasedActions(true);
      }, 200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <Transition.Root show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" initialFocus={searchInputRef} onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="flyers-soft-command-palette-backdrop fixed inset-0 bg-backdrop transition-opacity" />
        </Transition.Child>
        {/* Modal Container */}
        <div className="fixed inset-0 z-30 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-4 pt-[12vh] sm:p-6 sm:pt-[12vh] md:p-20 md:pt-[12vh]">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-2 sm:scale-[.98]"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-2 sm:scale-[.98]"
            >
              <Dialog.Panel className="flyers-soft-command-palette-panel divide-opacity-10 relative flex w-full max-w-2xl transform flex-col items-center justify-center divide-y divide-subtle-1 rounded-lg bg-surface-1 shadow-raised-200 transition-all">
                <Command
                  label="Command menu"
                  loop
                  filter={(i18nValue: string, search: string) => {
                    if (i18nValue === "no-results") return 1;
                    if (i18nValue.toLowerCase().includes(search.toLowerCase())) return 1;
                    return 0;
                  }}
                  shouldFilter={searchTerm.length > 0}
                  onKeyDown={handleKeyDown}
                  className="flyers-soft-command-palette w-full"
                >
                  <PowerKModalHeader
                    activePage={activePage}
                    context={context}
                    inputRef={searchInputRef}
                    onSearchChange={setSearchTerm}
                    searchTerm={searchTerm}
                  />
                  <Command.List className="flyers-soft-command-palette-list vertical-scrollbar scrollbar-sm max-h-96 overflow-auto outline-none">
                    <CommandsListComponent
                      activePage={activePage}
                      context={context}
                      handleCommandSelect={handleCommandSelect}
                      handlePageDataSelection={handlePageDataSelection}
                      isWorkspaceLevel={isWorkspaceLevel}
                      searchTerm={searchTerm}
                      setSearchTerm={setSearchTerm}
                    />
                  </Command.List>
                  {/* Footer hints */}
                  {!hideFooter && (
                    <PowerKModalFooter
                      isWorkspaceLevel={isWorkspaceLevel}
                      projectId={context.params.projectId?.toString()}
                      onWorkspaceLevelChange={setIsWorkspaceLevel}
                    />
                  )}
                </Command>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
});
