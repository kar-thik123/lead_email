import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import { Task } from '../../models/task.model';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

import { LayoutComponent } from '../shared/layout/layout.component';

@Component({
  selector: 'app-task-management',
  standalone: true,
  imports: [CommonModule, FormsModule, LayoutComponent],
  templateUrl: './task-management.component.html',
  styleUrls: ['./task-management.component.css']
})
export class TaskManagementComponent implements OnInit {
  tasks: Task[] = [];
  paginatedTasks: Task[] = [];
  showModal = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  showAlert = false;
  alertMessage = '';
  alertType: 'success' | 'error' | 'warning' | 'info' = 'info';
  editingTask: Task = {
    dateFrom: new Date(),
    dateTo: new Date(),
    description: '',
    status: 'Pending',
    remark: ''
  };
  isInlineEditing = false;
  inlineEditingTask: Task = {
    dateFrom: new Date(),
    dateTo: new Date(),
    description: '',
    status: 'Pending',
    remark: ''
  };

  // Pagination properties
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;
  totalItems = 0;
  Math = Math; // Make Math available in template

  @ViewChild('fileInput') fileInput!: ElementRef;

  constructor(private taskService: TaskService) {}

  ngOnInit() {
    this.loadTasks();
    console.log('Tasks after load:', this.tasks);
  }

