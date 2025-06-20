import { DashboardComponent } from './dashboard.component';
import { DynamicForm } from './dynamic-form/dynamic-form';
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'form/:name/:version', component: DynamicForm },
  { path: 'form/:name', component: DynamicForm },
];
