import * as alt from 'alt-shared';

// Zone du mini-jeu (quartier Families - Forum Drive)
export const MINIGAME_ZONE = {
    center: { x: 120.0, y: -1930.0, z: 21.0 } as alt.IVector3,
    radius: 150, // 150 mètres de rayon
};

// Configuration XP
export const XP_CONFIG = {
    xpPerKill: 10, // XP de base par kill
    xpMultiplierPerWave: 1.2, // Multiplicateur d'XP par vague
    xpLossPerCivilian: 50, // Perte d'XP si kill civil
    xpPerLevel: 100, // XP requis pour le premier level
    xpScalingPerLevel: 1.5, // Scaling de XP requis par level
};

// Configuration des vagues
export const WAVE_CONFIG = {
    enemiesPerWave: 5, // Nombre d'ennemis par vague de base
    enemyScaling: 1.2, // Scaling du nombre d'ennemis
    healthScaling: 1.3, // Scaling de la santé des ennemis
    vehicleWaveInterval: 5, // Spawn véhicule toutes les N vagues
    civilianWaveStart: 5, // Vague où les civils commencent à spawner
};

// Armes débloquées par niveau
export interface WeaponUnlock {
    level: number;
    weaponHash: number;
    weaponName: string;
    ammo: number;
}

export const WEAPON_UNLOCKS: WeaponUnlock[] = [
    { level: 1, weaponHash: 0x99AEEB3B, weaponName: 'weapon_pistol50', ammo: 200 },
    { level: 3, weaponHash: 0x1D073A89, weaponName: 'weapon_pumpshotgun', ammo: 100 },
    { level: 5, weaponHash: 0xBFEFFF6D, weaponName: 'weapon_assaultrifle', ammo: 300 },
    { level: 7, weaponHash: 0x9D07F764, weaponName: 'weapon_heavysniper', ammo: 50 },
    { level: 10, weaponHash: 0xB1CA77B1, weaponName: 'weapon_carbinerifle', ammo: 400 },
];

// Modèles de peds Families
export const FAMILIES_PED_MODELS = [
    'g_m_y_famca_01',
    'g_m_y_famdnf_01',
    'g_m_y_famfor_01',
];

// Modèle de véhicule Families
export const FAMILIES_VEHICLE_MODEL = 'faction';

// Armes des ennemis par vague
export const ENEMY_WEAPONS_BY_WAVE = [
    { maxWave: 2, weapons: [0x1B06D571] }, // pistol
    { maxWave: 5, weapons: [0x1B06D571, 0x5EF9FEC4] }, // pistol, vintage pistol
    { maxWave: 10, weapons: [0x13532244, 0x2BE6766B] }, // micro smg, ap pistol
    { maxWave: 999, weapons: [0xBFEFFF6D, 0x13532244] }, // assault rifle, micro smg
];
