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
            <div *ngFor="let field of schema.fields" class="form-field" [ngSwitch]="field.type">
              <label>{{ field.label }} <span *ngIf="field.required" class="required-asterisk">*</span></label>
              
              <input *ngSwitchCase="'text'" [formControlName]="field.key" [placeholder]="field.placeholder || ''" [readOnly]="isReadOnly || !field.editable">
              <input *ngSwitchCase="'number'" type="number" [formControlName]="field.key" [placeholder]="field.placeholder || ''" [readOnly]="isReadOnly || !field.editable">
              
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
          <div *ngIf="isFieldEditorVisible" class="field-editor-form">
            <h5>{{ currentFieldIndex === null ? 'Add New Field' : 'Edit Field' }}</h5>
            <form [formGroup]="fieldForm" class="field-form-grid">
              <div class="form-field span-2">
                <label>Field Label</label>
                <input formControlName="label" placeholder="Visible label (e.g., 'First Name')">
              </div>
              <div class="form-field">
                <label>Field Key</label>
                <input formControlName="key" placeholder="unique_key">
              </div>
              <div class="form-field">
                <label>Field Type</label>
                <select formControlName="type">
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="dropdown">Dropdown</option>
                </select>
              </div>
               <div class="form-field span-2">
                <label>Placeholder / Help Text</label>
                <input formControlName="placeholder" placeholder="Help text inside the input or for checkbox">
              </div>
               <div class="form-field">
                <label>Default Value</label>
                <input formControlName="defaultValue" placeholder="Optional default value">
              </div>
              <div class="form-field" *ngIf="fieldForm.get('type')?.value === 'text'">
                <label>Validation Regex</label>
                <input formControlName="regex" placeholder="e.g., ^[a-zA-Z]+$">
              </div>
              
              <div class="checkbox-group span-2">
                <div class="checkbox-wrapper">
                  <input type="checkbox" formControlName="required" id="field-required"> 
                  <label for="field-required">Required Field</label>
                </div>
                <div class="checkbox-wrapper">
                  <input type="checkbox" formControlName="editable" id="field-editable">
                  <label for="field-editable">User Editable</label>
                </div>
              </div>

              <div *ngIf="fieldForm.get('type')?.value === 'dropdown'" class="dropdown-options-editor span-2">
                <h6>Dropdown Options</h6>
                <div formArrayName="options">
                   <div *ngFor="let option of options.controls; let i = index" [formGroupName]="i" class="option-item">
                    <input formControlName="label" placeholder="Option Label">
                    <input formControlName="value" placeholder="Option Value">
                    <button type="button" class="action-delete" (click)="removeOption(i)" mat-icon-button matTooltip="Remove Option">
                      <mat-icon>remove_circle_outline</mat-icon>
                    </button>
                  </div>
                </div>
                <button type="button" class="add-option-btn" (click)="addOption()">
                   <mat-icon>add</mat-icon> Add Option
                </button>
              </div>

              <div class="field-editor-actions span-2">
                <button type="button" (click)="isFieldEditorVisible = false" class="secondary">Cancel</button>
                <button type="button" (click)="saveField()" [disabled]="fieldForm.invalid">Save Field</button>
              </div>
            </form>
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
  `]
})
export class DynamicForm implements OnInit, OnChanges {
  @Input() mode: 'create' | 'edit' | 'use' | 'preview' | 'list' | 'submissions' = 'use';
  @Input() templateName: string | null = null;
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

  ngOnInit() { this.setupComponent(); }
  ngOnChanges(changes: SimpleChanges) { this.setupComponent(); }

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
        this.loadTemplate();
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

  buildForm() {
    const controls: { [key: string]: any } = {};
    this.schema.fields.forEach((field: any) => {
      const validators: ValidatorFn[] = [];
      if (field.required) {
        validators.push(Validators.required);
      }
      if (field.regex) {
        validators.push(Validators.pattern(field.regex));
      }
       const control = new FormControl({ value: field.defaultValue, disabled: this.isReadOnly || (this.mode === 'use' && !field.editable) }, validators);
      controls[field.key] = control;
    });
    this.form = this.fb.group(controls);
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
  }

  editField(index: number) {
    this.currentFieldIndex = index;
    const field = this.schema.fields[index];
    this.fieldForm.patchValue(field);
    
    this.options.clear();
    if (field.type === 'dropdown' && field.options) {
      field.options.forEach((opt: any) => this.options.push(this.fb.group(opt)));
    }

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
      this.schemaService.createTemplate(this.schema).subscribe(() => this.closeForm());
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
}