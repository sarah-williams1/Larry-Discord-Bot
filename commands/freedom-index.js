// commands/freedom-index.js (UPDATED for Squad Levels & Contributors)

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('freedom-index')
        .setDescription('Displays the current server-wide and squad-level Freedom Index.'),

    async execute(interaction, getUserData, saveServerData, getGlobalConfig) {
        await interaction.deferReply(); // Reply publicly

        const serverData = getGlobalConfig(); // Returns the entire serverData object
        const allUsersData = serverData.users;

        // --- 1. Calculate Server-Wide Stats ---
        let totalServerFreedomLevel = 0;
        let activeHelldivers = 0;

        // --- 2. Group Users by Squad and Calculate Squad Stats ---
        const squadStats = {
            'squad-1': { totalFreedom: 0, members: [] },
            'squad-2': { totalFreedom: 0, members: [] },
            'squad-3': { totalFreedom: 0, members: [] },
            // Add other static squads here if desired
        };
        const definedSquads = ['squad-1', 'squad-2', 'squad-3']; // Keep track of specific squads we want to report on

        // Populate squadStats and server-wide totals
        for (const userId in allUsersData) {
            if (Object.hasOwnProperty.call(allUsersData, userId)) {
                const user = allUsersData[userId];
                // Only count users who have engaged (or have a freedomLevel)
                if (user.totalSamples > 0 || user.freedomLevel > 0) {
                    totalServerFreedomLevel += user.freedomLevel;
                    activeHelldivers++;

                    // Add to squad stats if assigned and it's one of our defined squads
                    if (user.squadId && definedSquads.includes(user.squadId)) {
                        squadStats[user.squadId].totalFreedom += user.freedomLevel;
                        // Store user ID and their freedom level for contributor tracking
                        squadStats[user.squadId].members.push({
                            id: userId,
                            freedomLevel: user.freedomLevel,
                        });
                    }
                }
            }
        }

        // --- 3. Determine Top/Bottom Contributors for Each Squad ---
        const squadReports = [];
        for (const squadId of definedSquads) {
            const stats = squadStats[squadId];
            let topContributorName = 'N/A';
            let bottomContributorName = 'N/A';

            if (stats.members.length > 0) {
                // Sort members by freedomLevel to find top/bottom
                stats.members.sort((a, b) => b.freedomLevel - a.freedomLevel);

                // Fetch Discord usernames
                const topContributor = stats.members[0];
                const bottomContributor = stats.members[stats.members.length - 1]; // Last element after sorting ascending

                // Fetch Discord User objects for display names
                const topUserDiscord = await interaction.guild.members.fetch(topContributor.id)
                    .then(member => member.user.username)
                    .catch(() => `Unknown User (${topContributor.id})`);
                const bottomUserDiscord = await interaction.guild.members.fetch(bottomContributor.id)
                    .then(member => member.user.username)
                    .catch(() => `Unknown User (${bottomContributor.id})`);

                topContributorName = topUserDiscord;
                bottomContributorName = bottomUserDiscord;

                // Handle single member squad for display
                if (stats.members.length === 1) {
                    bottomContributorName = topContributorName;
                }
            }

            squadReports.push(
                `\n**${squadId.replace('-', ' ').toUpperCase()} Freedom Level**: ${stats.totalFreedom}\n` +
                `  Top contributor   : ${topContributorName}\n` +
                `  Bottom contributor: ${bottomContributorName}`
            );
        }

        // --- 4. Format and Send Final Output ---
        let statusMessage = '';
        if (totalServerFreedomLevel >= 50000) {
            statusMessage = 'SUPER EARTH THRIVES! Managed Democracy is flourishing! Glory!';
        } else if (totalServerFreedomLevel >= 10000) {
            statusMessage = 'Democracy is robust, but eternal vigilance is the price of liberty!';
        } else if (totalServerFreedomLevel >= 1000) {
            statusMessage = 'Democracy needs more defenders! Log more samples!';
        } else if (totalServerFreedomLevel >= 500) {
            statusMessage = 'The seeds of liberty are sown, but much work remains.';
        } else {
            statusMessage = 'The server is yet to experience true Managed Democracy. Spread liberty!';
        }

        const finalReply =
            `**Super Earth Freedom Index Report for ${serverData.globalConfig.battalionName || 'Leviathan Battalion'} / ${serverData.globalConfig.companyName || 'Aegis Company'}:**\n\n` +
            `Current Server Freedom Level: **${totalServerFreedomLevel}**\n` +
            `Active Helldivers Contributing: ${activeHelldivers}\n\n` +
            `${squadReports.join('\n')}\n\n` + // Join all squad reports
            `*${statusMessage}*`;

        await interaction.editReply(finalReply);
    },
};