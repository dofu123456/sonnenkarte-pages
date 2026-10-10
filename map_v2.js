// Karte erstellen
const map = L.map("map", {
    preferCanvas: true
}).setView([46.8, 8.3], 8);

// Swisstopo-Hintergrund
L.tileLayer(
    "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg",
    {
        attribution: "&copy; swisstopo"
    }
).addTo(map);

const profilePanel =
    document.getElementById("profile-panel");

const profileContent =
    document.getElementById("profile-content");

const toggleProfile =
    document.getElementById("toggle-profile");

let profileOpen = false;

// Hilfsfunktionen
function formatTime(timestamp) {

    const date = new Date(timestamp);

    return date.toLocaleTimeString("de-CH", {
        hour: "2-digit",
        minute: "2-digit"
    });

}

function formatDelay(minutes) {

    const totalSeconds = Math.round(minutes * 60);

    if (totalSeconds === 0)
        return "Keine";

    const absSeconds = Math.abs(totalSeconds);
    const text = absSeconds < 60
        ? `${absSeconds} s`
        : (() => {
            const min = Math.floor(absSeconds / 60);
            const sec = absSeconds % 60;

            if (sec === 0)
                return `${min} min`;

            return `${min} min ${sec} s`;
        })();

    return totalSeconds < 0
        ? `${text} früher`
        : `${text} später`;
}

function lv95ToWgs84(easting, northing) {

    const y = (easting - 2600000) / 1000000;
    const x = (northing - 1200000) / 1000000;

    let lat =
        16.9023892 +
        3.238272 * x -
        0.270978 * Math.pow(y, 2) -
        0.002528 * Math.pow(x, 2) -
        0.0447 * Math.pow(y, 2) * x -
        0.0140 * Math.pow(x, 3);

    let lon =
        2.6779094 +
        4.728982 * y +
        0.791484 * y * x +
        0.1306 * y * Math.pow(x, 2) -
        0.0436 * Math.pow(y, 3);

    lat = lat * 100 / 36;
    lon = lon * 100 / 36;

    return {
        lat,
        lon
    };
}

function formatDateForFilename(date) {

    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, "0");

    const day = String(date.getDate()).padStart(2, "0");

    return `${year}_${month}_${day}`;

}

function updateDateLabel() {

    document.getElementById("current-date").innerHTML =
        currentDate.toLocaleDateString("de-CH");

}

function createPopup(feature) {

    const p = feature.properties;
    const e = p.e;
    const n = p.n;

    const isSunrise = sunMode === "sunrise";

    const title = isSunrise
        ? "🌄 Sonnenaufgang"
        : "🌇 Sonnenuntergang";

    const realIcon = isSunrise
        ? "🌅"
        : "🌇";

    const realLabel = isSunrise
        ? "Sonnenaufgang im Gelände"
        : "Sonnenuntergang im Gelände";

    const theoreticalLabel = isSunrise
        ? "☀️ Theoretischer Sonnenaufgang"
        : "☀️ Theoretischer Sonnenuntergang";

    const realTime = isSunrise
        ? p.Sonnenaufgang_real
        : p.Sonnenuntergang_real;

    const theoreticalTime = isSunrise
        ? p.Sonnenaufgang_theoretisch
        : p.Sonnenuntergang_theoretisch;

    const swisstopoUrl =
    `https://map.geo.admin.ch/#/map?lang=de` +
    `&bgLayer=ch.swisstopo.pixelkarte-farbe` +
    `&center=${e},${n}` +
    `&z=8` +
    `&layers=ch.bav.haltestellen-oev,f;ch.swisstopo.swisstlm3d-wanderwege,f;ch.astra.wanderland-sperrungen_umleitungen,f`;

    return `
    <div class="popup">
    
        <h3>${title}</h3>
    
        <div class="popup-main">
            <div class="popup-time">${realIcon} ${formatTime(realTime)}</div>
            <div class="popup-subtitle">${realLabel}</div>
        </div>
    
        <div class="popup-divider"></div>
    
        <div class="popup-item">
            <span>${theoreticalLabel}</span>
            <strong>${formatTime(theoreticalTime)}</strong>
        </div>
    
        <div class="popup-item">
            <span>⏱️ Abweichung</span>
            <strong>${formatDelay(p.Verzoegerungszeit)}</strong>
        </div>
    
        <div class="popup-item">
            <span>👁️ Distanz massgebendes Hindernis</span>
            <strong id="popup-sichtweite-${e}-${n}">${p.Sichtweite.toFixed(1)} km</strong>
        </div>
    
        <div class="popup-divider"></div>
    
        <div class="popup-item popup-coordinates">

            <span>📍 Koordinaten (LV95)</span>
        
            <strong>
                ${Math.round(e).toLocaleString("de-CH")}<br>
                ${Math.round(n).toLocaleString("de-CH")}
            </strong>
        
        </div>
        
        <div class="popup-item popup-link">
            <span>🗺️ Karte</span>
            <a href="${swisstopoUrl}" target="_blank">
                Auf swisstopo öffnen
            </a>
        </div>
    
    </div>
    `;
}

