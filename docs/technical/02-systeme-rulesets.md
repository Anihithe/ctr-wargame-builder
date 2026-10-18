# Système de Rulesets et Versioning des Données de Règles

Ce document détaille la conception du système de règles versionnées (*Rulesets*), conçu pour garantir une flexibilité totale lors des montées de version du jeu (V0.8, V0.9, V1.0...).

---

## 1. Problématique Métier

Le jeu étant en phase de playtest actif :
- Les coûts en PO, les profils de caractéristiques (M, C, E, V, PV) et les règles spéciales vont évoluer régulièrement.
- Les bandes créées par les joueurs en version V0.8 ne doivent **jamais** être cassées ou altérées lorsqu'une mise à jour V0.9 est déployée.
- L'auteur du jeu doit pouvoir modifier facilement une valeur sans avoir à coder en C# ou modifier des tables de base de données à la main.

---

## 2. Structure des Fichiers de Règles

Pour une lisibilité et une maintenance optimales, chaque version de règles dispose de son propre répertoire dans un dossier dédié :

```text
rulesets/
├── v0.8/
│   ├── manifest.json         # Métadonnées (version, titre, date, description)
│   ├── factions.json         # Factions, profils de base par Rang, règles de faction, origines
│   ├── allegiances.json      # Allégeances et aptitudes passives
│   ├── equipments.json       # Armes CàC, armes de tir, boucliers, armures, objets magiques
│   ├── specializations.json  # Spécialisations et arbres de talents
│   ├── spells.json           # Livre des sorts et niveaux
│   └── special-rules.json    # Glossaire des mots-clés et règles spéciales
└── v0.9/
    └── ...
```

---

## 3. Schéma des Fichiers JSON

### 3.1. `manifest.json`
```json
{
  "version": "0.8",
  "name": "Règles Version 0.8 (Playtest)",
  "releaseDate": "2026-10-18",
  "isLive": true,
  "config": {
    "defaultStartingGold": 10,
    "maxWarbandMembersStandard": 10,
    "maxWarbandMembersDuel": 15,
    "maxMonsters": 1,
    "maxAnimals": 2,
    "officerLeaderBaseXp": 12,
    "officerBrasDroitBaseXp": 6
  }
}
```

> **Note sur le statut "Live"** : L'administrateur peut basculer le flag `isLive` (via l'interface d'administration ou configuration). Toute nouvelle création de bande pointe automatiquement vers la version Live. Une bande utilisant une version non-live affiche un avertissement clair et un bouton « Convertir vers une autre version ».


### 3.2. Extrait `factions.json`
```json
[
  {
    "id": "alliance",
    "name": "L'Alliance",
    "racesDescription": "Humains",
    "specialRule": {
      "name": "Polyvalents",
      "description": "Vous pouvez sélectionner 3 Origines au lieu de 2."
    },
    "allowedOriginsCount": 3,
    "profilesByRank": {
      "1": { "mouvement": 6, "combat": 3, "esquive": 2, "volonte": 4, "pv": 6 },
      "2": { "mouvement": 6, "combat": 4, "esquive": 3, "volonte": 5, "pv": 7 },
      "3": { "mouvement": 6, "combat": 5, "esquive": 4, "volonte": 6, "pv": 8 }
    },
    "origins": [
      {
        "id": "cite_developpee",
        "name": "Cité développée",
        "description": "Les Combattants bénéficient de la catégorie Technologie avancée."
      },
      {
        "id": "academie_militaire",
        "name": "Académie militaire",
        "description": "Si au moins 2 Combattants attaquent simultanément au corps à corps un ennemi, ils bénéficient d'un bonus de +1 dé d'attaque."
      }
    ]
  }
]
```

### 3.3. Extrait `equipments.json`
```json
[
  {
    "id": "epee_courte",
    "name": "Épée courte",
    "category": "Melee",
    "subCategory": "Arme légère",
    "level": 1,
    "slotsRequired": 1,
    "handsRequired": 1,
    "puissance": 1,
    "precision": 3,
    "specialRuleIds": ["aceree"],
    "costInGold": 0
  },
  {
    "id": "armure_plates",
    "name": "Armure de plates",
    "category": "Armor",
    "subCategory": "Armure",
    "level": 3,
    "slotsRequired": 1,
    "handsRequired": 0,
    "protection": 3,
    "statModifiers": {
      "esquive": -1,
      "mouvement": -1
    },
    "specialRuleIds": ["encombrant"],
    "costInGold": 0
  }
]
```

---

## 4. Cycle de Vie et Migration d'une Bande

1. **Création** : La bande est liée de manière immuable à la version choisie (`rulesetVersion: "0.8"`).
2. **Consultation / Modification** : L'API et le Frontend chargent le bundle de règles correspondant à `rulesetVersion`. Même si la V1.0 est en ligne, une bande en V0.8 reste parfaitement fonctionnelle avec ses coûts et stats d'origine.
3. **Fonction de Migration (Optionnelle)** :
   - Le joueur peut cliquer sur *« Migrer vers la version V0.9 »*.
   - Le système compare la bande avec le nouveau ruleset et affiche un rapport de différences :
     - Équipements dont le coût a changé ou devenus invalides.
     - Profils de combattants mis à jour.
   - Le joueur valide la migration en connaissance de cause.
