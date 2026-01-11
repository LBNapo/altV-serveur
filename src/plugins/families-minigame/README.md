# Plugin Families Minigame

Plugin de mini-jeu avec système XP/Levels pour le serveur alt:V GTA 5 RP.

## Fonctionnalités

### Système XP/Levels
- Chaque joueur possède des points d'expérience (XP) et un niveau
- XP requis augmente progressivement par niveau (scaling: 1.5x)
- Commande `/level` pour voir son niveau et progression
- Commande `/givexp` (admin) pour donner de l'XP

### Mini-jeu Families
Un mini-jeu de massacre dans le quartier Families avec système de vagues.

**Démarrage:**
- Console: `startfamilies`
- Le joueur est téléporté dans le quartier Families
- Effet rampage appliqué (modificateurs de dégâts)
- Message d'annonce à l'écran

**Gameplay:**
- Système de vagues progressives
- 5 ennemis de base par vague (scaling: 1.2x)
- Santé des ennemis augmente par vague (scaling: 1.3x)
- Véhicule ennemi spawn toutes les 5 vagues
- Civils dansants à partir de la vague 5

**Armes débloquées par niveau:**
- Level 1: Pistol .50 (200 balles)
- Level 3: Pump Shotgun (100 balles)
- Level 5: Assault Rifle (300 balles)
- Level 7: Heavy Sniper (50 balles)
- Level 10: Carbine Rifle (400 balles)

**Récompenses:**
- XP de base: 10 par kill
- Multiplicateur par vague: 1.2x
- Example: Vague 5 = 10 × 1.2^4 = ~21 XP par kill

**Pénalités:**
- Kill civil: -50 XP
- Protection anti-delevel: ne peut pas perdre de niveau

**Fin du mini-jeu:**
- Mort du joueur
- Commande: `stopfamilies`
- Affichage des statistiques (vagues, kills, durée)

## Structure du Plugin

```
src/plugins/families-minigame/
├── server/
│   ├── index.ts          # Point d'entrée serveur
│   ├── xpSystem.ts       # Système XP/Levels
│   ├── commands.ts       # Commandes (/level, /givexp)
│   └── minigame.ts       # Logique du mini-jeu
├── client/
│   └── index.ts          # Effets visuels et gestion des NPCs
├── shared/
│   ├── config.ts         # Configuration du jeu
│   └── events.ts         # Événements partagés
└── dependencies.json     # Dépendances ReBar
```

## Configuration

### XP System (`shared/config.ts`)
```typescript
xpPerKill: 10              // XP de base par kill
xpMultiplierPerWave: 1.2   // Multiplicateur d'XP par vague
xpLossPerCivilian: 50      // Perte d'XP si kill civil
xpPerLevel: 100            // XP requis pour level 2
xpScalingPerLevel: 1.5     // Scaling de XP requis
```

### Wave System
```typescript
enemiesPerWave: 5          // Ennemis de base
enemyScaling: 1.2          // Scaling du nombre
healthScaling: 1.3         // Scaling de la santé
vehicleWaveInterval: 5     // Véhicule toutes les N vagues
civilianWaveStart: 5       // Civils à partir de la vague N
```

## Commandes

### Joueur
- `/level` - Affiche niveau, XP et progression
- `/families` - Démarre le mini-jeu Families
- `/exitfamilies` - Quitte le mini-jeu Families

### Admin
- `/givexp [player_id] [amount]` - Donne de l'XP à un joueur

### Console Client (Alternative)
- `startfamilies` - Démarre le mini-jeu
- `stopfamilies` - Quitte le mini-jeu

## Effets Visuels

- Message d'annonce à l'écran (style GTA)
- Modificateur de dégâts (1.5x armes, 2.0x mêlée)
- Effet visuel "RaceTurbo"
- Modificateur d'éclairage "prologue_light"

## Zone de Jeu

- Centre: (-14.24, -1442.61, 31.10)
- Rayon: 50 mètres
- Quartier: Forum Drive / Families
- Marqueur visuel: Cercle vert au sol indiquant la zone

## Ennemis

### Modèles NPCs
- g_m_y_famca_01
- g_m_y_famdnf_01
- g_m_y_famfor_01

### Armes par Vague
- Vague 1-2: Pistolets
- Vague 3-5: Pistolets variés
- Vague 6-10: Micro SMG, AP Pistol
- Vague 10+: Assault Rifle, SMG

### Véhicules
- Modèle: Faction (voiture Families)
- 3 ennemis par véhicule

## Progression

### Calcul XP par Level
- Level 2: 100 XP
- Level 3: 150 XP
- Level 4: 225 XP
- Level 5: 337 XP
- Level 10: 2278 XP

### Exemple Progression
```
Kill vague 1: +10 XP
Kill vague 5: +21 XP
Kill vague 10: +52 XP
Kill vague 20: +387 XP
```

## API

### Server Functions
```typescript
// XP System
addXp(player: alt.Player, amount: number): Promise<void>
getXpInfo(player: alt.Player): XpInfo
initializeXpSystem(player: alt.Player): Promise<void>

// Minigame
startMinigame(player: alt.Player): Promise<void>
stopMinigame(player: alt.Player, showStats: boolean): void
```

### Events
```typescript
// Server -> Client
'families:start-minigame'
'families:stop-minigame'
'families:spawn-wave'

// Client -> Server
'families:request-start'
'families:request-exit'
'families:enemy-killed'
'families:civilian-killed'
'families:player-died'
```

## Extensibilité

Le système est conçu pour être facilement étendu:
- Ajouter de nouvelles armes dans `WEAPON_UNLOCKS`
- Modifier les modèles d'ennemis dans `FAMILIES_PED_MODELS`
- Ajuster la difficulté via les constantes de scaling
- Créer de nouvelles zones de mini-jeu

## Notes Techniques

- Les peds sont gérés côté serveur et contrôlés côté client
- Système de tracking pour détecter les morts
- Cleanup automatique à la déconnexion
- Protection anti-delevel lors des pénalités
- Spawn échelonné des ennemis (500ms entre chaque)

## Sécurité

- Validation côté serveur
- Vérification de session active
- Cleanup automatique des ressources
- Protection contre les abus (session unique)
