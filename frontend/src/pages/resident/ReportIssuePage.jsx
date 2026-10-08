import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  MapPin,
  Compass,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Layers,
  Lock,
  Globe,
  Radio,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import ImageUploadComponent from '../../components/ui/ImageUploadComponent';
import MapComponent from '../../components/ui/MapComponent';

export default function ReportIssuePage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // Form State
  const [photo, setPhoto] = useState({
    file: null,
    previewUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=800',
    name: 'IMG_20241014_091428_RAW.jpg',
    sizeMb: '4.2',
    capturedTime: 'Today 09:14 AM',
  });
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(1);
  const [title, setTitle] = useState('Deep hazardous pothole damaging vehicles on Oak Street');
  const [description, setDescription] = useState(
    'Large asphalt crater expanding across pedestrian crosswalk curb edge. Water accumulation creates collision risk during morning bus transit.'
  );
  const [location, setLocation] = useState({ lat: -1.2629, lon: 36.8355 });
  const [accuracy, setAccuracy] = useState('±4 meters (High Precision)');
  const [address, setAddress] = useState('482 Oak Street, Near Corner of 4th Ave, Ward 4');
  const [landmark, setLandmark] = useState('Directly opposite the public transit stop shelter');
  const [manualPinOverwrite, setManualPinOverwrite] = useState(true);
  const [publicTransparency, setPublicTransparency] = useState(true);
  const [loading, setLoading] = useState(false);
  const [gpsLocating, setGpsLocating] = useState(false);

  // Load categories
  useEffect(() => {
    api.reference.getCategories().then((data) => {
      setCategories(data);
      if (data.length > 0 && !categoryId) {
        setCategoryId(data[0].id);
      }
    }).catch(() => {});
  }, []);

  // Browser Geolocation Trigger
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.warning('Geolocation is not supported by your browser. You can drag the pin on the map.');
      return;
    }

    setGpsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newCoords = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lon: Number(pos.coords.longitude.toFixed(6)),
        };
        setLocation(newCoords);
        setAccuracy(`±${Math.round(pos.coords.accuracy || 5)} meters (Live GPS Lock)`);
        setGpsLocating(false);
        toast.success('Live GPS coordinates acquired');
      },
      (err) => {
        setGpsLocating(false);
        toast.info('Location permission denied or unavailable. You can position the pin manually on the map.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleLocationPick = (coords) => {
    setLocation(coords);
    setAddress(`Pinned location: ${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`);
  };

  const selectedCategory = categories.find((c) => c.id === Number(categoryId)) || categories[0];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!photo && !photo?.previewUrl) {
      toast.error('Please attach a photo evidence of the incident');
      return;
    }

    if (!description.trim()) {
      toast.error('Please provide a description of the issue');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('category_id', categoryId);
      formData.append('lat', location.lat);
      formData.append('lon', location.lon);
      formData.append('description', description);
      formData.append('address', address);
      formData.append('landmark', landmark);
      if (photo.file) {
        formData.append('photo', photo.file);
      }
      formData.append('photo_preview', photo.previewUrl);

      const created = await api.reports.create(formData);
      toast.success(`Report #${created.id} submitted successfully!`);
      navigate(`/reports/${created.id}`);
    } catch (err) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header bar matching report issue.png */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-blue-700 tracking-wider uppercase mb-1">
            <span>Intake Desk • Ward 4</span>
            <span>•</span>
            <span className="font-mono text-slate-500">Incident Ref: #NEW-7739</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Submit a Community Infrastructure Report
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Help your municipal team respond swiftly by providing clear details, physical photo evidence, and pinpoint geolocations.
          </p>
        </div>

        {/* SLA Guarantee pill */}
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl px-4 py-2.5 flex items-center gap-2.5 shrink-0">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-xs">
            <div className="font-bold">Standard SLA Guarantee</div>
            <div className="text-[11px] text-emerald-700">Triaged within 4 hours by field staff</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (8 cols): Evidence & Classification */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Evidence & On-Site Photos Section */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Evidence & On-Site Photos
                </h3>
              </div>
              {photo && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>1 Photo Attached</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              High-resolution photos allow road inspectors to gauge volume, depth, and safety hazards before rolling trucks.
            </p>

            <ImageUploadComponent
              image={photo}
              onImageChange={setPhoto}
              onImageRemove={() => setPhoto(null)}
            />
          </div>

          {/* 2. Issue Classification & Details */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Issue Classification & Details
                </h3>
              </div>
            </div>

            {/* Category selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Category <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-500 font-medium">
                  Routed to {selectedCategory?.department || 'Department of Transportation'}
                </span>
              </div>
              <div className="relative">
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(Number(e.target.value))}
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50 focus:bg-white text-xs sm:text-sm text-slate-900 font-semibold rounded-xl border border-slate-200 focus:border-blue-600 focus:outline-none transition-all appearance-none cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <Layers className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Issue Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Issue Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Brief summary of the defect"
                className="w-full px-4 py-2.5 bg-slate-50 focus:bg-white text-xs sm:text-sm text-slate-900 rounded-xl border border-slate-200 focus:border-blue-600 focus:outline-none transition-all"
              />
            </div>

            {/* Detailed Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Incident Description <span className="text-rose-500">*</span>
                </label>
                <span className={`text-[11px] font-mono ${description.length > 450 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                  {description.length} / 500 characters
                </span>
              </div>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                required
                placeholder="Describe the problem, hazard level, and specific physical attributes..."
                className="w-full p-4 bg-slate-50 focus:bg-white text-xs sm:text-sm text-slate-900 rounded-xl border border-slate-200 focus:border-blue-600 focus:outline-none transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Location & Spatial Pin matching report issue.png */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Location & Spatial Pin
                </h3>
              </div>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" />
                <span>Live GPS Lock</span>
              </span>
            </div>

            {/* GPS Telemetry card with coordinates and Re-center */}
            <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-mono text-xs font-bold text-slate-900">
                    {Math.abs(location.lat).toFixed(4)}° {location.lat >= 0 ? 'N' : 'S'},{' '}
                    {Math.abs(location.lon).toFixed(4)}° {location.lon >= 0 ? 'E' : 'W'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Accuracy radius {accuracy}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGetLocation}
                disabled={gpsLocating}
                className="bg-white hover:bg-slate-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-blue-200 shadow-2xs transition-colors shrink-0 flex items-center gap-1.5"
              >
                {gpsLocating && <RefreshCw className="w-3 h-3 animate-spin" />}
                <span>Re-center</span>
              </button>
            </div>

            {/* Interactive Leaflet Mini Map with draggable pin */}
            <div className="relative">
              <MapComponent
                center={[location.lat, location.lon]}
                zoom={14}
                pickerMode={true}
                pickedLocation={location}
                onLocationPick={handleLocationPick}
                height="240px"
              />
              <div className="absolute top-2 left-2 z-10 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1 pointer-events-none">
                <MapPin className="w-3 h-3 text-rose-400" />
                <span>Drag to adjust exact location</span>
              </div>
            </div>

            {/* Geocoded Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Geocoded Address
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street and Ward designation"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 focus:bg-white text-xs text-slate-900 rounded-xl border border-slate-200 focus:border-blue-600 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Landmark */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nearby Landmark / Physical Reference
              </label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="Directly opposite the public transit stop shelter"
                className="w-full px-4 py-2 bg-slate-50 focus:bg-white text-xs text-slate-900 rounded-xl border border-slate-200 focus:border-blue-600 focus:outline-none transition-all"
              />
            </div>

            {/* Manual Pin Overwrite toggle switch */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
              <div>
                <span className="font-bold text-slate-800">Manual Pin Overwrite</span>
                <p className="text-[11px] text-slate-500">Lock coordinates to user-dragged mark</p>
              </div>
              <button
                type="button"
                onClick={() => setManualPinOverwrite(!manualPinOverwrite)}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                  manualPinOverwrite ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    manualPinOverwrite ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm py-3.5 px-6 rounded-2xl shadow-lg shadow-blue-600/30 hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Submit Municipal Report</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
