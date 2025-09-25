# DEBUG TESTING PROTOCOL

## Szybki test diagnostyczny dla nowego developera

### 1. Test podstawowy - czy WebView ładuje strony:
```bash
npm run tauri dev
# Wyślij dowolny prompt w aplikacji
# Sprawdź terminal - powinny pojawić się logi:

[DEBUG] 🌐 URL BEFORE delay: ???
[DEBUG] 🌐 URL AFTER delay: ???

# OCZEKIWANE:
# BEFORE: "about:blank" lub podobne
# AFTER: "https://gemini.google.com" lub inna strona AI

# AKTUALNE (PROBLEM):  
# BEFORE: ()
# AFTER: ()
```

### 2. Test JavaScript execution:
```bash
# W terminalu szukaj:
[DEBUG] ✅ Basic JS test passed: ()
[DEBUG] 📋 Title after script injection: "JS-WORKS-FOR-serviceName"

# OCZEKIWANE: Title powinien się zmienić na "JS-WORKS-FOR-..."
# AKTUALNE (PROBLEM): Title pozostaje "AI-ai-service-pooled-..."
```

### 3. Logi które MUSZĄ się pojawić dla każdego prompta:
```
[DEBUG] inject_script called: label=ai-[service]-pooled-[id], script_length=[number]
[DEBUG] 🌐 URL BEFORE delay: [url]
[DEBUG] Waiting 10 seconds for page to fully load...
[DEBUG] 🌐 URL AFTER delay: [url] 
[DEBUG] ✅ Basic JS test passed: [result]
[DEBUG] Script executed successfully, result: ()
[DEBUG] 📋 Title after script injection: [title]
```

### 4. Jeśli nie widzisz tych logów:
- Aplikacja używa starej wersji kodu
- Zrób: `taskkill /F /PID (Get-NetTCPConnection -LocalPort 1421).OwningProcess`
- Potem: `npm run tauri dev`

## Lokalizacja problemów:

### src-tauri/src/cmd/webview.rs linia 42-64:
```rust
// Tu jest problem z URL loading:
let window_url = WindowUrl::External(url.parse().map_err(|e| format!("Invalid URL: {}", e))?);
WindowBuilder::new(&app, &label, window_url)
    .title(&format!("AI-{}", label))
    .inner_size(900.0, 700.0)
    .visible(true)
    .build()
```

### src-tauri/src/cmd/webview.rs linia 42-78:  
```rust  
// Tu jest test który pokazuje problem:
let url_before = window.eval("window.location.href");
// To zwraca () zamiast URL - WebView nie ładuje strony!
```