function getColor(delay) {

    if (sunMode === "sunrise") {

        if (delay <= 0)
            return "#2ca25f";      // grün

        if (delay < 3)
            return "#ffd92f";      // gelb

        if (delay < 5)
            return "#fd8d3c";      // orange

        if (delay < 10)
            return "#e31a1c";      // rot

        return "#88419d";          // violett
    }

    else {

        if (delay >= 0)
            return "#2ca25f";      // grün

        if (delay > -3)
            return "#ffd92f";      // gelb

        if (delay > -5)
            return "#fd8d3c";      // orange

        if (delay > -10)
            return "#e31a1c";      // rot

        return "#88419d";          // violett
    }
}

function getRadius(distance) {

    if (distance < 20)
        return 3;

    if (distance < 40)
        return 4;

    if (distance < 60)
        return 5;

    return 6;
}

function azimuthToDirection(az) {

    const directions = [
        "N", "NNO", "NO", "ONO",
        "O", "OSO", "SO", "SSO",
        "S", "SSW", "SW", "WSW",
        "W", "WNW", "NW", "NNW"];

    return directions[Math.round(az / 22.5) % 16];

}

function updateCompass(azimuth){

    document.getElementById("sun-needle").style.transform =
        `rotate(${azimuth}deg)`;

    document.getElementById("azimuth-value").innerHTML =
        `${azimuth.toFixed(1)}°`;

    document.getElementById("azimuth-direction").innerHTML =
        azimuthToDirection(azimuth);

}

function openProfile(){

    profilePanel.classList.add("open");

    toggleProfile.innerHTML = "▼";

    profileOpen = true;

}

function closeProfile(){

    profilePanel.classList.remove("open");

    toggleProfile.innerHTML = "▲";

    profileOpen = false;

}

function createNiceAxis(min, max, targetTicks = 6){

    const range = max - min;

    const rawStep = range / targetTicks;

    const exponent =
        Math.pow(10, Math.floor(Math.log10(rawStep)));

    const factors = [1, 2, 2.5, 5, 10];

    let step = factors[factors.length-1] * exponent;

    for(const factor of factors){

        if(rawStep <= factor * exponent){

            step = factor * exponent;

            break;

        }

    }

    const axisMin =
        Math.floor(min / step) * step;

    // Eine zusätzliche Stufe oberhalb
    const axisMax =
        (Math.ceil(max / step)) * step;

    const labels = [];

    for(let value = axisMin; value <= axisMax; value += step){

        labels.push(value);

    }

    return{

        min: axisMin,

        max: axisMax,

        step,

        labels

    };

}

function getMeridianConvergence(easting, northing) {

    const Y = easting - 2600000;
    const X = northing - 1200000;

    const convergenceGon =
        10.668e-6 * Y +
        1.788e-12 * Y * X -
        0.14e-18 * Math.pow(Y, 3);

    return convergenceGon * 0.9;
}

function createProfileLine(easting, northing, azimuth){

    const distance = 100000;

    const convergence = getMeridianConvergence(easting, northing);

    const gridAzimuth = azimuth - convergence;

    const azimuthRad = gridAzimuth * Math.PI / 180;

    const endEasting = easting + distance * Math.sin(azimuthRad);

    const endNorthing = northing + distance * Math.cos(azimuthRad);

    console.log(
        "Azimut geografisch:",
        azimuth,
        "Konvergenz:",
        convergence,
        "Azimut LV95:",
        gridAzimuth
    );

    return {
        type: "LineString",
        coordinates: [
            [
                easting,
                northing
            ],
            [
                endEasting,
                endNorthing
            ]
        ]
    };
}

//--------------------------------------------------------
// Horizontpunkt aus Höhenprofil bestimmen
//--------------------------------------------------------

