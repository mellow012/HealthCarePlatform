'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, CheckCircle, XCircle, Clock, TrendingUp, TrendingDown,
  Filter, Download, Loader2, BarChart3, PieChart, Award, AlertTriangle
} from 'lucide-react';

interface HistoryEntry {
  id: string;
  medicationName: string;
  dosage: string;
  time: string;
  status: 'taken' | 'missed' | 'skipped';
  timestamp: string;
  date: string;
}

interface WeeklyStats {
  week: string;
  adherenceRate: number;
  totalDoses: number;
  takenDoses: number;
  missedDoses: number;
}

export default function SchedulerHistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7days');
  const [filterStatus, setFilterStatus] = useState<'all' | 'taken' | 'missed' | 'skipped'>('all');

  useEffect(() => {
    fetchHistory();
  }, [dateRange]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/patient/scheduler/history?range=${dateRange}`);
      const json = await res.json();
      
      if (json.success) {
        setHistory(json.data.history || []);
        setWeeklyStats(json.data.weeklyStats || []);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = filterStatus === 'all' 
    ? history 
    : history.filter(h => h.status === filterStatus);

  const overallStats = {
    totalDoses: history.length,
    taken: history.filter(h => h.status === 'taken').length,
    missed: history.filter(h => h.status === 'missed').length,
    skipped: history.filter(h => h.status === 'skipped').length,
    adherenceRate: history.length > 0 
      ? Math.round((history.filter(h => h.status === 'taken').length / history.length) * 100)
      : 0,
  };

  const groupByDate = (entries: HistoryEntry[]) => {
    const grouped: Record<string, HistoryEntry[]> = {};
    entries.forEach(entry => {
      if (!grouped[entry.date]) {
        grouped[entry.date] = [];
      }
      grouped[entry.date].push(entry);
    });
    return grouped;
  };

  const groupedHistory = groupByDate(filteredHistory);
  const dates = Object.keys(groupedHistory).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Medication History</h1>
            <p className="text-gray-600 mt-1">View your medication adherence and analytics</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.href = '/patient/dosage-scheduler/overview'}
              className="px-5 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
            >
              Back to Overview
            </button>
            <button className="px-5 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition flex items-center gap-2">
              <Download className="w-5 h-5" />
              Export Report
            </button>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5 text-gray-600" />
              <p className="text-sm text-gray-600">Total Doses</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{overallStats.totalDoses}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-sm text-gray-600">Taken</p>
            </div>
            <p className="text-3xl font-bold text-green-600">{overallStats.taken}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-gray-600">Missed</p>
            </div>
            <p className="text-3xl font-bold text-red-600">{overallStats.missed}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-gray-600" />
              <p className="text-sm text-gray-600">Skipped</p>
            </div>
            <p className="text-3xl font-bold text-gray-600">{overallStats.skipped}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-sm p-6 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5" />
              <p className="text-sm opacity-90">Adherence</p>
            </div>
            <p className="text-3xl font-bold">{overallStats.adherenceRate}%</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Filter by:</span>
              <div className="flex gap-2">
                {(['all', 'taken', 'missed', 'skipped'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
                      filterStatus === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-600" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border rounded-lg bg-white text-sm font-medium"
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>
        </div>

        {/* Weekly Trend Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-green-600" />
            Adherence Trend
          </h2>
          <div className="grid grid-cols-7 gap-2">
            {weeklyStats.map((week, i) => (
              <div key={i} className="text-center">
                <p className="text-xs text-gray-600 mb-2">{week.week}</p>
                <div className="bg-gray-100 rounded-lg h-40 flex flex-col justify-end overflow-hidden">
                  <div 
                    className={`transition-all ${
                      week.adherenceRate >= 90 ? 'bg-green-500' : 
                      week.adherenceRate >= 70 ? 'bg-yellow-500' : 
                      'bg-red-500'
                    }`}
                    style={{ height: `${week.adherenceRate}%` }}
                  ></div>
                </div>
                <p className="text-xs font-medium text-gray-900 mt-2">{week.adherenceRate}%</p>
                <p className="text-xs text-gray-500">{week.takenDoses}/{week.totalDoses}</p>
              </div>
            ))}
          </div>
        </div>

        {/* History Timeline */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Detailed History</h2>
          </div>
          
          {dates.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800">No History Yet</h3>
              <p className="text-gray-600 mt-2">Start tracking your medications to see your history here.</p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {dates.map(date => {
                const entries = groupedHistory[date];
                const dateObj = new Date(date);
                const taken = entries.filter(e => e.status === 'taken').length;
                const total = entries.length;
                const dayRate = Math.round((taken / total) * 100);

                return (
                  <div key={date} className="border-l-4 border-blue-600 pl-6 pb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </h3>
                        <p className="text-sm text-gray-600">{taken}/{total} doses taken ({dayRate}%)</p>
                      </div>
                      <div className={`px-4 py-2 rounded-lg font-medium ${
                        dayRate >= 90 ? 'bg-green-100 text-green-800' :
                        dayRate >= 70 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {dayRate}% Complete
                      </div>
                    </div>

                    <div className="space-y-3">
                      {entries.map(entry => (
                        <div key={entry.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${
                              entry.status === 'taken' ? 'bg-green-100 text-green-600' :
                              entry.status === 'missed' ? 'bg-red-100 text-red-600' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {entry.status === 'taken' ? <CheckCircle className="w-5 h-5" /> :
                               entry.status === 'missed' ? <XCircle className="w-5 h-5" /> :
                               <XCircle className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{entry.medicationName}</p>
                              <p className="text-sm text-gray-600">{entry.dosage}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">{entry.time}</p>
                            <p className={`text-xs mt-1 capitalize ${
                              entry.status === 'taken' ? 'text-green-600' :
                              entry.status === 'missed' ? 'text-red-600' :
                              'text-gray-600'
                            }`}>
                              {entry.status}
                              {entry.timestamp && ` at ${new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}