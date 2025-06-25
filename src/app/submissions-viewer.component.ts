import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SchemaService, Submission, Response } from './dynamic-form/schema.service';
import { FormsModule } from '@angular/forms';
import { DiffViewerComponent } from './diff-viewer.component';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ResponseNameDialogComponent } from './response-name-dialog.component';

@Component({
  selector: 'app-submissions-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, DiffViewerComponent, MatIconModule, MatTooltipModule, MatButtonModule],
  templateUrl: './submissions-viewer.component.html',
  styleUrls: ['./submissions-viewer.component.scss'],
})
export class SubmissionsViewerComponent implements OnInit, OnChanges {
  @Input() templateName: string | null = null;
  @Output() viewTemplate = new EventEmitter<string>();

  isLoading = false;
  submissions: Submission[] = [];
  selectedSubmissionName: string | null = null;
  selectedSubmission: Submission | null = null;
  selectedSubmissionData: any = null;
  formattedSubmissionData: string | null = null;
  selectedVersions = new Set<string>(); // Now stores submission_names
  diffResult: any = null;
  oldSchema: any[] = [];
  newSchema: any[] = [];
  @Output() duplicateEdit = new EventEmitter<{ template: string, submissionName: string }>();
  newResponseContent: string = '';

  constructor(private schemaService: SchemaService, private router: Router, private dialog: MatDialog) {}

  ngOnInit() {
    this.loadSubmissions();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['templateName']) {
      this.resetState();
      this.loadSubmissions();
    }
  }

  resetState() {
    this.submissions = [];
    this.selectedSubmissionName = null;
    this.selectedSubmission = null;
    this.selectedSubmissionData = null;
    this.formattedSubmissionData = null;
    this.selectedVersions.clear();
    this.diffResult = null;
    this.oldSchema = [];
    this.newSchema = [];
  }

  loadSubmissions() {
    if (!this.templateName) return;
    this.isLoading = true;
    this.schemaService.listSubmissions(this.templateName).subscribe((subs: Submission[]) => {
      // Sort by submission_name (tev2_1, tev2_2, ...)
      this.submissions = subs.sort((a: Submission, b: Submission) => {
        if (!a.submission_name || !b.submission_name) return 0;
        const aNum = parseInt(a.submission_name.split('_').pop() || '0', 10);
        const bNum = parseInt(b.submission_name.split('_').pop() || '0', 10);
        return bNum - aNum;
      });
      this.isLoading = false;
    });
  }

  viewSubmission(submissionName: string) {
    if (!this.templateName) return;
    this.selectedSubmissionName = submissionName;
    this.diffResult = null;
    this.schemaService.getSubmissionByName(this.templateName, submissionName).subscribe(sub => {
      this.selectedSubmission = sub;
      this.selectedSubmissionData = sub.data;
      this.formattedSubmissionData = this.formatAsConf(sub.data);
    });
  }

  private formatAsConf(data: any): string {
    if (!data) return '';
    let confContent = '';
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = data[key];
        confContent += `  ${key} = "${value}"\n`;
      }
    }
    return confContent;
  }

  addResponse() {
    if (!this.selectedSubmissionName || !this.newResponseContent.trim() || !this.templateName) {
      return;
    }

    const responseData = {
      content: this.newResponseContent,
      author: 'CurrentUser' // Replace with actual user info
    };

    this.schemaService.addResponse(this.templateName, this.selectedSubmissionName, responseData).subscribe(newResponse => {
      if (this.selectedSubmission && this.selectedSubmission.responses) {
        this.selectedSubmission.responses.push(newResponse);
      }
      this.newResponseContent = '';
    });
  }

  async downloadSubmission(submissionName: string) {
    if (!this.templateName) return;
    this.schemaService.downloadSubmissionByName(this.templateName, submissionName).subscribe(async (submission: any) => {
      const confContent = this.formatAsConf(submission.data);
      const blob = new Blob([confContent], { type: 'text/plain;charset=utf-8' });
      const fileName = `${submissionName}.conf`;

      if ('showSaveFilePicker' in window && typeof (window as any).showSaveFilePicker === 'function') {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: fileName,
            types: [{ description: 'Config files', accept: { 'text/plain': ['.conf'] } }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
        } catch (err) {
          if ((err as DOMException).name !== 'AbortError') {
            console.error('Could not save file:', err);
          }
        }
      } else {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    });
  }

  toggleVersion(submissionName: string) {
    if (this.selectedVersions.has(submissionName)) {
      this.selectedVersions.delete(submissionName);
    } else {
      if (this.selectedVersions.size < 2) {
        this.selectedVersions.add(submissionName);
      }
    }
  }

  async compareVersions() {
    if (this.selectedVersions.size !== 2 || !this.templateName) return;

    const templateName = this.templateName;
    const versionsToCompare = Array.from(this.selectedVersions);
    const [name1, name2] = versionsToCompare;

    this.schemaService.getSubmissionByName(templateName, name1).subscribe(sub1 => {
      this.schemaService.getSubmissionByName(templateName, name2).subscribe(sub2 => {
        this.oldSchema = sub1.data ? [sub1.data] : [];
        this.newSchema = sub2.data ? [sub2.data] : [];
        this.selectedSubmissionName = null;
        this.selectedSubmissionData = null;
        this.formattedSubmissionData = null;
        this.diffResult = {
          version1: name1,
          version2: name2
        };
      });
    });
  }

  duplicateAndEdit(submissionName: string) {
    if (!this.templateName) return;

    this.schemaService.duplicateSubmissionByName(this.templateName, submissionName).subscribe(response => {
      if (response && response.submission_name) {
        this.duplicateEdit.emit({
          template: this.templateName!,
          submissionName: response.submission_name
        });
      } else {
        // Fallback: emit the original submission name (should not happen)
        this.duplicateEdit.emit({
          template: this.templateName!,
          submissionName: submissionName
        });
      }
    });
  }

  deleteSubmission(submissionName: string) {
    if (!this.templateName) return;
    if (confirm('Are you sure you want to delete this submission?')) {
      this.schemaService.deleteSubmissionByName(this.templateName, submissionName).subscribe(() => {
        this.loadSubmissions();
        if (this.selectedSubmissionName === submissionName) {
          this.selectedSubmissionName = null;
          this.selectedSubmission = null;
          this.selectedSubmissionData = null;
          this.formattedSubmissionData = null;
        }
      });
    }
  }
}