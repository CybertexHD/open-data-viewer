// Initialisierung der Karte und globaler Variablen
const map = new ol.Map({
  target: 'map',
  layers: [
    new ol.layer.Tile({
      source: new ol.source.OSM()
    })
  ],
  view: new ol.View({
    center: ol.proj.fromLonLat([13.5, 51.05]),
    zoom: 9
  })
});

const uploadedLayers = {};
const selectedFeatures = new ol.Collection();
const loadingOverlay = document.getElementById('loading');

// Selektion von Features ermöglichen
const selectInteraction = new ol.interaction.Select({
  multi: true,
  features: selectedFeatures,
  style: null,
  layers: () => true
});

map.addInteraction(selectInteraction);

// Style-Funktion für Features (inkl. Cluster)
function getFeatureStyle(feature) {
  const geometry = feature.getGeometry();
  if (!geometry) return null;

  const type = geometry.getType();
  const clustered = feature.get('features');

  if (clustered && clustered.length > 1) {
    const allSelected = clustered.every(f => selectedFeatures.getArray().includes(f));
    return new ol.style.Style({
      image: new ol.style.Circle({
        radius: 10,
        fill: new ol.style.Fill({ color: allSelected ? 'limegreen' : '#ff6600' }),
        stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
      }),
      text: new ol.style.Text({
        text: clustered.length.toString(),
        fill: new ol.style.Fill({ color: '#000' }),
        stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
      })
    });
  }

  const selected = selectedFeatures.getArray().includes(feature);
  const label = feature.get('label') || feature.get('name') || '';
  const color = selected ? 'limegreen' : 'red';

  const textStyle = new ol.style.Text({
    text: label,
    font: '12px Orbitron, sans-serif',
    fill: new ol.style.Fill({ color: '#00f0ff' }),
    stroke: new ol.style.Stroke({ color: '#000', width: 2 }),
    offsetY: type === 'Point' ? -15 : 0,
    placement: type.includes('Line') ? 'line' : undefined
  });

  switch (type) {
    case 'Point':
      return new ol.style.Style({
        image: new ol.style.Circle({
          radius: 6,
          fill: new ol.style.Fill({ color }),
          stroke: new ol.style.Stroke({ color: '#000', width: 2 })
        }),
        text: textStyle
      });
    case 'LineString':
    case 'MultiLineString':
      return new ol.style.Style({
        stroke: new ol.style.Stroke({ color, width: 3 }),
        text: textStyle
      });
    case 'Polygon':
    case 'MultiPolygon':
      return new ol.style.Style({
        fill: new ol.style.Fill({ color: selected ? 'rgba(50,205,50,0.3)' : 'rgba(255,0,0,0.3)' }),
        stroke: new ol.style.Stroke({ color, width: 2 }),
        text: textStyle
      });
    default:
      return null;
  }
}

// Styles neu zeichnen, z. B. nach Auswahländerung
function refreshAllStyles() {
  Object.values(uploadedLayers).forEach(layer => {
    if (layer instanceof ol.layer.Vector) {
      layer.getSource().getFeatures().forEach(f => f.changed());
    }
  });
}

// Klickverhalten bei Cluster-Zoom und Selektion
// Registrierung eines Event-Listeners auf einfache Mausklicks (linke Maustaste)
map.on('singleclick', evt => {
  let handled = false; // Flag, um zu prüfen, ob bereits eine Aktion (z. B. Cluster-Zoom) ausgeführt wurde

  // Durchsuche alle Features unter dem Mausklick (Pixel), um ggf. ein Cluster zu erkennen
  map.forEachFeatureAtPixel(evt.pixel, feature => {
    const clustered = feature.get('features'); // Prüfe, ob das Feature ein Cluster (mit Sub-Features) ist

    // Falls es sich um ein Cluster mit mehr als einem Feature handelt
    if (clustered && clustered.length > 1) {
      const extent = ol.extent.createEmpty(); // Erzeuge ein leeres Ausdehnungsrechteck

      // Berechne die kombinierte Ausdehnung aller Features im Cluster
      clustered.forEach(f =>
        ol.extent.extend(extent, f.getGeometry().getExtent())
      );

      // Zoome die Karte so, dass alle enthaltenen Features sichtbar sind
      map.getView().fit(extent, {
        padding: [40, 40, 40, 40], // Innenabstand zum Kartenrand
        maxZoom: 17,               // Zoom nicht stärker als Level 17
        duration: 400              // Animationsdauer in Millisekunden
      });

      handled = true; // Markiere, dass das Event verarbeitet wurde
    }
  });

  if (handled) return; // Wenn ein Cluster-Zoom durchgeführt wurde, Abbruch (keine Selektion)

  // Initialisiere leeres Array, um die Features unter dem Klickpunkt zu speichern
  const feats = [];

  // Durchsuche erneut alle Features unter dem Mausklick
  map.forEachFeatureAtPixel(evt.pixel, feature => {
    // Extrahiere Sub-Features aus Clustern oder verwende das einzelne Feature selbst
    const fs = feature.get('features') || [feature];
    feats.push(...fs); // Füge alle betroffenen Features zur Liste hinzu
  });

  // Wenn keine Features gefunden wurden → Nichts zu tun
  if (feats.length === 0) return;

  // Falls die Shift-Taste NICHT gedrückt ist, leere die aktuelle Auswahl
  if (!evt.originalEvent.shiftKey) selectedFeatures.clear();

  // Iteriere über alle betroffenen Features 
  feats.forEach(f => {
    if (selectedFeatures.getArray().includes(f)) {
      // Wenn das Feature bereits ausgewählt ist, entferne es (mit shift))
      if (evt.originalEvent.shiftKey) selectedFeatures.remove(f);
    } else {
      // Ansonsten zur Auswahl hinzufügen
      selectedFeatures.push(f);
    }
  });

  // Aktualisiere die Darstellung aller Features, um Selektion visuell anzuzeigen
  refreshAllStyles();
});



