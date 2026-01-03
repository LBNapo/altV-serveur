---
name: Agent Alt:v Rebar
description: Agent du Dev Framework Rebar
---

# RebarDev

Voici une version enrichie et adaptée des **instructions pour un agent Copilot**, basée sur l'environnement **alt:v**, la spécificité de **ReBar**, et vos exigences additionnelles.

---

# **GitHub Copilot Instructions**

Ces instructions définissent le fonctionnement attendu de GitHub Copilot pour aider au développement d'un serveur **GTA 5 RP** sous **alt:v** en utilisant le framework **ReBar**. L'objectif est de garantir un code cohérent, conforme et centré sur les meilleures pratiques du développement modulaire et événementiel.

---

## 🧠 **Contexte**

- **Objectif Projet** : Créer et gérer un serveur Roleplay performant, flexible et maintenable.
- **Langage** : TypeScript.
- **Framework / Libraries** : ReBar, alt:V, Vue 3, TailwindCSS, MongoDB.
- **Architecture** : Structure modulaire basée uniquement sur le système de plugins de ReBar.
- **Focus** : 
  - Respecter les conventions imposées par ReBar.
  - Gérer les UI via le **GlobalUiManager** (utilisé par les systèmes comme RPChat et Interaction Eye).
  - Assurer des callbacks sur tous les événements pour éviter des erreurs telles que "event ... n’a pas de callback".

---

## 🔧 **Directives Générales**

- Limiter tout code au sein des **plugins ReBar** sous `src/plugins/`, sans jamais créer du code en dehors de cette structure.
- Séparer le code en couches client, serveur et partagée :
  - **client/** : Logique utilisateur, interactions via UI ou API natives alt:v.
  - **server/** : Gestion des événements, règles métiers et services centralisés.
  - **webview/** : Composants Vue 3, interactions TailwindCSS, gestion via GlobalUiManager.
  - **shared/** : Constantes, événements communs, typages partagés.
- Valider toutes les entrées, en particulier les événements RPC ou les données entrantes :
  - Utiliser **Zod** ou les validateurs ReBar.
- Prioriser :
  - TypeScript idiomatique (utiliser `strict`).
  - Programmation événementielle centralisée.
  - Respect des conventions CSS (prévoir compatibilité Tailwind).

---

## 📁 **Structure des Fichiers**

Organisez tout au sein des **plugins ReBar**, avec une nomenclature stricte :

```text
src/
  plugins/
    ui-example/
      ├── client/         # Code d’interaction utilisateur alt:V
      │    └── index.ts
      ├── server/         # Gestion des événements et logique métiers
      │    └── index.ts
      ├── shared/         # Typages & événements communs client/serveur
      │    └── events.ts
      ├── translate/      # Translations localisées
      │    └── index.ts
      ├── webview/        # Interfaces utilisateur (Vue 3)
      │    └── UiNotification.vue
      ├── sounds/         # Sons personnalisés (format .ogg)
      ├── fonts/          # Fichiers de polices (TTF/OTF)
      ├── images/         # Images statiques (format SVG, PNG...)
      ├── dependencies.json
```

### Spécificités pour **webview/** :
- S’assurer que **chaque interface** est :
  - Clickable et interactive.
  - Gérée par des instances explicites du **GlobalUiManager**.
  - Ne pas oublier de gérer le blockage des controles d'attaques
  - Bien gérer la config globaluimanager
  
### Noms de fichiers recommandés :
- UI Vue : `UiNomDeVue.vue`.
- Événement Serveur : `nomFonctionnel.server.ts`.
- Événement Client : `nomFonctionnel.client.ts`.

---

## 🧶 **Patterns**

### ✅ **Exigences et Bonnes Pratiques**
1. **Utiliser le système de plugin ReBar** :
   - Chaque fonctionnalité doit être isolée dans son propre plugin.
   - Respecter la structure client/server/webview.

   Exemple :
   ```typescript
   // src/plugins/rpchat/server/index.ts
   import * as alt from 'alt-server';
   import { useRebar } from '@Server/index.js';

   const Rebar = useRebar();

   Rebar.events.on('rebar:chatMessage', (player, message) => {
       Rebar.player.emit(player, 'rebar:chatResult', `Message reçu : ${message}`);
   });
   ```

2. **Gestion UI avec GlobalUiManager** :
   - Les interfaces doivent être gérées avec **focus** et via un **manager centralisé**. Exemple :
     ```typescript
     // src/plugins/ui-interaction/webview/UiInteraction.vue
     import { useGlobalUiManager } from '@RebarClient/uiManager';
     const UiManager = useGlobalUiManager();
     ```

   - Empêcher tout dysfonctionnement d’UI qui ne capte pas les clics ou le focus.

3. **Validation des entrées utilisateurs** :
   - Toujours valider les entrées avec **Zod** ou un validateur ReBar :
     ```typescript
     const schema = z.object({
         username: z.string(),
         score: z.number().min(0).max(100),
     });

     function handleEvent(data) {
         const validData = schema.parse(data); // Gérer une erreur
     }
     ```

4. **Assurer des callbacks sur chaque événement** :
   - Code robuste sans "callbacks manquants” :
     ```typescript
     alt.onClient('exampleEvent', async (player, data, callback) => {
         if (!callback) {
             console.error("Callback manquant sur 'exampleEvent'");
             return;
         }
         callback(null, { success: true });
     });
     ```

---

### 🚫 **Anti-Patterns à Éviter**
1. **Ne pas sortir de la structure des plugins**.
2. **Éviter les UI non clickables ou non isolables** dans les WebViews.
3. **Ne pas coder directement sans validateur.**

---

## 🧪 **Testing Guidelines**

### Tests Principaux :
1. **UI Testing** : 
   - Vérifiez que tous les clics, actions sont bien captés.
   - Assurez-vous que l’interface est proprement gérée par GlobalUiManager.
   
2. **Tests des événements** :
   - Assurez-vous qu'aucun événement ne produit d'erreur `event ... no callback`.

3. **Tests unitaires et d’intégration** :
   - Jest pour les tests unitaires.
   - Supertest pour les tests API.

---

## 🔁 **Prompts Copilot Exemple**

- `Génère un événement alt:V qui valide deux joueurs les plus proches d’un objet donné.`
- `Créer une interface Vue.js pour afficher des notifications système RP.`
- `Gérer un nouvel écran de consommation rapide via GlobalUiManager.`
- `Valide une configuration serveur RPC avec Zod.`

---

## 🔁 **Checklist Post-Développement**

1. Chaque **plugin** a une structure correcte.
2. Gestion UI vérifiée avec `GlobalUiManager`.
3. Validation implémentée pour tout événement client/serveur.
4. Testé en jeu pour éviter bugs de base (UI focus, interactions manquées).

---

Ces conventions assurent que GitHub Copilot exécute des tâches locales de manière cohérente avec l’environnement **alt:v** et **ReBar** !
