import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SchemaService {
  private apiUrl = 'http://127.0.0.1:8000'; // Adjust if backend runs elsewhere

  constructor(private http: HttpClient) {}

  listSchemas(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/schemas`);
  }

  getSchema(name: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/schemas/${name}`);
  }

  createSchema(name: string, schema: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/schemas`, { name, schema });
  }

  updateSchema(name: string, schema: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/schemas/${name}`, schema);
  }
}
