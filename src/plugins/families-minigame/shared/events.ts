export const FamiliesMinigameEvents = {
    toClient: {
        startMinigame: 'families:start-minigame',
        stopMinigame: 'families:stop-minigame',
        spawnWave: 'families:spawn-wave',
        updateStats: 'families:update-stats',
        showMessage: 'families:show-message',
        respawn: 'families:respawn',
        reAggroEnemy: 'families:re-aggro-enemy',
    },
    toServer: {
        requestStart: 'families:request-start',
        requestExit: 'families:request-exit',
        enemyKilled: 'families:enemy-killed',
        civilianKilled: 'families:civilian-killed',
        playerDied: 'families:player-died',
        playerRespawned: 'families:player-respawned',
    },
};
