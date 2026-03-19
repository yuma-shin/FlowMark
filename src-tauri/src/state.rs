use std::collections::HashMap;
use parking_lot::Mutex;

/// ファイルウォッチャーのハンドル
pub struct WatcherHandle {
    pub _watcher: Box<dyn std::any::Any + Send>,
}

/// アプリケーション全体の共有状態
pub struct AppState {
    /// ファイルパス → ウォッチャーハンドルのマップ
    pub watchers: Mutex<HashMap<String, WatcherHandle>>,
}
