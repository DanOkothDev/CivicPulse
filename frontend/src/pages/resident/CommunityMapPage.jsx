import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  MapPin,
  Layers,
  Filter,
  Search,
  Eye,
  ThumbsUp,
  X,
  Compass,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import MapComponent from '../../components/ui/MapComponent';
import StatusBadge from '../../components/ui/StatusBadge';
import SearchBar from '../../components/ui/SearchBar';

export default function CommunityMapPage() {
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const [reports, setReports] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [searchVal, setSearchVal] = useState(searchParams.get('search') || '');
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load categories and reports
  useEffect(() => {
    api.reference
      .getCategories()
      .then(setCategories)
      .catch((error) => toast.error(`Could not load report categories: ${error.message}`));
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await api.reports.list({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        category_id: selectedCategory || undefined,
        search: searchVal || undefined,
      });
      setReports(res.items || []);
    } catch (error) {
      toast.error(`Could not load map reports: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [statusFilter, selectedCategory, searchVal]);

  const handleMarkerClick = (report) => {
    setSelectedReport(report);
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col gap-3">
      {/* Page Title & Context: Spatial Intelligence */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-blue-600 block">
            Spatial Intelligence
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Live Community Map
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/report/new"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-3.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
          >
            <span>Report Defect</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Top Filter and Controls Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
        <div className="flex-1 max-w-md">
          <SearchBar
            value={searchVal}
            onChange={setSearchVal}
            onClear={() => setSearchVal('')}
            placeholder="Search map by defect, street (e.g. Waiyaki Way, Moi Ave), or landmark..."
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status selector */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="reported">Reported (Under Triage)</option>
            <option value="verified">Verified</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>

          {/* Category selector */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs font-semibold py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-xl">
            {reports.length} Incidents Visible
          </div>
        </div>
      </div>

      {/* Map View & Drawer Layout */}
      <div className="flex-1 relative rounded-3xl overflow-hidden border border-slate-200 shadow-md">
        <MapComponent
          center={[-1.2629, 36.8355]}
          zoom={13}
          reports={reports}
          selectedReport={selectedReport}
          onMarkerClick={handleMarkerClick}
          height="100%"
        />

        {/* Selected Incident Floating Drawer / Card */}
        {selectedReport && (
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-96 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl p-4 z-20 transition-all animate-slide-up">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedReport.status} size="xs" />
                <span className="text-[11px] font-mono font-bold text-slate-400">
                  #RPT-{selectedReport.id}
                </span>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-3 mb-3">
              <img
                src={selectedReport.photo_url}
                alt={selectedReport.category?.name}
                className="w-20 h-20 rounded-xl object-cover shrink-0 border border-slate-100"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-slate-900 truncate mb-1">
                  {selectedReport.category?.name}
                </h4>
                <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                  {selectedReport.description}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                  <span>
                    {selectedReport.location
                      ? `${selectedReport.location.lat.toFixed(5)}, ${selectedReport.location.lon.toFixed(5)}`
                      : 'Location unavailable'}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                <ThumbsUp className="w-3.5 h-3.5 text-blue-600" />
                <span>{selectedReport.report_count} Upvotes</span>
              </span>

              <Link
                to={`/reports/${selectedReport.id}`}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
              >
                <span>View Full Dossier</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 p-3 shadow-md hidden sm:block">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Status Map Legend
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Reported</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span>Verified</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
              <span>Assigned</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span>In Progress</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Resolved</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Rejected</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
