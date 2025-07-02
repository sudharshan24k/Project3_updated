import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ValidatorFn, ReactiveFormsModule, FormArray, FormControl, AbstractControl } from '@angular/forms';
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
import { SchemaService, TemplateSchema, TemplateInfo } from './schema.service';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { VersionDialogComponent, VersionDialogData } from '../version-dialog.component';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatAutocompleteModule, MatAutocomplete, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Observable, startWith, map, takeUntil } from 'rxjs';
import { MatInput } from '@angular/material/input';
import { Subject } from 'rxjs';
import { AnimatedPopupComponent } from '../animated-popup.component';
import { FillerNameDialogComponent } from './filler-name-dialog.component';

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatCheckboxModule, MatCardModule, NgIf, NgFor, MatIconModule, MatTooltipModule, MatRadioModule, MatSlideToggleModule, DragDropModule, MatAutocompleteModule, AnimatedPopupComponent],
  templateUrl: './dynamic-form.component.html',
  styleUrls: ['./dynamic-form.component.scss']
})
export class DynamicForm implements OnInit, OnChanges, AfterViewInit {
  @Input() mode: 'create' | 'edit' | 'use' | 'preview' | 'list' | 'submissions' | 'history' = 'use';
  @Input() templateName: string | null = null;
  @Input() prefillVersion: number | null = null;
  @Input() prefillSubmissionName: string | null = null;
  @Output() formClose = new EventEmitter<void>();

  form: FormGroup;
  fieldForm: FormGroup;
  schema: any = { name: '', description: '', fields: [], version: '', team_name: '', audit_pipeline: '' };
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

  regexHelperVisible = false;
  regexOptions = [
    { label: 'Email', value: '^[^@]+@[^@]+\\.[^@]+$' },
    { label: 'Phone Number', value: '^\\+?[0-9]{10,15}$' },
    { label: 'URL', value: '^(https?:\\/\\/)?([\\w\\-]+\\.)+[\\w\\-]+(\\/\\S*)?$' },
    { label: 'Alphanumeric', value: '^[A-Za-z0-9]+$' },
    { label: 'IPv4', value: '^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$' },
    { label: 'IPv6', value: '^([\\da-fA-F]{1,4}:){7}[\\da-fA-F]{1,4}$' },
    { label: 'Hex Color', value: '^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$' },
    { label: 'File Path', value: '^/?(?:[\\w.-]+/)*[\\w.-]+$' },
  ];

  importTemplates: TemplateInfo[] = [];
  selectedImportTemplate: string | null = null;
  isImporting = false;

  templateSearchCtrl: FormControl;
  filteredTemplates$: Observable<TemplateInfo[]>;

  @ViewChild('auto') matAutocomplete!: MatAutocomplete;
  @ViewChild('templateInput') templateInput!: ElementRef<HTMLInputElement>;

  teamNames: string[] = ['Framework Team', 'PID Team'];
  teamNameCtrl = new FormControl('');
  filteredTeamNames$: Observable<string[]>;

  private destroy$ = new Subject<void>();

  // --- Add for dynamic conditional logic ---
  get visibleFields() {
    // Force recalculation on every access to ensure visibility is always up to date
    return this.schema.fields.filter((field: any) => this.isFieldVisible(field));
  }

  isFieldVisible(field: any): boolean {
    if (!field.visibleIf || !field.visibleIf.key) return true;
    // Support multiple keys
    let keys = field.visibleIf.key;
    if (typeof keys === 'string') {
      keys = keys.split(',').map((k: string) => k.trim());
    } else if (!Array.isArray(keys)) {
      keys = [keys];
    }
    let values = field.visibleIf.value;
    if (typeof values === 'string') {
      values = values.split(',').map((v: string) => v.trim());
    } else if (!Array.isArray(values)) {
      values = [values];
    }
    // For each key, check if the controlling value matches any of the expected values
    return keys.every((key: string, idx: number) => {
      const controllingValue = this.form?.get(key)?.value;
      let expected = Array.isArray(values) ? values[idx] ?? values[0] : values;
      
      // Handle boolean string/actual boolean mismatch
      if (typeof controllingValue === 'boolean' && typeof expected === 'string') {
        if (expected.toLowerCase() === 'true' || expected.toLowerCase() === 'false') {
          expected = expected.toLowerCase() === 'true';
        }
      }
      
      if (Array.isArray(expected)) {
        return expected.some((v: any) => controllingValue == v);
      } else {
        return controllingValue == expected;
      }
    });
  }

