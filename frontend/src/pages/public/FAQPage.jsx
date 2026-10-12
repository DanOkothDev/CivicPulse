import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Search, HelpCircle, MessageSquare, ArrowRight, ShieldCheck, Camera } from 'lucide-react';

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openItems, setOpenItems] = useState([0]); // First item open by default

  const faqItems = [
    {
      category: 'General',
      question: 'What is CivicPulse?',
      answer: 'CivicPulse is an open citizen infrastructure intelligence and municipal reporting platform. It empowers citizens to report public defects (potholes, streetlights, drainage, garbage, water leaks) with photo and GPS evidence, and provides municipal authorities with verified workflows and duplicate detection to resolve them efficiently.',
    },
    {
      category: 'Reporting',
      question: 'How do I submit a report?',
      answer: 'Simply click "Report an Issue", snap or upload a photo of the defect, allow the browser to detect your GPS coordinates (or adjust the pin manually on the interactive map), select one of the six categories, add a short description, and submit. The entire process takes under 30 seconds.',
    },
    {
      category: 'Technology',
      question: 'How does duplicate detection work?',
      answer: 'When a new defect is reported, CivicPulse runs a spatial duplicate detection algorithm: reports within a 200-meter radius sharing the same defect category are flagged as potential duplicates. Municipal verifiers can inspect the suggested duplicates and merge them into a parent dossier with a single click, preventing redundant crew dispatches.',
    },
    {
      category: 'Transparency',
      question: 'Can I track my report from submission to resolution?',
      answer: 'Yes. Every report receives a unique tracking ID and a real-time status page. You can follow the issue through each lifecycle milestone (Reported → Verified → Assigned → In Progress → Resolved) and view audit trail history notes. Followers receive notifications whenever a status changes.',
    },
    {
      category: 'Coverage',
      question: 'Which defect categories are supported?',
      answer: 'CivicPulse covers the six highest-priority municipal infrastructure defect categories: Potholes, Streetlights, Drainage blockages, Solid Waste & Garbage dumping, Water Pipe Leaks, and Public Facility damage.',
    },
    {
      category: 'Privacy',
      question: 'Is my personal data kept private?',
      answer: 'Yes. CivicPulse respects citizen privacy. While authenticated accounts help prevent spam and earn Civic XP badges, your reports focus on infrastructure geography, and your personal contact details are never exposed to public viewers on the map.',
    },
    {
      category: 'Operations',
      question: 'How do local authorities and field crews use CivicPulse?',
      answer: 'Municipalities receive dedicated role-based portals: Triage Verifiers inspect incoming queues and resolve duplicates; Authority Crews receive work orders with priority SLA countdowns and upload photo proof upon completion; Administrators oversee ward boundaries and system performance metrics.',
    },
  ];

  const toggleFaq = (idx) => {
    if (openItems.includes(idx)) {
      setOpenItems(openItems.filter((i) => i !== idx));
    } else {
      setOpenItems([...openItems, idx]);
    }
  };

  const filteredFaqs = faqItems.filter(
    (item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="py-12 sm:py-16">
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        {/* Page Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600 block mb-3">
            Help Center & Documentation
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-base text-slate-600 leading-relaxed">
            Find quick answers about how CivicPulse works, reporting workflows, duplicate detection, and city operations.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative mb-12 max-w-xl mx-auto">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions (e.g., duplicates, GPS, tracking)..."
            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white shadow-2xs transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-4 mb-16">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((item, idx) => {
              const isOpen = openItems.includes(idx);
              return (
                <div
                  key={idx}
                  className={`rounded-2xl border transition-all ${
                    isOpen
                      ? 'bg-white border-blue-200 shadow-md ring-1 ring-blue-100'
                      : 'bg-slate-50/70 border-slate-200/90 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                        {item.category}
                      </span>
                      <span className="text-sm sm:text-base font-bold text-slate-900">
                        {item.question}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-blue-600' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-6 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
              <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">No matching questions found</h3>
              <p className="text-xs text-slate-500 mt-1">Try searching with a different term or keyword.</p>
            </div>
          )}
        </div>

        {/* Support Card */}
        <div className="p-8 sm:p-10 rounded-3xl bg-slate-900 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-lg sm:text-xl font-bold mb-1">Still have questions?</h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Join the community or test the platform directly by submitting your first civic report.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/report/new"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 px-5 rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>Report an Issue</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
