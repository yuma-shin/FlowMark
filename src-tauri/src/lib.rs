mod commands;
mod state;

use std::collections::HashMap;
use parking_lot::Mutex;
use tauri::Manager;

pub use state::AppState;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // フォーカスをメインウィンドウに戻す
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .manage(AppState {
            watchers: Mutex::new(HashMap::new()),
        })
        .setup(|app| {
            // アプリアイコンをウィンドウに設定（dev モードでも正しいアイコンが表示されるよう埋め込む）
            if let Some(main_window) = app.get_webview_window("main") {
                let icon_bytes = include_bytes!("../../src/resources/build/icons/dark/png/128x128.png");
                if let Ok(icon) = tauri::image::Image::from_bytes(icon_bytes) {
                    let _ = main_window.set_icon(icon);
                }
            }

            // メインウィンドウが閉じられたらアプリ全体を終了する
            // （エディタウィンドウなどサブウィンドウも一緒に閉じる）
            let app_handle = app.handle().clone();
            if let Some(main_window) = app.get_webview_window("main") {
                main_window.on_window_event(move |event| {
                    if let tauri::WindowEvent::Destroyed = event {
                        app_handle.exit(0);
                    }
                });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Markdown コマンド
            commands::markdown::select_root_folder,
            commands::markdown::check_root_exists,
            commands::markdown::scan_notes_and_build_folder_tree,
            commands::markdown::get_note_content,
            commands::markdown::save_note,
            commands::markdown::create_note,
            commands::markdown::rename_note,
            commands::markdown::delete_note,
            commands::markdown::move_note,
            commands::markdown::create_folder,
            commands::markdown::delete_folder,
            commands::markdown::watch_file,
            commands::markdown::unwatch_file,
            // 画像コマンド
            commands::image::save_image_from_file,
            commands::image::save_image_from_buffer,
            commands::image::select_image_file,
            commands::image::cleanup_unused_images,
            commands::image::cleanup_all_unused_images,
            commands::image::delete_note_images,
            commands::image::read_image_as_base64,
            // エクスポートコマンド
            commands::export::export_html,
            commands::export::export_pdf,
            commands::export::open_print_window,
            // ウィンドウコマンド
            commands::window::open_note_window,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                // アプリ終了前の未使用画像クリーンアップは非同期で実行
                // クリーンアップが完了したら終了
                let _ = api;
                let _ = app;
            }
        })
}