  isFieldRequired(field: any): boolean {
    if (field.mandatoryIf && field.mandatoryIf.key) {
      // Support multiple keys
      let keys = field.mandatoryIf.key;
      if (typeof keys === 'string') {
        keys = keys.split(',').map((k: string) => k.trim());
      } else if (!Array.isArray(keys)) {
        keys = [keys];
      }
      let values = field.mandatoryIf.value;
      if (typeof values === 'string') {
        values = values.split(',').map((v: string) => v.trim());
      } else if (!Array.isArray(values)) {
        values = [values];
      }
      // For each key, check if the controlling value matches any of the expected values
      return keys.every((key: string, idx: number) => {
        const controllingValue = this.form?.get(key)?.value;
        let expected = Array.isArray(values) ? values[idx] ?? values[0] : values;
          // Handle boolean string/actual boolean mismatch
        if (typeof controllingValue === 'boolean' && typeof expected === 'string') {
          if (expected.toLowerCase() === 'true' || expected.toLowerCase() === 'false') {
            expected = expected.toLowerCase() === 'true';
          }
        }
      
        // handle null, undefined, or empty string as valid for required fields
      if (expected === null || expected === undefined || expected === '') {
        return controllingValue === null || controllingValue === undefined || controllingValue === '';
      }
        
        if (Array.isArray(expected)) {
          return expected.some((v: any) => controllingValue == v);
        } else {
          return controllingValue == expected;
        }
      });
    }
    return field.required === true;
  }

  isFieldEditable(field: any): boolean {
    return field.editable === true;
  }

  // Add form controls for top-level required fields
  topLevelForm: FormGroup;

