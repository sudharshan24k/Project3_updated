import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { SchemaService } from './dynamic-form/schema.service';
import { DynamicForm } from './dynamic-form/dynamic-form';
import { SubmissionsViewerComponent } from './submissions-viewer.component';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, DynamicForm, SubmissionsViewerComponent, MatIconModule, MatTooltipModule, MatButtonModule],
  template: `
    <div class="container">
      <div *ngIf="mode === 'list'">
        <header class="dashboard-header">
          <div>
            <h1>Form Templates</h1>
            <p class="subtitle">Create, manage, and use your form templates.</p>
          </div>
          <button (click)="showCreateTemplate()" mat-raised-button>
             <mat-icon>add</mat-icon> 
             <span>Create New Template</span>
          </button>
        </header>

        <div *ngIf="templates.length > 0" class="templates-list">
          <table class="template-list-table">
            <thead>
              <tr>
                <th>Form Template</th>
                <th style="width: 1%; white-space: nowrap;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let template of templates">
                <td>
                  <div class="template-title-group">
                    <mat-icon class="template-icon" matTooltip="Form Template">description</mat-icon>
                    <div>
                      <h3>{{ template }}</h3>
                      <p class="template-desc" *ngIf="getTemplateDesc(template)">{{ getTemplateDesc(template) }}</p>
                      <div class="template-meta" *ngIf="getTemplateMeta(template)">
                        <mat-icon>calendar_today</mat-icon>
                        <span>{{ getTemplateMeta(template) }}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td class="actions">
                  <button mat-icon-button (click)="useTemplate(template)" matTooltip="Fill Out Form">
                    <mat-icon fontIcon="dynamic_form" class="action-icon"></mat-icon>
                  </button>
                  <button mat-icon-button (click)="editTemplate(template)" matTooltip="Edit Schema">
                    <mat-icon fontIcon="edit" class="action-icon"></mat-icon>
                  </button>
                  <button mat-icon-button (click)="previewTemplate(template)" matTooltip="Preview Form">
                    <mat-icon fontIcon="visibility" class="action-icon"></mat-icon>
                  </button>
                  <button mat-icon-button (click)="viewSubmissions(template)" matTooltip="View Submissions">
                    <mat-icon fontIcon="list_alt" class="action-icon"></mat-icon>
                  </button>
                  <div class="divider"></div>
                  <button mat-icon-button (click)="duplicateTemplate(template)" matTooltip="Duplicate">
                    <mat-icon fontIcon="content_copy" class="action-icon"></mat-icon>
                  </button>
                  <button mat-icon-button class="action-delete" (click)="deleteTemplate(template)" matTooltip="Delete Template">
                    <mat-icon fontIcon="delete_outline" class="action-icon"></mat-icon>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div *ngIf="templates.length === 0" class="card empty-state enhanced-card">
            <mat-icon class="empty-illustration">folder_open</mat-icon>
            <h4>No templates found.</h4>
            <p>Get started by creating a new one!</p>
            <button (click)="showCreateTemplate()" mat-raised-button color="primary">
              <mat-icon>add</mat-icon> Create Template
            </button>
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
  `]
})
export class DashboardComponent implements OnInit {
  templates: string[] = [];
  mode: 'list' | 'create' | 'edit' | 'preview' | 'use' | 'submissions' = 'list';
  selectedTemplate: string | null = null;
  duplicatedVersion: number | null = null;

  constructor(private schemaService: SchemaService) {}

  ngOnInit() {
    this.loadTemplates();
  }

  isFormMode(): boolean {
    return this.mode === 'create' || this.mode === 'edit' || this.mode === 'preview' || this.mode === 'use';
  }

  loadTemplates() {
    this.schemaService.listTemplates().subscribe(templates => {
      this.templates = templates;
    });
  }

  showCreateTemplate() {
    this.mode = 'create';
    this.selectedTemplate = null;
  }

  useTemplate(template: string) {
    this.mode = 'use';
    this.selectedTemplate = template;
  }

  editTemplate(template: string) {
    this.mode = 'edit';
    this.selectedTemplate = template;
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
    // Placeholder: In a real app, fetch description from template details
    // For now, return null or a mock description
    return null;
  }

  getTemplateMeta(template: string): string | null {
    // Placeholder: In a real app, fetch created/updated date from template details
    // For now, return null or a mock date
    return null;
  }

  onDuplicateEdit(event: { template: string, version: number }) {
    this.mode = 'use';
    this.selectedTemplate = event.template;
    this.duplicatedVersion = event.version;
  }
}
