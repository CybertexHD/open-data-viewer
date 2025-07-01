// =======================
// OpenLayers Viewer mit Punktbeschriftung (Dateiname) und Export ohne Label-Verlust
// =======================

var map = new ol.Map({
    target: 'map',
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM({ attributions: [] })
        })
    ],
    view: new ol.View({
        center: ol.proj.fromLonLat([13.404954, 52.5200066]),
        zoom: 5
    })
});

var uploadedLayers = {};
var selectInteraction = new ol.interaction.Select({
    style: function (feature) {
        const label = feature.get('label') || feature.get('name') || '';
        const geometry = feature.getGeometry();
        const geometryType = geometry.getType();

        switch (geometryType) {
            case 'Point':
            case 'MultiPoint':
                return new ol.style.Style({
                    image: new ol.style.Circle({
                        radius: 6,
                        fill: new ol.style.Fill({ color: 'limegreen' }), // Punkt wird grün
                        stroke: new ol.style.Stroke({ color: '#000', width: 2 })
                    }),
                    text: new ol.style.Text({
                        text: label,
                        font: '12px Arial',
                        fill: new ol.style.Fill({ color: '#000' }),
                        stroke: new ol.style.Stroke({ color: '#fff', width: 2 }),
                        offsetY: -15
                    })
                });

            case 'LineString':
            case 'MultiLineString':
                return new ol.style.Style({
                    stroke: new ol.style.Stroke({ color: 'limegreen', width: 3 }),
                    text: new ol.style.Text({
                        text: label,
                        font: '12px Arial',
                        fill: new ol.style.Fill({ color: '#000' }),
                        stroke: new ol.style.Stroke({ color: '#fff', width: 2 }),
                        placement: 'line'
                    })
                });

            case 'Polygon':
            case 'MultiPolygon':
                return new ol.style.Style({
                    fill: new ol.style.Fill({ color: 'rgba(50, 205, 50, 0.3)' }), // hellgrüner Füllstil
                    stroke: new ol.style.Stroke({ color: 'green', width: 2 }),
                    text: new ol.style.Text({
                        text: label,
                        font: '12px Arial',
                        fill: new ol.style.Fill({ color: '#000' }),
                        stroke: new ol.style.Stroke({ color: '#fff', width: 2 }),
                        overflow: true
                    })
                });

            default:
                return null;
        }
    }
});



map.addInteraction(selectInteraction);

// Stilfunktion mit Label für Punkte
function getFeatureStyle(feature) {
    if (!feature || !feature.getGeometry) return null;
    const geometry = feature.getGeometry();
    if (!geometry) return null;
    const geometryType = geometry.getType();

    // Gemeinsames Label für alle Geometrien (wenn vorhanden)
    const label = feature.get('label') || feature.get('name') || '';

    switch (geometryType) {
        case 'Point':
        case 'MultiPoint':
            return new ol.style.Style({
                image: new ol.style.Circle({
                    radius: 6,
                    fill: new ol.style.Fill({ color: 'red' }),
                    stroke: new ol.style.Stroke({ color: '#000', width: 2 })
                }),
                text: new ol.style.Text({
                    text: label,
                    font: '12px Arial',
                    fill: new ol.style.Fill({ color: '#000' }),
                    stroke: new ol.style.Stroke({ color: '#fff', width: 2 }),
                    offsetY: -15
                })
            });

        case 'LineString':
        case 'MultiLineString':
            return new ol.style.Style({
                stroke: new ol.style.Stroke({ color: '#0077ff', width: 3 }),
                text: new ol.style.Text({
                    text: label,
                    font: '12px Arial',
                    fill: new ol.style.Fill({ color: '#000' }),
                    stroke: new ol.style.Stroke({ color: '#fff', width: 2 }),
                    placement: 'line'
                })
            });

        case 'Polygon':
        case 'MultiPolygon':
            return new ol.style.Style({
                fill: new ol.style.Fill({ color: 'rgba(255, 0, 0, 0.3)' }), // transparente rote Fläche
                stroke: new ol.style.Stroke({ color: 'red', width: 2 }),   // rote Umrandung
                text: new ol.style.Text({
                    text: label,
                    font: '12px Arial',
                    fill: new ol.style.Fill({ color: '#000' }),
                    stroke: new ol.style.Stroke({ color: '#fff', width: 2 }),
                    overflow: true
                })
            });


        default:
            return null;
    }
}


