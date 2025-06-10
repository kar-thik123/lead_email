export interface Task {
    id?: number;
    dateFrom: Date | null;
    dateTo: Date | null;
    description: string | null;
    status: 'Pending' | 'In Progress' | 'Completed' | null;
    remark: string | null;
} 