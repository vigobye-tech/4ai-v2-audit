# 🎯 WebAI Real-Time Diagnostic System

## Przegląd
System diagnostyczny, który **loguje się do każdego WebAI** i wykonuje rzeczywistą analizę DOM w czasie rzeczywistym. Automatycznie wykrywa zmiany selektorów i może aktualizować konfigurację.

---

## 🚀 Szybki Start

### 1. Instalacja Dependencies
```bash
npm install puppeteer express cors socket.io
```

### 2. Konfiguracja Credentials
```bash
# Skopiuj szablon
copy config\webai-credentials.template.json config\webai-credentials.json

# Edytuj i dodaj prawdziwe dane logowania
notepad config\webai-credentials.json
```

### 3. Pierwsze Uruchomienie
```bash
# Test pojedynczego serwisu (widoczny browser)
node tools/webai-diagnostic.js --service=chatgpt --headless=false

# Pełna diagnostyka (wszystkie serwisy)
node tools/webai-diagnostic.js --auto-update

# Uruchomienie API serwera
node tools/diagnostic-api.js
```

---

## 🎮 Tryby Pracy

### 🔍 **Tryb 1: Quick Health Check**
- **Bez logowania** - tylko testuje obecne selektory
- **Szybki** - 5-10 sekund
- **Bezpieczny** - nie zmienia nic

```bash
node scripts/monitor-webai.js
# lub przez API: GET /api/monitor
```

### 🎯 **Tryb 2: Full Real-Time Diagnostic**
- **Z logowaniem** - rzeczywiste testy DOM
- **Dokładny** - 2-5 minut na serwis
- **Smart** - może auto-aktualizować selektory

```bash
# Wszystkie serwisy z auto-update
node tools/webai-diagnostic.js --auto-update

# Tylko ChatGPT, widoczny browser
node tools/webai-diagnostic.js --service=chatgpt --headless=false

# Claude z timeout 60s
node tools/webai-diagnostic.js --service=claude --timeout=60000
```

### 🎛️ **Tryb 3: GUI Panel**
- **Wizualny interfejs** - przyciski i progress bary
- **Real-time updates** - WebSocket connection
- **User-friendly** - nie trzeba znać komend

```bash
# Uruchom API server
node tools/diagnostic-api.js

# Otwórz index.html lub dodaj do swojej strony:
# <script src="src/ui/diagnostic-panel.js"></script>
```

---

## 📊 Konfiguracja Credentials

### Szablon credentials (`config/webai-credentials.json`):
```json
{
  "chatgpt": {
    "enabled": true,
    "username": "twoj-email@gmail.com",
    "password": "twoje-haslo",
    "login_url": "https://chat.openai.com/auth/login"
  },
  "claude": {
    "enabled": true, 
    "username": "twoj-email@gmail.com",
    "password": "twoje-haslo",
    "login_url": "https://claude.ai/login"
  },
  "gemini": {
    "enabled": true,
    "username": "twoj-email@gmail.com", 
    "password": "twoje-haslo",
    "login_url": "https://accounts.google.com/signin"
  }
}
```

### ⚠️ **BEZPIECZEŃSTWO:**
1. **Dodaj do .gitignore** - nigdy nie commituj haseł!
2. **Używaj dedykowanych kont** - nie głównych kont
3. **Testuj lokalnie** - przed produkcją

---

## 🔧 Opcje Konfiguracji

### CLI Options:
```bash
--auto-update         # Automatycznie aktualizuj selektory (confidence > 95%)
--service=<name>      # Testuj tylko konkretny serwis
--headless=false      # Pokaż browser (dla debugowania)
--timeout=<ms>        # Custom timeout (default: 30000ms)
```

### Confidence Thresholds:
- **95%+** → Auto-update allowed
- **80-94%** → Manual review required  
- **60-79%** → Investigation needed
- **<60%** → Service likely broken

---

## 📈 Przykładowe Wyniki

### ✅ **Healthy Service (95% confidence):**
```json
{
  "service": "chatgpt",
  "confidence_score": 95,
  "input_selectors": [
    {"found": true, "selector": "#prompt-textarea", "response_time_ms": 234}
  ],
  "recommendations": [],
  "status": "HEALTHY"
}
```

### ⚠️ **Warning Service (75% confidence):**
```json
{
  "service": "claude",
  "confidence_score": 75,
  "input_selectors": [
    {"found": false, "selector": ".old-selector", "suggestions": [
      {"selector": ".new-selector", "confidence": 85}
    ]}
  ],
  "recommendations": [
    {"type": "SUGGESTION", "message": "Consider updating selector"}
  ],
  "status": "WARNING"
}
```

### ❌ **Failed Service (30% confidence):**
```json
{
  "service": "gemini", 
  "confidence_score": 30,
  "recommendations": [
    {"type": "CRITICAL", "message": "Service may be broken - immediate update required"}
  ],
  "status": "FAILED"
}
```

