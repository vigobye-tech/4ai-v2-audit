/**
 * IMMEDIATE TITLE TEST
 * Test title communication natychmiast po załadowaniu aplikacji
 */

console.log('🧪 IMMEDIATE TITLE TEST - START');

// Funkcja do testowania komunikacji przez title
async function immediateTestTitleCommunication() {
    const { invoke } = window.__TAURI__.tauri;
    
    try {
        console.log('🔧 Creating test WebView for title communication...');
        
        // Utwórz test WebView
        const testLabel = `immediate_title_test_${Date.now()}`;
        
        await invoke('create_webview', {
            label: testLabel,
            url: 'data:text/html,<html><head><title>Title Test</title></head><body><h1>Title Communication Test</h1><p>Testing...</p></body></html>'
        });
        
        console.log('✅ Test WebView created:', testLabel);
        
        // Poczekaj 2 sekundy na załadowanie
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('🧪 Running title communication test...');
        
        // Uruchom test komunikacji przez title
        const result = await invoke('test_title_communication', {
            label: testLabel
        });
        
        console.log('📊 TITLE COMMUNICATION TEST RESULT:', result);
        
        // Sprawdź czy test zakończył się sukcesem
        if (result.includes('HAS_SIGNAL:true')) {
            console.log('🎉 SUCCESS: Title communication is working!');
        } else {
            console.log('⚠️ WARNING: Title communication may have issues');
        }
        
        // Cleanup
        await invoke('close_webview', { label: testLabel });
        console.log('🧹 Test WebView cleaned up');
        
        return result;
        
    } catch (error) {
        console.error('❌ IMMEDIATE TITLE TEST FAILED:', error);
        return 'ERROR: ' + error.message;
    }
}

// Uruchom test natychmiast gdy Tauri będzie dostępne
if (typeof window !== 'undefined' && window.__TAURI__) {
    console.log('🚀 Tauri detected, running immediate title test...');
    setTimeout(immediateTestTitleCommunication, 3000);
} else {
    console.log('⏳ Waiting for Tauri to be available...');
    const checkTauri = setInterval(() => {
        if (window.__TAURI__) {
            clearInterval(checkTauri);
            console.log('🚀 Tauri now available, running title test...');
            setTimeout(immediateTestTitleCommunication, 1000);
        }
    }, 500);
}

// Dostępne globalnie
window.immediateTestTitleCommunication = immediateTestTitleCommunication;