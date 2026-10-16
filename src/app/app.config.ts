import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import {
  ApplicationConfig,
  LOCALE_ID,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withHashLocation, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { ChantierStore } from './core/persistence/chantier-store.service';
import { LocalStorageAdapter } from './core/persistence/local-storage.adapter';
import { StockageAdapter } from './core/persistence/stockage.adapter';

registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    // Routage par « # » : l'application fonctionne sur n'importe quel hébergement statique.
    provideRouter(routes, withHashLocation(), withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    // Persistance : remplacer LocalStorageAdapter par un adaptateur API pour passer à PostgreSQL.
    { provide: StockageAdapter, useClass: LocalStorageAdapter },
    provideAppInitializer(() => inject(ChantierStore).initialiser()),
  ],
};
