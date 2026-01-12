import * as alt from 'alt-client';
import * as native from 'natives';
import { FamiliesMinigameEvents } from '../shared/events.js';
import { MINIGAME_ZONE } from '../shared/config.js';

let minigameActive = false;
let rampageEffect: number | undefined;
let checkInterval: number | undefined;
let pedTargets: Map<number, alt.Ped> = new Map();
let civilianPeds: Set<number> = new Set();
let boundaryMarker: number | undefined;
let pedBlips: Map<number, number> = new Map(); // Track blips for each ped
let respawnTimer: number | undefined;
let deathScreenActive = false;
let deathCountdown = 0;
let everyTickHandler: number | undefined;

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
    deathScreenActive = false;

    // Clear timers
    if (respawnTimer) {
        alt.clearInterval(respawnTimer);
        respawnTimer = undefined;
    }
    
    if (everyTickHandler) {
        alt.clearEveryTick(everyTickHandler);
        everyTickHandler = undefined;
    }

    // Remove effects
    native.setPlayerMeleeWeaponDamageModifier(alt.Player.local.scriptID, 1.0);
    native.setPlayerWeaponDamageModifier(alt.Player.local.scriptID, 1.0);
    native.animpostfxStop('RaceTurbo');
    native.clearTimecycleModifier();

    // Remove all ped blips
    pedBlips.forEach((blipId) => {
        if (native.doesBlipExist(blipId)) {
            native.removeBlip(blipId);
        }
    });
    pedBlips.clear();

    // Stop checking
    if (checkInterval) {
        alt.clearInterval(checkInterval);
        checkInterval = undefined;
    }

    // Clear respawn timer
    if (respawnTimer) {
        alt.clearInterval(respawnTimer);
        respawnTimer = undefined;
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
        
        // Give weapon first
        native.giveWeaponToPed(pedScriptId, weaponHash, 9999, false, true);
        native.setCurrentPedWeapon(pedScriptId, weaponHash, true);
        
        // Set relationship to hate player - AGGRESSIVE
        native.setPedRelationshipGroupHash(pedScriptId, native.getHashKey('HATES_PLAYER'));
        native.setRelationshipBetweenGroups(5, native.getHashKey('HATES_PLAYER'), native.getHashKey('PLAYER')); // Hate
        native.setRelationshipBetweenGroups(5, native.getHashKey('PLAYER'), native.getHashKey('HATES_PLAYER')); // Hate
        
        // Make them VERY aggressive and fearless
        native.setPedFleeAttributes(pedScriptId, 0, false); // Never flee
        native.setPedCombatAttributes(pedScriptId, 46, true); // Always fight
        native.setPedCombatAttributes(pedScriptId, 0, false); // Can use vehicles
        native.setPedCombatAttributes(pedScriptId, 2, true); // Can do drivebys
        native.setPedCombatAttributes(pedScriptId, 3, false); // Leave vehicles
        native.setPedCombatAttributes(pedScriptId, 5, false); // Don't use cover - more aggressive
        native.setPedCombatAttributes(pedScriptId, 17, false); // Always fight
        native.setPedCombatAttributes(pedScriptId, 1, true); // Can use cover - but disabled above
        native.setPedCombatAttributes(pedScriptId, 58, true); // Disable all fears
        native.setPedCombatMovement(pedScriptId, 3); // Very aggressive movement
        native.setPedCombatRange(pedScriptId, 3); // Maximum range (0=close, 1=medium, 2=long, 3=very long)
        native.setPedCombatAbility(pedScriptId, 2); // Very good combat ability
        native.setPedAlertness(pedScriptId, 3); // Maximum alertness
        native.setPedSeeingRange(pedScriptId, 150.0); // Can see player from very far
        native.setPedHearingRange(pedScriptId, 150.0); // Can hear player from very far
        
        // Prevent fleeing and make brave
        native.setBlockingOfNonTemporaryEvents(pedScriptId, true); // Ignore distractions
        native.setPedConfigFlag(pedScriptId, 281, true); // No writhe
        native.setPedConfigFlag(pedScriptId, 208, true); // Disable shocking events
        
        // Set accuracy and shooting - MAXIMUM AGGRESSION
        native.setPedAccuracy(pedScriptId, 100); // Maximum accuracy
        native.setPedShootRate(pedScriptId, 1000); // Very fast shooting
        native.setPedFiringPattern(pedScriptId, 0xC6EE6B4C); // Full auto pattern
        
        // Make them sprint to player immediately
        native.taskCombatPed(pedScriptId, alt.Player.local.scriptID, 0, 16);
        
        // Create a green blip for this ped
        const blip = native.addBlipForEntity(pedScriptId);
        native.setBlipSprite(blip, 1); // Default blip
        native.setBlipColour(blip, 2); // Green color
        native.setBlipScale(blip, 0.8);
        native.setBlipAsShortRange(blip, false);
        native.showHeadingIndicatorOnBlip(blip, false);
        pedBlips.set(pedId, blip);
        
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

        // Still track peds and remove blips when they die
        pedTargets.forEach((ped, pedId) => {
            if (!ped.valid) {
                if (shouldLog) console.log(`Ped ${pedId} is no longer valid, removing from tracking`);
                pedTargets.delete(pedId);
                
                // Remove blip
                const blipId = pedBlips.get(pedId);
                if (blipId && native.doesBlipExist(blipId)) {
                    native.removeBlip(blipId);
                }
                pedBlips.delete(pedId);
                
                if (civilianPeds.has(pedId)) {
                    civilianPeds.delete(pedId);
                }
            } else if (native.isPedDeadOrDying(ped.scriptID, true)) {
                if (shouldLog) console.log(`Ped ${pedId} is dead or dying`);
                // Don't emit - server handles it
                pedTargets.delete(pedId);
                
                // Remove blip
                const blipId = pedBlips.get(pedId);
                if (blipId && native.doesBlipExist(blipId)) {
                    native.removeBlip(blipId);
                }
                pedBlips.delete(pedId);
                
                if (civilianPeds.has(pedId)) {
                    civilianPeds.delete(pedId);
                }
            }
        });

        // Check if player is dead
        if (native.isPedDeadOrDying(alt.Player.local.scriptID, false)) {
            handlePlayerDeath();
        }
    }, 500);
}

/**
 * Handle player death - simple notification, server handles the rest
 */
function handlePlayerDeath(): void {
    if (!minigameActive || deathScreenActive) return;

    deathScreenActive = true;

    // Notify server - server will end minigame and TP player
    alt.emitServer(FamiliesMinigameEvents.toServer.playerDied);
    
    // Stop the minigame on client
    stopMinigame();
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

// Handle blip removal from server
alt.onServer('families:remove-blip', (pedId: number) => {
    const blipId = pedBlips.get(pedId);
    if (blipId && native.doesBlipExist(blipId)) {
        native.removeBlip(blipId);
        console.log(`[Families Client] Removed blip for ped ${pedId}`);
    }
    pedBlips.delete(pedId);
    pedTargets.delete(pedId);
});

// Command to start minigame
alt.on('consoleCommand', (command: string) => {
    if (command === 'startfamilies') {
        alt.emitServer(FamiliesMinigameEvents.toServer.requestStart);
    } else if (command === 'stopfamilies') {
        alt.emitServer(FamiliesMinigameEvents.toServer.requestExit);
    }
});
