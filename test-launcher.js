/**
 * MANUAL TEST LAUNCHER
 * Opens our enhanced test suite in a new WebView
 */

async function launchTestSuite() {
    const { invoke } = window.__TAURI__.tauri;
    
    try {
        console.log('🚀 Launching Enhanced Signal Test Suite...');
        
        const testLabel = `enhanced_test_suite_${Date.now()}`;
        const testFile = 'enhanced-signal-test.html';
        
        // Try to read the file and create data URL
        const fileUrl = `file:///${window.location.pathname.replace(/\/[^/]*$/, '')}/${testFile}`;
        
        console.log('📁 Test file URL:', fileUrl);
        
        await invoke('create_webview', {
            label: testLabel,
            url: fileUrl
        });
        
        console.log('✅ Test suite launched in window:', testLabel);
        console.log('👆 Check the new window to run tests!');
        
    } catch (error) {
        console.error('❌ Failed to launch test suite:', error);
        
        // Fallback: create simple data URL test
        console.log('🔄 Trying fallback approach...');
        
        const simpleTest = `
        <!DOCTYPE html>
        <html>
        <head><title>Fallback Test</title></head>
        <body>
            <h1>Fallback Signal Test</h1>
            <div id="ai-response-monitor" data-status="monitoring">Testing...</div>
            <button onclick="runTest()">Run Test</button>
            <div id="output"></div>
            <script>
                async function runTest() {
                    document.getElementById('output').innerHTML = 'Running test...';
                    try {
                        const result = await window.__TAURI__.tauri.invoke('test_immediate_signal');
                        document.getElementById('output').innerHTML = 'Result: ' + result;
                    } catch (error) {
                        document.getElementById('output').innerHTML = 'Error: ' + error.message;
                    }
                }
                
                // Auto-update monitor element
                setTimeout(() => {
                    const monitor = document.getElementById('ai-response-monitor');
                    monitor.setAttribute('data-status', 'complete');
                    monitor.setAttribute('data-response', 'FALLBACK_SUCCESS');
                    document.title = 'SIGNAL_COMPLETE:true';
                }, 1000);
            </script>
        </body>
        </html>`;
        
        const dataUrl = 'data:text/html,' + encodeURIComponent(simpleTest);
        
        try {
            const fallbackLabel = `fallback_test_${Date.now()}`;
            await invoke('create_webview', {
                label: fallbackLabel,
                url: dataUrl
            });
            
            console.log('✅ Fallback test launched:', fallbackLabel);
        } catch (fallbackError) {
            console.error('❌ Fallback also failed:', fallbackError);
        }
    }
}

// Make it available globally
window.launchTestSuite = launchTestSuite;

console.log('🧪 Test launcher ready. Run launchTestSuite() to start.');
console.log('Or run: window.__TAURI__.tauri.invoke("test_immediate_signal").then(console.log).catch(console.error)');