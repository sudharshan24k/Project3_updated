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
    <div class="container">
      <div class="form-header">
        <h1>{{ title }}</h1>
        <button (click)="closeForm()">Back to List</button>
      </div>

      <div *ngIf="isLoading" class="loading-spinner">Loading...</div>

      <div class="form-grid" *ngIf="!isLoading">
        <!-- Left Column: Template Editor -->
        <div class="template-editor card" *ngIf="isEditMode">
          <h3>Template Editor</h3>
          <div class="form-field">
             <label>Template Name</label>
            <input [(ngModel)]="schema.name" placeholder="Template Name" [ngModelOptions]="{standalone: true}" [disabled]="mode === 'edit'">
          </div>
           <div class="form-field">
             <label>Template Description</label>
            <input [(ngModel)]="schema.description" placeholder="Template Description" [ngModelOptions]="{standalone: true}">
           </div>

          <div *ngFor="let field of schema.fields; let i = index" class="field-editor-item">
            <span>{{ field.label }} ({{ field.type }})</span>
            <div class="field-actions">
              <button class="btn-icon" (click)="editField(i)" mat-icon-button matTooltip="Edit Field">
                <mat-icon>edit</mat-icon>
              </button>
              <button class="btn-icon btn-delete" (click)="removeField(i)" mat-icon-button matTooltip="Remove Field">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </div>

          <!-- Inline Add/Edit Field Form -->
          <div *ngIf="isFieldEditorVisible" class="field-editor-form card">
            <h4>{{ currentFieldIndex === null ? 'Add New Field' : 'Edit Field' }}</h4>
            <form [formGroup]="fieldForm">
              <div class="form-field">
                <label>Field Key</label>
                <input formControlName="key" placeholder="Unique key (e.g., 'firstName')">
              </div>
              <div class="form-field">
                <label>Field Label</label>
                <input formControlName="label" placeholder="Visible label (e.g., 'First Name')">
              </div>
              <div class="form-field">
                <label>Field Type</label>
                <select formControlName="type">
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="boolean">Checkbox</option>
                  <option value="dropdown">Dropdown</option>
                </select>
              </div>
               <div class="form-field">
                <label>Default Value</label>
                <input formControlName="defaultValue" placeholder="Default value for the field">
              </div>
              <div class="form-field">
                <label>Placeholder Text</label>
                <input formControlName="placeholder" placeholder="Help text inside the input">
              </div>
              <div class="form-field" *ngIf="fieldForm.get('type')?.value === 'text'">
                <label>Validation Regex</label>
                <input formControlName="regex" placeholder="e.g., ^[a-zA-Z]+$">
              </div>
              <div class="form-group-inline">
                <input type="checkbox" formControlName="required" id="field-required"> 
                <label for="field-required">Required</label>
              </div>
               <div class="form-group-inline">
                <input type="checkbox" formControlName="editable" id="field-editable">
                <label for="field-editable">Editable by User</label>
              </div>

              <!-- Dropdown Options Editor -->
              <div *ngIf="fieldForm.get('type')?.value === 'dropdown'" class="dropdown-options-editor">
                <h5>Dropdown Options</h5>
                <div formArrayName="options" *ngFor="let option of options.controls; let i = index">
                  <div [formGroupName]="i" class="option-inputs">
                    <input formControlName="label" placeholder="Option Label">
                    <input formControlName="value" placeholder="Option Value">
                  </div>
                  <button type="button" class="btn-icon btn-delete" (click)="removeOption(i)" mat-icon-button matTooltip="Remove Option">
                    <mat-icon>remove_circle_outline</mat-icon>
                  </button>
                </div>
                <button type="button" class="btn-add-option" (click)="addOption()">
                   <mat-icon>add</mat-icon> Add Option
                </button>
              </div>

              <div class="form-actions">
                <button type="button" (click)="isFieldEditorVisible = false" class="secondary">Cancel</button>
                <button type="button" (click)="saveField()" [disabled]="fieldForm.invalid">Save Field</button>
              </div>
            </form>
          </div>

          <button class="add-field-btn" (click)="showAddFieldEditor()" *ngIf="!isFieldEditorVisible">+ Add Field</button>
          
          <div class="form-actions" *ngIf="isEditMode">
             <button (click)="closeForm()" class="secondary">Cancel</button>
             <button (click)="onSubmit()" [disabled]="!isFormValid()">{{ submitButtonText }}</button>
          </div>
        </div>

        <!-- Right Column: Live Form Preview or Form Filling Area -->
        <div class="form-preview card" [class.full-width]="!isEditMode">
            <form [formGroup]="form" (ngSubmit)="onSubmit()">
                <h3>{{ isEditMode ? 'Preview' : 'Fill Form' }}</h3>
                <div *ngFor="let field of schema.fields" class="form-field" [ngSwitch]="field.type">
                    <label>{{ field.label }} <span *ngIf="field.required">*</span></label>
                    
                    <input *ngSwitchCase="'text'" [formControlName]="field.key" [placeholder]="field.placeholder || ''">
                    
                    <input *ngSwitchCase="'number'" type="number" [formControlName]="field.key" [placeholder]="field.placeholder || ''">
                    
                    <input *ngSwitchCase="'boolean'" type="checkbox" [formControlName]="field.key">

                    <select *ngSwitchCase="'dropdown'" [formControlName]="field.key">
                        <option *ngFor="let opt of field.options" [value]="opt.value">{{ opt.label }}</option>
                    </select>

                    <div *ngIf="form.get(field.key)?.invalid && form.get(field.key)?.touched" class="error-message">
                        <div *ngIf="form.get(field.key)?.errors?.['required']">This field is required.</div>
                        <div *ngIf="form.get(field.key)?.errors?.['pattern']">Invalid format.</div>
                    </div>
                </div>
                <div class="form-actions" *ngIf="!isEditMode">
                    <button type="submit" [disabled]="form.invalid">{{ submitButtonText }}</button>
                </div>
            </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container {
      padding: 2rem;
    }
    .form-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 2rem;
    }
    @media (min-width: 768px) {
      .form-grid {
        grid-template-columns: 1fr 1fr;
      }
    }
    .form-preview.full-width {
      grid-column: 1 / -1;
    }
    .template-editor, .form-preview {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .field-editor-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      border: 1px solid #eee;
      border-radius: 4px;
    }
    .field-actions {
      display: flex;
      gap: 0.5rem;
    }
    .btn-icon {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      color: var(--primary-color);
      width: 24px;
      height: 24px;
      line-height: 24px;
    }
     .btn-icon.btn-delete {
      color: var(--error-color);
    }
    .field-editor-form {
      padding: 1.5rem;
      border: 1px solid #ddd;
      margin-top: 1rem;
    }
    .form-group-inline {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .dropdown-options-editor {
      border: 1px solid #eee;
      padding: 1rem;
      border-radius: 4px;
      margin-top: 1rem;
    }
    .option-item {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .option-inputs {
      display: flex;
      gap: 0.5rem;
      flex-grow: 1;
    }
    .btn-add-option {
        background: none;
        border: 1px dashed var(--primary-color);
        color: var(--primary-color);
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 0.5rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .error-message {
        color: var(--error-color);
        font-size: 0.875rem;
        margin-top: 0.25rem;
    }
    .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        margin-top: 1.5rem;
    }

    input:disabled, select:disabled, textarea:disabled {
        background-color: #eeeeee;
        cursor: not-allowed;
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