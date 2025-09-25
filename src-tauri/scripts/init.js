// Initialization script for WebView
(function() {
    console.log('[4AI Lab] WebView initialization script loaded');
    
    // Monitor navigation
    let lastUrl = window.location.href;
    
    // Check URL periodically
    setInterval(() => {
        if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            console.log('[4AI Lab] Navigation detected:', lastUrl);
        }
    }, 1000);
    
    // Force navigation if stuck on about:blank
    setTimeout(() => {
        if (window.location.href === 'about:blank' || window.location.href === '') {
            const targetUrl = document.documentElement.getAttribute('data-target-url');
            if (targetUrl) {
                console.log('[4AI Lab] Forcing navigation to:', targetUrl);
                window.location.href = targetUrl;
            }
        }
    }, 2000);
    
    // Enhanced debugging for WebView context
    window.__4AI_DEBUG = {
        initialized: true,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        location: window.location.href
    };
    
    console.log('[4AI Lab] Debug info:', window.__4AI_DEBUG);
})();