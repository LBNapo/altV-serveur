import * as alt from 'alt-client';
import * as native from 'natives';
import { VehicleBoostEvents } from '../shared/events.js';

let boostActive = false;
let boostInterval: number | undefined;

// Fonction pour appliquer le boost au véhicule
function applyVehicleBoost() {
    const player = alt.Player.local;
    const vehicle = player.vehicle;

    if (!vehicle || player.seat !== 1) {
        stopBoost();
        return;
    }

    // Vérifier si le joueur appuie sur Shift
    const isShiftPressed = native.isControlPressed(0, 21); // 21 = Sprint/Shift

    if (isShiftPressed) {
        // Appliquer une force vers l'avant
        const forwardVector = native.getEntityForwardVector(vehicle.scriptID);
        const boostForce = 8.0; // Force du boost

        native.applyForceToEntity(
            vehicle.scriptID,
            1, // Force type (1 = relative force)
            forwardVector.x * boostForce,
            forwardVector.y * boostForce,
            0.0,
            0.0,
            0.0,
            0.0,
            0, // Bone index
            true, // isDirectionRel
            true, // ignoreUpVec
            true, // isForceRel
            false, // p12
            true // p13
        );

        // Effet visuel: légère augmentation du RPM
        native.setVehicleCheatPowerIncrease(vehicle.scriptID, 1.5);
    } else {
        // Réinitialiser le multiplicateur de puissance
        native.setVehicleCheatPowerIncrease(vehicle.scriptID, 1.0);
    }
}

// Démarrer le boost
function startBoost() {
    if (boostActive) {
        return;
    }

    boostActive = true;

    // Créer un intervalle pour appliquer le boost en continu
    boostInterval = alt.setInterval(() => {
        applyVehicleBoost();
    }, 10); // Toutes les 10ms pour une application fluide

    // Arrêter le boost après 30 secondes
    alt.setTimeout(() => {
        stopBoost();
    }, 30000);
}

// Arrêter le boost
function stopBoost() {
    if (!boostActive) {
        return;
    }

    boostActive = false;

    if (boostInterval !== undefined) {
        alt.clearInterval(boostInterval);
        boostInterval = undefined;
    }

    // Réinitialiser le multiplicateur de puissance
    const player = alt.Player.local;
    const vehicle = player.vehicle;
    if (vehicle) {
        native.setVehicleCheatPowerIncrease(vehicle.scriptID, 1.0);
    }
}

// Événement pour activer le boost
alt.onServer(VehicleBoostEvents.toClient.applyBoost, () => {
    startBoost();
});

// Arrêter le boost si le joueur sort du véhicule
alt.on('enteredVehicle', (vehicle: alt.Vehicle, seat: number) => {
    // Ne rien faire lors de l'entrée
});

alt.on('leftVehicle', (vehicle: alt.Vehicle, seat: number) => {
    if (seat === 1) {
        stopBoost();
    }
});
