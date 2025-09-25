/**
 * MANUAL TEST RUNNER
 * Tworzy WebView z naszym testem i uruchamia go
 */

const { invoke } = window.__TAURI__.tauri;

async function runManualTest() {
    console.log('🔧 Creating test WebView...');
    
    try {
        // Utwórz WebView z naszym testem
        const testLabel = `manual_test_${Date.now()}`;
        const testUrl = `file:///${__dirname.replace(/\\/g, '/')}/simple-test.html`;
        
        console.log('📍 Test URL:', testUrl);
        
        await invoke('create_webview', {
            label: testLabel,
            url: testUrl
        });
        
        console.log('✅ Test WebView created:', testLabel);
        console.log('👆 Check the new window to run the test!');
        
        return testLabel;
        
    } catch (error) {
        console.error('❌ Failed to create test WebView:', error);
        throw error;
    }
}

// Export for console access
window.runManualTest = runManualTest;

console.log('🧪 Manual test ready. Run window.runManualTest() to start.');