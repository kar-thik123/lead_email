export interface Lead {
  [key: string]: any;
  id: string;
  source: string;
  first_name: string;
  last_name?: string;
  designation?: string;
  phone_no_1: string;
  phone_no_2?: string;
  email_id_1: string;
  email_id_2?: string;
  email_id_3?: string;
  website?: string;
  address?: string;
  city?: string;
  country?: string;
  status?: string;
  remarks?: string;
  follow_up?: string;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  expanded?: boolean;
}

export interface LeadFilterOptions {
  search?: string;
  source?: string;
  status?: string;
  country?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface LeadStats {
  total: number;
  new: number;
  followed_up: number;
  converted: number;
  bySource: { [key: string]: number };
  byStatus: { [key: string]: number };
  byCountry: { [key: string]: number };
  conversionHistory: {
    month: string;
    rate: number;
  }[];
  weeklyActivity: {
    day: string;
    newLeads: number;
    followUps: number;
  }[];
}

export interface NewLead extends Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'expanded'> {}