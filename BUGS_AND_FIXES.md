# 🚨 4AI V2.0 - LISTA BŁĘDÓW I POPRAWEK

## **KRYTYCZNE BŁĘDY (Priorytet 1 - Natychmiastowa naprawa)**

### **1. BŁĄD: Niewłaściwa obsługa błędów w `webviewChain.ts`**
**Lokalizacja**: `src/lib/webviewChain.ts`, linia 95-96
```typescript
// ❌ BŁĘDNY KOD:
currentPrompt += `\n❌ Chain failed at ${service.name}: ${error}`;
```
**Problem**: Błędy są dodawane do promptu zamiast przerwać wykonanie. Prowadzi to do propagacji błędnych danych przez cały łańcuch AI.

**✅ POPRAWKA**:
```typescript
// Zamiast kontynuować z błędem, przerwij łańcuch
if (error) {
  logger.error('webview', `Chain failed at ${service.name}`, { error: String(error) });
  throw new Error(`Chain execution stopped at ${service.name}: ${error}`);
}
```

### **4. BŁĄD: Niebezpieczne wstrzykiwanie kodu w `debateAuto.ts`**
**Lokalizacja**: `src/lib/debateAuto.ts`, linia 74-78
```typescript
// ❌ BŁĘDNY KOD:
input.value = \`${promptToSend.replace(/`/g, '\\`')}\`;
input.innerHTML = \`${promptToSend.replace(/`/g, '\\`')}\`;
```
**Problem**: Niekompletne escapowanie może prowadzić do XSS i Code Injection.

**✅ POPRAWKA**:
```typescript
// Bezpieczne escapowanie wszystkich znaków specjalnych
const escapedPrompt = promptToSend
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/"/g, '\\"')
  .replace(/'/g, "\\'")
  .replace(/\n/g, '\\n')
  .replace(/\r/g, '\\r');

input.value = escapedPrompt;
input.textContent = escapedPrompt; // Nigdy nie używaj innerHTML dla user input
```

### **5. BŁĄD: Funkcja zwraca niewłaściwy typ w `webview.rs`**
**Lokalizacja**: `src-tauri/src/cmd/webview.rs`, linia 225
```rust
// ❌ BŁĘDNY KOD:
pub async fn get_text_content(...) -> Result<String, String> {
    window.eval(&script).map_err(|e| format!("Eval failed: {}", e))?;
    Ok("OK".to_string())  // ❌ Nie zwraca zawartości!
}
```
**Problem**: Funkcja nazywa się `get_text_content` ale zwraca tylko status, nie zawartość.

**✅ POPRAWKA**:
```rust
pub async fn get_text_content(
    app: tauri::AppHandle,
    label: String,
    selector: String,
) -> Result<String, String> {
    let window = app
        .get_webview_window(&label)
        .ok_or_else(|| "Window not found".to_string())?;

    let script = format!(
        r#"document.querySelector({})?.textContent?.trim() || '';"#,
        serde_json::to_string(&selector).unwrap()
    );

    // Faktycznie pobierz wynik z eval
    let result = window.eval(&script)
        .map_err(|e| format!("Eval failed: {}", e))?;
    
    Ok(result.as_str().unwrap_or("").to_string())
}
```

## **BŁĘDY WYSOKIEGO PRIORYTETU (Priorytet 2 - Naprawa w tym tygodniu)**

### **2. BŁĄD: Memory leak - nieusuwane event listenery w `webview.rs`**
**Lokalizacja**: `src-tauri/src/cmd/webview.rs`, linia 143-148
```rust
// ❌ BŁĘDNY KOD:
let handler = app.listen(event_name.as_str(), move |event| {
    // ... kod
});
// Handler nie jest zawsze usuwany przy timeout
```
**Problem**: Event listenery nie są zawsze usuwane, co prowadzi do memory leaks.

**✅ POPRAWKA**:
```rust
// Dodaj explicit cleanup w finally block
// Wrap w RAII pattern lub zawsze wywołuj unlisten
let handler = app.listen(event_name.as_str(), move |event| {
    // ... kod
});

// Zawsze cleanup, nawet przy błędzie
let cleanup = || {
    app.unlisten(handler);
};

// W każdym return path:
cleanup();
return Ok(result);
```

### **3. BŁĄD: Race condition - niebezpieczne timing w `debateAuto.ts`**
**Lokalizacja**: `src/lib/debateAuto.ts`, linia 64, 104
```typescript
// ❌ BŁĘDNY KOD:
await new Promise(resolve => setTimeout(resolve, 3000));  // Sztywny timeout
await new Promise(resolve => setTimeout(resolve, 15000)); // Kolejny sztywny timeout
```
**Problem**: Sztywne timeouty są nieprzewidywalne dla różnych prędkości połączeń.

