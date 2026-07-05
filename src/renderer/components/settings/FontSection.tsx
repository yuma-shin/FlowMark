import { useRef } from 'react'
import { LuCheck, LuRefreshCw, LuTriangleAlert } from 'react-icons/lu'
import { useTranslation } from 'react-i18next'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useApp } from '../../contexts/AppContext'
import {
  builtinFonts,
  builtinEnglishFonts,
  builtinJapaneseFonts,
  getFontName,
  DEFAULT_FONT_EN,
  DEFAULT_FONT_JA,
} from '../../lib/fontManager'
import { useSystemFonts } from '../../hooks/useSystemFonts'

const VIRTUALIZE_THRESHOLD = 20
const MAX_VIEWPORT_HEIGHT = 320

// --- PresetSection ---

interface PresetSectionProps {
  currentFontEn: string
  currentFontJa: string
  lang: string
  onSelect: (fontEn: string, fontJa: string) => void
}

function PresetSection({
  currentFontEn,
  currentFontJa,
  lang,
  onSelect,
}: PresetSectionProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        {t('font.presets')}
      </p>
      <div className="flex flex-col gap-0.5">
        {builtinFonts.map(font => {
          const fontEn = font.fontEn.replace(/"/g, '')
          const fontJa = font.fontJa.replace(/"/g, '')
          const isSelected =
            currentFontEn === fontEn && currentFontJa === fontJa
          return (
            <div
              aria-selected={isSelected}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors ${
                isSelected ? 'bg-accent' : 'hover:bg-accent/60'
              }`}
              key={font.id}
              onClick={() => onSelect(fontEn, fontJa)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') onSelect(fontEn, fontJa)
              }}
              role="option"
              tabIndex={0}
            >
              <span className="text-sm text-foreground truncate flex-1">
                {getFontName(font, lang)}
              </span>
              {isSelected && (
                <LuCheck className="text-muted-foreground shrink-0" size={13} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// --- Font Option Item ---

interface FontOptionItemProps {
  fontName: string
  isSelected: boolean
  onSelect: () => void
}

function FontOptionItem({
  fontName,
  isSelected,
  onSelect,
}: FontOptionItemProps) {
  return (
    <div
      aria-selected={isSelected}
      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors ${
        isSelected ? 'bg-accent' : 'hover:bg-accent/60'
      }`}
      onClick={onSelect}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') onSelect()
      }}
      role="option"
      tabIndex={0}
    >
      <span
        className="text-sm text-foreground truncate flex-1"
        style={{ fontFamily: `"${fontName}", sans-serif` }}
      >
        {fontName}
      </span>
      {isSelected && (
        <LuCheck className="text-muted-foreground shrink-0" size={13} />
      )}
    </div>
  )
}

// --- Virtualized Font List ---

interface VirtualizedFontListProps {
  fonts: string[]
  selectedFont: string
  onSelect: (fontName: string) => void
}

function VirtualizedFontList({
  fonts,
  selectedFont,
  onSelect,
}: VirtualizedFontListProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: fonts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 5,
  })

  return (
    <div
      className="overflow-y-auto"
      ref={parentRef}
      style={{ maxHeight: `${MAX_VIEWPORT_HEIGHT}px` }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map(virtualItem => {
          const fontName = fonts[virtualItem.index]
          const isSelected = selectedFont === fontName
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <FontOptionItem
                fontName={fontName}
                isSelected={isSelected}
                onSelect={() => onSelect(fontName)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// --- LanguageFontSection ---

interface LanguageFontSectionProps {
  label: string
  builtinFontNames: string[]
  systemFonts: string[]
  selectedFont: string
  isLoading: boolean
  error: string | null
  onSelect: (fontName: string) => void
  onRefresh: () => void
}

function LanguageFontSection({
  label,
  builtinFontNames,
  systemFonts,
  selectedFont,
  isLoading,
  error,
  onSelect,
  onRefresh,
}: LanguageFontSectionProps) {
  const { t } = useTranslation()
  const totalItems = builtinFontNames.length + systemFonts.length
  const useVirtualization = totalItems > VIRTUALIZE_THRESHOLD

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <button
          aria-label={t('font.refresh')}
          className="p-0.5 rounded hover:bg-accent/60 text-muted-foreground transition-colors"
          onClick={onRefresh}
          title={t('font.refresh')}
          type="button"
        >
          <LuRefreshCw size={11} />
        </button>
      </div>

      {/* Built-in group */}
      <p className="text-[9px] text-muted-foreground">{t('font.builtin')}</p>
      <div className="flex flex-col gap-0.5">
        {builtinFontNames.map(fontName => (
          <FontOptionItem
            fontName={fontName}
            isSelected={selectedFont === fontName}
            key={fontName}
            onSelect={() => onSelect(fontName)}
          />
        ))}
      </div>

      {/* System Fonts group */}
      <p className="pt-1.5 text-[9px] text-muted-foreground">
        {t('font.systemFonts')}
      </p>

      {error && (
        <div className="flex items-center gap-1.5 py-1.5 text-[11px] text-amber-600 dark:text-amber-400">
          <LuTriangleAlert size={12} />
          <span>{t('font.systemFontsError')}</span>
        </div>
      )}

      {isLoading && !error && (
        <p className="py-1.5 text-[11px] text-muted-foreground">
          {t('font.loading')}
        </p>
      )}

      {!isLoading &&
        !error &&
        systemFonts.length > 0 &&
        (useVirtualization ? (
          <VirtualizedFontList
            fonts={systemFonts}
            onSelect={onSelect}
            selectedFont={selectedFont}
          />
        ) : (
          <div className="flex flex-col gap-0.5">
            {systemFonts.map(fontName => (
              <FontOptionItem
                fontName={fontName}
                isSelected={selectedFont === fontName}
                key={fontName}
                onSelect={() => onSelect(fontName)}
              />
            ))}
          </div>
        ))}
    </div>
  )
}

// --- FontSection (main exported component) ---

export function FontSection() {
  const { settings, updateSettings } = useApp()
  const { t, i18n } = useTranslation()
  const { fonts: systemFonts, isLoading, error, refresh } = useSystemFonts()

  const currentFontEn = settings.fontFamilyEn ?? DEFAULT_FONT_EN
  const currentFontJa = settings.fontFamilyJa ?? DEFAULT_FONT_JA

  const handlePresetSelect = (fontEn: string, fontJa: string) => {
    updateSettings({ fontFamilyEn: fontEn, fontFamilyJa: fontJa })
  }

  const handleEnglishFontSelect = (fontName: string) => {
    updateSettings({ fontFamilyEn: fontName })
  }

  const handleJapaneseFontSelect = (fontName: string) => {
    updateSettings({ fontFamilyJa: fontName })
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-foreground">
        {t('settings.font')}
      </h3>

      <div className="space-y-4 divide-y divide-border">
        {/* Preset Section */}
        <PresetSection
          currentFontEn={currentFontEn}
          currentFontJa={currentFontJa}
          lang={i18n.language}
          onSelect={handlePresetSelect}
        />

        {/* English Font Section */}
        <div className="pt-4">
          <LanguageFontSection
            builtinFontNames={builtinEnglishFonts}
            error={error}
            isLoading={isLoading}
            label={t('font.englishFont')}
            onRefresh={refresh}
            onSelect={handleEnglishFontSelect}
            selectedFont={currentFontEn}
            systemFonts={systemFonts}
          />
        </div>

        {/* Japanese Font Section */}
        <div className="pt-4">
          <LanguageFontSection
            builtinFontNames={builtinJapaneseFonts}
            error={error}
            isLoading={isLoading}
            label={t('font.japaneseFont')}
            onRefresh={refresh}
            onSelect={handleJapaneseFontSelect}
            selectedFont={currentFontJa}
            systemFonts={systemFonts}
          />
        </div>
      </div>
    </div>
  )
}