function findHorizonPoint(profile, observerElevation){

    let horizonIndex = 0;
    let maxAngle = -Infinity;

    //----------------------------------------------------
    // Alle Profilpunkte durchlaufen
    //----------------------------------------------------

    profile.distance.forEach((distance, index) => {

        const elevation =
            profile.elevation[index];

        //------------------------------------------------
        // Distanz in Meter
        //------------------------------------------------

        const distanceMeters =
            distance * 1000;

        //------------------------------------------------
        // Standort selbst überspringen
        //------------------------------------------------

        if(distanceMeters === 0){

            return;

        }

        //------------------------------------------------
        // Höhendifferenz zum Standort
        //------------------------------------------------

        const heightDifference =
            elevation - observerElevation;

        //------------------------------------------------
        // Höhenwinkel berechnen
        //------------------------------------------------

        const angle =
            Math.atan2(
                heightDifference,
                distanceMeters
            ) * 180 / Math.PI;

        //------------------------------------------------
        // Größten Höhenwinkel speichern
        //------------------------------------------------

        if(angle > maxAngle){

            maxAngle = angle;

            horizonIndex = index;

        }

    });

    //----------------------------------------------------
    // Kein Hindernis oberhalb der Sichtlinie
    //----------------------------------------------------

    if(maxAngle < 0){

        horizonIndex =
            profile.distance.length - 1;

        maxAngle = 0;

    }

    //----------------------------------------------------
    // Ergebnis
    //----------------------------------------------------

    return {
        index: horizonIndex,
        distance: profile.distance[horizonIndex],
        elevation: profile.elevation[horizonIndex],
        angle: maxAngle
    };

}

//--------------------------------------------------------
// Erdkrümmung berechnen
//--------------------------------------------------------

function addEarthCurvature(profile){

    const R = 6371000;

    const earthDrop =
        profile.distance.map(distance => {

            const distanceMeters = distance * 1000;

            return (distanceMeters * distanceMeters) / (2 * R);
        });

    return {
        ...profile,
        earthDrop
    };

}

//--------------------------------------------------------
// Horizont unter Berücksichtigung der Erdkrümmung
//--------------------------------------------------------

function findHorizonPointWithEarthCurvature(profile, observerElevation){

    let horizonIndex = 0;
    let maxAngle = -Infinity;

    //----------------------------------------------------
    // Alle Profilpunkte durchlaufen
    //----------------------------------------------------

    profile.distance.forEach((distance, index) => {

        const elevation = profile.elevation[index];
        const earthDrop = profile.earthDrop[index];

        //------------------------------------------------
        // Standort selbst überspringen
        //------------------------------------------------

        if(distance === 0){
            return;
        }

        //------------------------------------------------
        // Erdkrümmung berücksichtigen
        //------------------------------------------------

        const correctedElevation = elevation - earthDrop;

        //------------------------------------------------
        // Höhendifferenz zum Beobachter
        //------------------------------------------------

        const heightDifference = correctedElevation - observerElevation;

        //------------------------------------------------
        // Höhenwinkel
        //------------------------------------------------

        const distanceMeters = distance * 1000;

        const angle = Math.atan2(heightDifference, distanceMeters) * 180 / Math.PI;

        //------------------------------------------------
        // Größten Winkel speichern
        //------------------------------------------------

        if(angle > maxAngle){

            maxAngle = angle;
            horizonIndex = index;

        }

    });

    //----------------------------------------------------
    // Ergebnis
    //----------------------------------------------------

    return {
        index: horizonIndex,
        distance: profile.distance[horizonIndex],
        elevation: profile.elevation[horizonIndex],
        correctedElevation: profile.elevation[horizonIndex] - profile.earthDrop[horizonIndex],
        angle: maxAngle,
        hasHorizon: true
    };

}

//--------------------------------------------------------
// Höhenprofil von swisstopo laden
//--------------------------------------------------------

