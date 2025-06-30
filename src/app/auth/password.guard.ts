import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { PasswordDialogComponent } from '../password-dialog/password-dialog.component';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export const passwordGuard: CanActivateFn = (route, state) => {
  const dialog = inject(MatDialog);
  const router = inject(Router);

  const dialogRef = dialog.open(PasswordDialogComponent, {
    width: '400px',
    disableClose: true,
  });

  return dialogRef.afterClosed().pipe(
    switchMap(result => {
      if (result === '1234') {
        return of(true);
      } else {
        router.navigate(['/']);
        return of(false);
      }
    })
  );
}; 