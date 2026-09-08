/**
 * Sound Thesis design system — public API.
 *
 * New pages should import from here only. Component contracts live in the
 * individual files; see docs/UI_ARCHITECTURE.md for usage.
 */

// Primitives
export { Button, type ButtonProps } from './Button';
export { Input, type InputProps } from './Input';
export { NumberInput, type NumberInputProps } from './NumberInput';
export { EnhancedNumberInput, type EnhancedNumberInputProps } from './EnhancedNumberInput';
export { CurrencyInput, type CurrencyInputProps } from './CurrencyInput';
export { Select, type SelectProps, type SelectOption } from './Select';
export { Slider, type SliderProps } from './Slider';
export { Textarea, type TextareaProps } from './Textarea';
export { Field, type FieldProps, type FieldControlProps } from './Field';

// Surfaces & structure
export { Card, type CardProps } from './Card';
export { SectionCard, type SectionCardProps } from './SectionCard';
export { PageHeader, type PageHeaderProps } from './PageHeader';
export { SectionTitle, type SectionTitleProps } from './SectionTitle';

// Metrics & data display
export { MetricCard, type MetricCardProps } from './MetricCard';
export { StatCard, type StatCardProps, type StatSecondary, type StatTone } from './StatCard';
export { Badge, type BadgeProps } from './Badge';
export { Tag, type TagProps } from './Tag';
export { StatusPill, type StatusPillProps, type Status, statusLabels } from './StatusPill';
export { ProgressBar, type ProgressBarProps } from './ProgressBar';
export { Sparkline, type SparklineProps } from './Sparkline';
export { Table } from './Table';
export { DataTable, type DataTableProps, type DataTableColumn, type SortDirection } from './DataTable';
export { Kbd, type KbdProps, shortcutToKbd } from './Kbd';

// Feedback
export { Alert, type AlertProps } from './Alert';
export { Skeleton, type SkeletonProps, SkeletonText, SkeletonTableRows } from './Skeleton';
export { EmptyState, type EmptyStateProps } from './EmptyState';
export { ErrorState, type ErrorStateProps } from './ErrorState';
export { AutosaveIndicator, type AutosaveIndicatorProps, type AutosaveState } from './AutosaveIndicator';

// Overlays
export { Modal, type ModalProps } from './Modal';
export { Drawer, type DrawerProps } from './Drawer';
export { Popover, type PopoverProps } from './Popover';
export { Tooltip, type TooltipProps } from './Tooltip';
export { DropdownMenu, type DropdownMenuProps, type DropdownItem } from './DropdownMenu';
export { ConfirmDialog, type ConfirmDialogProps } from './ConfirmDialog';
export { Tabs, type TabsProps, type Tab } from './Tabs';

// Toast system
export { ToastProvider, useToast, type ToastApi, type ToastItem, type ToastVariant, type ToastOptions } from './Toast';

// Command palette
export {
  CommandPalette,
  fuzzyScore,
  type CommandPaletteProps,
  type CommandPaletteItem,
} from './CommandPalette';

// Charts (§115 contract: AreaFanChart, DonutAllocation, ComparisonBars, NetWorthArea)
export { AreaFanChart, type AreaFanChartProps, type FanChartDatum } from './charts/AreaFanChart';
export { DonutAllocation, type DonutAllocationProps, type DonutAllocationDatum } from './charts/DonutAllocation';
export { ComparisonBars, type ComparisonBarsProps, type ComparisonBarDatum } from './charts/ComparisonBars';
export { NetWorthArea, type NetWorthAreaProps, type NetWorthDatum } from './charts/NetWorthArea';
export { ChartFigure, type ChartFigureProps } from './charts/ChartFigure';
export { ChartTooltip, type ChartTooltipProps } from './charts/ChartTooltip';
export { useChartTheme, getChartTheme, type ChartTheme } from './charts/chartTheme';
