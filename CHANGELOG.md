# Journal des Modifications (Changelog) — CTR Wargame Builder

Toutes les modifications notables apportées à ce projet sont documentées dans ce fichier.
Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/) et ce projet adhère à [Semantic Versioning](https://semver.org/lang/fr/).

## [0.2.0-alpha] - 2026-10-18

### ✨ Nouvelles Fonctionnalités & Refonte Ergonomie (Style Trench-Companion)
- **Header persistant unifié (`AppHeader.vue`)** :
  - Fusion totale de la barre de navigation supérieure et du sous-en-tête de bande dans un composant persistant sticky unique.
  - Résolution définitive du problème de clignotement / alternance au scroll ou au rafraîchissement.
  - Suppression de la mention superflue `"(1 unité = 1 slot)"`.
- **Origines sélectionnables en direct** :
  - Suppression du dropdown d'origine dans le header.
  - Sélection interactive directe des cartes dans le panneau inspecteur d'ensemble ("Origines accessibles").
  - Prise en charge du multi-sélection jusqu'à la limite autorisée par la faction (2 origines max standard, 3 pour *L'Alliance* et *Les Dompteurs sauvages*).
  - Cumul dynamique des modificateurs de caractéristiques sur les profils des guerriers.
- **Organisation du Roster en 4 sections dédiées (Trench-Companion)** :
  - **Officiers de commandement (2 emplacements)** :
    - Emplacement Leader (12 XP de base) : affiche le combattant assigné ou un encadré interactif d'aide au recrutement (`+ Recruter le Leader (12 XP)`).
    - Emplacement Bras droit (6 XP de base) : affiche le combattant assigné ou un encadré interactif (`+ Recruter le Bras droit (6 XP)`).
    - Fin de l'affectation automatique du rôle d'officier lors de la création d'un combattant standard.
  - **Combattants de troupe sur table** : Guerriers (R1 à R3), Monstres et Animaux avec CTA d'embauche dédié.
  - **Réserve (Banc de touche / Blessés)** : Section pliable avec badge de décompte. Les membres en réserve ne sont pas comptabilisés dans le budget en PO ni dans la limite de 10 membres sur table.
  - **Cimetière (Pertes en campagne)** : Section pliable pour conserver l'historique des combattants tombés au combat (coût 0 PO).
  - **Sélecteur de statut instantané** (`Sur table`, `Réserve`, `Cimetière`) accessible sur chaque carte et dans la fiche d'inspection.
- **Restauration de la terminologie stricte V0.8** :
  - Rôles officiels : `Leader` (12 XP) et `Bras droit` (6 XP).
  - Suppression des mentions erronées "Champion", "Second" et "Officier".
- **Backend & Validation Domain .NET 10** :
  - Ajout de l'enum `FighterStatus` (`Active`, `Reserve`, `Graveyard`).
  - Validation du budget et de l'effectif restreinte aux combattants `Active` sur table.
  - Ajout du test unitaire `Reserve_And_Graveyard_Fighters_ShouldNot_Count_Toward_Budget_Or_Roster_Limit` (14/14 tests passants).

## [0.1.0-alpha] - 2026-10-18

### 🚀 Initialisation du Projet & Socle Fondateur
- **Règles métier versionnées V0.8** (`rulesets/v0.8/`) :
  - Extraction et structuration des 8 PDF officiels en JSON modulaires (`manifest.json`, `factions.json`, `allegiances.json`, `equipments.json`, `magic-items.json`, `specializations.json`, `spells.json`, `monsters.json`, `animals.json`, `special-rules.json`).
  - Découplage complet moteur / données de règles pour garantir des montées de version sans altération du code C#.
- **Backend Clean Architecture .NET 10** (`src/`) :
  - `CtrWargameBuilder.Domain` : Entités métier, enums et modèles de règles.
  - `CtrWargameBuilder.Application` : Service de validation métier (`WarbandValidator`) et chargeur dynamique de règles (`RulesetProvider`).
  - `CtrWargameBuilder.Infrastructure` : Persistance SQLite locale avec EF Core 10 (`WarbandDbContext`).
  - `CtrWargameBuilder.Api` : API REST Kestrel hébergeant à la fois les routes `/api/*` et la Single Page Application via `wwwroot`.
- **Suite de tests automatisée** (`tests/CtrWargameBuilder.Domain.Tests/`) :
  - 13 tests unitaires xUnit couvrant 100% des invariants du jeu (budget, effectif, restrictions d'armures, quotas, calculs d'XP).
- **Frontend Vue.js 3 + Tailwind CSS** (`frontend/`) :
  - Layout 2 colonnes inspiré de *Trench-Companion*.
  - Store Pinia Local-First avec synchronisation API en arrière-plan.
  - Modale de création en 2 étapes, modales d'armurerie, de magie et de sorts.
- **Documentation & Méthodologie** (`docs/`) :
  - Spécifications fonctionnelles, modèle conceptuel et rapport RETEX d'ingénierie augmentée par l'IA.