async function loadElevationProfile(feature){

    const p = feature.properties;
    const easting = Number(p.e);
    const northing = Number(p.n);
    const azimuth = Number(p.Azimut);

    //----------------------------------------------------
    // Eingaben prüfen
    //----------------------------------------------------

    if(
        !Number.isFinite(easting) ||
        !Number.isFinite(northing) ||
        !Number.isFinite(azimuth)
    ){

        console.error(
            "Ungültige Profil-Daten:",
            {easting, northing, azimuth}
        );

        document.getElementById(
            "profile-loading"
        ).textContent =
            "⚠️ Ungültige Standortdaten.";

        return;

    }

    //----------------------------------------------------
    // Profil-Linie erzeugen
    //----------------------------------------------------

    const geometry =
        createProfileLine(easting, northing, azimuth);

    //----------------------------------------------------
    // API-Parameter
    //----------------------------------------------------

    const params =
        new URLSearchParams({

            geom:
                JSON.stringify(geometry),

            sr:
                "2056",

            nb_points:
                "500"

        });

    const url =
        "https://api3.geo.admin.ch/rest/services/profile.json?" +
        params.toString();

    console.log(
        "swisstopo Profil wird geladen:",
        url
    );

    //----------------------------------------------------
    // API aufrufen
    //----------------------------------------------------

    try{

        const response = await fetch(url);

        console.log("HTTP Status:", response.status, response.statusText);

        if(!response.ok){

            throw new Error(`HTTP ${response.status} ${response.statusText}`);

        }

        const data = await response.json();

        //------------------------------------------------
        // Antwort prüfen
        //------------------------------------------------

        if(
            !Array.isArray(data) ||
            data.length === 0
        ){

            throw new Error("swisstopo API hat kein Profil geliefert.");

        }

            //------------------------------------------------
            // Höhe des Beobachtungsstandortes
            // = erster Punkt des Profils
            //------------------------------------------------

            const observerElevation = Number(data[0].alts.DTM2);
            const observerHeight = 1.7;
            const observerEyeElevation = observerElevation + observerHeight;

            if(!Number.isFinite(observerElevation)){
                throw new Error("Standorthöhe konnte aus der API-Antwort nicht gelesen werden.");

            }

            console.log("Standorthöhe:", observerElevation, "m");

        //------------------------------------------------
        // API-Daten in unser Profilformat umwandeln
        //------------------------------------------------

        const profile = {

            distance: data.map(point => Number(point.dist) / 1000),
            elevation: data.map(point => Number(point.alts.DTM2)),
            azimuth: azimuth
        };

        console.log("swisstopo Profil erhalten:", profile);

        //----------------------------------------------------
        // Theoretischer Horizont
        //----------------------------------------------------

        const horizon = findHorizonPoint(profile, observerEyeElevation);

        console.log("Theoretischer Horizont:", horizon);

        //----------------------------------------------------
        // Erdkrümmung berechnen
        //----------------------------------------------------

        const profileEarth = addEarthCurvature(profile);

        //----------------------------------------------------
        // Horizont mit Erdkrümmung
        //----------------------------------------------------

        const horizonEarth = findHorizonPointWithEarthCurvature(profileEarth, observerEyeElevation);

        console.log("Horizont mit Erdkrümmung:", horizonEarth);

        const popupSichtweite = document.getElementById(`popup-sichtweite-${easting}-${northing}`);
        popupSichtweite.textContent = `${p.Sichtweite.toFixed(1)} km`;

        //------------------------------------------------
        // Ladeanzeige ausblenden
        //------------------------------------------------

        document.getElementById("profile-loading").style.display = "none";

        //------------------------------------------------
        // Profil zeichnen
        //------------------------------------------------

        drawProfile(profileEarth, horizon, horizonEarth, observerEyeElevation, p.Sonnenhoehe);

    }

    catch(error){

        console.error("Fehler beim Laden des Höhenprofils:", error);

        console.error("Profil-URL:", url);

        const loading =
            document.getElementById("profile-loading");

        loading.textContent = "⚠️ Horizontprofil konnte nicht geladen werden.";

        loading.style.display = "block";

    }

}

