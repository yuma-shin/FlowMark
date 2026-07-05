use font_kit::source::SystemSource;
use std::collections::HashSet;
use tauri::command;

#[command]
pub fn list_system_fonts() -> Result<Vec<String>, String> {
    let source = SystemSource::new();
    let families = source
        .all_families()
        .map_err(|e| format!("Failed to enumerate fonts: {:?}", e))?;

    // Deduplicate case-insensitively
    let mut seen: HashSet<String> = HashSet::new();
    let mut result: Vec<String> = Vec::new();
    for name in families {
        let key = name.to_lowercase();
        if seen.insert(key) {
            result.push(name);
        }
    }

    // Sort case-insensitively
    result.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
    Ok(result)
}
