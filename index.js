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
const SENOR_ROLE = "1515780264779841689";

const ROLES = {
  caylak: "1515752720433152050",
  aktif: "1515752883600232538",
  sadik: "1515753054912118796",
  daimi: "1515770549870264330",
  special: "1515779632761143540"
};

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
let boostActive = {};
let giveaways = {};
let curse = {};

// ================= BAD WORD SYSTEM =================

const BAD_WORDS = [
  "amk","oç","aq","amq","siktir","sik","sikeyim","sikik",
  "orospu","piç","pezevenk","gavat","ibne","yarrak",
  "mal","salak","gerizekalı","aptal",
  "fuck","shit","bitch","ass","dick","wtf","cunt"
];

// ================= ROLE SYSTEM =================

async function updateRoles(member, xpValue) {

  const roles = Object.values(ROLES)
    .map(id => member.guild.roles.cache.get(id))
    .filter(Boolean);

  await member.roles.remove(roles).catch(()=>{});

  if (xpValue >= 50000) {

    await member.roles.add(ROLES.special).catch(()=>{});

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

  const ch = member.guild.channels.cache.get(LOG_CHANNEL_ID);
  if (ch) ch.send(`👋 Hoşgeldin <@${member.id}>`);
});

// ================= MESSAGE =================

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  const id = message.author.id;
  const now = Date.now();
  const txt = message.content.toLowerCase();

  if (!xp[id]) xp[id] = 0;
  if (!money[id]) money[id] = 0;
  if (!inventory[id]) inventory[id] = [];
  if (!cooldown[id]) cooldown[id] = 0;
  if (!curse[id]) curse[id] = 0;

  // ================= KÜFÜR =================
  const clean = txt
    .replace(/0/g,"o")
    .replace(/1/g,"i")
    .replace(/3/g,"e")
    .replace(/@/g,"a")
    .replace(/\$/g,"s");

  if (BAD_WORDS.some(w => clean.includes(w))) {

    await message.delete().catch(()=>{});

    curse[id]++;

    if (curse[id] >= 3) {

      curse[id] = 0;

      if (message.member?.moderatable)
        message.member.timeout(5 * 60 * 1000);

      return message.channel.send("⚠️ 3 küfür → 5 dk mute");
    }

    return message.channel.send(`⚠️ Küfür sayısı: ${curse[id]}/3`);
  }

  // ================= PANEL / SHOP =================

  if (message.content === "!shop") {

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("buy_xp").setLabel("💰 PARA→XP").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("buy_money").setLabel("⭐ XP→PARA").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("shop_info").setLabel("ℹ️ BİLGİ").setStyle(ButtonStyle.Primary)
    );

    return message.channel.send({ content: "🛒 SHOP", components: [row] });
  }

  // ================= XP / PARA =================

  if (now - cooldown[id] >= 120000) {

    let xpGain = Math.floor(Math.random() * 21) + 10;
    let moneyGain = Math.floor(Math.random() * 901) + 100;

    if (message.member.roles.cache.has(SENOR_ROLE)) {
      xpGain *= 1.3;
      moneyGain *= 1.3;
    }

    if (message.member.roles.cache.has(ROLES.special)) {
      xpGain *= 1.6;
      moneyGain *= 1.6;
    }

    if (boostActive[id] && boostActive[id] > Date.now()) {
      xpGain *= 2;
      moneyGain *= 2;
    }

    xp[id] += Math.floor(xpGain);
    money[id] += Math.floor(moneyGain);

    cooldown[id] = now;

    save("./data/xp.json", xp);
    save("./data/money.json", money);

    updateRoles(message.member, xp[id]);
  }

  // ================= OWNER =================

  if (message.content.startsWith("!xpver")) {

    if (message.author.id !== OWNER_ID) return;

    const user = message.mentions.members.first();
    const amount = Number(message.content.split(" ")[2]);

    if (!user || !amount) return;

    xp[user.id] = (xp[user.id] || 0) + amount;

    save("./data/xp.json", xp);

    updateRoles(user, xp[user.id]);

    return message.reply(`⭐ XP verildi`);
  }

  if (message.content.startsWith("!paraver")) {

    if (message.author.id !== OWNER_ID) return;

    const user = message.mentions.members.first();
    const amount = Number(message.content.split(" ")[2]);

    if (!user || !amount) return;

    money[user.id] = (money[user.id] || 0) + amount;

    save("./data/money.json", money);

    return message.reply(`💰 Para verildi`);
  }

  if (message.content === "!xp")
    return message.reply(`⭐ ${xp[id]}`);

  if (message.content === "!param")
    return message.reply(`💰 ${money[id]}`);
});

// ================= BUTTONS =================

client.on("interactionCreate", async (i) => {

  if (!i.isButton()) return;

  const id = i.user.id;

  if (!xp[id]) xp[id] = 0;
  if (!money[id]) money[id] = 0;

  if (i.customId === "buy_xp") {

    const gain = Math.floor(money[id] / 50);

    xp[id] += gain;
    money[id] -= gain * 50;

    save("./data/xp.json", xp);
    save("./data/money.json", money);

    return i.reply({ content: `💰 ${gain} XP`, ephemeral: true });
  }

  if (i.customId === "buy_money") {

    const gain = Math.floor(xp[id] / 10);

    money[id] += gain;
    xp[id] -= gain * 10;

    save("./data/xp.json", xp);
    save("./data/money.json", money);

    return i.reply({ content: `⭐ ${gain} para`, ephemeral: true });
  }

  if (i.customId === "shop_info") {
    return i.reply({
      content: "💰 50 para = 1 XP | ⭐ 10 XP = 1 para",
      ephemeral: true
    });
  }
});

// ================= LOGIN =================

client.login(process.env.TOKEN);
