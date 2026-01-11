import { useRebar } from '@Server/index.js';
import * as alt from 'alt-server';
import {
    MINIGAME_ZONE,
    WAVE_CONFIG,
    XP_CONFIG,
    WEAPON_UNLOCKS,
    FAMILIES_PED_MODELS,
    FAMILIES_VEHICLE_MODEL,
    ENEMY_WEAPONS_BY_WAVE,
} from '../shared/config.js';
import { FamiliesMinigameEvents } from '../shared/events.js';
import { addXp, getXpInfo } from './xpSystem.js';

const Rebar = useRebar();
const messenger = Rebar.messenger.useMessenger();

interface MinigameSession {
    player: alt.Player;
    currentWave: number;
    kills: number;
    active: boolean;
    enemies: alt.Ped[];
    vehicles: alt.Vehicle[];
    civilians: alt.Ped[];
    startTime: number;
    checkInterval?: number;
}

const activeSessions = new Map<number, MinigameSession>();

/**
 * Start server-side death checking for peds (backup method)
 */
function startServerSideDeathCheck(session: MinigameSession): void {
    session.checkInterval = alt.setInterval(() => {
        if (!session.active) return;

        // Check each enemy ped
        for (let i = session.enemies.length - 1; i >= 0; i--) {
            const ped = session.enemies[i];
            if (!ped.valid || ped.health === 0) {
                console.log(`[Families] Server detected dead ped ${ped.id}`);
                session.enemies.splice(i, 1);
                session.kills++;

                // Calculate XP reward
                const baseXp = XP_CONFIG.xpPerKill;
                const waveMultiplier = Math.pow(XP_CONFIG.xpMultiplierPerWave, session.currentWave - 1);
                const xpReward = Math.floor(baseXp * waveMultiplier);

                addXp(session.player, xpReward);

                messenger.message.send(session.player, {
                    type: 'info',
                    content: `+${xpReward} XP (${session.enemies.length} restants)`,
                });
            }
        }

        // Check if wave is complete
        if (session.enemies.length === 0 && session.active) {
            console.log(`[Families] Server: Wave ${session.currentWave} completed!`);
            session.currentWave++;
            
            messenger.message.send(session.player, {
                type: 'info',
                content: `✅ Vague ${session.currentWave - 1} terminée!`,
            });

            // Spawn next wave after delay
            setTimeout(() => {
                if (session.active) {
                    console.log(`[Families] Server: Spawning wave ${session.currentWave}`);
                    spawnWave(session.player, session);
                }
            }, 3000);
        }
    }, 1000); // Check every second
}

/**
 * Start minigame for a player
 */
export async function startMinigame(player: alt.Player): Promise<void> {
    if (activeSessions.has(player.id)) {
        messenger.message.send(player, {
            type: 'warning',
            content: 'Vous êtes déjà dans un mini-jeu!',
        });
        return;
    }

    // Get player info
    const info = getXpInfo(player);
    
    // Create session
    const session: MinigameSession = {
        player,
        currentWave: 1,
        kills: 0,
        active: true,
        enemies: [],
        vehicles: [],
        civilians: [],
        startTime: Date.now(),
    };

    activeSessions.set(player.id, session);

    // Start server-side death checking as backup
    startServerSideDeathCheck(session);

    // Teleport player to minigame zone
    player.pos = new alt.Vector3(
        MINIGAME_ZONE.center.x,
        MINIGAME_ZONE.center.y,
        MINIGAME_ZONE.center.z
    );

    // Give weapons based on level
    giveWeaponsForLevel(player, info.level);

    // Apply rampage effect on client
    alt.emitClient(player, FamiliesMinigameEvents.toClient.startMinigame, info.level);

    // Show start message
    messenger.message.send(player, {
        type: 'info',
        content: `🔫 FAMILIES MINIGAME - Vague 1 | Level ${info.level}`,
    });

    // Spawn first wave
    setTimeout(() => {
        if (session.active) {
            spawnWave(player, session);
        }
    }, 2000);
}

/**
 * Stop minigame for a player
 */
export function stopMinigame(player: alt.Player, showStats: boolean = true): void {
    const session = activeSessions.get(player.id);
    if (!session) return;

    session.active = false;

    // Stop server-side death check
    if (session.checkInterval) {
        alt.clearInterval(session.checkInterval);
        session.checkInterval = undefined;
    }

    // Cleanup enemies
    session.enemies.forEach(ped => {
        if (ped && ped.valid) {
            ped.destroy();
        }
    });

    // Cleanup vehicles
    session.vehicles.forEach(vehicle => {
        if (vehicle && vehicle.valid) {
            vehicle.destroy();
        }
    });

    // Cleanup civilians
    session.civilians.forEach(ped => {
        if (ped && ped.valid) {
            ped.destroy();
        }
    });

    // Remove rampage effect
    alt.emitClient(player, FamiliesMinigameEvents.toClient.stopMinigame);

    if (showStats) {
        const duration = Math.floor((Date.now() - session.startTime) / 1000);
        messenger.message.send(player, {
            type: 'info',
            content: `📊 Fin du mini-jeu | Vagues: ${session.currentWave} | Kills: ${session.kills} | Durée: ${duration}s`,
        });
    }

    activeSessions.delete(player.id);
}

