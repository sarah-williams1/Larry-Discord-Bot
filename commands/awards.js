// commands/awards.js

const { SlashCommandBuilder, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('awards')
        .setDescription('Awards multiple ribbons or other commendations to a user.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to award items to.')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),

    async execute(interaction, getUserData, saveServerData, getGlobalConfig) {
        // Updated allowed role names
        const allowedRoles = ['Battalion Staff', 'Company Staff'];
        const member = interaction.member;
        const hasPermission = member.roles.cache.some(role => allowedRoles.includes(role.name));
        const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);

        if (!hasPermission && !isAdmin) {
            return interaction.reply({
                content: `You do not have the necessary authorization (${allowedRoles.join(', ')} or Administrator) to use this command.`,
                ephemeral: true
            });
        }

        const targetUser = interaction.options.getUser('target');

        const modal = new ModalBuilder()
            .setCustomId(`awardModal_${targetUser.id}`)
            .setTitle(`Award Ribbons to ${targetUser.username}`);

        for (let i = 1; i <= 3; i++) {
            const ribbonNameInput = new TextInputBuilder()
                .setCustomId(`ribbonName${i}`)
                .setLabel(`Ribbon ${i} Name (Optional)`)
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setPlaceholder('e.g., Fleet Campaign');

            const quantityInput = new TextInputBuilder()
                .setCustomId(`quantity${i}`)
                .setLabel(`Quantity ${i} (Optional)`)
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setPlaceholder('e.g., 1');

            modal.addComponents(
                new ActionRowBuilder().addComponents(ribbonNameInput),
                new ActionRowBuilder().addComponents(quantityInput)
            );
        }

        await interaction.showModal(modal);
    },
};