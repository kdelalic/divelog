import { MapContainer, TileLayer, Marker, Popup, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import useDiveStore from '../store/diveStore';
import useSettingsStore from '../store/settingsStore';
import { formatDepth } from '@/lib/unitConversions';
import { formatDiveDateTime } from '@/lib/dateHelpers';

// Fix for default markers in Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const Map = () => {
  const dives = useDiveStore((state) => state.dives);
  const { settings } = useSettingsStore();

  // Calculate center point based on dive locations
  const getMapCenter = () => {
    if (dives.length === 0) return [20, 0]; // Default center
    
    const avgLat = dives.reduce((sum, dive) => sum + dive.lat, 0) / dives.length;
    const avgLng = dives.reduce((sum, dive) => sum + dive.lng, 0) / dives.length;
    
    return [avgLat, avgLng];
  };

  // Calculate appropriate zoom level based on dive spread
  const getZoomLevel = () => {
    if (dives.length === 0) return 2;
    if (dives.length === 1) return 10;
    
    const lats = dives.map(dive => dive.lat);
    const lngs = dives.map(dive => dive.lng);
    
    const latSpread = Math.max(...lats) - Math.min(...lats);
    const lngSpread = Math.max(...lngs) - Math.min(...lngs);
    const maxSpread = Math.max(latSpread, lngSpread);
    
    if (maxSpread > 50) return 3;
    if (maxSpread > 20) return 4;
    if (maxSpread > 10) return 5;
    if (maxSpread > 5) return 6;
    return 8;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">Dive Sites Map</h2>
        <p className="text-muted-foreground">
          Interactive map showing all your dive locations
        </p>
      </div>

      <div className="h-[600px] w-full rounded-lg overflow-hidden shadow-lg border">
        <MapContainer
          center={getMapCenter() as [number, number]}
          zoom={getZoomLevel()}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <LayersControl position="topright">
            {/* Satellite Layer (Default) */}
            <LayersControl.BaseLayer checked name="Satellite">
              <TileLayer
                attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            </LayersControl.BaseLayer>
            
            {/* Street Map Layer */}
            <LayersControl.BaseLayer name="Street Map">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
          </LayersControl>
          
          {dives.map(dive => (
            <Marker
              key={dive.id}
              position={[dive.lat, dive.lng]}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold text-lg mb-2">{dive.location}</h3>
                  <div className="space-y-1 text-sm">
                    <div><strong>Date:</strong> {formatDiveDateTime(dive.datetime, settings)}</div>
                    <div><strong>Depth:</strong> {formatDepth(dive.depth, settings.units.depth)}</div>
                    <div><strong>Duration:</strong> {dive.duration} minutes</div>
                    {dive.buddy && <div><strong>Buddy:</strong> {dive.buddy}</div>}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {dives.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No dive sites to display. Add some dives to see them on the map!</p>
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        <p>Default satellite imagery by Esri, street map by OpenStreetMap - Use the layer control (top right) to switch views</p>
      </div>
    </div>
  );
};

export default Map; 