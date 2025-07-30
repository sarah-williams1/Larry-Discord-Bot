// commands/view-stats.js

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('view-stats')
        .setDescription('Displays your Helldiver statistics, or another user\'s stats.')
        .addUserOption(option => // Optional user option
            option.setName('user')
                .setDescription('The user whose stats you want to view (defaults to yourself).')
                .setRequired(false)),

    async execute(interaction, getUserData, saveServerData, getGlobalConfig) {
        await interaction.deferReply({ ephemeral: true });

        const targetUser = interaction.options.getUser('user') || interaction.user;
        const targetUserData = getUserData(targetUser.id);

        let ribbonString = 'None yet';
        const earnedRibbons = Object.entries(targetUserData.ribbons);
        if (earnedRibbons.length > 0) {
            ribbonString = earnedRibbons.map(([name, quantity]) => `${name} (${quantity}x)`).join(',\n');
        }

        const isOwnStats = targetUser.id === interaction.user.id;
        const title = isOwnStats ? `**Your Helldiver Stats:**` : `**${targetUser.username}'s Helldiver Stats:**`;

        await interaction.editReply(
            `${title}\n` +
            `Total Samples Logged: ${targetUserData.totalSamples}\n` +
            `Current Freedom Level: ${targetUserData.freedomLevel}\n` +
            `Super Credits: ${targetUserData.superCredits}\n` +
            `Debt: ${targetUserData.debt}\n` +
            `Loyalty: ${targetUserData.loyalty}\n` +
            `Titles: ${targetUserData.titles.length > 0 ? targetUserData.titles.join(', ') : 'None yet'}\n` +
            `**Ribbons Earned:**\n${ribbonString}`
        );
    },
};