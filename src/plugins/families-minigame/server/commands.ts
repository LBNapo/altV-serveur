import { useRebar } from '@Server/index.js';
import * as alt from 'alt-server';
import { getXpInfo } from './xpSystem.js';
import { startMinigame, stopMinigame } from './minigame.js';

const Rebar = useRebar();
const messenger = Rebar.messenger.useMessenger();

// Commande pour voir son niveau et XP
messenger.commands.register({
    name: '/level',
    desc: 'Affiche votre niveau et votre expérience.',
    async callback(player) {
        const info = getXpInfo(player);
        
        messenger.message.send(player, {
            type: 'info',
            content: `📊 Level ${info.level} | XP: ${info.xp} | Prochain niveau: ${info.nextLevelXp} XP (${info.progress.toFixed(1)}%)`,
        });
    },
});

// Commande pour démarrer le mini-jeu
messenger.commands.register({
    name: '/families',
    desc: 'Démarre le mini-jeu Families.',
    async callback(player) {
        await startMinigame(player);
    },
});

// Commande pour quitter le mini-jeu
messenger.commands.register({
    name: '/exitfamilies',
    desc: 'Quitte le mini-jeu Families.',
    async callback(player) {
        stopMinigame(player, true);
    },
});

// Commande admin pour donner de l'XP
messenger.commands.register({
    name: '/giveexp',
    desc: 'Donne de l\'XP à un joueur.',
    async callback(player, targetId: string, amount: string) {
        if (!targetId || !amount) {
            messenger.message.send(player, {
                type: 'warning',
                content: 'Usage: /giveexp [player_id] [amount]',
            });
            return;
        }

        const amountNum = parseInt(amount);
        if (isNaN(amountNum)) {
            messenger.message.send(player, {
                type: 'warning',
                content: 'Le montant d\'XP doit être un nombre.',
            });
            return;
        }

        const target = Rebar.get.usePlayerGetter().byAccount(parseInt(targetId));
        if (!target) {
            messenger.message.send(player, {
                type: 'warning',
                content: 'Joueur introuvable.',
            });
            return;
        }

        const { addXp } = await import('./xpSystem.js');
        await addXp(target, amountNum);

        messenger.message.send(player, {
            type: 'info',
            content: `${amountNum} XP donnés à ${target.name}.`,
        });

        messenger.message.send(target, {
            type: 'info',
            content: `Vous avez reçu ${amountNum} XP!`,
        });
    },
});

// Commande admin pour réinitialiser le niveau d'un joueur
messenger.commands.register({
    name: '/clearlevel',
    desc: 'Réinitialise le niveau d\'un joueur à 1.',
    async callback(player, targetId: string) {
        if (!targetId) {
            messenger.message.send(player, {
                type: 'warning',
                content: 'Usage: /clearlevel [player_id]',
            });
            return;
        }

        const target = Rebar.get.usePlayerGetter().byAccount(parseInt(targetId));
        if (!target) {
            messenger.message.send(player, {
                type: 'warning',
                content: 'Joueur introuvable.',
            });
            return;
        }

        const character = Rebar.document.character.useCharacter(target);
        if (!character.isValid()) {
            messenger.message.send(player, {
                type: 'warning',
                content: 'Personnage introuvable.',
            });
            return;
        }

        // Reset XP and level to 1
        await character.set('xp', 0);
        await character.set('level', 1);
        
        // Remove all weapons from player
        target.removeAllWeapons();

        messenger.message.send(player, {
            type: 'info',
            content: `Level de ${target.name} réinitialisé à 1 et armes retirées.`,
        });

        messenger.message.send(target, {
            type: 'warning',
            content: `Votre niveau a été réinitialisé à 1 et vos armes ont été retirées par un administrateur!`,
        });
    },
});
