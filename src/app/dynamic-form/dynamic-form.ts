import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ValidatorFn, ReactiveFormsModule, FormArray, FormControl } from '@angular/forms';
import { CommonModule, NgIf, NgFor, JsonPipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { FormsModule } from '@angular/forms';
import { FORM_SCHEMA } from './form-schema';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatCheckboxModule, MatCardModule, NgIf, NgFor, JsonPipe],
  template: `
    <div class="form-card">
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <ng-container *ngFor="let field of schema.fields">
          <ng-container *ngIf="isVisible(field)">
            <ng-container [ngSwitch]="field.type">
              <div class="field-row">
                <label class="field-label">
                  {{ field.label }}<span *ngIf="isFieldRequired(field)" style="color:red">*</span>
                  <button *ngIf="field.description" mat-icon-button type="button" class="desc-btn" (click)="toggleDesc(field)">
                    <span class="material-icons">help_outline</span>
                  </button>
                </label>
                <div class="field-value">
                  <mat-form-field *ngSwitchCase="'text'" appearance="fill" style="width: 100%;">
                    <input matInput [formControlName]="field.key" [placeholder]="field.tooltip ?? ''" [readonly]="!field.editable">
                    <mat-error *ngIf="form.get(field.key)?.hasError('required')">This field is required</mat-error>
                    <mat-error *ngIf="form.get(field.key)?.hasError('pattern')">Invalid format</mat-error>
                  </mat-form-field>
                  <mat-form-field *ngSwitchCase="'number'" appearance="fill" style="width: 100%;">
                    <input matInput type="number" [formControlName]="field.key" [placeholder]="field.tooltip ?? ''" [readonly]="!field.editable">
                    <mat-error *ngIf="form.get(field.key)?.hasError('required')">This field is required</mat-error>
                  </mat-form-field>
                  <mat-form-field *ngSwitchCase="'dropdown'" appearance="fill" style="width: 100%;">
                    <mat-select [formControlName]="field.key">
                      <mat-option *ngFor="let opt of field.options" [value]="opt">{{ opt }}</mat-option>
                    </mat-select>
                    <mat-error *ngIf="form.get(field.key)?.hasError('required')">This field is required</mat-error>
                  </mat-form-field>
                  <mat-checkbox *ngSwitchCase="'boolean'" [formControlName]="field.key"> </mat-checkbox>
                </div>
                <div *ngIf="descShown[field.key]" class="desc-popup">{{ field.description }}</div>
              </div>
            </ng-container>
          </ng-container>
        </ng-container>
        <!-- Render extraProperties fields -->
        <ng-container *ngFor="let field of schema.extraProperties">
          <ng-container *ngIf="isVisible(field)">
            <ng-container [ngSwitch]="field.type">
              <div class="field-row">
                <label class="field-label">
                  {{ field.label }}<span *ngIf="isFieldRequired(field)" style="color:red">*</span>
                  <button *ngIf="field.description" mat-icon-button type="button" class="desc-btn" (click)="toggleDesc(field)">
                    <span class="material-icons">help_outline</span>
                  </button>
                </label>
                <div class="field-value">
                  <mat-form-field *ngSwitchCase="'text'" appearance="fill" style="width: 100%;">
                    <input matInput [formControlName]="field.key" [placeholder]="field.tooltip ?? ''" [readonly]="!field.editable">
                    <mat-error *ngIf="form.get(field.key)?.hasError('required')">This field is required</mat-error>
                    <mat-error *ngIf="form.get(field.key)?.hasError('pattern')">Invalid format</mat-error>
                  </mat-form-field>
                  <mat-form-field *ngSwitchCase="'number'" appearance="fill" style="width: 100%;">
                    <input matInput type="number" [formControlName]="field.key" [placeholder]="field.tooltip ?? ''" [readonly]="!field.editable">
                    <mat-error *ngIf="form.get(field.key)?.hasError('required')">This field is required</mat-error>
                  </mat-form-field>
                  <mat-form-field *ngSwitchCase="'dropdown'" appearance="fill" style="width: 100%;">
                    <mat-select [formControlName]="field.key">
                      <mat-option *ngFor="let opt of field.options" [value]="opt">{{ opt }}</mat-option>
                    </mat-select>
                    <mat-error *ngIf="form.get(field.key)?.hasError('required')">This field is required</mat-error>
                  </mat-form-field>
                  <mat-checkbox *ngSwitchCase="'boolean'" [formControlName]="field.key"> </mat-checkbox>
                </div>
                <div *ngIf="descShown[field.key]" class="desc-popup">{{ field.description }}</div>
              </div>
            </ng-container>
          </ng-container>
        </ng-container>
        <!-- Render Column Mapping first -->
        <ng-container *ngIf="schema.mapSections.length">
          <ng-container *ngFor="let map of schema.mapSections; let i = index">
            <ng-container *ngIf="map.key === 'columnMapping'">
              <div style="margin: 24px 0;">
                <h3>{{ map.label }}</h3>
                <div *ngFor="let key of getMapKeys(map)" class="map-row">
                  <span class="map-key-label">{{ key }}</span>
                  <span>:</span>
                  <mat-form-field appearance="fill" class="map-value-field">
                    <input matInput [formControlName]="key">
                  </mat-form-field>
                </div>
                <div class="map-row">
                  <input #newMapKeyInput placeholder="New key" class="map-key-input" matInput>
                  <button mat-stroked-button class="map-add-btn" type="button" (click)="addMapKey(map.key, newMapKeyInput.value); newMapKeyInput.value=''">+ Add Key</button>
                </div>
              </div>
            </ng-container>
          </ng-container>
        </ng-container>
        <!-- Render custom map sections after Column Mapping -->
        <ng-container *ngIf="schema.mapSections.length">
          <ng-container *ngFor="let map of schema.mapSections; let i = index">
            <ng-container *ngIf="map.key !== 'columnMapping'">
              <div style="margin: 24px 0;">
                <h3>{{ map.label }}</h3>
                <div *ngFor="let key of getMapKeys(map)" class="map-row">
                  <span class="map-key-label">{{ key }}</span>
                  <span>:</span>
                  <mat-form-field appearance="fill" class="map-value-field">
                    <input matInput [formControlName]="key">
                  </mat-form-field>
                </div>
                <div class="map-row">
                  <input #newMapKeyInputCustom placeholder="New key" class="map-key-input" matInput>
                  <button mat-stroked-button class="map-add-btn" type="button" (click)="addMapKey(map.key, newMapKeyInputCustom.value); newMapKeyInputCustom.value=''">+ Add Key</button>
                </div>
              </div>
            </ng-container>
          </ng-container>
        </ng-container>
        <div style="margin: 32px 0 0 0; text-align: right; display: flex; justify-content: flex-end; gap: 12px;">
          <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid">Submit</button>
          <button mat-stroked-button color="accent" type="button" (click)="openAddFieldDialog()">+ Add Extra Field</button>
        </div>
      </form>
    </div>

    <!-- Add Field Modal Popup -->
    <div *ngIf="showAddFieldCard" class="modal-overlay">
      <div class="modal-content wide-modal">
        <button class="close-btn" (click)="showAddFieldCard=false">&times;</button>
        <h2 style="margin-top:0">Add Extra Field</h2>
        <form [formGroup]="addFieldForm">
          <mat-form-field appearance="fill" style="width: 100%" *ngIf="addFieldForm.get('type')?.value!=='customMap'">
            <mat-label>Key<span style="color:red" *ngIf="addFieldForm.get('key')?.invalid && addFieldForm.get('key')?.touched">*</span></mat-label>
            <input matInput formControlName="key">
          </mat-form-field>
          <mat-form-field appearance="fill" style="width: 100%" *ngIf="addFieldForm.get('type')?.value!=='customMap'">
            <mat-label>Label<span style="color:red" *ngIf="addFieldForm.get('label')?.invalid && addFieldForm.get('label')?.touched">*</span></mat-label>
            <input matInput formControlName="label">
          </mat-form-field>
          <mat-form-field appearance="fill" style="width: 100%" *ngIf="addFieldForm.get('type')?.value!=='customMap'">
            <mat-label>Type<span style="color:red" *ngIf="addFieldForm.get('type')?.invalid && addFieldForm.get('type')?.touched">*</span></mat-label>
            <mat-select formControlName="type">
              <mat-option *ngFor="let t of fieldTypes" [value]="t">{{t}}</mat-option>
              <mat-option value="customMap">Custom Map Section</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="fill" style="width: 100%" *ngIf="addFieldForm.get('type')?.value==='dropdown'">
            <mat-label>Dropdown Options (comma separated)</mat-label>
            <input matInput formControlName="options" placeholder="e.g. option1, option2">
          </mat-form-field>
          <mat-form-field appearance="fill" style="width: 100%" *ngIf="addFieldForm.get('type')?.value==='customMap'">
            <mat-label>Section Name</mat-label>
            <input matInput formControlName="customMapName" placeholder="Enter section name">
          </mat-form-field>
          <div *ngIf="addFieldForm.get('type')?.value==='customMap'">
            <div *ngFor="let pair of customMapPairs; let i = index" style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <span class="map-key-label">{{ pair.key }}</span>
              <span>:</span>
              <input matInput [(ngModel)]="customMapPairs[i].value" placeholder="Value" style="flex:1;max-width:180px;">
              <button mat-icon-button color="warn" (click)="removeCustomMapPair(i)"><span class="material-icons">close</span></button>
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <input #newCustomMapKey placeholder="New key" style="flex:1;max-width:180px;" matInput>
              <button mat-stroked-button type="button" (click)="addCustomMapPair(newCustomMapKey.value); newCustomMapKey.value=''">+ Add Key</button>
            </div>
          </div>
          <mat-form-field appearance="fill" style="width: 100%" *ngIf="addFieldForm.get('type')?.value!=='customMap'">
            <mat-label>Default Value</mat-label>
            <input matInput formControlName="defaultValue" [placeholder]="defaultValuePlaceholder">
          </mat-form-field>
          <mat-form-field appearance="fill" style="width: 100%" *ngIf="addFieldForm.get('type')?.value!=='customMap'">
            <mat-label>Regex</mat-label>
            <input matInput formControlName="regex">
          </mat-form-field>
          <mat-form-field appearance="fill" style="width: 100%" *ngIf="addFieldForm.get('type')?.value!=='customMap'">
            <mat-label>Tooltip</mat-label>
            <input matInput formControlName="tooltip">
          </mat-form-field>
          <mat-form-field appearance="fill" style="width: 100%" *ngIf="addFieldForm.get('type')?.value!=='customMap'">
            <mat-label>Description</mat-label>
            <input matInput formControlName="description">
          </mat-form-field>
          <div style="display:flex;gap:16px;align-items:center;margin:8px 0;" *ngIf="addFieldForm.get('type')?.value!=='customMap'">
            <mat-checkbox formControlName="mandatory">Mandatory</mat-checkbox>
            <mat-checkbox formControlName="editable">Editable</mat-checkbox>
          </div>
          <!-- Condition fields: mandatoryIf and visibleIf, always shown, side by side -->
          <div *ngIf="addFieldForm.get('type')?.value!=='customMap'" style="display:flex;gap:12px;align-items:center;">
            <mat-form-field appearance="fill" style="flex:1;min-width:120px;">
              <mat-label>Mandatory If Key</mat-label>
              <mat-select formControlName="mandatoryIfKey">
                <mat-option value="">None</mat-option>
                <mat-option *ngFor="let k of allKeys()" [value]="k">{{k}}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="fill" style="flex:1;min-width:120px;">
              <mat-label>Mandatory If Value</mat-label>
              <mat-select *ngIf="getPossibleValuesForKey(addFieldForm.get('mandatoryIfKey')?.value).length > 0" formControlName="mandatoryIfValue">
                <mat-option *ngFor="let v of getPossibleValuesForKey(addFieldForm.get('mandatoryIfKey')?.value)" [value]="v">{{v}}</mat-option>
              </mat-select>
              <input matInput *ngIf="getPossibleValuesForKey(addFieldForm.get('mandatoryIfKey')?.value).length === 0" formControlName="mandatoryIfValue" [readonly]="!addFieldForm.get('mandatoryIfKey')?.value">
            </mat-form-field>
          </div>
          <div *ngIf="addFieldForm.get('type')?.value!=='customMap'" style="display:flex;gap:12px;align-items:center;">
            <mat-form-field appearance="fill" style="flex:1;min-width:120px;">
              <mat-label>Visible If Key</mat-label>
              <mat-select formControlName="visibleIfKey">
                <mat-option value="">None</mat-option>
                <mat-option *ngFor="let k of allKeys()" [value]="k">{{k}}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="fill" style="flex:1;min-width:120px;">
              <mat-label>Visible If Value</mat-label>
              <mat-select *ngIf="getPossibleValuesForKey(addFieldForm.get('visibleIfKey')?.value).length > 0" formControlName="visibleIfValue">
                <mat-option *ngFor="let v of getPossibleValuesForKey(addFieldForm.get('visibleIfKey')?.value)" [value]="v">{{v}}</mat-option>
              </mat-select>
              <input matInput *ngIf="getPossibleValuesForKey(addFieldForm.get('visibleIfKey')?.value).length === 0" formControlName="visibleIfValue" [readonly]="!addFieldForm.get('visibleIfKey')?.value">
            </mat-form-field>
          </div>
        </form>
        <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end;">
          <button mat-raised-button color="primary" (click)="addFieldToExtraProperties()">Add Field</button>
          <button mat-button (click)="showAddFieldCard=false">Cancel</button>
        </div>
      </div>
    </div>

    <style>
      .form-card {
        background: #f7fafd;
        border-radius: 12px;
        box-shadow: 0 2px 16px rgba(0,0,0,0.10);
        padding: 32px 24px 24px 24px;
        max-width: 900px;
        margin: 32px auto;
        overflow-y: auto;
        min-height: 80vh;
        max-height: 90vh;
      }
      .modal-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.3);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .modal-content {
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 2px 16px rgba(0,0,0,0.2);
        padding: 18px 18px 8px 18px;
        min-width: 320px;
        max-width: 540px;
        position: relative;
      }
      .wide-modal {
        min-width: 420px;
        max-width: 540px;
      }
      .map-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }
      .map-key-label {
        display: inline-block;
        background: #e3f2fd;
        color: #1976d2;
        border-radius: 4px;
        padding: 2px 10px;
        font-weight: 500;
        font-size: 1em;
        min-width: 60px;
      }
      .map-value-field {
        flex: 1;
        min-width: 120px;
        max-width: 350px;
      }
      .map-key-input {
        width: 80px;
        min-width: 60px;
        max-width: 100px;
        font-size: 0.95em;
        margin-left: 8px;
      }
      .map-add-btn {
        min-width: 60px;
        font-size: 0.95em;
        padding: 2px 8px;
        margin-left: 4px;
      }

      .field-row {
        display: flex;
        align-items: flex-start;
        margin-bottom: 16px;
        gap: 12px;
      }
      .field-label {
        min-width: 160px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .desc-btn {
        padding: 0;
        min-width: 24px;
        min-height: 24px;
        line-height: 1;
      }
      .desc-popup {
        background: #f5f5f5;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 8px 12px;
        margin-left: 8px;
        font-size: 0.95em;
        max-width: 320px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      }
      .field-value {
        flex: 1;
      }
    </style>
  `,
  styles: `form { max-width: 800px; margin: 24px auto; }`
})
export class DynamicForm implements OnInit {
  schema: any = FORM_SCHEMA;
  form: FormGroup;
  submitted = false;
  showAddFieldCard = false;
  showAddFormCard = false;
  newForm: any = {
    framework: '', description: '', fields: [], mapSections: [], extraProperties: []
  };
  addFieldForm!: FormGroup;

