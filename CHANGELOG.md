# Journal des Modifications (Changelog) — CTR Wargame Builder

Toutes les modifications notables apportées à ce projet sont documentées dans ce fichier.
Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/) et ce projet adhère à [Semantic Versioning](https://semver.org/lang/fr/).

## [0.5.0-beta] - 2026-10-19

### 📤 Système d'Exportation Double (Partage Texte/Discord & Fiches Tabletop)
- **Export Texte & Discord (Style Old World Builder / Trench-Companion)** :
  - **3 Types de listes** : *Régulière* (détaillée avec profils, armes, armures et talents), *Compacte* (optimisée pour Discord avec sous-lignes `-#`), *Minimaliste* (1 ligne condensée par unité).
  - **2 Formats de sortie** : *Discord / Markdown* (titres `##`, gras, listes) et *Texte brut* (ASCII).
  - **Options configurables** : affichage des statistiques, des talents/règles, inclusion de la réserve/cimetière, et mode *Liste Secrète* (masque les objets magiques et le budget restant pour les tournois).
  - **Aperçu interactif & Actions** : zone d'aperçu dynamique en direct, copie en 1 clic dans le presse-papier avec retour visuel, téléchargement `.txt` et sauvegarde `.json`.
- **Fiches de Combat & Impression Table (Format Battle Scroll / AoS)** :
  - **Design inspiré de `card-builder-ctr`** :
    - *Stat Dial* circulaire avec points de vie en grand au centre et caractéristiques (M, C, E, V) sur les nœuds cardinaux.
    - **Jauge de points de vie sur table** : cases à cocher `[ ]` pour marquer les blessures au crayon en cours de partie.
    - Tableau complet des armes & armures (Portée, Puissance, Précision, Règles avec valeurs réelles comme *Perce-armure (1)*).
    - Blocs d'aptitudes, talents et sorts avec rappels de règles complets pour jouer sans rouvrir les PDF.
  - **Prise en charge de l'impression `@media print`** :
    - Mode *Parchemin Authentique CTR* vs Mode *Éco-Encre* (monochrome sur fond blanc pour économiser l'encre).
    - Mise en page automatique A4 avec saut de page propre pour découpage.
    - Déclenchement de `window.print()` en un clic via le bouton d'impression.
- **Intégration UI** :
  - Bouton *« Exporter »* avec icône de partage intégré dans l'en-tête persistant `AppHeader.vue`.

## [0.4.0-beta] - 2026-10-19

### 🧹 Refactorisation & Élimination des Valeurs Magiques
- **Centralisation des Constantes Métier & Thème** :
  - Création de `RuleConstants.cs` et `ValidationCodes.cs` dans le Domaine .NET.
  - Création de `src/constants/rules.ts` et `src/constants/theme.ts` dans le Frontend Vue 3.
  - Élimination des chaînes en dur répétées et sécurisation des codes de validation entre frontend et backend.
- **Moteur Métier Partagé (`rulesEngine.ts`)** :
  - Centralisation DRY des calculs de caractéristiques modifiées (Mouvement en pouces `"`, Combat, Esquive, Volonté, Points de Vie).
  - Prise en compte unifiée des bonus et modificateurs issus des Origines, Spécialisations et Talents.
  - Nettoyage et formatage centralisé des noms d'équipements (`cleanEquipmentName`).

### 🔮 Conditionnement des Sorts & Capacités Magiques
- **Validation & Contrôle d'Accès aux Sorts** :
  - Détection automatique des lanceurs de sorts (`canFighterCastSpells` : spécialisation Mage, traits magiques).
  - Masquage/désactivation du panneau d'apprentissage de sorts dans l'inspecteur pour les unités non-lanceuses.
  - Règle de validation autoritaire C# rejetant l'attribution de sorts à des non-lanceurs (`ValidationCodes.NotASpellcaster`).

### 🎨 Épuration Visuelle & Ergonomie des Cartes de Combattants
- **Cartes de Combattant & Sélecteur d'Équipement** :
  - Résolution de l'affichage du tag *Perce-armure* : affiche désormais la valeur réelle de l'équipement (ex: *Perce-armure (1)*, *(2)*, *(3)*) tout en conservant l'infobulle d'explication générique avec `x`.
  - Suppression de la mention textuelle redondante de la spécialisation sous le nom de l'unité (mise en valeur via les tags).
  - Élimination des parenthèses superflues d'exemples d'armes dans les badges.
  - Regroupement des armes identiques avec indicateur de quantité `x2`.
  - Réorganisation ordonnée des tags : `Spécialisation(s)` → `Talent(s)` → `Armes` → `Bouclier` → `Armure`.
  - Suppression de la mention inutile "Vue active" dans l'encart de faction.

## [0.3.0-beta] - 2026-10-18

### ⚔️ Refonte Complète de l'Équipement (Slots vs Mains)
- **Suppression du concept ambigu de "Mains disponibles"** :
  - Gestion stricte par emplacements (slots) d'équipement : 2 slots (R1/R2), 3 slots (R3), 4 slots (Monstres), 0 slot (Animaux).
  - Découplage complet des armures : les protections ne consomment aucun slot offensif, débloquant l'accès à l'inventaire même lorsque les armes occupent tous les slots.
  - Support sans accroc des monstres portant 2 armes à deux mains (4 slots).
- **Catalogue Hiérarchisé d'Armes & Ajout Direct** :
  - Structure en onglets par famille d'arme avec sous-sections de Rang (R1, R2, R3).
  - Mise en valeur agrandie des statistiques des armes.
  - Bouton d'ajout direct sans fermeture/réouverture intempestive de la fenêtre modale.
  - Infobulles contextuelles au survol des mots-clés d'armes (*Acéré*, *Lourd*, etc.).

### 🛡️ Règles Spécifiques de Factions & Origines
- **Faction Excellence** : interdiction stricte du port de protections et d'armures.
- **Faction Monstruosité** : interdiction du recrutement de troupes R1 par défaut, sauf sous l'origine *Esclavagiste* (avec profil statistique dédié).
- **Spécialisations & Restrictions** : blocage des équipements incompatibles (ex: Barbare).

### 🧪 Validation & Tests Unitaires Décuplés
- **Extension de la suite xUnit** : passage de 14 à **32 tests unitaires complets** (100% verts).
- Couverture intégrale des cas limites : budget, quotas d'officiers, slots monstres, interdiction d'armures pour l'Excellence, restrictions de sorts et calculs d'XP.

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
