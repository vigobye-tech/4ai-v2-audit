console.log('🧪 SIMPLE MONITORING TEST - START');

// Ensure Tauri is available
function waitForTauri() {
    return new Promise((resolve) => {
        const checkTauri = () => {
            if (window.__TAURI__ && window.__TAURI__.invoke) {
                console.log('✅ Tauri API available');
                resolve();
            } else {
                console.log('⏳ Waiting for Tauri API...');
                setTimeout(checkTauri, 100);
            }
        };
        checkTauri();
    });
}

async function testSimpleMonitoring() {
    try {
        await waitForTauri();
        
        const { invoke } = window.__TAURI__;
        
        console.log('🔧 Creating test webview...');
        
        // Create webview
        const label = `test-simple-${Date.now()}`;
        await invoke('create_webview', {
            label: label,
            url: 'https://claude.ai',
            width: 800,
            height: 600
        });
        
        console.log('✅ Webview created:', label);
        
        // Wait a bit for webview to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Inject a simple title-changing script
        console.log('📝 Injecting simple test script...');
        
        const testScript = `
            console.log('[TEST] Simple script injected');
            // Simulate monitor installation
            document.title = 'MONITOR_INSTALLED_' + Date.now();
            
            setTimeout(() => {
                document.title = 'MONITOR_CHECKING_1_' + Date.now();
            }, 1000);
            
            setTimeout(() => {
                document.title = 'MONITOR_PROGRESS_50_' + Date.now();
            }, 2000);
            
            setTimeout(() => {
                document.title = '4AI_COMPLETE_100_' + Date.now();
            }, 3000);
        `;
        
        await invoke('inject_script', {
            label: label,
            script: testScript
        });
        
        console.log('✅ Test script injected');
        
        // Now test wait_for_response_event
        console.log('⏳ Testing wait_for_response_event...');
        
        const startTime = Date.now();
        
        try {
            const result = await invoke('wait_for_response_event', {
                label: label,
                timeoutMs: 10000 // 10 seconds only
            });
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            console.log('✅ wait_for_response_event result:', result);
            console.log('⏱️ Duration:', duration + 'ms');
            
        } catch (error) {
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            console.log('❌ wait_for_response_event failed:', error);
            console.log('⏱️ Duration:', duration + 'ms');
        }
        
        // Cleanup
        await invoke('close_webview', { label: label });
        console.log('🧹 Webview closed');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run test when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testSimpleMonitoring);
} else {
    testSimpleMonitoring();
}

// Also make it available globally
window.testSimpleMonitoring = testSimpleMonitoring;

console.log('🧪 SIMPLE MONITORING TEST - READY');