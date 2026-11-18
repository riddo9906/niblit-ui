#[tauri::command]
fn desktop_binding() -> Result<String, String> {
    std::env::var("NIBLIT_DESKTOP_BINDING").map_err(|_| "Start this desktop through its owning Niblit launcher".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![desktop_binding])
        .run(tauri::generate_context!())
        .expect("error while running Niblit desktop shell");
}
