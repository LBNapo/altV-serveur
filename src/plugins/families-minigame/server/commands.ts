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
    name: '/givexp',
    desc: 'Donne de l\'XP à un joueur (admin).',
    options: { permissions: ['admin'] },
    async callback(player, targetId: string, amount: string) {
        if (!targetId || !amount) {
            messenger.message.send(player, {
                type: 'warning',
                content: 'Usage: /givexp [player_id] [amount]',
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

        const target = Rebar.get.usePlayerGetter().byID(parseInt(targetId));
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
