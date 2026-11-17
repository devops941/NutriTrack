import { apiClient } from './apiClient';

export interface ReportItem {
  id: string;
  userId: string;
  format: 'pdf' | 'excel' | 'csv';
  fileName: string;
  fileSize: number;
  downloadUrl: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  status: string;
}

export const reportService = {
  async generateReport(data: {
    format: 'pdf' | 'excel' | 'csv';
    startDate: string;
    endDate: string;
    title?: string;
  }): Promise<ReportItem> {
    const res = await apiClient.post('/reports/generate', data);
    return res.data?.data;
  },

  async listReports(): Promise<ReportItem[]> {
    const res = await apiClient.get('/reports');
    return res.data?.data || [];
  },

  async downloadReportFile(id: string, fileName: string): Promise<void> {
    const response = await apiClient.get(`/reports/${id}/download`, {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};