function drawProfile(profile, horizon, horizonEarth, observerEyeElevation, sonnenhoehe){

    const svg = document.getElementById("profile-svg");
    const width = svg.clientWidth;
    const height = svg.clientHeight;



    //--------------------------------------------------------
    // Ränder
    //--------------------------------------------------------

    const marginLeft = 55;
    const marginRight = 20;
    const marginTop = 20;
    const marginBottom = 35;

    //--------------------------------------------------------
    // Rohdaten
    //--------------------------------------------------------

    const maxDistance = Math.max(...profile.distance);

    const rawMinElevation = Math.min(...profile.elevation);
    const rawMaxElevation = Math.max(...profile.elevation);

    //--------------------------------------------------------
    // Achsen
    //--------------------------------------------------------

    const elevationAxis = createNiceAxis(rawMinElevation, rawMaxElevation, 5);

    const distanceAxis = createNiceAxis(0, maxDistance, 6);

    svg.onmousemove = function(event) {

        const rect = svg.getBoundingClientRect();

        const mouseX = event.clientX - rect.left;

        const plotWidth = width - marginLeft - marginRight;

        const distance = (mouseX - marginLeft) / plotWidth * distanceAxis.max;

        if (
            distance >= 0 &&
            distance <= maxDistance
        ) {
            moveProfileMapMarker(distance);
        }
    };

    //--------------------------------------------------------
    // Hilfsfunktionen
    //--------------------------------------------------------

    function x(distance){

        return marginLeft + distance / distanceAxis.max * (width - marginLeft - marginRight);

    }

    function y(elevation){

        return height - marginBottom - (elevation - elevationAxis.min) / (elevationAxis.max - elevationAxis.min) *
            (height - marginTop - marginBottom);
    }

    //--------------------------------------------------------
    // Profillinie
    //--------------------------------------------------------

    let line = "";

    profile.distance.forEach((distance, index) => {

        const px = x(distance);
        const py = y(profile.elevation[index]);

        line += (index === 0 ? "M" : " L") + `${px} ${py}`;

    });

    //--------------------------------------------------------
    // Horizontmarker mit Erdkrümmung
    //--------------------------------------------------------

    let markerEarthX = null;
    let markerEarthY = null;

    if(horizonEarth.hasHorizon){

        markerEarthX = x(horizonEarth.distance);

        markerEarthY = y(horizonEarth.elevation);

    }

    //--------------------------------------------------------
    // Sichtlinien
    //--------------------------------------------------------

    const earthLine = profile.distance.map((distance,index) => {
        const distanceMeters = distance * 1000;
        const earthDrop = profile.earthDrop[index];
        return observerEyeElevation + Math.tan((sonnenhoehe + 0.266) * Math.PI / 180) * distanceMeters + earthDrop; //0.266 = Sonnenradius
    });

    //--------------------------------------------------------
    // Geländefläche
    //--------------------------------------------------------

    const area =
        line +
        ` L ${x(maxDistance)} ${y(elevationAxis.min)}` +
        ` L ${x(0)} ${y(elevationAxis.min)} Z`;

    //--------------------------------------------------------
    // Rasterlinien
    //--------------------------------------------------------

    let gridLines = "";

    elevationAxis.labels.forEach(label => {

        gridLines += `

            <line
                x1="${marginLeft}"
                y1="${y(label)}"
                x2="${x(distanceAxis.max)}"
                y2="${y(label)}"
                stroke="#ececec"
                stroke-dasharray="4 4"
            />

        `;

    });

    //--------------------------------------------------------
    // Höhenbeschriftung
    //--------------------------------------------------------

    let elevationText = "";

    elevationAxis.labels.forEach(label => {

        elevationText += `

            <text
                x="5"
                y="${y(label)+4}"
                font-size="11"
                fill="#666">

                ${label} m

            </text>

        `;

    });

    //--------------------------------------------------------
    // Distanzachse
    //--------------------------------------------------------

    let distanceText  = "";

    distanceAxis.labels.forEach((value,index)=>{

        const px = x(value);
        let anchor = "middle";

        if(index===0){
            anchor="start";
        }

        if(index===distanceAxis.labels.length-1){
            anchor="end";
        }

        distanceText +=`
    
            <line
                x1="${px}"
                y1="${height-marginBottom}"
                x2="${px}"
                y2="${height-marginBottom+5}"
                stroke="#888"
            />
    
            <text
                x="${px}"
                y="${height-6}"
                text-anchor="${anchor}"
                font-size="11"
                fill="#666">
    
                ${value} km
    
            </text>
    
        `;

    });


    //--------------------------------------------------------
    // SVG erzeugen
    //--------------------------------------------------------

    svg.innerHTML = `

        <defs>

            <linearGradient
                id="terrainGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1">

                <stop
                    offset="0%"
                    stop-color="#d8d8d8"/>

                <stop
                    offset="100%"
                    stop-color="#bdbdbd"/>

            </linearGradient>

        </defs>

        <!-- Raster -->

        ${gridLines}

        <!-- Geländefläche -->

        <path
            d="${area}"
            fill="url(#terrainGradient)"
        />

        <!-- Profillinie -->

        <path
            d="${line}"
            fill="none"
            stroke="#555"
            stroke-width="2"
        />
        
        <!-- Sichtlinie mit Erdkrümmung -->
        
        <path
            d="${profile.distance.map((distance, index) => {
                const px = x(distance);
                const py = y(earthLine[index]);
                return (index === 0 ? "M" : " L") + `${px} ${py}`;
            }).join("")}"
            fill="none"
            stroke="#88419d"
            stroke-width="2"
            stroke-dasharray="3 4"
        />
        
        <!-- Sonnenmarker -->
        
        ${horizonEarth.hasHorizon ? `
        
            <line
                x1="${markerEarthX}"
                y1="${marginTop + 8}"
                x2="${markerEarthX}"
                y2="${markerEarthY}"
                stroke="#c62828"
                stroke-width="2"
                stroke-dasharray="5 4"
            />
        
            <circle
                cx="${markerEarthX}"
                cy="${markerEarthY}"
                r="5"
                fill="#88419d"
                stroke="white"
                stroke-width="2"
            />
        
            <text
                x="${markerEarthX}"
                y="${marginTop}"
                text-anchor="middle"
                font-size="11"
                font-weight="600"
                fill="#c62828">
        
                ☀
        
            </text>
        
        ` : ""}
        
        <!-- y-Achse -->

        <line
            x1="${marginLeft}"
            y1="${y(elevationAxis.max)}"
            x2="${marginLeft}"
            y2="${height-marginBottom}"
            stroke="#888"
        />

        <!-- x-Achse -->

        <line
            x1="${marginLeft}"
            y1="${height-marginBottom}"
            x2="${x(distanceAxis.max)}"
            y2="${height-marginBottom}"
            stroke="#888"
        />

        <!-- Höhenbeschriftung -->

        ${elevationText}

        <!-- Distanzachse -->

        ${distanceText}

    `;

}

