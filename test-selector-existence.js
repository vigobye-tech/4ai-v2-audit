/**
 * ULTRA SIMPLE SELECTOR TEST 
 * Test czy selektory dla AI services w ogóle istnieją
 */

const { invoke } = window.__TAURI__.tauri;

async function testSelectorExistence() {
    console.log('🔍 TESTING SELECTOR EXISTENCE');
    
    const services = {
        claude: {
            url: 'https://claude.ai/',
            selectors: ['.ProseMirror', '.font-claude-message', '[data-testid*="message"]']
        },
        chatgpt: {
            url: 'https://chat.openai.com/',
            selectors: ['[data-message-author-role="assistant"]', '.markdown', '.prose']
        },
        gemini: {
            url: 'https://gemini.google.com/',
            selectors: ['.model-response-text', '.rich-text-formatted', '[data-response-chunk]']
        }
    };
    
    for (const [service, config] of Object.entries(services)) {
        console.log(`\n🤖 Testing ${service} selectors...`);
        
        try {
            const testLabel = `selector_test_${service}_${Date.now()}`;
            
            // Create WebView for service
            await invoke('create_webview', {
                label: testLabel,
                url: config.url
            });
            
            console.log(`✅ ${service} WebView created`);
            
            // Wait for load
            await new Promise(resolve => setTimeout(resolve, 8000));
            
            // Test each selector
            for (const selector of config.selectors) {
                const result = await invoke('inject_script', {
                    label: testLabel,
                    script: `
                        (function() {
                            console.log('[SELECTOR TEST] Testing: ${selector}');
                            const elements = document.querySelectorAll('${selector}');
                            console.log('[SELECTOR TEST] Found', elements.length, 'elements for', '${selector}');
                            
                            if (elements.length > 0) {
                                console.log('[SELECTOR TEST] First element:', elements[0]);
                                console.log('[SELECTOR TEST] Text content length:', elements[0].textContent ? elements[0].textContent.length : 0);
                            }
                            
                            return '${selector}:' + elements.length;
                        })();
                    `
                }).catch(err => `ERROR: ${err}`);
                
                console.log(`  ${selector}: ${result}`);
            }
            
            // Cleanup
            await invoke('close_webview', { label: testLabel });
            
        } catch (error) {
            console.error(`❌ ${service} test failed:`, error);
        }
        
        // Wait between services
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('🏁 SELECTOR EXISTENCE TEST COMPLETED');
}

// Run immediately if Tauri available
if (typeof window !== 'undefined' && window.__TAURI__) {
    console.log('🚀 Running selector existence test...');
    setTimeout(testSelectorExistence, 5000);
} else {
    console.log('⏳ Waiting for Tauri...');
}

window.testSelectorExistence = testSelectorExistence;