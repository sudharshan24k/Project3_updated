import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
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
import { SchemaService, TemplateSchema, TemplateInfo } from './schema.service';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { VersionDialogComponent, VersionDialogData } from '../version-dialog.component';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatAutocompleteModule, MatAutocomplete, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Observable, startWith, map } from 'rxjs';
import { MatInput } from '@angular/material/input';

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatCheckboxModule, MatCardModule, NgIf, NgFor, MatIconModule, MatTooltipModule, MatRadioModule, MatSlideToggleModule, DragDropModule, MatAutocompleteModule],
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
            <div *ngFor="let field of visibleFields" class="form-field vertical-field" [ngSwitch]="field.type">
              <div class="field-label-vertical">
                <span>{{ field.label }}</span>
                <span *ngIf="isFieldRequired(field)" class="required-asterisk-vertical">*</span>
              </div>
              <div class="field-input-vertical"
                   [ngClass]="{'no-line': field.type === 'mcq_multiple' || field.type === 'boolean'}">
                <ng-container [ngSwitch]="field.type">
                  <input *ngSwitchCase="'text'" matInput [formControlName]="field.key" [placeholder]="field.placeholder || 'Enter ' + field.label" [readonly]="isReadOnly || !field.editable" class="input-vertical modern-placeholder" />
                  <input *ngSwitchCase="'number'" matInput type="number" [formControlName]="field.key" [placeholder]="field.placeholder || 'Enter ' + field.label" [readonly]="isReadOnly || !field.editable" class="input-vertical modern-placeholder" />
                  <input *ngSwitchCase="'email'" matInput type="email" [formControlName]="field.key" [placeholder]="field.placeholder || 'Enter ' + field.label" [readonly]="isReadOnly || !field.editable" class="input-vertical modern-placeholder" />
                  <input *ngSwitchCase="'timestamp'" matInput type="datetime-local" [formControlName]="field.key" [readonly]="isReadOnly || !field.editable" class="input-vertical modern-placeholder" />
                  <mat-select *ngSwitchCase="'dropdown'" [formControlName]="field.key" [disabled]="isReadOnly || !field.editable" [placeholder]="field.placeholder || ''" class="input-vertical">
                    <mat-option *ngFor="let opt of field.options" [value]="opt.value">{{ opt.label }}</mat-option>
                  </mat-select>
                  <mat-radio-group *ngSwitchCase="'mcq_single'" [formControlName]="field.key" [disabled]="isReadOnly || !field.editable" class="input-vertical mcq-options-vertical">
                    <div *ngFor="let opt of field.options">
                      <mat-radio-button [value]="opt.value">{{ opt.label }}</mat-radio-button>
                    </div>
                  </mat-radio-group>
                  <div *ngSwitchCase="'mcq_multiple'" class="mcq-multi-options input-vertical mcq-options-vertical">
                    <!-- Each option on a separate line -->
                    <div *ngFor="let opt of field.options" style="width: 100%;">
                      <div style="display: flex; align-items: center;">
                        <mat-checkbox [checked]="form.get(field.key)?.value?.includes(opt.value)"
                                      (change)="onMCQMultiChange(field.key, opt.value, getCheckboxChecked($event))"
                                      [disabled]="isReadOnly || !field.editable">
                          {{ opt.label }}
                        </mat-checkbox>
                      </div>
                    </div>
                  </div>
                  <mat-slide-toggle *ngSwitchCase="'boolean'" [formControlName]="field.key" [disabled]="isReadOnly || !field.editable" class="input-vertical">{{ field.placeholder || field.label }}</mat-slide-toggle>
                  <div *ngSwitchCase="'keyvalue'" class="keyvalue-array-vertical">
                    <div *ngFor="let group of getKeyValueArray(field.key)?.controls; let i = index" [formGroupName]="i" class="keyvalue-pair-vertical">
                      <input matInput formControlName="key" [placeholder]="field.placeholder ? field.placeholder + ' (Key)' : 'Enter ' + field.label + ' key'" class="input-vertical" />
                      <input matInput formControlName="value" [placeholder]="field.placeholder ? field.placeholder + ' (Value)' : 'Enter ' + field.label + ' value'" class="input-vertical" />
                      <button mat-icon-button color="warn" type="button" (click)="removeKeyValuePair(field.key, i)">
                        <span class="material-icons">delete</span>
                      </button>
                    </div>
                    <button mat-stroked-button color="primary" type="button" (click)="addKeyValuePair(field.key)">+ Add Pair</button>
                  </div>
                </ng-container>
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
          
          <div *ngIf="isLoading" class="schema-loading">
            <div class="loading-spinner">
              <mat-icon class="spinning">refresh</mat-icon>
              <p>Loading template data...</p>
            </div>
          </div>
          
          <div *ngIf="!isLoading">
            <div *ngIf="mode === 'create'" class="import-template-bar">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Import Existing Template</mat-label>
                <input #templateInput type="text" matInput [formControl]="templateSearchCtrl" [matAutocomplete]="auto" placeholder="Search or select template" (focus)="openAutocomplete()">
                <mat-autocomplete #auto="matAutocomplete" (optionSelected)="onImportTemplateChange($event.option.value)">
                  <mat-option [value]="null">-- None --</mat-option>
                  <mat-option *ngFor="let t of filteredTemplates$ | async" [value]="t.name">
                    <span [innerHTML]="highlightMatch(t.name, templateSearchCtrl.value)"></span>
                    <span class="template-author">&nbsp;by {{ t.author || 'Unknown' }}</span>
                    <div class="template-description">{{ t.description }}</div>
                  </mat-option>
                </mat-autocomplete>
              </mat-form-field>
              <button *ngIf="isImporting" mat-stroked-button color="warn" (click)="clearImportedTemplate()">
                <mat-icon>clear</mat-icon> Clear Template
              </button>
            </div>
            <div class="form-field">
              <label>Template Name</label>
              <input [(ngModel)]="schema.name" placeholder="A unique name for this template" [ngModelOptions]="{standalone: true}" [disabled]="mode === 'edit'">
            </div>
            <div class="form-field">
              <label>Template Description</label>
              <input [(ngModel)]="schema.description" placeholder="A short description of the form's purpose" [ngModelOptions]="{standalone: true}">
            </div>
            <div class="form-field">
              <label>Author Name</label>
              <input [(ngModel)]="schema.author" placeholder="Author of this template" [ngModelOptions]="{standalone: true}">
            </div>

            <hr class="section-divider">

            <div class="field-list-header">
              <h4>Fields</h4>
              <button class="add-field-btn" (click)="showAddFieldEditor()" *ngIf="!isFieldEditorVisible">
                <mat-icon>add</mat-icon> Add Field
              </button>
            </div>
            
            <div class="field-list" cdkDropList (cdkDropListDropped)="dropField($event)">
              <div *ngFor="let field of schema.fields; let i = index" class="field-item" cdkDrag>
                <div class="drag-handle" cdkDragHandle matTooltip="Drag to reorder">
                  <mat-icon>drag_indicator</mat-icon>
                </div>
                <div>
                  <strong class="field-label">{{ field.label }}</strong>
                  <span class="field-meta">{{ field.key }} &middot; {{ field.type }}</span>
                </div>
                <div class="field-actions">
                  <button (click)="editField(i)" mat-icon-button matTooltip="Edit Field">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button class="action-duplicate" (click)="duplicateField(i)" mat-icon-button matTooltip="Duplicate Field">
                    <mat-icon>content_copy</mat-icon>
                  </button>
                  <button class="action-delete" (click)="removeField(i)" mat-icon-button matTooltip="Remove Field">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </div>
              </div>
               <p *ngIf="schema.fields.length === 0" class="no-fields-message">No fields added yet.</p>
            </div>

            <div *ngIf="!isFieldEditorVisible" style="display: flex; justify-content: center; margin-top: 1rem;">
              <button class="add-field-btn" (click)="showAddFieldEditor()">
                <mat-icon>add</mat-icon> Add Field
              </button>
            </div>

            <!-- Add/Edit Field Form -->
            <div *ngIf="isFieldEditorVisible" class="field-editor-form card">
              <h5 class="field-editor-title">{{ currentFieldIndex === null ? 'Add New Field' : 'Edit Field' }}</h5>
              
              <form [formGroup]="fieldForm" class="field-form-grid">
                <!-- Basic Info Section -->
                <div class="section-heading span-2"><mat-icon>info</mat-icon> Basic Info</div>

                <div class="form-field span-2">
                  <label>Field Label <span class="required-asterisk">*</span></label>
                  <input formControlName="label" placeholder="Visible label (e.g., 'First Name')" />
                </div>
                <div class="form-field">
                  <label>Field Key <span class="required-asterisk">*</span></label>
                  <input formControlName="key" placeholder="unique_key" [readonly]="currentFieldIndex !== null">
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
                    <mat-icon *ngIf="fieldForm.get('type')?.value === 'mcq_single'">radio_button_checked</mat-icon>
                    <mat-icon *ngIf="fieldForm.get('type')?.value === 'mcq_multiple'">check_box</mat-icon>
                    <mat-icon *ngIf="fieldForm.get('type')?.value === 'keyvalue'">key</mat-icon>
                    <select formControlName="type">
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="email">Email</option>
                      <option value="boolean">Boolean</option>
                      <option value="dropdown">Dropdown</option>
                      <option value="mcq_single">MCQ (Single Select)</option>
                      <option value="mcq_multiple">MCQ (Multiple Select)</option>
                      <option value="keyvalue">Key-Value</option>
                    </select>
                  </div>
                </div>

                <!-- Field Settings Section -->
                <div class="section-heading span-2"><mat-icon>tune</mat-icon> Field Settings</div>
                <div class="form-field span-2">
                  <label>Placeholder / Help Text</label>
                  <input formControlName="placeholder" placeholder="Help text inside the input or for checkbox" />
                </div>
                <div class="form-field">
                  <label>Default Value</label>
                  <!-- For dropdown and mcq_single -->
                  <ng-container *ngIf="fieldForm.get('type')?.value === 'dropdown' || fieldForm.get('type')?.value === 'mcq_single'">
                    <select formControlName="defaultValue">
                      <option *ngFor="let opt of options.controls" [value]="opt.value.value">{{ opt.value.label }}</option>
                    </select>
                  </ng-container>
                  <!-- For mcq_multiple -->
                  <ng-container *ngIf="fieldForm.get('type')?.value === 'mcq_multiple'">
                    <div *ngFor="let opt of options.controls">
                      <input type="checkbox"
                            [value]="opt.value.value"
                            (change)="onDefaultMultiChange($event, opt.value.value)"
                            [checked]="fieldForm.value.defaultValue?.includes(opt.value.value)">
                      {{ opt.value.label }}
                    </div>
                  </ng-container>
                  <!-- For boolean -->
                  <ng-container *ngIf="fieldForm.get('type')?.value === 'boolean'">
                    <select formControlName="defaultValue">
                      <option [ngValue]="true">True</option>
                      <option [ngValue]="false">False</option>
                    </select>
                  </ng-container>
                  <!-- For other types -->
                  <ng-container *ngIf="fieldForm.get('type')?.value !== 'dropdown' && fieldForm.get('type')?.value !== 'mcq_single' && fieldForm.get('type')?.value !== 'mcq_multiple' && fieldForm.get('type')?.value !== 'boolean'">
                    <input formControlName="defaultValue" placeholder="Optional default value">
                  </ng-container>
                </div>
                <div class="form-field" *ngIf="fieldForm.get('type')?.value === 'text'">
                  <label>Validation Regex <mat-icon matTooltip="Pattern the input must match (e.g., ^[a-zA-Z]+$)">help_outline</mat-icon></label>
                  <div class="input-with-button">
                    <input formControlName="regex" placeholder="e.g., ^[a-zA-Z]+$">
                    <button type="button" mat-icon-button (click)="regexHelperVisible = !regexHelperVisible" matTooltip="Show Regex Helper">
                      <mat-icon>auto_fix_high</mat-icon>
                    </button>
                  </div>
                  <div *ngIf="regexHelperVisible" class="regex-helper-dropdown card">
                    <div style="font-weight: 600; margin-bottom: 0.5rem;">Regex Helper</div>
                    <div *ngFor="let opt of regexOptions" class="regex-option">
                      <button type="button" (click)="fieldForm.get('regex')?.setValue(opt.value); regexHelperVisible = false;">
                        {{ opt.label }}
                        <span>{{ opt.value }}</span>
                      </button>
                    </div>
                    <button type="button" (click)="regexHelperVisible = false" class="close-regex-btn">Close</button>
                  </div>
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
                <div *ngIf="fieldForm.get('type')?.value === 'dropdown'" class="options-editor span-2">
                  <h6 class="section-heading"><mat-icon>list</mat-icon> Dropdown Options</h6>
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

                <!-- MCQ Options Section -->
                <div *ngIf="fieldForm.get('type')?.value === 'mcq_single' || fieldForm.get('type')?.value === 'mcq_multiple'" class="options-editor span-2">
                  <h6 class="section-heading"><mat-icon>list</mat-icon> MCQ Options</h6>
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

                <!-- Key-Value Pairs Section -->
                <div *ngIf="fieldForm.get('type')?.value === 'keyvalue'" class="form-field span-2">
                  <label>Default Keys (comma separated)</label>
                  <input [(ngModel)]="fieldForm.value.initialKeys" placeholder="e.g. key1, key2, key3" [ngModelOptions]="{standalone: true}">
                </div>

                <!-- Conditional Logic Section -->
                <div class="section-heading span-2"><mat-icon>visibility</mat-icon> Conditional Logic</div>
                <div class="form-field span-2">
                  <label>Visible If (Show this field only if another field has a specific value)</label>
                  <div class="conditional-logic-row">
                    <select [(ngModel)]="visibleIfKey" [ngModelOptions]="{standalone: true}">
                      <option [ngValue]="null">-- Select Field --</option>
                      <option *ngFor="let f of schema.fields" [ngValue]="f.key" [disabled]="f.key === fieldForm.value.key">{{ f.label }}</option>
                    </select>
                    <ng-container *ngIf="visibleIfKey">
                      <ng-container [ngSwitch]="getFieldType(visibleIfKey)">
                        <select *ngSwitchCase="'dropdown'" [(ngModel)]="visibleIfValue" [ngModelOptions]="{standalone: true}" style="flex:1;">
                          <option *ngFor="let opt of getFieldOptions(visibleIfKey)" [ngValue]="opt.value">{{ opt.label }}</option>
                        </select>
                        <select *ngSwitchCase="'mcq_single'" [(ngModel)]="visibleIfValue" [ngModelOptions]="{standalone: true}" style="flex:1;">
                          <option *ngFor="let opt of getFieldOptions(visibleIfKey)" [ngValue]="opt.value">{{ opt.label }}</option>
                        </select>
                        <div *ngSwitchCase="'mcq_multiple'" style="flex:1; display:flex; flex-wrap:wrap; gap:0.5rem;">
                          <label *ngFor="let opt of getFieldOptions(visibleIfKey)">
                            <input type="checkbox" [value]="opt.value" (change)="onMultiCondChange($event, 'visible')" [checked]="isArray(visibleIfValue) && visibleIfValue.includes(opt.value)"> {{ opt.label }}
                          </label>
                        </div>
                        <select *ngSwitchCase="'boolean'" [(ngModel)]="visibleIfValue" [ngModelOptions]="{standalone: true}" style="flex:1;">
                          <option [ngValue]="true">True</option>
                          <option [ngValue]="false">False</option>
                        </select>
                        <input *ngSwitchDefault [(ngModel)]="visibleIfValue" [ngModelOptions]="{standalone: true}" placeholder="Value" style="flex:1;">
                      </ng-container>
                    </ng-container>
                  </div>
                </div>
                <div class="form-field span-2">
                  <label>Mandatory If (Make this field required only if another field has a specific value)</label>
                  <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <select [(ngModel)]="mandatoryIfKey" [ngModelOptions]="{standalone: true}" style="flex:1;">
                      <option [ngValue]="null">-- Select Field --</option>
                      <option *ngFor="let f of schema.fields" [ngValue]="f.key" [disabled]="f.key === fieldForm.value.key">{{ f.label }}</option>
                    </select>
                    <ng-container *ngIf="mandatoryIfKey">
                      <ng-container [ngSwitch]="getFieldType(mandatoryIfKey)">
                        <select *ngSwitchCase="'dropdown'" [(ngModel)]="mandatoryIfValue" [ngModelOptions]="{standalone: true}" style="flex:1;">
                          <option *ngFor="let opt of getFieldOptions(mandatoryIfKey)" [ngValue]="opt.value">{{ opt.label }}</option>
                        </select>
                        <select *ngSwitchCase="'mcq_single'" [(ngModel)]="mandatoryIfValue" [ngModelOptions]="{standalone: true}" style="flex:1;">
                          <option *ngFor="let opt of getFieldOptions(mandatoryIfKey)" [ngValue]="opt.value">{{ opt.label }}</option>
                        </select>
                        <div *ngSwitchCase="'mcq_multiple'" style="flex:1; display:flex; flex-wrap:wrap; gap:0.5rem;">
                          <label *ngFor="let opt of getFieldOptions(mandatoryIfKey)">
                            <input type="checkbox" [value]="opt.value" (change)="onMultiCondChange($event, 'mandatory')" [checked]="isArray(mandatoryIfValue) && mandatoryIfValue.includes(opt.value)"> {{ opt.label }}
                          </label>
                        </div>
                        <select *ngSwitchCase="'boolean'" [(ngModel)]="mandatoryIfValue" [ngModelOptions]="{standalone: true}" style="flex:1;">
                          <option [ngValue]="true">True</option>
                          <option [ngValue]="false">False</option>
                        </select>
                        <input *ngSwitchDefault [(ngModel)]="mandatoryIfValue" [ngModelOptions]="{standalone: true}" placeholder="Value" style="flex:1;">
                      </ng-container>
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
    /* --- Google Forms-like .form-field style --- */
    .form-panel .form-field {
      background: #fff;
      border-radius: 12px;
      box-shadow: none;
      border: none;
      padding: 0; /* Remove all padding */
      margin-bottom: 1.5rem;
      gap: 0.7rem;
      position: relative;
      transition: box-shadow 0.2s, border 0.2s;
      border-left: 6px solid #4285f4;
      text-align: left; /* Move text to the left */
    }
    .form-panel .form-field:focus-within {
      box-shadow: 0 2px 8px #4285f433;
      border-left: 6px solid #174ea6;
      
    }
    .form-panel .form-field:not(:first-child) {
      margin-top: 1.5rem;
    }
    .form-panel label,
    .field-label-horizontal label,
    .field-label-horizontal span {
      font-size: 1.22rem;
      color: #202124;
      font-weight: 600;
      margin-bottom: 0.25rem;
      letter-spacing: 0.01em;
      text-align: left; /* Move label text to the left */
    }
    .form-panel .required-asterisk,
    .required-asterisk-horizontal {
      color: #d93025;
      margin-left: 0.2rem;
      font-size: 1.1em;
    }
    .form-panel .field-label-horizontal {
      margin-bottom: 0.7rem;
      justify-content: flex-start; /* Move label group to the left */
    }
    .form-panel input,
    .form-panel select,
    .form-panel textarea,
    .input-horizontal {
      font-size: 1.1rem;
      padding: 0.7rem 0;
      border: none;
      border-bottom: 1.5px solid #dadce0;
      border-radius: 0;
      background: transparent;
      color: #202124;
      transition: border-color 0.2s, box-shadow 0.2s;
      margin-bottom: 0.1rem;
      box-shadow: none;
      width: 100%;
    }
    .form-panel input:focus,
    .form-panel select:focus,
    .form-panel textarea:focus,
    .input-horizontal:focus {
      border-bottom: 2px solid #4285f4;
      outline: none;
      background: transparent;
      box-shadow: none;
    }
    .form-panel input::placeholder,
    .form-panel textarea::placeholder {
      color: #757575;
      opacity: 1;
      font-size: 1.08rem;
      font-style: normal;
    }
    .form-panel .error-message {
      color: #d93025;
      font-size: 0.97rem;
      margin-top: 0.25rem;
      font-weight: 500;
    }
    /* Remove divider between fields */
    .form-panel .form-field:not(:last-child)::after {
      display: none;
    }
    /* Radio group styling for Google Forms look */
    .form-panel .mat-radio-group,
    .form-panel .mat-radio-button {
      display: block;
      margin-bottom: 0.7rem;
    }
    .form-panel .mat-radio-button .mat-radio-label-content {
      font-size: 1.13rem;
      color: #202124;
      padding-left: 0.5rem;
    }
    .form-panel .mat-radio-button .mat-radio-outer-circle,
    .form-panel .mat-radio-button .mat-radio-inner-circle {
      border-width: 2px;
    }
    .form-panel .mat-radio-button.mat-accent .mat-radio-outer-circle {
      border-color: #4285f4;
    }
    .form-panel .mat-radio-button.mat-accent.mat-radio-checked .mat-radio-inner-circle {
      background-color: #4285f4;
    }
    /* Checkbox group styling */
    .form-panel .mcq-multi-options .mat-checkbox {
      display: block;
      margin-bottom: 0.7rem;
    }
    .form-panel .mat-checkbox .mat-checkbox-label {
      font-size: 1.13rem;
      color: #202124;
      padding-left: 0.5rem;
    }
    .form-panel .mat-checkbox .mat-checkbox-frame {
      border-width: 2px;
      border-color: #dadce0;
    }
    .form-panel .mat-checkbox.mat-accent .mat-checkbox-frame {
      border-color: #4285f4;
    }
    .form-panel .mat-checkbox.mat-accent.mat-checkbox-checked .mat-checkbox-background {
      background-color: #4285f4;
    }
    /* End Google Forms-like style */
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
      background: linear-gradient(145deg, var(--surface-color), var(--background-color));
      padding: 2rem 2.5rem;
      border-radius: 20px;
      margin-top: 1.5rem;
      border: 1px solid transparent;
      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
    }
    .field-editor-title {
      font-size: 1.6rem;
      font-weight: 700;
      margin: 0 0 2rem 0;
      text-align: center;
      color: var(--text-color);
      position: relative;
    }
    .field-editor-title::after {
      content: '';
      display: block;
      width: 50px;
      height: 3px;
      background: var(--primary-color);
      margin: 0.5rem auto 0;
      border-radius: 2px;
    }
    
    .field-form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.5rem 2rem;
    }
    .span-2 { grid-column: span 2; }

    .field-editor-form .section-heading {
      grid-column: span 2;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding-bottom: 0.75rem;
      margin: 1.5rem 0 1rem 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--primary-color);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border: none;
      border-bottom: 2px solid var(--secondary-color);
    }
    .field-editor-form .section-heading:first-of-type {
      margin-top: 0;
    }

    .field-editor-form .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .field-editor-form .form-field label {
      font-weight: 500;
      color: var(--text-muted-color);
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .field-editor-form .form-field label .mat-icon {
      font-size: 1rem;
      height: 1rem;
      width: 1rem;
    }
    .field-editor-form .form-field input,
    .field-editor-form .form-field select {
      width: 100%;
      background: var(--background-color);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 0.75rem 1rem;
      font-size: 1rem;
      transition: all 0.2s ease-in-out;
    }
    .field-editor-form .form-field input:focus,
    .field-editor-form .form-field select:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px var(--secondary-color);
    }

    .input-with-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .input-with-button input {
      flex-grow: 1;
    }
    .regex-helper-dropdown {
      margin-top: 0.5rem;
      padding: 1rem;
      box-shadow: 0 2px 8px var(--shadow-color-dark);
      background: var(--surface-color);
      border-radius: 8px;
    }
    .regex-option button {
      background: none; border: none;
      color: var(--primary-color);
      cursor: pointer;
      text-align: left;
      width: 100%;
      padding: 0.4rem 0.2rem;
      border-radius: 4px;
      display: block;
    }
    .regex-option button:hover {
      background-color: var(--secondary-color);
    }
    .regex-option button span {
      color: var(--text-muted-color);
      font-size: 0.9em;
      margin-left: 0;
      font-family: monospace;
      display: block;
      margin-top: 0.25rem;
    }
    .close-regex-btn {
      margin-top: 0.5rem;
      width: 100%;
    }

    .type-select-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .type-select-group mat-icon {
      color: var(--primary-color);
      background: var(--secondary-color);
      padding: 0.5rem;
      border-radius: 8px;
    }
    .type-select-group select {
      flex-grow: 1;
    }

    .checkbox-group {
        display: flex;
        gap: 1rem;
        align-items: center;
        grid-column: span 2;
        background: var(--background-color);
        padding: 1rem;
        border-radius: 8px;
        border: 1px solid var(--border-color);
        flex-wrap: wrap;
    }

    .options-editor { 
      margin-top: 1rem; 
      grid-column: span 2;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 1.5rem;
      background-color: var(--background-color);
    }
    .options-editor .section-heading {
      border: none;
      padding: 0;
      margin: 0 0 1rem 0;
    }
    .option-item {
      display: grid; 
      grid-template-columns: 1fr 1fr auto;
      align-items: center; 
      gap: 1rem; 
      margin-bottom: 0.75rem;
      background: var(--surface-color);
      padding: 0.5rem 1rem;
      border-radius: 8px;
    }
    
    .add-option-btn {
      background: none; border: 1px dashed var(--secondary-color); color: var(--text-muted-color);
      padding: 0.5rem; width: 100%; border-radius: 6px; cursor: pointer; margin-top: 0.5rem;
      display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      transition: all 0.2s ease;
    }
    .add-option-btn:hover {
      border-color: var(--primary-color);
      color: var(--primary-color);
      background-color: var(--secondary-color);
    }

    .field-editor-actions {
      display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem;
      grid-column: span 2;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border-color);
    }

    .conditional-logic-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      align-items: center;
      background-color: var(--background-color);
      padding: 1rem;
      border-radius: 8px;
    }
    .multi-cond-options {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      background-color: var(--surface-color);
      padding: 0.75rem;
      border-radius: 8px;
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

    .full-width { width: 100%; }
    .mcq-group { margin-bottom: 1.5rem; }
    .mcq-label { font-weight: 600; margin-bottom: 0.5rem; display: block; }
    .mcq-multi-options { display: flex; flex-wrap: wrap; gap: 0.1rem; }
    .toggle-group { margin-bottom: 1.5rem; }

    [formArrayName] > div {
      background: #f8fafc;
      border-radius: 8px;
      padding: 1rem 1rem 0.5rem 1rem;
      margin-bottom: 1rem;
      box-shadow: 0 1px 4px var(--shadow-color-light);
      display: flex;
      gap: 1rem;
      align-items: flex-end;
    }
    mat-form-field[appearance="fill"] {
      background: #f0f2f5;
      border-radius: 6px;
    }
    button[mat-stroked-button] {
      margin-top: 0.5rem;
      align-self: flex-start;
    }

    /* Add styles for horizontal layout and required asterisk */
    :host ::ng-deep .horizontal-field {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }
    :host ::ng-deep .field-label-horizontal {
      min-width: 180px;
      font-weight: 600;
      font-size: 1.08rem;
      color: var(--text-color);
      display: flex;
      align-items: center;
      justify-content: flex-end;
      position: relative;
      height: 40px;
      margin-right: 1.5rem;
    }
    :host ::ng-deep .required-asterisk-horizontal {
      color: var(--danger-color);
      margin-left: 0.3rem;
      font-size: 1.1em;
      position: absolute;
      right: -1.2em;
      top: 0.1em;
    }
    :host ::ng-deep .field-input-horizontal {
      flex: 1;
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 1.2rem;
    }
    :host ::ng-deep .input-horizontal {
      flex: 1;
      min-width: 180px;
      max-width: 350px;
    }
    :host ::ng-deep .keyvalue-array-horizontal {
      width: 100%;
    }
    :host ::ng-deep .keyvalue-pair-horizontal {
      display: flex;
      gap: 0.7rem;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    /* --- Vertical field layout for live preview --- */
    .form-panel .vertical-field {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      text-align: left;
      background: #fff;
      border-radius: 12px;
      box-shadow: none;
      border: none;
      padding: 1rem 1rem 1rem 2rem;
      margin-bottom: 1.5rem;
      gap: 0.7rem;
      position: relative;
      transition: box-shadow 0.2s, border 0.2s;
      border-left: 6px solid #4285f4;
    }
    .form-panel .vertical-field:focus-within {
      box-shadow: 0 2px 8px #4285f433;
      border-left: 6px solid #174ea6;
    }
    .form-panel .vertical-field:not(:first-child) {
      margin-top: 1rem;
    }
    .form-panel .field-label-vertical {
      font-size: 1.22rem;
      color: #202124;
      font-weight: 600;
      margin-bottom: 0.25rem;
      letter-spacing: 0.01em;
      text-align: left;
      width: 100%;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .form-panel .required-asterisk-vertical {
      color: #d93025;
      font-size: 1.1em;
    }
    .form-panel .field-input-vertical {
      width: 100%;
      margin-top: 1.1 rem;
      margin-bottom: 0.5rem;
      color: #d93025;
    }
    .form-panel .input-vertical,
    .form-panel .field-input-vertical input,
    .form-panel .field-input-vertical select,
    .form-panel .field-input-vertical textarea {
      font-size: 1.1rem;
      padding: 0rem 0;
      border: none;
      border-bottom: 1.5px solid #dadce0;
      border-radius: 0;
      background: transparent;
      color: #202124;
      transition: border-color 0.2s, box-shadow 0.2s;
      margin-bottom: 0.1rem;
      box-shadow: none;
      width: 100%;
    }
    
    .form-panel .input-vertical:focus,
    .form-panel .field-input-vertical input:focus,
    .form-panel .field-input-vertical select:focus{
      border-bottom: 2px solid #4285f4;
      outline: none;
      background: transparent;
      box-shadow: none;
    }
    .form-panel .input-vertical::placeholder,
    .form-panel .field-input-vertical input::placeholder,
    .form-panel .field-input-vertical textarea::placeholder {
      color: #757575;
      opacity: 1;
      font-size: 1.08rem;
      font-style: normal;
    }
    .form-panel .error-message {
      color: #d93025;
      font-size: 0.97rem;
      margin-top: 0.25rem;
      font-weight: 500;
    }
    .form-panel .vertical-field:not(:last-child)::after {
      display: none;
    }
    /* Key-value vertical layout */
    .form-panel .keyvalue-array-vertical {
      width: 100%;
    }
    .form-panel .keyvalue-pair-vertical {
      display: flex;
      flex-direction: row;
      gap: 0.7rem;
      align-items: center;
      margin-bottom: 0.5rem;
      width: 100%;
    }
    /* --- End vertical field layout --- */

    .highlight {
      background: yellow;
      font-weight: bold;
    }

    .template-author {
      color: #888;
      font-size: 0.9em;
      margin-left: 8px;
    }
    .template-description {
      color: #666;
      font-size: 0.85em;
      margin-left: 2px;
    }

    .schema-loading {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 200px;
      padding: 2rem;
    }
    
    .schema-loading .loading-spinner {
      text-align: center;
      color: var(--text-muted-color);
    }
    
    .schema-loading .loading-spinner mat-icon {
      font-size: 2rem;
      width: 2rem;
      height: 2rem;
      margin-bottom: 1rem;
    }
    
    .schema-loading .loading-spinner p {
      margin: 0;
      font-size: 1.1rem;
    }
    
    .spinning {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Custom styles for boolean toggle */
    :host ::ng-deep mat-slide-toggle.mat-checked:not(.mat-disabled) .mat-slide-toggle-bar {
      background-color: #81c784; /* Green 400 */
    }
    :host ::ng-deep mat-slide-toggle.mat-checked:not(.mat-disabled) .mat-slide-toggle-thumb {
      background-color: #4caf50; /* Green 500 */
    }
    :host ::ng-deep mat-slide-toggle:not(.mat-checked) .mat-slide-toggle-bar {
      background-color: #ef9a9a; /* Red 200 */
    }
    :host ::ng-deep mat-slide-toggle:not(.mat-checked) .mat-slide-toggle-thumb {
      background-color: #f44336; /* Red 500 */
    }
  `]
})
export class DynamicForm implements OnInit, OnChanges, AfterViewInit {
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
        
        
        
        if (Array.isArray(expected)) {
          return expected.some((v: any) => controllingValue == v);
        } else {
          return controllingValue == expected;
        }
      });
    }
    return !!field.required;
  }

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
    this.templateSearchCtrl = this.fb.control('');
    this.filteredTemplates$ = this.templateSearchCtrl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterTemplates(value))
    );
  }

  ngOnInit() {
    if (this.mode === 'create') {
      this.schemaService.listTemplates().subscribe(templates => {
        this.importTemplates = templates;
      });
    }
    this.route.paramMap.subscribe(params => {
      const versionParam = params.get('version');
      this.submissionVersion = versionParam ? +versionParam : null;
      this.route.queryParamMap.subscribe(qp => {
        this.isDuplicatedEdit = qp.get('duplicated') === 'true';
        this.setupComponent();
      });
    });
    // --- Fix for boolean visibleIf glitch: subscribe to all boolean fields and trigger change detection ---
    this.form?.valueChanges?.subscribe(() => {
      // This will trigger Angular change detection and update visibleFields
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
    
    // Ensure setupComponent is called immediately if templateName is already available
    if (this.templateName) {
      this.setupComponent();
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
    this.schemaService.getTemplate(this.templateName).subscribe({
      next: (data) => {
        this.schema = data.schema;
        this.schema.name = data.name; // ensure name is populated
        this.buildForm();
        this.isLoading = false;
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
      if (field.type === 'keyvalue') {
        const arr = new FormArray<FormGroup>([]);
        if (field.initialKeys && Array.isArray(field.initialKeys)) {
          field.initialKeys.forEach((k: string) => arr.push(this.fb.group({ key: k, value: '' })));
        }
        controls[field.key] = arr;
      } else {
        const validators: ValidatorFn[] = [];
        if (field.regex) {
          validators.push(Validators.pattern(field.regex));
        }
        let defaultValue = field.defaultValue;
        if (field.type === 'mcq_multiple' && !Array.isArray(defaultValue)) {
          defaultValue = [];
        }
        const control = new FormControl({ value: defaultValue, disabled: this.isReadOnly || (this.mode === 'use' && !field.editable) }, validators);
        controls[field.key] = control;
        // --- Fix: Listen for changes on controlling boolean fields to force UI update ---
        if (field.type === 'boolean') {
          control.valueChanges.subscribe(() => {
            this.cdr.detectChanges();
          });
        }
      }
    });
    this.form = this.fb.group(controls);

    // Listen for changes to update required validators dynamically
    this.form.valueChanges.subscribe(() => {
      this.updateDynamicValidators();
      // Force change detection for visibility in response mode
      if (this.mode === 'use') {
        void this.visibleFields;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      }
    });
    // --- Subscribe to all boolean fields for visibility glitch fix ---
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
      initialKeys: '' // Add initialKeys for keyvalue
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
    // Parse initialKeys for keyvalue
    if (newField.type === 'keyvalue' && typeof newField.initialKeys === 'string') {
      newField.initialKeys = newField.initialKeys.split(',').map((k: string) => k.trim()).filter((k: string) => k);
    }
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
      this.schemaService.createTemplate(this.schema).subscribe(() => {
        this.closeForm();
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
            this.closeForm();
          });
        } else if (action === 'newVersion') {
          this.schemaService.createNewVersion(this.schema.name, this.schema, description).subscribe(() => {
            this.closeForm();
          });
        }
      });
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

  getKeyValueArray(fieldKey: string): FormArray | null {
    const control = this.form.get(fieldKey);
    return control instanceof FormArray ? control : null;
  }
  addKeyValuePair(fieldKey: string) {
    const control = this.form.get(fieldKey);
    if (control instanceof FormArray) {
      control.push(this.fb.group({ key: '', value: '' }));
    }
  }
  removeKeyValuePair(fieldKey: string, index: number) {
    const control = this.form.get(fieldKey);
    if (control instanceof FormArray) {
      control.removeAt(index);
    }
  }

  isBooleanField(key: string): boolean {
    const field = this.schema.fields.find((f: any) => f.key === key);
    return field?.type === 'boolean';
  }

  onMCQMultiChange(fieldKey: string, value: any, checked: boolean) {
    const arr = this.form.get(fieldKey)?.value || [];
    if (checked) {
      this.form.get(fieldKey)?.setValue([...arr, value]);
    } else {
      this.form.get(fieldKey)?.setValue(arr.filter((v: any) => v !== value));
    }
  }



  getCheckboxChecked(event: MatCheckboxChange): boolean {
    return !!event.checked;
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
    if (!templateName) {
      this.clearImportedTemplate();
      return;
    }
    this.selectedImportTemplate = templateName;
    this.schemaService.getTemplate(String(templateName)).subscribe(tmpl => {
      this.schema.fields = JSON.parse(JSON.stringify(tmpl.schema.fields));
      this.schema.description = tmpl.schema.description || '';
      this.isImporting = true;
    });
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
}
