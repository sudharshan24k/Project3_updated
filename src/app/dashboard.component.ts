import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { SchemaService, TemplateInfo } from './dynamic-form/schema.service';
import { DynamicForm } from './dynamic-form/dynamic-form';
import { SubmissionsViewerComponent } from './submissions-viewer.component';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, DynamicForm, SubmissionsViewerComponent, MatIconModule, MatTooltipModule, MatButtonModule, FormsModule],
  template: `
    <div class="container">
      <div *ngIf="mode === 'list'">
        <header class="dashboard-header">
          <div>
            <h1>Form Templates</h1>
            <p class="subtitle">Create, manage, and use your form templates.</p>
          </div>
          <div class="header-actions">
            <button (click)="toggleTheme()" mat-icon-button matTooltip="Toggle Light/Dark Mode">
              <mat-icon>{{ isDarkTheme ? 'dark_mode' : 'light_mode' }}</mat-icon>
            </button>
            <button (click)="showCreateTemplate()" mat-raised-button>
              <mat-icon>add</mat-icon>
              <span>Create New Template</span>
            </button>
          </div>
        </header>

        <div class="filter-bar card">
          <input type="text" class="filter-input" placeholder="Search by name..." [(ngModel)]="filterName" (ngModelChange)="applyFilters()">
          <input type="text" class="filter-input" placeholder="Search by description..." [(ngModel)]="filterDescription" (ngModelChange)="applyFilters()">
          <div class="date-range-filter">
            <div class="date-input-group">
              <input #startDateInput type="date" class="filter-input" [(ngModel)]="filterStartDate" (ngModelChange)="applyFilters()">
              <button mat-icon-button tabindex="-1" class="calendar-btn" matTooltip="Pick start date" type="button" (click)="openDatePicker(startDateInput)">
                <mat-icon>calendar_today</mat-icon>
              </button>
            </div>
            <span class="date-range-separator">to</span>
            <div class="date-input-group">
              <input #endDateInput type="date" class="filter-input" [(ngModel)]="filterEndDate" (ngModelChange)="applyFilters()">
              <button mat-icon-button tabindex="-1" class="calendar-btn" matTooltip="Pick end date" type="button" (click)="openDatePicker(endDateInput)">
                <mat-icon>calendar_today</mat-icon>
              </button>
            </div>
          </div>
          <button (click)="resetFilters()" class="clear-filters-btn">Clear</button>
        </div>

        <div class="view-switcher">
          <button mat-icon-button (click)="displayMode = 'list'" [class.active]="displayMode === 'list'" matTooltip="List View">
            <mat-icon>view_list</mat-icon>
          </button>
          <button mat-icon-button (click)="displayMode = 'grid'" [class.active]="displayMode === 'grid'" matTooltip="Grid View">
            <mat-icon>view_module</mat-icon>
          </button>
        </div>

        <div *ngIf="filteredTemplates.length > 0" class="templates-list">
          <!-- List View -->
          <table class="template-list-table" *ngIf="displayMode === 'list'">
            <thead>
              <tr>
                <th>Form Template</th>
                <th style="width: 1%; white-space: nowrap;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let template of filteredTemplates">
                <td>
                  <div class="template-title-group">
                    <mat-icon class="template-icon" matTooltip="Form Template">description</mat-icon>
                    <div>
                      <h3>
                        {{ template.name }}
                      </h3>
                      <p class="template-desc" *ngIf="template.description">{{ template.description }}</p>
                      <div class="template-meta" *ngIf="template.created_at">
                        <mat-icon>calendar_today</mat-icon>
                        <span>Created on {{ template.created_at | date:'mediumDate' }}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td class="actions">
                  <button mat-icon-button (click)="useTemplate(template.name)" matTooltip="Fill Out Form">
                    <mat-icon fontIcon="dynamic_form" class="action-icon"></mat-icon>
                  </button>
                  <button mat-icon-button (click)="editTemplate(template)" matTooltip="Edit Schema">
                    <mat-icon fontIcon="edit" class="action-icon"></mat-icon>
                  </button>
                  <button mat-icon-button (click)="previewTemplate(template.name)" matTooltip="Preview Form">
                    <mat-icon fontIcon="visibility" class="action-icon"></mat-icon>
                  </button>
                  <button mat-icon-button (click)="viewSubmissions(template.name)" matTooltip="View Submissions">
                    <mat-icon fontIcon="list_alt" class="action-icon"></mat-icon>
                  </button>
                  <button mat-icon-button (click)="viewHistory(template.name)" matTooltip="View History">
                    <mat-icon fontIcon="history" class="action-icon"></mat-icon>
                  </button>
                  <button mat-icon-button (click)="duplicateTemplate(template.name)" matTooltip="Duplicate">
                    <mat-icon fontIcon="content_copy" class="action-icon"></mat-icon>
                  </button>
                  <button mat-icon-button class="action-delete" (click)="deleteTemplate(template.name)" matTooltip="Delete Template">
                    <mat-icon fontIcon="delete_outline" class="action-icon"></mat-icon>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Grid View -->
          <div class="template-grid" *ngIf="displayMode === 'grid'">
            <div class="template-card card" *ngFor="let template of filteredTemplates">
              <div class="template-title-group">
                <mat-icon class="template-icon" matTooltip="Form Template">description</mat-icon>
                <div>
                  <h3>
                    {{ template.name }}
                  </h3>
                  <p class="template-desc" *ngIf="template.description">{{ template.description }}</p>
                  <div class="template-meta" *ngIf="template.created_at">
                    <mat-icon>calendar_today</mat-icon>
                    <span>Created on {{ template.created_at | date:'mediumDate' }}</span>
                  </div>
                </div>
              </div>
              <div class="actions">
                <button mat-icon-button (click)="useTemplate(template.name)" matTooltip="Fill Out Form">
                  <mat-icon fontIcon="dynamic_form" class="action-icon"></mat-icon>
                </button>
                <button mat-icon-button (click)="editTemplate(template)" matTooltip="Edit Schema">
                  <mat-icon fontIcon="edit" class="action-icon"></mat-icon>
                </button>
                <button mat-icon-button (click)="previewTemplate(template.name)" matTooltip="Preview Form">
                  <mat-icon fontIcon="visibility" class="action-icon"></mat-icon>
                </button>
                <button mat-icon-button (click)="viewSubmissions(template.name)" matTooltip="View Submissions">
                  <mat-icon fontIcon="list_alt" class="action-icon"></mat-icon>
                </button>
                <button mat-icon-button (click)="viewHistory(template.name)" matTooltip="View History">
                  <mat-icon fontIcon="history" class="action-icon"></mat-icon>
                </button>
                <button mat-icon-button (click)="duplicateTemplate(template.name)" matTooltip="Duplicate">
                  <mat-icon fontIcon="content_copy" class="action-icon"></mat-icon>
                </button>
                <button mat-icon-button class="action-delete" (click)="deleteTemplate(template.name)" matTooltip="Delete Template">
                  <mat-icon fontIcon="delete_outline" class="action-icon"></mat-icon>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div *ngIf="filteredTemplates.length === 0" class="card empty-state enhanced-card">
            <mat-icon class="empty-illustration">search</mat-icon>
            <h4>No templates match your filters.</h4>
            <p>Try adjusting your search criteria.</p>
        </div>
      </div>

      <div *ngIf="isFormMode()">
        <app-dynamic-form
          [mode]="mode"
          [templateName]="selectedTemplate"
          [prefillVersion]="duplicatedVersion"
          (formClose)="onFormClose()">
        </app-dynamic-form>
      </div>

      <div *ngIf="mode === 'submissions'">
        <header class="page-header">
          <button (click)="onFormClose()" class="back-button">
            <mat-icon>arrow_back</mat-icon>
            <span>Back to Templates</span>
          </button>
        </header>
        <app-submissions-viewer [templateName]="selectedTemplate" (duplicateEdit)="onDuplicateEdit($event)"></app-submissions-viewer>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2.5rem;
      background: linear-gradient(90deg, var(--primary-color-light) 0%, var(--primary-color) 100%);
      border-radius: 1rem;
      padding: 2rem 2.5rem 1.5rem 2.5rem;
      box-shadow: 0 4px 24px var(--shadow-color-dark);
      background-color: var(--surface-color);
    }
    .dashboard-header h1 {
        margin-bottom: 0.25rem;
    }
    .subtitle {
        margin: 0;
        color: var(--text-muted-color);
        font-size: 1.1rem;
    }
    .dashboard-header button {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .templates-list {
      margin-top: 1.5rem;
    }
    .template-list-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0 0.5rem;
      
    }
    .template-list-table th, .template-list-table td {
      padding: 1.25rem 1.5rem;
      background: var(--card-bg);
      border-radius: 0.75rem;
      vertical-align: middle;
      background-color: var(--surface-color);
    }
    .template-list-table th {
      text-align: left;
      font-size: 1.1rem;
      color: var(--text-muted-color);
      font-weight: 600;
      background: none;
      border-bottom: none;
    }
    .template-list-table td.actions {
      text-align: right;
      white-space: nowrap;
      background: none;
      background-color: var(--surface-color);
    }
    .template-list-table tr {
      transition: box-shadow 0.2s;
    }
    .template-list-table tr:hover td {
      box-shadow: 0 2px 12px var(--shadow-color-light);
      background: var(--primary-color-lightest);
    }
    .template-title-group {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
    }
    .template-icon {
        font-size: 2.2rem;
        color: var(--primary-color);
        margin-top: 0.1rem;
    }
    .template-desc {
        color: var(--text-muted-color);
        font-size: 1.05rem;
        margin: 0.15rem 0 0.1rem 0;
    }
    .template-meta {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        color: var(--text-muted-color);
        font-size: 0.95rem;
        margin-top: 0.1rem;
    }
    .empty-state {
        text-align: center;
        padding: 3rem 2rem 2.5rem 2rem;
        border-radius: 1.25rem;
        background: var(--card-bg);
        box-shadow: 0 2px 8px var(--shadow-color-light);
        margin-top: 2.5rem;
    }
    .empty-illustration {
        font-size: 4.5rem;
        color: var(--primary-color-light);
        margin-bottom: 0.5rem;
    }
    .empty-state h4 {
        margin-bottom: 0.5rem;
    }
    .empty-state p {
        color: var(--text-muted-color);
        margin-bottom: 1.5rem;
    }
    .page-header {
        margin-bottom: 2rem;
    }
    .back-button {
        background: none;
        border: none;
        padding: 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--primary-color);
        font-size: 1rem;
        font-weight: 700;
        cursor: pointer;
    }
    .back-button:hover {
        text-decoration: underline;
        box-shadow: none;
        transform: none;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .filter-bar {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
      padding: 1.5rem;
      flex-wrap: wrap;
    }
    .filter-input, .filter-select {
      font-size: 1rem;
      padding: 0.75rem;
      border-radius: 8px;
      border: 1px solid var(--border-color);
      background-color: var(--surface-color);
      color: var(--text-color);
    }
    .filter-input:focus {
      border-color:#5B9DD9 !important; /* Highlight border color on focus */
      box-shadow: 0 0 0 2px rgba(91, 157, 217, 0.15);
      outline: none;
    }
    .dark-theme .filter-input:focus {
      border-color: #5B9DD9 !important;
      box-shadow: 0 0 0 2px rgba(118, 184, 243, 0.18);
      outline: none;
    }
    .filter-input {
      flex-grow: 1;
    }
    .date-range-filter {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .date-input-group {
      display: flex;
      align-items: center;
      gap: 0.2rem;
    }
    .calendar-btn {
      padding: 0 0.2rem;
      font-size: 1rem;
      color: var(--text-muted-color);
      background: none;
      border: none;
      cursor: pointer;
    }
    .clear-filters-btn {
        background: none;
        border: 1px solid var(--border-color);
        color: var(--text-muted-color);
    }
    .clear-filters-btn:hover {
        background: var(--background-color);
        color: var(--text-color);
        box-shadow: none;
        transform: none;
    }
    .view-switcher {
      text-align: right;
      margin-bottom: 1rem;
    }
    .view-switcher button {
      background: none;
      border-radius: 8px;
    }
    .view-switcher button.active {
      background-color: var(--secondary-color);
    }
    .template-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1.5rem;
      margin-top: 1.5rem;
    }
    .template-card {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .template-card .actions {
      border-top: 1px solid var(--border-color);
      margin-top: 1.5rem;
      padding-top: 1rem;
      text-align: right;
    }
  `]
})
export class DashboardComponent implements OnInit {
  allTemplates: TemplateInfo[] = [];
  filteredTemplates: TemplateInfo[] = [];
  mode: 'list' | 'create' | 'edit' | 'preview' | 'use' | 'submissions' = 'list';
  selectedTemplate: string | null = null;
  duplicatedVersion: number | null = null;
  isDarkTheme = false;
  displayMode: 'list' | 'grid' = 'list';

