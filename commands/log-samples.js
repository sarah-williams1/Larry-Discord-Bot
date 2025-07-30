// commands/log-samples.js

const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('log-samples')
        .setDescription('Log your total collected samples, or another user\'s if you are authorized.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose samples you are logging (mods/admins only).')
                .setRequired(false)),
    async execute(interaction, getUserData, saveServerData, getGlobalConfig) {
        const targetUserOption = interaction.options.getUser('user');
        const targetUser = targetUserOption || interaction.user;

        // Updated allowed role names
        const allowedRoles = ['Battalion Staff', 'Company Staff'];
        const member = interaction.member;

        if (targetUserOption && targetUser.id !== interaction.user.id) {
            const hasPermission = member.roles.cache.some(role => allowedRoles.includes(role.name));
            const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);

            if (!hasPermission && !isAdmin) {
                return interaction.reply({
                    content: `You do not have the necessary authorization (${allowedRoles.join(', ')} or Administrator) to log samples for other users.`,
                    ephemeral: true
                });
            }
        }

        const modal = new ModalBuilder()
            .setCustomId(`sampleLogModal_${targetUser.id}`)
            .setTitle(`Log Samples for ${targetUser.username}`);

        const totalSamplesInput = new TextInputBuilder()
            .setCustomId('totalSamplesInput')
            .setLabel('Total Samples Collected (from game)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('Enter total quantity (e.g., 50)');

        const firstActionRow = new ActionRowBuilder().addComponents(totalSamplesInput);
        modal.addComponents(firstActionRow);

        await interaction.showModal(modal);
    },
};