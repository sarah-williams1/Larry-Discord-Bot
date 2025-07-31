// index.js

const { Client, Collection, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config(); // Load environment variables from .env

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, // Essential for fetching member info and roles
        GatewayIntentBits.DirectMessages,
    ],
});

// Collection to store commands
client.commands = new Collection();

// Load command files from the 'commands' directory
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

// Data storage for global config and users
let serverData = {
    globalConfig: {
        battalionName: "Leviathan Battalion",
        companyName: "Aegis Company",
         squadNames: {
            "squad-1": "Creepers",
            "squad-2": "Havoc Pandas",
            "Squad-3": "Diesel"
         },
        
        ribbonTypes: {
            "Fleet Campaign": { loyaltyGain: 5, superCreditPayout: 5 },
            "Super Fleet Campaign": { loyaltyGain: 15, superCreditPayout: 15 },
            "Automaton": { loyaltyGain: 200, superCreditPayout: 200 },
            "Illuminate": { loyaltyGain: 200, superCreditPayout: 200 },
            "Terminid": { loyaltyGain: 200, superCreditPayout: 200 },
            "Fleet Cross": { loyaltyGain: 20, superCreditPayout: 20 },
            "Super Fleet Cross": { loyaltyGain: 50, superCreditPayout: 50 },
            "Fleet Achievement": { loyaltyGain: 5, superCreditPayout: 5 },
            "Fleet Commendation": { loyaltyGain: 5, superCreditPayout: 5 },
            "Galactic Recruiter": { loyaltyGain: 3, superCreditPayout: 3 },
            "Galactic Defense": { loyaltyGain: 5, superCreditPayout: 5 },
            "Good Conduct": { loyaltyGain: 5, superCreditPayout: 5 },
            "Recruit Command": { loyaltyGain: 5, superCreditPayout: 5 },
            "Fleet Marksman": { loyaltyGain: 3, superCreditPayout: 3 },
            "Fleet Sharpshooter": { loyaltyGain: 5, superCreditPayout: 5 },
            "Fleet Expert Marksman": { loyaltyGain: 10, superCreditPayout: 10 },
            "Freedom Alliance": { loyaltyGain: 10, superCreditPayout: 10 },
            "Medal of Honor": { loyaltyGain: 50, superCreditPayout: 50 },
            "Super Earth Defense": { loyaltyGain: 15, superCreditPayout: 15 }
        }
    },
    users: {}
};
const DATA_FILE = './data.json';

function loadServerData() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        const loadedData = JSON.parse(data);

        serverData.globalConfig = { ...serverData.globalConfig, ...(loadedData.globalConfig || {}) };
        serverData.users = { ...serverData.users, ...(loadedData.users || {}) };

        console.log('Server data loaded successfully.');
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('data.json not found, creating an empty one with default config.');
            saveServerData();
        } else {
            console.error('Error loading server data:', error);
        }
    }
}

function saveServerData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(serverData, null, 2), 'utf8');
        console.log('Server data saved successfully.');
    } catch (error) {
        console.error('Error saving server data:', error);
    }
}

function getUserData(userId) {
    if (!serverData.users[userId]) {
        serverData.users[userId] = {
            totalSamples: 0,
            freedomLevel: 0,
            superCredits: 0,
            debt: 0,
            loyalty: 100,
            titles: [],
            lastActive: Date.now(),
            ribbons: {}
        };
        saveServerData();
    }
    return serverData.users[userId];
}

function getGlobalConfig() {
    return serverData; // Returns the entire serverData object for access to globalConfig and users
}


client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log('Larry is ready to serve the Supreme Commandfish Guppy!');
    loadServerData();
});

