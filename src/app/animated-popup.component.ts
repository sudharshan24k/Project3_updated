import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, NgClass, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';

@Component({
  selector: 'app-animated-popup',
  standalone: true,
  imports: [CommonModule, NgClass, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault],
  template: `
    <div class="popup-backdrop" *ngIf="visible">
      <div class="popup-box" [ngClass]="type">
        <ng-container [ngSwitch]="type">
          <div *ngSwitchCase="'airplane'" class="airplane-animation">
            <span class="plane">✈️</span>
            <span class="popup-message">{{ message }}</span>
          </div>
          <div *ngSwitchCase="'success'" class="success-animation">
            <span class="success-tick">
              <svg width="48" height="48" viewBox="0 0 48 48">
                <circle class="tick-circle" cx="24" cy="24" r="22" fill="none" stroke="#4caf50" stroke-width="4"/>
                <polyline class="tick-mark" points="14,26 22,34 34,16" fill="none" stroke="#4caf50" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <span class="popup-message">{{ message }}</span>
          </div>
          <div *ngSwitchDefault>
            <span class="popup-message">{{ message }}</span>
          </div>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    .popup-backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.15);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s;
    }
    .popup-box {
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 4px 32px rgba(0,0,0,0.18);
      padding: 2rem 2.5rem;
      min-width: 320px;
      text-align: center;
      font-size: 1.2rem;
      position: relative;
      animation: popIn 0.3s;
    }
    .popup-box.success { border-left: 6px solid #4caf50; }
    .popup-box.error { border-left: 6px solid #f44336; }
    .popup-box.airplane { border-left: 6px solid #1976d2; }
    .popup-message { display: block; margin-top: 1rem; }
    .airplane-animation {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1.2rem;
      font-size: 1.3rem;
    }
    .plane {
      display: inline-block;
      animation: flyPlane 1.2s cubic-bezier(.4,1.6,.6,1) forwards;
      font-size: 2.2em;
    }
    .success-animation {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1.2rem;
      font-size: 1.3rem;
    }
    .success-tick {
      display: inline-block;
      animation: tickPop 0.5s cubic-bezier(.4,1.6,.6,1);
    }
    .tick-circle {
      stroke-dasharray: 138;
      stroke-dashoffset: 138;
      animation: drawCircle 0.5s forwards;
    }
    .tick-mark {
      stroke-dasharray: 36;
      stroke-dashoffset: 36;
      animation: drawTick 0.4s 0.3s forwards;
    }
    @keyframes flyPlane {
      0% { transform: translateX(-60px) scale(0.7) rotate(-10deg); opacity: 0.2; }
      60% { transform: translateX(20px) scale(1.1) rotate(8deg); opacity: 1; }
      100% { transform: translateX(120px) scale(1) rotate(0deg); opacity: 0; }
    }
    @keyframes popIn {
      0% { transform: scale(0.7); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes fadeIn {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }
    @keyframes drawCircle {
      to { stroke-dashoffset: 0; }
    }
    @keyframes drawTick {
      to { stroke-dashoffset: 0; }
    }
    @keyframes tickPop {
      0% { transform: scale(0.7); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
  `]
})
export class AnimatedPopupComponent {
  @Input() message = '';
  @Input() type: 'success' | 'error' | 'airplane' = 'success';
  @Input() visible = false;
  @Output() closed = new EventEmitter<void>();

  ngOnChanges() {
    if (this.visible) {
      setTimeout(() => this.close(), 1800);
    }
  }

  close() {
    this.visible = false;
    this.closed.emit();
  }
}
