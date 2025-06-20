import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule, JsonPipe } from '@angular/common';
import { SchemaService, Submission } from './dynamic-form/schema.service';
import { FormsModule } from '@angular/forms';
import { DiffViewerComponent } from './diff-viewer.component';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';

@Component({
  selector: 'app-submissions-viewer',
  standalone: true,
  imports: [CommonModule, JsonPipe, FormsModule, DiffViewerComponent, MatIconModule, MatTooltipModule, MatButtonModule],
  template: `
    <div class="container" *ngIf="templateName">
      <h2>Submissions: {{ templateName }}</h2>

      <div *ngIf="isLoading" class="loading-spinner">Loading submissions...</div>
      
      <div *ngIf="!isLoading && submissions.length === 0" class="card empty-state">
        <h4>No Submissions Yet</h4>
        <p>There are no submissions for this template. Use the form to create one!</p>
      </div>

      <main class="submissions-grid" *ngIf="!isLoading && submissions.length > 0">
        <!-- Left Column: Submissions List & Comparison -->
        <div class="left-column">
          <div class="card">
            <h4>All Submissions</h4>
            <table>
              <thead>
                <tr>
                  <th *ngIf="submissions.length > 1"></th>
                  <th>Version</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let sub of submissions" [class.selected]="selectedVersion === sub.version">
                  <td *ngIf="submissions.length > 1">
                    <input type="checkbox" [id]="'ver-' + sub.version" [checked]="selectedVersions.has(sub.version)" (change)="toggleVersion(sub.version)" [disabled]="selectedVersions.size >= 2 && !selectedVersions.has(sub.version)">
                  </td>
                  <td (click)="viewSubmission(sub.version)" class="clickable-row">Version {{ sub.version }}</td>
                  <td class="actions-cell">
                    <button mat-icon-button (click)="viewSubmission(sub.version)" matTooltip="View Details">
                      <mat-icon>visibility</mat-icon>
                    </button>
                    <button mat-icon-button (click)="downloadSubmission(sub.version)" matTooltip="Download .conf">
                      <mat-icon>download</mat-icon>
                    </button>
                    <button mat-icon-button (click)="duplicateAndEdit(sub.version)" matTooltip="Duplicate & Edit">
                      <mat-icon>content_copy</mat-icon>
                    </button>
                    <button mat-icon-button (click)="deleteSubmission(sub.version)" matTooltip="Delete Version">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="card comparison-tool" *ngIf="submissions.length > 1">
            <h4>Compare Submissions</h4>
            <p>Select two versions from the list above to compare them.</p>
            <button [disabled]="selectedVersions.size !== 2" (click)="compareVersions()">
              <mat-icon>compare_arrows</mat-icon>
              Compare ({{selectedVersions.size}}/2)
            </button>
          </div>
        </div>

        <!-- Right Column: Details & Diff View -->
        <div class="right-column">
          <div *ngIf="diffResult" class="card diff-view">
            <h4>Comparison Result</h4>
            <app-diff-viewer [diff]="diffResult"></app-diff-viewer>
          </div>

          <div *ngIf="selectedSubmissionData" class="card submission-data">
            <div class="submission-data-header">
              <h4>Submission Details</h4>
              <span>Version {{ selectedVersion }}</span>
            </div>
            <pre>{{ selectedSubmissionData | json }}</pre>
          </div>

          <div *ngIf="!diffResult && !selectedSubmissionData" class="card empty-state">
             <mat-icon>touch_app</mat-icon>
             <h4>Select an Item</h4>
             <p>Click a submission to view its details, or select two to compare.</p>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .container { max-width: 1600px; margin: 0 auto; }
    
    .loading-spinner, .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      color: var(--text-muted-color);
    }
    .empty-state mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 1rem;
    }
    .empty-state h4 { margin: 0; color: var(--text-color); }
    .empty-state p { margin: 0.5rem 0 0; }
    
    .submissions-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 2rem;
    }
    @media(min-width: 1024px) {
        .submissions-grid {
            grid-template-columns: minmax(400px, 1.2fr) 2fr;
        }
    }

    .left-column, .right-column {
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

    .clickable-row {
        cursor: pointer;
    }
    .clickable-row:hover {
        color: var(--primary-color);
    }
    tr.selected td {
        background-color: var(--secondary-color);
        color: var(--text-color);
    }

    td.actions-cell {
        text-align: right;
    }
    .actions-cell .mat-icon { color: var(--text-muted-color); }
    .actions-cell button:hover .mat-icon { color: var(--primary-color); }

    .comparison-tool button {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
    }

    .diff-view, .submission-data {
      margin-top: 0;
    }
    .submission-data-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }
    .submission-data-header h4 {
        margin: 0;
    }
    .submission-data-header span {
        font-size: 0.9rem;
        font-weight: 700;
        background-color: var(--background-color);
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
    }

    pre {
      background-color: var(--background-color);
      padding: 1.5rem;
      border-radius: 8px;
      white-space: pre-wrap;
      word-wrap: break-word;
      color: var(--text-color);
    }
  `]
})
export class SubmissionsViewerComponent implements OnInit, OnChanges {
  @Input() templateName: string | null = null;
  
