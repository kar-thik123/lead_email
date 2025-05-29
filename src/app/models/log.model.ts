export interface Log {
  id: string;
  user_id: string;
  username: string;
  action: string;
  entity: string;
  entity_id: string;
  details: string;
  ip_address?: string;
  created_at: Date;
}

export interface LogCreation {
  action: string;
  entity: string;
  entity_id?: string;
  details: string;
}

export interface LogFilterOptions {
  user_id?: string;
  action?: string;
  entity?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface LogStats {
  totalActions: number;
  actionsPerUser: { [username: string]: number };
  actionsPerEntity: { [entity: string]: number };
  actionsPerDay: { [date: string]: number };
}