  // Filter properties
  filterName: string = '';
  filterDescription: string = '';
  filterStartDate: string = '';
  filterEndDate: string = '';

  constructor(private schemaService: SchemaService, private router: Router) {}

  ngOnInit() {
    this.loadTemplates();
    this.isDarkTheme = document.body.classList.contains('dark-theme');
  }

  isFormMode(): boolean {
    return this.mode === 'create' || this.mode === 'edit' || this.mode === 'preview' || this.mode === 'use';
  }

  loadTemplates() {
    this.schemaService.listTemplates().subscribe(templates => {
      this.allTemplates = templates;
      this.applyFilters();
      console.log('Templates loaded:', this.allTemplates);
    });
  }

  applyFilters() {
    let templates = this.allTemplates;

    if (this.filterName) {
      templates = templates.filter(t => t.name.toLowerCase().includes(this.filterName.toLowerCase()));
    }

    if (this.filterDescription) {
      templates = templates.filter(t => t.description?.toLowerCase().includes(this.filterDescription.toLowerCase()));
    }

    if (this.filterStartDate) {
      templates = templates.filter(t => new Date(t.created_at) >= new Date(this.filterStartDate));
    }

    if (this.filterEndDate) {
      templates = templates.filter(t => new Date(t.created_at) <= new Date(this.filterEndDate));
    }

    this.filteredTemplates = templates;
  }