//----------------------------------------------------
// Azimutlinie für das Höhenprofil
//----------------------------------------------------

let azimuthLine = null;
let profileMapMarker = null;

let azimuthLineStart = null;
let azimuthLineEnd = null;

function drawAzimuthLine(feature) {

    const p = feature.properties;

    const startEasting = Number(p.e);
    const startNorthing = Number(p.n);
    const azimuth = Number(p.Azimut);

    const geometry = createProfileLine(
        startEasting,
        startNorthing,
        azimuth
    );

    const start = geometry.coordinates[0];
    const end = geometry.coordinates[1];

    //------------------------------------------------
    // LV95 → WGS84
    //------------------------------------------------

    const startWgs84 =
        lv95ToWgs84(
            start[0],
            start[1]
        );

    const endWgs84 =
        lv95ToWgs84(
            end[0],
            end[1]
        );

    //------------------------------------------------
    // Alte Linie entfernen
    //------------------------------------------------

    if (azimuthLine) {
        map.removeLayer(azimuthLine);
    }

    //------------------------------------------------
    // Linie zeichnen
    //------------------------------------------------

    azimuthLineStart = startWgs84;
    azimuthLineEnd = endWgs84;

    azimuthLine = L.polyline(
        [
            [startWgs84.lat, startWgs84.lon],
            [endWgs84.lat, endWgs84.lon]
        ],
        {
            color: "#c62828",
            weight: 3,
            dashArray: "6 4",
            opacity: 0.9
        }
    ).addTo(map);

    //------------------------------------------------
    // Beweglichen Marker vorbereiten
    //------------------------------------------------

    if (profileMapMarker) {
        map.removeLayer(profileMapMarker);
    }

    profileMapMarker = L.circleMarker(
        [startWgs84.lat, startWgs84.lon],
        {
            radius: 6,
            color: "#c62828",
            weight: 2,
            fillColor: "#c62828",
            fillOpacity: 1
        }
    ).addTo(map);
}

//----------------------------------------------------
// Kartenmarker anhand der Profildistanz verschieben
//----------------------------------------------------

function moveProfileMapMarker(distance) {

    if (
        !profileMapMarker ||
        !azimuthLineStart ||
        !azimuthLineEnd
    ) {
        return;
    }

    const ratio =
        Math.max(0, Math.min(1, distance / 100));

    const lat =
        azimuthLineStart.lat +
        (azimuthLineEnd.lat - azimuthLineStart.lat) * ratio;

    const lon =
        azimuthLineStart.lon +
        (azimuthLineEnd.lon - azimuthLineStart.lon) * ratio;

    profileMapMarker.setLatLng([
        lat,
        lon
    ]);
}

toggleProfile.addEventListener("click", function(){

    if(profileOpen){

        closeProfile();

    }

    else{

        openProfile();

    }

});

