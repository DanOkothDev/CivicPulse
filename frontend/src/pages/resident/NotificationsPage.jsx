import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Sliders,
  Play,
  MapPin,
  Clock,
  Shield,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Building2,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import MapComponent from '../../components/ui/MapComponent';

export default function NotificationsPage() {
  const toast = useToast();
  const [notifications, setNotifications] = useState([]);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [filterTab, setFilterTab] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const data = await api.notifications.list({
        unread: filterTab === 'unread' ? true : undefined,
      });
      setNotifications(data);
      if (data.length > 0 && !selectedNotif) {
        setSelectedNotif(data[0]);
      }
    } catch {
      toast.error('Could not load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, [filterTab]);

  const handleMarkAllRead = async () => {
    await api.notifications.markAllRead();
    toast.success('All notifications marked as read');
    fetchNotifs();
  };

  const handleMarkSingleRead = async (id, e) => {
    e?.stopPropagation();
    await api.notifications.markRead(id);
    toast.info('Notification marked read');
    fetchNotifs();
  };

  const filteredItems = notifications.filter((n) => {
    if (filterTab === 'unread') return !n.read;
    if (filterTab === 'triage') return n.type?.includes('triage') || n.type?.includes('verified');
    if (filterTab === 'crew') return n.type?.includes('dispatched') || n.type?.includes('assigned');
    if (filterTab === 'alerts') return n.type?.includes('ward') || n.type?.includes('alert');
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header bar matching notification.png */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-blue-700 tracking-wider uppercase mb-1">
            <span>Public Safety & Infrastructure Feed</span>
            <span>•</span>
            <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">
              3 Unread
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Notifications & Dispatch Alerts
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Real-time telemetric dispatch logs, community verifications, and ward municipal actions.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => toast.info('Telemetry simulation running in background')}
            className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 text-blue-600" />
            <span>Simulation View</span>
          </button>

          <button
            onClick={handleMarkAllRead}
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs px-3.5 py-2 rounded-xl border border-blue-200 transition-colors flex items-center gap-1.5"
          >
            <CheckCheck className="w-4 h-4 text-blue-600" />
            <span>Mark all as read</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs matching notification.png */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All', count: 18 },
            { id: 'unread', label: 'Unread', count: 3 },
            { id: 'triage', label: 'Triage Updates', count: 8 },
            { id: 'crew', label: 'Crew Dispatches', count: 4 },
            { id: 'alerts', label: 'Ward Alerts', count: 3 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                filterTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                  filterTab === tab.id ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" />
          <span>Live CAD Integration active • Avg. Dispatch Latency: <strong>3.4 min</strong></span>
        </div>
      </div>

      {/* Two Column Layout matching notification.png */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (7 cols): Notifications List */}
        <div className="lg:col-span-7 space-y-3">
          {filteredItems.map((item) => {
            const isSelected = selectedNotif?.id === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedNotif(item)}
                className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-500/10'
                    : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-sm'
                }`}
              >
                {/* Unread indicator */}
                {!item.read && (
                  <span className="absolute top-5 left-3 w-2 h-2 rounded-full bg-rose-500 pulse-dot" />
                )}

                <div className="pl-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                        {item.badge}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-slate-400">
                        {item.ref}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      14m ago
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mb-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mb-3">
                    {item.message}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Assigned: {item.assigned || 'Unit Crew 4B'}</span>
                    </span>

                    <div className="flex items-center gap-2">
                      {!item.read && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkSingleRead(item.id, e)}
                          className="px-2.5 py-1 text-slate-600 hover:text-slate-900 text-xs font-semibold"
                        >
                          Acknowledge
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedNotif(item)}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column (5 cols): Selected Notification Detail Panel matching notification.png */}
        <div className="lg:col-span-5 sticky top-20 space-y-4">
          {selectedNotif ? (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                    {selectedNotif.badge}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-400">
                    {selectedNotif.ref}
                  </span>
                </div>
                <span className="text-xs text-slate-400">14 minutes ago</span>
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {selectedNotif.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>842 Maple Ave, Ward 4 - Metro East</span>
                </p>
              </div>

              {/* Mini Map Snapshot */}
              <div className="h-44 rounded-2xl overflow-hidden border border-slate-200 relative">
                <MapComponent
                  center={[-1.2580, 36.8210]}
                  zoom={15}
                  height="100%"
                />
                <div className="absolute bottom-2 left-2 z-10 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
                  <span>Field Unit GPS Active</span>
                </div>
              </div>

              {/* 4-Box Telemetry Metrics */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Assigned Personnel</span>
                  <span className="font-bold text-slate-800">{selectedNotif.assigned || 'Crew 4B (Rapid)'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Est. Time to Resolve</span>
                  <span className="font-bold text-rose-600">{selectedNotif.estTime || '1h 45m'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Infrastructure Group</span>
                  <span className="font-bold text-slate-800">{selectedNotif.group || 'Water Infrastructure'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Triage Priority</span>
                  <span className="font-bold text-rose-600">{selectedNotif.priority || 'Critical / Tier 1'}</span>
                </div>
              </div>

              {/* Dispatch Synopsis */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Dispatch Synopsis
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  A pressurized primary line rupture has flooded the roadway and compromised adjacent curb infrastructure. Unit Crew 4B is physically on-site deploying high-volume sump extraction and isolating the quadrant backflow valve.
                </p>
              </div>

              <Link
                to={selectedNotif.report_id ? `/reports/${selectedNotif.report_id}` : '/dashboard'}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
              >
                <span>Open Dedicated Incident Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-xs text-slate-400">
              Select an alert from the stream to inspect dispatch telemetry.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
