const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('freedom-index')
        .setDescription('Displays the current server-wide and squad-level Freedom Index.'),

    async execute(interaction, getUserData, saveServerData, getGlobalConfig) {
        await interaction.deferReply(); // Reply publicly

        const serverData = getGlobalConfig(); // Returns the entire serverData object
        const allUsersData = serverData.users;
        const squadNames = serverData.globalConfig.squadNames; // Access the hardcoded names

        let totalServerFreedomLevel = 0;
        let activeHelldivers = 0;

        const squadStats = {}; // Initialize dynamically
        // Initialize squadStats for all defined squads (from globalConfig)
        for (const id in squadNames) {
            squadStats[id] = { totalFreedom: 0, members: [] };
        }
        // Also add an 'Unassigned' category for reporting
        squadStats['unassigned'] = { totalFreedom: 0, members: [] };


        for (const userId in allUsersData) {
            if (Object.hasOwnProperty.call(allUsersData, userId)) {
                const user = allUsersData[userId];
                if (user.totalSamples > 0 || user.freedomLevel > 0) {
                    totalServerFreedomLevel += user.freedomLevel;
                    activeHelldivers++;

                    // Determine which squad to add the user to based on their squadId
                    const userSquadId = user.squadId && squadNames[user.squadId] ? user.squadId : 'unassigned';
                    squadStats[userSquadId].totalFreedom += user.freedomLevel;
                    squadStats[userSquadId].members.push({
                        id: userId,
                        freedomLevel: user.freedomLevel,
                    });
                }
            }
        }

        const squadReports = [];
        // Iterate through all squads including 'unassigned' to generate reports
        const allSquadIds = [...Object.keys(squadNames), 'unassigned'];

        for (const squadId of allSquadIds) {
            const stats = squadStats[squadId];
            // Get the display name, fallback to ID if not found, or 'Unassigned'
            const displaySquadName = squadNames[squadId] || (squadId === 'unassigned' ? 'Unassigned' : squadId.replace('-', ' ').toUpperCase());

            let topContributorName = 'N/A';
            let bottomContributorName = 'N/A';

            if (stats.members.length > 0) {
                stats.members.sort((a, b) => b.freedomLevel - a.freedomLevel); // Descending for top

                const topContributor = stats.members[0];
                const bottomContributor = stats.members[stats.members.length - 1]; // Last element after sorting

                // Fetch Discord User objects for display names
                const topUserDiscord = await interaction.guild.members.fetch(topContributor.id)
                    .then(member => member.user.username)
                    .catch(() => `Unknown User (${topContributor.id})`);
                const bottomUserDiscord = await interaction.guild.members.fetch(bottomContributor.id)
                    .then(member => member.user.username)
                    .catch(() => `Unknown User (${bottomContributor.id})`);

                topContributorName = topUserDiscord;
                bottomContributorName = bottomUserDiscord;

                if (stats.members.length === 1) {
                    bottomContributorName = topContributorName; // If only one member, they are both top and bottom
                }
            }

            squadReports.push(
                `\n**${displaySquadName} Freedom Level**: ${stats.totalFreedom}\n` +
                `  Top contributor   : ${topContributorName}\n` +
                `  Bottom contributor: ${bottomContributorName}`
            );
        }

        let statusMessage = '';
        if (totalServerFreedomLevel >= 50000) {
            statusMessage = 'SUPER EARTH THRIVES! Managed Democracy is flourishing! Glory!';
        } else if (totalServerFreedomLevel >= 10000) {
            statusMessage = 'Democracy is robust, but eternal vigilance is the price of liberty!';
        } else if (totalServerFreedomLevel >= 1000) {
            statusMessage = 'Democracy needs more defenders! Log more samples!';
        } else if (totalServerFreedomLevel > 0) {
            statusMessage = 'The seeds of liberty are sown, but much work remains.';
        } else {
            statusMessage = 'The server is yet to experience true Managed Democracy. Spread liberty!';
        }

        const finalReply =
            `**Super Earth Freedom Index Report for ${serverData.globalConfig.battalionName || 'Leviathan Battalion'} / ${serverData.globalConfig.companyName || 'Aegis Company'}:**\n\n` +
            `Current Server Freedom Level: **${totalServerFreedomLevel}**\n` +
            `Active Helldivers Contributing: ${activeHelldivers}\n\n` +
            `${squadReports.join('\n')}\n\n` +
            `*${statusMessage}*`;

        await interaction.editReply(finalReply);
    },
};