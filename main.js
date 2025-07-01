// =======================
// 🗺️ OpenLayers GeoJSON Viewer
// =======================
// Dieser Code rendert eine OSM-Karte, lädt GeoJSON-Dateien, zeigt Punkte, Linien, Flächen
// und passt das Styling dynamisch an den Geometrie-Typ an

// 1. Erstelle die OpenLayers-Karte
var map = new ol.Map({
    target: 'map', // ID des HTML-Elements, in dem die Karte gerendert wird
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM({
                attributions: [] // Deaktiviert das OSM-Wasserzeichen
            })
        })
    ],
    view: new ol.View({
        center: ol.proj.fromLonLat([13.404954, 52.5200066]), // Start: Berlin
        zoom: 5
    })
});

// 2. Erstelle die gemeinsame Feature-Quelle
var vectorSource = new ol.source.Vector();

// 3. Erstelle den Vektor-Layer mit dynamischer Stilfunktion
var vectorLayer = new ol.layer.Vector({
    source: vectorSource,
    style: function (feature) {
        if (!feature || !feature.getGeometry) return null;

        var geometry = feature.getGeometry();
        if (!geometry) return null;

        var geometryType = geometry.getType();

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
                        text: feature.get('name') || '',
                        offsetY: -15,
                        font: '12px Calibri,sans-serif',
                        fill: new ol.style.Fill({ color: '#000' }),
                        stroke: new ol.style.Stroke({ color: '#fff', width: 3 })
                    })
                });

            case 'LineString':
            case 'MultiLineString':
                return new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: '#0077ff',
                        width: 3
                    })
                });

            case 'Polygon':
            case 'MultiPolygon':
                return new ol.style.Style({
                    fill: new ol.style.Fill({
                        color: 'rgba(0, 128, 0, 0.3)'
                    }),
                    stroke: new ol.style.Stroke({
                        color: '#006400',
                        width: 2
                    })
                });

            default:
                console.warn("Unbekannter Geometrietyp:", geometryType);
                return null;
        }
    }
});

// 4. Füge den Vektor-Layer der Karte hinzu
map.addLayer(vectorLayer);

// 5. Datei-Upload und Feature-Laden
function handleFileUpload(file) {
    var reader = new FileReader();

    reader.onload = function(event) {
        var geojsonData = JSON.parse(event.target.result);

        var format = new ol.format.GeoJSON();
        var features = format.readFeatures(geojsonData, {
            featureProjection: 'EPSG:3857'
        });

        vectorSource.addFeatures(features);

        // Zoome auf alle geladenen Features
        var extent = vectorSource.getExtent();
        if (!ol.extent.isEmpty(extent)) {
            map.getView().fit(extent, { padding: [50, 50, 50, 50], maxZoom: 15 });
        }

        console.log("Features geladen:", features.length);
    };

    reader.readAsText(file);
}

// 6. Event-Handler für Datei-Input
// Reagiere auf Auswahl von GeoJSON-Dateien
// Datei-Upload aktivieren über unsichtbares <input>
document.getElementById('fileInput').addEventListener('change', function(event) {
    var files = event.target.files;
    if (files.length === 0) {
        alert('Bitte wähle mindestens eine GeoJSON-Datei aus!');
        return;
    }

    var fileNamesList = document.getElementById('fileNames');

    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        if (file.name.endsWith('.geojson')) {
            handleFileUpload(file);

            if (![...fileNamesList.children].some(item => item.textContent === file.name)) {
                var li = document.createElement('li');
                li.textContent = file.name;
                fileNamesList.appendChild(li);
            }
        } else {
            alert(`Die Datei ${file.name} ist keine GeoJSON-Datei.`);
        }
    }
});

// 7. Zoom-Steuerung links unten positionieren
var zoomControl = new ol.control.Zoom();
map.removeControl(map.getControls().getArray().find(ctrl => ctrl instanceof ol.control.Zoom));
map.addControl(zoomControl);

// Nach dem Laden das Zoom-Element verschieben (nach unten links)
window.addEventListener('load', function() {
    var zoomElement = document.querySelector('.ol-zoom');
    if (zoomElement) {
        zoomElement.style.position = 'absolute';
        zoomElement.style.bottom = '10px';
        zoomElement.style.left = '10px';
        zoomElement.style.zIndex = '1000';
    }
});
