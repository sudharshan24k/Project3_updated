import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ValidatorFn, ReactiveFormsModule, FormArray, FormControl } from '@angular/forms';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SchemaService, TemplateSchema } from './schema.service';

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatCheckboxModule, MatCardModule, NgIf, NgFor, MatIconModule, MatTooltipModule],
  template: `
    <div class="dynamic-form-container">
      <header class="page-header">
        <button (click)="closeForm()" class="back-button">
          <mat-icon>arrow_back</mat-icon>
          <span>Back to Templates</span>
        </button>
        <div>
          <h1 class="form-title">{{ title }}</h1>
          <p class="form-subtitle" *ngIf="schema.description">{{ schema.description }}</p>
        </div>
        <div class="header-actions">
           <button *ngIf="isEditMode" (click)="onSubmit()" [disabled]="!isFormValid()" mat-raised-button>
             <mat-icon>save</mat-icon> {{ submitButtonText }}
           </button>
           <button *ngIf="!isEditMode && mode !== 'preview'" (click)="onSubmit()" [disabled]="form.invalid" mat-raised-button>
             <mat-icon>send</mat-icon> {{ submitButtonText }}
           </button>
        </div>
      </header>

      <div *ngIf="isLoading" class="loading-spinner">Loading form...</div>

      <main class="form-grid" *ngIf="!isLoading">
        <!-- Left Panel: Form Filling / Preview -->
        <div class="form-panel card" [class.full-width]="!isEditMode">
          <header class="panel-header">
            <h3>{{ isEditMode ? 'Live Preview' : 'Complete the Form' }}</h3>
            <p class="panel-subtitle" *ngIf="isEditMode">This is how your form will look to users.</p>
          </header>
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div *ngFor="let field of visibleFields" class="form-field" [ngSwitch]="field.type">
              <label>{{ field.label }} <span *ngIf="isFieldRequired(field)" class="required-asterisk">*</span></label>
              
              <input *ngSwitchCase="'text'" [formControlName]="field.key" [placeholder]="field.placeholder || ''" [readOnly]="isReadOnly || !field.editable">
              <input *ngSwitchCase="'number'" type="number" [formControlName]="field.key" [placeholder]="field.placeholder || ''" [readOnly]="isReadOnly || !field.editable">
              <input *ngSwitchCase="'email'" type="email" [formControlName]="field.key" [placeholder]="field.placeholder || ''" [readOnly]="isReadOnly || !field.editable" required>
              
              <select *ngSwitchCase="'boolean'" [formControlName]="field.key" [attr.disabled]="isReadOnly || !field.editable ? true : null">
                <option [ngValue]="true">True</option>
                <option [ngValue]="false">False</option>
              </select>

              <select *ngSwitchCase="'dropdown'" [formControlName]="field.key" [attr.disabled]="isReadOnly || !field.editable ? true : null">
                <option *ngFor="let opt of field.options" [value]="opt.value">{{ opt.label }}</option>
              </select>

              <div *ngIf="form.get(field.key)?.invalid && form.get(field.key)?.touched" class="error-message">
                This field is required or invalid.
              </div>
            </div>
          </form>
        </div>

        <!-- Right Panel: Template Schema Editor -->
        <div class="schema-editor-panel card" *ngIf="isEditMode">
           <header class="panel-header">
            <h3>Schema Editor</h3>
            <p class="panel-subtitle">Define the structure of your form.</p>
          </header>
          <div class="form-field">
            <label>Template Name</label>
            <input [(ngModel)]="schema.name" placeholder="A unique name for this template" [ngModelOptions]="{standalone: true}" [disabled]="mode === 'edit'">
          </div>
          <div class="form-field">
            <label>Template Description</label>
            <input [(ngModel)]="schema.description" placeholder="A short description of the form's purpose" [ngModelOptions]="{standalone: true}">
          </div>

          <hr class="section-divider">

          <div class="field-list-header">
            <h4>Fields</h4>
            <button class="add-field-btn" (click)="showAddFieldEditor()" *ngIf="!isFieldEditorVisible">
              <mat-icon>add</mat-icon> Add Field
            </button>
          </div>
          
          <div class="field-list">
            <div *ngFor="let field of schema.fields; let i = index" class="field-item">
              <div>
                <strong class="field-label">{{ field.label }}</strong>
                <span class="field-meta">{{ field.key }} &middot; {{ field.type }}</span>
              </div>
              <div class="field-actions">
                <button (click)="editField(i)" mat-icon-button matTooltip="Edit Field">
                  <mat-icon>edit</mat-icon>
                </button>
                <button class="action-delete" (click)="removeField(i)" mat-icon-button matTooltip="Remove Field">
                  <mat-icon>delete_outline</mat-icon>
                </button>
              </div>
            </div>
             <p *ngIf="schema.fields.length === 0" class="no-fields-message">No fields added yet.</p>
          </div>

          <!-- Add/Edit Field Form -->
          <div *ngIf="isFieldEditorVisible" class="field-editor-form enhanced-card">
            <h5>{{ currentFieldIndex === null ? 'Add New Field' : 'Edit Field' }}</h5>
            
            <!-- Basic Info Section -->
            <div class="section-heading"><mat-icon>info</mat-icon> Basic Info</div>
            <form [formGroup]="fieldForm" class="field-form-grid">
              <div class="form-field span-2">
                <label>Field Label <span class="required-asterisk">*</span></label>
                <input formControlName="label" placeholder="Visible label (e.g., 'First Name')">
                <div *ngIf="fieldForm.get('label')?.invalid && fieldForm.get('label')?.touched" class="error-message">Label is required.</div>
              </div>
              <div class="form-field">
                <label>Field Key <span class="required-asterisk">*</span></label>
                <input formControlName="key" placeholder="unique_key">
                <div *ngIf="fieldForm.get('key')?.invalid && fieldForm.get('key')?.touched" class="error-message">Key is required and must be alphanumeric/underscore.</div>
              </div>
              <div class="form-field">
                <label>Field Type</label>
                <div class="type-select-group">
                  <mat-icon *ngIf="fieldForm.get('type')?.value === 'text'">text_fields</mat-icon>
                  <mat-icon *ngIf="fieldForm.get('type')?.value === 'number'">pin</mat-icon>
                  <mat-icon *ngIf="fieldForm.get('type')?.value === 'email'">email</mat-icon>
                  <mat-icon *ngIf="fieldForm.get('type')?.value === 'boolean'">toggle_on</mat-icon>
                  <mat-icon *ngIf="fieldForm.get('type')?.value === 'dropdown'">arrow_drop_down_circle</mat-icon>
                  <select formControlName="type">
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="email">Email</option>
                    <option value="boolean">Boolean</option>
                    <option value="dropdown">Dropdown</option>
                  </select>
                </div>
              </div>

              <div class="section-heading"><mat-icon>tune</mat-icon> Field Settings</div>
              <div class="form-field span-2">
                <label>Placeholder / Help Text</label>
                <input formControlName="placeholder" placeholder="Help text inside the input or for checkbox">
              </div>
              <div class="form-field">
                <label>Default Value</label>
                <input formControlName="defaultValue" placeholder="Optional default value">
              </div>
              <div class="form-field" *ngIf="fieldForm.get('type')?.value === 'text'">
                <label>Validation Regex <mat-icon matTooltip="Pattern the input must match (e.g., ^[a-zA-Z]+$)">help_outline</mat-icon></label>
                <input formControlName="regex" placeholder="e.g., ^[a-zA-Z]+$">
              </div>
              
              <div class="checkbox-group span-2">
                <div class="checkbox-wrapper">
                  <input type="checkbox" formControlName="required" id="field-required"> 
                  <label for="field-required">Required Field <mat-icon matTooltip="User must fill this field">help_outline</mat-icon></label>
                </div>
                <div class="checkbox-wrapper">
                  <input type="checkbox" formControlName="editable" id="field-editable">
                  <label for="field-editable">User Editable <mat-icon matTooltip="If unchecked, field is visible but not editable">help_outline</mat-icon></label>
                </div>
              </div>

              <!-- Dropdown Options Section -->
              <div *ngIf="fieldForm.get('type')?.value === 'dropdown'" class="dropdown-options-editor span-2">
                <div class="section-heading"><mat-icon>list</mat-icon> Dropdown Options</div>
                <div formArrayName="options">
                   <div *ngFor="let option of options.controls; let i = index" [formGroupName]="i" class="option-item">
                    <input formControlName="label" placeholder="Option Label">
                    <input formControlName="value" placeholder="Option Value">
                    <button type="button" class="action-delete" (click)="removeOption(i)" mat-icon-button matTooltip="Remove Option">
                      <mat-icon>remove_circle_outline</mat-icon>
                    </button>
                  </div>
                  <div *ngIf="options.length === 0" class="no-options-message">No options added yet.</div>
                </div>
                <button type="button" class="add-option-btn" (click)="addOption()">
                   <mat-icon>add</mat-icon> Add Option
                </button>
              </div>

              <!-- Conditional Logic Section -->
              <div class="section-heading"><mat-icon>rule</mat-icon> Conditional Logic</div>
              <div class="form-field">
                <label>Visible If <mat-icon matTooltip="Show this field only if another field has a certain value">help_outline</mat-icon></label>
                <div class="conditional-group">
                  <select [(ngModel)]="visibleIfKey" [ngModelOptions]="{standalone: true}" (ngModelChange)="visibleIfValue = null">
                    <option [ngValue]="null">-- None --</option>
                    <option *ngFor="let f of schema.fields" [ngValue]="f.key" [disabled]="f.key === fieldForm.value.key">{{ f.label }}</option>
                  </select>
                  <ng-container *ngIf="visibleIfKey">
                    <select *ngIf="isBooleanField(visibleIfKey)" [(ngModel)]="visibleIfValue" [ngModelOptions]="{standalone: true}">
                      <option [ngValue]="true">true</option>
                      <option [ngValue]="false">false</option>
                    </select>
                    <input *ngIf="!isBooleanField(visibleIfKey)" [(ngModel)]="visibleIfValue" [ngModelOptions]="{standalone: true}" placeholder="Value (e.g. true, 1, etc.)">
                  </ng-container>
                </div>
              </div>
              <div class="form-field">
                <label>Mandatory If <mat-icon matTooltip="Make this field required only if another field has a certain value">help_outline</mat-icon></label>
                <div class="conditional-group">
                  <select [(ngModel)]="mandatoryIfKey" [ngModelOptions]="{standalone: true}" (ngModelChange)="mandatoryIfValue = null">
                    <option [ngValue]="null">-- None --</option>
                    <option *ngFor="let f of schema.fields" [ngValue]="f.key" [disabled]="f.key === fieldForm.value.key">{{ f.label }}</option>
                  </select>
                  <ng-container *ngIf="mandatoryIfKey">
                    <select *ngIf="isBooleanField(mandatoryIfKey)" [(ngModel)]="mandatoryIfValue" [ngModelOptions]="{standalone: true}">
                      <option [ngValue]="true">true</option>
                      <option [ngValue]="false">false</option>
                    </select>
                    <input *ngIf="!isBooleanField(mandatoryIfKey)" [(ngModel)]="mandatoryIfValue" [ngModelOptions]="{standalone: true}" placeholder="Value (e.g. true, 1, etc.)">
                  </ng-container>
                </div>
              </div>

              <!-- Save/Cancel Actions -->
              <div class="field-editor-actions span-2">
                <button type="button" (click)="isFieldEditorVisible = false" class="secondary">Cancel</button>
                <button type="button" (click)="saveField()" [disabled]="fieldForm.invalid" mat-raised-button color="primary">
                  <mat-icon>save</mat-icon> Save Field
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Preview Mode: Show Field Conditions Panel -->
        <div *ngIf="mode === 'preview'" class="conditions-panel card">
          <header class="panel-header">
            <h3><mat-icon>info</mat-icon> Field Conditions & Rules</h3>
            <p class="panel-subtitle">Below are all the conditions and rules defined for each field in this template.</p>
          </header>
          <div class="conditions-list">
            <div *ngFor="let field of schema.fields" class="condition-item">
              <div class="condition-title">
                <mat-icon>label</mat-icon>
                <strong>{{ field.label }}</strong>
                <span class="field-meta">({{ field.key }}, {{ field.type }})</span>
              </div>
              <ul class="condition-details">
                <li *ngIf="field.required"><mat-icon>check_circle</mat-icon> <b>Required</b></li>
                <li *ngIf="!field.required"><mat-icon>radio_button_unchecked</mat-icon> Optional</li>
                <li *ngIf="field.editable === false"><mat-icon>lock</mat-icon> <b>Non-editable</b></li>
                <li *ngIf="field.regex"><mat-icon>code</mat-icon> Regex: <code>{{ field.regex }}</code></li>
                <li *ngIf="field.visibleIf"><mat-icon>visibility</mat-icon> <b>Visible if</b>: <code>{{ field.visibleIf.key }}</code> = <code>{{ field.visibleIf.value }}</code></li>
                <li *ngIf="field.mandatoryIf"><mat-icon>assignment_turned_in</mat-icon> <b>Required if</b>: <code>{{ field.mandatoryIf.key }}</code> = <code>{{ field.mandatoryIf.value }}</code></li>
                <li *ngIf="field.type === 'dropdown' && field.options"><mat-icon>arrow_drop_down_circle</mat-icon> Options: <span *ngFor="let opt of field.options; let last = last">{{ opt.label || opt }}<span *ngIf="!last">, </span></span></li>
                <li *ngIf="field.type === 'boolean'"><mat-icon>toggle_on</mat-icon> Boolean (True/False)</li>
                <li *ngIf="field.placeholder"><mat-icon>info</mat-icon> Placeholder: <i>{{ field.placeholder }}</i></li>
                <li *ngIf="field.defaultValue !== undefined && field.defaultValue !== null"><mat-icon>star</mat-icon> Default: <code>{{ field.defaultValue }}</code></li>
                <li *ngIf="field.created_at"><mat-icon>calendar_today</mat-icon> Field Created: {{ field.created_at | date:'medium' }}</li>
                <li *ngIf="field.updated_at"><mat-icon>update</mat-icon> Field Updated: {{ field.updated_at | date:'medium' }}</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Preview Mode: Show Template Timestamps -->
        <div *ngIf="mode === 'preview'" class="template-timestamps card">
          <div class="timestamp-row">
            <mat-icon>calendar_today</mat-icon>
            <span><b>Created:</b> {{ schema.created_at | date:'medium' }}</span>
            <mat-icon>update</mat-icon>
            <span><b>Last Updated:</b> {{ schema.updated_at | date:'medium' }}</span>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .dynamic-form-container {
      max-width: 1600px;
      margin: 0 auto;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding: 0 1rem;
    }
    .back-button {
      background: none; border: none; padding: 0; display: flex;
      align-items: center; gap: 0.5rem; color: var(--primary-color);
      font-size: 1rem; font-weight: 700; cursor: pointer;
    }
    .back-button:hover {
      text-decoration: underline;
    }
    .form-title { margin: 0; font-size: 1.8rem; }
    .form-subtitle { margin: 0.25rem 0 0; color: var(--text-muted-color); }
    .header-actions button {
        display: flex; align-items: center; gap: 0.5rem;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 2rem;
    }
    @media (min-width: 1024px) {
      .form-grid {
        grid-template-columns: 1fr 1.2fr;
      }
    }
    .form-panel.full-width {
      grid-column: 1 / -1;
      max-width: 800px;
      margin: 0 auto;
    }
    .form-panel.card {
      background: linear-gradient(135deg, var(--background-color) 60%, #e9ecf1 100%);
      box-shadow: 0 4px 24px var(--shadow-color-light);
      border-radius: 18px;
      padding: 2.5rem 2rem;
      margin-bottom: 2rem;
      transition: box-shadow 0.2s;
    }
    .form-panel.card:hover {
      box-shadow: 0 8px 32px var(--shadow-color-dark);
    }
    .panel-header {
      margin-bottom: 2.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border-color);
    }
    .form-panel .form-field {
      background: var(--surface-color);
      border-radius: 10px;
      box-shadow: 0 1px 4px var(--shadow-color-light);
      padding: 1.25rem 1rem 0.5rem 1rem;
      margin-bottom: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      transition: box-shadow 0.2s, border 0.2s;
    }
    .form-panel .form-field:focus-within {
      box-shadow: 0 2px 8px var(--shadow-color-dark);
      border: 1px solid var(--primary-color);
    }
    .form-panel label {
      font-size: 1.05rem;
      color: var(--text-muted-color);
      font-weight: 700;
      margin-bottom: 0.25rem;
    }
    .form-panel input,
    .form-panel select {
      font-size: 1.1rem;
      padding: 0.7rem 1rem;
      border-radius: 6px;
      border: 1px solid var(--border-color);
      background: #f8fafc;
      color: var(--text-color);
      transition: border 0.2s, box-shadow 0.2s;
    }
    .form-panel input:focus,
    .form-panel select:focus {
      border: 1.5px solid var(--primary-color);
      outline: none;
      box-shadow: 0 0 0 2px var(--secondary-color);
    }
    .form-panel .required-asterisk {
      color: var(--danger-color);
      margin-left: 0.2rem;
    }
    .form-panel .error-message {
      color: var(--danger-color);
      font-size: 0.9rem;
      margin-top: 0.25rem;
      font-weight: 500;
    }

    .checkbox-wrapper { display: flex; align-items: center; gap: 0.5rem; }
    .checkbox-wrapper input[type="checkbox"] { width: auto; }
    .checkbox-wrapper label { margin: 0; font-weight: 400; color: var(--text-color); }

    /* Schema Editor Specifics */
    .section-divider {
      border: 0;
      height: 1px;
      background-color: var(--border-color);
      margin: 2rem 0;
    }
    .field-list-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }
    .field-list-header h4 { margin: 0; }
    .add-field-btn {
        background: none;
        border: 1px solid var(--primary-color);
        color: var(--primary-color);
        padding: 0.4rem 0.8rem;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 700;
        font-size: 0.8rem;
    }
    .add-field-btn:hover {
        background-color: var(--primary-color);
        color: var(--surface-color);
    }

    .field-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .field-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 1rem; border-radius: 8px; background-color: var(--background-color);
    }
    .field-label { color: var(--text-color); }
    .field-meta { font-size: 0.8rem; color: var(--text-muted-color); margin-left: 0.5rem; }
    .no-fields-message { color: var(--text-muted-color); text-align: center; padding: 1rem; }
    
    .field-actions .mat-icon { color: var(--text-muted-color); }
    .field-actions button:hover .mat-icon { color: var(--primary-color); }
    .field-actions .action-delete:hover .mat-icon { color: var(--danger-color); }

    .field-editor-form {
      background-color: var(--background-color);
      padding: 1.5rem;
      border-radius: 8px;
      margin-top: 1rem;
    }
    .field-editor-form h5 { margin-top: 0; }
    
    .field-form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }
    .span-2 { grid-column: span 2; }

    .checkbox-group {
        display: flex;
        gap: 2rem;
        align-items: center;
    }

    .dropdown-options-editor { margin-top: 1rem; }
    .dropdown-options-editor h6 { margin-top: 0; margin-bottom: 1rem; }
    .option-item {
      display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;
    }
    .option-item input { flex-grow: 1; }
    
    .add-option-btn {
      background: none; border: 1px dashed var(--secondary-color); color: var(--text-muted-color);
      padding: 0.5rem; width: 100%; border-radius: 6px; cursor: pointer; margin-top: 0.5rem;
      display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      transition: all 0.2s ease;
    }
    .add-option-btn:hover {
        background-color: var(--secondary-color);
        color: var(--text-color);
    }

    .field-editor-actions {
      display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem;
    }

    .conditions-panel.card {
      background: linear-gradient(135deg, var(--background-color) 60%, #f3f6fa 100%);
      box-shadow: 0 2px 12px var(--shadow-color-light);
      border-radius: 16px;
      padding: 2rem 1.5rem;
      margin-bottom: 2rem;
      max-width: 900px;
      margin-left: auto;
      margin-right: auto;
    }
    .conditions-list {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .condition-item {
      background: var(--surface-color);
      border-radius: 10px;
      box-shadow: 0 1px 4px var(--shadow-color-light);
      padding: 1.25rem 1rem 0.5rem 1rem;
      margin-bottom: 0.5rem;
    }
    .condition-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.1rem;
      color: var(--primary-color);
      margin-bottom: 0.5rem;
    }
    .condition-title mat-icon {
      font-size: 1.2rem;
      color: var(--primary-color);
    }
    .field-meta {
      font-size: 0.9rem;
      color: var(--text-muted-color);
      margin-left: 0.5rem;
    }
    .condition-details {
      list-style: none;
      padding-left: 0;
      margin: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 1.2rem;
      font-size: 1rem;
      color: var(--text-color);
    }
    .condition-details mat-icon {
      font-size: 1rem;
      vertical-align: middle;
      margin-right: 0.2rem;
      color: var(--secondary-color);
    }
    .condition-details code {
      background: #f0f2f5;
      border-radius: 4px;
      padding: 0.1rem 0.4rem;
      font-size: 0.95em;
      color: #2d3a4a;
    }
    .condition-details i {
      color: var(--text-muted-color);
    }

    .template-timestamps.card {
      background: linear-gradient(90deg, #e3eafc 60%, #f3f6fa 100%);
      box-shadow: 0 1px 6px var(--shadow-color-light);
      border-radius: 12px;
      padding: 1.2rem 1.5rem;
      margin-bottom: 1.5rem;
      max-width: 900px;
      margin-left: auto;
      margin-right: auto;
      display: flex;
      align-items: center;
      justify-content: flex-start;
    }
    .timestamp-row {
      display: flex;
      align-items: center;
      gap: 1.2rem;
      font-size: 1.08rem;
      color: var(--text-muted-color);
    }
    .timestamp-row mat-icon {
      font-size: 1.1rem;
      color: var(--primary-color);
      vertical-align: middle;
    }
  `]
})
export class DynamicForm implements OnInit, OnChanges {
  @Input() mode: 'create' | 'edit' | 'use' | 'preview' | 'list' | 'submissions' = 'use';
  @Input() templateName: string | null = null;
  @Input() prefillVersion: number | null = null;
  @Output() formClose = new EventEmitter<void>();

