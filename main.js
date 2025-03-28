import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';

const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new OSM()
    })
  ],
  view: new View({
    center: [0, 0],
    zoom: 2
  })
});

// Funktion, um die hochgeladene Datei zu lesen und auf der Karte darzustellen
document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    
    if (file && file.name.endsWith('.geojson')) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const geojsonData = e.target.result;
            const vectorLayer = new VectorLayer({
                source: new VectorSource({
                    url: geojsonData,
                    format: new GeoJSON()
                })
            });

            // Füge den neuen Layer zur Karte hinzu
            map.addLayer(vectorLayer);
        };
        
        reader.readAsText(file);
    } else {
        alert('Bitte lade eine gültige GeoJSON-Datei hoch.');
    }
});