  // For new field creation UI
  fieldTypes = ['text', 'dropdown', 'boolean', 'number', 'map', 'json'];

  // Used for custom map section creation in add field modal
  customMapPairs: { key: string, value: string }[] = [];

  defaultValuePlaceholder = '';

  addCustomMapPair(newKey: string) {
    const key = newKey.trim();
    if (key && !this.customMapPairs.find(p => p.key === key)) {
      this.customMapPairs.push({ key, value: '' });
    }
  }

  removeCustomMapPair(idx: number) {
    this.customMapPairs.splice(idx, 1);
  }

  // --- AddFieldForm now exposes all possible field keys ---
  buildAddFieldForm() {
    return this.fb.group({
      key: ['', Validators.required],
      label: ['', Validators.required],
      type: ['', Validators.required],
      defaultValue: [''],
      mandatory: [false],
      editable: [true],
      regex: [''],
      options: [''],
      tooltip: [''],
      description: [''],
      allowUserAddition: [false],
      mandatoryIfKey: [''],
      mandatoryIfValue: [''],
      visibleIfKey: [''],
      visibleIfValue: [''],
      customMapName: ['', Validators.required] // Only for custom map
    });
  }

  // Helper to get possible values for a key (for IfValue dropdown)
  getPossibleValuesForKey(key: string) {
    const field = [...this.schema.fields, ...this.schema.extraProperties].find((f: any) => f.key === key);
    if (!field) return [];
    if (field.type === 'dropdown') return field.options || [];
    if (field.type === 'boolean') return [true, false];
    return [];
  }

