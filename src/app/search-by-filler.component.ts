import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SchemaService } from './dynamic-form/schema.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import JSZip from 'jszip';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';

@Component({
  selector: 'app-search-by-filler',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatTooltipModule, MatDividerModule],
  template: `
    <div *ngIf="!selectedSubmission; else detailView">
      <div class="card" style="max-width: 600px; margin: 2rem auto; padding: 2rem;">
        <h2>Search Submitted Forms by User</h2>
        <form (ngSubmit)="onSearchByFiller()" #searchForm="ngForm" style="display: flex; gap: 1rem; align-items: flex-end;">
          <mat-form-field appearance="outline" style="flex: 1;">
            <mat-label>Enter User Name</mat-label>
            <input matInput [(ngModel)]="searchFillerName" name="searchFillerName" required placeholder="e.g. John" />
          </mat-form-field>
          <button mat-raised-button color="primary" type="submit" [disabled]="!searchFillerName || isSearching">Search</button>
          <button mat-button type="button" (click)="back.emit()">Back</button>
        </form>
        <div *ngIf="isSearching" style="margin-top: 1.5rem; text-align: center;">
          <mat-icon class="spinning">refresh</mat-icon> Searching...
        </div>
        <div *ngIf="searchResults && searchResults.length > 0" style="margin-top: 2rem;">
          <table class="mat-elevation-z2" style="width: 100%; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr>
                <th>Submission Name</th>
                <th>Template Name</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let sub of searchResults">
                <td>{{ sub.submission_name }}</td>
                <td>{{ sub.template_name }}</td>
                <td>{{ sub.created_at | date:'medium' }}</td>
                <td>
                  <button mat-stroked-button color="accent" (click)="viewSubmission(sub)">View</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div *ngIf="searchResults && searchResults.length === 0 && !isSearching" style="margin-top: 2rem; text-align: center; color: #888;">
          No submissions found for this user.
        </div>
      </div>
    </div>
    <ng-template #detailView>
      <div class="container">
        <div class="page-header">
          <button mat-stroked-button color="primary" (click)="selectedSubmission = null" style="margin-bottom: 1rem;">
            <mat-icon>arrow_back</mat-icon>
            <span>Back to Results</span>
          </button>
        </div>
        <div class="card submission-data" style="max-width: 700px; margin: 2rem auto; padding: 2rem;">
          <div class="submission-data-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem;">
            <div>
              <h3 style="margin: 0 0 0.5rem 0;">Submission Details: <span style="color: var(--primary-color);">{{ selectedSubmission?.submission_name }}</span></h3>
              <div style="display: flex; gap: 2rem; flex-wrap: wrap; font-size: 1rem; color: #555;">
                <span><strong>Template:</strong> {{ selectedSubmission?.template_name }}</span>
                <span><strong>Filler:</strong> {{ selectedSubmission?.fillerName }}</span>
                <span><strong>Date:</strong> {{ selectedSubmission?.created_at | date:'medium' }}</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <button mat-icon-button (click)="downloadSubmission()" matTooltip="Download all environments as .zip" style="margin-left: 1rem;">
                <mat-icon>download</mat-icon>
              </button>
              <button mat-stroked-button color="accent" (click)="duplicateAndEdit()" matTooltip="Duplicate and edit this submission">Duplicate & Edit</button>
              
            </div>
          </div>
          <mat-divider style="margin: 1rem 0;"></mat-divider>
          <div class="env-tabs" style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
            <button *ngFor="let env of environments"
                    [class.active]="selectedEnv === env"
                    (click)="onEnvTabChange(env)"
                    mat-raised-button
                    color="primary"
                    [ngStyle]="{ 'background-color': selectedEnv === env ? '#1976d2' : '#e3e3e3', 'color': selectedEnv === env ? '#fff' : '#333' }"
                    matTooltip="Show {{env}} config">
              {{ env }}
            </button>
          </div>
          <div style="background: #222; color: #e0e0e0; border-radius: 8px; padding: 1rem; min-height: 120px; max-height: 350px; overflow-x: auto; font-family: 'Fira Mono', 'Consolas', monospace; font-size: 1rem;">
            <pre style="margin: 0; white-space: pre-wrap; word-break: break-all;">{{ formattedSubmissionData }}</pre>
          </div>
          <div *ngIf="popupMessage" style="margin-top: 1rem; color: #d32f2f; text-align: center;">{{ popupMessage }}</div>
        </div>
      </div>
    </ng-template>
  `
})
export class SearchByFillerComponent {
  @Output() back = new EventEmitter<void>();
  @Output() duplicateEdit = new EventEmitter<{ template: string, submissionName: string }>();
  searchFillerName: string = '';
  searchResults: any[] = [];
  isSearching: boolean = false;
  selectedSubmission: any = null;
  environments = ['PROD', 'DEV', 'COB'];
  selectedEnv = 'PROD';
  formattedSubmissionData: string | null = null;
  popupMessage: string = '';

