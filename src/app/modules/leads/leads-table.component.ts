import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeadService } from '../../services/lead.service';
import { LogService } from '../../services/log.service';
import { Lead, LeadFilterOptions, NewLead } from '../../models/lead.model';
import { AlertComponent } from '../shared/alert/alert.component';
import { LayoutComponent } from '../shared/layout/layout.component';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

interface ExcelRow {
  Source?: string;
  'First Name'?: string;
  'Last Name'?: string;
  Designation?: string;
  'Phone No'?: string;
  Email?: string;
  Website?: string;
  Status?: string;
  Remarks?: string;
  'Follow Up'?: string;
}

@Component({
  selector: 'app-leads-table',
  standalone: true,
  imports: [CommonModule, FormsModule, AlertComponent, LayoutComponent],
  templateUrl: './leads-table.component.html',
  styleUrls: ['./leads-table.component.css']
})
export class LeadsTableComponent implements OnInit {
  leads: Lead[] = [];
  filteredLeads: Lead[] = [];
  paginatedRows: Lead[] = [];
  selectedRows = new Set<string>();
  totalRows = 0;  

  showAddContactForm = false;
  newContact: NewLead = this.getEmptyNewContact();

  isLoading = false;
  isEditMode = false;
  isDeleteMode = false;
  showTable = true;

  showAlert = false;
  alertMessage = '';
  alertType: 'success' | 'danger' | 'info' | 'warning' = 'info';
  errorMessage: string | null = null;

  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;

  filterValues: Record<string, string> = {};
  showAllFilters = false;
  activeFilterColumn: string | null = null;
  duplicateCount = 0;

  columns = [
    { key: 'source', label: 'Source', icon: 'bi bi-database', editable: true, type: 'text' },
    { key: 'first_name', label: 'First Name', icon: 'bi bi-person', editable: true, type: 'text' },
    { key: 'designation', label: 'Designation', icon: 'bi bi-briefcase', editable: true, type: 'text' },
    { key: 'phone_no_1', label: 'Phone No', icon: 'bi bi-telephone', editable: true, type: 'text' },
    { key: 'email_id_1', label: 'Email', icon: 'bi bi-envelope', editable: true, type: 'text' },
    { key: 'website', label: 'Website', icon: 'bi bi-globe', editable: true, type: 'link' },
    { key: 'status', label: 'Status', icon: 'bi bi-info-circle', editable: true, type: 'text' },
    { key: 'remarks', label: 'Remarks', icon: 'bi bi-chat-left-text', editable: true, type: 'text' },
    { key: 'follow_up', label: 'Follow Up', icon: 'bi bi-calendar-check', editable: true, type: 'text' },
    { key: 'created_at', label: 'Created At', icon: 'bi bi-calendar', editable: false, type: 'text' }
  ];

  editedFields: Map<string, Set<string>> = new Map();

  private loadingStates: {
    addContact: boolean;
    importData: boolean;
    deleteSelected: boolean;
    saveChanges: boolean;
  } = {
    addContact: false,
    importData: false,
    deleteSelected: false,
    saveChanges: false
  };

  constructor(
    private leadService: LeadService,
    private logService: LogService
  ) {}

  ngOnInit(): void {
    this.loadRowsFromDb();
    this.checkForDuplicates();
  }

