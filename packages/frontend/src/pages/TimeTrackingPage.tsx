import { useState } from 'react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Plus, Play, Square, Clock, Calendar, BarChart3 } from 'lucide-react';

export function TimeTrackingPage() {
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [activeTab, setActiveTab] = useState<'entries' | 'summary'>('entries');

  const timeEntries = [
    { date: '2026-02-17', project: 'CloudBooks Pro', task: 'Frontend Development', hours: 3.5, billable: true, rate: 150, status: 'active' },
    { date: '2026-02-17', project: 'Client Website', task: 'UI Design Review', hours: 1.5, billable: true, rate: 120, status: 'completed' },
    { date: '2026-02-16', project: 'CloudBooks Pro', task: 'API Integration', hours: 6.0, billable: true, rate: 150, status: 'completed' },
    { date: '2026-02-16', project: 'Internal', task: 'Team Meeting', hours: 1.0, billable: false, rate: 0, status: 'completed' },
    { date: '2026-02-15', project: 'Client Website', task: 'Bug Fixes', hours: 4.0, billable: true, rate: 120, status: 'completed' },
    { date: '2026-02-15', project: 'CloudBooks Pro', task: 'Database Schema', hours: 5.0, billable: true, rate: 150, status: 'completed' },
  ];

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalHoursToday = timeEntries.filter(e => e.date === '2026-02-17').reduce((sum, e) => sum + e.hours, 0);
  const totalBillable = timeEntries.filter(e => e.billable).reduce((sum, e) => sum + (e.hours * e.rate), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Time Tracking</h1>
          <p className="text-gray-500 mt-1">Track billable hours across projects and tasks</p>
        </div>
        <Button><Plus size={16} className="mr-1" /> Manual Entry</Button>
      </div>

      {/* Timer Widget */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-4xl font-mono font-bold text-gray-900 dark:text-white">
              {formatTime(timerSeconds)}
            </div>
            <div className="space-y-1">
              <input
                type="text"
                placeholder="What are you working on?"
                className="block w-64 text-sm bg-transparent border-b border-gray-200 dark:border-gray-600 focus:border-primary-500 focus:outline-none pb-1"
              />
              <div className="flex gap-2">
                <select className="text-xs bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 border-0">
                  <option>Select Project</option>
                  <option>CloudBooks Pro</option>
                  <option>Client Website</option>
                </select>
                <label className="flex items-center gap-1 text-xs text-gray-500">
                  <input type="checkbox" defaultChecked className="rounded" /> Billable
                </label>
              </div>
            </div>
          </div>
          <Button
            onClick={() => setIsTimerRunning(!isTimerRunning)}
            className={isTimerRunning ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {isTimerRunning ? <><Square size={16} className="mr-1" /> Stop</> : <><Play size={16} className="mr-1" /> Start Timer</>}
          </Button>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 text-sm"><Clock size={16} /> Today</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalHoursToday}h</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 text-sm"><Calendar size={16} /> This Week</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">21h</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 text-sm"><BarChart3 size={16} /> Billable Amount</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">AED {totalBillable.toLocaleString()}</p>
        </div>
      </div>

      {/* Time Entries */}
      <Card padding={false}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-medium text-gray-900 dark:text-white">Recent Time Entries</h3>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button onClick={() => setActiveTab('entries')} className={`px-3 py-1 text-sm rounded-md ${activeTab === 'entries' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-500'}`}>Entries</button>
            <button onClick={() => setActiveTab('summary')} className={`px-3 py-1 text-sm rounded-md ${activeTab === 'summary' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-500'}`}>Summary</button>
          </div>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {timeEntries.map((entry, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-500 w-20">{entry.date.slice(5)}</div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{entry.task}</p>
                  <p className="text-xs text-gray-500">{entry.project}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant={entry.billable ? 'success' : 'default'}>{entry.billable ? 'Billable' : 'Non-billable'}</Badge>
                <span className="text-sm font-medium w-16 text-right">{entry.hours}h</span>
                {entry.billable && <span className="text-sm text-gray-500 w-24 text-right">AED {(entry.hours * entry.rate).toFixed(0)}</span>}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
