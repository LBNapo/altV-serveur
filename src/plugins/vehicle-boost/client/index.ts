import * as alt from 'alt-client';
import * as native from 'natives';
import { VehicleBoostEvents } from '../shared/events.js';

const DRIVER_SEAT = 0;
const BOOST_INTERVAL_MS = 50; // 50ms = 20 updates per second
const BOOST_DURATION_MS = 30000; // 30 seconds

let boostActive = false;
let boostInterval: number | undefined;
let boostedVehicle: alt.Vehicle | undefined;

// Fonction pour appliquer le boost au véhicule
function applyVehicleBoost() {
    const player = alt.Player.local;
    const vehicle = player.vehicle;

    if (!vehicle || player.seat !== DRIVER_SEAT) {
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
            1, // Force type (1 = impulse force)
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
            false, // scaleByMass
            true // triggerAudio
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

    const player = alt.Player.local;
    const vehicle = player.vehicle;

    if (!vehicle) {
        return;
    }

    boostActive = true;
    boostedVehicle = vehicle;

    // Créer un intervalle pour appliquer le boost en continu
    boostInterval = alt.setInterval(() => {
        applyVehicleBoost();
    }, BOOST_INTERVAL_MS);

    // Arrêter le boost après la durée définie
    alt.setTimeout(() => {
        stopBoost();
    }, BOOST_DURATION_MS);
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

    // Réinitialiser le multiplicateur de puissance sur le véhicule stocké
    if (boostedVehicle && boostedVehicle.valid) {
        native.setVehicleCheatPowerIncrease(boostedVehicle.scriptID, 1.0);
    }

    boostedVehicle = undefined;
}

// Événement pour activer le boost
alt.onServer(VehicleBoostEvents.toClient.applyBoost, () => {
    startBoost();
});

// Arrêter le boost si le joueur sort du véhicule
alt.on('leftVehicle', (vehicle: alt.Vehicle, seat: number) => {
    if (seat === DRIVER_SEAT) {
        stopBoost();
    }
});
