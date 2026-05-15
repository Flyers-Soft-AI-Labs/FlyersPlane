import type { Placement, PositioningStrategy } from "@popperjs/core";

export type TButtonVariants =
  | "border-with-text"
  | "border-without-text"
  | "background-with-text"
  | "background-without-text"
  | "transparent-with-text"
  | "transparent-without-text";

export type TDropdownProps = {
  buttonClassName?: string;
  buttonContainerClassName?: string;
  buttonVariant: TButtonVariants;
  className?: string;
  disabled?: boolean;
  hideIcon?: boolean;
  optionsClassName?: string;
  placeholder?: string;
  placement?: Placement;
  showTooltip?: boolean;
  tabIndex?: number;
  dropdownStrategy?: PositioningStrategy;
};
