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

        <div *ngIf="templates.length > 0" class="templates-grid">
          <div *ngFor="let template of templates" class="card template-card enhanced-card">
            <div class="template-accent-bar"></div>
            <div class="template-card-header">
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
                <div class="actions">
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
                </div>
            </div>
          </div>
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
        <app-submissions-viewer [templateName]="selectedTemplate"></app-submissions-viewer>
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
    .templates-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 2rem;
      margin-top: 1.5rem;
    }
    .template-card {
        position: relative;
        overflow: hidden;
        transition: all 0.2s cubic-bezier(.4,2,.3,1);
        box-shadow: 0 2px 8px var(--shadow-color-light);
        border-radius: 1.25rem;
        background: var(--card-bg);
        min-height: 120px;
    }
    .template-card:hover {
        transform: translateY(-7px) scale(1.025);
        box-shadow: 0 12px 32px var(--shadow-color-dark);
        border: 1.5px solid var(--primary-color);
    }
    .template-accent-bar {
        position: absolute;
        left: 0; top: 0; bottom: 0;
        width: 6px;
        background: linear-gradient(180deg, var(--primary-color) 0%, var(--primary-color-light) 100%);
        border-radius: 6px 0 0 6px;
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
    .template-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1.5rem;
    }
    .template-card-header h3 {
        margin: 0;
        font-weight: 700;
        color: var(--text-color);
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-left: 1.5rem;
    }
    .action-icon {
        font-size: 1.7rem;
        color: var(--text-muted-color);
        transition: color 0.2s ease;
    }
    .actions button:hover .action-icon {
        color: var(--primary-color);
    }
    .action-delete:hover .action-icon {
        color: var(--danger-color) !important;
    }
    .divider {
        width: 1px;
        height: 24px;
        background-color: var(--border-color);
        margin: 0 0.5rem;
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
}
