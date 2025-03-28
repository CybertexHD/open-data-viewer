// Erstelle die OpenLayers Karte
var map = new ol.Map({
    target: 'map', // Die ID des Containers, in dem die Karte gerendert wird
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM({
                attributions: []  // Deaktiviert das Wasserzeichen
            }) // OpenStreetMap als Basiskarte
        })
    ],
    view: new ol.View({
        center: ol.proj.fromLonLat([13.404954, 52.5200066]), // Berlin
        zoom: 5
    })
});

// Gemeinsame Quelle für alle Features
var vectorSource = new ol.source.Vector(); // Quelle für alle GeoJSON-Dateien

// Vektor-Layer für die Punkte
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

map.addLayer(vectorLayer); // Ein Layer für alle Punkte zur Karte hinzufügen

// Funktion zum Verarbeiten und Anzeigen der GeoJSON-Datei
function handleFileUpload(file) {
    var reader = new FileReader();

    reader.onload = function(event) {
        var geojsonData = event.target.result;

        var format = new ol.format.GeoJSON();
        var features = format.readFeatures(geojsonData, {
            featureProjection: 'EPSG:3857' // Projektion auf Web Mercator
        });

        vectorSource.addFeatures(features); // Neue Features zur gemeinsamen Quelle hinzufügen

        // Zoomen auf alle geladenen Features
        var extent = vectorSource.getExtent();
        if (!ol.extent.isEmpty(extent)) {
            map.getView().fit(extent, { padding: [50, 50, 50, 50], maxZoom: 15 });
        }
    };

    reader.readAsText(file);
}

// Event-Listener für die Auswahl von Dateien
document.getElementById('fileInput').addEventListener('change', function(event) {
    var files = event.target.files;

    if (files.length === 0) {
        alert('Bitte wähle mindestens eine GeoJSON-Datei aus!');
        return;
    }

    // Liste der Dateinamen nicht leeren, sondern nur neue Einträge hinzufügen
    var fileNamesList = document.getElementById('fileNames');

    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        if (file.name.endsWith('.geojson')) {
            handleFileUpload(file);  // Datei verarbeiten

            // Füge den Dateinamen zur Liste hinzu (nur wenn der Name noch nicht vorhanden ist)
            if (![...fileNamesList.children].some(item => item.textContent === file.name)) {
                var li = document.createElement('li');
                li.textContent = file.name; // Dateiname als Text
                fileNamesList.appendChild(li); // Liste einfügen
            }
        } else {
            alert(`Die Datei ${file.name} ist keine GeoJSON-Datei.`);
        }
    }
});

// Verhindern, dass der Benutzer durch die Karte mit Strg+Mausrad zoomt
document.addEventListener("wheel", function (event) {
    if (event.ctrlKey) {
        event.preventDefault();
    }
}, { passive: false });

// Zoom-Steuerung hinzufügen
var zoomControl = new ol.control.Zoom();

// Entfernen der Standard-Zoom-Steuerung oben
map.removeControl(map.getControls().getArray().find(control => control instanceof ol.control.Zoom));

// Zoom-Steuerung unten links hinzufügen
map.addControl(zoomControl);

// CSS für Zoom-Steuerung links unten positionieren
var zoomElement = document.querySelector('.ol-zoom');
zoomElement.style.position = 'absolute';
zoomElement.style.bottom = '10px'; // Abstand vom unteren Rand
zoomElement.style.left = '10px';   // Abstand vom linken Rand
zoomElement.style.zIndex = '1000'; // Damit es oben bleibt
