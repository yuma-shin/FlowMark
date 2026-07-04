export type AlertType = 'TIP' | 'NOTE' | 'CAUTION' | 'WARNING' | 'IMPORTANT'

export interface AlertOption {
  readonly type: AlertType
  readonly label: string
  readonly previewText: string
  readonly color: string
}

export const ALERT_OPTIONS: readonly AlertOption[] = [
  {
    type: 'TIP',
    label: 'Tip Alert',
    previewText: '> [!TIP]',
    color: 'bg-green-500',
  },
  {
    type: 'NOTE',
    label: 'Note Alert',
    previewText: '> [!NOTE]',
    color: 'bg-blue-500',
  },
  {
    type: 'CAUTION',
    label: 'Caution Alert',
    previewText: '> [!CAUTION]',
    color: 'bg-red-500',
  },
  {
    type: 'WARNING',
    label: 'Warning Alert',
    previewText: '> [!WARNING]',
    color: 'bg-yellow-500',
  },
  {
    type: 'IMPORTANT',
    label: 'Important Alert',
    previewText: '> [!IMPORTANT]',
    color: 'bg-purple-500',
  },
] as const
