import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, JsonPipe } from '@angular/common';
import { SchemaService, Submission } from './dynamic-form/schema.service';
import { FormsModule } from '@angular/forms';
import { DiffViewerComponent } from './diff-viewer.component';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-submissions-viewer',
  standalone: true,
  imports: [CommonModule, JsonPipe, FormsModule, DiffViewerComponent, MatIconModule, MatTooltipModule, MatButtonModule],
  template: `
    <div class="submissions-container" *ngIf="templateName">
      <h2>Submissions for: {{ templateName }}</h2>

      <div *ngIf="isLoading" class="loading-spinner">Loading submissions...</div>
      <div *ngIf="!isLoading && submissions.length === 0" class="card">
        <p>No submissions found for this template yet.</p>
      </div>

      <div *ngIf="!isLoading && submissions.length > 0">
        <!-- Submissions Table -->
        <div class="card">
          <h4>All Submissions</h4>
          <table>
            <thead>
              <tr>
                <th>Version</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let sub of submissions">
                <td>Version {{ sub.version }}</td>
                <td class="actions-cell">
                  <button mat-icon-button (click)="viewSubmission(sub.version)" matTooltip="View Submission Data">
                    <mat-icon>visibility</mat-icon>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Comparison Tool -->
        <div class="card comparison-tool" *ngIf="submissions.length > 1">
          <h4>Compare Two Submissions</h4>
          <div class="version-selection">
            <div *ngFor="let sub of submissions" class="version-item">
              <input type="checkbox" [id]="'ver-' + sub.version" [checked]="selectedVersions.has(sub.version)" (change)="toggleVersion(sub.version)">
              <label [for]="'ver-' + sub.version">Version {{ sub.version }}</label>
            </div>
          </div>
          <button [disabled]="selectedVersions.size !== 2" (click)="compareVersions()">Compare Selected</button>
        </div>

        <!-- Diff View -->
        <div *ngIf="diffResult" class="card diff-view">
          <h4>Comparison Result</h4>
          <app-diff-viewer [diff]="diffResult"></app-diff-viewer>
        </div>

        <!-- Individual Submission Data -->
        <div *ngIf="selectedSubmissionData" class="card submission-data">
          <h4>Submission Data (Version {{ selectedVersion }})</h4>
          <pre>{{ selectedSubmissionData | json }}</pre>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .submissions-container {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }
    .loading-spinner, .no-submissions {
      text-align: center;
      padding: 2rem;
    }
    .comparison-tool .version-selection {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      margin-bottom: 1rem;
    }
    .version-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .diff-view, .submission-data {
      margin-top: 1rem;
    }
    pre {
      background-color: #f4f4f4;
      padding: 1rem;
      border-radius: 4px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    td.actions-cell {
        text-align: right;
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

  constructor(private schemaService: SchemaService) {}

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
} 