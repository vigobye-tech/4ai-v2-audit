/**
 * SIMPLE TITLE COMMUNICATION TEST
 * Test komunikacji JavaScript ↔ Rust przez document.title
 */

const { invoke } = window.__TAURI__.tauri;

async function testTitleCommunication() {
    console.log('🧪 STARTING TITLE COMMUNICATION TEST');
    
    try {
        // Create test WebView
        const testLabel = `title_test_${Date.now()}`;
        console.log('Creating test WebView:', testLabel);
        
        const result = await invoke('create_webview', {
            label: testLabel,
            url: 'data:text/html,<html><body><h1>Title Test</h1><div id="content">Testing title communication...</div></body></html>'
        });
        
        console.log('WebView created, waiting 3 seconds...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Test 1: Simple title setting
        console.log('🔧 TEST 1: Simple title setting');
        const simpleTest = await invoke('inject_script', {
            label: testLabel,
            script: `
                console.log('[TITLE TEST] Setting simple title...');
                document.title = 'SIMPLE_TEST_' + Date.now();
                console.log('[TITLE TEST] Title set to:', document.title);
                'TEST_1_COMPLETE';
            `
        });
        
        console.log('Test 1 result:', simpleTest);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test 2: 4AI completion signal simulation
        console.log('🔧 TEST 2: 4AI completion signal');
        const completionTest = await invoke('inject_script', {
            label: testLabel,
            script: `
                console.log('[TITLE TEST] Setting 4AI completion signal...');
                document.title = '4AI_COMPLETE_TEST_claude_1234_' + Date.now();
                console.log('[TITLE TEST] Completion title set to:', document.title);
                'TEST_2_COMPLETE';
            `
        });
        
        console.log('Test 2 result:', completionTest);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test 3: Read title from Rust side
        console.log('🔧 TEST 3: Reading title from Rust');
        const titleReadTest = await invoke('get_text_content', {
            label: testLabel,
            selector: 'body'
        }).catch(err => 'ERROR: ' + err);
        
        console.log('Test 3 result:', titleReadTest);
        
        // Test 4: Use wait_for_response_event with title signal
        console.log('🔧 TEST 4: wait_for_response_event with title signal');
        
        // Set up monitoring before triggering signal
        setTimeout(async () => {
            console.log('Setting up delayed title signal...');
            await invoke('inject_script', {
                label: testLabel,
                script: `
                    setTimeout(() => {
                        console.log('[TITLE TEST] Setting delayed completion signal...');
                        document.title = '4AI_COMPLETE_DELAYED_test_5678_' + Date.now();
                        console.log('[TITLE TEST] Delayed signal set:', document.title);
                    }, 2000);
                    'DELAYED_SETUP_COMPLETE';
                `
            });
        }, 1000);
        
        const monitoringResult = await invoke('wait_for_response_event', {
            label: testLabel,
            selector: 'body',
            serviceId: 'test',
            timeoutMs: 10000
        }).catch(err => 'MONITORING_ERROR: ' + err);
        
        console.log('Test 4 result:', monitoringResult);
        
        // Cleanup
        console.log('🧹 Cleaning up test WebView');
        await invoke('close_webview', {
            label: testLabel
        }).catch(err => console.warn('Cleanup warning:', err));
        
        console.log('✅ TITLE COMMUNICATION TEST COMPLETED');
        
        return {
            test1: simpleTest,
            test2: completionTest,
            test3: titleReadTest,
            test4: monitoringResult
        };
        
    } catch (error) {
        console.error('❌ TITLE COMMUNICATION TEST FAILED:', error);
        return { error: error.message };
    }
}

// Run test immediately
if (typeof window !== 'undefined' && window.__TAURI__) {
    console.log('🚀 Auto-running title communication test...');
    setTimeout(testTitleCommunication, 1000);
} else {
    console.log('📝 Title communication test ready (waiting for Tauri)');
}

// Also make it available globally
window.testTitleCommunication = testTitleCommunication;