  constructor(public fb: FormBuilder, private route: ActivatedRoute, private router: Router) {
    this.addFieldForm = this.buildAddFieldForm();
    this.form = this.fb.group({});
  }

  ngOnInit() {
    // Check route param to load form or new
    this.route.paramMap.subscribe(params => {
      const name = params.get('name');
      if (name === 'new') {
        // Clear schema for new form
        this.schema = { framework: '', description: '', fields: [], mapSections: [], extraProperties: [] };
      } else {
        // Use hardcoded schema (file-ingestion)
        this.schema = FORM_SCHEMA;
      }
      const group: any = {};
      (this.schema.fields as any[]).forEach((field: any) => {
        const validators: ValidatorFn[] = [];
        if (field.mandatory) validators.push(Validators.required);
        if (field.regex) validators.push(Validators.pattern(field.regex));
        group[field.key] = [field.defaultValue ?? '', validators];
      });
      (this.schema.mapSections as any[] ?? []).forEach((map: any) => {
        group[map.key] = this.fb.group(map.defaultValue || {});
      });
      this.form = this.fb.group(group);
      this.form.valueChanges.subscribe(() => this.updateConditionalValidators());
    });
    this.addFieldForm?.get('type')?.valueChanges.subscribe(() => this.updateDefaultValuePlaceholder());
    this.addFieldForm?.get('options')?.valueChanges.subscribe(() => this.updateDefaultValuePlaceholder());
  }

