import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CheckCheck, ArrowRight } from "lucide-react";
import { api } from "../../services/api";
import { useToast } from "../../context/ToastContext";
import { useNotifications } from "../../context/NotificationContext";

/*
  Theme (same as the landing, login, register, admin, analytics and profile pages)
  mint background  #E6F5F8
  light cyan       #7FD0E0
  bright cyan      #38C6DC
  mid blue         #1B8FC0
  deep blue        #0B5A9C
  soft grey text   #5F5F5F
*/

const GRADIENT = "bg-gradient-to-br from-[#38C6DC] to-[#0B5A9C]";
const CARD =
  "bg-white/80 rounded-3xl border border-[#cfe9f0] shadow-[0_10px_30px_-14px_rgba(11,90,156,0.35)]";

const kindLabel = (item) => (item.report_id ? "Report update" : "Update");

export default function NotificationsPage() {
  const toast = useToast();
  const { unreadCount, refreshUnreadCount } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [filterTab, setFilterTab] = useState("all");
  const [loading, setLoading] = useState(true);

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

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const [data] = await Promise.all([
        api.notifications.list({
          unread: filterTab === "unread" ? true : undefined,
          per_page: 200,
        }),
        refreshUnreadCount(),
      ]);
      setNotifications(data);
      setSelectedNotif(
        (current) =>
          data.find((item) => item.id === current?.id) || data[0] || null,
      );
    } catch (error) {
      toast.error(`Could not load your notifications: ${error.message}`);
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
      toast.success("Everything is marked as read");
      await fetchNotifs();
    } catch (error) {
      toast.error(`Could not mark them as read: ${error.message}`);
    }
  };

  const handleMarkSingleRead = async (id, e) => {
    e?.stopPropagation();
    try {
      await api.notifications.markRead(id);
      toast.info("Marked as read");
      await fetchNotifs();
    } catch (error) {
      toast.error(`Could not mark it as read: ${error.message}`);
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 data-tour="resident-notifications-page" className="text-3xl font-extrabold text-[#5F5F5F] tracking-tight">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span
                className={`${GRADIENT} text-white text-xs font-bold px-3 py-1 rounded-full`}
              >
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="text-xs text-[#5F5F5F] mt-2 max-w-xl leading-relaxed">
            Updates on the reports you sent or follow.
          </p>
        </div>

        <button
          type="button"
          onClick={handleMarkAllRead}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[#0B5A9C] shadow-[0_6px_14px_-6px_rgba(11,90,156,0.45)] hover:bg-[#f4fbfd] transition-colors"
        >
          <CheckCheck className="w-4 h-4" />
          <span>Mark all as read</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: "all", label: "All", count: notifications.length },
          { id: "unread", label: "New", count: unreadCount },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterTab(tab.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 flex items-center gap-2 ${
              filterTab === tab.id
                ? `${GRADIENT} text-white shadow-[0_6px_14px_-6px_rgba(11,90,156,0.7)]`
                : "bg-white text-[#5F5F5F] border border-[#cfe9f0] hover:bg-[#f4fbfd]"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 rounded-md ${
                filterTab === tab.id
                  ? "bg-white/25 text-white"
                  : "bg-[#E6F5F8] text-[#5F5F5F]"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* List and details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* List */}
        <div className="lg:col-span-7 space-y-3">
          {!loading && notifications.length === 0 && (
            <div className={`${CARD} p-8 text-center text-xs text-[#5F5F5F]`}>
              {filterTab === "unread"
                ? "You have no new notifications."
                : "You have no notifications yet."}
            </div>
          )}

          {notifications.map((item) => {
            const isSelected = selectedNotif?.id === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedNotif(item)}
                className={`p-4 sm:p-5 rounded-2xl border bg-white/90 transition-all cursor-pointer relative ${
                  isSelected
                    ? "border-[#1B8FC0] shadow-[0_10px_24px_-12px_rgba(11,90,156,0.5)] ring-2 ring-[#38C6DC]/25"
                    : "border-[#cfe9f0] hover:border-[#7FD0E0] shadow-sm"
                }`}
              >
                {!item.read && (
                  <span
                    className={`absolute top-5 left-3 w-2.5 h-2.5 rounded-full ${GRADIENT}`}
                  />
                )}

                <div className="pl-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#0B5A9C]">
                        {kindLabel(item)}
                      </span>
                      {!item.read && (
                        <span className="text-[10px] font-bold text-[#0B5A9C] bg-[#7FD0E0]/40 px-2 py-0.5 rounded-full">
                          New
                        </span>
                      )}
                    </div>
                    <time
                      className="text-[11px] text-[#7a8a90]"
                      dateTime={item.created_at}
                    >
                      {new Date(item.created_at).toLocaleString()}
                    </time>
                  </div>

                  <p className="text-xs text-[#5F5F5F] leading-relaxed line-clamp-2 mb-3">
                    {item.message}
                  </p>

                  <div className="flex items-center gap-3 pt-3 border-t border-[#cfe9f0]">
                    <button
                      type="button"
                      onClick={() => setSelectedNotif(item)}
                      className={`rounded-full ${GRADIENT} px-4 py-1.5 text-xs font-bold text-white hover:brightness-110 transition`}
                    >
                      View
                    </button>
                    {!item.read && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkSingleRead(item.id, e)}
                        className="text-xs font-semibold text-[#5F5F5F] hover:text-[#0B5A9C] hover:underline"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected notification */}
        <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
          {selectedNotif ? (
            <div className={`${CARD} p-6 space-y-5`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#0B5A9C]">
                    {kindLabel(selectedNotif)}
                  </span>
                  {!selectedNotif.read && (
                    <span className="text-[10px] font-bold text-[#0B5A9C] bg-[#7FD0E0]/40 px-2 py-0.5 rounded-full">
                      New
                    </span>
                  )}
                </div>
                <time
                  className="text-[11px] text-[#7a8a90]"
                  dateTime={selectedNotif.created_at}
                >
                  {new Date(selectedNotif.created_at).toLocaleString()}
                </time>
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-[#5F5F5F] mb-2">
                  Message
                </h3>
                <p className="text-xs text-[#4a4a4a] leading-relaxed bg-[#E6F5F8] p-4 rounded-2xl border border-[#cfe9f0] break-words">
                  {selectedNotif.message}
                </p>
              </div>

              {selectedNotif.report_id && (
                <Link
                  to={`/reports/${selectedNotif.report_id}`}
                  className="w-full flex items-center rounded-full bg-[#7FD0E0]/70 hover:bg-[#7FD0E0] p-1 pr-10 text-sm font-semibold text-[#5F5F5F] transition-colors"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[#38C6DC] bg-[#E6F5F8] text-[#1B8FC0]">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                  <span className="flex-1 text-center">Open the report</span>
                </Link>
              )}
            </div>
          ) : (
            <div className={`${CARD} p-8 text-center text-xs text-[#5F5F5F]`}>
              {loading ? "Loading..." : "Pick a notification to read it here."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
