import { Injectable, signal } from '@angular/core';

export interface Notification {
  id: number;
  type: 'succes' | 'erreur' | 'info';
  message: string;
}

/** Messages de confirmation et d'erreur affichés brièvement en bas de l'écran. */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private compteur = 0;
  readonly notifications = signal<Notification[]>([]);

  succes(message: string): void {
    this.afficher('succes', message);
  }
  erreur(message: string): void {
    this.afficher('erreur', message, 7000);
  }
  info(message: string): void {
    this.afficher('info', message);
  }

  fermer(id: number): void {
    this.notifications.update((l) => l.filter((n) => n.id !== id));
  }

  private afficher(type: Notification['type'], message: string, duree = 3500): void {
    const id = ++this.compteur;
    this.notifications.update((l) => [...l.slice(-3), { id, type, message }]);
    setTimeout(() => this.fermer(id), duree);
  }
}