  updateConditionalValidators() {
    (this.schema.fields as any[]).forEach((field: any) => {
      if (field.mandatoryIf) {
        const depField = this.schema.fields.find((f: any) => f.key === field.mandatoryIf.key) || this.schema.extraProperties.find((f: any) => f.key === field.mandatoryIf.key);
        let depValue = this.form.get(field.mandatoryIf.key)?.value;
        let condValue = field.mandatoryIf.value;
        if (depField && depField.type === 'boolean') {
          depValue = depValue === true || depValue === 'true';
          condValue = condValue === true || condValue === 'true';
        } else {
          depValue = depValue != null ? String(depValue) : depValue;
          condValue = condValue != null ? String(condValue) : condValue;
        }
        const control = this.form.get(field.key);
        if (depValue === condValue) {
          control?.addValidators(Validators.required);
        } else {
          control?.removeValidators(Validators.required);
        }
        control?.updateValueAndValidity({ emitEvent: false });
      }
    });
    // Also update for extraProperties
    (this.schema.extraProperties as any[]).forEach((field: any) => {
      if (field.mandatoryIf) {
        const depField = this.schema.fields.find((f: any) => f.key === field.mandatoryIf.key) || this.schema.extraProperties.find((f: any) => f.key === field.mandatoryIf.key);
        let depValue = this.form.get(field.mandatoryIf.key)?.value;
        let condValue = field.mandatoryIf.value;
        if (depField && depField.type === 'boolean') {
          depValue = depValue === true || depValue === 'true';
          condValue = condValue === true || condValue === 'true';
        } else {
          depValue = depValue != null ? String(depValue) : depValue;
          condValue = condValue != null ? String(condValue) : condValue;
        }
        const control = this.form.get(field.key);
        if (depValue === condValue) {
          control?.addValidators(Validators.required);
        } else {
          control?.removeValidators(Validators.required);
        }
        control?.updateValueAndValidity({ emitEvent: false });
      }
    });
  }