  loadRowsFromDb(): void {
    this.isLoading = true;

    this.leadService.getLeads().subscribe({
      next: (leads) => {
        this.leads = leads;
        this.filteredLeads = [...leads];
        this.totalRows = leads.length;
        this.totalPages = Math.ceil(this.totalRows / this.itemsPerPage);
        this.goToPage(1);
      },
      error: (error) => {
        console.error('Error loading leads:', error);
        this.showErrorMessage('Error loading leads');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  checkForDuplicates(): void {
    this.leadService.findDuplicateLeads().subscribe({
      next: (duplicateGroups) => {
        const groups = Array.isArray(duplicateGroups) ? duplicateGroups : [duplicateGroups];
        this.duplicateCount = groups.reduce((total, group) => total + (Array.isArray(group) ? group.length - 1 : 0), 0);
      },
      error: (error) => {
        console.error('Error finding duplicates:', error);
        this.showErrorMessage('Error checking for duplicates');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  removeDuplicates(): void {
    this.showSuccessMessage(`${this.duplicateCount} duplicate leads have been merged/removed.`);
    this.duplicateCount = 0;
    this.loadRowsFromDb();
  }

  toggleRow(row: Lead): void {
    row.expanded = !row.expanded;
  }

  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
    if (!this.isEditMode && this.editedFields.size > 0) {
      this.saveAllChanges();
    }
  }

  toggleDeleteMode(): void {
    this.isDeleteMode = !this.isDeleteMode;
    if (!this.isDeleteMode) {
      this.selectedRows.clear();
    }
  }

  toggleFilters(): void {
    this.showAllFilters = !this.showAllFilters;
    if (!this.showAllFilters) {
      this.activeFilterColumn = null;
    }
  }

  toggleColumnFilter(columnKey: string): void {
    this.activeFilterColumn = this.activeFilterColumn === columnKey ? null : columnKey;
  }

  toggleAddContactForm(): void {
    this.showAddContactForm = !this.showAddContactForm;
    if (this.showAddContactForm) {
      this.newContact = this.getEmptyNewContact();
    }
  }

  closeModal(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.classList.contains('modal-overlay')) {
      this.showAddContactForm = false;
    }
  }

  getEmptyNewContact(): NewLead {
    return {
      source: '', first_name: '', last_name: '', designation: '', phone_no_1: '',
      phone_no_2: '', email_id_1: '', email_id_2: '', email_id_3: '',
      website: '', address: '', city: '', country: '', status: 'New',
      remarks: '', follow_up: ''
    };
  }

  addNewContact(): void {
    this.loadingStates.addContact = true;

    this.leadService.addLead(this.newContact).subscribe({
      next: (lead) => {
        this.leads.unshift(lead);
        this.totalRows = this.leads.length;
        this.applyFilters();
        this.loadingStates.addContact = false;
        this.showAddContactForm = false;
        this.showSuccessMessage('Contact added successfully.');
        this.loadRowsFromDb();
      },
      error: (error) => {
        this.showErrorMessage(`Failed to add contact: ${error.message}`);
        this.loadingStates.addContact = false;
      }
    });
  }

  onFieldEdit(row: Lead, fieldName: string, newValue: any): void {
    if (!this.editedFields.has(row.id)) {
      this.editedFields.set(row.id, new Set<string>());
    }
    this.editedFields.get(row.id)?.add(fieldName);
    row[fieldName as keyof Lead] = newValue;
  }

  saveAllChanges(): void {
    if (this.editedFields.size === 0) {
      this.showInfoMessage('No changes to save.');
      return;
    }

    this.loadingStates.saveChanges = true;
    let savedCount = 0;
    const totalToSave = this.editedFields.size;

    for (const leadId of this.editedFields.keys()) {
      const lead = this.leads.find(l => l.id === leadId);
      if (lead) {
        this.leadService.updateLead(lead).subscribe({
          next: () => {
            savedCount++;
            if (savedCount === totalToSave) {
              this.editedFields.clear();
              this.loadingStates.saveChanges = false;
              this.showSuccessMessage(`Successfully saved changes to ${totalToSave} leads.`);
              this.loadRowsFromDb();
            }
          },
          error: (error) => {
            this.showErrorMessage(`Error saving changes to lead ${leadId}: ${error.message}`);
            this.loadingStates.saveChanges = false;
          }
        });
      }
    }
  }

  applyFilters(): void {
    let filtered = [...this.leads];
    for (const [key, value] of Object.entries(this.filterValues)) {
      if (value && value.trim() !== '') {
        filtered = filtered.filter(lead => {
          const leadValue = lead[key as keyof Lead];
          return leadValue && String(leadValue).toLowerCase().includes(value.toLowerCase());
        });
      }
    }
    this.filteredLeads = filtered;
    this.totalPages = Math.ceil(this.filteredLeads.length / this.itemsPerPage);
    this.goToPage(1);
  }

  goToPage(page: number): void {
    page = Math.max(1, Math.min(page, this.totalPages));
    this.currentPage = page;
    const start = (page - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedRows = this.filteredLeads.slice(start, end);
  }

  toggleRowSelection(event: MouseEvent, row: Lead): void {
    event.stopPropagation();
    if (this.selectedRows.has(row.id)) {
      this.selectedRows.delete(row.id);
    } else {
      this.selectedRows.add(row.id);
    }
  }

  toggleAllRows(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.paginatedRows.forEach(row => {
      if (checked) this.selectedRows.add(row.id);
      else this.selectedRows.delete(row.id);
    });
  }

  async deleteSelectedRows(): Promise<void> {
    if (this.selectedRows.size === 0) return;
    // console.log("this is confirmed"+await this.showConfirmation(`test`));
      
    // const confirmed = await this.showConfirmation(
    //   `Are you sure you want to delete ${this.selectedRows.size} leads? This action cannot be undone.`
    // );
    
    console.log("this is deleted selected row");
    // if (!confirmed) return;

    this.loadingStates.deleteSelected = true;
    const ids = Array.from(this.selectedRows);

    // Validate UUID format
    const invalidIds = ids.filter(id => !this.isValidUUID(id));
    if (invalidIds.length > 0) {
      this.showErrorMessage(`Invalid ID format for leads: ${invalidIds.join(', ')}`);
      this.loadingStates.deleteSelected = false;
      return;
    }

    try {
      await this.leadService.deleteMultipleLeads({ ids }).toPromise();
      
      // Update local state
      this.leads = this.leads.filter(lead => !ids.includes(lead.id));
      this.totalRows = this.leads.length;
      this.selectedRows.clear();
      this.isDeleteMode = false;
      this.applyFilters();
      this.loadingStates.deleteSelected = false;
      this.showSuccessMessage(`Successfully deleted ${ids.length} leads.`);
      this.loadRowsFromDb();
    } catch (error: any) {
      console.error('Error deleting leads:', error);
      this.loadingStates.deleteSelected = false;
      this.showErrorMessage(`Error deleting leads: ${error.message || 'Unknown error occurred'}`);
    }
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return uuidRegex.test(uuid);
  }

  importData(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) {
      this.showErrorMessage('No file selected');
      return;
    }

    const validExtensions = ['.xlsx', '.csv'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!validExtensions.includes(fileExtension)) {
      this.showErrorMessage('Please upload a .xlsx or .csv file');
      return;
    }

    this.loadingStates.importData = true;
    this.leadService.importLeads(file).subscribe({
      next: (result) => {
        this.showSuccessMessage(`Successfully imported ${result.count} leads`);
        this.loadRowsFromDb();
        target.value = '';
        this.loadingStates.importData = false;
      },
      error: (error) => {
        this.showErrorMessage(`Error importing leads: ${error.message}`);
        this.loadingStates.importData = false;
      }
    });
  }

  private async showConfirmation(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const confirmDialog = document.createElement('div');
      confirmDialog.className = 'confirm-dialog';
      confirmDialog.innerHTML = `
        <div class="dialog-content" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%)">
          <p>${message}</p>
          <div class="dialog-buttons">
            <button class="btn btn-secondary" (click)="resolve(false)">Cancel</button>
            <button class="btn btn-danger" (click)="resolve(true)">Confirm</button>
          </div>
        </div>
      `;
      document.body.appendChild(confirmDialog);
    });
  }

  // Alert helpers
  private showSuccessMessage(msg: string): void {
    this.alertType = 'success';
    this.alertMessage = msg;
    this.showAlert = true;
  }

  private showErrorMessage(msg: string): void {
    this.alertType = 'danger';
    this.alertMessage = msg;
    this.showAlert = true;
  }

  private showInfoMessage(msg: string): void {
    this.alertType = 'info';
    this.alertMessage = msg;
    this.showAlert = true;
  }

  // Export functionality
  exportData(format: 'csv' | 'excel'): void {
    if (this.filteredLeads.length === 0) {
      this.showInfoMessage('No data to export');
      return;
    }

    const data = this.filteredLeads.map(lead => ({
      Source: lead.source,
      'First Name': lead.first_name,
      'Last Name': lead.last_name,
      Designation: lead.designation,
      'Phone No 1': lead.phone_no_1,
      'Phone No 2': lead.phone_no_2,  // Added
      'Email 1': lead.email_id_1,
      'Email 2': lead.email_id_2,     // Added
      'Email 3': lead.email_id_3,     // Added
      Website: lead.website,
      Address: lead.address,          // Added
      City: lead.city,               // Added
      Country: lead.country,         // Added
      Status: lead.status,
      Remarks: lead.remarks,
      'Follow Up': lead.follow_up,
    }));

    if (format === 'csv') {
      const ws = XLSX.utils.json_to_sheet(data);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, 'leads_export.csv');
      this.showInfoMessage('CSV file exported successfully');
    } else {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Leads');
      XLSX.writeFile(wb, 'leads_export.xlsx');
      this.showInfoMessage('Excel file exported successfully');
    }
  }
}
