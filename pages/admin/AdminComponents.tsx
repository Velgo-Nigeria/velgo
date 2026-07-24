import React from 'react';

export interface SparkChartProps {
    data: { label: string; count: number }[];
    color: string;
    gradientId: string;
    type?: 'line' | 'bar';
}

export const SparkChart: React.FC<SparkChartProps> = ({ data, color, gradientId, type = 'line' }) => {
    if (data.length === 0) return <div className="h-40 flex items-center justify-center text-xs text-gray-400">No data</div>;

    const maxVal = Math.max(...data.map(d => d.count), 5);
    const height = 180;
    const width = 500;
    const padding = { top: 20, right: 20, bottom: 25, left: 35 };
    
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    if (type === 'bar') {
        const barGap = 16;
        const totalGaps = data.length - 1;
        const barWidth = totalGaps > 0 ? (chartWidth - (totalGaps * barGap)) / data.length : chartWidth;

        const bars = data.map((d, i) => {
            const barHeight = (d.count / maxVal) * chartHeight;
            const x = padding.left + i * (barWidth + barGap);
            const y = padding.top + chartHeight - barHeight;
            return { x, y, barHeight, label: d.label, count: d.count };
        });

        return (
            <div className="w-full relative group">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible font-sans">
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.3} />
                        </linearGradient>
                    </defs>
                    
                    {/* Horizontal Grid Lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                        const y = padding.top + chartHeight * ratio;
                        return (
                            <line 
                                key={idx}
                                x1={padding.left - 10} 
                                y1={y} 
                                x2={width - padding.right} 
                                y2={y} 
                                stroke="currentColor" 
                                className="text-gray-100 dark:text-slate-800"
                                strokeDasharray="4 4"
                                strokeWidth="1"
                            />
                        );
                    })}

                    {/* Bars */}
                    {bars.map((bar, i) => (
                        <g key={i}>
                            <rect
                                x={bar.x}
                                y={bar.y}
                                width={barWidth}
                                height={bar.barHeight}
                                rx="4"
                                fill={`url(#${gradientId})`}
                                className="transition-all duration-500 origin-bottom hover:opacity-80"
                            />
                            {/* Value Label */}
                            <text
                                x={bar.x + barWidth / 2}
                                y={bar.y - 8}
                                textAnchor="middle"
                                className="text-[10px] font-bold fill-gray-500 dark:fill-gray-400"
                            >
                                {bar.count}
                            </text>
                            {/* X Axis Label */}
                            <text
                                x={bar.x + barWidth / 2}
                                y={height - 5}
                                textAnchor="middle"
                                className="text-[9px] font-black uppercase tracking-wider fill-gray-400 dark:fill-gray-500"
                            >
                                {bar.label}
                            </text>
                        </g>
                    ))}
                </svg>
            </div>
        );
    }

    // Line chart
    const points = data.map((d, i) => {
        const x = padding.left + (i * (chartWidth / Math.max(data.length - 1, 1)));
        const y = padding.top + chartHeight - ((d.count / maxVal) * chartHeight);
        return { x, y, label: d.label, count: d.count };
    });

    const pathData = points.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');
    
    let areaPathData = pathData;
    if (points.length > 0) {
        areaPathData += ` L ${points[points.length - 1].x},${height - padding.bottom} L ${points[0].x},${height - padding.bottom} Z`;
    }

    return (
        <div className="w-full relative group">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible font-sans">
                <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.0} />
                    </linearGradient>
                </defs>
                
                {/* Horizontal Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const y = padding.top + chartHeight * ratio;
                    return (
                        <line 
                            key={idx}
                            x1={padding.left - 10} 
                            y1={y} 
                            x2={width - padding.right} 
                            y2={y} 
                            stroke="currentColor" 
                            className="text-gray-100 dark:text-slate-800"
                            strokeDasharray="4 4"
                            strokeWidth="1"
                        />
                    );
                })}

                {/* Y-axis Labels (Max & Min) */}
                <text x={10} y={padding.top + 4} className="text-[9px] font-black fill-gray-400 dark:fill-gray-500">{maxVal}</text>
                <text x={10} y={height - padding.bottom} className="text-[9px] font-black fill-gray-400 dark:fill-gray-500">0</text>

                <path
                    d={areaPathData}
                    fill={`url(#${gradientId})`}
                    className="transition-all duration-500"
                />
                
                <path
                    d={pathData}
                    fill="none"
                    stroke={color}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="drop-shadow-sm transition-all duration-500"
                />

                {points.map((p, i) => (
                    <g key={i}>
                        <circle
                            cx={p.x}
                            cy={p.y}
                            r="4"
                            fill="white"
                            stroke={color}
                            strokeWidth="2"
                            className="transition-all duration-300 hover:r-6 hover:stroke-[3px]"
                        />
                        <text
                            x={p.x}
                            y={height - 5}
                            textAnchor="middle"
                            className="text-[9px] font-black uppercase tracking-wider fill-gray-400 dark:fill-gray-500"
                        >
                            {p.label}
                        </text>
                        {/* Hover Tooltip - CSS controlled visibility is complex in raw SVG, but simple text works for base display */}
                        <text
                            x={p.x}
                            y={p.y - 12}
                            textAnchor="middle"
                            className="text-[10px] font-bold fill-gray-600 dark:fill-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            {p.count}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
};

export const SafetyReportRelationsCard: React.FC<{ report: any }> = ({ report }) => {
    return (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Linked Context</h4>
            {report.booking_id ? (
                <div className="space-y-1 mb-3 bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-100 dark:border-slate-700">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Related Booking</p>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">ID: {report.booking_id}</p>
                </div>
            ) : null}
            {report.task_id ? (
                <div className="space-y-1 bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-100 dark:border-slate-700">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Related Task</p>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">ID: {report.task_id}</p>
                </div>
            ) : null}
            {!report.booking_id && !report.task_id && (
                 <p className="text-xs text-gray-500 italic">No associated tasks or bookings linked.</p>
            )}
        </div>
    );
};