  isVisible(field: any): boolean {
    if (!field.visibleIf) return true;
    const depField = this.schema.fields.find((f: any) => f.key === field.visibleIf.key) || this.schema.extraProperties.find((f: any) => f.key === field.visibleIf.key);
    let depValue = this.form.get(field.visibleIf.key)?.value;
    let condValue = field.visibleIf.value;
    if (depField && depField.type === 'boolean') {
      depValue = depValue === true || depValue === 'true';
      condValue = condValue === true || condValue === 'true';
    } else {
      depValue = depValue != null ? String(depValue) : depValue;
      condValue = condValue != null ? String(condValue) : condValue;
    }
    return depValue === condValue;
  }

  getMapKeys(map: any) {
    return Object.keys(this.form.value[map.key] || {});
  }

  addMapKey(mapKey: string, newKey?: string) {
    const key = newKey?.trim();
    if (key) {
      (this.form.get(mapKey) as FormGroup).addControl(key, new FormControl(''));
    }
  }

  onSubmit() {
    this.submitted = true;
    // Mark all controls as touched to trigger validation
    Object.values(this.form.controls).forEach(control => {
      if (control instanceof FormControl) {
        control.markAsTouched();
        control.updateValueAndValidity();
      } else if (control instanceof FormGroup) {
        Object.values(control.controls).forEach(c => {
          c.markAsTouched();
          c.updateValueAndValidity();
        });
      }
    });
    if (this.form.invalid) {
      return;
    }
    // ...existing submit logic if any...
  }

