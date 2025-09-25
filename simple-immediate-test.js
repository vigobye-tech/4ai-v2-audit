/**
 * SIMPLE IMMEDIATE TEST
 * Quick test of immediate signal functionality
 */

const { invoke } = window.__TAURI__.tauri;

async function testImmediateSignal() {
    console.log('🧪 Starting immediate signal test...');
    
    try {
        const result = await invoke('test_immediate_signal');
        console.log('📊 Test result:', result);
        
        if (result.includes('DOM_FOUND_') || result.includes('SIGNAL_COMPLETE')) {
            console.log('🎉 SUCCESS: Signal detection working!');
            return true;
        } else {
            console.log('⚠️ WARNING: No clear signal detected');
            console.log('🔍 Full result:', result);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        return false;
    }
}

// Auto-start test
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 DOM loaded, starting test...');
    await testImmediateSignal();
});

// Export for manual testing
window.testImmediateSignal = testImmediateSignal;