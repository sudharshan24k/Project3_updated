import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { parseConfFile, strictParseConfFile, mapConfToPrefill, validateConfAgainstSchema, getConfigValidationFieldResults } from './dynamic-form/conf-parser';
import { SchemaService, TemplateInfo, TemplateSchema } from './dynamic-form/schema.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { Observable, of } from 'rxjs';
import { ConfigValidatorBoxComponent, ConfigValidationFieldResult } from './config-validator-box.component';

@Component({
  selector: 'app-upload-config-dialog',
  template: `
    <div class="responsive-dialog-wrapper">
      <div class="upload-dialog-container">
        <!-- Header -->
        <div class="dialog-header">
          <div class="header-content">
            <mat-icon class="header-icon">cloud_upload</mat-icon>
            <div class="header-text">
              <h2 mat-dialog-title>Upload Configuration File</h2>
              <p class="header-subtitle">Validate or create submissions from existing config files</p>
            </div>
          </div>
          <button mat-icon-button class="close-button enhanced-close" (click)="onCancel()" aria-label="Close dialog">
            <mat-icon fontIcon="close" class="close-x-icon"></mat-icon>
          </button>
        </div>

        <!-- GitHub Integration Button -->
        <button mat-raised-button color="accent" class="github-btn" (click)="connectToGitHub()">
          <mat-icon svgIcon="github" class="github-icon"></mat-icon>
          <span class="github-btn-text">Import Config from GitHub</span>
        </button>

        <!-- GitHub Repo/File Browser -->
        <div *ngIf="githubStep === 'repos'">
          <h3>Select a GitHub Repository</h3>
          <ul>
            <li *ngFor="let repo of githubRepos" (click)="listGitHubFiles(repo)">
              {{ repo.full_name }}
            </li>
          </ul>
        </div>
        <div *ngIf="githubStep === 'files'">
          <h3>Select a Config File</h3>
          <ul>
            <li *ngFor="let file of githubFiles" (click)="file.type === 'dir' ? listGitHubFiles(selectedRepo, getSafePath(file)) : fetchGitHubFile(file)">
              <mat-icon>{{ file.type === 'dir' ? 'folder' : 'description' }}</mat-icon>
              {{ file.name }}
            </li>
          </ul>
        </div>
        <div *ngIf="githubStep === 'preview'">
          <h3>Preview: {{ selectedFile.name }}</h3>
          <textarea [value]="githubFileContent" readonly style="width:100%;height:200px;"></textarea>
          <button mat-raised-button color="primary" (click)="importGitHubFile()">Import as Submission</button>
        </div>

        <!-- Progress Bar -->
        <div class="stepper-progress-bar">
          <div class="stepper-progress-fill" [style.width.%]="(currentStep-1)/2*100"></div>
        </div>
        <!-- Progress Steps -->
        <div class="progress-steps" *ngIf="!showValidatorBox">
          <div class="step" [class.completed]="currentStep > 1" [class.active]="currentStep === 1">
            <div class="step-number">1</div>
            <span class="step-label">Upload File</span>
          </div>
          <div class="step-connector" [class.completed]="currentStep > 1"></div>
          <div class="step" [class.completed]="currentStep > 2" [class.active]="currentStep === 2">
            <div class="step-number">2</div>
            <span class="step-label">Choose Action</span>
          </div>
          <div class="step-connector" [class.completed]="currentStep > 2"></div>
          <div class="step" [class.completed]="currentStep > 3" [class.active]="currentStep === 3">
            <div class="step-number">3</div>
            <span class="step-label">Configure</span>
          </div>
        </div>

        <mat-dialog-content class="dialog-content">
          <!-- Step 1: File Upload -->
          <div class="step-content" *ngIf="currentStep === 1 && !showValidatorBox">
            <div class="upload-area" 
                 [class.dragover]="isDragOver"
                 (dragover)="onDragOver($event)"
                 (dragleave)="onDragLeave($event)"
                 (drop)="onDrop($event)">
              
              <div class="upload-icon">
                <mat-icon>cloud_upload</mat-icon>
              </div>
              
              <div class="upload-text">
                <h3>Drop your config file here</h3>
                <p>or click to browse</p>
              </div>
              
              <input 
                type="file" 
                accept=".conf" 
                (change)="onFileSelected($event)"
                class="file-input"
                #fileInput
              />
              
              <button mat-stroked-button class="browse-button" (click)="fileInput.click()">
                <mat-icon>folder_open</mat-icon>
                Browse Files
              </button>
            </div>

            <!-- File Preview -->
            <div class="file-preview" *ngIf="fileName">
              <mat-card class="file-card">
                <div class="file-info">
                  <mat-icon class="file-icon">description</mat-icon>
                  <div class="file-details">
                    <h4>{{ fileName }}</h4>
                    <p class="file-size">{{ fileSize }}</p>
                  </div>
                  <mat-icon class="file-check" *ngIf="fileName">check_circle</mat-icon>
                  <button mat-icon-button class="remove-file" (click)="removeFile()">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              </mat-card>
            </div>

            <!-- Loading State -->
            <div class="loading-state" *ngIf="loading">
              <mat-progress-bar mode="indeterminate"></mat-progress-bar>
              <p>Processing config file...</p>
            </div>
          </div>

          <!-- Step 2: Action Selection -->
          <div class="step-content" *ngIf="currentStep === 2 && !showValidatorBox">
            <div class="action-selection">
              <h3>What would you like to do with this config file?</h3>
              
              <div class="action-cards">
                <mat-card class="action-card" (click)="chooseAction('validate')" [class.selected]="actionChosen === 'validate'">
                  <div class="card-content">
                    <mat-icon class="card-icon">verified</mat-icon>
                    <h4>Validate Configuration</h4>
                    <p>Check if your config file matches the template schema and identify any issues.</p>
                    <div class="card-features">
                      <span class="feature-chip">
                        <mat-icon>check_circle</mat-icon>
                        Schema Validation
                      </span>
                      <span class="feature-chip">
                        <mat-icon>error_outline</mat-icon>
                        Error Detection
                      </span>
                      <span class="feature-chip">
                        <mat-icon>warning</mat-icon>
                        Warning Alerts
                      </span>
                    </div>
                  </div>
                </mat-card>

                <mat-card class="action-card" (click)="chooseAction('edit')" [class.selected]="actionChosen === 'edit'">
                  <div class="card-content">
                    <mat-icon class="card-icon">edit</mat-icon>
                    <h4>Duplicate & Edit</h4>
                    <p>Create a new submission by importing data from your config file for editing.</p>
                    <div class="card-features">
                      <span class="feature-chip">
                        <mat-icon>content_copy</mat-icon>
                        Data Import
                      </span>
                      <span class="feature-chip">
                        <mat-icon>edit_note</mat-icon>
                        Form Editing
                      </span>
                      <span class="feature-chip">
                        <mat-icon>save</mat-icon>
                        Save Changes
                      </span>
                    </div>
                  </div>
                </mat-card>
              </div>
            </div>
          </div>

          <!-- Step 3: Configuration -->
          <div class="step-content" *ngIf="currentStep === 3 && !showValidatorBox">
            <div class="configuration-form">
              <h3>Configure Settings</h3>
              
              <!-- Template Selection -->
              <mat-form-field appearance="outline" class="full-width" *ngIf="filteredTemplates.length > 0">
                <mat-label>Template Name</mat-label>
                <input matInput 
                       name="templateName" 
                       [(ngModel)]="selectedTemplateName" 
                       (input)="onTemplateInput()" 
                       [matAutocomplete]="auto" 
                       placeholder="Type or select template name">
                <mat-icon matSuffix>template</mat-icon>
                <mat-autocomplete #auto="matAutocomplete" (optionSelected)="onTemplateSelected($event.option.value)">
                  <mat-option *ngFor="let t of filteredTemplates" [value]="t">
                    <div class="template-option">
                      <mat-icon>description</mat-icon>
                      <span>{{ t }}</span>
                    </div>
                  </mat-option>
                </mat-autocomplete>
              </mat-form-field>

              <!-- Version Selection -->
              <mat-form-field appearance="outline" class="full-width" *ngIf="selectedTemplateName && availableVersions.length > 0">
                <mat-label>Version</mat-label>
                <mat-select [(ngModel)]="selectedVersionTag" (selectionChange)="onVersionSelected()">
                  <mat-option *ngFor="let v of availableVersions" [value]="v">
                    <div class="version-option">
                      <mat-icon>version</mat-icon>
                      <span>{{ v }}</span>
                    </div>
                  </mat-option>
                </mat-select>
                <mat-icon matSuffix>update</mat-icon>
              </mat-form-field>

              <!-- Environment Selection -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Environment</mat-label>
                <mat-select [(ngModel)]="selectedEnvironment">
                  <mat-option value="PROD">
                    <div class="env-option prod">
                      <span class="env-letter prod">P</span>
                      <span>(PROD)</span>
                    </div>
                  </mat-option>
                  <mat-option value="DEV">
                    <div class="env-option dev">
                      <span class="env-letter dev">D</span>
                      <span>(DEV)</span>
                    </div>
                  </mat-option>
                  <mat-option value="COB">
                    <div class="env-option cob">
                      <span class="env-letter cob">B</span>
                      <span>(COB)</span>
                    </div>
                  </mat-option>
                </mat-select>
                <mat-icon matSuffix>environment</mat-icon>
              </mat-form-field>

              <!-- Action Buttons -->
              <div class="action-buttons">
                <button mat-stroked-button 
                        class="validate-btn" 
                        (click)="onValidate()" 
                        *ngIf="schema && actionChosen === 'validate'"
                        [disabled]="!schema || !selectedVersionTag || !selectedEnvironment">
                  <mat-icon>verified</mat-icon>
                  Validate Configuration
                </button>
                
                <button mat-raised-button 
                        color="primary" 
                        class="edit-btn" 
                        (click)="onUpdateAndEdit()" 
                        *ngIf="schema && actionChosen === 'edit'"
                        [disabled]="!schema || !selectedVersionTag || !selectedEnvironment">
                  <mat-icon>edit</mat-icon>
                  Duplicate & Edit
                </button>
              </div>
            </div>
          </div>
        </mat-dialog-content>

        <!-- Validation Results -->
        <app-config-validator-box *ngIf="showValidatorBox"
          [formName]="validatorBoxData?.formName ?? ''"
          [overallStatus]="validatorBoxData?.overallStatus ?? 'fail'"
          [data]="validatorBoxData"
          [parsedData]="parsedData"
          [schema]="schema"
          [extraFields]="validatorBoxData?.extraFields ?? []"
          [syntaxErrors]="validatorBoxData?.syntaxErrors ?? []"
          [validationErrors]="validatorBoxData?.validationErrors ?? []"
          [warnings]="validatorBoxData?.warnings ?? []"
          (close)="showValidatorBox = false">
        </app-config-validator-box>

        <!-- Footer Actions -->
        <mat-dialog-actions class="dialog-actions" *ngIf="!showValidatorBox">
          <div class="action-buttons">
            <button mat-button (click)="onCancel()" class="cancel-btn">
              <mat-icon>cancel</mat-icon>
              Cancel
            </button>
            
            <button mat-stroked-button 
                    (click)="previousStep()" 
                    *ngIf="currentStep > 1"
                    class="back-btn">
              <mat-icon>arrow_back</mat-icon>
              Back
            </button>
            
            <button mat-raised-button 
                    color="primary" 
                    (click)="nextStep()" 
                    *ngIf="currentStep < 3 && canProceedToNextStep()"
                    class="next-btn">
              <mat-icon>arrow_forward</mat-icon>
              Next
            </button>
          </div>
        </mat-dialog-actions>
      </div>
    </div>
  `,
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule, 
    MatDialogModule, 
    MatFormFieldModule, 
    MatInputModule, 
    MatAutocompleteModule, 
    MatOptionModule, 
    MatSelectModule,
    MatButtonModule, 
    MatIconModule,
    MatProgressBarModule,
    MatCardModule,
    MatChipsModule,
    ConfigValidatorBoxComponent
  ],
  styles: [`
    .upload-dialog-container {
      max-width: 800px;
      width: 80vw;
      height: 90vh;
      min-width: 320px;
      min-height: 600px;
      display: flex;
      flex-direction: column;
      animation: fadeSlideIn 0.5s cubic-bezier(0.4,0,0.2,1);
      background: #fff;
      border-radius: 14px;
      box-shadow: 0 8px 32px rgba(36,41,47,0.13);
      padding: 0 2.5rem 2rem 2.5rem;
    }

      /* Header container - centered layout */
      .dialog-header {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-top: 1rem;
        padding: 2rem 2.5rem 1.5rem 2.5rem;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        border-bottom: 1px solid #dee2e6;
        border-radius: 16px 16px 0 0;
        position: relative;
      }

      /* Header content - centered */
      .header-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 1rem;
      }

      /* Header icon - larger size */
      .header-icon {
        font-size: 3rem !important;
        width: 3rem !important;
        height: 3rem !important;
        color: #1976d2;
        margin-bottom: 0.5rem;
      }

      /* Header text container */
      .header-text {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 0.5rem;
      }

      /* Main title styling */
      .header-text h2 {
        font-size: 1.75rem;
        font-weight: 700;
        color: #2c3e50;
        margin: 0;
        letter-spacing: -0.02em;
        line-height: 1.2;
      }

      /* Subtitle styling */
      .header-subtitle {
        font-size: 1rem;
        color: #6c757d;
        margin: 0;
        font-weight: 400;
        line-height: 1.4;
        max-width: 400px;
      }

      /* Close button - remove circular background */
      .close-button.enhanced-close {
        position: absolute;
        top: 16px;
        right: 20px;
        z-index: 1000;
        background: transparent !important;
        border: none;
        color: #666;
        cursor: pointer;
        padding: 8px;
        border-radius: 0 !important;
        box-shadow: none !important;
        transition: color 0.2s ease, text-shadow 0.2s ease;
        width: auto;
        height: auto;
      }

      .close-button.enhanced-close:hover {
        background: transparent !important;
        color: #dc3545;
        text-shadow: 0 0 8px rgba(220, 53, 69, 0.6);
      }

      .close-x-icon {
        font-size: 1.8rem !important;
        width: 1.8rem !important;
        height: 1.8rem !important;
        background: none !important;
        border-radius: 0 !important;
      }

      /* Remove Material button styling */
      .close-button.enhanced-close .mat-mdc-button-base,
      .close-button.enhanced-close .mat-icon-button {
        background: transparent !important;
        border-radius: 0 !important;
        box-shadow: none !important;
      }

      .close-button.enhanced-close:hover .mat-mdc-button-base,
      .close-button.enhanced-close:hover .mat-icon-button {
        background: transparent !important;
      }


    .close-button {
      color: white;
    }

    .stepper-progress-bar {
      width: 100%;
      height: 7px;
      background: #e3e8ee;
      border-radius: 4px;
      margin: 0 0 1.2rem 0;
      overflow: hidden;
      position: relative;
      box-shadow: 0 1px 4px rgba(36,41,47,0.07);
    }
    .stepper-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #36d399 0%, #3b82f6 100%);
      border-radius: 4px;
      width: 0;
      transition: width 0.4s cubic-bezier(0.4,0,0.2,1);
    }
    .progress-steps {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem 2rem 0.5rem 2rem;
      background: transparent;
      border-bottom: none;
      margin-bottom: 0.5rem;
    }
    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      opacity: 0.5;
      transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
    }
    .step.active {
      opacity: 1;
      color: #3b82f6;
    }
    .step.completed {
      opacity: 1;
      color: #36d399;
    }
    .step-number {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      background: #e3e8ee;
      color: #888;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 1.2rem;
      margin-bottom: 0.2rem;
      transition: background 0.3s, color 0.3s;
    }
    .step.active .step-number {
      background: #3b82f6;
      color: #fff;
    }
    .step.completed .step-number {
      background: #36d399;
      color: #fff;
    }
    .step-label {
      font-size: 0.95rem;
      font-weight: 500;
      color: #888;
      transition: color 0.3s;
    }
    .step.active .step-label {
      color: #3b82f6;
    }
    .step.completed .step-label {
      color: #36d399;
    }
    .step-connector {
      width: 3rem;
      height: 2px;
      background: #e3e8ee;
      margin: 0 1rem;
      transition: background 0.3s;
    }
    .step-connector.completed {
      background: #36d399;
    }

    .dialog-content {
      flex: 1;
      padding: 2rem;
      overflow-y: auto;
    }

    .step-content {
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .upload-area {
      border: 2px dashed #b6c2d1;
      border-radius: 12px;
      padding: 3rem 2rem;
      text-align: center;
      transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
      cursor: pointer;
      position: relative;
      background: #f8fafc;
      
    }
    .upload-area:hover {
      border-color: #3b82f6;
      background: #e3e8ee;
    }
    .upload-area.dragover {
      border-color: #36d399;
      background: #e6fff6;
      transform: scale(1.02);
      box-shadow: 0 4px 16px rgba(54,211,153,0.08);
    }
    .upload-icon {
      margin-bottom: 1rem;
    }
    .upload-icon mat-icon {
      font-size: 4rem;
      width: 4rem;
      height: 4rem;
      color: var(--primary-color);
    }
    .upload-text h3 {
      margin: 0 0 0.5rem 0;
      color: var(--text-color);
      font-size: 1.25rem;
    }
    .upload-text p {
      margin: 0;
      color: var(--text-muted-color);
    }
    .file-input {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
    }
    .browse-button {
      margin-top: 1.5rem;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
    }
    .file-preview {
      margin-top: 1.5rem;
      animation: fileFadeIn 0.5s cubic-bezier(0.4,0,0.2,1);
    }
    @keyframes fileFadeIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }
    .file-card {
      border-radius: 8px;
      box-shadow: 0 2px 8px var(--shadow-color-light);
      display: flex;
      align-items: center;
      padding: 1rem 1.5rem;
      background: #fff;
      border: 1.5px solid #e3e8ee;
      position: relative;
      gap: 1rem;
    }
    .file-info {
      display: flex;
      align-items: center;
      gap: 1rem;
      width: 100%;
    }
    .file-icon {
      color: #3b82f6;
      font-size: 2rem;
    }
    .file-details h4 {
      margin: 0;
      color: #222;
      font-size: 1.1rem;
      font-weight: 600;
    }
    .file-size {
      margin: 0.25rem 0 0 0;
      color: #888;
      font-size: 0.95rem;
    }
    .file-check {
      color: #36d399;
      font-size: 2rem;
      margin-left: 0.5rem;
      animation: fileCheckPop 0.5s cubic-bezier(0.4,0,0.2,1);
    }
    @keyframes fileCheckPop {
      0% { transform: scale(0.7); opacity: 0; }
      60% { transform: scale(1.2); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
    .remove-file {
      margin-left: auto;
    }
    .loading-state {
      text-align: center;
      padding: 2rem;
    }
    .loading-state p {
      margin: 1rem 0 0 0;
      color: var(--text-muted-color);
    }
    .action-selection h3 {
      text-align: center;
      margin-bottom: 2rem;
      color: var(--text-color);
    }
    .action-cards {
      display: flex;
      flex-direction: row;
      gap: 2rem;
      align-items: stretch;
      width: 100%;
      justify-content: center;
    }
    .action-card {
      flex: 1 1 0;
      min-width: 260px;
      max-width: 600px;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      justify-content: stretch;
      min-height: 220px;
      transition: box-shadow 0.3s, transform 0.3s;
    }
    .action-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px var(--shadow-color-dark);
    }
    .action-card.selected {
      border-color: #3b82f6;
      background: #f0f8fc;
    }
    .card-content {
      text-align: center;
      padding: 1.2rem 1.2rem 1.2rem 1.2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
    }
    .card-icon {
      font-size: 2.2rem;
      margin-bottom: 0.7rem;
      color: #3b82f6;
    }
    .card-content h4 {
      margin: 0 0 0.7rem 0;
      color: #222;
      font-size: 1.15rem;
      font-weight: 600;
    }
    .card-content p {
      margin: 0 0 1rem 0;
      color: #666;
      font-size: 1rem;
      font-weight: 400;
    }
    .card-features {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      width: 100%;
      align-items: center;
    }
    .feature-chip {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: #f8fafc;
      border-radius: 6px;
      padding: 0.25rem 0.7rem;
      font-size: 0.97rem;
      color: #3b82f6;
      font-weight: 400;
      box-shadow: none;
    }
    .feature-chip mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: #36d399;
    }
    .configuration-form h3 {
      text-align: center;
      margin-bottom: 2rem;
      color: var(--text-color);
    }
    .full-width {
      width: 100%;
      margin-bottom: 1.5rem;
    }
    .template-option,
    .version-option,
    .env-option {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .env-option {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-weight: bold;
      font-size: 1.05rem;
    }
    .env-option.prod {
      color: #21ba45 !important; /* vivid green */
      font-weight: bold;
    }
    .env-option.dev {
      color: #2185d0 !important; /* vivid blue */
      font-weight: bold;
    }
    .env-option.cob {
      color: #f2711c !important; /* vivid orange */
      font-weight: bold;
    }
    /* Make sure selected and hovered options are also bold and visible */
    .mat-option.mat-selected .env-option,
    .mat-option:hover .env-option {
      filter: brightness(0.85);
      text-shadow: 0 1px 2px rgba(0,0,0,0.08);
      background: rgba(0,0,0,0.02);
    }
    .action-buttons {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 2rem;
    }
    .validate-btn,
    .edit-btn {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
    }
    .dialog-actions {
      padding: 1.5rem 2rem;
      border-top: 1px solid var(--border-color);
      background: var(--surface-color);
      border-radius: 0 0 12px 12px;
    }
    .dialog-actions .action-buttons {
      justify-content: space-between;
      margin: 0;
    }
    .cancel-btn,
    .back-btn,
    .next-btn {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
    }
    .next-btn {
      background: var(--primary-color);
      color: white;
    }
    .next-btn:hover {
      background: var(--accent-color);
    }
    @media (max-width: 900px) {
      .upload-dialog-container {
        max-width: 600px;
        width: 95vw;
        padding: 0 1rem 1.5rem 1rem;
      }
      .action-cards {
        flex-direction: column;
        gap: 1.2rem;
      }
      .action-card {
        max-width: 100%;
        min-width: 0;
      }
    }
    .github-btn {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 1.1rem;
      font-weight: 600;
      padding: 0.85rem 2.2rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      margin-bottom: 1.5rem;
      background: linear-gradient(90deg, #24292f 0%, #586069 100%);
      color: #fff;
      transition: background 0.2s, box-shadow 0.2s;
    }
    .github-btn:hover {
      background: linear-gradient(90deg, #24292f 0%, #0366d6 100%);
      box-shadow: 0 4px 16px rgba(36,41,47,0.15);
    }
    .github-icon {
      font-size: 2rem;
      width: 2rem;
      height: 2rem;
      color: #fff;
    }
    .github-btn-text {
      font-size: 1.1rem;
      font-weight: 600;
      letter-spacing: 0.01em;
    }
    .enhanced-close {
      background: #fff !important;
      border-radius: 50%;
      width: 2.8rem;
      height: 2.8rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s, box-shadow 0.2s, transform 0.1s;
      margin-left: 1rem;
    }
    .enhanced-close:hover {
      background: #f44336 !important;
      color: #fff !important;
      box-shadow: 0 4px 16px rgba(244,67,54,0.15);
      transform: scale(1.08);
    }
    .close-x-icon {
      font-size: 2rem;
      font-weight: bold;
      color: #333;
      transition: color 0.2s;
    }
    .enhanced-close:hover .close-x-icon {
      color: #fff;
    }
    @keyframes fadeSlideIn {
      from {
        opacity: 0;
        transform: translateY(32px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `]
})
export class UploadConfigDialogComponent {
  fileName: string = '';
  fileSize: string = '';
  rawConfigContent: string = '';
  parsedData: any = null;
  errorMessage: string = '';
  templates: TemplateInfo[] = [];
  baseTemplateNames: string[] = [];
  filteredTemplates: string[] = [];
  actionChosen: 'validate' | 'edit' | null = null;
  selectedTemplateVersion: string = '';
  selectedTemplateName: string = '';
  selectedVersionTag: string = '';
  allTemplateVersions: string[] = [];
  availableVersions: string[] = [];
  schema: any = null;
  validationResult: { valid: boolean, errors: string[], warnings: string[], extraFields?: string[], missingFields?: string[] } | null = null;
  loading = false;
  templateNameControl = new FormControl('');
  selectedEnvironment: 'PROD' | 'DEV' | 'COB' | '' = '';
  showValidatorBox = false;
  validatorBoxData: {
    formName: string;
    overallStatus: 'success' | 'fail';
    fieldResults: ConfigValidationFieldResult[];
    extraFields?: string[];
    missingFields?: string[];
    syntaxErrors?: string[];
    validationErrors?: string[];
    warnings?: string[];
  } | null = null;

