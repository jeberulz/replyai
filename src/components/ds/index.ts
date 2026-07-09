/**
 * Design-system adapters (WP25) — Astryx primitives behind `@/components/ds/*`.
 *
 * Strangler fig: leave `@/components/ui/*` (shadcn) intact until call sites move.
 * Brand: Dark Chrome theme (WP24). Do not import stock Neutral aesthetics.
 *
 * Prop map (shadcn → Astryx) lives in docs/wp/wp25-progress.md.
 */

export { Button } from "./button";
export type { ButtonProps } from "./button";

export { IconButton } from "./icon-button";
export type { IconButtonProps } from "./icon-button";

export { Banner } from "./banner";
export type { BannerProps } from "./banner";

export { Badge } from "./badge";
export type { BadgeProps } from "./badge";

export { Skeleton } from "./skeleton";
export type { SkeletonProps } from "./skeleton";

export { Spinner } from "./spinner";
export type { SpinnerProps } from "./spinner";

export { Divider } from "./divider";
export type { DividerProps } from "./divider";

export { Tooltip } from "./tooltip";
export type { TooltipProps } from "./tooltip";

export { StatusDot } from "./status-dot";
export type { StatusDotProps } from "./status-dot";

export { TextInput } from "./text-input";
export type { TextInputProps } from "./text-input";

export { TextArea } from "./text-area";
export type { TextAreaProps } from "./text-area";

export { Field } from "./field";
export type { FieldProps } from "./field";

export { FieldStatus } from "./field-status";
export type { FieldStatusProps } from "./field-status";

export { Switch } from "./switch";
export type { SwitchProps } from "./switch";

export { SegmentedControl, SegmentedControlItem } from "./segmented-control";
export type {
  SegmentedControlProps,
  SegmentedControlItemProps,
} from "./segmented-control";

export { EmptyState } from "./empty-state";
export type { EmptyStateProps } from "./empty-state";

export { Dialog, DialogHeader } from "./dialog";
export type { DialogProps, DialogHeaderProps } from "./dialog";

export { Kbd } from "./kbd";
export type { KbdProps } from "./kbd";

export { Heading } from "./heading";
export type { HeadingProps } from "./heading";

export { Text } from "./text";
export type { TextProps } from "./text";

export { Card } from "./card";
export type { CardProps } from "./card";

export { Item } from "./item";
export type { ItemProps } from "./item";

export { SelectableCard } from "./selectable-card";
export type { SelectableCardProps } from "./selectable-card";
