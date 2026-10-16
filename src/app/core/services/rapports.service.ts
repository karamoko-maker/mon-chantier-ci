import { Injectable, computed, inject } from '@angular/core';
import { APP_NOM, APP_VERSION, LIBELLES_CATEGORIE_DEPENSE, LIBELLES_POSTE, LIBELLES_SOURCE_QUANTITE, LIBELLES_STATUT_PHASE, MENTION_ESTIMATION } from '../constantes';
import { BudgetPhase, SyntheseBudget } from '../calculs/budget.calc';
import { telechargerCsv, telechargerFichier, ValeurCsv } from '../calculs/csv';
import { aujourdhuiISO } from '../calculs/dates';
import { formatDate, formatFcfa, formatNombre } from '../calculs/format';
import { categorieDepense } from '../calculs/mouvements.calc';
import { Projet } from '../models';
import { ChantierStore } from '../persistence/chantier-store.service';
import { BudgetService } from './budget.service';
import { EquipementsService } from './equipements.service';
import { FinancementService } from './financement.service';
import { MainOeuvreService } from './main-oeuvre.service';
import { MateriauxService } from './materiaux.service';
import { PhasesService } from './phases.service';

export type TypeRapport = 'devis' | 'bilan';

export interface LigneRapport {
  libelle: string;
  phase: string;
  detail: string;
  montant: number;
  paye: number;
}

export interface RapportDonnees {
  type: TypeRapport;
  titre: string;
  dateEdition: string;
  avecMention: boolean;
  projet: Projet;
  phases: BudgetPhase[];
  materiaux: { nom: string; phase: string; quantite: number; unite: string; prixUnitaire: number; montant: number; source: string; inclus: boolean }[];
  mainOeuvre: LigneRapport[];
  equipements: LigneRapport[];
  transports: LigneRapport[];
  fraisAnnexes: LigneRapport[];
  synthese: SyntheseBudget;
  fondsDisponibles: number;
  resteAFinancer: number;
}

/** Génération du devis prévisionnel et du bilan de chantier (affichage, PDF, CSV, impression). */
@Injectable({ providedIn: 'root' })
export class RapportsService {
  private readonly store = inject(ChantierStore);
  private readonly budget = inject(BudgetService);
  private readonly phases = inject(PhasesService);
  private readonly materiaux = inject(MateriauxService);
  private readonly mainOeuvre = inject(MainOeuvreService);
  private readonly equipements = inject(EquipementsService);
  private readonly financement = inject(FinancementService);

  private readonly base = computed(() => {
    const s = this.budget.synthese();
    const nomPhase = (id: string | null) => this.phases.nom(id);
    const depenses = (filtre: (c: ReturnType<typeof categorieDepense>) => boolean): LigneRapport[] =>
      this.store.depenses()
        .filter((x) => filtre(categorieDepense(x)))
        .map((x) => ({
          libelle: x.description,
          phase: nomPhase(x.phaseId),
          detail: LIBELLES_CATEGORIE_DEPENSE[x.categorie],
          montant: x.montantPrevu,
          paye: x.montantPaye,
        }));
    return {
      projet: this.store.projet(),
      phases: s.phases,
      materiaux: this.materiaux.lignes().map((l) => ({
        nom: l.materiau?.nom ?? 'Matériau supprimé',
        phase: nomPhase(l.ligne.phaseId),
        quantite: l.ligne.quantite,
        unite: l.materiau?.unite ?? '',
        prixUnitaire: l.materiau?.prixUnitaire ?? 0,
        montant: l.montant,
        source: LIBELLES_SOURCE_QUANTITE[l.ligne.source] + (l.ligne.valide ? ' (validée)' : ''),
        inclus: l.ligne.inclureAuBudget,
      })),
      mainOeuvre: [
        ...this.mainOeuvre.interventions().map((x) => ({
          libelle: x.intervention.metier + (x.intervention.prestataire ? ` — ${x.intervention.prestataire}` : ''),
          phase: nomPhase(x.intervention.phaseId),
          detail:
            x.intervention.mode === 'forfait'
              ? 'Forfait'
              : `${x.intervention.nombrePersonnes} pers. × ${formatNombre(x.intervention.tarifJournalier)} × ${x.intervention.nombreJours} j`,
          montant: x.convenu,
          paye: x.intervention.montantPaye,
        })),
        ...s.statutsEnveloppes
          .filter((e) => e.comptee)
          .map((e) => ({
            libelle: e.enveloppe.metier,
            phase: nomPhase(e.enveloppe.phaseId),
            detail: `Enveloppe de planification (${formatNombre(e.enveloppe.montantMin)} à ${formatNombre(e.enveloppe.montantMax)})`,
            montant: e.enveloppe.montantRetenu,
            paye: 0,
          })),
      ],
      equipements: this.equipements
        .equipements()
        .filter((e) => e.cout > 0 || e.equipement.montantPaye > 0)
        .map((e) => ({
          libelle: e.equipement.nom,
          phase: nomPhase(e.equipement.phaseId),
          detail: e.equipement.mode === 'loue' ? 'Location' : 'Achat',
          montant: e.cout,
          paye: e.equipement.montantPaye,
        })),
      transports: depenses((c) => c === 'transport'),
      fraisAnnexes: depenses((c) => c === 'fraisAnnexes' || c === 'imprevus'),
      synthese: s,
      fondsDisponibles: this.financement.disponible(),
      resteAFinancer: this.financement.resteAFinancer(),
    };
  });

