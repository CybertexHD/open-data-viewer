// main.js – OpenLayers Viewer mit Cluster, Mehrfachauswahl, Export, Dateinamenwahl, Dateilöschung (ohne Undo)

const map = new ol.Map({
  target: 'map',
  layers: [new ol.layer.Tile({ source: new ol.source.OSM() })],
  view: new ol.View({ center: ol.proj.fromLonLat([13.5, 51.05]), zoom: 9 })
});

const uploadedLayers = {};                         // Hochgeladene Layer
const selectedFeatures = new ol.Collection();      // Ausgewählte Features
const loadingOverlay = document.getElementById('loading');

// Selektion aktivieren
const selectInteraction = new ol.interaction.Select({
  multi: true,
  features: selectedFeatures,
  style: null,
  layers: () => true
});
map.addInteraction(selectInteraction);

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
        image: new ol.style.Circle({ radius: 6, fill: new ol.style.Fill({ color }), stroke: new ol.style.Stroke({ color: '#000', width: 2 }) }),
        text: textStyle
      });
    case 'LineString':
    case 'MultiLineString':
      return new ol.style.Style({ stroke: new ol.style.Stroke({ color, width: 3 }), text: textStyle });
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

function refreshAllStyles() {
  Object.values(uploadedLayers).forEach(layer => {
    if (layer instanceof ol.layer.Vector) {
      layer.getSource().getFeatures().forEach(f => f.changed());
    }
  });
}

map.on('singleclick', evt => {
  let handled = false;
  map.forEachFeatureAtPixel(evt.pixel, feature => {
    const clustered = feature.get('features');
    if (clustered && clustered.length > 1) {
      const extent = ol.extent.createEmpty();
      clustered.forEach(f => ol.extent.extend(extent, f.getGeometry().getExtent()));
      map.getView().fit(extent, { padding: [40, 40, 40, 40], maxZoom: 17, duration: 400 });
      handled = true;
    }
  });
  if (handled) return;

  const feats = [];
  map.forEachFeatureAtPixel(evt.pixel, feature => {
    const fs = feature.get('features') || [feature];
    feats.push(...fs);
  });
  if (feats.length === 0) return;
  if (!evt.originalEvent.shiftKey) selectedFeatures.clear();
  feats.forEach(f => {
    if (selectedFeatures.getArray().includes(f)) {
      if (evt.originalEvent.shiftKey) selectedFeatures.remove(f);
    } else {
      selectedFeatures.push(f);
    }
  });
  refreshAllStyles();
});

map.on('pointermove', evt => {
  const tooltip = document.getElementById('tooltip');
  if (evt.dragging) return tooltip.style.display = 'none';
  const feature = map.forEachFeatureAtPixel(evt.pixel, f => {
    const clustered = f.get('features');
    return clustered && clustered.length ? clustered[0] : f;
  });
  if (!feature) return tooltip.style.display = 'none';
  const props = feature.getProperties();
  const label = props.label || props.name || props.bezeichnung || '';
  let html = label ? `<b style="font-size:15px">${label}</b><hr>` : '';
  for (let k in props) {
    if (!['geometry', 'label', 'name', 'bezeichnung'].includes(k)) html += `<b>${k}</b>: ${props[k]}<br>`;
  }
  tooltip.innerHTML = html;
  tooltip.style.left = evt.originalEvent.pageX + 'px';
  tooltip.style.top = evt.originalEvent.pageY - 20 + 'px';
  tooltip.style.display = 'block';
});

document.getElementById('fileInput').addEventListener('change', e => {
  Array.from(e.target.files).forEach(file => {
    if (!uploadedLayers[file.name + '_cluster'] && !uploadedLayers[file.name + '_vector']) {
      handleFileUpload(file);
    } else {
      alert(`${file.name} wurde bereits hochgeladen.`);
    }
  });
});

function handleFileUpload(file) {
  loadingOverlay.style.display = 'flex';
  const reader = new FileReader();
  reader.onload = e => {
    const ext = file.name.split('.').pop().toLowerCase();
    let format;
    if (ext === 'geojson' || ext === 'json') format = new ol.format.GeoJSON();
    else if (ext === 'kml') format = new ol.format.KML();
    else if (ext === 'gpx') format = new ol.format.GPX();
    else return alert('Nicht unterstütztes Format');

    const features = format.readFeatures(e.target.result, { featureProjection: 'EPSG:3857' });
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    features.forEach((f, i) => f.set('label', f.get('name') || baseName + ' ' + (i + 1)));

    const pointFeatures = features.filter(f => f.getGeometry()?.getType() === 'Point');
    const otherFeatures = features.filter(f => f.getGeometry()?.getType() !== 'Point');

    if (pointFeatures.length > 0) {
      const clusterSource = new ol.source.Cluster({
        distance: 40,
        source: new ol.source.Vector({ features: pointFeatures })
      });
      const clusterLayer = new ol.layer.Vector({ source: clusterSource, style: getFeatureStyle });
      map.addLayer(clusterLayer);
      uploadedLayers[file.name + '_cluster'] = clusterLayer;
    }

    if (otherFeatures.length > 0) {
      const vectorLayer = new ol.layer.Vector({ source: new ol.source.Vector({ features: otherFeatures }), style: getFeatureStyle });
      map.addLayer(vectorLayer);
      uploadedLayers[file.name + '_vector'] = vectorLayer;
    }

    const li = document.createElement('li');
    li.dataset.filename = file.name;
    const nameSpan = document.createElement('span');
    nameSpan.textContent = file.name;
    nameSpan.className = 'filename-label';
    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑️';
    delBtn.className = 'file-remove-btn';
    delBtn.title = 'Löschen';
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
    loadingOverlay.style.display = 'none';
  };
  reader.readAsText(file);
}

document.getElementById('exportSelection').addEventListener('click', () => {
  const selected = selectedFeatures.getArray();
  if (selected.length === 0) return alert("Keine Features ausgewählt");

  const filename = prompt("Dateiname (Dateiformat: Geojson)", "Dateiname");
  if (!filename) return;

  const format = new ol.format.GeoJSON();
  const data = format.writeFeatures(selected, { featureProjection: 'EPSG:3857' });

  const blob = new Blob([data], { type: 'application/geo+json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.geojson') ? filename : filename + '.geojson';
  link.click();
  URL.revokeObjectURL(url);
});
