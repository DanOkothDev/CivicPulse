import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MapPin,
  Compass,
  CheckCircle2,
  ArrowRight,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import ImageUploadComponent from '../../components/ui/ImageUploadComponent';
import MapComponent from '../../components/ui/MapComponent';

export default function ReportIssuePage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Form State
  const [photo, setPhoto] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState({ lat: -1.2921, lon: 36.8219 });
  const [accuracy, setAccuracy] = useState('Default location');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [loading, setLoading] = useState(false);
  const [gpsLocating, setGpsLocating] = useState(false);

  // Load categories and parse deep link query params
  useEffect(() => {
    api.reference
      .getCategories()
      .then((data) => {
        setCategories(data);
        const catParam = searchParams.get('category');
        if (catParam) {
          setCategoryId(Number(catParam));
        } else if (data.length > 0 && !categoryId) {
          setCategoryId(data[0].id);
        }
      })
      .catch((error) => toast.error(`Could not load report categories: ${error.message}`));

    const latParam = searchParams.get('lat');
    const lonParam = searchParams.get('lon');
    const addrParam = searchParams.get('address');
    if (latParam && lonParam) {
      setLocation({ lat: parseFloat(latParam), lon: parseFloat(lonParam) });
      setAccuracy('±3 meters (Location Pre-set from Map)');
    }
    if (addrParam) {
      setAddress(addrParam);
    }
  }, [searchParams]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!photo?.file) {
      toast.error('Please attach a photo of the incident (JPEG or PNG under 5 MB)');
      return;
    }

    if (!title.trim() && !description.trim()) {
      toast.error('Please provide a title or description of the issue');
      return;
    }

    if (!categoryId) {
      toast.error('Please select an issue category');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('category_id', String(categoryId));
      formData.append('lat', String(location.lat));
      formData.append('lon', String(location.lon));
      const fullDesc = title.trim()
        ? `${title.trim()}${description.trim() ? `: ${description.trim()}` : ''}`
        : description.trim();
      formData.append('description', fullDesc.slice(0, 500));
      formData.append('photo', photo.file);

      const created = await api.reports.create(formData);
      toast.success(`Report #${created.id} submitted successfully! AI triage is now processing in the background.`);
      navigate(`/reports/${created.id}`);
    } catch (err) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header bar */}
      <div className="pb-3 border-b border-slate-200">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Report a Problem
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
          Tell us what needs fixing in your area by taking a photo, describing the issue, and sharing its location.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Photo & Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Add a Photo */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Add a Photo
                </h3>
              </div>
              {photo && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Photo attached</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Take or upload a clear photo of the problem (JPEG or PNG, up to 5 MB).
            </p>

            <ImageUploadComponent
              image={photo}
              onImageChange={setPhoto}
              onImageRemove={() => setPhoto(null)}
            />
          </div>

          {/* 2. Issue Details */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  What is the Problem?
                </h3>
              </div>
            </div>

            {/* Category selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Category <span className="text-rose-500">*</span>
                </label>
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
                Title / Summary <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Deep pothole along Ngong Road near bus stage"
                className="w-full px-4 py-2.5 bg-slate-50 focus:bg-white text-xs sm:text-sm text-slate-900 rounded-xl border border-slate-200 focus:border-blue-600 focus:outline-none transition-all"
              />
            </div>

            {/* Detailed Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Description <span className="text-rose-500">*</span>
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
                placeholder="Explain the problem in detail so the repair crew knows what to expect..."
                className="w-full p-4 bg-slate-50 focus:bg-white text-xs sm:text-sm text-slate-900 rounded-xl border border-slate-200 focus:border-blue-600 focus:outline-none transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Location */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Where is it Located?
                </h3>
              </div>
            </div>

            {/* Prominent Live Location Detection Button */}
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={gpsLocating}
              className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs sm:text-sm py-3 px-4 rounded-2xl border border-blue-200 transition-all flex items-center justify-center gap-2 shadow-2xs hover:shadow-sm"
            >
              {gpsLocating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Finding your location...</span>
                </>
              ) : (
                <>
                  <Compass className="w-4 h-4 text-blue-600" />
                  <span>Use My Current Location (GPS)</span>
                </>
              )}
            </button>

            {/* Coordinates and accuracy info */}
            <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-medium">
              <span>
                Coordinates: {Math.abs(location.lat).toFixed(4)}° {location.lat >= 0 ? 'N' : 'S'}, {Math.abs(location.lon).toFixed(4)}° {location.lon >= 0 ? 'E' : 'W'}
              </span>
              <span className="text-[11px] text-slate-400">{accuracy}</span>
            </div>

            {/* Interactive Leaflet Map with pin */}
            <div className="relative">
              <MapComponent
                center={[location.lat, location.lon]}
                zoom={14}
                pickerMode={true}
                pickedLocation={location}
                onLocationPick={handleLocationPick}
                height="220px"
              />
              <div className="absolute top-2 left-2 z-10 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1 pointer-events-none">
                <MapPin className="w-3 h-3 text-rose-400" />
                <span>Tap or drag pin to adjust</span>
              </div>
            </div>

            {/* Street Address / Area */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Street Address or Area Name
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Kenyatta Avenue, CBD or Waiyaki Way"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 focus:bg-white text-xs sm:text-sm text-slate-900 rounded-xl border border-slate-200 focus:border-blue-600 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Landmark */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nearby Landmark (Optional)
              </label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Near Kencom bus stage or Quickmart supermarket"
                className="w-full px-4 py-2.5 bg-slate-50 focus:bg-white text-xs sm:text-sm text-slate-900 rounded-xl border border-slate-200 focus:border-blue-600 focus:outline-none transition-all"
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm py-3.5 px-6 rounded-2xl shadow-lg shadow-blue-600/30 hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Submit Report</span>
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
