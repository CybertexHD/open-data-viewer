// =======================
// OpenLayers Viewer (vollständig korrigiert): Cluster-Zoom, Tooltip, Selektion, Upload, Export
// =======================

const map = new ol.Map({
    target: 'map',
    layers: [
        new ol.layer.Tile({ source: new ol.source.OSM({ attributions: [] }) })
    ],
    view: new ol.View({
        center: ol.proj.fromLonLat([13.5, 51.05]),
        zoom: 9
    })
});

const uploadedLayers = {};
const selectedFeatures = new ol.Collection();

const selectInteraction = new ol.interaction.Select({
    multi: true,
    features: selectedFeatures,
    layers: () => true,
    style: null
});
map.addInteraction(selectInteraction);

selectedFeatures.on('add', e => e.element.changed());
selectedFeatures.on('remove', e => e.element.changed());

function getFeatureStyle(feature) {
    const geometry = feature.getGeometry();
    if (!geometry) return null;
    const type = geometry.getType();

    const clusteredFeatures = feature.get('features');
    const isCluster = clusteredFeatures && clusteredFeatures.length > 1;

    if (isCluster) {
        const allSelected = clusteredFeatures.every(f => selectedFeatures.getArray().includes(f));
        const color = allSelected ? 'limegreen' : 'red';

        return new ol.style.Style({
            image: new ol.style.Circle({
                radius: 10,
                fill: new ol.style.Fill({ color }),
                stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
            }),
            text: new ol.style.Text({
                text: clusteredFeatures.length.toString(),
                fill: new ol.style.Fill({ color: '#000' }),
                stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
            })
        });
    }

    const label = feature.get('label') || feature.get('name') || '';
    const selected = selectedFeatures.getArray().includes(feature);
    const color = selected ? 'limegreen' : 'red';
    const textStyle = new ol.style.Text({
        text: label,
        font: '12px Orbitron, sans-serif',
        fill: new ol.style.Fill({ color: '#00f0ff' }),
        stroke: new ol.style.Stroke({ color: '#000', width: 2 }),
        offsetY: type === 'Point' ? -15 : 0,
        placement: type.includes('Line') ? 'line' : undefined,
        overflow: true
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

map.on('singleclick', evt => {
    let handledCluster = false;
    map.forEachFeatureAtPixel(evt.pixel, feature => {
        const feats = feature.get('features');
        if (feats && feats.length > 1) {
            const extent = ol.extent.createEmpty();
            feats.forEach(f => ol.extent.extend(extent, f.getGeometry().getExtent()));
            const view = map.getView();
            view.fit(extent, { duration: 500, padding: [50, 50, 50, 50], maxZoom: 15 });
            handledCluster = true;
        }
    });
    if (handledCluster) return;
});

map.on('pointermove', evt => {
    const tooltip = document.getElementById('tooltip');
    if (evt.dragging) {
        tooltip.style.display = 'none';
        return;
    }

    const feature = map.forEachFeatureAtPixel(evt.pixel, f => {
        const feats = f.get('features');
        return feats && feats.length ? feats[0] : f;
    });

    if (!feature) {
        tooltip.style.display = 'none';
        return;
    }

    const props = feature.getProperties();
    const label = props.label || props.name || props.bezeichnung || '';

    let html = '';
    if (label) {
        html += `<b style="font-size:15px">${label}</b><hr>`;
    }

    for (let key in props) {
        if (!['geometry', 'label', 'name', 'bezeichnung'].includes(key)) {
            html += `<b>${key}</b>: ${props[key]}<br>`;
        }
    }

    tooltip.innerHTML = html;
    tooltip.style.left = evt.originalEvent.pageX + 'px';
    tooltip.style.top = evt.originalEvent.pageY - 20 + 'px';
    tooltip.style.display = 'block';
});

map.on('click', evt => {
    let featuresFound = [];
    map.forEachFeatureAtPixel(evt.pixel, feature => {
        const feats = feature.get('features') || [feature];
        featuresFound = featuresFound.concat(feats);
    });

    if (featuresFound.length === 0) return;

    const changedFeatures = new Set();

    if (evt.originalEvent.shiftKey) {
        featuresFound.forEach(f => {
            if (selectedFeatures.getArray().includes(f)) {
                selectedFeatures.remove(f);
            } else {
                selectedFeatures.push(f);
            }
            changedFeatures.add(f);
        });
    } else {
        selectedFeatures.getArray().forEach(f => changedFeatures.add(f));
        selectedFeatures.clear();
        featuresFound.forEach(f => {
            selectedFeatures.push(f);
            changedFeatures.add(f);
        });
    }

    changedFeatures.forEach(f => f.changed());
});

// Datei-Upload + Layer-Erzeugung
function handleFileUpload(file) {
    const reader = new FileReader();
    reader.onload = e => {
        const ext = file.name.split('.').pop().toLowerCase();
        let format = null;
        if (ext === 'geojson' || ext === 'json') format = new ol.format.GeoJSON();
        else if (ext === 'gpx') format = new ol.format.GPX();
        else if (ext === 'kml') format = new ol.format.KML();
        else return alert('Nicht unterstütztes Format');

        const features = format.readFeatures(e.target.result, {
            featureProjection: 'EPSG:3857'
        });

        const baseName = file.name.replace(/\.[^/.]+$/, "");
        features.forEach((f, i) => f.set('label', f.get('name') || baseName + ' ' + (i + 1)));

        const pointFeatures = features.filter(f => f.getGeometry()?.getType() === 'Point');
        const otherFeatures = features.filter(f => f.getGeometry()?.getType() !== 'Point');

        if (pointFeatures.length > 0) {
            const clusteredSource = new ol.source.Cluster({
                distance: 40,
                source: new ol.source.Vector({ features: pointFeatures })
            });

            const clusterLayer = new ol.layer.Vector({
                source: clusteredSource,
                style: getFeatureStyle
            });
            map.addLayer(clusterLayer);
            uploadedLayers[file.name + '_cluster'] = clusterLayer;
        }

        if (otherFeatures.length > 0) {
            const vectorLayer = new ol.layer.Vector({
                source: new ol.source.Vector({ features: otherFeatures }),
                style: getFeatureStyle
            });
            map.addLayer(vectorLayer);
            uploadedLayers[file.name + '_vector'] = vectorLayer;
        }
    };
    reader.readAsText(file);
}

document.getElementById('fileInput').addEventListener('change', e => {
    Array.from(e.target.files).forEach(file => {
        if (!uploadedLayers[file.name + '_cluster'] && !uploadedLayers[file.name + '_vector']) {
            handleFileUpload(file);
        } else {
            alert(`${file.name} wurde bereits hochgeladen.`);
        }
    });
});

document.getElementById('exportSelection').addEventListener('click', () => {
    const format = new ol.format.GeoJSON();
    const data = format.writeFeatures(selectedFeatures.getArray(), {
        featureProjection: 'EPSG:3857'
    });

    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const filename = prompt("Dateiname für Export:", "auswahl.geojson") || "auswahl.geojson";

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
});
