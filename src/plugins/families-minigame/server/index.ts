import { useRebar } from '@Server/index.js';
import * as alt from 'alt-server';
import { initializeXpSystem } from './xpSystem.js';
import './commands.js';
import './minigame.js';

const Rebar = useRebar();

// Initialize XP system for players when they spawn
alt.on('playerConnect', async (player) => {
    // Wait for character to be bound
    setTimeout(async () => {
        await initializeXpSystem(player);
    }, 2000);
});

alt.on('rebar:playerCharacterBound', async (player) => {
    await initializeXpSystem(player);
});

console.log('Families Minigame plugin loaded with XP/Level system');