  isLoading = false;
  submissions: Submission[] = [];
  selectedVersion: number | null = null;
  selectedSubmissionData: any = null;
  
  selectedVersions = new Set<number>();
  diffResult: any = null;
  @Output() duplicateEdit = new EventEmitter<{ template: string, version: number }>();

  constructor(private schemaService: SchemaService, private router: Router) {}

  ngOnInit() {
    this.loadSubmissions();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['templateName'] && changes['templateName'].currentValue) {
      this.resetState();
      this.loadSubmissions();
    }
  }

  resetState() {
    this.submissions = [];
    this.selectedVersion = null;
    this.selectedSubmissionData = null;
    this.selectedVersions.clear();
    this.diffResult = null;
  }

  loadSubmissions() {
    if (!this.templateName) return;
    this.isLoading = true;
    this.schemaService.listSubmissions(this.templateName).subscribe(subs => {
      this.submissions = subs.sort((a, b) => a.version - b.version);
      this.isLoading = false;
    });
  }

  viewSubmission(version: number) {
    if (!this.templateName) return;
    this.selectedVersion = version;
    this.schemaService.getSubmission(this.templateName, version).subscribe(data => {
      this.selectedSubmissionData = data.data;
    });
  }

  async downloadSubmission(version: number) {
    if (!this.templateName) return;

    this.schemaService.getSubmission(this.templateName, version).subscribe(async (submission) => {
      const data = submission.data;
      let confContent = '';
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          const value = data[key];
          if (typeof value === 'string') {
            confContent += `${key} = "${value}"\n`;
          } else {
            confContent += `${key} = ${value}\n`;
          }
        }
      }

      const blob = new Blob([confContent], { type: 'text/plain;charset=utf-8' });
      const fileName = `${this.templateName}-v${version}.conf`;

      if ('showSaveFilePicker' in window && typeof (window as any).showSaveFilePicker === 'function') {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: fileName,
            types: [{
              description: 'Config files',
              accept: { 'text/plain': ['.conf'] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
        } catch (err) {
          if ((err as DOMException).name !== 'AbortError') {
            console.error('Could not save file:', err);
          }
        }
      } else {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    });
  }

  toggleVersion(version: number) {
    if (this.selectedVersions.has(version)) {
      this.selectedVersions.delete(version);
    } else {
      this.selectedVersions.add(version);
    }
  }

  compareVersions() {
    if (!this.templateName || this.selectedVersions.size !== 2) return;
    const versions = Array.from(this.selectedVersions).sort((a, b) => a - b);
    this.diffResult = null; // Clear previous diff
    this.schemaService.diffSubmissions(this.templateName, versions[0], versions[1]).subscribe(result => {
      this.diffResult = result.diff;
    });
  }

  duplicateAndEdit(version: number) {
    if (!this.templateName) return;
    this.schemaService.duplicateSubmission(this.templateName, version).subscribe(res => {
      this.duplicateEdit.emit({ template: this.templateName!, version: res.version });
    });
  }

  deleteSubmission(version: number) {
    if (!this.templateName) return;
    if (confirm('Are you sure you want to delete this submission version?')) {
      this.schemaService.deleteSubmission(this.templateName, version).subscribe(() => {
        this.loadSubmissions();
        if (this.selectedVersion === version) {
          this.selectedVersion = null;
          this.selectedSubmissionData = null;
        }
      });
    }
  }
} 