/**
 * Give weapons to player based on level
 */
function giveWeaponsForLevel(player: alt.Player, level: number): void {
    player.removeAllWeapons();

    WEAPON_UNLOCKS.forEach(unlock => {
        if (level >= unlock.level) {
            player.giveWeapon(unlock.weaponHash, unlock.ammo, true);
        }
    });
}

/**
 * Spawn a wave of enemies
 */
function spawnWave(player: alt.Player, session: MinigameSession): void {
    if (!session.active) return;

    const wave = session.currentWave;
    const enemyCount = Math.floor(WAVE_CONFIG.enemiesPerWave * Math.pow(WAVE_CONFIG.enemyScaling, wave - 1));
    const enemyHealth = 100 + Math.floor(100 * Math.pow(WAVE_CONFIG.healthScaling, wave - 1));

    // Get appropriate weapons for this wave
    const weaponSet = ENEMY_WEAPONS_BY_WAVE.find(w => wave <= w.maxWave) || ENEMY_WEAPONS_BY_WAVE[ENEMY_WEAPONS_BY_WAVE.length - 1];

    messenger.message.send(player, {
        type: 'info',
        content: `🌊 Vague ${wave} - ${enemyCount} ennemis!`,
    });

    // Spawn enemies around the zone
    for (let i = 0; i < enemyCount; i++) {
        setTimeout(() => {
            if (!session.active) return;

            const angle = (Math.PI * 2 * i) / enemyCount;
            const distance = 20 + Math.random() * 30;
            const x = MINIGAME_ZONE.center.x + Math.cos(angle) * distance;
            const y = MINIGAME_ZONE.center.y + Math.sin(angle) * distance;
            const z = MINIGAME_ZONE.center.z;

            const model = FAMILIES_PED_MODELS[Math.floor(Math.random() * FAMILIES_PED_MODELS.length)];
            const ped = new alt.Ped(model, new alt.Vector3(x, y, z), new alt.Vector3(0, 0, 0));

            // Give weapon to enemy
            const weapon = weaponSet.weapons[Math.floor(Math.random() * weaponSet.weapons.length)];
            ped.health = enemyHealth;
            ped.maxHealth = enemyHealth;
            ped.armour = Math.floor(wave * 10);

            // Store reference
            session.enemies.push(ped);

            // Set ped to attack player (done on client side)
            alt.emitClient(player, FamiliesMinigameEvents.toClient.spawnWave, ped.id, weapon);
        }, i * 500); // Stagger spawns
    }

    // Spawn vehicle every 5 waves
    if (wave % WAVE_CONFIG.vehicleWaveInterval === 0) {
        setTimeout(() => {
            spawnEnemyVehicle(player, session);
        }, enemyCount * 500 + 1000);
    }

    // Spawn civilians starting from wave 5
    if (wave >= WAVE_CONFIG.civilianWaveStart) {
        setTimeout(() => {
            spawnCivilians(player, session);
        }, enemyCount * 500 + 2000);
    }
}

/**
 * Spawn enemy vehicle
 */
function spawnEnemyVehicle(player: alt.Player, session: MinigameSession): void {
    if (!session.active) return;

    const angle = Math.random() * Math.PI * 2;
    const distance = 50;
    const x = MINIGAME_ZONE.center.x + Math.cos(angle) * distance;
    const y = MINIGAME_ZONE.center.y + Math.sin(angle) * distance;
    const z = MINIGAME_ZONE.center.z;

    const vehicle = new alt.Vehicle(FAMILIES_VEHICLE_MODEL, new alt.Vector3(x, y, z), new alt.Vector3(0, 0, angle));
    
    // Spawn driver and passengers
    for (let i = 0; i < 3; i++) {
        const model = FAMILIES_PED_MODELS[Math.floor(Math.random() * FAMILIES_PED_MODELS.length)];
        const ped = new alt.Ped(model, vehicle.pos, new alt.Vector3(0, 0, 0));
        
        const wave = session.currentWave;
        const enemyHealth = 100 + Math.floor(100 * Math.pow(WAVE_CONFIG.healthScaling, wave - 1));
        ped.health = enemyHealth;
        ped.maxHealth = enemyHealth;
        
        session.enemies.push(ped);
    }

    session.vehicles.push(vehicle);

    messenger.message.send(player, {
        type: 'warning',
        content: '🚗 Véhicule ennemi repéré!',
    });
}

/**
 * Spawn civilians
 */
