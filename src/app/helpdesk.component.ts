import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-helpdesk',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="helpdesk-container">
      <div class="page-header">
        <button mat-stroked-button (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
          <span>Back to Templates</span>
        </button>
      </div>
      <mat-card>
        <mat-card-header>
          <mat-card-title>Helpdesk</mat-card-title>
          <mat-card-subtitle>Frequently Asked Questions & Support</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p>
            If you're facing an issue, please use the form below to submit a ticket to our support team.
          </p>

          <form [formGroup]="issueForm" (ngSubmit)="submitIssue()" class="issue-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Your Name</mat-label>
              <input matInput formControlName="name" required>
              <mat-error *ngIf="issueForm.get('name')?.hasError('required')">
                Name is required.
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Team Name</mat-label>
              <input matInput formControlName="teamName">
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Issue Description</mat-label>
              <textarea matInput formControlName="issueDescription" rows="5" required></textarea>
              <mat-error *ngIf="issueForm.get('issueDescription')?.hasError('required')">
                Issue description is required.
              </mat-error>
            </mat-form-field>

            <button mat-raised-button color="primary" type="submit" [disabled]="issueForm.invalid">
              Submit Issue
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .helpdesk-container {
      padding: 2rem;
      max-width: 900px;
      margin: auto;
    }
    .page-header {
      margin-bottom: 1.5rem;
    }
    .issue-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 1.5rem;
    }
    .full-width {
      width: 100%;
    }
  `]
})
export class HelpdeskComponent {
  issueForm: FormGroup;

  constructor(private router: Router, private fb: FormBuilder) {
    this.issueForm = this.fb.group({
      name: ['', Validators.required],
      teamName: [''],
      issueDescription: ['', Validators.required]
    });
  }

  goBack() {
    this.router.navigate(['/']);
  }

  submitIssue() {
    if (this.issueForm.valid) {
      console.log('Submitting issue:', this.issueForm.value);
      // TODO: Implement email sending logic here
      alert('Issue submitted successfully! (Check console for data)');
      this.issueForm.reset();
    }
  }
} 