  form: FormGroup;
  fieldForm: FormGroup;
  schema: any = { name: '', description: '', fields: [] };
  isLoading = false;
  isReadOnly = false;
  isEditMode = false;
  isFieldEditorVisible = false;
  currentFieldIndex: number | null = null;
  title = '';
  submitButtonText = '';

  // Temporary properties for conditional logic fields
  visibleIfKey: string | null = null;
  visibleIfValue: any = null;
  mandatoryIfKey: string | null = null;
  mandatoryIfValue: any = null;

  submissionVersion: number | null = null;
  isDuplicatedEdit: boolean = false;

  // --- Add for dynamic conditional logic ---
  get visibleFields() {
    return this.schema.fields.filter((field: any) => this.isFieldVisible(field));
  }

  isFieldVisible(field: any): boolean {
    if (!field.visibleIf || !field.visibleIf.key) return true;
    const controllingValue = this.form?.get(field.visibleIf.key)?.value;
    let values = field.visibleIf.value;
    if (typeof values === 'string') {
      values = values.split(',').map((v: string) => v.trim());
    } else if (!Array.isArray(values)) {
      values = [values];
    }
    // Normalize booleans
    const normalized = (v: any) => {
      if (typeof controllingValue === 'boolean') {
        if (v === true || v === 'true') return true;
        if (v === false || v === 'false') return false;
      }
      return v;
    };
    return values.some((v: any) => controllingValue == normalized(v));
  }