  openAddFieldDialog(forNewFramework = false) {
    this.showAddFieldCard = true;
    this.addFieldForm = this.buildAddFieldForm();
    this.addFieldForm.reset({ type: 'text', mandatory: false, editable: true });
    this.addingToNewFramework = forNewFramework;
  }

  addingToNewFramework = false;

  // --- Add field to either extraProperties or new framework fields ---
  addFieldToExtraProperties() {
    
    const f = this.addFieldForm.value;
    // Handle custom map section creation
    if (f.type === 'customMap') {
      const mapKey = f.customMapName;
      if (!mapKey) return;
      const defaultValue = this.customMapPairs.reduce((acc: any, pair: { key: string, value: string }) => { acc[pair.key] = pair.value; return acc; }, {});
      const mapSection = {
        key: mapKey,
        label: mapKey,
        type: 'map',
        defaultValue,
        mandatory: false,
        allowUserAddition: true
      };
      if (this.addingToNewFramework) {
        this.newForm.mapSections.push(mapSection);
      } else {
        this.schema.mapSections.push(mapSection);
        this.form.addControl(mapKey, this.fb.group(defaultValue));
      }
      this.customMapPairs = [];
      this.showAddFieldCard = false;
      return;
    }
    // Build field object with all keys, null for empty
    // --- Fix: ensure conditional values are boolean if the dependent field is boolean ---
    let mandatoryIf = null;
    if (f.mandatoryIfKey && f.mandatoryIfValue !== undefined && f.mandatoryIfValue !== null && f.mandatoryIfKey !== '') {
      const depField = [...this.schema.fields, ...this.schema.extraProperties].find((fld: any) => fld.key === f.mandatoryIfKey);
      let condValue: any = f.mandatoryIfValue;
      if (depField && depField.type === 'boolean') {
        condValue = (condValue === true || condValue === 'true');
      }
      mandatoryIf = { key: f.mandatoryIfKey, value: condValue };
    }
    let visibleIf = null;
    if (f.visibleIfKey && f.visibleIfValue !== undefined && f.visibleIfValue !== null && f.visibleIfKey !== '') {
      const depField = [...this.schema.fields, ...this.schema.extraProperties].find((fld: any) => fld.key === f.visibleIfKey);
      let condValue: any = f.visibleIfValue;
      if (depField && depField.type === 'boolean') {
        condValue = (condValue === true || condValue === 'true');
      }
      visibleIf = { key: f.visibleIfKey, value: condValue };
    }
    const field: any = {
      key: f.key,
      label: f.label,
      type: f.type,
      defaultValue: f.defaultValue === '' ? null : f.defaultValue,
      mandatory: !!f.mandatory,
      editable: !!f.editable,
      regex: f.regex === '' ? null : f.regex,
      options: f.type === 'dropdown' ? (f.options ? f.options.split(',').map((o: string) => o.trim()) : null) : null,
      tooltip: f.tooltip === '' ? null : f.tooltip,
      description: f.description === '' ? null : f.description,
      allowUserAddition: false, // always false from modal
      mandatoryIf: mandatoryIf,
      visibleIf: visibleIf
    };
    if (this.addingToNewFramework) {
      this.newForm.fields.push(field);
    } else {
      this.schema.extraProperties.push(field);
      // Add control with required validator if mandatory is set
      const validators: ValidatorFn[] = [];
      if (field.mandatory) validators.push(Validators.required);
      if (field.regex) validators.push(Validators.pattern(field.regex));
      this.form.addControl(field.key, new FormControl(field.defaultValue ?? '', validators));
      this.updateConditionalValidators();
    }
    this.showAddFieldCard = false;
  }

