use serde::{Deserialize, Serialize};
use tauri::{command, AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    pub success: bool,
    pub file_path: Option<String>,
    pub canceled: Option<bool>,
    pub error: Option<String>,
}

#[command]
pub async fn export_html(
    app: AppHandle,
    html: String,
    title: String,
) -> Result<ExportResult, String> {
    let file_name = format!("{}.html", sanitize_file_name(&title));

    let save_path = app.dialog()
        .file()
        .set_file_name(&file_name)
        .add_filter("HTML", &["html"])
        .blocking_save_file();

    let path = match save_path {
        Some(p) => p,
        None => return Ok(ExportResult {
            success: false,
            file_path: None,
            canceled: Some(true),
            error: None,
        }),
    };

    let path_str = path.to_string();
    match tokio::fs::write(&path_str, html.as_bytes()).await {
        Ok(_) => Ok(ExportResult {
            success: true,
            file_path: Some(path_str),
            canceled: None,
            error: None,
        }),
        Err(e) => Ok(ExportResult {
            success: false,
            file_path: None,
            canceled: None,
            error: Some(e.to_string()),
        }),
    }
}

/// PDF エクスポート（ヘッドレス Edge 経由）。
///
/// ファイル保存ダイアログで保存先を取得し、HTML をテンポラリファイルに書き出した後、
/// システムにインストール済みの Microsoft Edge を `--headless=new --print-to-pdf` で起動して
/// 印刷ダイアログなしに直接 PDF を生成する。
/// Edge は Windows 10 / 11 にプリインストールされているため追加の依存なしに利用できる。
#[command]
pub async fn export_pdf(
    app: AppHandle,
    html: String,
    title: String,
) -> Result<ExportResult, String> {
    let file_name = format!("{}.pdf", sanitize_file_name(&title));

    let save_path = app.dialog()
        .file()
        .set_file_name(&file_name)
        .add_filter("PDF", &["pdf"])
        .blocking_save_file();

    let pdf_path = match save_path {
        Some(p) => p.to_string(),
        None => return Ok(ExportResult {
            success: false,
            file_path: None,
            canceled: Some(true),
            error: None,
        }),
    };

    // HTML をテンポラリファイルに書き出す
    let temp_html = std::env::temp_dir().join("notyra_export.html");
    tokio::fs::write(&temp_html, html.as_bytes())
        .await
        .map_err(|e| format!("HTML の一時ファイル書き出しに失敗しました: {}", e))?;

    // file:// URL に変換（Windows は C:\... → file:///C:/...）
    let html_abs = temp_html.to_string_lossy().replace('\\', "/");
    let html_url = format!("file:///{}", html_abs.trim_start_matches('/'));

    // msedge.exe のパスを探す
    let edge_exe = find_edge_exe()
        .ok_or_else(|| "Microsoft Edge が見つかりません。Edge がインストールされているか確認してください。".to_string())?;

    // ヘッドレス Edge で PDF を生成
    let output = tokio::process::Command::new(&edge_exe)
        .args([
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            "--run-all-compositor-stages-before-draw",
            "--print-background",
            "--print-to-pdf-no-header",
            &format!("--print-to-pdf={}", pdf_path),
            &html_url,
        ])
        .output()
        .await
        .map_err(|e| format!("Edge の起動に失敗しました: {}", e))?;

    // PDF が実際に生成されたか確認
    if std::path::Path::new(&pdf_path).exists() {
        Ok(ExportResult {
            success: true,
            file_path: Some(pdf_path),
            canceled: None,
            error: None,
        })
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Ok(ExportResult {
            success: false,
            file_path: None,
            canceled: None,
            error: Some(format!("PDF 生成に失敗しました: {}", stderr.trim())),
        })
    }
}

/// Microsoft Edge の実行ファイルパスを探す。
/// Windows 10 / 11 では標準インストール先の複数パスを確認する。
fn find_edge_exe() -> Option<std::path::PathBuf> {
    let bases: Vec<String> = [
        std::env::var("PROGRAMFILES(X86)").ok(),
        std::env::var("PROGRAMFILES").ok(),
        std::env::var("LOCALAPPDATA").ok(),
    ]
    .into_iter()
    .flatten()
    .collect();

    for base in bases {
        let path = std::path::PathBuf::from(base)
            .join("Microsoft")
            .join("Edge")
            .join("Application")
            .join("msedge.exe");
        if path.exists() {
            return Some(path);
        }
    }
    None
}

/// PDF エクスポート用の独立したプレビューウィンドウを開く（フォールバック用）。
///
/// `export_pdf` が利用できない環境向けのフォールバックとして残す。
/// HTML をテンポラリファイルに書き出し、別の `WebviewWindow` で OS 印刷ダイアログを開く。
#[command]
pub async fn open_print_window(
    app: AppHandle,
    html: String,
    title: String,
) -> Result<(), String> {
    let temp_file = std::env::temp_dir().join("notyra_print.html");
    tokio::fs::write(&temp_file, &html)
        .await
        .map_err(|e| e.to_string())?;

    let file_path = temp_file.to_string_lossy();
    let file_url = if cfg!(target_os = "windows") {
        format!("file:///{}", file_path.replace('\\', "/"))
    } else {
        format!("file://{}", file_path)
    };

    let init_script = r#"
        window.addEventListener('load', function() {
            setTimeout(function() {
                window.print();
            }, 500);
            window.addEventListener('afterprint', function() {
                window.close();
            }, { once: true });
        });
    "#;

    if let Some(old_win) = app.get_webview_window("print-preview") {
        let _ = old_win.close();
    }

    WebviewWindowBuilder::new(
        &app,
        "print-preview",
        WebviewUrl::External(
            file_url
                .parse()
                .map_err(|e: url::ParseError| e.to_string())?,
        ),
    )
    .title(format!("{} — 印刷プレビュー", title))
    .inner_size(1050.0, 850.0)
    .center()
    .initialization_script(init_script)
    .build()
    .map(|_| ())
    .map_err(|e| e.to_string())
}

fn sanitize_file_name(name: &str) -> String {
    name.chars()
        .map(|c| match c {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            c => c,
        })
        .collect()
}
