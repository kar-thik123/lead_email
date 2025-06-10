import { Component, OnInit, HostListener } from '@angular/core';
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

interface ColumnFilter {
  searchText: string;
  exactMatch: boolean;
  selectedValues: { [key: string]: boolean };
  sortDirection: 'asc' | 'desc' | null;
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
  itemsPerPage = 20;
  totalPages = 1;

  filterValues: Record<string, string> = {};
  showAllFilters = false;
  activeFilterColumn: string | null = null;
  duplicateCount = 0;

  statusOptions = [
    { value: 'New', label: 'New' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Closed', label: 'Closed' }
  ];

  columns = [
    { key: 'source', label: 'Source', icon: 'bi bi-database', editable: true, type: 'text' },
    { key: 'first_name', label: 'First Name', icon: 'bi bi-person', editable: true, type: 'text' },
    { key: 'designation', label: 'Designation', icon: 'bi bi-briefcase', editable: true, type: 'text' },
    { key: 'phone_no_1', label: 'Phone No', icon: 'bi bi-telephone', editable: true, type: 'text' },
    { key: 'email_id_1', label: 'Email', icon: 'bi bi-envelope', editable: true, type: 'text' },
    { key: 'website', label: 'Website', icon: 'bi bi-globe', editable: true, type: 'link' },
    { key: 'status', label: 'Status', icon: 'bi bi-info-circle', editable: true, type: 'select' },
    { key: 'remarks', label: 'Remarks', icon: 'bi bi-chat-left-text', editable: true, type: 'text' },
    { key: 'follow_up', label: 'Follow Up', icon: 'bi bi-calendar-check', editable: true, type: 'date' }
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

  // Advanced Filter Properties
  showAdvancedFilters = false;
  sortOptions = {
    field: '',
    direction: 'asc'
  };
  filterCriteria = {
    source: '',
    designation: '',
    city: '',
    country: '',
    status: [] as string[],
    followUpFrom: '',
    followUpTo: '',
    searchText: ''
  };
  sortFields = [
    { value: 'first_name', label: 'First Name' },
    { value: 'last_name', label: 'Last Name' },
    { value: 'follow_up', label: 'Follow-up Date' },
    { value: 'created_at', label: 'Created Date' },
    { value: 'status', label: 'Status' }
  ];
  sortDirections = [
    { value: 'asc', label: 'Ascending' },
    { value: 'desc', label: 'Descending' }
  ];

  // Column Filter Properties
  showColumnFilters = false;
  activeColumnFilter: string | null = null;
  columnFilters: { [key: string]: ColumnFilter } = {};
  columnFilterOptions: { [key: string]: string[] } = {};
  columnSortDirections: { [key: string]: 'asc' | 'desc' | null } = {};
  columnFilterCounts: { [key: string]: number } = {};

  // Add these new properties
  columnFilterTypes = {
    text: ['source', 'first_name', 'last_name', 'designation', 'city', 'country', 'remarks'],
    date: ['follow_up', 'created_at'],
    status: ['status'],
    contact: ['phone_no_1', 'phone_no_2', 'email_id_1', 'email_id_2', 'email_id_3']
  };

  constructor(
    private leadService: LeadService,
    private logService: LogService
  ) {}

  ngOnInit(): void {
    this.loadRowsFromDb();
    this.initializeColumnFilters();
  }

  initializeColumnFilters(): void {
    this.columns.forEach(column => {
      this.columnFilters[column.key] = {
        searchText: '',
        exactMatch: false,
        selectedValues: {},
        sortDirection: null
      };
      this.columnFilterOptions[column.key] = this.getUniqueValues(column.key);
    });
  }

  getUniqueValues(columnKey: string): string[] {
    const values = new Set<string>();
    this.leads.forEach(lead => {
      const value = lead[columnKey as keyof Lead];
      if (value) {
        values.add(String(value));
      }
    });
    return Array.from(values).sort();
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

  // checkForDuplicates(): void {
  //   this.leadService.findDuplicateLeads().subscribe({
  //     next: (duplicateGroups) => {
  //       const groups = Array.isArray(duplicateGroups) ? duplicateGroups : [duplicateGroups];
  //       this.duplicateCount = groups.reduce((total, group) => total + (Array.isArray(group) ? group.length - 1 : 0), 0);
  //     },
  //     error: (error) => {
  //       console.error('Error finding duplicates:', error);
  //       this.showErrorMessage('Error checking for duplicates');
  //     },
  //     complete: () => {
  //       this.isLoading = false;
  //     }
  //   });
  // }

  // removeDuplicates(): void {
  //   if (this.duplicateCount === 0) {
  //     this.showInfoMessage('No duplicates found to remove');
  //     return;
  //   }

  //   this.loadingStates.deleteSelected = true;
    
  //   this.leadService.removeDuplicates().subscribe({
  //     next: (response: { success: boolean; removed: number; message: string }) => {
  //       if (response.success) {
  //         this.showSuccessMessage(`${response.removed} duplicate leads have been removed.`);
  //         this.duplicateCount = 0;
  //         this.loadRowsFromDb();
  //       } else {
  //         this.showErrorMessage(`Failed to remove duplicates: ${response.message}`);
  //       }
  //     },
  //     error: (error: any) => {
  //       console.error('Error removing duplicates:', error);
  //       this.showErrorMessage(`Error removing duplicates from the database: ${error.message || 'Unknown error occurred'}`);
  //     },
  //     complete: () => {
  //       this.loadingStates.deleteSelected = false;
  //     }
  //   });
  // }

  toggleRow(row: Lead): void {
    row.expanded = !row.expanded;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Get the clicked element
    const target = event.target as HTMLElement;
    
    // Check if the click was outside of any active panel/mode
    if (this.isEditMode && !target.closest('.table') && !target.closest('.btn-edit')) {
      this.isEditMode = false;
      if (this.editedFields.size > 0) {
        this.saveAllChanges();
      }
    }
    
    if (this.showAllFilters && !target.closest('.filter-dropdown') && !target.closest('.btn-filter')) {
      this.showAllFilters = false;
      this.activeFilterColumn = null;
    }
    
    if (this.isDeleteMode && !target.closest('.table') && !target.closest('.btn-delete')) {
      this.isDeleteMode = false;
      this.selectedRows.clear();
    }
  }

  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
    if (!this.isEditMode && this.editedFields.size > 0) {
      this.saveAllChanges();
    }
    // Close other modes when opening edit mode
    if (this.isEditMode) {
      this.showAllFilters = false;
      this.isDeleteMode = false;
      this.activeFilterColumn = null;
    }
  }

  toggleDeleteMode(): void {
    this.isDeleteMode = !this.isDeleteMode;
    if (!this.isDeleteMode) {
      this.selectedRows.clear();
    }
    // Close other modes when opening delete mode
    if (this.isDeleteMode) {
      this.isEditMode = false;
      this.showAllFilters = false;
      this.activeFilterColumn = null;
    }
  }

  toggleFilters(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
    if (!this.showAdvancedFilters) {
      this.resetFilters();
    }
    // Close other modes when opening filters
    if (this.showAdvancedFilters) {
      this.isEditMode = false;
      this.isDeleteMode = false;
    }
  }

  resetFilters(): void {
    this.filterCriteria = {
      source: '',
      designation: '',
      city: '',
      country: '',
      status: [],
      followUpFrom: '',
      followUpTo: '',
      searchText: ''
    };
    this.sortOptions = {
      field: '',
      direction: 'asc'
    };
    this.applyFilters();
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

        // Log the add contact action
        this.logService.addLog({
          action: 'create',
          entity: 'lead',
          entity_id: lead.id, // Use the ID of the newly created lead
          details: `Added new lead: ${lead.first_name} ${lead.last_name || ''}`
        }).subscribe();

      },
      error: (error) => {
        this.showErrorMessage(`Failed to add contact: ${error.message}`);
        this.loadingStates.addContact = false;
      }
    });
  }

  onFieldEdit(row: Lead, fieldName: string, newValue: any): void {
    if (!this.editedFields.has(row.id)) {
      this.editedFields.set(row.id, new Set());
    }
    this.editedFields.get(row.id)?.add(fieldName);

    // Handle date fields
    if (fieldName === 'follow_up') {
      if (newValue) {
        const date = new Date(newValue);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        row[fieldName as keyof Lead] = `${day}/${month}/${year}`;
      } else {
        row[fieldName as keyof Lead] = undefined;
      }
    } else {
      row[fieldName as keyof Lead] = newValue;
    }
  }

  // Helper method to format date for display
  formatDate(dateString: string | undefined): string {
    if (!dateString) return '-';
    try {
      // If the date is already in dd/mm/yyyy format, return it
      if (dateString.includes('/')) {
        return dateString;
      }
      // If it's in ISO format, convert it
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      }
      return dateString;
    } catch {
      return dateString;
    }
  }

  // Helper method to convert dd/mm/yyyy to yyyy-mm-dd for date input
  convertToDateInputFormat(dateString: string | undefined): string | undefined {
    if (!dateString) return undefined;
    try {
      const [day, month, year] = dateString.split('/');
      return `${year}-${month}-${day}`;
    } catch {
      return undefined;
    }
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete leads';
      this.showErrorMessage(errorMessage);
      console.error('Error deleting leads:', error);
      this.loadingStates.deleteSelected = false;
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
    
    // First check for duplicates
    this.leadService.checkDuplicates(file).subscribe({
      next: (result) => {
        if (result.totalDuplicates > 0) {
          // Show confirmation dialog
          if (confirm(`${result.totalDuplicates} duplicate leads found. Do you want to skip importing these duplicates?`)) {
            // User chose to skip duplicates
            this.leadService.importLeadsWithOptions(file, true).subscribe({
              next: (importResult) => {
                this.showSuccessMessage(`Successfully imported ${importResult.count} leads`);
                this.loadRowsFromDb();
                target.value = '';
                this.loadingStates.importData = false;
              },
              error: (error) => {
                this.showErrorMessage(`Error importing leads: ${error.message}`);
                this.loadingStates.importData = false;
              }
            });
          } else {
            // User chose to import all including duplicates
            this.leadService.importLeadsWithOptions(file, false).subscribe({
              next: (importResult) => {
                this.showSuccessMessage(`Successfully imported ${importResult.count} leads, and skipped ${importResult.skipped} duplicates`);
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
        } else {
          // No duplicates found, proceed with normal import
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
      },
      error: (error) => {
        this.showErrorMessage(`Error checking for duplicates: ${error.message}`);
        this.loadingStates.importData = false;
      }
    });
  }

  async clearAllLeads() {
    if (!confirm('Are you sure you want to clear ALL leads? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await this.leadService.clearAllLeads().toPromise();
      
      if (response.success) {
        this.showSuccessMessage(`Successfully cleared ${response.deletedCount} leads`);
        this.loadRowsFromDb(); // Refresh the table

        // Log the clear all leads action
        this.logService.addLog({
          action: 'delete_all',
          entity: 'lead',
          entity_id: undefined, // Bulk action, no specific entity ID
          details: `Cleared ${response.deletedCount} leads`
        }).subscribe();

      } else {
        this.showErrorMessage(response.message || 'Failed to clear leads');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to clear leads';
      this.showErrorMessage(errorMessage);
      console.error('Error clearing all leads:', error);
    }
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
      'First_Name': lead.first_name,
      'Last_Name': lead.last_name,
      Designation: lead.designation,
      'Phone_No_1': lead.phone_no_1,
      'Phone_No_2': lead.phone_no_2,  // Added
      'Email_id_1': lead.email_id_1,
      'Email_id_2': lead.email_id_2,     // Added
      'Email_id_3': lead.email_id_3,     // Added
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

      // Log the export action
      this.logService.addLog({
        action: 'export',
        entity: 'lead',
        entity_id: undefined, // Bulk action
        details: `Exported leads as CSV`
      }).subscribe();

    } else {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Leads');
      XLSX.writeFile(wb, 'leads_export.xlsx');
      this.showInfoMessage('Excel file exported successfully');

      // Log the export action
      this.logService.addLog({
        action: 'export',
        entity: 'lead',
        entity_id: undefined, // Bulk action
        details: `Exported leads as Excel`
      }).subscribe();
    }
  }

  handleEmailClick(email: string): void {
    if (email && email.trim()) {
      window.location.href = `mailto:${email.trim()}`;
    }
  }

  handlePhoneClick(phone: string): void {
    if (phone && phone.trim()) {
      window.location.href = `tel:${phone.trim()}`;
    }
  }

  handleWebsiteClick(website: string): void {
    if (website && website.trim()) {
      // Ensure website has http/https prefix
      const url = website.trim().startsWith('http') ? website.trim() : `https://${website.trim()}`;
      window.open(url, '_blank');
    }
  }

  scanForDuplicates(): void {
    this.isLoading = true;
    this.showInfoMessage('Scanning for duplicates... This may take a few moments.');
    
    this.leadService.scanDuplicates().subscribe({
      next: (result) => {
        if (result.totalDuplicates > 0) {
          if (confirm(`Found ${result.totalDuplicates} duplicate leads in ${result.totalGroups} groups. Do you want to delete the duplicates and keep only one entry for each group?`)) {
            this.showInfoMessage('Removing duplicates... This may take a few moments.');
            this.removeDuplicates();
          } else {
            this.isLoading = false;
          }
        } else {
          this.showInfoMessage('No duplicate leads found.');
          this.isLoading = false;
        }
      },
      error: (error) => {
        this.showErrorMessage(error.message || 'Error scanning for duplicates. Please try again.');
        this.isLoading = false;
      }
    });
  }

  private removeDuplicates(): void {
    this.leadService.removeDuplicates().subscribe({
      next: (result) => {
        if (result.success) {
          this.showSuccessMessage(result.message);
          this.loadRowsFromDb();
        } else {
          this.showErrorMessage('Failed to remove duplicates');
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.showErrorMessage(error.message || 'Error removing duplicates. Please try again.');
        this.isLoading = false;
      }
    });
  }

  onStatusChange(row: Lead, newStatus: string): void {
    if (!newStatus) {
      newStatus = 'New'; // Default to 'New' if no status is selected
    }
    this.onFieldEdit(row, 'status', newStatus);
  }

  applyAdvancedFilters(): void {
    let filtered = [...this.leads];

    // Apply text-based filters
    if (this.filterCriteria.source) {
      filtered = filtered.filter(lead => 
        lead.source?.toLowerCase().includes(this.filterCriteria.source.toLowerCase())
      );
    }
    if (this.filterCriteria.designation) {
      filtered = filtered.filter(lead => 
        lead.designation?.toLowerCase().includes(this.filterCriteria.designation.toLowerCase())
      );
    }
    if (this.filterCriteria.city) {
      filtered = filtered.filter(lead => 
        lead.city?.toLowerCase().includes(this.filterCriteria.city.toLowerCase())
      );
    }
    if (this.filterCriteria.country) {
      filtered = filtered.filter(lead => 
        lead.country?.toLowerCase().includes(this.filterCriteria.country.toLowerCase())
      );
    }
    if (this.filterCriteria.status.length > 0) {
      filtered = filtered.filter(lead => 
        this.filterCriteria.status.includes(lead.status || '')
      );
    }

    // Apply date range filter
    if (this.filterCriteria.followUpFrom || this.filterCriteria.followUpTo) {
      filtered = filtered.filter(lead => {
        if (!lead.follow_up) return false;
        const followUpDate = new Date(lead.follow_up);
        const fromDate = this.filterCriteria.followUpFrom ? new Date(this.filterCriteria.followUpFrom) : null;
        const toDate = this.filterCriteria.followUpTo ? new Date(this.filterCriteria.followUpTo) : null;
        
        if (fromDate && followUpDate < fromDate) return false;
        if (toDate && followUpDate > toDate) return false;
        return true;
      });
    }

    // Apply search text filter
    if (this.filterCriteria.searchText) {
      const searchText = this.filterCriteria.searchText.toLowerCase();
      filtered = filtered.filter(lead => 
        lead.phone_no_1?.toLowerCase().includes(searchText) ||
        lead.phone_no_2?.toLowerCase().includes(searchText) ||
        lead.email_id_1?.toLowerCase().includes(searchText) ||
        lead.email_id_2?.toLowerCase().includes(searchText) ||
        lead.email_id_3?.toLowerCase().includes(searchText)
      );
    }

    // Apply sorting
    if (this.sortOptions.field) {
      filtered.sort((a, b) => {
        let valueA = a[this.sortOptions.field as keyof Lead];
        let valueB = b[this.sortOptions.field as keyof Lead];

        // Handle date fields
        if (this.sortOptions.field === 'follow_up' || this.sortOptions.field === 'created_at') {
          valueA = valueA ? new Date(valueA as string).getTime() : 0;
          valueB = valueB ? new Date(valueB as string).getTime() : 0;
        }

        // Handle status field with custom order
        if (this.sortOptions.field === 'status') {
          const statusOrder = { 'New': 0, 'Pending': 1, 'Closed': 2 };
          valueA = statusOrder[valueA as keyof typeof statusOrder] ?? 0;
          valueB = statusOrder[valueB as keyof typeof statusOrder] ?? 0;
        }

        // Handle string fields
        if (typeof valueA === 'string' && typeof valueB === 'string') {
          valueA = valueA.toLowerCase();
          valueB = valueB.toLowerCase();
        }

        if (valueA < valueB) return this.sortOptions.direction === 'asc' ? -1 : 1;
        if (valueA > valueB) return this.sortOptions.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    this.filteredLeads = filtered;
    this.totalPages = Math.ceil(this.filteredLeads.length / this.itemsPerPage);
    this.goToPage(1);
  }

  toggleColumnFilters(): void {
    this.showColumnFilters = !this.showColumnFilters;
    if (!this.showColumnFilters) {
      this.activeColumnFilter = null;
    }
  }

  toggleColumnFilter(columnKey: string): void {
    if (this.activeColumnFilter === columnKey) {
      this.activeColumnFilter = null;
    } else {
      this.activeColumnFilter = columnKey;
    }
  }

  sortColumn(columnKey: string, direction: 'asc' | 'desc'): void {
    this.columnFilters[columnKey].sortDirection = direction;
    this.applyColumnFilter(columnKey);
  }

  applyColumnFilter(columnKey: string): void {
    let filtered = [...this.leads];
    const filter = this.columnFilters[columnKey];

    // Apply search text filter
    if (filter.searchText) {
      filtered = filtered.filter(lead => {
        const value = String(lead[columnKey as keyof Lead] || '').toLowerCase();
        const searchText = filter.searchText.toLowerCase();
        return filter.exactMatch ? value === searchText : value.includes(searchText);
      });
    }

    // Apply selected values filter
    const selectedValues = Object.entries(filter.selectedValues)
      .filter(([_, selected]) => selected)
      .map(([value]) => value);

    if (selectedValues.length > 0) {
      filtered = filtered.filter(lead => {
        const value = String(lead[columnKey as keyof Lead] || '');
        return selectedValues.includes(value);
      });
    }

    // Apply sorting
    if (filter.sortDirection) {
      filtered.sort((a, b) => {
        const valueA = String(a[columnKey as keyof Lead] || '').toLowerCase();
        const valueB = String(b[columnKey as keyof Lead] || '').toLowerCase();
        return filter.sortDirection === 'asc' 
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      });
    }

    this.filteredLeads = filtered;
    this.totalPages = Math.ceil(this.filteredLeads.length / this.itemsPerPage);
    this.goToPage(1);
    
    // Close the filter dropdown after applying
    this.activeColumnFilter = null;
  }

  hasActiveFilters(): boolean {
    return this.columns.some(column => this.hasColumnFilters(column.key));
  }

  hasColumnFilters(columnKey: string): boolean {
    const filter = this.columnFilters[columnKey];
    return !!(
      filter.searchText ||
      Object.values(filter.selectedValues).some(selected => selected) ||
      filter.sortDirection
    );
  }

  getSelectedValues(columnKey: string): string[] {
    return Object.entries(this.columnFilters[columnKey].selectedValues)
      .filter(([_, selected]) => selected)
      .map(([value]) => value);
  }

  clearColumnFilter(columnKey: string): void {
    this.columnFilters[columnKey] = {
      searchText: '',
      exactMatch: false,
      selectedValues: {},
      sortDirection: null
    };
    this.applyColumnFilter(columnKey);
  }

  clearAllColumnFilters(): void {
    this.columns.forEach(column => {
      this.clearColumnFilter(column.key);
    });
    this.activeColumnFilter = null;
  }

  updateFilterCount(columnKey: string): void {
    const filter = this.columnFilters[columnKey];
    let count = 0;

    if (filter.searchText) count++;
    if (Object.values(filter.selectedValues).length > 0) count += Object.values(filter.selectedValues).length;
    if (filter.sortDirection) count++;

    this.columnFilterCounts[columnKey] = count;
  }

  isColumnFiltered(columnKey: string): boolean {
    return this.columnFilterCounts[columnKey] > 0;
  }

  getColumnType(columnKey: string): 'text' | 'date' | 'status' | 'contact' {
    if (this.columnFilterTypes.text.includes(columnKey)) return 'text';
    if (this.columnFilterTypes.date.includes(columnKey)) return 'date';
    if (this.columnFilterTypes.status.includes(columnKey)) return 'status';
    if (this.columnFilterTypes.contact.includes(columnKey)) return 'contact';
    return 'text'; // default type
  }

  getTotalActiveFilters(): number {
    return Object.values(this.columnFilterCounts).reduce((total, count) => total + count, 0);
  }

  // Add these new methods
  isAllSelected(columnKey: string): boolean {
    const options = this.columnFilterOptions[columnKey] || [];
    const selectedValues = this.columnFilters[columnKey]?.selectedValues || {};
    return options.length > 0 && options.every(option => selectedValues[option]);
  }

  toggleSelectAll(columnKey: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const options = this.columnFilterOptions[columnKey] || [];
    
    // Initialize selectedValues if it doesn't exist
    if (!this.columnFilters[columnKey].selectedValues) {
      this.columnFilters[columnKey].selectedValues = {};
    }

    // Set all options to the checked state
    options.forEach(option => {
      this.columnFilters[columnKey].selectedValues[option] = checked;
    });

    // Update filter count
    this.updateFilterCount(columnKey);
  }

  clearAllFilters(): void {
    this.columns.forEach(column => {
      this.columnFilters[column.key] = {
        searchText: '',
        exactMatch: false,
        selectedValues: {},
        sortDirection: null
      };
    });
    this.filteredLeads = [...this.leads];
    this.totalPages = Math.ceil(this.filteredLeads.length / this.itemsPerPage);
    this.goToPage(1);
  }
}