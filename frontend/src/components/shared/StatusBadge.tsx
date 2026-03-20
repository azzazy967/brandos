import { Badge } from '@/components/ui/badge'

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'default' }> = {
  healthy: { label: 'Healthy', variant: 'success' },
  good: { label: 'Good', variant: 'success' },
  active: { label: 'Active', variant: 'success' },
  delivered: { label: 'Delivered', variant: 'success' },
  collected: { label: 'Collected', variant: 'success' },
  connected: { label: 'Connected', variant: 'success' },
  paid: { label: 'Paid', variant: 'success' },
  closed: { label: 'Closed', variant: 'muted' },
  inactive: { label: 'Inactive', variant: 'muted' },
  disconnected: { label: 'Disconnected', variant: 'muted' },
  dead_stock: { label: 'Dead Stock', variant: 'muted' },
  not_applicable: { label: 'N/A', variant: 'muted' },
  low_stock: { label: 'Low Stock', variant: 'warning' },
  low: { label: 'Low', variant: 'warning' },
  warning: { label: 'Warning', variant: 'warning' },
  pending: { label: 'Pending', variant: 'warning' },
  aging: { label: 'Aging', variant: 'warning' },
  in_transit: { label: 'In Transit', variant: 'info' },
  processing: { label: 'Processing', variant: 'info' },
  created: { label: 'Created', variant: 'info' },
  out_of_stock: { label: 'Out of Stock', variant: 'danger' },
  critical: { label: 'Critical', variant: 'danger' },
  failed: { label: 'Failed', variant: 'danger' },
  overdue: { label: 'Overdue', variant: 'danger' },
  error: { label: 'Error', variant: 'danger' },
  returned: { label: 'Returned', variant: 'danger' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
  cash: { label: 'Cash', variant: 'info' },
  card: { label: 'Card', variant: 'info' },
  instapay: { label: 'InstaPay', variant: 'info' },
  cod: { label: 'COD', variant: 'warning' },
  online: { label: 'Online', variant: 'success' },
  meta: { label: 'Meta', variant: 'info' },
  tiktok: { label: 'TikTok', variant: 'muted' },
  shopify: { label: 'Shopify', variant: 'success' },
  aramex: { label: 'Aramex', variant: 'info' },
  bosta: { label: 'Bosta', variant: 'info' },
  info: { label: 'Info', variant: 'info' },
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status.toLowerCase()] ?? { label: status, variant: 'muted' as const }
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}
