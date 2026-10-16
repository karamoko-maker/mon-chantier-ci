import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { APP_NOM, APP_VERSION, LIBELLES_POSTE, LIBELLES_STATUT_PHASE, MENTION_ESTIMATION, PosteBudget } from '../../core/constantes';
import { NotificationService } from '../../core/services/notification.service';
import { RapportsService, TypeRapport } from '../../core/services/rapports.service';
import { PIPES_FORMAT } from '../../shared/pipes/format.pipes';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-rapports',
  imports: [...PIPES_FORMAT],
  templateUrl: './rapports.component.html',
  styleUrl: './rapports.component.css',
})
export class RapportsComponent {
  private readonly service = inject(RapportsService);
  private readonly notifications = inject(NotificationService);

  protected readonly type = signal<TypeRapport>('devis');
  protected readonly r = computed(() => this.service.construire(this.type()));
  protected readonly mention = MENTION_ESTIMATION;
  protected readonly appli = `${APP_NOM} v${APP_VERSION}`;
  protected readonly statuts = LIBELLES_STATUT_PHASE;
  protected readonly postes = Object.keys(LIBELLES_POSTE).filter((k) => k !== 'imprevus') as PosteBudget[];
  protected readonly libellesPoste = LIBELLES_POSTE;
  protected readonly enCours = signal(false);

  protected readonly blocs = computed(() => {
    const r = this.r();
    return [
      { titre: "4. Main-d'œuvre", lignes: r.mainOeuvre, total: r.synthese.postes.mainOeuvre },
      { titre: '5. Équipements', lignes: r.equipements, total: r.synthese.postes.equipements },
      { titre: '6. Transports', lignes: r.transports, total: r.synthese.postes.transport },
      { titre: '7. Frais annexes et imprévus', lignes: r.fraisAnnexes, total: r.synthese.postes.fraisAnnexes },
    ];
  });

  protected imprimer(): void {
    this.service.imprimer();
  }

  protected async pdf(): Promise<void> {
    this.enCours.set(true);
    try {
      await this.service.exporterPdf(this.type());
      this.notifications.succes('PDF généré.');
    } catch (e) {
      this.notifications.erreur(`Échec de la génération du PDF : ${(e as Error).message}`);
    } finally {
      this.enCours.set(false);
    }
  }

  protected csv(): void {
    this.service.exporterCsvRapport(this.type());
    this.notifications.succes('Fichier CSV exporté (ouvrable dans Excel).');
  }

  protected json(): void {
    this.service.exporterJson();
    this.notifications.succes('Sauvegarde JSON exportée.');
  }
}
