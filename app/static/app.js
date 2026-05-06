// ── Map Setup ─────────────────────────────────────────────────────────────

const map = L.map('map', {
    center: [20, 0],
    zoom: 2,
    minZoom: 2
});

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap © CARTO',
    maxZoom: 18
}).addTo(map);

// ── State ─────────────────────────────────────────────────────────────────

let currentLayer = null;
let weatherMode  = false;

// ── Helpers ───────────────────────────────────────────────────────────────

function setStatus(msg) {
    document.getElementById('status').textContent = msg;
}

function clearMap() {
    if (currentLayer) {
        map.removeLayer(currentLayer);
        currentLayer = null;
    }
    weatherMode = false;
    map.off('click');
    document.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
    document.getElementById('legend').style.display = 'none';
    setStatus('Map cleared.');
}

function setActiveButton(cls) {
    document.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
    document.querySelector(cls).classList.add('active');
}

// ── Pod Info ──────────────────────────────────────────────────────────────

async function loadPodInfo() {
    try {
        const res  = await fetch('/info');
        const data = await res.json();
        document.getElementById('pod-info').innerHTML =
            `🖥️ <b>Host:</b> ${data.hostname}<br>
             🏷️ <b>Version:</b> ${data.version}<br>
             🌐 <b>Env:</b> ${data.environment}`;
    } catch {
        document.getElementById('pod-info').textContent = 'Could not load pod info.';
    }
}

// ── Flights ───────────────────────────────────────────────────────────────

async function loadFlights() {
    clearMap();
    setActiveButton('.btn-flights');
    setStatus('Loading live flights...');

    try {
        const res  = await fetch('https://opensky-network.org/api/states/all');
        const data = await res.json();

        if (!data.states) {
            setStatus('No flight data available right now.');
            return;
        }

        const flightIcon = L.divIcon({
            html: '✈️',
            className: '',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        const markers = [];

        data.states.forEach(state => {
            const [icao, callsign, country,,,, lat, lon,,, alt, ,, , speed] = state;
            if (!lat || !lon) return;

            const marker = L.marker([lat, lon], { icon: flightIcon });
            marker.bindPopup(`
                <div class="popup-title">✈️ ${callsign ? callsign.trim() : 'Unknown'}</div>
                <div class="popup-row">🌍 Country: <span>${country || 'N/A'}</span></div>
                <div class="popup-row">📡 ICAO: <span>${icao || 'N/A'}</span></div>
                <div class="popup-row">⬆️ Altitude: <span>${alt ? Math.round(alt) + ' m' : 'N/A'}</span></div>
                <div class="popup-row">💨 Speed: <span>${speed ? Math.round(speed) + ' m/s' : 'N/A'}</span></div>
            `);
            markers.push(marker);
        });

        currentLayer = L.layerGroup(markers).addTo(map);
        setStatus(`✈️ Showing ${markers.length.toLocaleString()} live flights.`);

    } catch (e) {
        setStatus('Failed to load flights. Try again.');
    }
}

// ── Earthquakes ───────────────────────────────────────────────────────────

function quakeColor(mag) {
    if (mag >= 6) return '#ff0000';
    if (mag >= 5) return '#ff6600';
    if (mag >= 4) return '#ffaa00';
    if (mag >= 3) return '#ffff00';
    return '#00ff88';
}

function quakeRadius(mag) {
    return Math.max(4, mag * 4);
}

async function loadEarthquakes() {
    clearMap();
    setActiveButton('.btn-quakes');
    setStatus('Loading earthquakes...');

    try {
        const res  = await fetch('/api/earthquakes');
        const data = await res.json();

        const circles = [];

        data.features.forEach(feature => {
            const props  = feature.properties;
            const coords = feature.geometry.coordinates;
            const mag    = props.mag;
            const place  = props.place;
            const time   = new Date(props.time).toUTCString();

            if (!coords[1] || !coords[0]) return;

            const circle = L.circleMarker([coords[1], coords[0]], {
                radius:      quakeRadius(mag),
                fillColor:   quakeColor(mag),
                color:       '#000',
                weight:      1,
                opacity:     0.8,
                fillOpacity: 0.7
            });

            circle.bindPopup(`
                <div class="popup-title">🌋 Magnitude ${mag}</div>
                <div class="popup-row">📍 Location: <span>${place}</span></div>
                <div class="popup-row">🕐 Time: <span>${time}</span></div>
                <div class="popup-row">🔻 Depth: <span>${coords[2]} km</span></div>
            `);

            circles.push(circle);
        });

        currentLayer = L.layerGroup(circles).addTo(map);

        document.getElementById('legend').style.display = 'block';
        document.getElementById('legend-content').innerHTML = `
            <b>Magnitude Scale:</b><br>
            <span class="legend-dot" style="background:#ff0000"></span> 6.0+<br>
            <span class="legend-dot" style="background:#ff6600"></span> 5.0 - 5.9<br>
            <span class="legend-dot" style="background:#ffaa00"></span> 4.0 - 4.9<br>
            <span class="legend-dot" style="background:#ffff00"></span> 3.0 - 3.9<br>
            <span class="legend-dot" style="background:#00ff88"></span> &lt; 3.0
        `;

        setStatus(`🌋 Showing ${circles.length.toLocaleString()} earthquakes (last 24h).`);

    } catch (e) {
        setStatus('Failed to load earthquakes. Try again.');
    }
}

// ── Weather ───────────────────────────────────────────────────────────────

function enableWeather() {
    clearMap();
    setActiveButton('.btn-weather');
    weatherMode = true;
    setStatus('🌤️ Click anywhere on the map to get weather.');

    map.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        setStatus('Fetching weather...');

        try {
            const res  = await fetch(`/api/weather?lat=${lat}&lon=${lng}`);
            const data = await res.json();
            const cw   = data.current_weather;

            if (currentLayer) map.removeLayer(currentLayer);

            const marker = L.marker([lat, lng]).bindPopup(`
                <div class="popup-title">🌤️ Weather</div>
                <div class="popup-row">📍 Location: <span>${lat.toFixed(2)}, ${lng.toFixed(2)}</span></div>
                <div class="popup-row">🌡️ Temperature: <span>${cw.temperature} °C</span></div>
                <div class="popup-row">💨 Wind Speed: <span>${cw.windspeed} km/h</span></div>
                <div class="popup-row">🧭 Wind Direction: <span>${cw.winddirection}°</span></div>
            `).addTo(map);

            currentLayer = marker;
            marker.openPopup();
            setStatus(`🌤️ Weather loaded for ${lat.toFixed(2)}, ${lng.toFixed(2)}.`);

        } catch (e) {
            setStatus('Failed to fetch weather. Try again.');
        }
    });
}

// ── Init ──────────────────────────────────────────────────────────────────

loadPodInfo();