import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AnimatedPopupComponent } from './animated-popup.component';
import { InteractiveDialogComponent } from './interactive-dialog.component';

@Component({
  selector: 'app-helpdesk',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatIconModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, AnimatedPopupComponent
  ],
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
              <input matInput formControlName="name">
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Team Name</mat-label>
              <input matInput formControlName="teamName">
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Issue Description</mat-label>
              <textarea matInput formControlName="issueDescription" rows="5"></textarea>
            </mat-form-field>

            <button mat-raised-button color="primary" type="submit">
              Submit Issue
            </button>
            <div *ngIf="staticSuccess" class="static-success-message">
              Issue submitted successfully!
            </div>
          </form>

          <app-animated-popup
            *ngIf="popupVisible"
            [message]="popupMessage"
            [type]="popupType"
            (close)="popupVisible = false"
          ></app-animated-popup>
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
    .static-success-message {
      color: #388e3c;
      background: #e8f5e9;
      border: 1px solid #c8e6c9;
      border-radius: 6px;
      padding: 0.7rem 1.2rem;
      margin-top: 1rem;
      font-size: 1.1rem;
      text-align: center;
      font-weight: 600;
      box-shadow: 0 2px 8px #388e3c22;
    }
  `]
})
export class HelpdeskComponent {
  @Output() close = new EventEmitter<void>();

  issueForm: FormGroup;
  popupMessage: string = '';
  popupType: 'success' | 'error' | 'airplane' = 'success';
  popupVisible = false;
  staticSuccess = false;

  constructor(private router: Router, private fb: FormBuilder) {
    this.issueForm = this.fb.group({
      name: [''],
      teamName: [''],
      issueDescription: ['']
    });
  }

  goBack() {
    this.close.emit();
  }

  submitIssue() {
    if (
      this.issueForm.get('name')?.value?.trim() ||
      this.issueForm.get('teamName')?.value?.trim() ||
      this.issueForm.get('issueDescription')?.value?.trim()
    ) {
      this.showPopup('Issue submitted successfully!', 'success');
      this.staticSuccess = true;
      setTimeout(() => { this.staticSuccess = false; }, 1800);
      this.issueForm.reset();
    }
  }

  showPopup(message: string, type: 'success' | 'error' | 'airplane' = 'success') {
    this.popupMessage = message;
    this.popupType = type;
    this.popupVisible = true;
    setTimeout(() => {
      this.popupVisible = false;
    }, 1800);
  }
}