client.on('interactionCreate', async interaction => {
    // Update last active timestamp for the user who interacted
    const userId = interaction.user.id;
    const user = getUserData(userId); // This will create user data if it doesn't exist
    user.lastActive = Date.now();
    saveServerData(); // Save after every interaction to update lastActive

    // Handle Chat Input Commands (Slash Commands)
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction, getUserData, saveServerData, getGlobalConfig);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
            } else {
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        }
        return;
    }

    // Handle Autocomplete Interactions
    if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);

        if (!command || !command.autocomplete) {
            console.error(`No autocomplete handler for command ${interaction.commandName}.`);
            return;
        }

        try {
            await command.autocomplete(interaction, getGlobalConfig);
        } catch (error) {
            console.error(error);
        }
        return;
    }

    // Handle Modal Submit Interactions
    if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('sampleLogModal_')) {
            await interaction.deferReply({ ephemeral: true });

            const newTotalSamples = parseInt(interaction.fields.getTextInputValue('totalSamplesInput'));
            const [modalType, targetUserId] = interaction.customId.split('_');

            const userToUpdate = getUserData(targetUserId);
            const targetDiscordUser = await client.users.fetch(targetUserId).catch(() => null);

            if (!targetDiscordUser) {
                return interaction.editReply('Error: Could not find the Discord user for this sample log.');
            }

            if (isNaN(newTotalSamples) || newTotalSamples < 0) {
                return interaction.editReply('Invalid input: Please enter a non-negative number for total samples.');
            }

            const samplesAddedThisTime = newTotalSamples - userToUpdate.totalSamples;

            if (samplesAddedThisTime <= 0) {
                return interaction.editReply(
                    `The total samples you entered (${newTotalSamples}) is not greater than ${targetDiscordUser.username}'s current logged total (${userToUpdate.totalSamples}).\n` +
                    `Please only log the new *total* amount displayed in game after a mission.`
                );
            }

            userToUpdate.totalSamples = newTotalSamples;
            userToUpdate.freedomLevel += samplesAddedThisTime;
            const superCreditsGain = (samplesAddedThisTime * 0.1);
            userToUpdate.superCredits += Math.floor(superCreditsGain);

            saveServerData();

            await interaction.editReply(
                `Successfully updated ${targetDiscordUser.username}'s total samples to ${userToUpdate.totalSamples}!\n` +
                `Samples added this session: ${samplesAddedThisTime}\n` +
                `${targetDiscordUser.username}'s Freedom Level increased by ${samplesAddedThisTime} to: ${userToUpdate.freedomLevel}\n` +
                `${targetDiscordUser.username} earned ${Math.floor(superCreditsGain)} Super Credits! Total: ${userToUpdate.superCredits}`
            );

            try {
                await interaction.followUp({
                    content: `Helldiver ${targetDiscordUser} has logged **${samplesAddedThisTime}** new samples, bringing their total to **${userToUpdate.totalSamples}**! Glory to Super Earth! (Logged by ${interaction.user.username})`,
                    ephemeral: false
                });
            } catch (error) {
                console.error(`Could not send public follow-up for sample log:`, error);
            }
        } else if (interaction.customId.startsWith('awardModal_')) {
            await interaction.deferReply({ ephemeral: true });

            const [modalType, targetUserId] = interaction.customId.split('_');
            const targetUser = await client.users.fetch(targetUserId).catch(() => null);
            if (!targetUser) {
                return interaction.editReply('Error: Could not find the target user for these awards.');
            }

            const targetUserData = getUserData(targetUser.id);
            const globalConfig = getGlobalConfig(); // This is actually serverData now
            const ribbonTypes = globalConfig.globalConfig.ribbonTypes; // Accessing ribbonTypes correctly

            let replyMessage = `Awarding items to ${targetUser.username}:\n`;
            let publicFollowUpMessages = [];
            let awardsProcessed = 0;

            for (let i = 1; i <= 3; i++) {
                const ribbonName = interaction.fields.getTextInputValue(`ribbonName${i}`);
                const quantityStr = interaction.fields.getTextInputValue(`quantity${i}`);

                if (!ribbonName.trim() && !quantityStr.trim()) {
                    continue;
                }

                const quantity = parseInt(quantityStr);

                if (!ribbonName.trim() || isNaN(quantity) || quantity <= 0) {
                    replyMessage += `\n- Skipped entry ${i}: "${ribbonName}" (Quantity: ${quantityStr || 'empty'}) - Invalid or missing data.`;
                    continue;
                }

                const ribbonType = ribbonTypes[ribbonName];

                if (!ribbonType) {
                    replyMessage += `\n- Skipped entry ${i}: "${ribbonName}" (Quantity: ${quantity}) - Not a recognized award type.`;
                    continue;
                }

                if (!targetUserData.ribbons[ribbonName]) {
                    targetUserData.ribbons[ribbonName] = 0;
                }
                targetUserData.ribbons[ribbonName] += quantity;

                targetUserData.loyalty += (ribbonType.loyaltyGain * quantity);
                if (targetUserData.loyalty > 100) targetUserData.loyalty = 100;

                targetUserData.superCredits += (ribbonType.superCreditPayout * quantity);

                replyMessage += `\n- Awarded ${quantity}x "${ribbonName}"`;
                publicFollowUpMessages.push(`Helldiver ${targetUser} has been awarded ${quantity}x "${ribbonName}"!`);
                awardsProcessed++;
            }

            if (awardsProcessed === 0) {
                return interaction.editReply('No valid awards were entered or processed.');
            }

            saveServerData();

            replyMessage += `\n\n${targetUser.username}'s updated loyalty: ${targetUserData.loyalty}`;
            replyMessage += `\n${targetUser.username}'s updated Super Credits: ${targetUserData.superCredits}`;

            await interaction.editReply(replyMessage);

            if (publicFollowUpMessages.length > 0) {
                const combinedPublicMessage = `**New Awards Incoming!**\n` + publicFollowUpMessages.join('\n') + `\nGlory to Super Earth!`;
                try {
                    await interaction.followUp({ content: combinedPublicMessage, ephemeral: false });
                } catch (error) {
                    console.error(`Could not send public follow-up for awards:`, error);
                }
            }
        }
        return;
    }
});


client.login(process.env.DISCORD_BOT_TOKEN);