// Funktion um map zu aktualisieren
function updateMap() {

    if (geojsonLayer) {
        map.removeLayer(geojsonLayer);
    }

    const maxDelay = Number(delaySlider.value);
    const minDistance = Number(distanceSlider.value);

    const filtered = {
        ...allData,
        features: allData.features.filter(feature => {

            const p = feature.properties;

            if (sunMode === "sunrise") {

                return (
                    p.Verzoegerungszeit <= maxDelay &&
                    p.Sichtweite >= minDistance
                );

            }

            else {

                return (
                    p.Verzoegerungszeit >= -maxDelay &&
                    p.Sichtweite >= minDistance
                );

            }

        })
    };


    const total = allData.features.length;
    const current = filtered.features.length;

    document.getElementById("count").innerHTML =
        `${current.toLocaleString("de-CH")} / ${total.toLocaleString("de-CH")}`;

    geojsonLayer = L.geoJSON(filtered, {

        pointToLayer: function(feature, latlng) {

            const p = feature.properties;

            return L.circleMarker(latlng, {

                radius: getRadius(p.Sichtweite),

                fillColor: getColor(p.Verzoegerungszeit),

                color: "#222",
                weight: 0.8,

                opacity: 1,
                fillOpacity: 0.9

            });

        },

        onEachFeature: function(feature, layer) {



            layer.on("click", function() {

                layer.bindPopup(
                createPopup(feature),
                    {offset: [-50, -20]}).openPopup();

                updateCompass(
                    feature.properties.Azimut
                );

                drawAzimuthLine(feature);

                document.getElementById(
                    "profile-loading"
                ).style.display = "block";

                openProfile();

                loadElevationProfile(feature);

            });

        }

    });

    geojsonLayer.addTo(map);
}



// Slider aktualisieren
const delaySlider = document.getElementById("delay-slider");
const distanceSlider = document.getElementById("distance-slider");

const prevButton = document.getElementById("prev-day");
const nextButton = document.getElementById("next-day");
const calendarButton = document.getElementById("calendar-button");
const calendarPopup = document.getElementById("calendar-popup");
const calendarPrevMonth = document.getElementById("calendar-prev-month");
const calendarNextMonth = document.getElementById("calendar-next-month");

const sunriseButton = document.getElementById("sunrise-mode");
const sunsetButton = document.getElementById("sunset-mode");

sunriseButton.addEventListener("click", () => {

    if (sunMode === "sunrise")
        return;

    sunMode = "sunrise";

    sunriseButton.classList.add("active");
    sunsetButton.classList.remove("active");

    loadCurrentDate();

});

sunsetButton.addEventListener("click", () => {

    if (sunMode === "sunset")
        return;

    sunMode = "sunset";

    sunsetButton.classList.add("active");
    sunriseButton.classList.remove("active");

    loadCurrentDate();

});

calendarButton.addEventListener("click", () => {

    const isOpen =
        calendarPopup.style.display === "block";

    if (isOpen) {
        calendarPopup.style.display = "none";

    }
    else {
        calendarDate = new Date(currentDate);
        renderCalendar();
        calendarPopup.style.display = "block";
    }

});

calendarPrevMonth.addEventListener("click", () => {

    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar();
});


calendarNextMonth.addEventListener("click", () => {

    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar();
});

function updateDelayLabel() {

    document.getElementById("delay-value").innerHTML =
        `≤ ${delaySlider.value} min`;

}

function updateDistanceLabel() {

    document.getElementById("distance-value").innerHTML =
        `≥ ${distanceSlider.value} km`;

}

delaySlider.addEventListener("input", updateDelayLabel);
distanceSlider.addEventListener("input", updateDistanceLabel);

delaySlider.addEventListener("change", updateMap);
distanceSlider.addEventListener("change", updateMap);

prevButton.addEventListener("click", () => {

    const available = getAvailableDates();
    const current = formatDateForFilename(currentDate);
    const index = available.indexOf(current);

    if (index > 0) {

        currentDate = new Date(
            available[index - 1].replaceAll("_", "-")
        );
        calendarPopup.style.display = "none";
        loadCurrentDate();

    }

});

nextButton.addEventListener("click", () => {

    const available = getAvailableDates();
    const current = formatDateForFilename(currentDate);
    const index = available.indexOf(current);

    if (index >= 0 && index < available.length - 1) {

        currentDate = new Date(
            available[index + 1].replaceAll("_", "-")
        );
        calendarPopup.style.display = "none";
        loadCurrentDate();

    }

});

let allData;
let geojsonLayer;
let availableDates;
let currentDate = new Date();
let calendarDate = new Date();
let sunMode = "sunrise";

