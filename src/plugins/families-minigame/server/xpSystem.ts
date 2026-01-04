import { useRebar } from '@Server/index.js';
import * as alt from 'alt-server';
import { Character } from '@Shared/types/character.js';
import { XP_CONFIG } from '../shared/config.js';

const Rebar = useRebar();

/**
 * Calculate XP required for a given level
 */
export function getXpForLevel(level: number): number {
    if (level <= 1) return 0;
    return Math.floor(XP_CONFIG.xpPerLevel * Math.pow(XP_CONFIG.xpScalingPerLevel, level - 2));
}

/**
 * Calculate total XP required to reach a level
 */
export function getTotalXpForLevel(level: number): number {
    let total = 0;
    for (let i = 2; i <= level; i++) {
        total += getXpForLevel(i);
    }
    return total;
}

/**
 * Get player's current level based on XP
 */
export function getLevelFromXp(xp: number): number {
    let level = 1;
    let totalXpNeeded = 0;
    
    while (totalXpNeeded <= xp) {
        level++;
        totalXpNeeded += getXpForLevel(level);
    }
    
    return level - 1;
}

/**
 * Add XP to a player
 */
export async function addXp(player: alt.Player, amount: number): Promise<void> {
    const character = Rebar.document.character.useCharacter(player);
    if (!character.isValid()) {
        return;
    }

    const currentXp = character.getField('xp') ?? 0;
    const currentLevel = character.getField('level') ?? 1;
    const newXp = Math.max(0, currentXp + amount);
    const newLevel = getLevelFromXp(newXp);

    await character.set('xp', newXp);

    // Level up detected
    if (newLevel > currentLevel) {
        await character.set('level', newLevel);
        const messenger = Rebar.messenger.useMessenger();
        messenger.message.send(player, {
            type: 'info',
            content: `🎉 Level Up! Vous êtes maintenant niveau ${newLevel}!`,
        });
        
        // Emit level up event for other systems
        alt.emit('families:playerLevelUp', player, newLevel, currentLevel);
    } else if (newLevel < currentLevel) {
        // Level down
        await character.set('level', newLevel);
    }
}

/**
 * Initialize XP/Level for a player if not set
 */
export async function initializeXpSystem(player: alt.Player): Promise<void> {
    const character = Rebar.document.character.useCharacter(player);
    if (!character.isValid()) {
        return;
    }

    const xp = character.getField('xp');
    const level = character.getField('level');

    if (xp === undefined) {
        await character.set('xp', 0);
    }

    if (level === undefined) {
        await character.set('level', 1);
    }
}

/**
 * Get player's XP and level info
 */
export function getXpInfo(player: alt.Player): { xp: number; level: number; nextLevelXp: number; progress: number } {
    const character = Rebar.document.character.useCharacter(player);
    if (!character.isValid()) {
        return { xp: 0, level: 1, nextLevelXp: XP_CONFIG.xpPerLevel, progress: 0 };
    }

    const xp = character.getField('xp') ?? 0;
    const level = character.getField('level') ?? 1;
    const currentLevelTotalXp = getTotalXpForLevel(level);
    const nextLevelTotalXp = getTotalXpForLevel(level + 1);
    const nextLevelXp = nextLevelTotalXp - currentLevelTotalXp;
    const currentLevelProgress = xp - currentLevelTotalXp;
    const progress = nextLevelXp > 0 ? (currentLevelProgress / nextLevelXp) * 100 : 0;

    return {
        xp,
        level,
        nextLevelXp,
        progress: Math.max(0, Math.min(100, progress)),
    };
}