  constructor(private schemaService: SchemaService, private router: Router) {}

  onSearchByFiller() {
    console.log('Search button clicked, onSearchByFiller called');
    if (!this.searchFillerName){
      // console.log("inside if");
       return;}
    this.isSearching = true;
    this.schemaService.searchSubmissionsByFiller(this.searchFillerName).subscribe(results => {
      this.searchResults = results;
      this.isSearching = false;
    }, () => {
      this.isSearching = false;
    });
  }

  viewSubmission(sub: any) {
    this.selectedSubmission = sub;
    this.selectedEnv = 'PROD';
    this.formatSubmissionData();
  }

  onEnvTabChange(env: string) {
    this.selectedEnv = env;
    this.formatSubmissionData();
  }

  formatSubmissionData() {
    if (!this.selectedSubmission) {
      this.formattedSubmissionData = null;
      return;
    }
    const data = this.selectedSubmission.data?.data || this.selectedSubmission.data;
    this.formattedSubmissionData = this.formatAsConfEnv(data, this.selectedEnv);
  }

  private formatAsConfEnv(data: any, env: string): string {
    if (!data) return '';
    let confContent = '';
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = data[key];
        if (
          value && typeof value === 'object' &&
          (value.PROD !== undefined || value.DEV !== undefined || value.COB !== undefined)
        ) {
          const envVal = value[env];
          if (Array.isArray(envVal) && envVal.length && envVal[0] && typeof envVal[0] === 'object' && 'key' in envVal[0] && 'value' in envVal[0]) {
            const obj: any = {};
            envVal.forEach((pair: any) => {
              if (pair.key !== undefined) obj[pair.key] = pair.value !== undefined ? pair.value : '';
            });
            confContent += `${key}=${JSON.stringify(obj)}\n`;
          } else if (Array.isArray(envVal) && envVal.length === 0) {
            confContent += `${key}={}\n`;
          } else if (envVal === undefined || envVal === null) {
            confContent += `${key}=""\n`;
          } else {
            confContent += `${key}="${envVal}"\n`;
          }
        }
        else if (
          Array.isArray(value) &&
          value.length &&
          value[0] &&
          typeof value[0] === 'object' &&
          'key' in value[0] &&
          'value' in value[0]
        ) {
          const obj: any = {};
          value.forEach((pair: any) => {
            if (pair.key !== undefined) obj[pair.key] = pair.value !== undefined ? pair.value : '';
          });
          confContent += `${key}=${JSON.stringify(obj)}\n`;
        } else if (Array.isArray(value) && value.length === 0) {
          confContent += `${key}={}\n`;
        }
        else if (typeof value !== 'object' || value === null) {
          confContent += `${key}="${value ?? ''}"\n`;
        }
      }
    }
    return confContent;
  }

  async downloadSubmission() {
    if (!this.selectedSubmission) return;
    const submission = this.selectedSubmission;
    const submissionName = submission.submission_name;
    const confData = submission.data?.data || submission.data;
    const zip = new JSZip();
    for (const env of this.environments) {
      const confContent = this.formatAsConfEnv(confData, env);
      const fileName = `${submissionName}_${env}.conf`;
      zip.file(fileName, confContent);
    }
    const content = await zip.generateAsync({ type: 'blob' });
    const zipFileName = `${submissionName}_configs.zip`;
    if ('showSaveFilePicker' in window && typeof (window as any).showSaveFilePicker === 'function') {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: zipFileName,
          types: [{ description: 'Zip files', accept: { 'application/zip': ['.zip'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
      } catch (err) {
        if ((err as DOMException).name !== 'AbortError') {
          console.error('Could not save zip file:', err);
        }
      }
    } else {
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = zipFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  }

  async duplicateAndEdit() {
    if (!this.selectedSubmission) return;
    const templateName = this.selectedSubmission.template_name;
    const submissionName = this.selectedSubmission.submission_name;
    this.popupMessage = '';
    this.schemaService.duplicateSubmissionByName(templateName, submissionName).subscribe({
      next: (res: any) => {
        const newSubmissionName = res.submission_name;
        this.duplicateEdit.emit({ template: templateName, submissionName: newSubmissionName });
      },
      error: (err) => {
        this.popupMessage = 'Failed to duplicate submission. Please try again.';
      }
    });
  }
} 