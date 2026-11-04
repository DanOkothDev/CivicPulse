import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  MapPin,
  Compass,
  CheckCircle2,
  ArrowRight,
  Layers,
  RefreshCw,
} from "lucide-react";
import { useToast } from "../../context/ToastContext";
import { api } from "../../services/api";
import ImageUploadComponent from "../../components/ui/ImageUploadComponent";
import MapComponent from "../../components/ui/MapComponent";

/*
  Theme (same as the admin dashboard)
  mint background  #E6F5F8
  light cyan       #7FD0E0
  bright cyan      #38C6DC
  mid blue         #1B8FC0
  deep blue        #0B5A9C
  soft grey text   #5F5F5F
  Font: Montserrat (loaded below)
*/

const GRADIENT = "bg-gradient-to-br from-[#38C6DC] to-[#0B5A9C]";
const CARD =
  "bg-white/80 rounded-3xl border border-[#cfe9f0] shadow-[0_10px_30px_-14px_rgba(11,90,156,0.35)]";
const INPUT =
  "w-full px-4 py-2.5 bg-white border border-[#cfe9f0] rounded-xl text-xs sm:text-sm text-[#4a4a4a] placeholder:text-[#7a8a90] focus:outline-none focus:border-[#1B8FC0]";
const LABEL = "block text-xs font-bold text-[#5F5F5F] mb-1.5";

function StepBadge({ n }) {
  return (
    <span
      className={`h-7 w-7 rounded-xl ${GRADIENT} text-white text-xs font-bold grid place-items-center shadow-[0_6px_12px_-6px_rgba(11,90,156,0.6)]`}
    >
      {n}
    </span>
  );
}