  // --- For new framework creation, use the same modal and logic ---
  openNewFormDialog() {
    this.showAddFormCard = true;
    this.newForm = { framework: '', description: '', fields: [], mapSections: [], extraProperties: [] };
  }

  addFieldToNewFramework() {
    this.openAddFieldDialog(true);
  }

  saveNewForm() {
    // Simulate saving to /assets/forms/ (in real app, use backend or file API)
    const forms = JSON.parse(localStorage.getItem('forms') || '[]');
    forms.push({ ...this.newForm });
    localStorage.setItem('forms', JSON.stringify(forms));
    this.showAddFormCard = false;
  }

  isDropdownOrBoolean(key: string): boolean {
    const field = [...this.schema.fields, ...this.schema.extraProperties].find((f: any) => f.key === key);
    return field && (field.type === 'dropdown' || field.type === 'boolean');
  }

  descShown: { [key: string]: boolean } = {};
  toggleDesc(field: any) {
    this.descShown[field.key] = !this.descShown[field.key];
  }

  allKeys() {
    return [
      ...this.schema.fields.map((f: any) => f.key),
      ...this.schema.extraProperties.map((f: any) => f.key)
    ];
  }

  updateDefaultValuePlaceholder() {
    const type = this.addFieldForm.get('type')?.value;
    const options = this.addFieldForm.get('options')?.value;
    let placeholder = '';
    if (type === 'dropdown' && options) {
      placeholder = 'e.g. ' + options.split(',').map((o: string) => o.trim()).join(', ');
    } else if (type === 'boolean') {
      placeholder = 'true or false';
    } else if (type === 'number') {
      placeholder = 'Enter a number';
    } else {
      placeholder = '';
    }
    this.defaultValuePlaceholder = placeholder;
  }

  // Add isFieldRequired helper
  isFieldRequired(field: any): boolean {
    if (field.mandatory) return true;
    if (field.mandatoryIf) {
      const depField = this.schema.fields.find((f: any) => f.key === field.mandatoryIf.key) || this.schema.extraProperties.find((f: any) => f.key === field.mandatoryIf.key);
      let depValue = this.form.get(field.mandatoryIf.key)?.value;
      let condValue = field.mandatoryIf.value;
      if (depField && depField.type === 'boolean') {
        depValue = depValue === true || depValue === 'true';
        condValue = condValue === true || condValue === 'true';
      } else {
        depValue = depValue != null ? String(depValue) : depValue;
        condValue = condValue != null ? String(condValue) : condValue;
      }
      return depValue === condValue;
    }
    return false;
  }
}