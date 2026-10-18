# Journal des Modifications (Changelog) — CTR Wargame Builder

Toutes les modifications notables apportées à ce projet sont documentées dans ce fichier.
Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/) et ce projet adhère à [Semantic Versioning](https://semver.org/lang/fr/).

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
