import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  Download, 
  Calendar, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  FileCheck,
  ShieldCheck,
  ArrowDownToLine
} from 'lucide-react';
import { reportService, ReportItem } from '../../services/reportService';

export const ReportsPage: React.FC = () => {
  const [format, setFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadReportsHistory();
  }, []);

  const loadReportsHistory = async () => {
    try {
      setLoadingHistory(true);
      const items = await reportService.listReports();
      setReports(items);
    } catch (err) {
      console.error('Failed to load reports history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleApplyPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const handleGenerateReport = async () => {
    try {
      setGenerating(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const generated = await reportService.generateReport({
        format,
        startDate,
        endDate
      });

      setSuccessMsg(`Successfully generated ${format.toUpperCase()} report: ${generated.fileName}`);
      // Refresh history
      await loadReportsHistory();

      // Trigger instant download
      await reportService.downloadReportFile(generated.id, generated.fileName);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to generate report.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (item: ReportItem) => {
    try {
      setDownloadingId(item.id);
      await reportService.downloadReportFile(item.id, item.fileName);
    } catch (err) {
      setErrorMsg('Failed to download report file.');
    } finally {
      setDownloadingId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-8 w-full pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-forest-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-7 h-7 text-forest-700" />
            <h1 className="text-2xl font-bold text-charcoal">Reports & Data Export Center</h1>
          </div>
          <p className="text-sm text-muted-grey mt-1">
            Export comprehensive dietary logs, statistical summaries, and target attainment in PDF, Excel, and CSV formats.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-terracotta/10 border border-terracotta/20 rounded-xl flex items-center gap-3 text-terracotta text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-forest-50 border border-forest-200 rounded-xl flex items-center gap-3 text-forest-800 text-sm">
          <CheckCircle2 className="w-5 h-5 text-forest-700 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid: Generator Card on Left, Format Options on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Generator Configuration (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-forest-100 p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-charcoal mb-1 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-forest-700" />
              1. Select Reporting Window
            </h2>
            <p className="text-xs text-muted-grey">
              Choose the date range for aggregated nutrient intake and target comparisons.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-grey mr-1">Presets:</span>
            <button
              type="button"
              onClick={() => handleApplyPreset(7)}
              className="px-2.5 py-1 text-xs font-medium text-forest-800 bg-forest-50 hover:bg-forest-100 rounded-lg transition-colors border border-forest-100"
            >
              Past 7 Days
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(14)}
              className="px-2.5 py-1 text-xs font-medium text-forest-800 bg-forest-50 hover:bg-forest-100 rounded-lg transition-colors border border-forest-100"
            >
              Past 14 Days
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(30)}
              className="px-2.5 py-1 text-xs font-medium text-forest-800 bg-forest-50 hover:bg-forest-100 rounded-lg transition-colors border border-forest-100"
            >
              Past 30 Days
            </button>
          </div>

          {/* Date Range Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-ivory-warm border border-forest-200 rounded-xl text-xs font-mono text-charcoal focus:outline-none focus:ring-1 focus:ring-forest-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-ivory-warm border border-forest-200 rounded-xl text-xs font-mono text-charcoal focus:outline-none focus:ring-1 focus:ring-forest-600"
              />
            </div>
          </div>

          {/* Format Selector */}
          <div className="pt-2">
            <h2 className="text-base font-bold text-charcoal mb-1 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-forest-700" />
              2. Choose Export Format
            </h2>
            <p className="text-xs text-muted-grey mb-3">
              Each format is tailored for different clinical, tracking, or analytical workflows.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* PDF Format Card */}
              <div
                onClick={() => setFormat('pdf')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  format === 'pdf' 
                    ? 'border-forest-700 bg-forest-50/70 shadow-sm' 
                    : 'border-forest-100 hover:border-forest-200 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-forest-700 text-white">
                      PDF
                    </span>
                    <FileText className="w-4 h-4 text-forest-700" />
                  </div>
                  <h3 className="font-bold text-xs text-charcoal">ReportLab PDF</h3>
                  <p className="text-[11px] text-muted-grey mt-1 leading-snug">
                    Print-ready editorial layout with attainment tables and disclaimers.
                  </p>
                </div>
              </div>

              {/* Excel Format Card */}
              <div
                onClick={() => setFormat('excel')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  format === 'excel' 
                    ? 'border-forest-700 bg-forest-50/70 shadow-sm' 
                    : 'border-forest-100 hover:border-forest-200 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-sage-700 text-white">
                      XLSX
                    </span>
                    <FileSpreadsheet className="w-4 h-4 text-forest-700" />
                  </div>
                  <h3 className="font-bold text-xs text-charcoal">Excel Workbook</h3>
                  <p className="text-[11px] text-muted-grey mt-1 leading-snug">
                    3 formatted sheets: Summary, Timeline, and Macronutrient Split.
                  </p>
                </div>
              </div>

              {/* CSV Format Card */}
              <div
                onClick={() => setFormat('csv')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  format === 'csv' 
                    ? 'border-forest-700 bg-forest-50/70 shadow-sm' 
                    : 'border-forest-100 hover:border-forest-200 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-charcoal text-white">
                      CSV
                    </span>
                    <FileText className="w-4 h-4 text-muted-grey" />
                  </div>
                  <h3 className="font-bold text-xs text-charcoal">Raw Data (CSV)</h3>
                  <p className="text-[11px] text-muted-grey mt-1 leading-snug">
                    Flat tabular records ideal for statistical scripting and analysis.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              onClick={handleGenerateReport}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 py-3 bg-forest-700 hover:bg-forest-800 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating {format.toUpperCase()} Report...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Generate & Download {format.toUpperCase()} Report
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Explanatory & Features (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-2xl border border-forest-100 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-charcoal flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-forest-700" />
              Standard Report Features
            </h3>
            <ul className="space-y-2.5 text-xs text-charcoal/80">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-forest-700 mt-1.5 flex-shrink-0" />
                <span><b>Target Attainment:</b> Compares recorded daily intake against your active ICMR-NIN / WHO dietary reference benchmarks.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-forest-700 mt-1.5 flex-shrink-0" />
                <span><b>Macronutrient Distribution:</b> Analyzes caloric ratios using the standard 4 / 4 / 9 formula.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-forest-700 mt-1.5 flex-shrink-0" />
                <span><b>Quality & Completeness:</b> Excludes unlogged days from daily averages to preserve statistical integrity.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-forest-700 mt-1.5 flex-shrink-0" />
                <span><b>Legal Disclaimer:</b> Compliant with medical transparency requirements.</span>
              </li>
            </ul>
          </div>

          <div className="p-4 bg-ivory-warm rounded-2xl border border-forest-100 text-xs text-muted-grey leading-relaxed">
            <p className="font-semibold text-charcoal mb-1">Dietary Context Notice:</p>
            Reports generated through NutriTrack are designed for personal awareness and dietary discussion. They do not constitute diagnostic medical evaluations.
          </div>
        </div>
      </div>

      {/* Generated Reports History Table */}
      <div className="bg-white rounded-2xl border border-forest-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-forest-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-charcoal">Report Download History</h3>
            <p className="text-xs text-muted-grey mt-0.5">
              Access and re-download previously generated reports for your records.
            </p>
          </div>
          <button
            onClick={loadReportsHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-forest-800 bg-forest-50 hover:bg-forest-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {loadingHistory ? (
          <div className="p-10 flex flex-col items-center justify-center text-forest-700 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mb-2" />
            <span>Loading report archives...</span>
          </div>
        ) : reports.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-forest-50/70 border-b border-forest-100 text-muted-grey font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3.5 pl-5">Format</th>
                  <th className="p-3.5">File Name</th>
                  <th className="p-3.5">Window</th>
                  <th className="p-3.5">File Size</th>
                  <th className="p-3.5">Generated At</th>
                  <th className="p-3.5 pr-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest-50">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-ivory-warm/40 transition-colors">
                    <td className="p-3.5 pl-5 font-bold">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        r.format === 'pdf' 
                          ? 'bg-forest-700 text-white' 
                          : r.format === 'excel' 
                          ? 'bg-sage-700 text-white' 
                          : 'bg-charcoal text-white'
                      }`}>
                        {r.format}
                      </span>
                    </td>
                    <td className="p-3.5 font-medium text-charcoal max-w-xs truncate">
                      {r.fileName}
                    </td>
                    <td className="p-3.5 font-mono text-muted-grey">
                      {r.startDate} to {r.endDate}
                    </td>
                    <td className="p-3.5 font-mono text-muted-grey">
                      {formatFileSize(r.fileSize)}
                    </td>
                    <td className="p-3.5 text-muted-grey text-[11px]">
                      {r.generatedAt.slice(0, 16).replace('T', ' ')}
                    </td>
                    <td className="p-3.5 pr-5 text-right">
                      <button
                        onClick={() => handleDownload(r)}
                        disabled={downloadingId === r.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-forest-50 hover:bg-forest-100 text-forest-800 font-semibold rounded-lg text-xs transition-colors"
                      >
                        {downloadingId === r.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ArrowDownToLine className="w-3.5 h-3.5" />
                        )}
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-muted-grey text-xs space-y-3">
            <FileSpreadsheet className="w-8 h-8 text-forest-300 mx-auto" />
            <p className="max-w-md mx-auto">
              No reports generated yet. Configure a date window above, or click below to generate your first 7-day report immediately.
            </p>
            <button
              type="button"
              onClick={() => {
                handleApplyPreset(7);
                setFormat('pdf');
                handleGenerateReport();
              }}
              disabled={generating}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-forest-50 hover:bg-forest-100 text-forest-800 font-semibold rounded-xl text-xs transition-colors border border-forest-200/60 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Generate Sample 7-Day PDF Report</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
