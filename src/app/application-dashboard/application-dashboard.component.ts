import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ApplicationDashboardListComponent } from './application-dashboard-list.component';

@Component({
  selector: 'app-application-dashboard',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule, ApplicationDashboardListComponent],
  templateUrl: './application-dashboard.component.html',
  styleUrls: ['./application-dashboard.component.scss']
})
export class ApplicationDashboardComponent {
  constructor(private router: Router) {}

  navigateToCreateTemplate() {
    this.router.navigate(['/form/create'], { skipLocationChange: true });
  }

  goToLaunchpad() {
    this.router.navigate(['/']);
  }
} 