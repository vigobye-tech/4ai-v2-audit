# 🧪 MANUS TESTING PROTOCOL
**Instrukcje testowe dla weryfikacji chain functionality**

---

## 🎯 CEL TESTÓW
**Weryfikacja:** Czy odpowiedzi z pierwszego AI przechodzą poprawnie do drugiego AI w chain execution

---

## 📋 QUICK TEST PROTOCOL

### **TEST 1: Basic Chain Functionality**
```
⏱️ Czas: ~5 minut
🎯 Cel: Sprawdzenie czy chain działa end-to-end
```

**Kroki:**
1. Uruchom aplikację: `cargo run --manifest-path src-tauri/Cargo.toml`
2. Stwórz prosty chain: **Claude → ChatGPT**
3. Zadaj pytanie: **"czy na księżycu da się żyć?"**
4. Obserwuj konsole output

**Oczekiwany rezultat:**
- ✅ Claude otrzymuje pytanie i odpowiada
- ✅ **Widzisz w console: "Content stability detected"**
- ✅ **Odpowiedź Claude kopiuje się do ChatGPT**
- ✅ ChatGPT kontynuuje dyskusję

**Krytyczne sygnały sukcesu:**
```
[CONTENT MONITOR] Content stability detected - response complete!
[CHAIN DEBUG] Response ready: XXXX chars
4AI_COMPLETE_content_stable_XXXX
```

---

### **TEST 2: CSS Selectors Debugging**
```
⏱️ Czas: ~10 minut  
🎯 Cel: Walidacja aktualnych selektorów DOM
```

**Przygotowanie:**
1. Otwórz `test-chatgpt-selectors.html` (should auto-open)
2. Otwórz ChatGPT w nowej karcie
3. Zadaj pytanie i **poczekaj aż ChatGPT skończy odpowiadać**

**Test selektorów:**
1. Otwórz Developer Console (F12) w ChatGPT
2. Skopiuj i uruchom **KOD 1** z test file:
```javascript
// Test selektorów dla odpowiedzi ChatGPT
const selectors = [
    '[data-message-author-role="assistant"]',
    '.markdown.prose', 
    '[data-testid*="conversation-turn"]',
    '.group',
    'div[data-message-id]',
    '[class*="group/conversation-turn"]',
    'article[data-scroll-anchor]',
    '.prose',
    '.whitespace-pre-wrap'
];

selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    console.log(`Selector: ${selector} -> Found: ${elements.length} elements`);
    if (elements.length > 0) {
        console.log('Text preview:', elements[0].textContent.substring(0, 100));
    }
});
```

**Analiza rezultatów:**
- Zapisz które selektory **ZNAJDĄ ELEMENTY** z tekstem odpowiedzi
- Sprawdź czy text content zawiera odpowiedź ChatGPT
- **Najważniejsze:** Które selektory mają `Found: > 0 elements`

---

### **TEST 3: Real-time Monitoring Debug**
```
⏱️ Czas: ~15 minut
🎯 Cel: Live debugging podczas chain execution
```

**Setup:**
1. Uruchom aplikację w debug mode
2. Przygotuj dwie konsole:
   - **Console 1:** Terminal z cargo run (Rust logs)  
   - **Console 2:** Browser DevTools w AI service (JS logs)

**Test procedure:**
1. Start chain: Claude → ChatGPT
2. **W Console 1 obserwuj:**
```
[CONTENT MONITOR] Starting content stability monitoring
[CONTENT MONITOR] Content growing: 0 -> 150
[CONTENT MONITOR] Content stable for 5 checks
[CONTENT MONITOR] Content stability detected - response complete!
```

3. **W Console 2 (ChatGPT) obserwuj:**
```
[4AI] Starting injection for ChatGPT
[4AI] Set textContent to element: [ODPOWIEDŹ Z CLAUDE]
[4AI] Injection successful
```

**Red flags (błędy do naprawy):**
- ❌ `querySelectorAll error` → Zły selector
- ❌ `MONITOR_ERROR` → Content monitor crash
- ❌ `Comprehensive monitoring timeout` → Detection failed
- ❌ Brak tekstu w ChatGPT input → Chain break

---

## 🔍 DIAGNOSTYKA BŁĘDÓW

### **Problem: CSS Selector Errors**
**Objaw:** `Failed to execute 'querySelectorAll'`
**Fix:**
1. Otwórz `src/lib/contentMonitor.ts`
2. Linijka ~27-35: Popraw selektory dla 'chatgpt'
3. Użyj selektorów które działały w TEST 2
4. Rebuild: `cargo build --manifest-path src-tauri/Cargo.toml`

### **Problem: Content Never Stable**
**Objaw:** `Content growing` bez końca, brak `stability detected`
**Fix:**
1. Zwiększ `STABILITY_THRESHOLD` z 5 na 8 (line 33)
2. Lub zmniejsz `CHECK_INTERVAL` z 1000 na 500ms (line 34)
3. Rebuild i retest

### **Problem: Response Not Copying**
**Objaw:** Claude odpowiada, ale ChatGPT dostaje puste pytanie
**Fix:**
1. Sprawdź czy `window.__4AI_FINAL_RESPONSE` jest created
2. Sprawdź czy signal element `__4AI_SIGNAL_*` exists w DOM
3. Sprawdź czy title contains `4AI_COMPLETE_`

---

## 📊 SUCCESS METRICS

### **Minimum Viable Chain (MVC):**
- [ ] Question copies to first AI (Claude)
- [ ] Claude responds completely  
- [ ] **Response copies to second AI (ChatGPT)**
- [ ] ChatGPT continues conversation
- [ ] No timeout errors
- [ ] Console shows completion signals

### **Bonus Success Indicators:**
- [ ] Fast response detection (<10 seconds)
- [ ] No CSS selector errors
- [ ] Clean console output
- [ ] Multiple chain services work (Claude→ChatGPT→Gemini)

---

## 🚨 ESCALATION PROCEDURE

**Jeśli podstawowy chain nie działa:**

1. **Immediate fixes (try first):**
   - Restart aplikację
   - Clear browser cache
   - Test with different AI services

2. **Code fixes needed:**
   - Update CSS selectors based on TEST 2 results
   - Adjust content stability parameters  
   - Add fallback detection methods

3. **Deep debugging:**
   - Enable verbose logging
   - Manual DOM inspection
   - Step-through debugging w/ breakpoints

---

## 📝 REPORTING TEMPLATE

**Po testach, wypełnij:**

```
MANUS TEST RESULTS - [DATE]

TEST 1 - Basic Chain:
Status: [PASS/FAIL]
Notes: [observations]

TEST 2 - CSS Selectors:
Working selectors: [list]
Broken selectors: [list]  
Recommended updates: [list]

TEST 3 - Real-time Debug:
Chain completion: [SUCCESS/TIMEOUT]
Error messages: [list]
Performance: [fast/slow/acceptable]

OVERALL ASSESSMENT:
Ready for production: [YES/NO]
Critical issues: [list]
Recommended fixes: [list]

NEXT STEPS:
[action items]
```

---

**GOOD LUCK MANUS! 🚀**  
*Ten test protocol powinien dać jasny obraz gdzie jesteśmy i co jeszcze trzeba naprawić.*