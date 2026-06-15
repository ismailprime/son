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

// ================= ROLES =================

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
let cooldown = {};
let curse = {};
let giveaways = {};
let boostActive = {};

// ================= BAD WORDS =================

const BAD_WORDS = [
  "amk","oç","aq","amq","siktir","sik","orospu","piç",
  "mal","salak","gerizekalı","aptal",
  "fuck","shit","bitch","ass","dick","wtf"
];

// ================= LINK ENGEL =================

const LINK_REGEX = /(https?:\/\/|www\.)/i;

// ================= ROLE SYSTEM =================

async function updateRoles(member, xpValue) {

  const roles = Object.values(ROLES)
    .map(id => member.guild.roles.cache.get(id))
    .filter(Boolean);

  await member.roles.remove(roles).catch(()=>{});

  if (xpValue >= 50000) {
    await member.roles.add(ROLES.special).catch(()=>{});
    xp[member.id] = 0;
    save("./data/xp.json", xp);
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

  const ch = member.guild.channels.cache.find(
    c => c.name === "💬│genel-sohbet"
  );

  if (ch) {
    ch.send(
      `👋 Hoşgeldin <@${member.id}>!\n` +
      `📊 Sen ${member.guild.memberCount}. üyesisin 🎉`
    );
  }
});

// ================= MESSAGE =================

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  const id = message.author.id;
  const now = Date.now();
  const txt = message.content.toLowerCase();

  if (!xp[id]) xp[id] = 0;
  if (!cooldown[id]) cooldown[id] = 0;
  if (!curse[id]) curse[id] = 0;

  // ================= LINK ENGEL =================

  if (LINK_REGEX.test(txt)) {

    await message.delete().catch(()=>{});

    if (message.member?.moderatable)
      message.member.timeout(60 * 60 * 1000);

    return message.channel.send("🔗 Link yasak → 1 saat mute");
  }

  // ================= KÜFÜR =================

  const clean = txt.replace(/0/g,"o").replace(/1/g,"i").replace(/3/g,"e");

  if (BAD_WORDS.some(w => clean.includes(w))) {

    await message.delete().catch(()=>{});

    curse[id]++;

    if (curse[id] >= 3) {
      curse[id] = 0;

      if (message.member?.moderatable)
        message.member.timeout(5 * 60 * 1000);

      return message.channel.send("⚠️ 3 küfür → 5 dk mute");
    }

    return message.channel.send(`⚠️ Küfür ${curse[id]}/3`);
  }

  // ================= XP SYSTEM (2 DK) =================

  if (now - cooldown[id] >= 120000) {

    let xpGain = Math.floor(Math.random() * 21) + 10;

    if (message.member.roles.cache.has(SENOR_ROLE)) {
      xpGain *= 1.3;
    }

    if (boostActive[id] && boostActive[id] > Date.now()) {
      xpGain *= 2;
    }

    xp[id] += Math.floor(xpGain);

    cooldown[id] = now;

    save("./data/xp.json", xp);

    updateRoles(message.member, xp[id]);
  }

  // ================= BASIC =================

  if (message.content === "!xp")
    return message.reply(`⭐ XP: ${xp[id]}`);
});

// ================= LOGIN =================

client.login(process.env.TOKEN);
