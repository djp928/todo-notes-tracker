fn main() {
    // Force skip icon generation in all cases to avoid CI issues
    std::env::set_var("TAURI_SKIP_ICON_GENERATION", "true");
    std::env::set_var("TAURI_SKIP_DEVTOOLS_CHECK", "true");

    // Print environment for debugging
    if std::env::var("CI").is_ok() {
        println!("cargo:warning=Building in CI environment");
        println!(
            "cargo:warning=TAURI_SKIP_ICON_GENERATION={}",
            std::env::var("TAURI_SKIP_ICON_GENERATION").unwrap_or_default()
        );
    }

    tauri_build::build()
}
