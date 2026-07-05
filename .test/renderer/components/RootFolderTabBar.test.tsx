import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import {
  RootFolderTabBar,
  type RootFolderTab,
} from '@/renderer/components/RootFolderTabBar'

const TABS: RootFolderTab[] = [
  { path: '/work', name: 'work', status: 'ok' },
  { path: '/personal', name: 'personal', status: 'missing' },
]

function mockScrollMetrics(scrollWidth: number, clientWidth: number) {
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(
    scrollWidth
  )
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(
    clientWidth
  )
}

// applyScrollは `content.style.transform = translateX(-scrollLeft px)` を
// 設定するので、逆算してスクロール位置を取り出すヘルパー。
function getScrollLeft(el: HTMLElement): number {
  const match = el.style.transform.match(/translateX\((-?[\d.]+)px\)/)
  // -Number('0') は -0 になり Object.is(-0, 0) が false になるため +0 で正規化する
  return match ? -Number(match[1]) + 0 : 0
}

function createDataTransfer() {
  const data: Record<string, string> = {}
  return {
    effectAllowed: '',
    dropEffect: '',
    setData: (format: string, value: string) => {
      data[format] = value
    },
    getData: (format: string) => data[format] ?? '',
  }
}

describe('RootFolderTabBar', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('登録済みの各ルートフォルダに対応するタブをフォルダ名とともに表示する', () => {
    render(
      <RootFolderTabBar
        activePath="/work"
        onAdd={vi.fn()}
        onClose={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        tabs={TABS}
      />
    )

    expect(screen.getByText('work')).toBeInTheDocument()
    expect(screen.getByText('personal')).toBeInTheDocument()
  })

  it('アクティブなタブを他のタブと視覚的に区別できる状態で強調表示する', () => {
    render(
      <RootFolderTabBar
        activePath="/work"
        onAdd={vi.fn()}
        onClose={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        tabs={TABS}
      />
    )

    const activeTab = screen.getByRole('tab', { name: /work/ })
    const inactiveTab = screen.getByRole('tab', { name: /personal/ })
    expect(activeTab).toHaveAttribute('aria-selected', 'true')
    expect(inactiveTab).toHaveAttribute('aria-selected', 'false')
  })

  it('アクセス不能なルートフォルダに対応するタブには警告状態を表示する', () => {
    render(
      <RootFolderTabBar
        activePath="/work"
        onAdd={vi.fn()}
        onClose={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        tabs={TABS}
      />
    )

    const missingTab = screen.getByRole('tab', { name: /personal/ })
    expect(missingTab).toHaveAttribute('data-status', 'missing')
    const okTab = screen.getByRole('tab', { name: /work/ })
    expect(okTab).toHaveAttribute('data-status', 'ok')
  })

  it('タブをクリックすると onSelect が対応するパスで呼ばれる', () => {
    const onSelect = vi.fn()
    render(
      <RootFolderTabBar
        activePath="/work"
        onAdd={vi.fn()}
        onClose={vi.fn()}
        onReorder={vi.fn()}
        onSelect={onSelect}
        tabs={TABS}
      />
    )

    fireEvent.click(screen.getByRole('tab', { name: /personal/ }))
    expect(onSelect).toHaveBeenCalledWith('/personal')
  })

  it('タブの閉じるボタンをクリックすると onClose が呼ばれ、onSelect は呼ばれない', () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(
      <RootFolderTabBar
        activePath="/work"
        onAdd={vi.fn()}
        onClose={onClose}
        onReorder={vi.fn()}
        onSelect={onSelect}
        tabs={TABS}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /close.*work/i }))
    expect(onClose).toHaveBeenCalledWith('/work')
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('新しいルートフォルダを追加するための操作を表示し、クリックで onAdd を呼ぶ', () => {
    const onAdd = vi.fn()
    render(
      <RootFolderTabBar
        activePath={undefined}
        onAdd={onAdd}
        onClose={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        tabs={[]}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add Root Folder' }))
    expect(onAdd).toHaveBeenCalledTimes(1)
  })

  it('タブが無くても追加ボタンは表示される', () => {
    render(
      <RootFolderTabBar
        activePath={undefined}
        onAdd={vi.fn()}
        onClose={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        tabs={[]}
      />
    )

    expect(
      screen.getByRole('button', { name: 'Add Root Folder' })
    ).toBeInTheDocument()
  })

  it('タブはChromeライクに縮小できる幅設定(basis/min-width)を持ち、固定幅ではない', () => {
    render(
      <RootFolderTabBar
        activePath="/work"
        onAdd={vi.fn()}
        onClose={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        tabs={TABS}
      />
    )

    const tab = screen.getByRole('tab', { name: /work/ })
    expect(tab).not.toHaveClass('flex-shrink-0')
    expect(tab).toHaveClass('shrink')
    expect(tab).toHaveClass('grow-0')
    expect(tab).toHaveClass('basis-40')
    expect(tab).toHaveClass('min-w-[84px]')
  })

  it('タブ内のラベルはタブ自体の縮小に追従して省略表示される', () => {
    render(
      <RootFolderTabBar
        activePath="/work"
        onAdd={vi.fn()}
        onClose={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        tabs={TABS}
      />
    )

    const label = screen.getByText('work')
    expect(label).toHaveClass('truncate')
    expect(label).toHaveClass('min-w-0')
    expect(label).not.toHaveClass('max-w-[140px]')
  })

  it('タブ名が短くタブ自体に余白がある場合、閉じるボタンが右端に寄る(ラベルがflex-1で余白を埋める)', () => {
    render(
      <RootFolderTabBar
        activePath="/work"
        onAdd={vi.fn()}
        onClose={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        tabs={TABS}
      />
    )

    const label = screen.getByText('work')
    expect(label).toHaveClass('flex-1')
  })

  it('タブ一覧コンテンツは固定幅(w-max)ではなく、ビューポート幅に合わせて縮小できる', () => {
    render(
      <RootFolderTabBar
        activePath="/work"
        onAdd={vi.fn()}
        onClose={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        tabs={TABS}
      />
    )

    expect(screen.getByRole('tablist')).not.toHaveClass('w-max')
  })

  it('フォルダ追加ボタンはタブ一覧(スクロール対象)の外側にあり、横スクロールの対象にならない', () => {
    render(
      <RootFolderTabBar
        activePath="/work"
        onAdd={vi.fn()}
        onClose={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        tabs={TABS}
      />
    )

    const tablist = screen.getByRole('tablist')
    const addButton = screen.getByRole('button', { name: 'Add Root Folder' })
    expect(tablist.contains(addButton)).toBe(false)
  })

  it('タブ一覧の外側ラッパーはno-dragを持つ(タブ上でのホイール操作がWebView2に横取りされないようにする)', () => {
    render(
      <RootFolderTabBar
        activePath="/work"
        onAdd={vi.fn()}
        onClose={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        tabs={TABS}
      />
    )

    const viewport = screen.getByTestId('tab-scroll-viewport')
    const wrapper = viewport.parentElement as HTMLElement
    expect(wrapper).toHaveClass('no-drag')
  })

  it('スクロールビューポートはネイティブスクロールに依存しないoverflow-hiddenを持つ', () => {
    render(
      <RootFolderTabBar
        activePath="/work"
        onAdd={vi.fn()}
        onClose={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        tabs={TABS}
      />
    )

    const viewport = screen.getByTestId('tab-scroll-viewport')
    expect(viewport).toHaveClass('overflow-hidden')
    expect(viewport).toHaveClass('h-7')
    expect(viewport).toHaveClass('min-w-0')
    expect(viewport).toHaveClass('flex-1')
  })

  it('外側のラッパーはタイトルバー全高を占め、タブは上下中央寄せされる', () => {
    render(
      <RootFolderTabBar
        activePath="/work"
        onAdd={vi.fn()}
        onClose={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        tabs={TABS}
      />
    )

    const viewport = screen.getByTestId('tab-scroll-viewport')
    const wrapper = viewport.parentElement as HTMLElement
    expect(wrapper).toHaveClass('h-full')
    expect(wrapper).toHaveClass('items-center')
  })

  it('タブの合計幅がコンテナ幅を超えない場合はカスタムスクロールバーを非表示にする', () => {
    mockScrollMetrics(300, 300)
    render(
      <RootFolderTabBar
        activePath="/work"
        onAdd={vi.fn()}
        onClose={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        tabs={TABS}
      />
    )

    const thumb = screen.getByTestId('tab-scrollbar-thumb')
    expect(thumb.style.display).toBe('none')
  })

  it('タブの合計幅がコンテナ幅を超える場合、幅と位置に応じたつまみを絶対配置で表示する', () => {
    mockScrollMetrics(1000, 300)
    render(
      <RootFolderTabBar
        activePath="/work"
        onAdd={vi.fn()}
        onClose={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        tabs={TABS}
      />
    )

    const thumb = screen.getByTestId('tab-scrollbar-thumb')
    expect(thumb.style.display).not.toBe('none')
    expect(thumb).toHaveClass('absolute')
    expect(thumb).toHaveClass('no-drag')
    // width = viewportWidth^2 / contentWidth = 300*300/1000 = 90
    expect(thumb.style.width).toBe('90px')
    // scrollLeft(0) -> left = 0
    expect(thumb.style.left).toBe('0px')
  })

  it('つまみはタブの中央寄せに影響されず、外側ラッパー直下の固定位置を維持する', () => {
    mockScrollMetrics(1000, 300)
    render(
      <RootFolderTabBar
        activePath="/work"
        onAdd={vi.fn()}
        onClose={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        tabs={TABS}
      />
    )

    const viewport = screen.getByTestId('tab-scroll-viewport')
    const thumb = screen.getByTestId('tab-scrollbar-thumb')
    expect(thumb.parentElement).toBe(viewport.parentElement)
    expect(thumb).toHaveClass('bottom-0')
  })

  it('スクロールバーは既定で非表示(opacity-0)で、タブエリアへのホバーで表示するgroup-hover設定を持つ', () => {
    mockScrollMetrics(1000, 300)
    render(
      <RootFolderTabBar
        activePath="/work"
        onAdd={vi.fn()}
        onClose={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        tabs={TABS}
      />
    )

    const thumb = screen.getByTestId('tab-scrollbar-thumb')
    expect(thumb).toHaveClass('opacity-0')
    expect(
      Array.from(thumb.classList).some(cls => cls.includes('group-hover'))
    ).toBe(true)
  })

  it('つまみをドラッグするとコンテンツの表示位置が移動量に応じて更新される', () => {
    mockScrollMetrics(1000, 300)
    render(
      <RootFolderTabBar
        activePath="/work"
        onAdd={vi.fn()}
        onClose={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        tabs={TABS}
      />
    )

    const tablist = screen.getByRole('tablist')
    const thumb = screen.getByTestId('tab-scrollbar-thumb')

    fireEvent.mouseDown(thumb, { clientX: 0 })
    fireEvent.mouseMove(window, { clientX: 30 })
    fireEvent.mouseUp(window)

    // deltaX(30) * (scrollWidth/clientWidth = 1000/300) ≈ 100
    expect(getScrollLeft(tablist)).toBeCloseTo(100, 0)
  })

  it('オーバーフロー時、縦方向のマウスホイールで横スクロールできる', () => {
    mockScrollMetrics(1000, 300)
    render(
      <RootFolderTabBar
        activePath="/work"
        onAdd={vi.fn()}
        onClose={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        tabs={TABS}
      />
    )

    const tablist = screen.getByRole('tablist')
    fireEvent.wheel(tablist, { deltaX: 0, deltaY: 50 })

    expect(getScrollLeft(tablist)).toBe(50)
  })

  it('オーバーフロー時、トラックパッドの横スワイプ(deltaX)でも横スクロールできる', () => {
    mockScrollMetrics(1000, 300)
    render(
      <RootFolderTabBar
        activePath="/work"
        onAdd={vi.fn()}
        onClose={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        tabs={TABS}
      />
    )

    const tablist = screen.getByRole('tablist')
    fireEvent.wheel(tablist, { deltaX: 50, deltaY: 10 })

    // deltaXが優勢な場合はdeltaXを採用する(ネイティブスクロールは存在しないため
    // 縦横どちらの入力方式でも自前でスクロールを処理する必要がある)
    expect(getScrollLeft(tablist)).toBe(50)
  })

  it('コンテンツが収まっている場合はホイールで横スクロールしない', () => {
    mockScrollMetrics(300, 300)
    render(
      <RootFolderTabBar
        activePath="/work"
        onAdd={vi.fn()}
        onClose={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        tabs={TABS}
      />
    )

    const tablist = screen.getByRole('tablist')
    fireEvent.wheel(tablist, { deltaX: 0, deltaY: 50 })

    expect(getScrollLeft(tablist)).toBe(0)
  })

  it('タブ一覧の外側(つまみや追加ボタン付近)にカーソルがあってもホイールで横スクロールできる', () => {
    mockScrollMetrics(1000, 300)
    render(
      <RootFolderTabBar
        activePath="/work"
        onAdd={vi.fn()}
        onClose={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        tabs={TABS}
      />
    )

    const tablist = screen.getByRole('tablist')
    const thumb = screen.getByTestId('tab-scrollbar-thumb')
    // つまみはタブ一覧の兄弟要素なので、つまみ上で発生したホイールイベントは
    // タブ一覧自身にはバブリングしない。外側ラッパーで拾えているか検証する。
    fireEvent.wheel(thumb, { deltaX: 0, deltaY: 50 })

    expect(getScrollLeft(tablist)).toBe(50)
  })

  it('横スクロールとして処理したホイールイベントはpreventDefaultし、親へのスクロールチェイニングを止める', () => {
    mockScrollMetrics(1000, 300)
    render(
      <RootFolderTabBar
        activePath="/work"
        onAdd={vi.fn()}
        onClose={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        tabs={TABS}
      />
    )

    const tablist = screen.getByRole('tablist')
    // dispatchEvent は cancelable なイベントで preventDefault が呼ばれると false を返す。
    // JSXのonWheelはpassiveリスナーとして登録されpreventDefaultが効かないため、
    // ネイティブの非passiveリスナーで処理できているかをここで検証する。
    const notCancelled = fireEvent.wheel(tablist, { deltaX: 0, deltaY: 50 })

    expect(notCancelled).toBe(false)
  })

  it('コンテンツが収まっていてホイールを処理しない場合はpreventDefaultしない', () => {
    mockScrollMetrics(300, 300)
    render(
      <RootFolderTabBar
        activePath="/work"
        onAdd={vi.fn()}
        onClose={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        tabs={TABS}
      />
    )

    const tablist = screen.getByRole('tablist')
    const notCancelled = fireEvent.wheel(tablist, { deltaX: 0, deltaY: 50 })

    expect(notCancelled).toBe(true)
  })

  it('タブはドラッグ&ドロップで並べ替えられるようdraggableを持つ', () => {
    render(
      <RootFolderTabBar
        activePath="/work"
        onAdd={vi.fn()}
        onClose={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        tabs={TABS}
      />
    )

    const tab = screen.getByRole('tab', { name: /work/ })
    expect(tab).toHaveAttribute('draggable', 'true')
  })

  it('タブをドラッグして別のタブにドロップするとonReorderが移動元・移動先のパスで呼ばれる', () => {
    const onReorder = vi.fn()
    render(
      <RootFolderTabBar
        activePath="/work"
        onAdd={vi.fn()}
        onClose={vi.fn()}
        onReorder={onReorder}
        onSelect={vi.fn()}
        tabs={TABS}
      />
    )

    const source = screen.getByRole('tab', { name: /work/ })
    const target = screen.getByRole('tab', { name: /personal/ })
    const dataTransfer = createDataTransfer()

    fireEvent.dragStart(source, { dataTransfer })
    fireEvent.dragOver(target, { dataTransfer })
    fireEvent.drop(target, { dataTransfer })

    expect(onReorder).toHaveBeenCalledWith('/work', '/personal')
  })

  it('同じタブにドロップした場合はonReorderを呼ばない', () => {
    const onReorder = vi.fn()
    render(
      <RootFolderTabBar
        activePath="/work"
        onAdd={vi.fn()}
        onClose={vi.fn()}
        onReorder={onReorder}
        onSelect={vi.fn()}
        tabs={TABS}
      />
    )

    const source = screen.getByRole('tab', { name: /work/ })
    const dataTransfer = createDataTransfer()

    fireEvent.dragStart(source, { dataTransfer })
    fireEvent.dragOver(source, { dataTransfer })
    fireEvent.drop(source, { dataTransfer })

    expect(onReorder).not.toHaveBeenCalled()
  })

  it('タブのドラッグ中に対象タブへドラッグオーバーすると視覚的なフィードバックのクラスが付く', () => {
    render(
      <RootFolderTabBar
        activePath="/work"
        onAdd={vi.fn()}
        onClose={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        tabs={TABS}
      />
    )

    const source = screen.getByRole('tab', { name: /work/ })
    const target = screen.getByRole('tab', { name: /personal/ })
    const dataTransfer = createDataTransfer()

    fireEvent.dragStart(source, { dataTransfer })
    expect(source).toHaveClass('opacity-40')

    fireEvent.dragOver(target, { dataTransfer })
    expect(target).toHaveClass('bg-accent/60')

    fireEvent.drop(target, { dataTransfer })
    expect(source).not.toHaveClass('opacity-40')
    expect(target).not.toHaveClass('bg-accent/60')
  })

  it('ドラッグオーバー時にpreventDefaultしてドロップを許可する', () => {
    render(
      <RootFolderTabBar
        activePath="/work"
        onAdd={vi.fn()}
        onClose={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        tabs={TABS}
      />
    )

    const target = screen.getByRole('tab', { name: /personal/ })
    const notCancelled = fireEvent.dragOver(target, {
      dataTransfer: createDataTransfer(),
    })

    expect(notCancelled).toBe(false)
  })

  it('タブの閉じるボタンはドラッグの起点にならないようdraggable=falseを持つ', () => {
    render(
      <RootFolderTabBar
        activePath="/work"
        onAdd={vi.fn()}
        onClose={vi.fn()}
        onReorder={vi.fn()}
        onSelect={vi.fn()}
        tabs={TABS}
      />
    )

    const closeButton = screen.getByRole('button', { name: /close.*work/i })
    expect(closeButton).toHaveAttribute('draggable', 'false')
  })
})
