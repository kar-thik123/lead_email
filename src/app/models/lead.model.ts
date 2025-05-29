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
  [key: string]: string;
}

export interface LeadStats {
  total: number;
  newLeads: number;
  followedUp: number;
  converted: number;
  bySource: { [key: string]: number };
  byStatus: { [key: string]: number };
  byCountry: { [key: string]: number };
}

export interface NewLead extends Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'expanded'> {}