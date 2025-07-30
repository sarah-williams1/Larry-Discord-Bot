// commands/awards.js (Updated for Multiple Direct Award Inputs)

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('awards')
        .setDescription('Awards multiple specific ribbons or commendations to a user.')
        .addUserOption(option => // Keep the target user as a direct option
            option.setName('target')
                .setDescription('The user to award items to.')
                .setRequired(true))
        // Add multiple award/quantity pairs
        .addStringOption(option =>
            option.setName('award1_name')
                .setDescription('Name of the 1st award to grant.')
                .setRequired(false)
                .setAutocomplete(true))
        .addIntegerOption(option =>
            option.setName('award1_quantity')
                .setDescription('Quantity for the 1st award (default 1).')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('award2_name')
                .setDescription('Name of the 2nd award to grant.')
                .setRequired(false)
                .setAutocomplete(true))
        .addIntegerOption(option =>
            option.setName('award2_quantity')
                .setDescription('Quantity for the 2nd award (default 1).')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('award3_name')
                .setDescription('Name of the 3rd award to grant.')
                .setRequired(false)
                .setAutocomplete(true))
        .addIntegerOption(option =>
            option.setName('award3_quantity')
                .setDescription('Quantity for the 3rd award (default 1).')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('award4_name')
                .setDescription('Name of the 4th award to grant.')
                .setRequired(false)
                .setAutocomplete(true))
        .addIntegerOption(option =>
            option.setName('award4_quantity')
                .setDescription('Quantity for the 4th award (default 1).')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('award5_name')
                .setDescription('Name of the 5th award to grant.')
                .setRequired(false)
                .setAutocomplete(true))
        .addIntegerOption(option =>
            option.setName('award5_quantity')
                .setDescription('Quantity for the 5th award (default 1).')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),

    async execute(interaction, getUserData, saveServerData, getGlobalConfig) {
        // Permissions check remains the same
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

        await interaction.deferReply({ ephemeral: true });

        const targetUser = interaction.options.getUser('target');
        const targetUserData = getUserData(targetUser.id);
        const globalConfig = getGlobalConfig(); // This is actually serverData
        const ribbonTypes = globalConfig.globalConfig.ribbonTypes; // Accessing ribbonTypes correctly

        let replyMessage = `Processing awards for ${targetUser.username}:\n`;
        let publicFollowUpMessages = [];
        let awardsProcessedCount = 0; // Track how many valid awards were processed

        // Loop through the possible award pairs (up to 5 in this setup)
        for (let i = 1; i <= 5; i++) {
            const awardName = interaction.options.getString(`award${i}_name`);
            const awardQuantity = interaction.options.getInteger(`award${i}_quantity`);

            // If no award name is provided for this pair, skip it
            if (!awardName) {
                continue;
            }

            // Default quantity to 1 if not provided, or use the provided quantity
            const quantity = awardQuantity !== null ? awardQuantity : 1;

            // Basic validation
            if (quantity <= 0) {
                replyMessage += `\n- Skipped: "${awardName}" - Quantity must be a positive number (received ${quantity}).`;
                continue;
            }

            const ribbonType = ribbonTypes[awardName];

            if (!ribbonType) {
                replyMessage += `\n- Skipped: "${awardName}" - Not a recognized award type.`;
                continue;
            }

            // Apply award logic
            if (!targetUserData.ribbons[awardName]) {
                targetUserData.ribbons[awardName] = 0;
            }
            targetUserData.ribbons[awardName] += quantity;

            targetUserData.loyalty += (ribbonType.loyaltyGain * quantity);
            if (targetUserData.loyalty > 100) targetUserData.loyalty = 100; // Cap loyalty

            targetUserData.superCredits += (ribbonType.superCreditPayout * quantity);

            replyMessage += `\n- Awarded ${quantity}x "${awardName}"`;
            publicFollowUpMessages.push(`Helldiver ${targetUser} has been awarded ${quantity}x "${awardName}"!`);
            awardsProcessedCount++;
        }

        if (awardsProcessedCount === 0) {
            return interaction.editReply('No valid awards were entered or processed for this command.');
        }

        saveServerData(); // Save all changes after processing all valid awards

        replyMessage += `\n\n${targetUser.username}'s updated loyalty: ${targetUserData.loyalty}`;
        replyMessage += `\n${targetUser.username}'s updated Super Credits: ${targetUserData.superCredits}`;

        await interaction.editReply(replyMessage);

        // Send combined public follow-up messages
        if (publicFollowUpMessages.length > 0) {
            const combinedPublicMessage = `**New Awards Incoming!**\n` + publicFollowUpMessages.join('\n') + `\nGlory to Super Earth!`;
            try {
                await interaction.followUp({ content: combinedPublicMessage, ephemeral: false });
            } catch (error) {
                console.error(`Could not send public follow-up for awards:`, error);
            }
        }
    },

    // The autocomplete method is still needed because each award_name option is setAutocomplete(true)
    async autocomplete(interaction, getGlobalConfig) {
        const focusedOption = interaction.options.getFocused(true); // Get the focused option (e.g., award1_name)
        const globalConfig = getGlobalConfig();
        const ribbonNames = Object.keys(globalConfig.globalConfig.ribbonTypes); // Accessing ribbonTypes correctly

        if (focusedOption.name.startsWith('award') && focusedOption.name.endsWith('_name')) {
            const filtered = ribbonNames.filter(choice =>
                choice.toLowerCase().startsWith(focusedOption.value.toLowerCase())
            );

            await interaction.respond(
                filtered.map(choice => ({ name: choice, value: choice })).slice(0, 25),
            );
        }
    },
};