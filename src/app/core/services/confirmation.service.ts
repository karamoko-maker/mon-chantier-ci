import { Injectable, signal } from '@angular/core';

export interface DemandeConfirmation {
  titre: string;
  message: string;
  libelleConfirmer: string;
  danger: boolean;
}

/** Boîte de dialogue de confirmation (avant toute suppression importante). */
@Injectable({ providedIn: 'root' })
export class ConfirmationService {
  readonly demande = signal<DemandeConfirmation | null>(null);
  private resoudre: ((ok: boolean) => void) | null = null;

  confirmer(options: Partial<DemandeConfirmation> & { message: string }): Promise<boolean> {
    this.resoudre?.(false);
    this.demande.set({
      titre: options.titre ?? 'Confirmation',
      message: options.message,
      libelleConfirmer: options.libelleConfirmer ?? 'Confirmer',
      danger: options.danger ?? true,
    });
    return new Promise((resolve) => (this.resoudre = resolve));
  }

  repondre(ok: boolean): void {
    this.demande.set(null);
    const r = this.resoudre;
    this.resoudre = null;
    r?.(ok);
  }
}