async function loadAvailableDates() {

    const response = await fetch("https://pub-2a8a04e8ca3c42968cac635ba6d65a1d.r2.dev/available_dates.json");

    if (!response.ok) {
        throw new Error("available_dates.json nicht gefunden");
    }

    availableDates = await response.json();

}

function getAvailableDates() {

    return availableDates[sunMode];

}

function renderCalendar() {

    const grid = document.getElementById("calendar-grid");
    const monthLabel = document.getElementById("calendar-month");

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const weekdays = [
        "Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"
    ];

    grid.innerHTML = "";

    weekdays.forEach(day => {

        const element = document.createElement("div");

        element.className = "calendar-weekday";
        element.textContent = day;

        grid.appendChild(element);

    });

    monthLabel.textContent =
        firstDay.toLocaleDateString("de-CH", {
            month: "long",
            year: "numeric"
        });

    let startDay = firstDay.getDay();

    // JavaScript: Sonntag = 0
    // Wir wollen Montag = 0
    startDay = (startDay + 6) % 7;

    for (let i = 0; i < startDay; i++) {

        const empty = document.createElement("div");

        empty.className = "calendar-day empty";

        grid.appendChild(empty);

    }

    const available = getAvailableDates();

    for (let day = 1; day <= lastDay.getDate(); day++) {

        const date = new Date(year, month, day);

        const dateString =
            formatDateForFilename(date);

        const button =
            document.createElement("button");

        button.className = "calendar-day";
        button.textContent = day;

        if (available.includes(dateString)) {

            button.classList.add("available");

            if (dateString === formatDateForFilename(currentDate)) {
                button.classList.add("selected");
            }

            button.addEventListener("click", () => {

                currentDate = date;

                updateDateLabel();
                loadCurrentDate();

                calendarPopup.style.display = "none";

            });

        }
        else {

            button.disabled = true;
            button.style.opacity = "0.3";
            button.style.cursor = "default";

        }

        grid.appendChild(button);

    }

        const previousMonth = new Date(
        year,
        month - 1,
        1
    );

    const nextMonth = new Date(
        year,
        month + 1,
        1
    );

    const hasPreviousMonth =
        available.some(dateString => {

            const date = new Date(
                dateString.replaceAll("_", "-")
            );

            return (
                date.getFullYear() < previousMonth.getFullYear() ||
                (
                    date.getFullYear() === previousMonth.getFullYear() &&
                    date.getMonth() === previousMonth.getMonth()
                )
            );

        });

    const hasNextMonth =
        available.some(dateString => {

            const date = new Date(
                dateString.replaceAll("_", "-")
            );

            return (
                date.getFullYear() > nextMonth.getFullYear() ||
                (
                    date.getFullYear() === nextMonth.getFullYear() &&
                    date.getMonth() === nextMonth.getMonth()
                )
            );

        });

    calendarPrevMonth.disabled = !hasPreviousMonth;
    calendarNextMonth.disabled = !hasNextMonth;

}

function loadCurrentDate() {

    const available = getAvailableDates();

    const dateString = formatDateForFilename(currentDate);

    if (!available.includes(dateString)) {

        console.warn("Datum nicht verfügbar:", dateString);

        return;

    }

    updateDateLabel();

    const prefix = sunMode === "sunrise"
        ? "Sonnenaufgang"
        : "Sonnenuntergang";

    const folder = sunMode === "sunrise"
        ? "sunrise"
        : "sunset";

    const filename =
        `${prefix}_${formatDateForFilename(currentDate)}_20km_900s.geojson.gz`;

    fetch(`https://pub-2a8a04e8ca3c42968cac635ba6d65a1d.r2.dev/${folder}/${filename}`)
        .then(response => {

            if (!response.ok) {
                throw new Error("Datei nicht gefunden");
            }

            return response.json();

        })
        .then(data => {

            allData = data;

            updateMap();

        })
        .catch(error => {

            console.error(error);

            alert("Für dieses Datum sind keine Daten vorhanden.");

        });

}

updateDelayLabel();
updateDistanceLabel();

loadAvailableDates()
    .then(() => {

        const available = getAvailableDates();

        if (available.length > 0) {
            const today = formatDateForFilename(new Date());

            if (available.includes(today)) {
                currentDate = new Date(
                    today.replaceAll("_", "-")
                );
            }
            else {
                currentDate = new Date(
                    available[0].replaceAll("_", "-")
                );
            }
        }

        loadCurrentDate();

    })
    .catch(error => {

        console.error(error);

        alert("Die verfügbaren Daten konnten nicht geladen werden.");

    });
