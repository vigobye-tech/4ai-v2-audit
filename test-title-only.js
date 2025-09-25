/**
 * ULTRA PROSTÝ TEST - tylko title communication
 */

console.log('🧪 TITLE ONLY TEST - START');

async function titleOnlyTest() {
    console.log('⏳ Waiting for Tauri...');
    
    while (!window.__TAURI__?.invoke) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const { invoke } = window.__TAURI__;
    console.log('✅ Tauri ready');
    
    try {
        // 1. Create webview
        const label = `title-test-${Date.now()}`;
        console.log('🔧 Creating webview:', label);
        
        await invoke('create_webview', {
            label: label,
            url: 'https://www.google.com',
            width: 600,
            height: 400
        });
        
        console.log('✅ Webview created');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 2. Inject VERY simple title script
        console.log('📝 Injecting title script...');
        
        const titleScript = `
            console.log('[TITLE TEST] Script injected');
            document.title = 'TEST_SIGNAL_1_' + Date.now();
            console.log('[TITLE TEST] Title set to:', document.title);
            
            setTimeout(() => {
                document.title = 'TEST_SIGNAL_2_' + Date.now();
                console.log('[TITLE TEST] Title changed to:', document.title);
            }, 1000);
            
            setTimeout(() => {
                document.title = '4AI_COMPLETE_123_' + Date.now();
                console.log('[TITLE TEST] Completion signal sent:', document.title);
            }, 2000);
        `;
        
        await invoke('inject_script', { label, script: titleScript });
        console.log('✅ Script injected');
        
        // 3. Test wait_for_response_event with SHORT timeout
        console.log('⏳ Testing response monitoring (5 seconds)...');
        
        const startTime = Date.now();
        
        try {
            const result = await invoke('wait_for_response_event', {
                label: label,
                timeoutMs: 5000 // Only 5 seconds
            });
            
            const duration = Date.now() - startTime;
            console.log('✅ SUCCESS! Result:', result);
            console.log('⏱️ Duration:', duration + 'ms');
            
        } catch (error) {
            const duration = Date.now() - startTime;
            console.log('❌ FAILED! Error:', error);
            console.log('⏱️ Duration:', duration + 'ms');
        }
        
        // Cleanup
        await invoke('close_webview', { label });
        console.log('🧹 Cleaned up');
        
    } catch (error) {
        console.error('❌ Test error:', error);
    }
}

// Run immediately
titleOnlyTest();

// Make available globally
window.titleOnlyTest = titleOnlyTest;