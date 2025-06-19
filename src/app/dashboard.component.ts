import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <div class="dashboard-container">
      <div class="dashboard-card" (click)="openForm('file-ingestion')">
        <h2>file-ingestion</h2>
      </div>
      <div class="dashboard-card add-framework" (click)="openNewForm()">
        <span class="plus">+</span>
        <div>Add Framework</div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      display: flex;
      gap: 40px;
      justify-content: center;
      align-items: flex-start;
      margin-top: 60px;
    }
    .dashboard-card {
      width: 320px;
      height: 220px;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 2px 16px rgba(0,0,0,0.10);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      font-weight: 600;
      cursor: pointer;
      transition: box-shadow 0.2s;
    }
    .dashboard-card:hover {
      box-shadow: 0 4px 24px rgba(0,0,0,0.18);
    }
    .add-framework {
      background: #f7fafd;
      color: #1976d2;
      border: 2px dashed #90caf9;
      font-size: 1.5rem;
      font-weight: 400;
      position: relative;
    }
    .plus {
      font-size: 4rem;
      font-weight: 700;
      margin-bottom: 12px;
      color: #1976d2;
    }
  `]
})
export class DashboardComponent {
  constructor(private router: Router) {}

  openForm(name: string) {
    this.router.navigate(['/form', name]);
  }

  openNewForm() {
    this.router.navigate(['/form', 'new']);
  }
}
