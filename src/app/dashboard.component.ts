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
          <div *ngFor="let template of templates" class="card template-card">
            <div class="template-card-header">
                <h3>{{ template }}</h3>
                <div class="actions">
                    <button mat-icon-button (click)="useTemplate(template)" matTooltip="Fill Out Form">
                        <mat-icon>dynamic_form</mat-icon>
                    </button>
                    <button mat-icon-button (click)="editTemplate(template)" matTooltip="Edit Schema">
                        <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button (click)="previewTemplate(template)" matTooltip="Preview Form">
                        <mat-icon>visibility</mat-icon>
                    </button>
                    <button mat-icon-button (click)="viewSubmissions(template)" matTooltip="View Submissions">
                        <mat-icon>list_alt</mat-icon>
                    </button>
                     <div class="divider"></div>
                    <button mat-icon-button (click)="duplicateTemplate(template)" matTooltip="Duplicate">
                        <mat-icon>content_copy</mat-icon>
                    </button>
                    <button mat-icon-button class="action-delete" (click)="deleteTemplate(template)" matTooltip="Delete Template">
                        <mat-icon>delete_outline</mat-icon>
                    </button>
                </div>
            </div>
          </div>
        </div>
        <div *ngIf="templates.length === 0" class="card empty-state">
            <h4>No templates found.</h4>
            <p>Get started by creating a new one!</p>
            <button (click)="showCreateTemplate()">Create Template</button>
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
    }
    .template-card {
        transition: all 0.2s ease-in-out;
    }
    .template-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 16px var(--shadow-color-dark);
    }
    .template-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
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
    }
    .actions .mat-icon {
        color: var(--text-muted-color);
        transition: color 0.2s ease;
    }
    .actions button:hover .mat-icon {
        color: var(--primary-color);
    }
    .action-delete:hover .mat-icon {
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
        padding: 3rem;
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
}
