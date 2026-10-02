// Coordonnées publiques Renowation — à valider avec le client avant mise en ligne.
export const company = {
  name: 'Renowation',
  tagline: 'Rénover avec exigence. Livrer sans surprise.',
  phone: '+32 486 49 09 35',
  phoneHref: 'tel:+32486490935',
  email: 'info@renowation.be',
  address: 'Chaussée de Waterloo 200/8',
  city: '1640 Rhode-Saint-Genèse',
  facebook: 'https://www.facebook.com/Renowation.be/',
  zones: ['Rhode-Saint-Genèse', 'Uccle', 'Waterloo', 'Linkebeek', 'Ixelles', 'Woluwe', 'Braine-l’Alleud', 'Overijse', 'Bruxelles'],
}

export type ServiceId = 'renovation' | 'toiture' | 'facade' | 'isolation' | 'salle-de-bain' | 'cuisine' | 'interieur'

export interface Service {
  id: ServiceId
  title: string
  pitch: string
  points: string[]
  /** Fourchette indicative €/m² HTVA utilisée par le simulateur de devis */
  priceRange: [number, number]
  unit: string
}

export const services: Service[] = [
  {
    id: 'renovation',
    title: 'Rénovation complète',
    pitch: 'Maison ou appartement repensé de A à Z, avec un seul interlocuteur et un planning tenu.',
    points: ['Gros œuvre & démolition', 'Coordination de tous les corps de métier', 'Réception de chantier documentée'],
    priceRange: [650, 1400],
    unit: 'm² habitable',
  },
  {
    id: 'toiture',
    title: 'Toiture',
    pitch: 'Réfection, réparation, nettoyage et traitement de toiture pour prévenir les dégâts futurs.',
    points: ['Tuiles, ardoises, zinc, EPDM', 'Nettoyage & hydrofuge', 'Gouttières et zinguerie'],
    priceRange: [90, 220],
    unit: 'm² de toiture',
  },
  {
    id: 'facade',
    title: 'Façades',
    pitch: 'Nettoyage, rejointoyage, crépi et isolation par l’extérieur pour valoriser votre bien.',
    points: ['Nettoyage & hydrofugation', 'Crépi & enduits', 'Isolation par l’extérieur (ETICS)'],
    priceRange: [60, 180],
    unit: 'm² de façade',
  },
  {
    id: 'isolation',
    title: 'Isolation & PEB',
    pitch: 'Toiture, murs, sols : des travaux qui font baisser la facture et grimper le certificat PEB.',
    points: ['Isolation de toiture et combles', 'Murs et sols', 'Accompagnement primes régionales'],
    priceRange: [45, 140],
    unit: 'm² isolé',
  },
  {
    id: 'salle-de-bain',
    title: 'Salles de bain',
    pitch: 'Des salles de bain contemporaines, étanches et pensées dans le moindre détail.',
    points: ['Douches à l’italienne', 'Carrelage grand format', 'Plomberie & ventilation'],
    priceRange: [1400, 2800],
    unit: 'm² de pièce',
  },
  {
    id: 'cuisine',
    title: 'Cuisines',
    pitch: 'Ouverture d’espaces, électricité, plomberie et pose : la cuisine prête à vivre.',
    points: ['Ouverture de murs porteurs', 'Techniques complètes', 'Pose & finitions'],
    priceRange: [900, 2200],
    unit: 'm² de pièce',
  },
  {
    id: 'interieur',
    title: 'Finitions intérieures',
    pitch: 'Plafonnage, peinture, sols et menuiseries pour un rendu net et durable.',
    points: ['Plafonnage & enduits', 'Peinture', 'Parquet, carrelage, sols coulés'],
    priceRange: [55, 160],
    unit: 'm²',
  },
]

export const process = [
  { step: '01', title: 'Visite & diagnostic', text: 'Visite gratuite sur place, relevés et écoute de votre projet.' },
  { step: '02', title: 'Devis détaillé en 48 h', text: 'Un devis poste par poste, clair, sans frais cachés.' },
  { step: '03', title: 'Planning verrouillé', text: 'Dates de chantier fixées, un chef de projet dédié.' },
  { step: '04', title: 'Chantier suivi', text: 'Photos d’avancement et points réguliers, chantier propre.' },
  { step: '05', title: 'Réception & garantie', text: 'Réception contradictoire, garanties légales assurées.' },
]
