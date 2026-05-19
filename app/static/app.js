// ── Map Setup ──────────────────────────────────────────────────────────────

const map = L.map('map', {
    center: [20, 0],
    zoom: 2,
    minZoom: 2,
    zoomControl: true,
    preferCanvas: true
});

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap © CARTO',
    maxZoom: 18
}).addTo(map);

// ── State ──────────────────────────────────────────────────────────────────

let currentLayer = null;
let weatherMode  = false;
let flightData   = [];

// ── Coords display ─────────────────────────────────────────────────────────

map.on('mousemove', (e) => {
    const { lat, lng } = e.latlng;
    document.getElementById('coords-display').textContent =
        `${lat.toFixed(4)}° N  ${lng.toFixed(4)}° E`;
});

// ── Helpers ────────────────────────────────────────────────────────────────

function setStatus(msg, type = 'normal') {
    const el = document.getElementById('status');
    el.textContent = msg;
    el.style.color = type === 'error' ? 'var(--danger)'
                   : type === 'warn'  ? 'var(--warn)'
                   : 'var(--accent)';
}

function setBadge(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function clearMap() {
    if (currentLayer) {
        map.removeLayer(currentLayer);
        currentLayer = null;
    }
    flightData = [];
    weatherMode = false;
    map.off('click');
    map.off('zoomend');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('legend').style.display = 'none';
    setBadge('badge-flights', '—');
    setBadge('badge-quakes', '—');
    setBadge('badge-weather', 'CLICK');
    setStatus('MAP CLEARED');
}

function setActiveButton(id) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// ── Plane icon (only used when zoomed in) ──────────────────────────────────

function makePlaneIcon(heading) {
    const deg = heading || 0;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
         style="transform:rotate(${deg}deg);transform-origin:center;" fill="#00f5c4">
        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
    </svg>`;
    return L.divIcon({
        html: `<div class="plane-icon">${svg}</div>`,
        className: '',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
}

// ── Render flights based on zoom ───────────────────────────────────────────

function renderFlights(data) {
    if (currentLayer) {
        map.removeLayer(currentLayer);
        currentLayer = null;
    }

    const zoom = map.getZoom();
    const markers = [];

    data.forEach(state => {
        const [icao, callsign, country,,,, lat, lon,,, alt,,,, speed, heading] = state;
        if (!lat || !lon) return;

        const popup = `
            <div class="popup-title">✈ ${callsign ? callsign.trim() : 'UNKNOWN'}</div>
            <div class="popup-row"><span>ICAO</span><span>${icao || 'N/A'}</span></div>
            <div class="popup-row"><span>COUNTRY</span><span>${country || 'N/A'}</span></div>
            <div class="popup-row"><span>ALTITUDE</span><span>${alt ? Math.round(alt) + ' m' : 'N/A'}</span></div>
            <div class="popup-row"><span>SPEED</span><span>${speed ? Math.round(speed) + ' m/s' : 'N/A'}</span></div>
            <div class="popup-row"><span>HEADING</span><span>${heading ? Math.round(heading) + '°' : 'N/A'}</span></div>
        `;

        let marker;

        if (zoom >= 6) {
            // Zoomed in: SVG plane icon with rotation
            marker = L.marker([lat, lon], { icon: makePlaneIcon(heading) });
        } else {
            // Zoomed out: fast canvas circle
            marker = L.circleMarker([lat, lon], {
                radius: zoom >= 4 ? 4 : 3,
                fillColor: '#00f5c4',
                color: '#00f5c4',
                weight: 0,
                fillOpacity: 0.85
            });
        }

        marker.bindPopup(popup);
        markers.push(marker);
    });

    currentLayer = L.layerGroup(markers).addTo(map);
}

// ── Pod Info ───────────────────────────────────────────────────────────────

async function loadPodInfo() {
    try {
        const res  = await fetch('/info');
        const data = await res.json();
        document.getElementById('pod-info').innerHTML =
            `<b>HOST</b> ${data.hostname}<br>
             <b>VER </b> ${data.version}<br>
             <b>ENV </b> ${data.environment}`;
    } catch {
        document.getElementById('pod-info').textContent = 'NODE UNREACHABLE';
    }
}

// ── Flights ────────────────────────────────────────────────────────────────

async function loadFlights() {
    clearMap();
    setActiveButton('btn-flights');
    setStatus('ACQUIRING FLIGHT DATA...', 'warn');
    document.getElementById('status').classList.add('loading');

    try {
        const res  = await fetch('/api/flights');
        const data = await res.json();

        document.getElementById('status').classList.remove('loading');

        if (!data.states) {
            setStatus('NO FLIGHT DATA AVAILABLE', 'error');
            return;
        }

        flightData = data.states;
        renderFlights(flightData);

        // Re-render on zoom change to switch between circle/plane icon
        map.on('zoomend', () => {
            if (flightData.length > 0) renderFlights(flightData);
        });

        setBadge('badge-flights', flightData.length.toLocaleString());
        setStatus(`${flightData.length.toLocaleString()} AIRCRAFT TRACKED`);

    } catch (e) {
        document.getElementById('status').classList.remove('loading');
        setStatus('FEED UNAVAILABLE — RETRY', 'error');
    }
}

// ── Earthquakes ────────────────────────────────────────────────────────────

function quakeColor(mag) {
    if (mag >= 6) return '#ff1a1a';
    if (mag >= 5) return '#ff5500';
    if (mag >= 4) return '#ffaa00';
    if (mag >= 3) return '#ffee00';
    return '#00ff88';
}

async function loadEarthquakes() {
    clearMap();
    setActiveButton('btn-quakes');
    setStatus('ACQUIRING SEISMIC DATA...', 'warn');
    document.getElementById('status').classList.add('loading');

    try {
        const res  = await fetch('/api/earthquakes');
        const data = await res.json();

        document.getElementById('status').classList.remove('loading');

        const circles = data.features.map(feature => {
            const props  = feature.properties;
            const coords = feature.geometry.coordinates;
            const mag    = props.mag;
            if (!coords[1] || !coords[0]) return null;

            const color = quakeColor(mag);
            const circle = L.circleMarker([coords[1], coords[0]], {
                radius:      Math.max(5, mag * 5),
                fillColor:   color,
                color:       color,
                weight:      1,
                opacity:     0.9,
                fillOpacity: 0.5
            });

            circle.bindPopup(`
                <div class="popup-title">⚡ MAG ${mag}</div>
                <div class="popup-row"><span>LOCATION</span><span>${props.place}</span></div>
                <div class="popup-row"><span>TIME</span><span>${new Date(props.time).toUTCString()}</span></div>
                <div class="popup-row"><span>DEPTH</span><span>${coords[2]} km</span></div>
            `);
            return circle;
        }).filter(Boolean);

        currentLayer = L.layerGroup(circles).addTo(map);

        document.getElementById('legend').style.display = 'block';
        document.getElementById('legend-content').innerHTML = `
            <span class="legend-dot" style="background:#ff1a1a;color:#ff1a1a"></span> 6.0+<br>
            <span class="legend-dot" style="background:#ff5500;color:#ff5500"></span> 5.0 – 5.9<br>
            <span class="legend-dot" style="background:#ffaa00;color:#ffaa00"></span> 4.0 – 4.9<br>
            <span class="legend-dot" style="background:#ffee00;color:#ffee00"></span> 3.0 – 3.9<br>
            <span class="legend-dot" style="background:#00ff88;color:#00ff88"></span> &lt; 3.0
        `;

        setBadge('badge-quakes', circles.length.toLocaleString());
        setStatus(`${circles.length.toLocaleString()} SEISMIC EVENTS (24H)`);

    } catch (e) {
        document.getElementById('status').classList.remove('loading');
        setStatus('SEISMIC FEED UNAVAILABLE', 'error');
    }
}

// ── Weather ────────────────────────────────────────────────────────────────

function enableWeather() {
    clearMap();
    setActiveButton('btn-weather');
    weatherMode = true;
    setStatus('SELECT TARGET COORDINATES');

    map.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        setStatus('FETCHING ATMOSPHERIC DATA...', 'warn');

        try {
            const res  = await fetch(`/api/weather?lat=${lat}&lon=${lng}`);
            const data = await res.json();
            const cw   = data.current_weather;

            if (currentLayer) map.removeLayer(currentLayer);

            const marker = L.marker([lat, lng]).bindPopup(`
                <div class="popup-title">◈ WEATHER</div>
                <div class="popup-row"><span>COORDS</span><span>${lat.toFixed(3)}, ${lng.toFixed(3)}</span></div>
                <div class="popup-row"><span>TEMP</span><span>${cw.temperature} °C</span></div>
                <div class="popup-row"><span>WIND</span><span>${cw.windspeed} km/h</span></div>
                <div class="popup-row"><span>DIRECTION</span><span>${cw.winddirection}°</span></div>
            `).addTo(map);

            currentLayer = marker;
            marker.openPopup();
            setStatus(`WEATHER: ${lat.toFixed(2)}N ${lng.toFixed(2)}E`);

        } catch (e) {
            setStatus('ATMOSPHERIC DATA UNAVAILABLE', 'error');
        }
    });
}

// ── Init ───────────────────────────────────────────────────────────────────

loadPodInfo();
