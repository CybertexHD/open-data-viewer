// Erstelle die OpenLayers Karte
var map = new ol.Map({
    target: 'map', // Die ID des Containers, in dem die Karte gerendert wird
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM() // OpenStreetMap als Basiskarte
        })
    ],
    view: new ol.View({
        center: ol.proj.fromLonLat([13.404954, 52.5200066]), // Berlin
        zoom: 5
    })
});

// Funktion, um GeoJSON-Dateien zu laden und auf der Karte anzuzeigen
function handleFileUpload(file) {
    var reader = new FileReader();

    reader.onload = function(event) {
        // Die gelesenen GeoJSON-Daten
        var geojsonData = event.target.result;

        // GeoJSON in OpenLayers Features umwandeln
        var format = new ol.format.GeoJSON();
        var features = format.readFeatures(geojsonData, {
            featureProjection: 'EPSG:3857' // Die Projektion auf die Karte (Web Mercator)
        });

        // Vektorquelle mit den Features erstellen
        var vectorSource = new ol.source.Vector({
            features: features
        });

        // Vektor-Layer mit der Vektorquelle
        var vectorLayer = new ol.layer.Vector({
            source: vectorSource
        });

        // Vektor-Layer zur Karte hinzufügen
        map.addLayer(vectorLayer);

        // Auf die gezeigten Features zoomen
        map.getView().fit(vectorSource.getExtent(), {
            padding: [50, 50, 50, 50]
        });
    };

    // GeoJSON-Datei lesen
    reader.readAsText(file);
}

// Event-Listener für die Auswahl der Datei
document.getElementById('fileInput').addEventListener('change', function(event) {
    var files = event.target.files;
    
    if (files.length === 0) {
        alert('Bitte wähle mindestens eine GeoJSON-Datei aus!');
        return;
    }

    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        if (file.name.endsWith('.geojson')) {
            handleFileUpload(file);  // Datei verarbeiten
        } else {
            alert(`Die Datei ${file.name} ist keine GeoJSON-Datei.`);
        }
    }
});

// Funktion, um GeoJSON-Dateien zu laden und auf der Karte anzuzeigen
var vectorSource = new ol.source.Vector(); // 🗂 Gemeinsame Quelle für alle Dateien
var vectorLayer = new ol.layer.Vector({
    source: vectorSource,
    style: new ol.style.Style({
        image: new ol.style.Circle({
            radius: 6,
            fill: new ol.style.Fill({ color: 'red' }),
            stroke: new ol.style.Stroke({ color: '#000', width: 2 })
        })
    })
});

map.addLayer(vectorLayer); // 🗺 Einmaliger Layer für alle Punkte

function handleFileUpload(file) {
    var reader = new FileReader();

    reader.onload = function(event) {
        var geojsonData = event.target.result;

        var format = new ol.format.GeoJSON();
        var features = format.readFeatures(geojsonData, {
            featureProjection: 'EPSG:3857'
        });

        vectorSource.addFeatures(features); // 📌 Neue Features zur gemeinsamen Quelle hinzufügen

        // 📍 Automatisches Zoomen auf alle geladenen Features
        var extent = vectorSource.getExtent();
        if (!ol.extent.isEmpty(extent)) {
            map.getView().fit(extent, { padding: [50, 50, 50, 50], maxZoom: 15 });
        }
    };

    reader.readAsText(file);
}