  // Add property to hold syntax errors
  syntaxErrors: string[] = [];

  // Step management
  currentStep: number = 1;
  isDragOver: boolean = false;

  githubToken: string | null = null;
  githubRepos: any[] = [];
  githubFiles: any[] = [];
  githubFileContent: string = '';
  githubStep: 'repos' | 'files' | 'preview' | null = null;
  selectedRepo: any = null;
  selectedFile: any = null;

  constructor(
    public dialogRef: MatDialogRef<UploadConfigDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { template: any },
    private schemaService: SchemaService
  ) {
    this.schemaService.listTemplates().subscribe(templates => {
      this.templates = templates;
      // Only show unique base template names (no versions)
      const nameSet = new Set<string>();
      templates.forEach(t => {
        // Remove _vN or _vN_... from end for base name
        const base = t.name.replace(/_v\d+(_.*)?$/, '');
        nameSet.add(base);
      });
      this.baseTemplateNames = Array.from(nameSet);
      this.filteredTemplates = this.baseTemplateNames;
    });
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.conf')) {
        this.processFile(file);
      }
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.processFile(file);
    }
  }

  processFile(file: File) {
    this.fileName = file.name;
    this.fileSize = this.formatFileSize(file.size);
    this.loading = true;
    this.errorMessage = '';
    this.parsedData = null;
    this.actionChosen = null;
    
    const reader = new FileReader();
    reader.onload = () => {
      this.rawConfigContent = reader.result as string;
      this.loading = false;
      this.nextStep();
    };
    reader.readAsText(file);
  }

  removeFile() {
    this.fileName = '';
    this.fileSize = '';
    this.rawConfigContent = '';
    this.parsedData = null;
    this.actionChosen = null;
    this.currentStep = 1;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  nextStep() {
    if (this.canProceedToNextStep()) {
      this.currentStep++;
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  canProceedToNextStep(): boolean {
    switch (this.currentStep) {
      case 1:
        return !!this.fileName;
      case 2:
        return !!this.actionChosen;
      case 3:
        return !!this.selectedTemplateName && !!this.selectedVersionTag && !!this.selectedEnvironment;
      default:
        return false;
    }
  }

  chooseAction(action: 'validate' | 'edit') {
    this.actionChosen = action;
    this.selectedTemplateName = '';
    this.selectedVersionTag = '';
    this.schema = null;
    this.validationResult = null;
    this.availableVersions = [];
    
    // Parse config only after action is chosen
    if (this.rawConfigContent) {
      try {
        if (action === 'validate') {
          // Wait for schema to be selected, then parse strictly
          this.parsedData = null;
        } else {
          this.parsedData = parseConfFile(this.rawConfigContent);
        }
      } catch (e) {
        this.errorMessage = 'Failed to parse config file.';
        this.parsedData = null;
      }
    }
    
    this.nextStep();
  }

  onTemplateInput() {
    const val = this.selectedTemplateName.toLowerCase();
    this.filteredTemplates = this.baseTemplateNames.filter(t => t.toLowerCase().includes(val));
    this.availableVersions = [];
    this.selectedVersionTag = '';
    this.schema = null;
  }

  onTemplateSelected(name: string) {
    this.selectedTemplateName = name;
    this.loading = true;
    // Find all template versions for this base name
    const matchingTemplates = this.templates.filter(t => t.name.startsWith(name + '_v'));
    // Extract version names (e.g., framework_v1, framework_v2, ...)
    this.availableVersions = matchingTemplates.map(t => t.name);
    this.selectedVersionTag = '';
    this.schema = null;
    this.loading = false;
  }

  onVersionSelected() {
    if (!this.selectedVersionTag) {
      this.schema = null;
      return;
    }
    this.loading = true;
    // Fetch schema for selected version (by template name)
    this.schemaService.getTemplate(this.selectedVersionTag).subscribe({
      next: (resp) => {
        this.schema = resp.schema;
        this.loading = false;
        // For validation, parse strictly now that schema is available
        if (this.actionChosen === 'validate' && this.rawConfigContent) {
          const strictResult = strictParseConfFile(this.rawConfigContent, this.schema);
          this.parsedData = strictResult.parsed;
          this.syntaxErrors = strictResult.syntaxErrors;
        }
      },
      error: (err: any) => {
        this.errorMessage = 'Failed to fetch version schema.';
        this.loading = false;
      }
    });
  }

  onValidate() {
    if (!this.schema) return;
    
    // Use strict parser result
    const strictResult = strictParseConfFile(this.rawConfigContent, this.schema);
    this.parsedData = strictResult.parsed;
    const syntaxErrors = strictResult.syntaxErrors;
    
    // Compute extra/missing fields
    const configKeys = Object.keys(this.parsedData || {});
    const schemaKeys = (this.schema.fields || []).map((f: any) => f.key);
    const extraFields = configKeys.filter(k => !schemaKeys.includes(k));
    const missingFields = schemaKeys.filter((k: string) => !(configKeys.includes(k)));
    
    this.validationResult = validateConfAgainstSchema(this.parsedData, this.schema);
    this.validationResult.extraFields = extraFields;
    this.validationResult.missingFields = missingFields;
    
    // Prepare data for validator box
    const fieldResults: ConfigValidationFieldResult[] = getConfigValidationFieldResults(this.parsedData, this.schema);
    
    // ✅ CRITICAL FIX: Consider BOTH syntax errors AND validation errors
    const hasSyntaxErrors = syntaxErrors && syntaxErrors.length > 0;
    const hasValidationErrors = this.validationResult.errors && this.validationResult.errors.length > 0;
    const overallValid = !hasSyntaxErrors && !hasValidationErrors;
    
    this.validatorBoxData = {
      formName: this.selectedTemplateName,
      overallStatus: overallValid ? 'success' : 'fail', // ✅ Now considers both error types
      fieldResults,
      extraFields,
      missingFields,
      syntaxErrors: syntaxErrors || [],
      validationErrors: this.validationResult.errors || [],
      warnings: this.validationResult.warnings || []
    };
    
    this.showValidatorBox = true;
  }

  onUpdateAndEdit() {
    if (!this.schema || !this.selectedTemplateName || !this.selectedVersionTag || !this.selectedEnvironment) return;
    // Use existing mapping logic for duplicate & edit
    const prefillData = mapConfToPrefill(this.parsedData, this.schema);
    // Only pass the selected environment's data for environment-specific fields
    const env = this.selectedEnvironment;
    const filteredPrefill: any = { ...prefillData };
    if (this.schema.fields && Array.isArray(this.schema.fields)) {
      this.schema.fields.forEach((field: any) => {
        if (field.environmentSpecific && filteredPrefill[field.key] && typeof filteredPrefill[field.key] === 'object') {
          let envVal = filteredPrefill[field.key][env];
          // Fix for keyvalue (env): always array of {key, value}
          if (field.type === 'keyvalue') {
            if (!Array.isArray(envVal)) {
              if (envVal && typeof envVal === 'object') {
                envVal = Object.entries(envVal).map(([k, v]) => ({ key: k, value: v }));
              } else {
                envVal = [];
              }
            }
          }
          // Fix for mcq_multiple (env): always array of strings
          if (field.type === 'mcq_multiple') {
            if (!Array.isArray(envVal)) {
              if (typeof envVal === 'string' && envVal) {
                envVal = [envVal];
              } else {
                envVal = [];
              }
            }
          }
          filteredPrefill[field.key] = { [env]: envVal };
        }
      });
    }
    this.dialogRef.close({
      action: 'updateAndEdit',
      parsedData: this.parsedData,
      prefillData: filteredPrefill,
      selectedTemplateName: this.selectedTemplateName,
      selectedVersionTag: this.selectedVersionTag,
      selectedEnvironment: this.selectedEnvironment
    });
  }

  onCancel() {
    this.dialogRef.close();
  }

  connectToGitHub() {
    const clientId = 'YOUR_CLIENT_ID'; // Replace with your GitHub OAuth app client ID
    const redirectUri = window.location.origin + '/github-callback';
    const scope = 'repo read:org';
    const state = Math.random().toString(36).substring(2);
    sessionStorage.setItem('github_oauth_state', state);
    window.location.href =
      `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;
  }

  // Call this in ngOnInit if code is present in URL
  exchangeCodeForToken(code: string, state: string) {
    if (state !== sessionStorage.getItem('github_oauth_state')) {
      alert('OAuth state mismatch!');
      return;
    }
    fetch('http://localhost:8000/github/oauth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.access_token) {
          this.githubToken = data.access_token;
          sessionStorage.setItem('github_token', this.githubToken || '');
          this.listGitHubRepos();
        } else {
          alert('GitHub auth failed');
        }
      });
  }

  listGitHubRepos() {
    fetch('https://api.github.com/user/repos', {
      headers: { Authorization: `token ${this.githubToken}` },
    })
      .then(res => res.json())
      .then(repos => {
        this.githubRepos = repos;
        this.githubStep = 'repos';
      });
  }

  listGitHubFiles(repo: any, path?: string | null) {
    this.selectedRepo = repo;
    const safePath = path ?? '';
    fetch(`https://api.github.com/repos/${repo.owner.login}/${repo.name}/contents/${safePath}`, {
      headers: { Authorization: `token ${this.githubToken}` },
    })
      .then(res => res.json())
      .then(files => {
        this.githubFiles = files;
        this.githubStep = 'files';
      });
  }

  fetchGitHubFile(file: any) {
    this.selectedFile = file;
    fetch(file.url, {
      headers: { Authorization: `token ${this.githubToken}` },
    })
      .then(res => res.json())
      .then(data => {
        this.githubFileContent = atob(data.content.replace(/\n/g, ''));
        this.githubStep = 'preview';
      });
  }

  importGitHubFile() {
    // Use this.githubFileContent as if it was uploaded from local
    // Call your existing import/validation logic here
    this.rawConfigContent = this.githubFileContent;
    // Optionally, trigger validation or move to next step
    this.currentStep = 2; // or whatever is appropriate
    this.githubStep = null;
  }

  getSafePath(file: any): string {
    return file && file.path ? file.path : '';
  }

  onSubmitConfig() {
    // TODO: Implement submission logic for config step
    console.log('Submit button clicked in Configure step');
  }
}