// Tooltip mit Feature-Informationen bei Mausbewegung
map.on('pointermove', evt => {
  const tooltip = document.getElementById('tooltip');

  // Wenn die Maus gerade gezogen wird z. B. beim Verschieben der Karte Tooltip ausblenden
  if (evt.dragging) {
    tooltip.style.display = 'none';
    return;
  }

  // Feature unter der Maus ermitteln (ggf. erstes Element aus einem Cluster extrahieren)
  const feature = map.forEachFeatureAtPixel(evt.pixel, f => {
    const clustered = f.get('features');
    return clustered && clustered.length ? clustered[0] : f;
  });

  // Kein Feature unter dem Cursor -> Tooltip ausblenden
  if (!feature) {
    tooltip.style.display = 'none';
    return;
  }

  // Eigenschaften des Features abrufen
  const props = feature.getProperties();

  // Bestmögliche Beschriftung ermitteln (Priorität: label > name > bezeichnung)
  const label = props.label || props.name || props.bezeichnung || '';

  // HTML-String für Tooltip vorbereiten
  let html = label ? `<b style="font-size:15px">${label}</b><hr>` : '';

  // Alle weiteren Properties (außer Geometrie und redundanter Labelfelder) listen
  for (let k in props) {
    if (!['geometry', 'label', 'name', 'bezeichnung'].includes(k)) {
      html += `<b>${k}</b>: ${props[k]}<br>`;
    }
  }

  // Tooltip-Inhalt setzen und an aktuelle Mausposition verschieben
  tooltip.innerHTML = html;
  tooltip.style.left = evt.originalEvent.pageX + 'px';
  tooltip.style.top = evt.originalEvent.pageY - 20 + 'px';
  tooltip.style.display = 'block';
});

// Datei-Upload und Layer-Integration
// Event-Listener für das Datei-Eingabefeld: wird ausgelöst, wenn der Nutzer Dateien auswählt
// Unterstützt Mehrfachauswahl, prüft auf Dopplungen und übergibt an die Upload-Funktion
document.getElementById('fileInput').addEventListener('change', e => {
  Array.from(e.target.files).forEach(file => {
    // Prüft, ob Datei bereits geladen wurde (Cluster- oder Vektor-Layer existiert)
    if (!uploadedLayers[file.name + '_cluster'] && !uploadedLayers[file.name + '_vector']) {
      handleFileUpload(file); // Falls nicht vorhanden -> verarbeiten
    } else {
      alert(`${file.name} wurde bereits hochgeladen.`); // Dopplung verhindern
    }
  });
});

