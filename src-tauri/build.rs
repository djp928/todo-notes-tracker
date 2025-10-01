fn main() {
    // Skip icon generation to avoid file not found errors during development
    std::env::set_var("TAURI_SKIP_ICON_GENERATION", "true");
    tauri_build::build()
}