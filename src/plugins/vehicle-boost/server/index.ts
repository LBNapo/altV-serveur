import { useRebar } from '@Server/index.js';
import * as alt from 'alt-server';
import { VehicleBoostEvents } from '../shared/events.js';

const DRIVER_SEAT = 0;

const Rebar = useRebar();
const messenger = Rebar.messenger.useMessenger();

messenger.commands.register({
    name: '/boost',
    desc: 'Booste temporairement votre véhicule.',
    options: { permissions: ['moderator'] },
    async callback(player) {
        // Vérifier si le joueur est dans un véhicule
        if (!player.vehicle) {
            messenger.message.send(player, {
                type: 'warning',
                content: 'Vous devez être dans un véhicule pour utiliser cette commande.',
            });
            return;
        }

        // Vérifier si le joueur est le conducteur
        if (player.seat !== DRIVER_SEAT) {
            messenger.message.send(player, {
                type: 'warning',
                content: 'Vous devez être au volant pour utiliser cette commande.',
            });
            return;
        }

        // Envoyer l'événement au client pour appliquer le boost
        alt.emitClient(player, VehicleBoostEvents.toClient.applyBoost);
        
        messenger.message.send(player, { 
            type: 'info', 
            content: 'Boost activé ! Maintenez Shift pour utiliser le boost.' 
        });
    },
});
