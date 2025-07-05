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
import { MatSelectModule } from '@angular/material/select'; // Add this import
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Observable, of } from 'rxjs';
import { ConfigValidatorBoxComponent, ConfigValidationFieldResult } from './config-validator-box.component';

@Component({
  selector: 'app-upload-config-dialog',
  template: `
    <h2 mat-dialog-title>Upload Config File</h2>
    <mat-dialog-content>
      <input type="file" accept=".conf" (change)="onFileSelected($event)" />
      <div *ngIf="fileName" style="margin-top: 1rem;">Selected: <b>{{ fileName }}</b></div>
      <div *ngIf="loading" style="margin: 1rem 0; color: #1976d2;">Loading...</div>
      <div *ngIf="rawConfigContent && !actionChosen">
        <div style="margin: 1.5rem 0;">
          <b>Choose what you want to do with this config file:</b><br>
          <button mat-stroked-button color="primary" style="margin-top: 1rem;" (click)="chooseAction('validate')">Validate Config File</button>
          <button mat-raised-button color="accent" style="margin-left: 1rem; margin-top: 1rem;" (click)="chooseAction('edit')">Duplicate & Edit</button>
        </div>
      </div>
      <div *ngIf="actionChosen && parsedData">
        <p style="color: #388e3c;">Config file parsed successfully.</p>
        <pre style="background: #222; color: #e0e0e0; padding: 0.5rem; border-radius: 4px; max-height: 200px; overflow: auto;">{{ parsedData | json }}</pre>
      </div>
      <div *ngIf="actionChosen">
        <mat-form-field *ngIf="filteredTemplates.length > 0" appearance="outline" style="width: 100%; margin-top: 1.5rem;">
          <mat-label>Template Name</mat-label>
          <input matInput name="templateName" [(ngModel)]="selectedTemplateName" (input)="onTemplateInput()" [matAutocomplete]="auto" placeholder="Type or select template name">
          <mat-autocomplete #auto="matAutocomplete" (optionSelected)="onTemplateSelected($event.option.value)">
            <mat-option *ngFor="let t of filteredTemplates" [value]="t">{{ t }}</mat-option>
          </mat-autocomplete>
        </mat-form-field>
        <mat-form-field *ngIf="selectedTemplateName && availableVersions.length > 0" appearance="outline" style="width: 100%; margin-top: 1rem;">
          <mat-label>Version</mat-label>
          <mat-select [(ngModel)]="selectedVersionTag" (selectionChange)="onVersionSelected()">
            <mat-option *ngFor="let v of availableVersions" [value]="v">{{ v }}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" style="width: 100%; margin-top: 1rem;">
          <mat-label>Environment</mat-label>
          <mat-select [(ngModel)]="selectedEnvironment">
            <mat-option value="PROD">PROD</mat-option>
            <mat-option value="DEV">DEV</mat-option>
            <mat-option value="COB">COB</mat-option>
          </mat-select>
        </mat-form-field>
        <div *ngIf="schema && actionChosen === 'validate'">
          <button mat-stroked-button (click)="onValidate()">Validate</button>
        </div>
        <div *ngIf="schema && actionChosen === 'edit'">
          <button mat-raised-button color="primary" (click)="onUpdateAndEdit()" [disabled]="!schema || !selectedVersionTag || !selectedEnvironment">Duplicate & Edit</button>
        </div>
      </div>
      <app-config-validator-box *ngIf="showValidatorBox"
        [formName]="validatorBoxData?.formName ?? ''"
        [overallStatus]="validatorBoxData?.overallStatus ?? 'fail'"
        [fieldResults]="validatorBoxData?.fieldResults ?? []"
        [extraFields]="validatorBoxData?.extraFields ?? []"
        [missingFields]="validatorBoxData?.missingFields ?? []"
        [syntaxErrors]="validatorBoxData?.syntaxErrors ?? []"
        [validationErrors]="validatorBoxData?.validationErrors ?? []"
        [warnings]="validatorBoxData?.warnings ?? []"
        (close)="showValidatorBox = false">
      </app-config-validator-box>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
    </mat-dialog-actions>
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
    MatSelectModule, // Add this to the imports array
    MatButtonModule, 
    MatIconModule,
    ConfigValidatorBoxComponent // <-- Add this
  ]
})
export class UploadConfigDialogComponent {
  fileName: string = '';
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

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    this.fileName = file.name;
    this.loading = true;
    const reader = new FileReader();
    reader.onload = () => {
      this.rawConfigContent = reader.result as string;
      this.errorMessage = '';
      this.parsedData = null;
      this.actionChosen = null; // Reset action
      this.loading = false;
    };
    reader.readAsText(file);
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
    this.validationResult = validateConfAgainstSchema(this.parsedData, this.schema, syntaxErrors);
    this.validationResult.extraFields = extraFields;
    this.validationResult.missingFields = missingFields;
    // Prepare data for validator box
    const fieldResults: ConfigValidationFieldResult[] = getConfigValidationFieldResults(this.parsedData, this.schema);
    this.validatorBoxData = {
      formName: this.selectedTemplateName,
      overallStatus: this.validationResult.valid ? 'success' : 'fail',
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
}