  constructor(private fb: FormBuilder, private route: ActivatedRoute, private router: Router, private schemaService: SchemaService, private cdr: ChangeDetectorRef, private dialog: MatDialog) {
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
      options: this.fb.array([]),
      initialKeys: [''],
      environmentSpecific: [false] // <-- Add this line
    });
    // Add top-level form for required fields
    this.topLevelForm = this.fb.group({
      author: ['', Validators.required],
      team_name: ['', Validators.required],
      audit_pipeline: ['', Validators.required],
      version_tag: ['', Validators.required]
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
    this.templateSearchCtrl = this.fb.control('');
    this.filteredTemplates$ = this.templateSearchCtrl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterTemplates(value))
    );

    this.filteredTeamNames$ = this.teamNameCtrl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterTeamNames(value || '')),
    );

    this.teamNameCtrl.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(value => {
      if (this.schema) {
        this.schema.team_name = value;
      }
    });
  }

  ngOnInit() {
    // Read templateName and other info from navigation state if present
    if (history.state && history.state.templateName) {
      this.templateName = history.state.templateName;
    }
    if (history.state && history.state.submissionName) {
      this.prefillSubmissionName = history.state.submissionName;
    }
    if (history.state && history.state.version) {
      this.prefillVersion = history.state.version;
    }

    this.route.data.subscribe(data => {
      this.mode = data['mode'] || this.mode; // Set mode from route data first

      // Now, proceed with the original logic, which will use the correct mode
      if (this.mode === 'create') {
        this.schemaService.listTemplates().subscribe(templates => {
          this.importTemplates = templates;
        });
      }

      this.route.paramMap.subscribe(params => {
        const versionParam = params.get('version');
        this.submissionVersion = versionParam ? +versionParam : null;
        this.templateName = params.get('templateName') || this.templateName;

        this.route.queryParamMap.subscribe(qp => {
          this.isDuplicatedEdit = qp.get('duplicated') === 'true';
          this.setupComponent();
        });
      });
    });

    // --- Fix for boolean visibleIf glitch: subscribe to all boolean fields and trigger change detection ---
    this.form?.valueChanges?.subscribe(() => {
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
    
    // Ensure setupComponent is called immediately if templateName is already available
    if (this.templateName) {
      this.setupComponent();
    }

    if (this.form) {
      this.form.valueChanges.subscribe(() => {
        this.form.markAllAsTouched();
      });
    }
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
    
    // Call setupComponent when templateName changes
    if (changes['templateName'] && this.templateName) {
      this.setupComponent();
    }
    // Also call setupComponent when prefillSubmissionName changes
    if (changes['prefillSubmissionName'] && this.prefillSubmissionName) {
      this.setupComponent();
    }
  }

  ngAfterViewInit() {
    // Always show the dropdown on focus
    if (this.templateInput) {
      this.templateInput.nativeElement.addEventListener('focus', () => {
        // Angular Material autocomplete opens automatically on focus if there are options
        // So we just need to trigger change detection if needed
        setTimeout(() => {
          this.templateSearchCtrl.setValue(this.templateSearchCtrl.value || '');
        }, 0);
      });
    }
  }

  openAutocomplete() {
    // No need to manually open the panel, just trigger valueChanges
    this.templateSearchCtrl.setValue(this.templateSearchCtrl.value || '');
  }

  highlightMatch(text: string, search: string): string {
    if (!search) return text;
    const re = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(re, '<span class="highlight">$1</span>');
  }

  setupComponent() {
    this.isEditMode = this.mode === 'create' || this.mode === 'edit';
    this.isReadOnly = this.mode === 'preview';

    if (this.mode === 'create') {
      this.title = 'Create New Template';
      this.submitButtonText = 'Save Template';
      this.schema = { name: '', description: '', fields: [], version: '', team_name: '', audit_pipeline: '' };
      this.teamNameCtrl.setValue(this.schema.team_name || '', { emitEvent: false });
      this.buildForm();
    } else if (this.templateName) {
      if (this.prefillSubmissionName) {
        // This is a "Duplicate & Edit" from a submission
        this.loadTemplateWithSubmissionPrefill();
      } else if (this.prefillVersion) {
        // This is a "Duplicate & Edit" from a template version
        this.loadTemplateWithPrefill();
      } else {
        this.loadTemplate();
      }
    }
    // Set default button text for other modes
    if (!this.submitButtonText) {
      if (this.mode === 'edit') {
        this.submitButtonText = 'Update Template';
      } else if (this.mode === 'use') {
        this.submitButtonText = 'Submit';
      } else if (this.mode === 'submissions') {
        this.submitButtonText = 'Submit';
      }
    }
    // Map 'mandatory' to 'required' for all fields in schema and normalize required/editable
    if (this.schema && Array.isArray(this.schema.fields)) {
      this.schema.fields.forEach((field: any) => {
        if (field.mandatory !== undefined && field.required === undefined) {
          field.required = field.mandatory;
        }
        field.required = (field.required === true || field.required === 'true');
        field.editable = (field.editable === true || field.editable === 'true');
      });
    }
  }

  // Utility to normalize required/editable fields to booleans (robust)
  normalizeFieldBooleans(schema: any) {
    if (!schema || !Array.isArray(schema.fields)) return;
    schema.fields.forEach((field: any) => {
      if (field.mandatory !== undefined && field.required === undefined) {
        field.required = field.mandatory;
      }
      field.required = (field.required === true || field.required === 'true');
      field.editable = (field.editable === true || field.editable === 'true');
    });
  }

  loadTemplate() {
    if (!this.templateName) return;
    this.isLoading = true;
    this.schemaService.getTemplate(this.templateName).subscribe({
      next: (data) => {
        if (this.mode === 'use') {
          console.log('API response:', data);
        }
        this.schema = data.schema;
        this.schema.name = data.name; // ensure name is populated
        // Copy top-level fields to schema for UI binding
        this.schema.author = data.author;
        this.schema.team_name = data.team_name;
        this.schema.version = data.version_tag;
        this.normalizeFieldBooleans(this.schema);
        if (this.mode === 'use') {
          console.log('Normalized fields:', this.schema.fields);
        }
        this.buildForm();
        this.isLoading = false;
        // Set button text for edit/use modes if not already set
        if (this.mode === 'edit') {
          this.submitButtonText = 'Update Template';
        } else if (this.mode === 'use' || this.mode === 'submissions') {
          this.submitButtonText = 'Submit';
        }
        this.cdr.detectChanges(); // Force UI update
      },
      error: (error) => {
        console.error('Error loading template:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadTemplateWithPrefill() {
    if (!this.templateName || !this.submissionVersion) return;
    this.isLoading = true;
    this.schemaService.getTemplate(this.templateName).subscribe(data => {
      this.schema = data.schema;
      this.schema.name = data.name;
      this.normalizeFieldBooleans(this.schema);
      this.schemaService.getSubmission(this.templateName!, this.submissionVersion!).subscribe(sub => {
        this.buildForm();
        this.form.patchValue(sub.data);
        this.isLoading = false;
      });
    });
  }

  loadTemplateWithSubmissionPrefill() {
    if (!this.templateName || !this.prefillSubmissionName) {
      return;
    }

    this.isLoading = true;
    const currentTemplateName = this.templateName;
    const currentSubmissionName = this.prefillSubmissionName;

    this.schemaService.getTemplate(currentTemplateName).subscribe(schema => {
      this.schema = schema.schema;
      this.schema.name = schema.name; // Keep the original template name
      this.normalizeFieldBooleans(this.schema);
      this.title = `Editing Submission for: ${currentTemplateName}`;
      this.submitButtonText = 'Submit as New';

      // Add a short delay to avoid race condition
      setTimeout(() => {
        this.schemaService.getSubmissionByName(currentTemplateName, currentSubmissionName).subscribe({
          next: (submission) => {
            this.buildForm(); // Build form first
            this.form.patchValue(submission.data || {}); // Then patch with data
            this.isLoading = false;
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Error loading duplicated submission:', err);
            this.isLoading = false;
            this.cdr.detectChanges();
          }
        });
      }, 150);
    }, error => {
      console.error('Error loading template for duplicated submission:', error);
      this.isLoading = false;
      this.cdr.detectChanges();
    });
  }

  buildForm() {
    const controls: { [key: string]: any } = {};
    this.schema.fields.forEach((field: any) => {
      const validators: ValidatorFn[] = [];
      if (field.required === true) {
        validators.push(Validators.required);
      }
      if (field.regex) {
        validators.push(Validators.pattern(field.regex));
      }
      let defaultValue = field.defaultValue;
      if (defaultValue === undefined || defaultValue === null || defaultValue === 'None') {
        defaultValue = '';
      }
      if (field.environmentSpecific) {
        // For environment-specific, create a FormGroup with PROD, DEV, COB for all types
        if (field.type === 'keyvalue') {
          const makeArray = () => {
            let initialPairs: any[] = [];
            if (Array.isArray(field.initialKeys)) {
              initialPairs = field.initialKeys.map((k: string) => ({ key: k, value: '' }));
            }
            return this.fb.array(
              initialPairs.map((pair: {key: string, value: string}) => this.fb.group(pair)),
              validators
            );
          };
          controls[field.key] = this.fb.group({
            PROD: makeArray(),
            DEV: makeArray(),
            COB: makeArray(),
          });
        } else if (field.type === 'mcq_multiple') {
          controls[field.key] = this.fb.group({
            PROD: this.fb.array(defaultValue && defaultValue.PROD ? defaultValue.PROD : [], validators),
            DEV: this.fb.array(defaultValue && defaultValue.DEV ? defaultValue.DEV : [], validators),
            COB: this.fb.array(defaultValue && defaultValue.COB ? defaultValue.COB : [], validators),
          });
        } else {
          controls[field.key] = this.fb.group({
            PROD: [defaultValue && defaultValue.PROD ? defaultValue.PROD : '', validators],
            DEV: [defaultValue && defaultValue.DEV ? defaultValue.DEV : '', validators],
            COB: [defaultValue && defaultValue.COB ? defaultValue.COB : '', validators],
          });
        }
      } else if (field.type === 'mcq_multiple') {
        controls[field.key] = this.fb.array(defaultValue || [], validators);
      } else if (field.type === 'keyvalue') {
        let initialPairs = [];
        if (Array.isArray(field.initialKeys)) {
          initialPairs = field.initialKeys.map((k: string) => ({ key: k, value: '' }));
        }
        controls[field.key] = this.fb.array(
          initialPairs.map((pair: {key: string, value: string}) => this.fb.group(pair)),
          validators
        );
      } else {
        controls[field.key] = [defaultValue, validators];
      }
    });
    this.form = this.fb.group(controls);
    this.form.valueChanges.subscribe(() => {
      this.updateDynamicValidators();
      if (this.mode === 'use') {
        void this.visibleFields;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      }
    });
    this.schema.fields.forEach((field: any) => {
      if (field.type === 'boolean') {
        const control = this.form.get(field.key);
        if (control) {
          control.valueChanges.subscribe(() => {
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          });
        }
      }
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
      options: [],
      initialKeys: '', // Add initialKeys for keyvalue
      environmentSpecific: false // <-- Add this line
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
    const field = { ...this.schema.fields[index] };
    // Always enable the key control for editing (remove disabling logic)
    this.fieldForm.get('key')?.enable({ emitEvent: false });
    this.fieldForm.patchValue({
      ...field,
      required: field.required ?? false,
      editable: field.editable ?? false,
      environmentSpecific: field.environmentSpecific ?? false // Ensure checkbox is set
    });
    this.options.clear();
    if ((field.type === 'dropdown' || field.type === 'mcq_single' || field.type === 'mcq_multiple') && field.options) {
      field.options.forEach((opt: any) => this.options.push(this.fb.group(opt)));
    }
    // Fix for keyvalue: show default keys as comma-separated string
    if (field.type === 'keyvalue' && field.initialKeys) {
      const keysString = Array.isArray(field.initialKeys)
        ? field.initialKeys.join(',')
        : field.initialKeys;
      this.fieldForm.patchValue({ initialKeys: keysString });
    }
    // Sync conditional logic fields
    this.visibleIfKey = field.visibleIf?.key || null;
    this.visibleIfValue = field.visibleIf?.value ?? null;
    this.mandatoryIfKey = field.mandatoryIf?.key || null;
    this.mandatoryIfValue = field.mandatoryIf?.value ?? null;
    this.isFieldEditorVisible = true;
    setTimeout(() => { this.isDuplicatedEdit = false; }, 0);
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
    newField.environmentSpecific = this.fieldForm.get('environmentSpecific')?.value === true;
    // Prevent 'data' as a field key
    if (newField.key && newField.key.trim().toLowerCase() === 'data') {
      alert("'data' is a reserved key and cannot be used as a field name. Please choose another key.");
      return;
    }
    // Attach conditional logic fields
    const visibleIfVal = this.visibleIfKey ? (this.visibleIfValue !== null && this.visibleIfValue !== undefined ? this.visibleIfValue : '') : null;
    newField.visibleIf = this.visibleIfKey ? { key: this.visibleIfKey, value: visibleIfVal } : null;
    const mandatoryIfVal = this.mandatoryIfKey ? (this.mandatoryIfValue !== null && this.mandatoryIfValue !== undefined ? this.mandatoryIfValue : '') : null;
    newField.mandatoryIf = this.mandatoryIfKey ? { key: this.mandatoryIfKey, value: mandatoryIfVal } : null;
    // Parse initialKeys for keyvalue
    if (newField.type === 'keyvalue' && typeof newField.initialKeys === 'string') {
      newField.initialKeys = newField.initialKeys.split(',').map((k: string) => k.trim()).filter((k: string) => k);
    }
    // Add initialKeys property as requested
    newField.initialKeys = newField.type === 'keyvalue' && newField.initialKeys ? newField.initialKeys : undefined;
    if (this.currentFieldIndex !== null) {
      this.schema.fields[this.currentFieldIndex] = newField;
    } else {
      this.schema.fields.push(newField);
    }
    this.buildForm();
    this.isFieldEditorVisible = false;
    this.currentFieldIndex = null;
    this.isDuplicatedEdit = false;
    this.cdr.detectChanges();
  }

  async onSubmit() {
    if (this.mode === 'create') {
      if (!this.isFormValid()) {
        this.showPopup('Please fill all required fields.', 'error');
        return;
      }
      const template = {
        name: this.schema.name,
        description: this.schema.description,
        fields: this.schema.fields,
        author: this.schema.author,
        team_name: this.schema.team_name,
        version: this.schema.version,
        audit_pipeline: this.schema.audit_pipeline
      };
      this.schemaService.createTemplate(template).subscribe(() => {
        this.showPopup('Template created successfully!', 'success');
        setTimeout(() => this.closeForm(), 1800);
      });
    } else if (this.mode === 'edit') {
      const dialogRef = this.dialog.open(VersionDialogComponent, {
        width: '400px',
        data: { description: '', action: null } as VersionDialogData
      });
      dialogRef.afterClosed().subscribe(result => {
        if (!result) return;
        const { description, action } = result;
        if (!description) return;
        if (action === 'update') {
          this.schemaService.updateTemplate(this.schema.name, this.schema, description).subscribe(() => {
            this.showPopup('Template updated successfully!', 'success');
            // setTimeout(() => this.closeForm(), 1800);
            // window.location.reload(); // Reload to show updated templates
          });
        } else if (action === 'newVersion') {
          this.schemaService.createNewVersion(this.schema.name, this.schema, description).subscribe(() => {
            this.showPopup('New version created successfully!', 'success');
            // setTimeout(() => this.closeForm(), 1800);
            // window.location.reload(); // Reload to show new version list
          });
        }
      });
    } else if (this.mode === 'use') {
      if (!this.templateName) return;
      // Prompt for filler name after form is filled
      const dialogRef = this.dialog.open(FillerNameDialogComponent, {
        width: '400px',
        disableClose: true
      });
      dialogRef.afterClosed().subscribe(fillerName => {
        if (!fillerName || !fillerName.trim()) {
          this.showPopup('Name is required to submit.', 'error');
          return;
        }
        this.schemaService.submitForm(this.templateName!, {
          data: this.form.getRawValue(),
          fillerName: fillerName.trim()
        }).subscribe(() => {
          this.showPopup('Form response submitted!', 'airplane');
          setTimeout(() => this.closeForm(), 1800);
        });
      });
    }
  }

  isFormValid(): boolean {
    // Only check top-level required fields for template creation
    return !!(
      this.schema.name &&
      this.schema.description &&
      this.schema.author &&
      this.schema.team_name &&
      this.schema.audit_pipeline &&
      this.schema.version &&
      Array.isArray(this.schema.fields) && this.schema.fields.length > 0
    );
  }

  closeForm() {
    this.formClose.emit();
  }

  goBack() {
    this.closeForm();
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
  getKeyValueArray(fieldKey: string): FormArray | null {
    const control = this.form.get(fieldKey);
    return control instanceof FormArray ? control : null;
  }
  addKeyValuePair(fieldKey: string) {
    const control = this.form.get(fieldKey);
    if (control instanceof FormArray) {
      control.push(this.fb.group({ key: '', value: '' }));
      // Removed schema update and animation here
    }
  }
  removeKeyValuePair(fieldKey: string, index: number) {
    const control = this.form.get(fieldKey);
    if (control instanceof FormArray) {
      control.removeAt(index);
      // Removed schema update and animation here
    }
  }

  keyvalueDefaultKeys: string[] = [];
  addDefaultKey() {
    this.keyvalueDefaultKeys.push('');
  }
  removeDefaultKey(index: number) {
    this.keyvalueDefaultKeys.splice(index, 1);
  }
  isBooleanField(key: string): boolean {
    const field = this.schema.fields.find((f: any) => f.key === key);
    return field ? field.type === 'boolean' : false;
  }

  onMCQMultiChange(fieldKey: string, value: any, checked: boolean) {
    const array = this.form.get(fieldKey) as FormArray;
    if (checked) {
      array.push(new FormControl(value));
    } else {
      const index = array.controls.findIndex(x => x.value === value);
      if (index !== -1) {
        array.removeAt(index);
      }
    }
  }
  
  getCheckboxChecked(event: MatCheckboxChange): boolean {
    return event.checked;
  }

  getKeyValueField(form: FormGroup, key: string, i: number, field: 'key' | 'value'): string {
    const arr = form.get(key)?.value || [];
    return arr[i]?.[field] || '';
  }

  setKeyValueField(form: FormGroup, key: string, i: number, field: 'key' | 'value', value: string) {
    const arr = form.get(key)?.value ? [...form.get(key)?.value] : [];
    if (!arr[i]) arr[i] = { key: '', value: '' };
    arr[i][field] = value;
    form.get(key)?.setValue(arr);
  }

  onImportTemplateChange(templateName: string | null) {
    if (templateName) {
      this.isLoading = true;
      this.selectedImportTemplate = templateName;
      this.schemaService.getTemplate(String(templateName)).subscribe(tmpl => {
        this.schema.fields = JSON.parse(JSON.stringify(tmpl.schema.fields));
        this.schema.description = tmpl.schema.description || '';
        this.normalizeFieldBooleans(this.schema);
        this.isImporting = true;
        this.isLoading = false;
        this.buildForm(); // Rebuild the form after importing
        this.cdr.detectChanges(); // Force UI update if needed
      });
    }
  }

  clearImportedTemplate() {
    this.schema.fields = [];
    this.schema.description = '';
    this.selectedImportTemplate = null;
    this.isImporting = false;
  }

  onDefaultMultiChange(event: any, value: any) {
    // this is to enable multi-select for default values in MCQ fields
  const arr = this.fieldForm.value.defaultValue || [];
  if (event.target.checked) {
    this.fieldForm.patchValue({ defaultValue: [...arr, value] });
  } else {
    this.fieldForm.patchValue({ defaultValue: arr.filter((v: any) => v !== value) });
  }
}

  // Helper to get options for a field key (for conditional logic)
  getFieldOptions(key: string | null) {
    if (!key) return null;
    const field = this.schema.fields.find((f: any) => f.key === key);
    if (!field) return null;
    if (["dropdown", "mcq_single", "mcq_multiple"].includes(field.type)) {
      return field.options || [];
    }
    return null;
  }

  // Helper to get field type by key
  getFieldType(key: string | null): string | null {
    if (!key) return null;
    const field = this.schema.fields.find((f: any) => f.key === key);
    return field ? field.type : null;
  }

  // Handler for multi-select condition value (for mcq_multiple)
  onMultiCondChange(event: any, cond: 'visible' | 'mandatory') {
    const value = event.target.value;
    const checked = event.target.checked;
    if (cond === 'visible') {
      let arr = Array.isArray(this.visibleIfValue) ? [...this.visibleIfValue] : [];
      if (checked) {
        arr.push(value);
      } else {
        arr = arr.filter((v: any) => v !== value);
      }
      this.visibleIfValue = arr;
    } else if (cond === 'mandatory') {
      let arr = Array.isArray(this.mandatoryIfValue) ? [...this.mandatoryIfValue] : [];
      if (checked) {
        arr.push(value);
      } else {
        arr = arr.filter((v: any) => v !== value);
      }
      this.mandatoryIfValue = arr;
    }
  }

  isArray(val: any): boolean {
    return Array.isArray(val);
  }

  syncOptionLabelValue(index: number) {
    const opts = this.options;
    const label = opts.at(index).get('label')?.value;
    opts.at(index).get('value')?.setValue(label);
  }

  duplicateField(index: number) {
    const fieldToClone = this.schema.fields[index];
    // Deep clone the field (excluding references)
    const clonedField = JSON.parse(JSON.stringify(fieldToClone));
    // Optionally, modify the key to ensure uniqueness
    clonedField.key = this.generateUniqueKey(clonedField.key);
    clonedField.label = clonedField.label + ' (Copy)';
    // Insert the cloned field immediately after the original
    this.schema.fields.splice(index + 1, 0, clonedField);
    this.buildForm();
    this.currentFieldIndex = index + 1;
    this.isFieldEditorVisible = true;
    this.isDuplicatedEdit = true;
    this.editField(index + 1);
  }

  generateUniqueKey(baseKey: string): string {
    let newKey = baseKey + '_copy';
    let counter = 1;
    while (this.schema.fields.some((f: any) => f.key === newKey)) {
      newKey = baseKey + '_copy' + counter;
      counter++;
    }
    return newKey;
  }

  dropField(event: CdkDragDrop<any[]>) {
    moveItemInArray(this.schema.fields, event.previousIndex, event.currentIndex);
    this.buildForm();
  }

  private _filterTemplates(value: string): TemplateInfo[] {
    const filterValue = value ? value.toLowerCase() : '';
    return this.importTemplates.filter(t => t.name.toLowerCase().includes(filterValue));
  }

  private getValidators(field: any): ValidatorFn[] {
    const validators: ValidatorFn[] = [];
    if (field.required) {
      validators.push(Validators.required);
    }
    if (field.minLength) {
      validators.push(Validators.minLength(field.minLength));
    }
    if (field.maxLength) {
      validators.push(Validators.maxLength(field.maxLength));
    }
    if (field.regex) {
      validators.push(Validators.pattern(field.regex));
    }
    return validators;
  }

  private _filterTeamNames(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.teamNames.filter(team => team.toLowerCase().includes(filterValue));
  }

  // --- Animated popup state ---
  popupMessage: string = '';
  popupType: 'success' | 'error' | 'airplane' = 'success';
  popupVisible = false;

  showPopup(message: string, type: 'success' | 'error' | 'airplane' = 'success', timeout: number = 1800){
    this.popupMessage = message;
    this.popupType = type;
    this.popupVisible = true;
    setTimeout(() => {
      this.popupVisible = false;
      window.location.reload(); 
      // Reload the page after showing the popup
    }, timeout);
  }

  asFormGroup(ctrl: AbstractControl | null): FormGroup {
    return ctrl as FormGroup;
  }

  // --- Environment-specific helpers for MCQ multiple and keyvalue fields ---
  onMCQMultiChangeEnv(envGroup: FormGroup, env: string, value: any, checked: boolean) {
    const array = envGroup.get(env);
    if (array instanceof FormArray) {
      if (checked) {
        array.push(new FormControl(value));
      } else {
        const idx = array.controls.findIndex((x: any) => x.value === value);
        if (idx !== -1) array.removeAt(idx);
      }
    } else {
      // If not FormArray, treat as array value
      let arr = array?.value || [];
      if (checked) {
        arr = [...arr, value];
      } else {
        arr = arr.filter((v: any) => v !== value);
      }
      array?.setValue(arr);
    }
  }

  getKeyValueArrayEnv(envGroup: FormGroup, env: string): FormArray | null {
    const control = envGroup.get(env);
    return control instanceof FormArray ? control : null;
  }

  addKeyValuePairEnv(envGroup: FormGroup, env: string) {
    const control = envGroup.get(env);
    if (control instanceof FormArray) {
      control.push(this.fb.group({ key: '', value: '' }));
    }
  }

  removeKeyValuePairEnv(envGroup: FormGroup, env: string, index: number) {
    const control = envGroup.get(env);
    if (control instanceof FormArray) {
      control.removeAt(index);
    }
  }
}
