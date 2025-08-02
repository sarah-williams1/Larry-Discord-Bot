// commands/assign-squad.js

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('assign-squad')
        .setDescription('Assigns a Helldiver to a specific squad (Moderator/Admin only).')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The Helldiver to assign to a squad.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('squad_id')
                .setDescription('The ID of the squad (e.g., squad-1, squad-2).')
                .setRequired(true)
                .addChoices( // Pre-defined choices for ease of use
                    { name: 'Squad 1: Creepers', value: 'squad-1' },
                    { name: 'Squad 2: Havoc Pandas', value: 'squad-2' },
                    { name: 'Squad 3: Diesel', value: 'squad-3' },
                    { name: 'Command Staff', value: 'staff' } // Option to unassign
                ))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild), // Only members with Manage Guild permission

    async execute(interaction, getUserData, saveServerData, getGlobalConfig) {
        // Permission check for allowed roles
        const allowedRoles = ['Battalion Staff', 'Company Staff'];
        const member = interaction.member;
        const hasPermission = member.roles.cache.some(role => allowedRoles.includes(role.name));
        const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);

        if (!hasPermission && !isAdmin) {
            return interaction.reply({
                content: `You do not have the necessary authorization (${allowedRoles.join(', ')} or Administrator) to assign squads.`,
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const targetUser = interaction.options.getUser('target');
        const squadId = interaction.options.getString('squad_id').trim();

        if (!squadId) { // Should not happen with .setRequired(true) and .addChoices, but good for safety
            return interaction.editReply('Error: Squad name cannot be empty.');
        }

        const targetUserData = getUserData(targetUser.id);
        targetUserData.squadId = (squadId === 'unassigned' ? null : squadId); // Set to null if 'unassigned'

        saveServerData(); // Save the updated user data

        await interaction.editReply(
            `Successfully assigned ${targetUser.username} to ${squadId === 'unassigned' ? 'unassigned' : `Squad: ${squadId}`}.\n` +
            `Current Squad: ${targetUserData.squadId || 'Unassigned'}`
        );

        // Optional: public notification
        try {
            await interaction.followUp({
                content: `Helldiver ${targetUser}! You have been assigned to **${targetUserData.squadId || 'Unassigned'}**!`,
                ephemeral: false
            });
        } catch (error) {
                console.error(`Could not send public follow-up for squad assignment:`, error);
        }
    },
};