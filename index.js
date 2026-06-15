require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const fs = require("fs");

// ================= CLIENT =================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

// ================= IDS =================

const OWNER_ID = "1003708560728920165";
const LOG_CHANNEL_ID = "1512629605830496257";
const MEMBER_ROLE = "1506370448814899280";

const ROLES = {
  caylak: "1515752720433152050",
  aktif: "1515752883600232538",
  sadik: "1515753054912118796",
  daimi: "1515770549870264330",
  special: "1515779632761143540"
};

const SENOR_ROLE = "1515780264779841689";

// ================= DATA =================

function load(file, def) {
  return fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file))
    : def;
}

function save(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

let xp = load("./data/xp.json", {});
let money = load("./data/money.json", {});
let inventory = load("./data/inventory.json", {});
let cooldown = {};
let curse = {};
let boostActive = {};

// ================= ROLE SYSTEM =================

async function updateRoles(member, xpValue) {

  const roles = Object.values(ROLES)
    .map(id => member.guild.roles.cache.get(id))
    .filter(Boolean);

  await member.roles.remove(roles).catch(()=>{});

  if (xpValue >= 50000) {

    await member.roles.add(ROLES.special).catch(()=>{});

    // 🔥 PRESTIGE RESET
    xp[member.id] = 0;
    money[member.id] = 0;

    save("./data/xp.json", xp);
    save("./data/money.json", money);

    return;
  }

  if (xpValue >= 25000) return member.roles.add(ROLES.daimi).catch(()=>{});
  if (xpValue >= 14000) return member.roles.add(ROLES.sadik).catch(()=>{});
  if (xpValue >= 6500) return member.roles.add(ROLES.aktif).catch(()=>{});
  if (xpValue >= 1000) return member.roles.add(ROLES.caylak).catch(()=>{});
}

// ================= WELCOME =================

client.on("guildMemberAdd", (member) => {

  member.roles.add(MEMBER_ROLE).catch(()=>{});

  const channel =
    member.guild.systemChannel ||
    member.guild.channels.cache.get(LOG_CHANNEL_ID);

  if (!channel) return;

  channel.send(`👋 Hoşgeldin <@${member.id}>!`);
});

// ================= PANEL =================

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  const id = message.author.id;
  const now = Date.now();
  const txt = message.content.toLowerCase();
  const args = message.content.split(/\s+/);

  if (!xp[id]) xp[id] = 0;
  if (!money[id]) money[id] = 0;
  if (!inventory[id]) inventory[id] = [];
  if (!cooldown[id]) cooldown[id] = 0;
  if (!curse[id]) curse[id] = 0;

  // ================= PANEL =================

  if (message.content === "!panel") {

    const row = new ActionRowBuilder().addComponents(

      new ButtonBuilder()
        .setCustomId("xpal")
        .setLabel("💰 PARA → XP")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("xptopara")
        .setLabel("⭐ XP → PARA")
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId("rank")
        .setLabel("👑 RANK")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("leaderboard")
        .setLabel("🏆 TOP 10")
        .setStyle(ButtonStyle.Secondary)

    );

    return message.channel.send({
      content: "🎛️ PANEL",
      components: [row]
    });
  }

  // ================= ECONOMY =================

  if (now - cooldown[id] >= 120000) {

    let xpGain = Math.floor(Math.random() * 21) + 10;
    let moneyGain = Math.floor(Math.random() * 901) + 100;

    if (message.member.roles.cache.has(SENOR_ROLE)) {
      xpGain = Math.floor(xpGain * 1.3);
      moneyGain = Math.floor(moneyGain * 1.3);
    }

    if (message.member.roles.cache.has(ROLES.special)) {
      xpGain = Math.floor(xpGain * 1.6);
      moneyGain = Math.floor(moneyGain * 1.6);
    }

    if (boostActive[id] && boostActive[id] > Date.now()) {
      xpGain *= 2;
      moneyGain *= 2;
    }

    xp[id] += xpGain;
    money[id] += moneyGain;

    cooldown[id] = now;

    save("./data/xp.json", xp);
    save("./data/money.json", money);

    updateRoles(message.member, xp[id]);
  }

  // ================= COMMANDS =================

  if (message.content === "!xp")
    return message.reply(`⭐ XP: ${xp[id]}`);

  if (message.content === "!param")
    return message.reply(`💰 Para: ${money[id]}`);

  // ================= XP → PARA =================

  if (message.content === "!xpal") {

    const gain = Math.floor(money[id] / 50);

    xp[id] += gain;
    money[id] -= gain * 50;

    save("./data/xp.json", xp);
    save("./data/money.json", money);

    return message.reply(`🔄 ${gain} XP`);
  }

  // ================= SHOP =================

  if (message.content === "!shop") {
    return message.channel.send("🛒 premium_pass 15000 | boost 10000 | king 25000");
  }

  if (message.content.startsWith("!satinal")) {

    const item = args[1];
    if (!inventory[id]) inventory[id] = [];

    const items = {
      premium_pass: 15000,
      boost: 10000,
      king: 25000
    };

    if (!items[item]) return;
    if (money[id] < items[item]) return;

    money[id] -= items[item];
    inventory[id].push(item);

    save("./data/money.json", money);
    save("./data/inventory.json", inventory);

    return message.reply("✅ alındı");
  }

  if (message.content === "!envanter") {
    return message.reply(inventory[id].join(", ") || "boş");
  }

});

// ================= BUTTONS =================

client.on("interactionCreate", async (i) => {

  if (!i.isButton()) return;

  const id = i.user.id;

  if (!xp[id]) xp[id] = 0;
  if (!money[id]) money[id] = 0;

  // 💰 PARA → XP
  if (i.customId === "xpal") {

    const gain = Math.floor(money[id] / 50);

    xp[id] += gain;
    money[id] -= gain * 50;

    save("./data/xp.json", xp);
    save("./data/money.json", money);

    return i.reply({ content: `🔄 ${gain} XP`, ephemeral: true });
  }

  // ⭐ XP → PARA
  if (i.customId === "xptopara") {

    const gain = Math.floor(xp[id] / 10);

    money[id] += gain;
    xp[id] -= gain * 10;

    save("./data/xp.json", xp);
    save("./data/money.json", money);

    return i.reply({ content: `💰 ${gain} para`, ephemeral: true });
  }

  // 👑 RANK
  if (i.customId === "rank") {

    let rank = "Çaylak";

    if (xp[id] >= 50000) rank = "🌟 Special";
    else if (xp[id] >= 25000) rank = "👑 Daimi";
    else if (xp[id] >= 14000) rank = "💎 Sadık";
    else if (xp[id] >= 6500) rank = "⚡ Aktif";

    return i.reply({
      content: `👑 ${rank}\n⭐ ${xp[id]}\n💰 ${money[id]}`,
      ephemeral: true
    });
  }

  // 🏆 LEADERBOARD
  if (i.customId === "leaderboard") {

    const topXP = Object.entries(xp)
      .sort((a,b) => b[1]-a[1])
      .slice(0,10)
      .map((u,i)=>`#${i+1} <@${u[0]}> ⭐ ${u[1]}`)
      .join("\n");

    const topMoney = Object.entries(money)
      .sort((a,b) => b[1]-a[1])
      .slice(0,10)
      .map((u,i)=>`#${i+1} <@${u[0]}> 💰 ${u[1]}`)
      .join("\n");

    return i.reply({
      content: `🏆 TOP 10

⭐ XP:
${topXP || "boş"}

💰 PARA:
${topMoney || "boş"}`,
      ephemeral: true
    });
  }

});

// ================= LOGIN =================

client.login(process.env.TOKEN);
