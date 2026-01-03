import { useRebar } from '@Server/index.js';
import * as alt from 'alt-server';

const Rebar = useRebar();
const messenger = Rebar.messenger.useMessenger();


messenger.commands.register({
    name: '/heal',
    desc: 'Heal le joueurs.',
    options: { permissions: ['moderator'] },
    async callback(player) {
        player.health = 200;
        messenger.message.send(player, { type: 'info', content: 'Vous avez été soigné.' });
    },
});

messenger.commands.register({
    name: '/revive',
    desc: 'Réanimer le joueur.',
    options: { permissions: ['moderator'] },
    async callback(player) {
        if (player.health === 0) {
            player.spawn(player.pos.x, player.pos.y, player.pos.z, 0);
            messenger.message.send(player, { type: 'info', content: 'Vous avez été réanimé.' });
        } else {
            messenger.message.send(player, { type: 'warning', content: "Vous n'êtes pas mort." });
        }
    },
});

messenger.commands.register({
    name: '/car',
    desc: 'Fait apparaître un véhicule.',
    options: { permissions: ['moderator'] },
    async callback(player, model) {
        if (!model) {
            messenger.message.send(player, { type: 'warning', content: 'Veuillez spécifier un modèle de véhicule.' });
            return;
        }

        const vehicle = new alt.Vehicle(model, player.pos.x, player.pos.y, player.pos.z, 0, 0, 0);
        vehicle.lockState = 1;
        player.setIntoVehicle(vehicle, 1); // Place le joueur au siège conducteur
        messenger.message.send(player, { type: 'info', content: `Véhicule ${model} créé.` });
    },
});

messenger.commands.register({
    name: '/tp',
    desc: 'Téléporte le joueur à une position spécifique.',
    options: { permissions: ['moderator'] },
    async callback(player, x, y, z) {
        const posX = parseFloat(x);
        const posY = parseFloat(y);
        const posZ = parseFloat(z);

        if (isNaN(posX) || isNaN(posY) || isNaN(posZ)) {
            messenger.message.send(player, { type: 'warning', content: 'Veuillez spécifier des coordonnées valides.' });
            return;
        }

        player.pos = new alt.Vector3(posX, posY, posZ);
        messenger.message.send(player, { type: 'info', content: `Téléporté à (${posX}, ${posY}, ${posZ}).` });
    },
});

messenger.commands.register({
    name: '/Coords',
    desc: 'Affiche vos coordonnées actuelles et les copies dans le presse papier.',
    options: { permissions: ['moderator'] },
    async callback(player) {
        const pos = player.pos;
        const rot = player.rot;
        const coordsMessage = `Position: X: ${pos.x.toFixed(2)}, Y: ${pos.y.toFixed(2)}, Z: ${pos.z.toFixed(2)} | Rotation: X: ${rot.x.toFixed(2)}, Y: ${rot.y.toFixed(2)}, Z: ${rot.z.toFixed(2)}`;
        messenger.message.send(player, { type: 'info', content: coordsMessage });
        Rebar.player.useWebview(player).emit('copyToClipboard', coordsMessage);
    },
});

messenger.commands.register({
    name: 'FF15',
    desc: 'Suicide instantané.',
    options: { permissions: ['moderator'] },
    async callback(player) {
        player.health = 0;
        messenger.message.send(player, { type: 'info', content: 'Vous vous êtes suicidé.' });
    },
});

messenger.commands.register({
    name: '/fix',
    desc: 'Répare le véhicule',
    options: { permissions: ['moderator'] },
    async callback(player) {
        if (!player.vehicle) {
            messenger.message.send(player, {
                type: 'warning',
                content: 'Vous devez être dans un véhicule pour utiliser cette commande.',
            });
            return;
        }

        player.vehicle.repair();
        messenger.message.send(player, { type: 'info', content: 'Votre véhicule a été réparé.' });
    },
});