  resetFilters() {
    this.filterName = '';
    this.filterDescription = '';
    this.filterStartDate = '';
    this.filterEndDate = '';
    this.applyFilters();
  }

  showCreateTemplate() {
    this.mode = 'create';
    this.selectedTemplate = null;
    this.duplicatedVersion = null;
    this.loadTemplates();
  }

  useTemplate(template: string) {
    this.mode = 'use';
    this.selectedTemplate = template;
  }

  editTemplate(template: TemplateInfo) {
    this.mode = 'edit';
    this.selectedTemplate = template.name;
  }

  previewTemplate(template: string) {
    this.mode = 'preview';
    this.selectedTemplate = template;
  }

  viewSubmissions(template: string) {
    this.mode = 'submissions';
    this.selectedTemplate = template;
  }

  duplicateTemplate(template: string) {
    this.schemaService.duplicateTemplate(template).subscribe(() => {
      this.loadTemplates();
    });
  }

  deleteTemplate(template: string) {
    if (confirm(`Are you sure you want to delete the template '${template}'?`)) {
      this.schemaService.deleteTemplate(template).subscribe(() => {
        this.loadTemplates();
      });
    }
  }

  onFormClose() {
    this.mode = 'list';
    this.selectedTemplate = null;
    this.duplicatedVersion = null;
    this.loadTemplates();
  }

  getTemplateDesc(template: string): string | null {
    const t = this.allTemplates.find(t => t.name === template);
    return t ? t.description : null;
  }

  getTemplateMeta(template: string): string | null {
    const t = this.allTemplates.find(t => t.name === template);
    return t ? t.created_at : null;
  }

  onDuplicateEdit(event: { template: string, version: number }) {
    this.mode = 'use';
    this.selectedTemplate = event.template;
    this.duplicatedVersion = event.version;
  }

  toggleTheme() {
    this.isDarkTheme = !this.isDarkTheme;
    if (this.isDarkTheme) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }

  viewHistory(name: string) {
    this.router.navigate(['/history', name]);
  }

  openDatePicker(input: HTMLInputElement) {
    if (input.showPicker) {
      input.showPicker();
    } else {
      input.focus();
    }
  }
}
