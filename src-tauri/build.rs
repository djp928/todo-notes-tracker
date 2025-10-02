fn main() {
    // Skip icon generation to avoid file not found errors during development and CI
    if std::env::var("CI").is_ok() || std::env::var("GITHUB_ACTIONS").is_ok() {
        std::env::set_var("TAURI_SKIP_ICON_GENERATION", "true");
    }
    tauri_build::build()
}
