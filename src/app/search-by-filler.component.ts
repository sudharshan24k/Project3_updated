import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SchemaService } from './dynamic-form/schema.service';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-search-by-filler',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatTooltipModule],
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
        <h2>Submission Details: {{ selectedSubmission?.submission_name }}</h2>
        <div class="card submission-data">
          <div class="submission-data-header">
            <h4>Submission Details</h4>
            <span>Template: {{ selectedSubmission?.template_name }}</span>
            <span style="margin-left: 1rem;">Filler: {{ selectedSubmission?.fillerName }}</span>
            <span style="margin-left: 1rem;">Date: {{ selectedSubmission?.created_at | date:'medium' }}</span>
          </div>
          <div class="env-tabs">
            <button *ngFor="let env of environments"
                    [class.active]="selectedEnv === env"
                    (click)="onEnvTabChange(env)">
              {{ env }}
            </button>
          </div>
          <pre>{{ formattedSubmissionData }}</pre>
        </div>
      </div>
    </ng-template>
  `
})
export class SearchByFillerComponent {
  @Output() back = new EventEmitter<void>();
  searchFillerName: string = '';
  searchResults: any[] = [];
  isSearching: boolean = false;
  selectedSubmission: any = null;
  environments = ['PROD', 'DEV', 'COB'];
  selectedEnv = 'PROD';
  formattedSubmissionData: string | null = null;

  constructor(private schemaService: SchemaService) {}

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
} 