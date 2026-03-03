fn main() {
    // Build WASM module before Tauri
    if std::env::var("PROFILE").unwrap_or_default() == "release" {
        println!("cargo:warning=Building WASM module for production...");

        // Use CARGO_MANIFEST_DIR to get the correct workspace path
        let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR not set");
        let workspace_root = std::path::Path::new(&manifest_dir)
            .parent()
            .expect("workspace root not found");
        let wasm_dir = workspace_root.join("luminafast-wasm");

        let wasm_build_output = std::process::Command::new("wasm-pack")
            .args([
                "build",
                wasm_dir.to_str().expect("WASM dir path is invalid UTF-8"),
                "--target",
                "web",
                "--release",
            ])
            .output();

        match wasm_build_output {
            Ok(output) => {
                if !output.status.success() {
                    println!("cargo:warning=WASM build failed (this is OK for dev builds)");
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    println!("cargo:warning=Error: {}", stderr);
                }
            }
            Err(e) => {
                println!(
                    "cargo:warning=Could not execute wasm-pack: {} (development build OK)",
                    e
                );
            }
        }
    }

    tauri_build::build()
}
