# Supervision PRCC — Analyse de faisabilité du modèle Guinée-Bissau au Sénégal

Dashboard géospatial répondant à la question : **les superviseurs peuvent-ils, en supervisant leurs communautés PRCC en cours, passer aussi dans les communautés dont le PRCC est terminé, comme en Guinée-Bissau ?**

## Verdict (données 2020-2025)

| Indicateur | 🇬🇼 Guinée-Bissau | 🇸🇳 Sénégal |
|---|---|---|
| Couverture PRCC terminé ≤ 15 km d'un superviseur | **98 %** | **0 %** |
| Distance moyenne PRCC terminé → PRCC en cours | 5,7 km | 153,0 km |
| Distance minimale | 0,2 km | 36,3 km |
| Cause | Cohortes empilées dans Bafata | PRCC 2024 implantés dans de nouveaux territoires (Dagana, Kolda-ville) |

**Nuance clé** : 86 % des communautés PRCC terminé sénégalaises sont à ≤ 5 km d'une **autre communauté PRCC terminé** — elles forment des groupes de communautés voisines compacts, un constat structurant pour la suite.

## Structure du projet

```
projet/
├── index.html                  # Page principale (4 onglets)
├── css/style.css               # Thème clair Tostan (vert #8BC34A, police Inter)
├── js/
│   ├── data.js                 # Données (généré — ne pas éditer à la main)
│   └── app.js                  # Logique : cartes Leaflet, Chart.js, interactions
├── assets/
│   └── tostan-logo.png         # Logo Tostan (actuellement non affiché dans l'UI)
└── scripts/
    └── analyse_proximite.py    # Régénère data.js depuis l'Excel source
```

## Lancer en local

Ouvrir `index.html` directement dans le navigateur, ou :

```bash
python -m http.server 8000
# → http://localhost:8000
```

## Mettre à jour les données

Quand la base Excel change (nouvelles cohortes, GPS corrigés) :

```bash
pip install pandas openpyxl
python scripts/analyse_proximite.py "chemin/vers/Base_de_données.xlsx"
```

Le script lit la feuille `tout` (colonnes attendues : `Communauté`, `Pays`, `Région`, `Département`, `PRCC EN COURS`, `Année Fin PRCC`, `lat_final`, `lon_final`) et réécrit `js/data.js`. Les seuils (5 km / 15 km) sont modifiables en tête de script.

## Onglets

1. **Synthèse** — 4 KPI (couverture GB, couverture SN, distance minimale, regroupement intra-FAD), histogramme des distances GB vs SN, taux de couverture par région (Sénégal), tableau récapitulatif par zone.
2. **Carte interactive** — filtre pays/région, slider de rayon (5–50 km), fond OpenStreetMap standard. Cliquer sur une communauté PRCC en cours (point bleu) dessine son rayon d'action et recolore les communautés PRCC terminé à proximité selon leur distance (vert ≤ 5 km, orange jusqu'au rayon choisi, rouge = hors rayon). Légende flottante en bas de carte et panneau **Analyse automatique** : un texte généré localement (aucun appel externe/IA) qui résume les chiffres du filtre actif ou de la sélection en cours.
3. **Comparateur GB / SN** — deux cartes côte à côte, stats clés par pays, panneau **Analyse comparative** (même principe, calcul local) et tableau comparatif chiffré.
4. **Verdict** — verdict par région (Sénégal) avec statut (extension possible / circuit dédié requis) et explication de fond sur les raisons géographiques de l'écart GB/SN. *(Les scénarios de recommandation ont été retirés de cet onglet à la demande du projet — seul le constat factuel est présenté.)*

## Pistes d'évolution (V2)

- Distances routières réelles via OSRM/OpenRouteService (remplacer Haversine).
- Détection automatique des groupes de communautés PRCC terminé voisines (DBSCAN) + tournées optimisées (TSP).
- Estimation des coûts par zone (km × carburant × fréquence).
- Export PDF du verdict pour la direction.
- Intégration Power BI (export CSV depuis le script Python).

## Limites connues

- Distances à vol d'oiseau (routier réel ≈ ×1,3 à ×1,8 — renforce le verdict).
- 15 communautés sans GPS exclues (14 GB, 1 SN).
- Coordonnées dupliquées pour certaines communautés (GPS au village-centre) → campagne de géolocalisation fine recommandée.
