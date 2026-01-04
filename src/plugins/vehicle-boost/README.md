# Plugin Vehicle Boost

Ce plugin ajoute une commande permettant de booster temporairement un véhicule dans le serveur alt:V GTA 5 RP.

## Commande

### `/boost`

Active un boost temporaire sur le véhicule actuel du joueur.

**Permissions requises**: `moderator`

**Utilisation**:
1. Entrez dans un véhicule en tant que conducteur
2. Tapez `/boost` dans le chat
3. Maintenez la touche `Shift` (Sprint) pour activer le boost
4. Le boost s'arrête automatiquement après 30 secondes ou si vous sortez du véhicule

**Effets du boost**:
- Force d'accélération augmentée (8x vers l'avant)
- Puissance du moteur augmentée (1.5x)
- Activation uniquement quand la touche Shift est maintenue

## Structure du plugin

- `server/index.ts` - Gestion de la commande et validation côté serveur
- `client/index.ts` - Application du boost et gestion des effets côté client
- `shared/events.ts` - Événements partagés entre client et serveur
- `dependencies.json` - Dépendances du plugin ReBar

## Messages

- ✅ **Info**: "Boost activé ! Maintenez Shift pour utiliser le boost."
- ⚠️ **Avertissement**: "Vous devez être dans un véhicule pour utiliser cette commande."
- ⚠️ **Avertissement**: "Vous devez être au volant pour utiliser cette commande."

## Paramètres modifiables

Dans `client/index.ts`:
- `boostForce` (ligne 24): Force du boost (défaut: 8.0)
- `setVehicleCheatPowerIncrease` (ligne 44): Multiplicateur de puissance (défaut: 1.5)
- Durée du boost (ligne 66): 30000ms = 30 secondes
- Fréquence d'application (ligne 62): 10ms (intervalle de mise à jour)

## Notes techniques

- Le boost est appliqué toutes les 10ms pour une expérience fluide
- Le boost s'arrête automatiquement si le joueur quitte le siège conducteur (seat 0)
- Utilise les natives GTA V pour l'application de force et la modification de puissance
- Compatible avec le système de permissions ReBar
- Force appliquée en mode "impulse force" pour une accélération naturelle
- Audio du boost activé automatiquement

## Exemples d'utilisation

```
Joueur: /boost
Serveur: ✅ Boost activé ! Maintenez Shift pour utiliser le boost.
[Le joueur maintient Shift pour accélérer]
[Après 30 secondes, le boost se désactive automatiquement]
```

## Sécurité et bonnes pratiques

- ✅ Validation côté serveur pour éviter les abus
- ✅ Permission `moderator` requise pour limiter l'accès
- ✅ Vérification que le joueur est conducteur avant activation
- ✅ Nettoyage automatique des ressources lors de la sortie du véhicule
- ✅ Aucune vulnérabilité de sécurité détectée (CodeQL)