  loadTasks() {
    this.isLoading = true;
    this.errorMessage = '';
    this.taskService.getTasks().subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.totalItems = tasks.length;
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        this.updatePaginatedTasks();
        this.isLoading = false;
      },
      error: (error) => {
        this.showAlert = true;
        this.alertMessage = 'Failed to load tasks: ' + error;
        this.alertType = 'error';
        this.isLoading = false;
      }
    });
  }

  // Pagination methods
  updatePaginatedTasks() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedTasks = this.tasks.slice(startIndex, endIndex);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedTasks();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  openAddModal() {
    this.editingTask = {
      dateFrom: null,
      dateTo: null,
      description: '',
      status: 'Pending',
      remark: ''
    };
    this.showModal = true;
  }

  editTask(task: Task) {
    this.editingTask = { ...task };
    this.showModal = true;
  }

  startInlineEdit(task: Task) {
    this.isInlineEditing = true;
    this.inlineEditingTask = { ...task };
  }

  saveInlineEdit() {
    if (this.inlineEditingTask) {
      this.isLoading = true;
      this.errorMessage = '';
      this.taskService.updateTask(this.inlineEditingTask).subscribe({
        next: () => {
          this.loadTasks();
          this.isInlineEditing = false;
          this.inlineEditingTask = {
            dateFrom: new Date(),
            dateTo: new Date(),
            description: '',
            status: 'Pending',
            remark: ''
          };
          this.showAlert = true;
          this.alertMessage = 'Task updated successfully';
          this.alertType = 'success';
          setTimeout(() => this.showAlert = false, 3000);
        },
        error: (error) => {
          this.showAlert = true;
          this.alertMessage = 'Failed to update task: ' + error;
          this.alertType = 'error';
          this.isLoading = false;
        }
      });
    }
  }

  cancelInlineEdit() {
    this.isInlineEditing = false;
    this.inlineEditingTask = {
      dateFrom: new Date(),
      dateTo: new Date(),
      description: '',
      status: 'Pending',
      remark: ''
    };
  }

  closeModal() {
    this.showModal = false;
  }

  saveTask() {
    this.isLoading = true;
    this.errorMessage = '';
    
    // Convert string dates to Date objects
    const taskToSave = {
      ...this.editingTask,
      dateFrom: this.editingTask.dateFrom ? new Date(this.editingTask.dateFrom) : null,
      dateTo: this.editingTask.dateTo ? new Date(this.editingTask.dateTo) : null
    };
    
    if (this.editingTask.id) {
      this.taskService.updateTask(taskToSave).subscribe({
        next: () => {
          this.loadTasks();
          this.closeModal();
          this.showAlert = true;
          this.alertMessage = 'Task updated successfully';
          this.alertType = 'success';
          setTimeout(() => this.showAlert = false, 3000);
        },
        error: (error) => {
          this.showAlert = true;
          this.alertMessage = 'Failed to update task: ' + error;
          this.alertType = 'error';
          this.isLoading = false;
        }
      });
    } else {
      this.taskService.addTask(taskToSave).subscribe({
        next: () => {
          this.loadTasks();
          this.closeModal();
          this.showAlert = true;
          this.alertMessage = 'Task added successfully';
          this.alertType = 'success';
          setTimeout(() => this.showAlert = false, 3000);
        },
        error: (error) => {
          this.showAlert = true;
          this.alertMessage = 'Failed to add task: ' + error;
          this.alertType = 'error';
          this.isLoading = false;
        }
      });
    }
  }

  updateTask(task: Task) {
    this.isLoading = true;
    this.errorMessage = '';
    this.taskService.updateTask(task).subscribe({
      next: () => {
        this.loadTasks();
        this.successMessage = 'Task updated successfully';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        this.errorMessage = 'Failed to update task: ' + error;
        this.isLoading = false;
      }
    });
  }

  deleteTask(id: number | undefined) {
    if (id === undefined) {
      this.showAlert = true;
      this.alertMessage = 'Cannot delete task: ID is undefined';
      this.alertType = 'error';
      return;
    }
    
    if (confirm('Are you sure you want to delete this task?')) {
      this.isLoading = true;
      this.errorMessage = '';
      this.taskService.deleteTask(id).subscribe({
        next: () => {
          this.loadTasks();
          this.showAlert = true;
          this.alertMessage = 'Task deleted successfully';
          this.alertType = 'success';
          setTimeout(() => this.showAlert = false, 3000);
        },
        error: (error) => {
          this.showAlert = true;
          this.alertMessage = 'Failed to delete task: ' + error;
          this.alertType = 'error';
          this.isLoading = false;
        }
      });
    }
  }

  exportToExcel() {
    try {
      const data = this.tasks.map(task => ({
        'S.No': this.tasks.indexOf(task) + 1,
        'Date From': task.dateFrom,
        'Date To': task.dateTo,
        'Task Description': task.description,
        'Status': task.status,
        'Remark': task.remark
      }));

      const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
      XLSX.writeFile(wb, 'tasks_export.xlsx');
      this.successMessage = 'Tasks exported successfully';
      setTimeout(() => this.successMessage = '', 3000);
    } catch (error) {
      this.errorMessage = 'Failed to export tasks: ' + error;
    }
  }

  importFromExcel(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.isLoading = true;
      this.errorMessage = '';
      this.taskService.importFromExcel(file).then(tasks => {
        let successCount = 0;
        let errorCount = 0;
        
        // Process tasks sequentially to avoid overwhelming the server
        const processTask = (index: number) => {
          if (index >= tasks.length) {
            this.loadTasks();
            this.successMessage = `Successfully imported ${successCount} tasks`;
            if (errorCount > 0) {
              this.errorMessage = `Failed to import ${errorCount} tasks`;
            }
            setTimeout(() => {
              this.successMessage = '';
              this.errorMessage = '';
            }, 3000);
            return;
          }

          const task = tasks[index];
          this.taskService.addTask({
            dateFrom: task.dateFrom ? new Date(task.dateFrom) : null,
            dateTo: task.dateTo ? new Date(task.dateTo) : null,
            description: task.description,
            status: task.status,
            remark: task.remark
          }).subscribe({
            next: () => {
              successCount++;
              processTask(index + 1);
            },
            error: (error) => {
              console.error('Error importing task:', error);
              errorCount++;
              processTask(index + 1);
            }
          });
        };

        processTask(0);
      }).catch(error => {
        this.errorMessage = 'Failed to read Excel file: ' + error;
        this.isLoading = false;
      });
    }
  }
} 