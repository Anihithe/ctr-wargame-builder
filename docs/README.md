# Documentation du Projet - Wargame Warband Builder

Ce répertoire contient toute la documentation fonctionnelle et technique du wargame builder dédié au jeu d'escarmouche.

---

## 📁 Structure de la documentation

### 1. Spécifications Fonctionnelles (`docs/functional/`)
- [**01-regles-metier.md**](file:///mnt/Stockage/projects/dev/ctr-wargame-builder/docs/functional/01-regles-metier.md) : Synthèse détaillée des règles du jeu (V0.8), mécanique de création de bande, combattants, équipements, sorts et campagne.
- [**02-specifications-fonctionnelles.md**](file:///mnt/Stockage/projects/dev/ctr-wargame-builder/docs/functional/02-specifications-fonctionnelles.md) : Parcours utilisateur, création/édition de liste, moteur de validation des règles et fonctionnalités clés (modes classique/campagne, export).
- [**03-modele-conceptuel.md**](file:///mnt/Stockage/projects/dev/ctr-wargame-builder/docs/functional/03-modele-conceptuel.md) : Entités métier, hiérarchie des données et cycle de vie d'une bande.

### 2. Spécifications Techniques (`docs/technical/`)
- [**01-architecture-globale.md**](file:///mnt/Stockage/projects/dev/ctr-wargame-builder/docs/technical/01-architecture-globale.md) : Architecture de la solution (.NET 10 Web API, SQLite, Vue.js 3, Authentification & Persistance hybride).
- [**02-systeme-rulesets.md**](file:///mnt/Stockage/projects/dev/ctr-wargame-builder/docs/technical/02-systeme-rulesets.md) : Gestion du versioning des règles (fichiers JSON versionnés V0.8, V0.9, drapeau Live et migration).

### 3. Suivi de Projet & Démarche IA (`docs/`)
- [**RETEX-DEMARCHE-IA.md**](file:///mnt/Stockage/projects/dev/ctr-wargame-builder/docs/RETEX-DEMARCHE-IA.md) : Analyse complète de la démarche méthodologique, bilan des actions passées et futures, problèmes résolus, arbitrages et capitalisation de compétences IA.

---

## 🎯 Objectifs principaux du projet
1. **Rapidité et intuitivité** : Permettre à un joueur de composer sa bande en quelques clics tout en respectant scrupuleusement les contraintes de règles.
2. **Évolutivité des règles** : Permettre d'ajuster ou d'ajouter de nouvelles versions de règles (V0.8, V0.9, V1.0) sans casser les bandes existantes et sans devoir modifier le code source.
3. **Double usage** : Supporter le mode **Partie unique (One-shot)** et le mode **Campagne** (suivi de trésorerie, blessures, XP et montées en rang).
