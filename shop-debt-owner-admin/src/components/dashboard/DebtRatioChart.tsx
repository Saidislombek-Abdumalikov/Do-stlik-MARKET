import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatMoney } from '../../utils/formatters';

interface DebtRatioChartProps {
  customerDebt: number;
  supplierDebt: number;
}

export const DebtRatioChart: React.FC<DebtRatioChartProps> = ({
  customerDebt,
  supplierDebt,
}) => {
  const total = customerDebt + supplierDebt;
  const data = [
    { name: 'Mijoz qarzi', value: customerDebt, color: '#7c3aed' }, // Royal Violet
    { name: 'Yetkazib beruvchi qarzi', value: supplierDebt, color: '#c084fc' }, // Soft Purple
  ];

  const customerPercent = total > 0 ? Math.round((customerDebt / total) * 100) : 50;
  const supplierPercent = total > 0 ? 100 - customerPercent : 50;

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
      <div>
        <h3 className="text-base font-bold text-white">Qarzlar Tarkibi</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Mijoz qarzlari va Yetkazib beruvchi qarzlari nisbati
        </p>
      </div>

      <div className="relative h-48 my-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={75}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const p = payload[0].payload;
                  return (
                    <div className="p-2.5 bg-slate-950 border border-slate-700 rounded-xl shadow-xl text-xs space-y-1">
                      <div className="font-semibold text-slate-200">{p.name}</div>
                      <div className="text-white font-bold">{formatMoney(p.value)}</div>
                      <div className="text-slate-400">
                        {total > 0 ? `${Math.round((p.value / total) * 100)}%` : '0%'}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] uppercase font-semibold text-slate-500">Jami Ochiq</span>
          <span className="text-xs font-bold text-slate-200 mt-0.5">
            {formatMoney(total)}
          </span>
        </div>
      </div>

      <div className="space-y-3 pt-3 border-t border-slate-800/80 text-xs">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-md bg-indigo-500" />
            <span className="text-slate-300 font-medium">Mijoz qarzi</span>
          </div>
          <div className="text-right">
            <div className="font-bold text-slate-100">{formatMoney(customerDebt)}</div>
            <div className="text-[10px] text-slate-400">{customerPercent}%</div>
          </div>
        </div>

        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-md bg-purple-500" />
            <span className="text-slate-300 font-medium">Yetkazib beruvchi qarzi</span>
          </div>
          <div className="text-right">
            <div className="font-bold text-slate-100">{formatMoney(supplierDebt)}</div>
            <div className="text-[10px] text-slate-400">{supplierPercent}%</div>
          </div>
        </div>
      </div>
    </div>
  );
};
