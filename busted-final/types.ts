export type ViewState = 'home' | 'login' | 'signup' | 'dashboard' | 'report-issue' | 'history' | 'upload-evidence' | 'complaint-preview';

export interface User {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  isGuest: boolean;
}

export interface NewsItem {
  id: number;
  text: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ActivityItem {
  id: number | string;
  type?: 'Traffic' | 'Civic';
  title: string;
  status: 'Pending' | 'Verified' | 'Resolved' | 'Rejected';
  time: string;
  ticketId?: string;
}