// Configuration Supabase
const SUPABASE_URL = 'https://revrsybyuldaihnssrhg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_4fuRdk-P1B67ccxXauaTNQ_tpF8C-25';

// ✅ Correction : utilisation d'un nom différent pour éviter le conflit
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Initialisation de la carte centrée sur le Sénégal
const map = L.map('map').setView([14.5, -14.5], 7);

// Fond de carte (style épuré)
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
    minZoom: 6
}).addTo(map);

// Palette de couleurs pour chaque région (couleurs harmonieuses)
const regionColors = {
    'Dakar': '#FF6B6B',
    'Diourbel': '#4ECDC4',
    'Fatick': '#45B7D1',
    'Kaolack': '#96CEB4',
    'Kedougou': '#FFEAA7',
    'Kolda': '#DDA0DD',
    'Louga': '#98D8C8',
    'Matam': '#F7B05E',
    'Saint-Louis': '#B0C4DE',
    'Sedhiou': '#C9E4DE',
    'Tambacounda': '#F4A261',
    'Thies': '#E9C46A',
    'Ziguinchor': '#2A9D8F',
    'Kaffrine': '#E76F51'
};

// Couleur par défaut
const defaultColor = '#4a9eb5';
const hoverColor = '#ff6b35';

// Stockage des layers par région
const regionLayers = new Map();
let selectedRegion = null;

// Élément select
const regionSelect = document.getElementById('region-select');
const regionInfo = document.getElementById('region-info');

// Charger les régions depuis Supabase
async function loadRegions() {
    console.log('📥 Chargement des régions...');
    
    // Afficher un indicateur de chargement
    regionInfo.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Chargement des données...';
    
    try {
        // ✅ Utilisation de supabaseClient au lieu de supabase
        const { data, error } = await supabaseClient
            .from('regions_sn')
            .select('id, nomreg, superfice_, ST_AsGeoJSON(geom) as geojson');
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            console.warn('⚠️ Aucune région trouvée');
            regionInfo.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Aucune région trouvée';
            return;
        }
        
        console.log(`✅ ${data.length} régions chargées`);
        
        // Remplir le select
        regionSelect.innerHTML = '<option value="">-- Toutes les régions --</option>';
        
        // Ajouter chaque région à la carte et au select
        data.forEach(region => {
            // Ajouter au select
            const option = document.createElement('option');
            option.value = region.nomreg;
            option.textContent = region.nomreg;
            regionSelect.appendChild(option);
            
            try {
                const geojson = JSON.parse(region.geojson);
                const regionColor = regionColors[region.nomreg] || defaultColor;
                
                // Créer le layer GeoJSON
                const layer = L.geoJSON(geojson, {
                    style: {
                        color: '#1a5f7a',
                        weight: 1.5,
                        fillColor: regionColor,
                        fillOpacity: 0.7,
                        opacity: 0.8
                    },
                    onEachFeature: (feature, layer) => {
                        // Stocker le nom de la région dans le layer
                        layer.regionName = region.nomreg;
                        layer.superficie = region.superfice_;
                        
                        // Au survol
                        layer.on('mouseover', () => {
                            if (selectedRegion !== layer) {
                                layer.setStyle({
                                    weight: 3,
                                    fillOpacity: 0.9,
                                    color: hoverColor
                                });
                            }
                            // Afficher une infobulle
                            layer.bindTooltip(region.nomreg, {
                                sticky: true,
                                direction: 'center',
                                className: 'region-tooltip'
                            }).openTooltip();
                        });
                        
                        // À la sortie du survol
                        layer.on('mouseout', () => {
                            if (selectedRegion !== layer) {
                                layer.setStyle({
                                    weight: 1.5,
                                    fillOpacity: 0.7,
                                    color: '#1a5f7a'
                                });
                            }
                            layer.closeTooltip();
                        });
                        
                        // Au clic
                        layer.on('click', () => {
                            selectRegion(region.nomreg, layer);
                        });
                    }
                });
                
                // Stocker le layer
                regionLayers.set(region.nomreg, layer);
                layer.addTo(map);
                
            } catch(e) {
                console.error(`❌ Erreur pour ${region.nomreg}:`, e);
            }
        });
        
        // Ajuster la vue pour voir tout le Sénégal
        const bounds = L.latLngBounds();
        regionLayers.forEach(layer => {
            layer.eachLayer(l => {
                if (l.getBounds) {
                    bounds.extend(l.getBounds());
                }
            });
        });
        
        if (bounds.isValid()) {
            map.fitBounds(bounds);
        } else {
            map.setView([14.5, -14.5], 7);
        }
        
        // Mettre à jour l'info
        regionInfo.innerHTML = '<i class="fas fa-check-circle"></i> ' + data.length + ' régions disponibles. Cliquez sur une région !';
        
    } catch (error) {
        console.error('❌ Erreur:', error);
        regionInfo.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Erreur de chargement des données';
    }
}

