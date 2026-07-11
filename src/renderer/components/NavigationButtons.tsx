import { LuChevronLeft, LuChevronRight } from 'react-icons/lu'
import { useTranslation } from 'react-i18next'
import { ICON_SIZE } from '@/renderer/lib/iconConstants'
import { SimpleTooltip } from './ui/tooltip'
import { Button } from './ui/button'

export interface NavigationButtonsProps {
  canGoBack: boolean
  canGoForward: boolean
  onGoBack: () => void
  onGoForward: () => void
}

export function NavigationButtons({
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
}: NavigationButtonsProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-0.5">
      <SimpleTooltip content={t('navigation.back')}>
        <Button
          aria-label={t('navigation.back')}
          disabled={!canGoBack}
          onClick={onGoBack}
          size="iconSm"
          variant="ghost"
        >
          <LuChevronLeft size={ICON_SIZE.TITLEBAR} />
        </Button>
      </SimpleTooltip>
      <SimpleTooltip content={t('navigation.forward')}>
        <Button
          aria-label={t('navigation.forward')}
          disabled={!canGoForward}
          onClick={onGoForward}
          size="iconSm"
          variant="ghost"
        >
          <LuChevronRight size={ICON_SIZE.TITLEBAR} />
        </Button>
      </SimpleTooltip>
    </div>
  )
}
