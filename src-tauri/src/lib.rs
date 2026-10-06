// Masaüstü uygulaması: derlenmiş web uygulamasını (dist) yerel bir pencerede açar.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .run(tauri::generate_context!())
    .expect("Göz Egzersiz başlatılamadı");
}
