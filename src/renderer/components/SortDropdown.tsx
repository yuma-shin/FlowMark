import { useTranslation } from 'react-i18next'
import { FiFilter } from 'react-icons/fi'
import { DropdownMenu } from './ui/dropdown-menu'
import { Button } from './ui/button'

export type SortOption = 'title-asc' | 'title-desc' | 'date-asc' | 'date-desc'

interface SortDropdownProps {
  value: SortOption
  onChange: (value: SortOption) => void
}

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  const { t } = useTranslation()

  const sortOptions: Array<{ value: SortOption; label: string }> = [
    { value: 'date-desc', label: t('sortDropdown.dateDesc') },
    { value: 'date-asc', label: t('sortDropdown.dateAsc') },
    { value: 'title-asc', label: t('sortDropdown.titleAsc') },
    { value: 'title-desc', label: t('sortDropdown.titleDesc') },
  ]

  const selectedLabel =
    sortOptions.find(opt => opt.value === value)?.label ||
    t('sortDropdown.sortBy')

  return (
    <DropdownMenu
      items={sortOptions}
      onChange={onChange}
      trigger={
        <Button aria-label={selectedLabel} size="iconSm" variant="secondary">
          <FiFilter size={14} />
        </Button>
      }
      value={value}
    />
  )
}
