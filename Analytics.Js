/**
 * PropSmart India — Analytics Module
 * =====================================
 * Lightweight, privacy-first analytics.
 * No external services. All data stays in localStorage.
 * Zero PII collected — only anonymized usage patterns.
 *
 * USAGE (add to every HTML page before </body>):
 *   <script src="analytics.js"></script>
 *   <script>Analytics.init('page-name');</script>
 *
 * DATA STORED (localStorage key: 'ps_analytics'):
 *   sessions[]    — per-session stats (page, duration, events)
 *   totals{}      — aggregate counters
 *   features{}    — which features have been used
 */

const Analytics = (() => {

    // Per-user analytics key — derived at runtime from session email
    // so each user gets their own isolated analytics bucket
    const _session     = (() => { try { return JSON.parse(sessionStorage.getItem('ps_session')); } catch { return null; } })();
    const _userSlug    = _session && _session.email
        ? _session.email.toLowerCase().replace(/[^a-z0-9]/g, '_')
        : 'guest';
    const STORAGE_KEY  = 'ps_analytics_' + _userSlug;
    const SESSION_KEY  = 'ps_session_analytics_' + _userSlug;
    const MAX_SESSIONS = 100; // rolling window

    let _page        = '';
    let _sessionStart = Date.now();
    let _events      = [];

    // ── Helpers ──────────────────────────────────────────────────────────────

    function _load() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
    }

    function _save(data) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* storage full */ }
    }

    function _getOrCreate(data, key, defaultVal) {
        if (!data[key]) data[key] = defaultVal;
        return data[key];
    }

    function _deviceType() {
        const w = window.innerWidth;
        if (w <= 480) return 'mobile';
        if (w <= 1024) return 'tablet';
        return 'desktop';
    }

    function _sessionId() {
        let id = sessionStorage.getItem(SESSION_KEY);
        if (!id) {
            id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
            sessionStorage.setItem(SESSION_KEY, id);
        }
        return id;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Initialize analytics for a page. Call once per page load.
     * @param {string} pageName - e.g. 'dashboard', 'estimator', 'emi'
     */
    function init(pageName) {
        _page         = pageName;
        _sessionStart = Date.now();
        _events       = [];

        const data    = _load();
        const totals  = _getOrCreate(data, 'totals', {});
        const pages   = _getOrCreate(data, 'pages', {});

        // Increment page view count
        totals.totalSessions   = (totals.totalSessions || 0) + 1;
        pages[pageName]        = (pages[pageName] || 0) + 1;

        // Device breakdown
        const devices = _getOrCreate(data, 'devices', {});
        const device  = _deviceType();
        devices[device] = (devices[device] || 0) + 1;

        // First visit tracking
        if (!data.firstVisit) {
            data.firstVisit = new Date().toISOString();
        }
        data.lastVisit = new Date().toISOString();

        _save(data);

        // Track session end on page unload
        window.addEventListener('beforeunload', _onUnload);
        // Visibility change (tab switch / minimize)
        document.addEventListener('visibilitychange', _onVisibilityChange);

        console.log(`[Analytics] Initialized: ${pageName} | Session: ${_sessionId()}`);
    }

    /**
     * Track a named event with optional properties
     * @param {string} eventName  - e.g. 'calculate_estimate', 'save_estimate'
     * @param {Object} properties - optional key-value pairs
     */
    function track(eventName, properties = {}) {
        const event = {
            name:      eventName,
            page:      _page,
            ts:        Date.now(),
            ...properties
        };
        _events.push(event);

        const data     = _load();
        const events   = _getOrCreate(data, 'events', {});
        const features = _getOrCreate(data, 'features', {});

        events[eventName]   = (events[eventName] || 0) + 1;
        features[eventName] = true;

        // Track city-level data for market insights
        if (properties.city) {
            const cities = _getOrCreate(data, 'cities', {});
            cities[properties.city] = (cities[properties.city] || 0) + 1;
        }

        // Track property type popularity
        if (properties.type) {
            const types = _getOrCreate(data, 'propertyTypes', {});
            types[properties.type] = (types[properties.type] || 0) + 1;
        }

        _save(data);
        console.log(`[Analytics] Event: ${eventName}`, properties);
    }

    /**
     * Track a timing metric (e.g. how fast calculate runs)
     * @param {string} label  - metric name
     * @param {number} ms     - duration in milliseconds
     */
    function timing(label, ms) {
        const data    = _load();
        const timings = _getOrCreate(data, 'timings', {});
        if (!timings[label]) timings[label] = { count: 0, totalMs: 0, avgMs: 0 };
        timings[label].count++;
        timings[label].totalMs += ms;
        timings[label].avgMs    = Math.round(timings[label].totalMs / timings[label].count);
        _save(data);
    }

    /**
     * Get a full analytics report object
     * @returns {Object}
     */
    function getReport() {
        const data = _load();
        return {
            summary: {
                totalSessions:  data.totals?.totalSessions || 0,
                firstVisit:     data.firstVisit || null,
                lastVisit:      data.lastVisit  || null,
                pagesVisited:   data.pages      || {},
                devicesUsed:    data.devices    || {},
            },
            topEvents:    _sortObj(data.events || {}),
            topCities:    _sortObj(data.cities || {}),
            propertyTypes: data.propertyTypes || {},
            features:     data.features       || {},
            timings:      data.timings        || {}
        };
    }

    /**
     * Render an analytics dashboard card into a DOM element
     * @param {string} containerId - ID of the element to render into
     */
    function renderInsightCard(containerId) {
        const el = document.getElementById(containerId);
        if (!el) return;

        const report = getReport();
        const topCities = Object.entries(report.topCities).slice(0, 5);
        const topEvents = Object.entries(report.topEvents).slice(0, 5);

        el.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
                <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Top Searched Cities</div>
                ${topCities.length ? topCities.map(([city, count]) => `
                    <div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
                        <span>${city}</span>
                        <span style="color:#00d4aa;font-weight:600">${count}</span>
                    </div>`).join('')
                : '<p style="font-size:12px;color:#6b7280">No data yet</p>'}
            </div>
            <div>
                <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Feature Usage</div>
                ${topEvents.length ? topEvents.map(([evt, count]) => `
                    <div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
                        <span>${evt.replace(/_/g, ' ')}</span>
                        <span style="color:#6c63ff;font-weight:600">${count}×</span>
                    </div>`).join('')
                : '<p style="font-size:12px;color:#6b7280">No events yet</p>'}
            </div>
        </div>
        <div style="margin-top:12px;font-size:11px;color:#6b7280">
            Total sessions: <strong style="color:#e8eaf0">${report.summary.totalSessions}</strong> &nbsp;·&nbsp;
            First visit: <strong style="color:#e8eaf0">${report.summary.firstVisit ? new Date(report.summary.firstVisit).toLocaleDateString('en-IN') : '—'}</strong>
        </div>`;
    }

    /**
     * Clear all analytics data (for privacy / reset)
     */
    function clear() {
        localStorage.removeItem(STORAGE_KEY);
        console.log('[Analytics] Data cleared');
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    function _sortObj(obj) {
        return Object.fromEntries(
            Object.entries(obj).sort(([,a],[,b]) => b - a)
        );
    }

    function _onUnload() {
        const duration = Math.round((Date.now() - _sessionStart) / 1000); // seconds
        const data     = _load();
        const sessions = _getOrCreate(data, 'sessions', []);

        sessions.unshift({
            id:       _sessionId(),
            page:     _page,
            duration, // seconds
            events:   _events.length,
            device:   _deviceType(),
            at:       new Date().toISOString()
        });

        // Keep rolling window
        if (sessions.length > MAX_SESSIONS) sessions.splice(MAX_SESSIONS);

        // Update average session duration
        const totals = _getOrCreate(data, 'totals', {});
        const allDurations = sessions.map(s => s.duration);
        totals.avgSessionDuration = Math.round(
            allDurations.reduce((a,b) => a + b, 0) / allDurations.length
        );

        data.sessions = sessions;
        _save(data);
    }

    function _onVisibilityChange() {
        if (document.hidden) {
            track('tab_hidden');
        } else {
            track('tab_visible');
        }
    }

    // ── Expose ────────────────────────────────────────────────────────────────
    return { init, track, timing, getReport, renderInsightCard, clear };

})();

// Register Service Worker (PWA support)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => {
                console.log('[SW] Registered:', reg.scope);

                // Notify SW when an update is available
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New version available — show update toast
                            console.log('[SW] New version available');
                            _showUpdateBanner();
                        }
                    });
                });
            })
            .catch(err => console.warn('[SW] Registration failed:', err));
    });
}

function _showUpdateBanner() {
    const banner = document.createElement('div');
    banner.style.cssText = `
        position:fixed; bottom:24px; right:24px; z-index:9999;
        background:#141927; border:1px solid #6c63ff;
        border-radius:12px; padding:14px 18px;
        display:flex; align-items:center; gap:12px;
        box-shadow:0 8px 32px rgba(0,0,0,0.4);
        font-family:'DM Sans',sans-serif; font-size:13px; color:#e8eaf0;
        animation:fadeUp 0.4s ease;
    `;
    banner.innerHTML = `
        <span>🔄</span>
        <span>A new version is available!</span>
        <button onclick="window.location.reload()" style="
            background:#6c63ff; border:none; color:#fff; padding:6px 14px;
            border-radius:8px; cursor:pointer; font-family:inherit; font-size:12px; font-weight:700;
        ">Update</button>
        <button onclick="this.parentElement.remove()" style="
            background:none; border:none; color:#6b7280; cursor:pointer; font-size:18px; line-height:1;
        ">×</button>
    `;
    document.body.appendChild(banner);
}