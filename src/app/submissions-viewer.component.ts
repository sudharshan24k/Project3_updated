import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule, JsonPipe } from '@angular/common';
import { SchemaService, Submission, Response } from './dynamic-form/schema.service';
import { FormsModule } from '@angular/forms';
import { DiffViewerComponent } from './diff-viewer.component';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ResponseNameDialogComponent } from './response-name-dialog.component';

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
                  <th>Response Name</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let sub of submissions" [class.selected]="selectedSubmissionName === (sub.submission_name || '')">
                  <td *ngIf="submissions.length > 1">
                    <input type="checkbox"
                      [id]="'ver-' + (sub.submission_name || '')"
                      [checked]="selectedVersions.has(sub.submission_name || '')"
                      (change)="toggleVersion(sub.submission_name || '')"
                      [disabled]="selectedVersions.size >= 2 && !selectedVersions.has(sub.submission_name || '')">
                  </td>
                  <td (click)="viewSubmission(sub.submission_name || '')" class="clickable-row">{{ sub.submission_name || '' }}</td>
                  <td class="actions-cell">
                    <button mat-icon-button (click)="viewSubmission(sub.submission_name || '')" matTooltip="View Details">
                      <mat-icon>visibility</mat-icon>
                    </button>
                    <button mat-icon-button (click)="downloadSubmission(sub.submission_name || '')" matTooltip="Download .conf">
                      <mat-icon>download</mat-icon>
                    </button>
                    <button mat-icon-button (click)="duplicateAndEdit(sub.submission_name || '')" matTooltip="Duplicate & Edit">
                      <mat-icon>content_copy</mat-icon>
                    </button>
                    <button mat-icon-button (click)="deleteSubmission(sub.submission_name || '')" matTooltip="Delete Version" class="delete-btn">
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
              <span>Version {{ selectedSubmissionName }}</span>
            </div>
            <pre>{{ selectedSubmissionData | json }}</pre>
          </div>

          <!-- Threaded Responses/Comments -->
          <div *ngIf="selectedSubmission" class="card threaded-responses">
            <h4>Internal Notes & Comments (v{{selectedSubmissionName}})</h4>
            <div *ngFor="let response of selectedSubmission.responses" class="response-item">
              <p><strong>{{response.author || 'Anonymous'}}:</strong> {{response.content}}</p>
              <!-- TODO: Add nested responses -->
            </div>
            <div class="response-form">
              <textarea [(ngModel)]="newResponseContent" placeholder="Add a comment..."></textarea>
              <button (click)="addResponse()">Submit</button>
            </div>
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

    .delete-btn .mat-icon {
      color: var(--danger-color, #e53935) !important;
    }
    .delete-btn:hover .mat-icon {
      color: #b71c1c !important;
    }

    .threaded-responses {
      margin-top: 0;
    }
    .response-item {
      background-color: var(--background-color);
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
    }
    .response-form textarea {
      width: 100%;
      min-height: 80px;
      margin-bottom: 1rem;
    }
  `]
})
export class SubmissionsViewerComponent implements OnInit, OnChanges {
  @Input() templateName: string | null = null;
  
  isLoading = false;
  submissions: Submission[] = [];
  selectedSubmissionName: string | null = null;
  selectedSubmission: (Submission & { responses?: Response[] }) | null = null;
  selectedSubmissionData: any = null;
  selectedVersions = new Set<string>(); // Now stores submission_names
  diffResult: any = null;
  @Output() duplicateEdit = new EventEmitter<{ template: string, version: number }>();
  newResponseContent: string = '';

  constructor(private schemaService: SchemaService, private router: Router, private dialog: MatDialog) {}

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
    this.selectedSubmissionName = null;
    this.selectedSubmission = null;
    this.selectedSubmissionData = null;
    this.selectedVersions.clear();
    this.diffResult = null;
  }

  loadSubmissions() {
    if (!this.templateName) return;
    this.isLoading = true;
    this.schemaService.listSubmissions(this.templateName).subscribe((subs: Submission[]) => {
      // Sort by submission_name (tev2_1, tev2_2, ...)
      this.submissions = subs.sort((a: Submission, b: Submission) => {
        if (!a.submission_name || !b.submission_name) return 0;
        const aNum = parseInt(a.submission_name.split('_').pop() || '0', 10);
        const bNum = parseInt(b.submission_name.split('_').pop() || '0', 10);
        return bNum - aNum;
      });
      this.isLoading = false;
    });
  }

  viewSubmission(submissionName: string) {
    if (!this.templateName) return;
    this.selectedSubmissionName = submissionName;
    this.diffResult = null;
    this.schemaService.getSubmissionByName(this.templateName, submissionName).subscribe(sub => {
      this.selectedSubmission = sub;
      this.selectedSubmissionData = sub.data;
    });
  }

  addResponse() {
    if (!this.templateName || !this.selectedSubmissionName || !this.newResponseContent.trim()) return;

    const dialogRef = this.dialog.open(ResponseNameDialogComponent, {
      width: '350px',
      data: { responseName: '' }
    });
    dialogRef.afterClosed().subscribe((responseName: string | null) => {
      if (typeof responseName !== 'string' || !responseName) return;
      // TODO: Get author from a user service/auth
      const response = {
        content: this.newResponseContent,
        author: 'Reviewer',
        response_name: responseName
      };
      this.schemaService.addResponse(this.templateName!, this.selectedSubmissionName!, response).subscribe(newResponse => {
        if (this.selectedSubmission && this.selectedSubmission.responses) {
          this.selectedSubmission.responses.push(newResponse);
        } else if (this.selectedSubmission) {
          this.selectedSubmission.responses = [newResponse];
        }
        this.newResponseContent = '';
      });
    });
  }

  async downloadSubmission(submissionName: string) {
    if (!this.templateName) return;
    this.schemaService.downloadSubmissionByName(this.templateName, submissionName).subscribe(async (submission: any) => {
      const data = submission.data;
      let confContent = '';
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          const value = data[key];
          confContent += `  ${key} = "${value}"
`;
        }
      }
      const blob = new Blob([confContent], { type: 'text/plain;charset=utf-8' });
      const fileName = `${submissionName}.conf`;
      if ('showSaveFilePicker' in window && typeof (window as any).showSaveFilePicker === 'function') {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: fileName,
            types: [{ description: 'Config files', accept: { 'text/plain': ['.conf'] } }],
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

  toggleVersion(submissionName: string) {
    if (this.selectedVersions.has(submissionName)) {
      this.selectedVersions.delete(submissionName);
    } else {
      this.selectedVersions.add(submissionName);
    }
  }

  compareVersions() {
    // Disable or refactor: diffSubmissions is version-based, but now we use submission_name
    // Option 1: Hide/disable comparison for now
    return;
  }

  duplicateAndEdit(submissionName: string) {
    if (!this.templateName) return;
    this.schemaService.duplicateSubmissionByName(this.templateName, submissionName).subscribe(res => {
      this.duplicateEdit.emit({ template: this.templateName!, version: res.version });
      this.loadSubmissions();
    });
  }

  deleteSubmission(submissionName: string) {
    if (!this.templateName) return;
    if (confirm('Are you sure you want to delete this submission?')) {
      this.schemaService.deleteSubmissionByName(this.templateName, submissionName).subscribe(() => {
        this.loadSubmissions();
        if (this.selectedSubmissionName === submissionName) {
          this.selectedSubmissionName = null;
          this.selectedSubmission = null;
          this.selectedSubmissionData = null;
        }
      });
    }
  }
}