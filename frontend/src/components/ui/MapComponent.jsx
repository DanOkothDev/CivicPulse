import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

// Status colors
const STATUS_COLORS = {
  reported: '#f59e0b',   // Amber
  verified: '#2563eb',   // Blue
  assigned: '#7c3aed',   // Purple
  in_progress: '#ea580c',// Orange
  resolved: '#10b981',   // Emerald
  rejected: '#f43f5e',   // Rose
};

function createPinIcon(color, isSelected = false) {
  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="
        position: relative;
        width: 30px;
        height: 38px;
        transform: translate(-50%, -100%);
        cursor: pointer;
      ">
        <svg viewBox="0 0 24 30" width="30" height="38" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 8.5 12 18 12 18s12-9.5 12-18c0-6.63-5.37-12-12-12z" fill="${color}" stroke="#ffffff" stroke-width="1.5" />
          <circle cx="12" cy="11" r="5" fill="#ffffff" />
        </svg>
        ${isSelected ? '<div style="position: absolute; top: -4px; left: 6px; width: 8px; height: 8px; background: #3b82f6; border-radius: 50%; box-shadow: 0 0 8px #3b82f6;"></div>' : ''}
      </div>
    `,
    iconSize: [30, 38],
    iconAnchor: [15, 38],
    popupAnchor: [0, -36],
  });
}

export default function MapComponent({
  center = [-1.2629, 36.8355],
  zoom = 13,
  reports = [],
  hotspots = [],
  selectedReport = null,
  onMarkerClick = null,
  pickerMode = false,
  pickedLocation = null,
  onLocationPick = null,
  height = '420px',
  className = '',
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const hotspotsLayerRef = useRef(null);
  const pickerMarkerRef = useRef(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center,
        zoom,
        zoomControl: false,
      });

      // OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Add zoom control top-right
      L.control.zoom({ position: 'topright' }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      hotspotsLayerRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Center update
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.setView(center, zoom);
    }
  }, [center?.[0], center?.[1], zoom]);

  // Picker mode handling
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (pickerMode) {
      const handleMapClick = (e) => {
        if (onLocationPick) {
          onLocationPick({ lat: e.latlng.lat, lon: e.latlng.lng });
        }
      };

      map.on('click', handleMapClick);

      // Render draggable picker pin
      if (pickedLocation) {
        if (!pickerMarkerRef.current) {
          const pin = L.marker([pickedLocation.lat, pickedLocation.lon], {
            draggable: true,
            icon: createPinIcon('#2563eb', true),
          }).addTo(map);

          pin.on('dragend', () => {
            const pos = pin.getLatLng();
            if (onLocationPick) {
              onLocationPick({ lat: pos.lat, lon: pos.lng });
            }
          });

          pickerMarkerRef.current = pin;
        } else {
          pickerMarkerRef.current.setLatLng([pickedLocation.lat, pickedLocation.lon]);
        }
      }

      return () => {
        map.off('click', handleMapClick);
        if (pickerMarkerRef.current) {
          pickerMarkerRef.current.remove();
          pickerMarkerRef.current = null;
        }
      };
    }
  }, [pickerMode, pickedLocation?.lat, pickedLocation?.lon, onLocationPick]);

  // Render report markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer || pickerMode) return;

    layer.clearLayers();

    reports.forEach((report) => {
      const lat = report.location?.lat;
      const lon = report.location?.lon;
      if (lat === undefined || lon === undefined) return;

      const color = STATUS_COLORS[report.status] || '#2563eb';
      const isSelected = selectedReport?.id === report.id;
      const marker = L.marker([lat, lon], {
        icon: createPinIcon(color, isSelected),
      });

      // Popup
      const popupHtml = `
        <div style="font-family: Inter, sans-serif; min-width: 200px; padding: 2px;">
          <img src="${report.photo_url}" style="width: 100%; height: 90px; object-fit: cover; border-radius: 8px; margin-bottom: 6px;" />
          <div style="font-size: 11px; font-weight: 700; color: ${color}; text-transform: uppercase;">
            ${report.status.replace('_', ' ')}
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
            ${report.category?.name || 'Report'}
          </div>
          <div style="font-size: 11px; color: #64748b; line-clamp: 2; margin-bottom: 8px;">
            ${report.address || report.description?.slice(0, 60) + '...'}
          </div>
          <a href="/reports/${report.id}" style="
            display: block;
            text-align: center;
            background: #2563eb;
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            padding: 5px 8px;
            border-radius: 6px;
            text-decoration: none;
          ">View Report</a>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        if (onMarkerClick) onMarkerClick(report);
      });

      layer.addLayer(marker);
    });
  }, [reports, selectedReport?.id, onMarkerClick, pickerMode]);

  // Render Hotspots (DBSCAN cluster circles)
  useEffect(() => {
    const layer = hotspotsLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    hotspots.forEach((spot) => {
      if (!spot.center) return;
      const circle = L.circle([spot.center.lat, spot.center.lon], {
        color: '#ef4444',
        fillColor: '#f87171',
        fillOpacity: 0.25,
        radius: spot.radius_m || 200,
        weight: 2,
      });

      circle.bindPopup(`
        <div style="font-family: Inter, sans-serif; font-size: 12px;">
          <b style="color: #ef4444;">Hotspot Cluster #${spot.id}</b><br/>
          <span>${spot.name || 'DBSCAN Density Cluster'}</span><br/>
          <span>Reports in radius: <b>${spot.report_count}</b></span>
        </div>
      `);

      layer.addLayer(circle);
    });
  }, [hotspots]);

  return (
    <div
      ref={mapContainerRef}
      style={{ height, minHeight: '260px' }}
      className={`w-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative z-0 ${className}`}
    />
  );
}