// Verarbeitet eine einzelne Datei: erkennt Format, liest Features ein,
// erstellt Cluster- und Vektorlayer, fügt diese der Karte und Dateiliste hinzu
function handleFileUpload(file) {
  loadingOverlay.style.display = 'flex'; // Ladeanzeige einblenden
  const reader = new FileReader(); // Zum asynchronen Einlesen von Textdateien
  reader.onload = e => {
    // Ermitteln des Dateityps anhand der Endung
    const ext = file.name.split('.').pop().toLowerCase();
    let format;
    if (ext === 'geojson' || ext === 'json') format = new ol.format.GeoJSON();
    else if (ext === 'kml') format = new ol.format.KML();
    else if (ext === 'gpx') format = new ol.format.GPX();
    else return alert('Nicht unterstütztes Format');

    // Einlesen und Konvertieren der Features in Web Mercator-Projektion
    const features = format.readFeatures(e.target.result, { featureProjection: 'EPSG:3857'});

    // Dateiname ohne Endung
    const baseName = file.name.replace(/\.[^/.]+$/, ""); 

    // Automatisierte Label-Vergabe falls kein name vorhanden ist
    features.forEach((f, i) => f.set('label', f.get('name') || baseName + ' ' + (i + 1)));

    // Trenne Punkt-Features von anderen Geometrien zur Clusterdarstellung
    const pointFeatures = features.filter(f => f.getGeometry()?.getType() === 'Point');
    const otherFeatures = features.filter(f => f.getGeometry()?.getType() !== 'Point');

    // Punkt-Features clustern 
    if (pointFeatures.length > 0) {
      const clusterSource = new ol.source.Cluster({
        distance: 40, // Clusterabstand in Pixel
        source: new ol.source.Vector({ features: pointFeatures })
      });

      const clusterLayer = new ol.layer.Vector({
        source: clusterSource,
        style: getFeatureStyle // Style-Funktion mit Cluster-Support
      });

      map.addLayer(clusterLayer); // Cluster-Layer der Karte hinzufügen
      uploadedLayers[file.name + '_cluster'] = clusterLayer; // Referenz speichern
    }

    // Nicht-Punkt-Features als normaler Vektor-Layer 
    if (otherFeatures.length > 0) {
      const vectorLayer = new ol.layer.Vector({
        source: new ol.source.Vector({ features: otherFeatures }),
        style: getFeatureStyle
      });

      map.addLayer(vectorLayer); // Layer auf Karte anzeigen
      uploadedLayers[file.name + '_vector'] = vectorLayer; // Verwalten
    }

    // Datei im UI anzeigen 
    const li = document.createElement('li');
    li.dataset.filename = file.name;

    const nameSpan = document.createElement('span');
    nameSpan.textContent = file.name;
    nameSpan.className = 'filename-label';

    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑️';
    delBtn.className = 'file-remove-btn';
    delBtn.title = 'Löschen';

    // Entfernt Layer und Listeneintrag, wenn Löschbutton geklickt wird
    delBtn.addEventListener('click', () => {
      if (uploadedLayers[file.name + '_cluster']) map.removeLayer(uploadedLayers[file.name + '_cluster']);
      if (uploadedLayers[file.name + '_vector']) map.removeLayer(uploadedLayers[file.name + '_vector']);
      delete uploadedLayers[file.name + '_cluster'];
      delete uploadedLayers[file.name + '_vector'];
      li.remove();
    });

    li.appendChild(nameSpan);
    li.appendChild(delBtn);
    document.getElementById('fileNames').appendChild(li);

    loadingOverlay.style.display = 'none'; // Ladeanzeige ausblenden
  };

  reader.readAsText(file); // Startet das Einlesen des Dateiinhalts der Dateien
}

// Export ausgewählter Features als GeoJSON-Datei bei drücken von "exportieren"
document.getElementById('exportSelection').addEventListener('click', () => {
  const selected = selectedFeatures.getArray(); // Alle aktuell ausgewählten Features abrufen

  // Wenn keine Features ausgewählt sind, Nutzer benachrichtigen und Abbruch
  if (selected.length === 0) return alert("Keine Features ausgewählt");

  // Nutzer nach Dateinamen fragen
  const filename = prompt("Dateiname (Dateiformat: Geojson)", "Dateiname");
  if (!filename) return; // Abbrechen, wenn Eingabe abgebrochen wurde

  // GeoJSON-Formatierer von OpenLayers erzeugen
  const format = new ol.format.GeoJSON();

  // Features als GeoJSON-String serialisieren (Projektion: Web Mercator)
  const data = format.writeFeatures(selected, {
    featureProjection: 'EPSG:3857'
  });

  // Erzeuge einen Blob aus dem GeoJSON-Text mit passendem MIME-Typ
  const blob = new Blob([data], { type: 'application/geo+json' });

  // Erstelle eine temporäre URL für diesen Blob (wird zum Download verwendet)
  const url = URL.createObjectURL(blob);

  // Erstelle einen versteckten Link zum Auslösen des Downloads
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.geojson') ? filename : filename + '.geojson'; // Endung sicherstellen
  link.click(); // Simuliere Klick auf den Link (startet Download)

  // Bereinige URL nach dem Download-Vorgang
  URL.revokeObjectURL(url);
});