---

## 🔄 Auto-Update Logic

### Kiedy system **AUTOMATYCZNIE** aktualizuje:
1. **Confidence > 95%** - bardzo pewny
2. **Multiple suggestions agree** - kilka alternatyw wskazuje to samo
3. **Selector still functional** - stary jeszcze działa ale może się zepsuć
4. **Auto-update enabled** - `--auto-update` flag

### Kiedy wymaga **MANUAL REVIEW**:
1. **Confidence 80-94%** - dość pewny ale nie 100%
2. **No clear alternatives** - nie ma oczywistych zamienników
3. **Multiple failures** - kilka selektorów nie działa
4. **Security-sensitive changes** - zmiany w logowaniu

### Co system **NIGDY** nie zmieni automatycznie:
1. **Login selectors** - za ryzykowne
2. **Business logic** - może zepsuć workflow
3. **Low confidence** - poniżej 80%

---

## 🎯 Workflow Scenarios

### **Scenario 1: Routine Monday Morning Check**
```bash
# Szybki health check wszystkich serwisów
node scripts/monitor-webai.js

# Jeśli wszystko OK - nic więcej nie trzeba
# Jeśli warning/error - uruchom full diagnostic
node tools/webai-diagnostic.js --auto-update
```

### **Scenario 2: ChatGPT Changed UI** 
```bash
# Specific service diagnosis
node tools/webai-diagnostic.js --service=chatgpt --headless=false

# Obejrzyj browser - co się zmieniło?
# System automatycznie znajdzie nowe selektory
# Jeśli confidence > 95% - auto-update
# Jeśli nie - manual review required
```

### **Scenario 3: Emergency - All Services Down**
```bash
# Full diagnostic wszystkich serwisów
node tools/webai-diagnostic.js --auto-update --timeout=60000

# System spróbuje naprawić automatycznie
# Backup oryginalnej konfiguracji
# Detailed report z recommendations
```

### **Scenario 4: New Team Member Setup**
```bash
# 1. Setup credentials
copy config\webai-credentials.template.json config\webai-credentials.json

# 2. Test one service first
node tools/webai-diagnostic.js --service=chatgpt --headless=false

# 3. If working, test all
node tools/webai-diagnostic.js

# 4. Setup daily monitoring
# Add to cron/task scheduler
```

---

## 📋 API Endpoints

### **REST API** (Port 3001):
```bash
GET  /health                    # Server health check
GET  /api/monitor              # Quick health check (no login)
POST /api/diagnostic           # Full diagnostic (with login)
POST /api/diagnostic/:service  # Service-specific diagnostic
GET  /api/results             # Latest results
GET  /api/history             # Results history
GET  /api/config              # Current selector config
POST /api/config/update       # Update selectors
```

### **WebSocket Events**:
```javascript
// Client -> Server
socket.emit('start_diagnostic', { service: 'chatgpt', autoUpdate: true });

// Server -> Client  
socket.on('diagnostic_progress', (progress) => { ... });
socket.on('diagnostic_complete', (results) => { ... });
socket.on('diagnostic_error', (error) => { ... });
```

---

## 🛠️ Troubleshooting

### **Problem: Login fails**
```bash
# 1. Test with visible browser
node tools/webai-diagnostic.js --service=chatgpt --headless=false

# 2. Check selectors in credentials file
# 3. Check if 2FA is required
# 4. Try different user agent
```

### **Problem: Selectors not found**
```bash
# 1. Check if website changed
# 2. Look at screenshots in /logs/ folder
# 3. Update selectors manually
# 4. Run with suggestions enabled
```

### **Problem: Auto-update too aggressive**
```bash
# 1. Lower confidence threshold in code
# 2. Disable auto-update: remove --auto-update flag
# 3. Use manual review mode
```

### **Problem: Browser crashes**
```bash
# 1. Check Chrome/Chromium installation
# 2. Try with --no-sandbox flag  
# 3. Increase timeout values
# 4. Check system resources
```

---

## 🎉 Success Metrics

Po poprawnej konfiguracji powinieneś zobaczyć:

### ✅ **Healthy System:**
```
🎯 WebAI Real-Time Diagnostic Report
═══════════════════════════════════════
📊 SUMMARY:
✅ Services Tested: 3/3
🔐 Successful Logins: 3/3  
📈 Average Confidence: 94%
🔄 Auto-Updates Applied: 2
⚠️  Manual Reviews Required: 0
❌ Errors Encountered: 0

🎯 NEXT ACTIONS:
✅ All systems healthy - no immediate action required
```

### 🚀 **Production Ready!**

System jest gotowy do:
- Codziennego monitoringu
- Automatycznych napraw  
- Proaktywnego wykrywania problemów
- Integracji z Manus Executor

---

*Real-Time WebAI Diagnostic System v2.0*  
*Powered by 4AI Intelligence*