import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCheck,
  ArrowRight,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function NotificationsPage() {
  const toast = useToast();
  const [notifications, setNotifications] = useState([]);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [filterTab, setFilterTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const [data, unread] = await Promise.all([
        api.notifications.list({
        unread: filterTab === 'unread' ? true : undefined,
          per_page: 200,
        }),
        api.notifications.getUnreadCount(),
      ]);
      setNotifications(data);
      setUnreadCount(unread.count);
      setSelectedNotif((current) => data.find((item) => item.id === current?.id) || data[0] || null);
    } catch (error) {
      toast.error(`Could not load notifications: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, [filterTab]);

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      toast.success('All notifications marked as read');
      await fetchNotifs();
    } catch (error) {
      toast.error(`Could not mark notifications as read: ${error.message}`);
    }
  };

  const handleMarkSingleRead = async (id, e) => {
    e?.stopPropagation();
    try {
      await api.notifications.markRead(id);
      toast.info('Notification marked read');
      await fetchNotifs();
    } catch (error) {
      toast.error(`Could not mark notification as read: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar matching notification.png */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-blue-700 tracking-wider uppercase mb-1">
            <span>Report Updates</span>
            <span>•</span>
            <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">
              {unreadCount} Unread
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Notifications
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Updates related to reports you submitted or follow.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleMarkAllRead}
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs px-3.5 py-2 rounded-xl border border-blue-200 transition-colors flex items-center gap-1.5"
          >
            <CheckCheck className="w-4 h-4 text-blue-600" />
            <span>Mark all as read</span>
          </button>
        </div>
      </div>

      {/* Filter tabs supported by the notifications API */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All', count: notifications.length },
            { id: 'unread', label: 'Unread', count: unreadCount },
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
      </div>

      {/* Notification list and selected item */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (7 cols): Notifications List */}
        <div className="lg:col-span-7 space-y-3">
          {notifications.map((item) => {
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
                  <span className="absolute top-5 left-3 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}

                <div className="pl-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${
                        item.read
                          ? 'bg-slate-50 text-slate-600 border-slate-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {item.read ? 'Read' : 'Unread'}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-slate-400">
                        {item.report_id ? `Report #${item.report_id}` : `Notification #${item.id}`}
                      </span>
                    </div>
                    <time className="text-xs text-slate-400" dateTime={item.created_at}>
                      {new Date(item.created_at).toLocaleString()}
                    </time>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mb-3">
                    {item.message}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      {!item.read && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkSingleRead(item.id, e)}
                          className="px-2.5 py-1 text-slate-600 hover:text-slate-900 text-xs font-semibold"
                        >
                          Mark as read
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

        {/* Selected notification details */}
        <div className="lg:col-span-5 sticky top-20 space-y-4">
          {selectedNotif ? (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${
                    selectedNotif.read
                      ? 'bg-slate-50 text-slate-600 border-slate-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                  {selectedNotif.read ? 'Read' : 'Unread'}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-400">
                    {selectedNotif.report_id
                      ? `Report #${selectedNotif.report_id}`
                      : `Notification #${selectedNotif.id}`}
                  </span>
                </div>
                <time className="text-xs text-slate-400" dateTime={selectedNotif.created_at}>
                  {new Date(selectedNotif.created_at).toLocaleString()}
                </time>
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Notification details
                </h3>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Message
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100 break-words">
                  {selectedNotif.message}
                </p>
              </div>

              {selectedNotif.report_id && (
                <Link
                  to={`/reports/${selectedNotif.report_id}`}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <span>Open related report</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-xs text-slate-400">
              {loading ? 'Loading notifications...' : 'Select a notification to view its details.'}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