function spawnCivilians(player: alt.Player, session: MinigameSession): void {
    if (!session.active) return;

    const civilianCount = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < civilianCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 15 + Math.random() * 25;
        const x = MINIGAME_ZONE.center.x + Math.cos(angle) * distance;
        const y = MINIGAME_ZONE.center.y + Math.sin(angle) * distance;
        const z = MINIGAME_ZONE.center.z;

        // Random civilian models
        const civilianModels = ['a_m_y_hipster_01', 'a_f_y_tourist_01', 'a_m_y_downtown_01'];
        const model = civilianModels[Math.floor(Math.random() * civilianModels.length)];
        
        const ped = new alt.Ped(model, new alt.Vector3(x, y, z), new alt.Vector3(0, 0, 0));
        session.civilians.push(ped);
    }
}

/**
 * Handle enemy killed
 */
export async function onEnemyKilled(player: alt.Player, pedId: number): Promise<void> {
    const session = activeSessions.get(player.id);
    if (!session || !session.active) {
        console.log(`[Families] No active session for player ${player.name}`);
        return;
    }

    console.log(`[Families] Enemy killed event received for ped ${pedId}`);
    console.log(`[Families] Current enemies: ${session.enemies.length}`);

    // Find and remove the ped
    const pedIndex = session.enemies.findIndex(p => p.id === pedId);
    if (pedIndex === -1) {
        console.log(`[Families] Ped ${pedId} not found in enemies list`);
        return;
    }

    session.enemies.splice(pedIndex, 1);
    session.kills++;

    console.log(`[Families] Kill registered! Remaining enemies: ${session.enemies.length}`);

    // Calculate XP reward
    const baseXp = XP_CONFIG.xpPerKill;
    const waveMultiplier = Math.pow(XP_CONFIG.xpMultiplierPerWave, session.currentWave - 1);
    const xpReward = Math.floor(baseXp * waveMultiplier);

    await addXp(player, xpReward);

    messenger.message.send(player, {
        type: 'info',
        content: `+${xpReward} XP (${session.enemies.length} restants)`,
    });

    // Check if wave is complete
    if (session.enemies.length === 0) {
        console.log(`[Families] Wave ${session.currentWave} completed!`);
        session.currentWave++;
        
        messenger.message.send(player, {
            type: 'info',
            content: `✅ Vague ${session.currentWave - 1} terminée!`,
        });

        // Spawn next wave after delay
        setTimeout(() => {
            if (session.active) {
                console.log(`[Families] Spawning wave ${session.currentWave}`);
                spawnWave(player, session);
            }
        }, 3000);
    }
}

/**
 * Handle civilian killed
 */
export async function onCivilianKilled(player: alt.Player, pedId: number): Promise<void> {
    const session = activeSessions.get(player.id);
    if (!session || !session.active) return;

    // Find and remove the civilian
    const pedIndex = session.civilians.findIndex(p => p.id === pedId);
    if (pedIndex === -1) return;

    session.civilians.splice(pedIndex, 1);

    // Apply XP penalty
    const info = getXpInfo(player);
    const { getTotalXpForLevel } = await import('./xpSystem.js');
    const currentLevelStartXp = getTotalXpForLevel(info.level);
    const xpForCurrentLevel = info.xp - currentLevelStartXp;
    
    // Don't let them lose a level
    const maxLoss = Math.max(1, Math.floor(xpForCurrentLevel));
    const actualLoss = Math.min(XP_CONFIG.xpLossPerCivilian, maxLoss);

    await addXp(player, -actualLoss);

    messenger.message.send(player, {
        type: 'warning',
        content: `⚠️ Civil tué! -${actualLoss} XP`,
    });
}

/**
 * Handle player death
 */
export function onPlayerDeath(player: alt.Player): void {
    const session = activeSessions.get(player.id);
    if (!session) return;

    messenger.message.send(player, {
        type: 'warning',
        content: '💀 Vous êtes mort!',
    });

    stopMinigame(player, true);
}

// Listen for player disconnect
alt.on('playerDisconnect', (player) => {
    if (activeSessions.has(player.id)) {
        stopMinigame(player, false);
    }
});

// Event handlers
alt.onClient(FamiliesMinigameEvents.toServer.requestStart, (player) => {
    startMinigame(player);
});

alt.onClient(FamiliesMinigameEvents.toServer.requestExit, (player) => {
    stopMinigame(player, true);
});

alt.onClient(FamiliesMinigameEvents.toServer.enemyKilled, (player, pedId: number) => {
    onEnemyKilled(player, pedId);
});

alt.onClient(FamiliesMinigameEvents.toServer.civilianKilled, (player, pedId: number) => {
    onCivilianKilled(player, pedId);
});

alt.onClient(FamiliesMinigameEvents.toServer.playerDied, (player) => {
    onPlayerDeath(player);
});