  construire(type: TypeRapport): RapportDonnees {
    const b = this.base();
    return {
      ...b,
      type,
      titre: type === 'devis' ? 'Devis prévisionnel' : 'Bilan de chantier',
      dateEdition: aujourdhuiISO(),
      avecMention: !b.projet.metreValide,
    };
  }

  imprimer(): void {
    window.print();
  }

  /** Export PDF (jsPDF chargé à la demande pour alléger l'application). */
  async exporterPdf(type: TypeRapport): Promise<void> {
    const r = this.construire(type);
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const t = (s: string) => textePdf(s);
    const m = (n: number) => textePdf(formatFcfa(n));
    const BLEU: [number, number, number] = [15, 42, 74];
    let y = 16;

    doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(...BLEU);
    doc.text(t(`${r.titre} — ${r.projet.nom}`), 14, y);
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(90);
    y += 6;
    doc.text(t(`${APP_NOM} v${APP_VERSION} — édité le ${formatDate(r.dateEdition)}`), 14, y);
    if (r.avecMention) {
      y += 7;
      doc.setFillColor(254, 243, 199).rect(14, y - 4.5, 182, 7, 'F');
      doc.setFont('helvetica', 'bold').setTextColor(146, 64, 14).setFontSize(10);
      doc.text(t(MENTION_ESTIMATION), 16, y);
    }
    y += 6;

    const section = (titre: string, head: string[], body: (string | number)[][], foot?: string[]) => {
      autoTable(doc, {
        startY: y + 4,
        head: [[{ content: t(titre), colSpan: head.length, styles: { fillColor: BLEU, textColor: 255, fontSize: 10, fontStyle: 'bold' } }], head.map(t)],
        body: body.map((l) => l.map((c) => (typeof c === 'number' ? m(c) : t(c)))),
        foot: foot ? [foot.map(t)] : undefined,
        styles: { fontSize: 8, cellPadding: 1.6 },
        headStyles: { fillColor: [226, 232, 240], textColor: 20 },
        footStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: 'bold' },
        margin: { left: 14, right: 14 },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    };

    const p = r.projet;
    section('Descriptif du projet et du terrain', ['Caractéristique', 'Valeur'], [
      ['Type de bâtiment', p.typeBatiment],
      ['Localisation', [p.commune, p.ville, p.pays].filter(Boolean).join(', ')],
      ['Surface du terrain', `${formatNombre(p.surfaceTerrain)} m²`],
      ['Surface constructible', p.surfaceConstructible ? `${formatNombre(p.surfaceConstructible)} m²` : 'À déterminer (règles d’urbanisme)'],
      ['Surface construite estimative', p.surfaceConstruiteEstimee ? `${formatNombre(p.surfaceConstruiteEstimee)} m²` : 'À déterminer (plan architectural)'],
      ['Style / logements', `${p.styleArchitectural} — ${p.configurationLogements}`],
      ['Métré technique', p.metreValide ? `Validé par ${p.metreValidePar || '—'} le ${formatDate(p.metreValideLe)}` : 'Non validé'],
    ]);

    const s = r.synthese;
    section('Phases de construction', ['N°', 'Phase', 'Statut', 'Avanc.', 'Budget', r.type === 'bilan' ? 'Payé' : 'Validé'],
      r.phases.map((x) => [
        String(x.phase.ordre), x.phase.nom, LIBELLES_STATUT_PHASE[x.phase.statut], `${Math.round(x.phase.avancement)} %`,
        x.reference, r.type === 'bilan' ? x.paye : x.valide === null ? 'Non' : 'Oui',
      ]),
    );
    section('Détail des matériaux', ['Matériau', 'Phase', 'Qté', 'Unité', 'P.U.', 'Montant'],
      r.materiaux.filter((x) => x.inclus).map((x) => [x.nom, x.phase, formatNombre(x.quantite, true), x.unite, x.prixUnitaire, x.montant]),
      ['Total matériaux', '', '', '', '', formatFcfa(s.postes.materiaux)],
    );
    const lignes = (titre: string, l: LigneRapport[], total: number) => {
      if (l.length === 0) return;
      section(titre, ['Désignation', 'Phase', 'Détail', 'Prévu', 'Payé'],
        l.map((x) => [x.libelle, x.phase, x.detail, x.montant, x.paye]),
        ['Total', '', '', formatFcfa(total), ''],
      );
    };
    lignes("Main-d'œuvre", r.mainOeuvre, s.postes.mainOeuvre);
    lignes('Équipements', r.equipements, s.postes.equipements);
    lignes('Transports', r.transports, s.postes.transport);
    lignes('Frais annexes et imprévus', r.fraisAnnexes, s.postes.fraisAnnexes);

    section('Récapitulatif budgétaire', ['Poste', 'Montant'], [
      ...(Object.keys(s.postes) as (keyof typeof s.postes)[]).map((k) => [LIBELLES_POSTE[k], s.postes[k]]),
      ['Budget de base (estimatif)', s.baseEstimatif],
      [`Réserve pour imprévus (${s.pourcentageReserve} %)`, s.reserveEstimatif],
      ['BUDGET TOTAL ESTIMATIF', s.totalEstimatif],
      [`Budget validé (${s.nombrePhasesValidees} phase(s))`, s.totalValide],
      ['Budget total de référence', s.totalReference],
      ['Dépenses engagées', s.engage.total],
      ['Montant payé', s.paye.total],
      ['Solde budgétaire restant', s.resteBudget],
      ['Fonds disponibles pour le chantier', r.fondsDisponibles],
      ['Reste à financer', r.resteAFinancer],
    ]);

    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5).setTextColor(120).setFont('helvetica', 'normal');
      const pied = r.avecMention ? `${MENTION_ESTIMATION} — ` : '';
      doc.text(t(`${pied}Page ${i} / ${pages}`), 14, 290);
    }
    doc.save(`${r.type === 'devis' ? 'devis-previsionnel' : 'bilan-chantier'}-${r.dateEdition}.pdf`);
  }

  exporterCsvRapport(type: TypeRapport): void {
    const r = this.construire(type);
    const l: ValeurCsv[][] = [];
    if (r.avecMention) l.push([MENTION_ESTIMATION]);
    l.push(['Section', 'Désignation', 'Phase', 'Détail', 'Quantité', 'Unité', 'Prix unitaire (FCFA)', 'Montant prévu (FCFA)', 'Payé (FCFA)']);
    r.materiaux.filter((x) => x.inclus).forEach((x) =>
      l.push(['Matériaux', x.nom, x.phase, x.source, x.quantite, x.unite, x.prixUnitaire, x.montant, '']),
    );
    const ajout = (section: string, lignes: LigneRapport[]) =>
      lignes.forEach((x) => l.push([section, x.libelle, x.phase, x.detail, '', '', '', x.montant, x.paye]));
    ajout("Main-d'œuvre", r.mainOeuvre);
    ajout('Équipements', r.equipements);
    ajout('Transports', r.transports);
    ajout('Frais annexes', r.fraisAnnexes);
    r.phases.forEach((p) =>
      l.push(['Phases', p.phase.nom, `${p.phase.ordre}`, LIBELLES_STATUT_PHASE[p.phase.statut], '', '', '', p.reference, p.paye]),
    );
    const s = r.synthese;
    l.push(['Synthèse', 'Budget de base', '', '', '', '', '', s.baseEstimatif, '']);
    l.push(['Synthèse', `Réserve pour imprévus (${s.pourcentageReserve} %)`, '', '', '', '', '', s.reserveEstimatif, '']);
    l.push(['Synthèse', 'Budget total de référence', '', '', '', '', '', s.totalReference, '']);
    l.push(['Synthèse', 'Dépenses engagées', '', '', '', '', '', s.engage.total, '']);
    l.push(['Synthèse', 'Montant payé', '', '', '', '', '', '', s.paye.total]);
    l.push(['Synthèse', 'Solde budgétaire restant', '', '', '', '', '', s.resteBudget, '']);
    l.push(['Synthèse', 'Reste à financer', '', '', '', '', '', r.resteAFinancer, '']);
    // La première ligne (mention ou en-têtes) sert d'en-tête du fichier.
    const [entetes, ...corps] = l;
    telechargerCsv(`${r.type === 'devis' ? 'devis-previsionnel' : 'bilan-chantier'}-${r.dateEdition}.csv`, entetes, corps);
  }

  exporterJson(): void {
    telechargerFichier(
      `mon-chantier-ci-sauvegarde-${aujourdhuiISO()}.json`,
      this.store.exporterJson(),
      'application/json',
    );
  }
}

/** Les polices standard de jsPDF ne connaissent pas certains caractères : on les remplace. */
export function textePdf(s: string): string {
  return s
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[—–]/g, '-')
    .replace(/³/g, '3')
    .replace(/²/g, '2')
    .replace(/[\u202f\u00a0]/g, ' ');
}