**✅ POPRAWKA**:
```typescript
// Dynamiczne oczekiwanie z retry logic
async function waitForPageLoad(label: string, maxRetries = 10): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Sprawdź czy strona jest gotowa
      const isReady = await ipc.injectScript(label, `
        document.readyState === 'complete' && 
        document.querySelector('textarea, input[type="text"]') !== null
      `);
      if (isReady) return;
    } catch (e) {
      // Ignore, retry
    }
    await new Promise(resolve => setTimeout(resolve, 500 * (i + 1))); // Exponential backoff
  }
  throw new Error('Page failed to load after maximum retries');
}
```

### **6. BŁĄD: Deadlock potential - nieprawidłowe zarządzanie Mutex**
**Lokalizacja**: `src-tauri/src/cmd/webview.rs`, linia 201-215
```rust
// ❌ BŁĘDNY KOD:
loop {
    let lock = result.lock().await;  // Mutex lockowany w każdej iteracji
    if let Some(payload) = &*lock {
        return Ok(payload.clone());
    }
}
```
**Problem**: Mutex jest lockowany w każdej iteracji, degradując wydajność.

**✅ POPRAWKA**:
```rust
// Użyj tokio::sync::watch lub Condvar
use tokio::sync::watch;

let (tx, mut rx) = watch::channel(None::<String>);

// W event handler:
let _ = tx.send(Some(payload));

// W głównej pętli:
if let Ok(()) = rx.changed().await {
    if let Some(payload) = rx.borrow().clone() {
        return Ok(payload);
    }
}
```

## **BŁĘDY ŚREDNIEGO PRIORYTETU (Priorytet 3 - Naprawa w przyszłym sprincie)**

### **7. BŁĄD: Niepoprawna logika walidacji odpowiedzi**
**Lokalizacja**: `src/lib/webviewChain.ts`, linia 59-61
```typescript
// ❌ BŁĘDNY KOD:
if (waitResult.toLowerCase().includes('error') || 
    waitResult.toLowerCase().includes('fail'))
```
**Problem**: Każda odpowiedź zawierająca "error" lub "fail" jest traktowana jako błąd.

**✅ POPRAWKA**:
```typescript
// Bardziej precyzyjna walidacja
const isActualError = (response: string): boolean => {
  const errorPatterns = [
    /^error:/i,           // Rozpoczyna się od "error:"
    /\[error\]/i,         // Zawiera [error]
    /exception:/i,        // Zawiera "exception:"
    /^failed to/i         // Rozpoczyna się od "failed to"
  ];
  
  return errorPatterns.some(pattern => pattern.test(response.trim()));
};
```

### **8. BŁĄD: Resource leak - brak cleanup WebViews przy błędach**
**Lokalizacja**: `src/lib/webviewChain.ts`, linia 83-90
```typescript
// ❌ BŁĘDNY KOD:
} catch (error) {
    if (!keepWebViewOpen) {
        try {
            await ipc.closeWebview(label);
        } catch (closeError) {
            // WebView może nie zostać zamknięty
        }
    }
}
```
**Problem**: Jeśli `closeWebview` rzuci błąd, WebView pozostanie otwarty.

**✅ POPRAWKA**:
```typescript
// Bardziej agresywny cleanup z fallback
} catch (error) {
    // Zawsze próbuj zamknąć WebView, niezależnie od keepWebViewOpen przy błędzie
    try {
        await ipc.closeWebview(label);
        logger.info('webview', `Closed WebView ${label} after error`);
    } catch (closeError) {
        logger.warn('webview', `Failed to close WebView ${label}`, { 
          originalError: String(error), 
          closeError: String(closeError) 
        });
        
        // Fallback: spróbuj zamknąć przez Tauri API
        try {
          await invoke('force_close_window', { label });
        } catch (forceCloseError) {
          logger.error('webview', `Force close also failed for ${label}`, { 
            forceCloseError: String(forceCloseError) 
          });
        }
    }
    
    throw error; // Re-throw original error
}
```

## **PLAN NAPRAWCZY**

### **Tydzień 1 (Krytyczne)**
- [ ] Napraw error handling w webviewChain.ts
- [ ] Zabezpiecz injection w debateAuto.ts  
- [ ] Popraw get_text_content w webview.rs

### **Tydzień 2 (Wysokie)**
- [ ] Dodaj cleanup event listenerów
- [ ] Zamień sztywne timeouty na dynamic waiting
- [ ] Refaktoryzuj Mutex handling

### **Tydzień 3 (Średnie)**
- [ ] Ulepsz walidację odpowiedzi
- [ ] Wzmocnij WebView cleanup logic

### **Metryki sukcesu**
- [ ] Wszystkie testy przechodzą
- [ ] Brak memory leaks w `cargo check`
- [ ] Brak race conditions w stress testach
- [ ] Zero XSS vulnerabilities w security scan

---
**Utworzono**: 2025-09-19  
**Status**: W trakcie implementacji  
**Odpowiedzialny**: Development Team