import { TarifMetier } from './main-oeuvre.model';

export interface Parametres {
  unites: string[];
  categoriesMateriaux: string[];
  tarifsMetiers: TarifMetier[];
  modesPaiement: string[];
}