// Hauptfunktion zur Datei-Verarbeitung
function handleFileUpload(file) {
    var reader = new FileReader();

    reader.onload = function (event) {
        var fileExt = file.name.split('.').pop().toLowerCase();
        var labelBase = file.name.replace(/\.[^/.]+$/, ""); // Dateiname ohne Endung

        // Verarbeitung einfacher JSON-Dateien mit Koordinaten
        if (fileExt === 'json') {
            try {
                const parsed = JSON.parse(event.target.result);
                let features = [];

                if (Array.isArray(parsed)) {
                    parsed.forEach((entry, i) => {
                        const lat = entry.lat ?? entry.latitude;
                        const lon = entry.lon ?? entry.longitude;
                        if (lat !== undefined && lon !== undefined) {
                            const label = `${labelBase} ${i + 1}`; // z. B. "test 1", "test 2"

                            // Optionaler Prompt für individuellen Namen
                            // const userLabel = prompt(`Name für Punkt bei [${lat}, ${lon}]?`, label) || label;

                            const feature = new ol.Feature({
                                geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat])),
                                name: entry.name || 'Unbenannt',
                                info: entry.info || '',
                                label: label // Beschriftung für Darstellung
                            });
                            features.push(feature);
                        }
                    });
                } else {
                    alert("Die JSON-Datei enthält kein Array.");
                    return;
                }

                if (features.length === 0) {
                    alert("Keine gültigen Koordinaten gefunden.");
                    return;
                }

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

                actionContainer.appendChild(delBtn);
                li.appendChild(actionContainer);
                fileNamesList.appendChild(li);
                return;
            } catch (e) {
                alert("Fehler beim Parsen der JSON-Datei: " + e.message);
                return;
            }
        }

        // Verarbeitung GeoJSON, KML, GPX
        let format;
        if (fileExt === 'kml') {
            format = new ol.format.KML();
        } else if (fileExt === 'gpx') {
            format = new ol.format.GPX();
        } else {
            format = new ol.format.GeoJSON();
        }

        const features = format.readFeatures(event.target.result, {
            featureProjection: 'EPSG:3857'
        });

        // Labels ergänzen (nur für Punkte)
        features.forEach((f, i) => {
            const geom = f.getGeometry();
            if (geom && ['Point', 'Polygon', 'MultiPolygon', 'LineString'].includes(geom.getType())) {
                const label = `${labelBase} ${i + 1}`;
                f.set('label', label);
            }
        });


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

        actionContainer.appendChild(delBtn);
        li.appendChild(actionContainer);
        fileNamesList.appendChild(li);
    };

    reader.readAsText(file);
}

// Dateiinput verarbeiten
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

// Export der selektierten Features als GeoJSON
const exportSelectionBtn = document.getElementById('exportSelection');
exportSelectionBtn.className = 'layer-action-button';
exportSelectionBtn.addEventListener('click', function () {
    const selectedFeatures = selectInteraction.getFeatures();
    if (selectedFeatures.getLength() === 0) {
        alert("Bitte wähle mindestens ein Objekt aus.");
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

// Zoom-Steuerung unten links positionieren
var zoomControl = new ol.control.Zoom();
map.removeControl(map.getControls().getArray().find(ctrl => ctrl instanceof ol.control.Zoom));
map.addControl(zoomControl);

window.addEventListener('load', function () {
    var zoomElement = document.querySelector('.ol-zoom');
    if (zoomElement) {
        zoomElement.style.position = 'absolute';
        zoomElement.style.bottom = '10px';
        zoomElement.style.left = '10px';
        zoomElement.style.zIndex = '1000';
    }
});

// Punkt-Label per Alt-Klick umbenennen
map.on('singleclick', function (evt) {
    if (!evt.originalEvent.altKey) return; // Nur wenn Alt-Taste gedrückt ist

    map.forEachFeatureAtPixel(evt.pixel, function (feature) {
        const geometry = feature.getGeometry();
        if (!['Point', 'LineString', 'Polygon', 'MultiPolygon'].includes(geometry.getType())) return;

        const currentLabel = feature.get('label') || '';
        const newLabel = prompt("Neuer Name für den Punkt:", currentLabel);
        if (newLabel !== null) {
            feature.set('label', newLabel);

            // Stil sofort aktualisieren (falls Stylefunktion gecacht ist)
            feature.changed();
        }
    });
});
