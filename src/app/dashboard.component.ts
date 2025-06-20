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
        <div class="dashboard-header">
          <h1>Form Templates</h1>
          <button (click)="showCreateTemplate()" mat-raised-button color="primary">
             <mat-icon>add</mat-icon> Create Template
          </button>
        </div>
        <div class="dashboard-templates">
          <div *ngFor="let template of templates" class="card">
            <div class="template-card-header">
                <h3>{{ template }}</h3>
                <div class="actions">
                    <button mat-icon-button (click)="useTemplate(template)" matTooltip="Use Form">
                        <mat-icon>play_arrow</mat-icon>
                    </button>
                    <button mat-icon-button (click)="editTemplate(template)" matTooltip="Edit Template">
                        <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button (click)="previewTemplate(template)" matTooltip="Preview">
                        <mat-icon>visibility</mat-icon>
                    </button>
                    <button mat-icon-button (click)="viewSubmissions(template)" matTooltip="View Submissions">
                        <mat-icon>list_alt</mat-icon>
                    </button>
                    <button mat-icon-button (click)="duplicateTemplate(template)" matTooltip="Duplicate">
                        <mat-icon>content_copy</mat-icon>
                    </button>
                    <button mat-icon-button (click)="deleteTemplate(template)" matTooltip="Delete" class="btn-delete">
                        <mat-icon>delete</mat-icon>
                    </button>
                </div>
            </div>
          </div>
          <div *ngIf="templates.length === 0">No templates found. Create one!</div>
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
        <button (click)="onFormClose()">< Back to Templates</button>
        <app-submissions-viewer [templateName]="selectedTemplate"></app-submissions-viewer>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    button[mat-raised-button] {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .dashboard-templates {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
    }
    .template-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .actions {
      margin-top: 0;
      display: flex;
      flex-wrap: nowrap;
      gap: 0.25rem;
    }
    .btn-delete {
      background-color: var(--error-color);
      color: var(--on-error-color);
    }
    .btn-delete .mat-icon {
        color: var(--error-color);
    }
    .btn-delete:hover .mat-icon {
        color: var(--on-error-color);
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
