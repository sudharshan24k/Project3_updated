import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

export interface TemplateSchema {
  name: string;
  schema: {
    description?: string;
    fields: any[];
  };
  author?: string;
  team_name: string;
  version_tag?: string;
}

export interface TemplateInfo {
  name: string;
  description: string;
  created_at: string;
  author?: string;
  team_name: string;
  version_tag?: string;
  audit_pipeline?: string;
}

export interface TemplateVersion {
  template_name: string;
  version: number;
  schema: any;
  change_log: string;
  created_at: string;
  author?: string;
}

export interface Submission {
  version: number;
  data?: any;
  responses?: Response[];
  submission_name?: string;
}

export interface Response {
  _id?: string;
  submission_id?: string;
  version?: number;
  parent_id?: string;
  author?: string;
  content: string;
  created_at?: string;
  children?: Response[];
}

@Injectable({ providedIn: 'root' })
export class SchemaService {
  private apiUrl = 'http://127.0.0.1:8000';

  constructor(private http: HttpClient) {}

  // Template endpoints
  listTemplates(): Observable<TemplateInfo[]> {
    return this.http.get<TemplateInfo[]>(`${this.apiUrl}/templates/`);
  }

  getTemplate(name: string): Observable<TemplateSchema> {
    return this.http.get<TemplateSchema>(`${this.apiUrl}/templates/${name}`);
  }

  createTemplate(template: any): Observable<any> {
    const payload = {
        name: template.name,
        schema: {
            description: template.description,
            fields: template.fields,
            audit_pipeline: template.audit_pipeline // <-- add this line
        },
        author: template.author,
        team_name: template.team_name,
        version_tag: template.version
    };
    return this.http.post(`${this.apiUrl}/templates/`, payload);
  }

  updateTemplate(name: string, schema: any, change_log: string): Observable<any> {
    const payload = { schema, change_log };
    // Note: version_tag field is intentionally excluded from updates to prevent modification
    return this.http.put(`${this.apiUrl}/templates/${name}`, payload);
  }

  deleteTemplate(name: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/templates/${name}`);
  }

  duplicateTemplate(name: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/templates/${name}/duplicate`, {});
  }

  // Versioning endpoints
  getTemplateHistory(name: string): Observable<TemplateVersion[]> {
    return this.http.get<TemplateVersion[]>(`${this.apiUrl}/templates/${name}/history`);
  }

  rollbackTemplate(name: string, version: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/templates/${name}/rollback/${version}`, {});
  }

  /**
   * Create a new version of a template (versioned schema)
   * Calls backend endpoint to create a new version (e.g. name_v2, name_v3, ...)
   */
  createNewVersion(name: string, schema: any, change_log: string): Observable<any> {
    const payload = { schema, change_log };
    // Backend should handle version increment and naming
    return this.http.post(`${this.apiUrl}/templates/${name}/newversion`, payload);
  }

  // Submission endpoints
  submitForm(templateName: string, submission: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/submissions/${templateName}`, submission);
  }

  listSubmissions(templateName: string): Observable<Submission[]> {
    return this.http.get<Submission[]>(`${this.apiUrl}/submissions/${templateName}`);
  }

  getSubmission(templateName: string, version: number): Observable<Submission> {
    return this.http.get<Submission>(`${this.apiUrl}/submissions/${templateName}/${version}`);
  }

  diffSubmissions(templateName: string, v1: number, v2: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/submissions/${templateName}/diff/${v1}/${v2}`);
  }

  duplicateSubmission(templateName: string, version: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/submissions/${templateName}/${version}/duplicate`, {});
  }

  deleteSubmission(templateName: string, version: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/submissions/${templateName}/${version}`);
  }

  // Response endpoints
  // --- Per-response endpoints (by templateName and submissionName) ---
  getSubmissionByName(templateName: string, submissionName: string): Observable<Submission> {
    return this.http.get<Submission>(`${this.apiUrl}/submissions/${templateName}/by-name/${submissionName}`);
  }

  duplicateSubmissionByName(templateName: string, submissionName: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/submissions/${templateName}/by-name/${submissionName}/duplicate`, {});
  }

  deleteSubmissionByName(templateName: string, submissionName: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/submissions/${templateName}/by-name/${submissionName}`);
  }

  addResponse(templateName: string, submissionName: string, response: { content: string, author: string, parent_id?: string }): Observable<Response> {
    return this.http.post<Response>(`${this.apiUrl}/submissions/${templateName}/by-name/${submissionName}/responses`, response);
  }

  // Add downloadSubmissionByName using templateName and submissionName
  downloadSubmissionByName(templateName: string, submissionName: string): Observable<Submission> {
    return this.http.get<Submission>(`${this.apiUrl}/submissions/${templateName}/by-name/${submissionName}`);
  }

  sendSubmissionByEmail(templateName: string, submissionName: string, email: string): Observable<any> {
    const payload = {
      template_name: templateName,
      submission_name: submissionName,
      email: email,
    };
    // This will be replaced with a real API call
    console.log('Sending email with payload:', payload);
    return of({ success: true, message: 'Email sent successfully (mocked).' });
  }

  /**
   * Search submissions by filler name
   */
  searchSubmissionsByFiller(fillerName: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/submissions/search-by-filler?fillerName=${encodeURIComponent(fillerName)}`);
  }
}