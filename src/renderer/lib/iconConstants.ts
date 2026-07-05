export const ICON_SIZE = {
  /** ツールバーボタン内のアイコン (MarkdownToolbar, SelectionToolbar) */
  TOOLBAR: 15,
  /** タイトルバー・サイドバーのアイコン */
  TITLEBAR: 16,
  /** ドロップダウン内のインジケータアイコン (chevron等) */
  INDICATOR: 12,
  /** コンテキストメニュー内のアイコン */
  MENU: 14,
} as const

export type IconSize = (typeof ICON_SIZE)[keyof typeof ICON_SIZE]
