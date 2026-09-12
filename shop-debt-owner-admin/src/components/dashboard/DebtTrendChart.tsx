import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { formatMoney } from '../../utils/formatters';

interface DebtTrendChartProps {
  data: {
    period: string;
    newDebtAmount: number;
    paidAmount: number;
    entriesCount: number;
  }[];
}

export const DebtTrendChart: React.FC<DebtTrendChartProps> = ({ data }) => {
  const [viewType, setViewType] = useState<'amount' | 'count'>('amount');

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-100">Qarzlar Dinamikasi</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            So‘nggi 7 kun davomida yangi kiritilgan va to‘langan qarzlar hajmi
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs">
          <button
            onClick={() => setViewType('amount')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              viewType === 'amount'
                ? 'bg-slate-800 text-violet-300 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Summa bo‘yicha (so‘m)
          </button>
          <button
            onClick={() => setViewType('count')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              viewType === 'count'
                ? 'bg-slate-800 text-violet-300 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Qarzlar soni
          </button>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="period" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              tickFormatter={(v) => (viewType === 'amount' ? `${v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}k`}` : v)}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="p-3 bg-slate-950 border border-slate-700 rounded-xl shadow-xl text-xs space-y-1.5">
                      <div className="font-semibold text-slate-300 pb-1 border-b border-slate-800">{label}</div>
                      {viewType === 'amount' ? (
                        <>
                          <div className="flex items-center gap-2 text-amber-400">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            <span>Yangi qarz: <strong>{formatMoney(payload[0]?.value as number)}</strong></span>
                          </div>
                          <div className="flex items-center gap-2 text-violet-300">
                            <span className="w-2 h-2 rounded-full bg-violet-400" />
                            <span>To‘langan: <strong>{formatMoney(payload[1]?.value as number)}</strong></span>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-200">
                          <span>Qarzlar soni: <strong>{payload[0]?.payload?.entriesCount || 0} ta</strong></span>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            {viewType === 'amount' ? (
              <>
                <Area
                  type="monotone"
                  dataKey="newDebtAmount"
                  name="Yangi qarz"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorNew)"
                />
                <Area
                  type="monotone"
                  dataKey="paidAmount"
                  name="To‘langan qarz"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPaid)"
                />
              </>
            ) : (
              <Area
                type="monotone"
                dataKey="entriesCount"
                name="Qarzlar soni"
                stroke="#38bdf8"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorNew)"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t border-slate-800/60 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span>Yangi kiritilgan qarz</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-violet-400" />
          <span>To‘langan (qaytarilgan) qarz</span>
        </div>
      </div>
    </div>
  );
};