export default function ReportIssuePage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Load the theme font once
  useEffect(() => {
    if (document.getElementById("montserrat-font")) return;
    const link = document.createElement("link");
    link.id = "montserrat-font";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(link);
  }, []);

  // Form State
  const [photo, setPhoto] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState({ lat: -1.2921, lon: 36.8219 });
  const [accuracy, setAccuracy] = useState("Default location");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [loading, setLoading] = useState(false);
  const [gpsLocating, setGpsLocating] = useState(false);

  // Load categories and parse deep link query params
  useEffect(() => {
    api.reference
      .getCategories()
      .then((data) => {
        setCategories(data);
        const catParam = searchParams.get("category");
        if (catParam) {
          setCategoryId(Number(catParam));
        } else if (data.length > 0 && !categoryId) {
          setCategoryId(data[0].id);
        }
      })
      .catch((error) =>
        toast.error(`Could not load report categories: ${error.message}`),
      );

    const latParam = searchParams.get("lat");
    const lonParam = searchParams.get("lon");
    const addrParam = searchParams.get("address");
    if (latParam && lonParam) {
      setLocation({ lat: parseFloat(latParam), lon: parseFloat(lonParam) });
      setAccuracy("±3 meters (Location Pre-set from Map)");
    }
    if (addrParam) {
      setAddress(addrParam);
    }
  }, [searchParams]);

  // Browser Geolocation Trigger
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.warning(
        "Geolocation is not supported by your browser. You can drag the pin on the map.",
      );
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
        setAccuracy(
          `±${Math.round(pos.coords.accuracy || 5)} meters (Live GPS Lock)`,
        );
        setGpsLocating(false);
        toast.success("Live GPS coordinates acquired");
      },
      (err) => {
        setGpsLocating(false);
        toast.info(
          "Location permission denied or unavailable. You can position the pin manually on the map.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleLocationPick = (coords) => {
    setLocation(coords);
    setAddress(
      `Pinned location: ${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`,
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!photo?.file) {
      toast.error(
        "Please attach a photo of the incident (JPEG or PNG under 5 MB)",
      );
      return;
    }

    if (!title.trim() && !description.trim()) {
      toast.error("Please provide a title or description of the issue");
      return;
    }

    if (!categoryId) {
      toast.error("Please select an issue category");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("category_id", String(categoryId));
      formData.append("lat", String(location.lat));
      formData.append("lon", String(location.lon));
      const fullDesc = title.trim()
        ? `${title.trim()}${description.trim() ? `: ${description.trim()}` : ""}`
        : description.trim();
      formData.append("description", fullDesc.slice(0, 500));
      formData.append("photo", photo.file);

      const created = await api.reports.create(formData);
      toast.success(
        `Report #${created.id} submitted successfully! AI triage is now processing in the background.`,
      );
      navigate(`/reports/${created.id}`);
    } catch (err) {
      toast.error(err.message || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative isolate overflow-hidden rounded-3xl bg-[#E6F5F8] p-6 space-y-6"
      style={{
        fontFamily: "'Montserrat', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {/* Soft shapes in the corner, echoing the landing page */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 -z-10 h-80 w-80 rounded-full bg-gradient-to-br from-[#38C6DC]/40 to-[#0B5A9C]/30 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-40 -right-6 -z-10 h-12 w-12 rotate-12 rounded-2xl bg-white/40"
      />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-[#5F5F5F] tracking-tight">
          Report a problem
        </h1>
        <p className="text-xs text-[#5F5F5F] mt-2 max-w-2xl leading-relaxed">
          Tell us what needs fixing in your area by taking a photo, describing
          the issue, and sharing its location.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
      >
        {/* Left column: photo and details */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Photo */}
          <div className={`${CARD} p-6 space-y-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <StepBadge n={1} />
                <h2 className="text-base font-extrabold text-[#5F5F5F]">
                  Add a photo
                </h2>
              </div>
              {photo && (
                <span className="text-xs font-bold text-[#0B5A9C] flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-[#1B8FC0]" />
                  <span>Photo attached</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[#5F5F5F]">
              Take or upload a clear photo of the problem (JPEG or PNG, up to 5
              MB).
            </p>

            <ImageUploadComponent
              image={photo}
              onImageChange={setPhoto}
              onImageRemove={() => setPhoto(null)}
            />
          </div>

          {/* 2. Details */}
          <div className={`${CARD} p-6 space-y-4`}>
            <div className="flex items-center gap-2.5">
              <StepBadge n={2} />
              <h2 className="text-base font-extrabold text-[#5F5F5F]">
                What is the problem?
              </h2>
            </div>

            <div>
              <label className={LABEL}>
                Category <span className="text-[#0B5A9C]">*</span>
              </label>
              <div className="relative">
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(Number(e.target.value))}
                  className={`${INPUT} pr-10 font-semibold appearance-none cursor-pointer`}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <Layers className="w-4 h-4 text-[#1B8FC0] absolute right-3.5 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className={LABEL}>
                Title / summary <span className="text-[#0B5A9C]">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Deep pothole along Ngong Road near bus stage"
                className={INPUT}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#5F5F5F]">
                  Description <span className="text-[#0B5A9C]">*</span>
                </label>
                <span
                  className={`text-[11px] ${
                    description.length > 450
                      ? "text-[#0B5A9C] font-bold"
                      : "text-[#7a8a90]"
                  }`}
                >
                  {description.length} / 500 characters
                </span>
              </div>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                required
                placeholder="Explain the problem in detail so the repair crew knows what to expect..."
                className={`${INPUT} resize-none`}
              />
            </div>
          </div>
        </div>

        {/* Right column: location */}
        <div className="lg:col-span-5">
          <div className={`${CARD} p-6 space-y-4`}>
            <div className="flex items-center gap-2.5">
              <StepBadge n={3} />
              <h2 className="text-base font-extrabold text-[#5F5F5F]">
                Where is it located?
              </h2>
            </div>

            {/* GPS button, same pill style as the rest of the app */}
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={gpsLocating}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#7FD0E0]/70 hover:bg-[#7FD0E0] py-1 pl-1 pr-5 text-xs font-semibold text-[#5F5F5F] transition-colors disabled:opacity-60"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#38C6DC] bg-[#E6F5F8] text-[#1B8FC0]">
                {gpsLocating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Compass className="h-4 w-4" />
                )}
              </span>
              <span>
                {gpsLocating
                  ? "Finding your location..."
                  : "Use my current location (GPS)"}
              </span>
            </button>

            <div className="flex items-center justify-between gap-2 text-xs text-[#5F5F5F] px-1 font-medium">
              <span>
                Coordinates: {Math.abs(location.lat).toFixed(4)}°{" "}
                {location.lat >= 0 ? "N" : "S"},{" "}
                {Math.abs(location.lon).toFixed(4)}°{" "}
                {location.lon >= 0 ? "E" : "W"}
              </span>
              <span className="text-[11px] text-[#7a8a90] text-right">
                {accuracy}
              </span>
            </div>

            {/* Map with pin */}
            <div className="relative rounded-2xl overflow-hidden border border-[#cfe9f0]">
              <MapComponent
                center={[location.lat, location.lon]}
                zoom={14}
                pickerMode={true}
                pickedLocation={location}
                onLocationPick={handleLocationPick}
                height="220px"
              />
              <div className="absolute top-2 left-2 z-10 bg-white text-[#0B5A9C] text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-[0_6px_14px_-6px_rgba(11,90,156,0.45)] flex items-center gap-1 pointer-events-none">
                <MapPin className="w-3 h-3 text-[#1B8FC0]" />
                <span>Tap or drag pin to adjust</span>
              </div>
            </div>

            <div>
              <label className={LABEL}>Street address or area name</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-[#1B8FC0] absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Kenyatta Avenue, CBD or Waiyaki Way"
                  className={`${INPUT} pl-10`}
                />
              </div>
            </div>

            <div>
              <label className={LABEL}>
                Nearby landmark{" "}
                <span className="font-normal text-[#7a8a90]">(optional)</span>
              </label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Near Kencom bus stage or Quickmart supermarket"
                className={INPUT}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-full ${GRADIENT} px-6 py-3 text-sm font-bold text-white shadow-[0_8px_18px_-8px_rgba(11,90,156,0.7)] hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Submit report</span>
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
