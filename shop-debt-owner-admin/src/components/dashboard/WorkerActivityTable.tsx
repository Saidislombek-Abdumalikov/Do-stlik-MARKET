import React from 'react';
import { formatMoney, formatDateTime } from '../../utils/formatters';
import { Users, ChevronRight } from 'lucide-react';

interface WorkerActivity {
  workerId: string;
  workerName: string;
  entriesCreated: number;
  totalAmountRecorded: number;
  openCount: number;
  paidCount: number;
  lastActiveAt?: string | null;
}

interface WorkerActivityTableProps {
  activities: WorkerActivity[];
  onSelectWorker?: (workerId: string) => void;
}

export const WorkerActivityTable: React.FC<WorkerActivityTableProps> = ({
  activities,
  onSelectWorker,
}) => {
  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Ishchilar Faolligi</h3>
            <p className="text-xs text-slate-400">
              Qarzlar kiritilishi va ularning qaytarilish monitoringi
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-3">Ishchi</th>
              <th className="py-3 px-3">Kiritilgan qarzlar</th>
              <th className="py-3 px-3">Jami summa</th>
              <th className="py-3 px-3">Ochiq</th>
              <th className="py-3 px-3">To‘langan</th>
              <th className="py-3 px-3">Oxirgi harakat</th>
              <th className="py-3 px-3 text-right">Amal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {activities.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-500">
                  Hozircha ishchilar faoliyati mavjud emas
                </td>
              </tr>
            ) : (
              activities.map((w) => (
                <tr
                  key={w.workerId}
                  className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                  onClick={() => onSelectWorker && onSelectWorker(w.workerId)}
                >
                  <td className="py-3.5 px-3 font-semibold text-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-[10px]">
                        {w.workerName.charAt(0)}
                      </div>
                      <span>{w.workerName}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-slate-300 font-medium">
                    {w.entriesCreated} ta
                  </td>
                  <td className="py-3.5 px-3 font-bold text-white">
                    {formatMoney(w.totalAmountRecorded)}
                  </td>
                  <td className="py-3.5 px-3 text-amber-400 font-medium">
                    {w.openCount} ta
                  </td>
                  <td className="py-3.5 px-3 text-violet-400 font-medium">
                    {w.paidCount} ta
                  </td>
                  <td className="py-3.5 px-3 text-slate-400">
                    {w.lastActiveAt ? formatDateTime(w.lastActiveAt) : 'Faoliyat yo‘q'}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-slate-400 group-hover:text-violet-400 font-medium"
                    >
                      <span>Ko‘rish</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