  isFieldRequired(field: any): boolean {
    if (field.mandatoryIf && field.mandatoryIf.key) {
      const controllingValue = this.form?.get(field.mandatoryIf.key)?.value;
      let values = field.mandatoryIf.value;
      if (typeof values === 'string') {
        values = values.split(',').map((v: string) => v.trim());
      } else if (!Array.isArray(values)) {
        values = [values];
      }
      // Normalize booleans
      const normalized = (v: any) => {
        if (typeof controllingValue === 'boolean') {
          if (v === true || v === 'true') return true;
          if (v === false || v === 'false') return false;
        }
        return v;
      };
      return values.some((v: any) => controllingValue == normalized(v));
    }
    return !!field.required;
  }

  constructor(private fb: FormBuilder, private route: ActivatedRoute, private router: Router, private schemaService: SchemaService) {
    this.form = this.fb.group({});
    this.fieldForm = this.fb.group({
      key: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_]+$/)]],
      label: ['', Validators.required],
      type: ['text', Validators.required],
      required: [false],
      placeholder: [''],
      defaultValue: [null],
      editable: [true],
      regex: [''],
      options: this.fb.array([])
    });

    this.fieldForm.get('type')?.valueChanges.subscribe(type => {
      if (type === 'dropdown') {
        if (this.options.length === 0) {
          this.addOption();
        }
      } else {
        this.options.clear();
      }
    });
  }

  ngOnInit() { 
    this.route.paramMap.subscribe(params => {
      const versionParam = params.get('version');
      this.submissionVersion = versionParam ? +versionParam : null;
      this.route.queryParamMap.subscribe(qp => {
        this.isDuplicatedEdit = qp.get('duplicated') === 'true';
        this.setupComponent();
      });
    });
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['prefillVersion'] && this.prefillVersion && this.mode === 'use' && this.templateName) {
      this.schemaService.getSubmission(this.templateName, this.prefillVersion).subscribe(sub => {
        if (this.form) {
          this.form.patchValue(sub.data);
        }
        this.prefillVersion = null;
      });
    }
    this.setupComponent();
  }

  setupComponent() {
    this.isReadOnly = this.mode === 'preview';
    this.isEditMode = this.mode === 'create' || this.mode === 'edit';

    switch (this.mode) {
      case 'create':
        this.title = 'Create New Template';
        this.submitButtonText = 'Save Template';
        this.schema = { name: '', description: '', fields: [] };
        this.buildForm();
        break;
      case 'edit':
        this.title = `Edit Template: ${this.templateName}`;
        this.submitButtonText = 'Update Template';
        this.loadTemplate();
        break;
      case 'use':
        this.title = `Fill Form: ${this.templateName}`;
        this.submitButtonText = 'Submit Form';
        this.isReadOnly = false;
        if (this.submissionVersion && this.isDuplicatedEdit) {
          this.loadTemplateWithPrefill();
        } else {
          this.loadTemplate();
        }
        break;
      case 'preview':
        this.title = `Preview: ${this.templateName}`;
        this.submitButtonText = '';
        this.isReadOnly = true;
        this.loadTemplate();
        break;
    }
  }

  loadTemplate() {
    if (!this.templateName) return;
    this.isLoading = true;
    this.schemaService.getTemplate(this.templateName).subscribe(data => {
      this.schema = data.schema;
      this.schema.name = data.name; // ensure name is populated
      this.buildForm();
      this.isLoading = false;
    });
  }

  loadTemplateWithPrefill() {
    if (!this.templateName || !this.submissionVersion) return;
    this.isLoading = true;
    this.schemaService.getTemplate(this.templateName).subscribe(data => {
      this.schema = data.schema;
      this.schema.name = data.name;
      this.schemaService.getSubmission(this.templateName!, this.submissionVersion!).subscribe(sub => {
        this.buildForm();
        this.form.patchValue(sub.data);
        this.isLoading = false;
      });
    });
  }

  buildForm() {
    const controls: { [key: string]: any } = {};
    this.schema.fields.forEach((field: any) => {
      const validators: ValidatorFn[] = [];
      // Do not add required here; will be handled dynamically
      if (field.regex) {
        validators.push(Validators.pattern(field.regex));
      }
      const control = new FormControl({ value: field.defaultValue, disabled: this.isReadOnly || (this.mode === 'use' && !field.editable) }, validators);
      controls[field.key] = control;
    });
    this.form = this.fb.group(controls);

    // Listen for changes to update required validators dynamically
    this.form.valueChanges.subscribe(() => {
      this.updateDynamicValidators();
    });
    this.updateDynamicValidators();
  }

  updateDynamicValidators() {
    this.schema.fields.forEach((field: any) => {
      const control = this.form.get(field.key);
      if (!control) return;
      const validators: ValidatorFn[] = [];
      if (this.isFieldRequired(field)) {
        validators.push(Validators.required);
      }
      if (field.regex) {
        validators.push(Validators.pattern(field.regex));
      }
      control.setValidators(validators);
      control.updateValueAndValidity({ emitEvent: false });
    });
  }

  showAddFieldEditor() {
    this.currentFieldIndex = null;
    this.fieldForm.reset({
      type: 'text',
      required: false,
      editable: true,
      defaultValue: null,
      placeholder: '',
      regex: '',
      options: []
    });
    this.options.clear();
    this.isFieldEditorVisible = true;
    this.visibleIfKey = null;
    this.visibleIfValue = null;
    this.mandatoryIfKey = null;
    this.mandatoryIfValue = null;
  }

  editField(index: number) {
    this.currentFieldIndex = index;
    const field = this.schema.fields[index];
    this.fieldForm.patchValue(field);
    this.options.clear();
    if (field.type === 'dropdown' && field.options) {
      field.options.forEach((opt: any) => this.options.push(this.fb.group(opt)));
    }
    // Sync conditional logic fields
    this.visibleIfKey = field.visibleIf?.key || null;
    this.visibleIfValue = field.visibleIf?.value ?? null;
    this.mandatoryIfKey = field.mandatoryIf?.key || null;
    this.mandatoryIfValue = field.mandatoryIf?.value ?? null;
    this.isFieldEditorVisible = true;
  }

  removeField(index: number) {
    this.schema.fields.splice(index, 1);
    this.buildForm();
  }

  saveField() {
    if (this.fieldForm.invalid) {
      return;
    }
    const newField = this.fieldForm.value;
    // Attach conditional logic fields
    const visibleIfVal = this.visibleIfKey ? (this.visibleIfValue !== null && this.visibleIfValue !== undefined ? this.visibleIfValue : '') : null;
    newField.visibleIf = this.visibleIfKey ? { key: this.visibleIfKey, value: visibleIfVal } : null;
    const mandatoryIfVal = this.mandatoryIfKey ? (this.mandatoryIfValue !== null && this.mandatoryIfValue !== undefined ? this.mandatoryIfValue : '') : null;
    newField.mandatoryIf = this.mandatoryIfKey ? { key: this.mandatoryIfKey, value: mandatoryIfVal } : null;
    if (this.currentFieldIndex !== null) {
      this.schema.fields[this.currentFieldIndex] = newField;
    } else {
      this.schema.fields.push(newField);
    }
    this.buildForm();
    this.isFieldEditorVisible = false;
  }

  onSubmit() {
    if (this.mode === 'create') {
      this.schemaService.createTemplate(this.schema).subscribe({
        next: () => this.closeForm(),
        error: (err) => {
          if (err.status === 409) {
            alert('A template with this name already exists. Please choose a different name.');
          } else {
            alert('Failed to save template. Please try again.');
          }
        }
      });
    } else if (this.mode === 'edit') {
      this.schemaService.updateTemplate(this.schema.name, this.schema).subscribe(() => this.closeForm());
    } else if (this.mode === 'use') {
      if (!this.templateName) return;
      this.schemaService.submitForm(this.templateName, this.form.getRawValue()).subscribe(() => this.closeForm());
    }
  }

  isFormValid(): boolean {
      // We only care about the template's structure.
      return this.schema.name && this.schema.fields.length > 0;
  }

  closeForm() {
    this.formClose.emit();
  }

  get options() {
    return this.fieldForm.get('options') as FormArray;
  }

  addOption() {
    this.options.push(this.fb.group({
      label: ['', Validators.required],
      value: ['', Validators.required]
    }));
  }

  removeOption(index: number) {
    this.options.removeAt(index);
  }

  isBooleanField(key: string): boolean {
    const field = this.schema.fields.find((f: any) => f.key === key);
    return field?.type === 'boolean';
  }
}