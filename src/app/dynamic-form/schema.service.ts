import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TemplateSchema {
  name: string;
  schema: {
    description?: string;
    fields: any[];
  };
  is_locked?: boolean;
}

export interface TemplateInfo {
  name: string;
  is_locked: boolean;
  description: string;
  created_at: string;
}

export interface TemplateVersion {
  template_name: string;
  version: number;
  schema: any;
  change_log: string;
  created_at: string;
}

export interface Submission {
  version: number;
  data: any;
  responses?: Response[];
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
            fields: template.fields
        }
    };
    return this.http.post(`${this.apiUrl}/templates/`, payload);
  }

  updateTemplate(name: string, schema: any, change_log: string): Observable<any> {
    const payload = { schema, change_log };
    return this.http.put(`${this.apiUrl}/templates/${name}`, payload);
  }

  deleteTemplate(name: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/templates/${name}`);
  }

  duplicateTemplate(name: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/templates/${name}/duplicate`, {});
  }

  lockTemplate(name: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/templates/${name}/lock`, { password });
  }

  unlockTemplate(name: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/templates/${name}/unlock`, { password });
  }

  // Versioning endpoints
  getTemplateHistory(name: string): Observable<TemplateVersion[]> {
    return this.http.get<TemplateVersion[]>(`${this.apiUrl}/templates/${name}/history`);
  }

  rollbackTemplate(name: string, version: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/templates/${name}/rollback/${version}`, {});
  }

  // Submission endpoints
  submitForm(templateName: string, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/submissions/${templateName}`, data);
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
  addResponse(templateName: string, version: number, response: { content: string, author: string, parent_id?: string }): Observable<Response> {
    return this.http.post<Response>(`${this.apiUrl}/submissions/${templateName}/${version}/responses`, response);
  }
}
