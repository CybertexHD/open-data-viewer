// =======================
// OpenLayers Viewer mit Unterstützung für GeoJSON, KML, GPX und einfache JSON-Dateien
// =======================

// Initialisierung der Karte mit OpenStreetMap als Hintergrundkarte
var map = new ol.Map({
    target: 'map', // ID des HTML-Elements, in dem die Karte angezeigt wird
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM({ attributions: [] }) // OpenStreetMap als Kartengrundlage
        })
    ],
    view: new ol.View({
        center: ol.proj.fromLonLat([13.404954, 52.5200066]), // Startposition: Berlin
        zoom: 5 // Anfangszoomstufe
    })
});

// Objekt zum Speichern aller hochgeladenen Layer, damit man sie später löschen/exportieren kann
var uploadedLayers = {}; // z. B. uploadedLayers["daten.geojson"] = <Layer>

// Interaktion, um Features (z. B. Punkte/Polygone) auf der Karte selektieren zu können
var selectInteraction = new ol.interaction.Select();
map.addInteraction(selectInteraction);

// Funktion zur Stilzuweisung je nach Geometrietyp des Features
function getFeatureStyle(feature) {
    if (!feature || !feature.getGeometry) return null;
    var geometry = feature.getGeometry();
    if (!geometry) return null;
    var geometryType = geometry.getType();

    switch (geometryType) {
        case 'Point':
        case 'MultiPoint':
            // Stil für Punkte: roter Kreis mit schwarzem Rand
            return new ol.style.Style({
                image: new ol.style.Circle({
                    radius: 6,
                    fill: new ol.style.Fill({ color: 'red' }),
                    stroke: new ol.style.Stroke({ color: '#000', width: 2 })
                })
            });

        case 'LineString':
        case 'MultiLineString':
            // Stil für Linien: blaue Linie
            return new ol.style.Style({
                stroke: new ol.style.Stroke({ color: '#0077ff', width: 3 })
            });

        case 'Polygon':
        case 'MultiPolygon':
            // Stil für Flächen: grün-transparent mit dunklem Rand
            return new ol.style.Style({
                fill: new ol.style.Fill({ color: 'rgba(0, 128, 0, 0.3)' }),
                stroke: new ol.style.Stroke({ color: '#006400', width: 2 })
            });

        default:
            console.warn("Unbekannter Geometrietyp:", geometryType);
            return null;
    }
}

