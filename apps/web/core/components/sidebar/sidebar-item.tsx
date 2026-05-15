/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { ForwardedRef } from "react";
import { forwardRef } from "react";
import Link from "next/link";
import { cn } from "@plane/utils";

// ============================================================================
// TYPES
// ============================================================================

interface AppSidebarItemData {
  href?: string;
  label?: string;
  icon?: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  showLabel?: boolean;
}

interface AppSidebarItemProps {
  variant?: "link" | "button" | "content";
  item?: AppSidebarItemData;
}

interface AppSidebarItemLabelProps {
  highlight?: boolean;
  label?: string;
}

interface AppSidebarItemIconProps {
  icon?: React.ReactNode;
  highlight?: boolean;
}

interface AppSidebarLinkItemProps {
  href?: string;
  children: React.ReactNode;
  className?: string;
}

interface AppSidebarButtonItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

interface AppSidebarContentItemProps {
  children: React.ReactNode;
  className?: string;
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  base: "group flex flex-col gap-0.5 items-center justify-center text-tertiary",
  icon: "flex items-center justify-center gap-2 size-8 rounded-md text-tertiary",
  iconActive: "bg-layer-transparent-selected text-secondary !text-icon-primary",
  iconInactive: "group-hover:text-icon-secondary group-hover:bg-layer-transparent-hover !text-icon-tertiary",
  label: "text-11 font-medium",
  labelActive: "text-secondary",
  labelInactive: "group-hover:text-secondary text-tertiary",
} as const;

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function AppSidebarItemLabel({ highlight = false, label }: AppSidebarItemLabelProps) {
  if (!label) return null;

  return (
    <span
      className={cn(styles.label, {
        [styles.labelActive]: highlight,
        [styles.labelInactive]: !highlight,
      })}
    >
      {label}
    </span>
  );
}

function AppSidebarItemIcon({ icon, highlight }: AppSidebarItemIconProps) {
  if (!icon) return null;

  return (
    <div
      className={cn(styles.icon, {
        [styles.iconActive]: highlight,
        [styles.iconInactive]: !highlight,
      })}
    >
      {icon}
    </div>
  );
}

const AppSidebarLinkItem = forwardRef(function AppSidebarLinkItem(
  { href, children, className }: AppSidebarLinkItemProps,
  ref: ForwardedRef<HTMLAnchorElement>
) {
  if (!href) return null;

  return (
    <Link ref={ref} href={href} className={cn(styles.base, className)}>
      {children}
    </Link>
  );
});

const AppSidebarButtonItem = forwardRef(function AppSidebarButtonItem(
  { children, onClick, disabled = false, className }: AppSidebarButtonItemProps,
  ref: ForwardedRef<HTMLButtonElement>
) {
  return (
    <button ref={ref} className={cn(styles.base, className)} onClick={onClick} disabled={disabled} type="button">
      {children}
    </button>
  );
});

const AppSidebarContentItem = forwardRef(function AppSidebarContentItem(
  { children, className }: AppSidebarContentItemProps,
  ref: ForwardedRef<HTMLDivElement>
) {
  return (
    <div ref={ref} className={cn(styles.base, className)}>
      {children}
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export type AppSidebarItemComponent = React.ForwardRefExoticComponent<
  AppSidebarItemProps & React.RefAttributes<HTMLElement>
> & {
  Label: React.FC<AppSidebarItemLabelProps>;
  Icon: React.FC<AppSidebarItemIconProps>;
  Link: typeof AppSidebarLinkItem;
  Button: typeof AppSidebarButtonItem;
  Content: typeof AppSidebarContentItem;
};

const AppSidebarItem = forwardRef(function AppSidebarItem(
  { variant = "link", item }: AppSidebarItemProps,
  ref: ForwardedRef<HTMLElement>
) {
  if (!item) return null;

  const { icon, isActive, label, href, onClick, disabled, showLabel = true } = item;

  const commonItems = (
    <>
      <AppSidebarItemIcon icon={icon} highlight={isActive} />
      {showLabel && <AppSidebarItemLabel highlight={isActive} label={label} />}
    </>
  );

  if (variant === "link") {
    return (
      <AppSidebarLinkItem ref={ref as ForwardedRef<HTMLAnchorElement>} href={href}>
        {commonItems}
      </AppSidebarLinkItem>
    );
  }

  if (variant === "content") {
    return <AppSidebarContentItem ref={ref as ForwardedRef<HTMLDivElement>}>{commonItems}</AppSidebarContentItem>;
  }

  return (
    <AppSidebarButtonItem ref={ref as ForwardedRef<HTMLButtonElement>} onClick={onClick} disabled={disabled}>
      {commonItems}
    </AppSidebarButtonItem>
  );
}) as AppSidebarItemComponent;

// ============================================================================
// COMPOUND COMPONENT ASSIGNMENT
// ============================================================================

AppSidebarItem.Label = AppSidebarItemLabel;
AppSidebarItem.Icon = AppSidebarItemIcon;
AppSidebarItem.Link = AppSidebarLinkItem;
AppSidebarItem.Button = AppSidebarButtonItem;
AppSidebarItem.Content = AppSidebarContentItem;

export { AppSidebarItem };
export type { AppSidebarItemData, AppSidebarItemProps };