// Fonction pour sélectionner une région
function selectRegion(regionName, layer = null) {
    // Réinitialiser le style précédent
    if (selectedRegion) {
        const prevColor = regionColors[selectedRegion.regionName] || defaultColor;
        selectedRegion.setStyle({
            weight: 1.5,
            fillOpacity: 0.7,
            color: '#1a5f7a',
            fillColor: prevColor
        });
    }
    
    // Si c'est la même région, on la désélectionne
    if (selectedRegion && selectedRegion.regionName === regionName) {
        selectedRegion = null;
        regionSelect.value = '';
        regionInfo.innerHTML = '<i class="fas fa-info-circle"></i> Aucune région sélectionnée. Cliquez sur une région ou choisissez dans le menu.';
        
        // Centrer la carte sur tout le Sénégal
        const bounds = L.latLngBounds();
        regionLayers.forEach(l => {
            l.eachLayer(layer => {
                if (layer.getBounds) bounds.extend(layer.getBounds());
            });
        });
        if (bounds.isValid()) map.fitBounds(bounds);
        
        return;
    }
    
    // Récupérer le layer si non fourni
    if (!layer) {
        layer = regionLayers.get(regionName);
    }
    
    if (layer) {
        selectedRegion = layer;
        
        // Mettre en évidence
        layer.setStyle({
            weight: 4,
            fillOpacity: 0.85,
            color: hoverColor,
            fillColor: regionColors[regionName] || defaultColor
        });
        
        // Mettre à jour le select
        regionSelect.value = regionName;
        
        // Afficher les infos
        const superficie = layer.superficie ? 
            (layer.superficie / 1000000).toFixed(2) + ' km²' : 
            'Non disponible';
        
        regionInfo.innerHTML = `
            <i class="fas fa-map-marker-alt"></i>
            <strong>${regionName}</strong> | Superficie : ${superficie}
        `;
        
        // Centrer la carte sur la région
        try {
            const bounds = layer.getBounds();
            if (bounds.isValid()) {
                map.fitBounds(bounds);
            }
        } catch(e) {
            console.warn('Impossible de centrer sur', regionName);
        }
    }
}

// Événement du select
regionSelect.addEventListener('change', (e) => {
    const regionName = e.target.value;
    if (regionName) {
        selectRegion(regionName);
    } else {
        // Désélectionner
        if (selectedRegion) {
            const prevColor = regionColors[selectedRegion.regionName] || defaultColor;
            selectedRegion.setStyle({
                weight: 1.5,
                fillOpacity: 0.7,
                color: '#1a5f7a',
                fillColor: prevColor
            });
            selectedRegion = null;
            regionInfo.innerHTML = '<i class="fas fa-info-circle"></i> Aucune région sélectionnée. Cliquez sur une région ou choisissez dans le menu.';
            
            // Recentrer
            const bounds = L.latLngBounds();
            regionLayers.forEach(l => {
                l.eachLayer(layer => {
                    if (layer.getBounds) bounds.extend(layer.getBounds());
                });
            });
            if (bounds.isValid()) map.fitBounds(bounds);
        }
    }
});

// Ajouter une échelle
L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(map);

// Ajouter une légende
const legendControl = L.control({ position: 'bottomright' });
legendControl.onAdd = () => {
    const div = L.DomUtil.create('div', 'info legend');
    div.style.backgroundColor = 'white';
    div.style.padding = '10px';
    div.style.borderRadius = '8px';
    div.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    div.style.fontSize = '12px';
    div.innerHTML = `
        <strong><i class="fas fa-palette"></i> Légende</strong><br>
        <div style="display:flex; align-items:center; margin-top:5px;">
            <div style="width:20px; height:15px; background:#4a9eb5; border:1px solid #1a5f7a; margin-right:8px;"></div>
            <span>Région</span>
        </div>
        <div style="display:flex; align-items:center; margin-top:5px;">
            <div style="width:20px; height:15px; background:#ff6b35; border:2px solid #ff6b35; margin-right:8px;"></div>
            <span>Région sélectionnée</span>
        </div>
        <hr style="margin:8px 0;">
        <div><i class="fas fa-mouse-pointer"></i> Cliquez sur une région</div>
        <div><i class="fas fa-search"></i> Utilisez le menu déroulant</div>
    `;
    return div;
};
legendControl.addTo(map);

// Styles supplémentaires pour les tooltips
const style = document.createElement('style');
style.textContent = `
    .region-tooltip {
        font-family: 'Poppins', sans-serif;
        font-weight: 600;
        background-color: #1a5f7a;
        color: white;
        border: none;
        border-radius: 5px;
        padding: 5px 10px;
        font-size: 14px;
    }
    .leaflet-tooltip-top:before {
        border-top-color: #1a5f7a;
    }
`;
document.head.appendChild(style);

// Lancer le chargement
loadRegions();