// Funktion zum Verarbeiten hochgeladener Dateien (GeoJSON, KML, GPX oder einfache JSONs)
function handleFileUpload(file) {
    var reader = new FileReader();

    reader.onload = function (event) {
        var fileExt = file.name.split('.').pop().toLowerCase();

        // Wenn einfache JSON-Datei (kein GeoJSON), dann Koordinaten manuell verarbeiten
        if (fileExt === 'json') {
            try {
                const parsed = JSON.parse(event.target.result);
                let features = [];

                // JSON-Array erwartet mit Feldern "lat"/"lon" oder "latitude"/"longitude"
                if (Array.isArray(parsed)) {
                    parsed.forEach(entry => {
                        const lat = entry.lat ?? entry.latitude;
                        const lon = entry.lon ?? entry.longitude;
                        if (lat !== undefined && lon !== undefined) {
                            const feature = new ol.Feature({
                                geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat])),
                                name: entry.name || 'Unbenannt',
                                info: entry.info || ''
                            });
                            features.push(feature);
                        }
                    });
                } else {
                    alert("Die JSON-Datei enthält kein Array. Struktur erwartet: [{latitude: ..., longitude: ...}, ...]");
                    return;
                }

                if (features.length === 0) {
                    alert("Keine gültigen Koordinaten in der JSON-Datei gefunden.");
                    return;
                }

                // Layer erstellen
                const newVectorSource = new ol.source.Vector({ features });
                const newLayer = new ol.layer.Vector({
                    source: newVectorSource,
                    style: getFeatureStyle
                });

                map.addLayer(newLayer);
                uploadedLayers[file.name] = newLayer;

                // Zoomen auf geladenen Bereich
                const extent = newVectorSource.getExtent();
                if (!ol.extent.isEmpty(extent)) {
                    map.getView().fit(extent, { padding: [50, 50, 50, 50], maxZoom: 15 });
                }

                // Datei in der Dateiliste anzeigen + Lösch- und Exportbuttons
                const fileNamesList = document.getElementById('fileNames');
                const li = document.createElement('li');
                li.textContent = file.name;
                li.id = 'entry-' + file.name;

                const actionContainer = document.createElement('div');
                actionContainer.className = 'action-icons';

                // Button zum Entfernen des Layers
                const delBtn = document.createElement('button');
                delBtn.textContent = '🗑️';
                delBtn.className = 'layer-action-button';
                delBtn.onclick = function () {
                    map.removeLayer(uploadedLayers[file.name]);
                    delete uploadedLayers[file.name];
                    fileNamesList.removeChild(li);
                };

                // Button zum Exportieren des Layers als GeoJSON
                const expBtn = document.createElement('button');
                expBtn.textContent = '📤';
                expBtn.className = 'layer-action-button';
                expBtn.onclick = function () {
                    const customName = prompt("Wie soll die Datei heißen?");
                    if (!customName) return;

                    const format = new ol.format.GeoJSON();
                    const featuresToExport = uploadedLayers[file.name]?.getSource()?.getFeatures();
                    if (!featuresToExport) return;

                    const geojson = format.writeFeatures(featuresToExport, {
                        featureProjection: 'EPSG:3857'
                    });

                    const blob = new Blob([geojson], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = customName.endsWith('.geojson') ? customName : customName + '.geojson';
                    a.click();
                    URL.revokeObjectURL(url);
                };

                // Buttons zur Dateiliste hinzufügen
                actionContainer.appendChild(delBtn);
                actionContainer.appendChild(expBtn);
                li.appendChild(actionContainer);
                fileNamesList.appendChild(li);
                return;
            } catch (e) {
                alert("Fehler beim Parsen der JSON-Datei: " + e.message);
                return;
            }
        }

        // Bei GeoJSON, KML, GPX → direkt mit OpenLayers-Formaten einlesen
        let format;
        if (fileExt === 'kml') {
            format = new ol.format.KML();
        } else if (fileExt === 'gpx') {
            format = new ol.format.GPX();
        } else {
            format = new ol.format.GeoJSON();
        }

        // Features aus Datei laden
        const features = format.readFeatures(event.target.result, {
            featureProjection: 'EPSG:3857'
        });

        // Neuen Layer erzeugen und zur Karte hinzufügen
        const newVectorSource = new ol.source.Vector({ features });
        const newLayer = new ol.layer.Vector({
            source: newVectorSource,
            style: getFeatureStyle
        });

        map.addLayer(newLayer);
        uploadedLayers[file.name] = newLayer;

        const extent = newVectorSource.getExtent();
        if (!ol.extent.isEmpty(extent)) {
            map.getView().fit(extent, { padding: [50, 50, 50, 50], maxZoom: 15 });
        }

        // Datei in Liste einfügen (inkl. Button zum Löschen/Exportieren)
        const fileNamesList = document.getElementById('fileNames');
        const li = document.createElement('li');
        li.textContent = file.name;
        li.id = 'entry-' + file.name;

        const actionContainer = document.createElement('div');
        actionContainer.className = 'action-icons';

        const delBtn = document.createElement('button');
        delBtn.textContent = '🗑️';
        delBtn.className = 'layer-action-button';
        delBtn.onclick = function () {
            map.removeLayer(uploadedLayers[file.name]);
            delete uploadedLayers[file.name];
            fileNamesList.removeChild(li);
        };

        const expBtn = document.createElement('button');
        expBtn.textContent = '📤';
        expBtn.className = 'layer-action-button';
        expBtn.onclick = function () {
            const customName = prompt("Wie soll die Datei heißen?");
            if (!customName) return;

            const format = new ol.format.GeoJSON();
            const layer = uploadedLayers[file.name];
            if (!layer) return;
            const features = layer.getSource().getFeatures();
            const geojson = format.writeFeatures(features, {
                featureProjection: 'EPSG:3857'
            });
            const blob = new Blob([geojson], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = customName.endsWith('.geojson') ? customName : customName + '.geojson';
            a.click();
            URL.revokeObjectURL(url);
        };

        actionContainer.appendChild(delBtn);
        actionContainer.appendChild(expBtn);
        li.appendChild(actionContainer);
        fileNamesList.appendChild(li);
    };

    reader.readAsText(file); // 🔃 Inhalt der Datei lesen
}

// Dateiinput: auf erlaubte Endungen prüfen und Datei verarbeiten
const allowedExtensions = ['geojson', 'json', 'kml', 'gpx'];

document.getElementById('fileInput').addEventListener('change', function (event) {
    var files = event.target.files;
    if (files.length === 0) {
        alert('Bitte wähle mindestens eine Datei aus!');
        return;
    }

    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        let ext = file.name.split('.').pop().toLowerCase();

        if (!allowedExtensions.includes(ext)) {
            alert(`Dateityp .${ext} wird nicht unterstützt.`);
            continue;
        }

        if (!uploadedLayers[file.name]) {
            handleFileUpload(file);
        } else {
            alert(`Datei ${file.name} wurde bereits hochgeladen.`);
        }
    }
});

// Export von ausgewählten (selektierten) Features über Button
const exportSelectionBtn = document.getElementById('exportSelection');
exportSelectionBtn.className = 'layer-action-button';
exportSelectionBtn.addEventListener('click', function () {
    const selectedFeatures = selectInteraction.getFeatures();
    if (selectedFeatures.getLength() === 0) {
        alert("Bitte wähle mindestens ein Objekt auf der Karte aus.");
        return;
    }

    const customName = prompt("Wie soll die Export-Datei heißen?");
    if (!customName) return;

    const format = new ol.format.GeoJSON();
    const geojson = format.writeFeatures(selectedFeatures.getArray(), {
        featureProjection: 'EPSG:3857'
    });
    const blob = new Blob([geojson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = customName.endsWith('.geojson') ? customName : customName + '.geojson';
    a.click();
    URL.revokeObjectURL(url);
});

// Zoom-Steuerung an definierte Position setzen
var zoomControl = new ol.control.Zoom();
map.removeControl(map.getControls().getArray().find(ctrl => ctrl instanceof ol.control.Zoom));
map.addControl(zoomControl);

// Positionieren der Zoom-Buttons links unten in der Karte
window.addEventListener('load', function () {
    var zoomElement = document.querySelector('.ol-zoom');
    if (zoomElement) {
        zoomElement.style.position = 'absolute';
        zoomElement.style.bottom = '10px';
        zoomElement.style.left = '10px';
        zoomElement.style.zIndex = '1000';
    }
});
