use tauri::{command, AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

#[command]
pub async fn open_note_window(app: AppHandle, note_path: String) -> Result<bool, String> {
    let encoded = urlencoding::encode(&note_path).to_string();
    let label = format!(
        "note_{}",
        note_path
            .chars()
            .filter(|c| c.is_alphanumeric() || *c == '_')
            .take(32)
            .collect::<String>()
    );

    // 既にそのラベルのウィンドウが存在する場合はフォーカスのみ
    if let Some(existing) = app.get_webview_window(&label) {
        let _ = existing.set_focus();
        return Ok(true);
    }

    let url = if cfg!(debug_assertions) {
        // 開発モード: Vite dev server の URL を使用
        WebviewUrl::External(
            format!("http://localhost:1420/#/editor?note={}", encoded)
                .parse()
                .map_err(|e: url::ParseError| e.to_string())?,
        )
    } else {
        // 本番ビルド: タウリプロトコルを使用
        WebviewUrl::App(format!("index.html#/editor?note={}", encoded).into())
    };

    WebviewWindowBuilder::new(&app, &label, url)
        .title("Notyra — Editor")
        .decorations(false)
        .inner_size(1200.0, 800.0)
        .min_inner_size(600.0, 400.0)
        .center()
        .build()
        .map(|_| true)
        .map_err(|e| e.to_string())
}
