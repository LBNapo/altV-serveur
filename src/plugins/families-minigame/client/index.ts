import * as alt from 'alt-client';
import * as native from 'natives';
import { FamiliesMinigameEvents } from '../shared/events.js';

let minigameActive = false;
let rampageEffect: number | undefined;
let checkInterval: number | undefined;
let pedTargets: Map<number, alt.Ped> = new Map();
let civilianPeds: Set<number> = new Set();

/**
 * Start the minigame
 */
function startMinigame(playerLevel: number): void {
    if (minigameActive) return;

    minigameActive = true;

    // Show big message
    native.beginTextCommandPrint('STRING');
    native.addTextComponentSubstringPlayerName('~r~FAMILIES MINIGAME');
    native.endTextCommandPrint(5000, true);

    // Apply rampage effects
    native.setPlayerMeleeWeaponDamageModifier(alt.Player.local.scriptID, 2.0);
    native.setPlayerWeaponDamageModifier(alt.Player.local.scriptID, 1.5);
    
    // Screen effects
    native.animpostfxPlay('RaceTurbo', 0, false);
    native.setTimecycleModifier('prologue_light');
    
    // Start checking for dead peds
    startPedDeathCheck();

    console.log('Minigame started!');
}

/**
 * Stop the minigame
 */
function stopMinigame(): void {
    if (!minigameActive) return;

    minigameActive = false;

    // Remove effects
    native.setPlayerMeleeWeaponDamageModifier(alt.Player.local.scriptID, 1.0);
    native.setPlayerWeaponDamageModifier(alt.Player.local.scriptID, 1.0);
    native.animpostfxStop('RaceTurbo');
    native.clearTimecycleModifier();

    // Stop checking
    if (checkInterval) {
        alt.clearInterval(checkInterval);
        checkInterval = undefined;
    }

    // Clear tracking
    pedTargets.clear();
    civilianPeds.clear();

    console.log('Minigame stopped!');
}

/**
 * Spawn wave - set peds to attack player
 */
function onSpawnWave(pedId: number, weaponHash: number): void {
    if (!minigameActive) return;

    console.log(`Spawning wave ped with ID: ${pedId}`);

    // Wait a bit for ped to be created and synced
    alt.setTimeout(() => {
        const ped = alt.Ped.getByID(pedId);
        if (!ped || !ped.valid) {
            console.warn(`Ped with ID ${pedId} not found or invalid`);
            return;
        }

        console.log(`Ped ${pedId} tracked successfully`);
        pedTargets.set(pedId, ped);

        // Make ped hostile
        const pedScriptId = ped.scriptID;
        
        // Task combat player
        native.taskCombatPed(pedScriptId, alt.Player.local.scriptID, 0, 16);
        native.setPedCombatAttributes(pedScriptId, 46, true); // Always fight
        native.setPedCombatAttributes(pedScriptId, 5, true); // Can use cover
        native.setPedCombatMovement(pedScriptId, 2); // Offensive movement
        native.setPedCombatRange(pedScriptId, 2); // Long range
        
        // Give weapon
        native.giveWeaponToPed(pedScriptId, weaponHash, 9999, false, true);
        native.setCurrentPedWeapon(pedScriptId, weaponHash, true);
        
        // Set relationship to hate player
        native.setPedRelationshipGroupHash(pedScriptId, native.getHashKey('HATES_PLAYER'));
        
        // Make them not flee
        native.setPedFleeAttributes(pedScriptId, 0, false);
        native.setPedCombatAbility(pedScriptId, 2); // Very good combat ability
        
        // Set accuracy based on difficulty
        native.setPedAccuracy(pedScriptId, 50);
        native.setPedShootRate(pedScriptId, 500);
    }, 500); // Increased timeout to allow proper sync
}
}

/**
 * Start checking for ped deaths
 * NOTE: This is now a backup to server-side detection
 * Client-side detection is disabled to prevent double-counting
 */
function startPedDeathCheck(): void {
    if (checkInterval) {
        alt.clearInterval(checkInterval);
    }

    let checkCount = 0;

    checkInterval = alt.setInterval(() => {
        if (!minigameActive) return;

        // Log every 10 checks (every 5 seconds) to reduce spam
        checkCount++;
        const shouldLog = checkCount % 10 === 0;

        if (shouldLog) {
            console.log(`[Families Client] Tracking ${pedTargets.size} peds...`);
        }

        // Still track peds for potential future client-side features
        pedTargets.forEach((ped, pedId) => {
            if (!ped.valid) {
                if (shouldLog) console.log(`Ped ${pedId} is no longer valid, removing from tracking`);
                pedTargets.delete(pedId);
                if (civilianPeds.has(pedId)) {
                    civilianPeds.delete(pedId);
                }
            } else if (native.isPedDeadOrDying(ped.scriptID, true)) {
                if (shouldLog) console.log(`Ped ${pedId} is dead or dying`);
                // Don't emit - server handles it
                pedTargets.delete(pedId);
                if (civilianPeds.has(pedId)) {
                    civilianPeds.delete(pedId);
                }
            }
        });

        // Check if player is dead
        if (native.isPedDeadOrDying(alt.Player.local.scriptID, false)) {
            alt.emitServer(FamiliesMinigameEvents.toServer.playerDied);
            stopMinigame();
        }
    }, 500);
}

/**
 * Mark civilians
 */
function markCivilian(pedId: number): void {
    civilianPeds.add(pedId);
    pedTargets.set(pedId, alt.Ped.getByID(pedId));
}

// Event listeners
alt.onServer(FamiliesMinigameEvents.toClient.startMinigame, (playerLevel: number) => {
    startMinigame(playerLevel);
});

alt.onServer(FamiliesMinigameEvents.toClient.stopMinigame, () => {
    stopMinigame();
});

alt.onServer(FamiliesMinigameEvents.toClient.spawnWave, (pedId: number, weaponHash: number) => {
    onSpawnWave(pedId, weaponHash);
});

// Command to start minigame
alt.on('consoleCommand', (command: string) => {
    if (command === 'startfamilies') {
        alt.emitServer(FamiliesMinigameEvents.toServer.requestStart);
    } else if (command === 'stopfamilies') {
        alt.emitServer(FamiliesMinigameEvents.toServer.requestExit);
    }
});
