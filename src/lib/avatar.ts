// Gordemy Avatar System v2 — SVG Characters + Buff System

export type UnlockCondition =
  | { type: "free" }
  | { type: "level"; value: number }
  | { type: "gems"; value: number }
  | { type: "achievement"; key: string }
  | { type: "streak"; value: number };

export interface ItemBuff {
  type: "hp" | "xp_mult" | "combo_dmg" | "gem_bonus" | "chest_luck";
  value: number;
  label: string;
}

export interface AvatarItem {
  id: string;
  emoji: string;
  name: string;
  unlock: UnlockCondition;
  rarity: "common" | "rare" | "epic" | "legendary";
  description?: string;
  buff?: ItemBuff;
  debuff?: ItemBuff;
}

export interface AvatarConfig {
  character: string;
  hat: string;
  accessory: string;
  aura: string;
  frame: string;
  left_hand?: string;
}

export interface CharacterStyle {
  bodyColor: string; bodyColorDark: string; headColor: string;
  armColor: string; legColor: string; eyeColor: string;
  emblem: string; gradient: [string, string];
}

export const CHARACTER_STYLES: Record<string, CharacterStyle> = {
  student: { bodyColor:"#3B82F6",bodyColorDark:"#1D4ED8",headColor:"#FDDCAD",armColor:"#2563EB",legColor:"#1E40AF",eyeColor:"#1E40AF",emblem:"📚",gradient:["#3B82F6","#1D4ED8"] },
  wizard:  { bodyColor:"#7C3AED",bodyColorDark:"#5B21B6",headColor:"#FDDCAD",armColor:"#6D28D9",legColor:"#4C1D95",eyeColor:"#7C3AED",emblem:"⭐",gradient:["#7C3AED","#4C1D95"] },
  ninja:   { bodyColor:"#1F2937",bodyColorDark:"#111827",headColor:"#374151",armColor:"#111827",legColor:"#030712",eyeColor:"#EF4444",emblem:"🥷",gradient:["#374151","#030712"] },
  hero:    { bodyColor:"#DC2626",bodyColorDark:"#991B1B",headColor:"#FDDCAD",armColor:"#B91C1C",legColor:"#7F1D1D",eyeColor:"#DC2626",emblem:"⚡",gradient:["#DC2626","#991B1B"] },
  knight:  { bodyColor:"#9CA3AF",bodyColorDark:"#6B7280",headColor:"#FDDCAD",armColor:"#6B7280",legColor:"#4B5563",eyeColor:"#374151",emblem:"🛡️",gradient:["#9CA3AF","#4B5563"] },
  robot:   { bodyColor:"#0EA5E9",bodyColorDark:"#0369A1",headColor:"#BAE6FD",armColor:"#0284C7",legColor:"#075985",eyeColor:"#06B6D4",emblem:"⚙️",gradient:["#0EA5E9","#0369A1"] },
  alien:   { bodyColor:"#10B981",bodyColorDark:"#065F46",headColor:"#6EE7B7",armColor:"#059669",legColor:"#064E3B",eyeColor:"#10B981",emblem:"👾",gradient:["#10B981","#065F46"] },
  dragon:  { bodyColor:"#F59E0B",bodyColorDark:"#B45309",headColor:"#FDE68A",armColor:"#D97706",legColor:"#92400E",eyeColor:"#DC2626",emblem:"🔥",gradient:["#F59E0B","#B45309"] },
};

export const CHARACTERS: AvatarItem[] = [
  { id:"student",emoji:"🧑‍🎓",name:"Студент",   unlock:{type:"free"},             rarity:"common",   description:"Класичний учень",      buff:{type:"xp_mult",value:1.0,label:"Базові стати"} },
  { id:"wizard", emoji:"🧙",  name:"Маг",       unlock:{type:"level",value:5},   rarity:"rare",     description:"Магія формул",          buff:{type:"xp_mult",value:1.2,label:"+20% XP"} },
  { id:"ninja",  emoji:"🥷",  name:"Ніндзя",    unlock:{type:"level",value:8},   rarity:"rare",     description:"Швидкий і точний",      buff:{type:"combo_dmg",value:1.15,label:"+15% комбо"} },
  { id:"hero",   emoji:"🦸",  name:"Супергерой",unlock:{type:"level",value:12},  rarity:"epic",     description:"+30 HP",                buff:{type:"hp",value:30,label:"+30 HP"} },
  { id:"knight", emoji:"🧝",  name:"Ельф",      unlock:{type:"level",value:10},  rarity:"epic",     description:"+20 HP, -10% комбо",   buff:{type:"hp",value:20,label:"+20 HP"},debuff:{type:"combo_dmg",value:0.9,label:"-10% комбо"} },
  { id:"robot",  emoji:"🤖",  name:"Кіборг",    unlock:{type:"gems",value:50},   rarity:"epic",     description:"+30% XP, -20 HP",      buff:{type:"xp_mult",value:1.3,label:"+30% XP"},debuff:{type:"hp",value:-20,label:"-20 HP"} },
  { id:"alien",  emoji:"👾",  name:"Прибулець", unlock:{type:"gems",value:80},   rarity:"legendary",description:"+50% gems, -10 HP",   buff:{type:"gem_bonus",value:1.5,label:"+50% gems"},debuff:{type:"hp",value:-10,label:"-10 HP"} },
  { id:"dragon", emoji:"🐲",  name:"Дракон",    unlock:{type:"level",value:20},  rarity:"legendary",description:"+50% комбо, -10% XP", buff:{type:"combo_dmg",value:1.5,label:"+50% комбо"},debuff:{type:"xp_mult",value:0.9,label:"-10% XP"} },
];

export const HATS: AvatarItem[] = [
  { id:"none",      emoji:"",   name:"Без шапки",     unlock:{type:"free"},                   rarity:"common" },
  { id:"cap",       emoji:"🎓", name:"Академічна",    unlock:{type:"free"},                   rarity:"common",   buff:{type:"xp_mult",value:1.05,label:"+5% XP"} },
  { id:"crown",     emoji:"👑", name:"Корона",        unlock:{type:"level",value:15},         rarity:"legendary",buff:{type:"xp_mult",value:1.3,label:"+30% XP"} },
  { id:"wizard_hat",emoji:"🎩", name:"Циліндр",       unlock:{type:"level",value:7},          rarity:"rare",     buff:{type:"xp_mult",value:1.1,label:"+10% XP"} },
  { id:"helmet",    emoji:"⛑️", name:"Шолом",         unlock:{type:"gems",value:30},          rarity:"rare",     buff:{type:"hp",value:25,label:"+25 HP"} },
  { id:"halo",      emoji:"😇", name:"Німб",          unlock:{type:"streak",value:14},        rarity:"epic",     buff:{type:"xp_mult",value:1.2,label:"+20% XP"},debuff:{type:"combo_dmg",value:0.95,label:"-5% комбо"} },
  { id:"fire_head", emoji:"🔥", name:"Вогняна",       unlock:{type:"streak",value:7},         rarity:"rare",     buff:{type:"combo_dmg",value:1.1,label:"+10% комбо"} },
  { id:"star_head", emoji:"⭐", name:"Зоряна корона", unlock:{type:"achievement",key:"tasks_100"},rarity:"epic",buff:{type:"gem_bonus",value:1.2,label:"+20% gems"} },
];

export const ACCESSORIES: AvatarItem[] = [
  { id:"none",    emoji:"",   name:"Гола рука",       unlock:{type:"free"},              rarity:"common" },
  { id:"book",    emoji:"📚", name:"Книга знань",     unlock:{type:"free"},              rarity:"common",   buff:{type:"xp_mult",value:1.1,label:"+10% XP"} },
  { id:"sword",   emoji:"⚔️", name:"Меч знань",      unlock:{type:"level",value:6},     rarity:"rare",     buff:{type:"combo_dmg",value:1.2,label:"+20% комбо"} },
  { id:"wand",    emoji:"🪄", name:"Чарівна паличка",unlock:{type:"level",value:8},     rarity:"rare",     buff:{type:"xp_mult",value:1.15,label:"+15% XP"} },
  { id:"lightning",emoji:"⚡",name:"Блискавка",       unlock:{type:"gems",value:40},     rarity:"epic",     buff:{type:"combo_dmg",value:1.3,label:"+30% комбо"},debuff:{type:"hp",value:-15,label:"-15 HP"} },
  { id:"gem_wand",emoji:"💎", name:"Сапфіровий жезл",unlock:{type:"gems",value:60},     rarity:"epic",     buff:{type:"gem_bonus",value:1.4,label:"+40% gems"} },
  { id:"axe",     emoji:"🪓", name:"Бойова сокира",  unlock:{type:"level",value:14},    rarity:"epic",     buff:{type:"combo_dmg",value:1.4,label:"+40% комбо"},debuff:{type:"xp_mult",value:0.9,label:"-10% XP"} },
  { id:"trophy",  emoji:"🏆", name:"Трофей",         unlock:{type:"achievement",key:"tasks_500"},rarity:"legendary",buff:{type:"xp_mult",value:1.5,label:"+50% XP"} },
];

export const LEFT_HAND: AvatarItem[] = [
  { id:"none",   emoji:"",   name:"Гола рука",    unlock:{type:"free"},                  rarity:"common" },
  { id:"shield", emoji:"🛡️", name:"Щит захисту", unlock:{type:"level",value:4},         rarity:"common",   buff:{type:"hp",value:30,label:"+30 HP"} },
  { id:"tome",   emoji:"📖", name:"Давній том",   unlock:{type:"free"},                  rarity:"common",   buff:{type:"xp_mult",value:1.08,label:"+8% XP"} },
  { id:"orb",    emoji:"🔮", name:"Магічна куля", unlock:{type:"level",value:9},         rarity:"rare",     buff:{type:"xp_mult",value:1.15,label:"+15% XP"} },
  { id:"lantern",emoji:"🏮", name:"Ліхтар",       unlock:{type:"level",value:6},         rarity:"rare",     buff:{type:"gem_bonus",value:1.15,label:"+15% gems"} },
  { id:"cannon", emoji:"💣", name:"Бомба",        unlock:{type:"gems",value:45},         rarity:"epic",     buff:{type:"combo_dmg",value:1.25,label:"+25% комбо"},debuff:{type:"hp",value:-25,label:"-25 HP"} },
  { id:"anchor", emoji:"⚓", name:"Якір",         unlock:{type:"achievement",key:"streak_30"},rarity:"epic",buff:{type:"hp",value:50,label:"+50 HP"},debuff:{type:"combo_dmg",value:0.85,label:"-15% комбо"} },
  { id:"wings",  emoji:"🦋", name:"Крила удачі",  unlock:{type:"level",value:20},        rarity:"legendary",buff:{type:"chest_luck",value:0.15,label:"+15% рідк. сундук"} },
];

export const FRAMES: AvatarItem[] = LEFT_HAND;

export const AURAS: AvatarItem[] = [
  { id:"none",   emoji:"⬛",name:"Без аури",   unlock:{type:"free"},              rarity:"common" },
  { id:"blue",   emoji:"🔵",name:"Синя",       unlock:{type:"level",value:5},    rarity:"rare",     buff:{type:"xp_mult",value:1.05,label:"+5% XP"} },
  { id:"fire",   emoji:"🔴",name:"Вогняна",    unlock:{type:"streak",value:7},   rarity:"epic",     buff:{type:"combo_dmg",value:1.1,label:"+10% комбо"} },
  { id:"purple", emoji:"🟣",name:"Фіолетова",  unlock:{type:"level",value:10},   rarity:"epic",     buff:{type:"xp_mult",value:1.1,label:"+10% XP"} },
  { id:"gold",   emoji:"🟡",name:"Золота",     unlock:{type:"level",value:20},   rarity:"legendary",buff:{type:"xp_mult",value:1.2,label:"+20% XP"},debuff:{type:"hp",value:-10,label:"-10 HP"} },
  { id:"rainbow",emoji:"🌈",name:"Веселкова",  unlock:{type:"gems",value:100},   rarity:"legendary",buff:{type:"gem_bonus",value:1.3,label:"+30% gems"} },
  { id:"storm",  emoji:"⚡",name:"Гроза",      unlock:{type:"gems",value:70},    rarity:"epic",     buff:{type:"combo_dmg",value:1.15,label:"+15% комбо"},debuff:{type:"hp",value:-20,label:"-20 HP"} },
  { id:"ice",    emoji:"❄️",name:"Крижана",    unlock:{type:"achievement",key:"streak_30"},rarity:"legendary",buff:{type:"hp",value:40,label:"+40 HP"} },
];

export const AURA_STYLES: Record<string,string> = {
  none:"",blue:"bg-gradient-to-br from-gordemy-blue/30 via-transparent to-gordemy-blue/10",
  fire:"bg-gradient-to-br from-red-600/30 via-orange-500/10 to-transparent",
  purple:"bg-gradient-to-br from-gordemy-purple/30 via-transparent to-gordemy-purple/10",
  gold:"bg-gradient-to-br from-yellow-400/30 via-amber-300/10 to-transparent",
  rainbow:"bg-gradient-to-br from-pink-500/30 via-gordemy-blue/20 to-green-500/20",
  storm:"bg-gradient-to-br from-blue-400/20 via-purple-600/20 to-gray-900/30",
  ice:"bg-gradient-to-br from-cyan-300/30 via-blue-200/10 to-transparent",
};

export const AURA_GLOW: Record<string,string> = {
  none:"",blue:"0 0 40px 12px rgba(59,130,246,0.5)",fire:"0 0 40px 12px rgba(220,38,38,0.6)",
  purple:"0 0 40px 12px rgba(124,58,237,0.5)",gold:"0 0 50px 18px rgba(251,191,36,0.6)",
  rainbow:"0 0 45px 12px rgba(168,85,247,0.5)",storm:"0 0 40px 12px rgba(96,165,250,0.5)",
  ice:"0 0 40px 12px rgba(103,232,249,0.5)",
};

export const RARITY_COLORS: Record<AvatarItem["rarity"], string> = {
  common: "border-gordemy-border",
  rare: "border-gordemy-blue/50",
  epic: "border-gordemy-purple/50",
  legendary: "border-gordemy-orange/60",
};

export const RARITY_GLOW: Record<AvatarItem["rarity"], string> = {
  common: "",
  rare: "shadow-lg shadow-gordemy-blue/15",
  epic: "shadow-lg shadow-gordemy-purple/20",
  legendary: "shadow-xl shadow-gordemy-orange/25",
};

export const RARITY_LABEL_COLOR: Record<AvatarItem["rarity"], string> = {
  common: "text-gordemy-muted",
  rare: "text-gordemy-blue",
  epic: "text-gordemy-purple",
  legendary: "text-gordemy-orange",
};

export const FRAME_STYLES: Record<string,string> = {
  none:"border-gordemy-border",silver:"border-gray-400",gold:"border-yellow-400",
  dragon:"border-orange-500",fire:"border-red-500",crystal:"border-cyan-400",
};

export const DEFAULT_AVATAR = {
  character:"student", hat:"cap", accessory:"book",
  left_hand:"tome", aura:"none", frame:"none",
};

export interface CharacterStats {
  hp:number; xpMult:number; comboDmg:number; gemBonus:number; chestLuck:number;
}

export function calcStats(avatar:{character:string;hat:string;accessory:string;left_hand?:string;aura:string}):CharacterStats {
  const stats:CharacterStats={hp:100,xpMult:1.0,comboDmg:1.0,gemBonus:1.0,chestLuck:0};
  const apply=(item:AvatarItem|undefined)=>{
    if(!item)return;
    if(item.buff){
      if(item.buff.type==="hp")stats.hp+=item.buff.value;
      if(item.buff.type==="xp_mult")stats.xpMult*=item.buff.value;
      if(item.buff.type==="combo_dmg")stats.comboDmg*=item.buff.value;
      if(item.buff.type==="gem_bonus")stats.gemBonus*=item.buff.value;
      if(item.buff.type==="chest_luck")stats.chestLuck+=item.buff.value;
    }
    if(item.debuff){
      if(item.debuff.type==="hp")stats.hp+=item.debuff.value;
      if(item.debuff.type==="xp_mult")stats.xpMult*=item.debuff.value;
      if(item.debuff.type==="combo_dmg")stats.comboDmg*=item.debuff.value;
    }
  };
  apply(CHARACTERS.find(c=>c.id===avatar.character));
  apply(HATS.find(h=>h.id===avatar.hat));
  apply(ACCESSORIES.find(a=>a.id===avatar.accessory));
  apply(LEFT_HAND.find(l=>l.id===(avatar.left_hand||"none")));
  apply(AURAS.find(a=>a.id===avatar.aura));
  stats.hp=Math.max(40,Math.round(stats.hp));
  stats.xpMult=Math.round(stats.xpMult*100)/100;
  stats.comboDmg=Math.round(stats.comboDmg*100)/100;
  return stats;
}

export function isUnlocked(item:AvatarItem,ctx:{level:number;gems:number;streak:number;achievements?:string[];earnedAchievements?:string[]}):boolean {
  const u=item.unlock;
  const achievements = ctx.achievements || ctx.earnedAchievements || [];
  if(u.type==="free")return true;
  if(u.type==="level")return ctx.level>=u.value;
  if(u.type==="gems")return ctx.gems>=u.value;
  if(u.type==="streak")return ctx.streak>=u.value;
  if(u.type==="achievement")return achievements.includes(u.key);
  return false;
}

export function unlockLabel(unlock:UnlockCondition):string {
  if(unlock.type==="free")return"Безкоштовно";
  if(unlock.type==="level")return`Рівень ${unlock.value}`;
  if(unlock.type==="gems")return`${unlock.value} 💎`;
  if(unlock.type==="streak")return`${unlock.value} днів серії`;
  if(unlock.type==="achievement")return"Досягнення";
  return"";
}

export interface TitleDef {
  id:string; label:string; color:string; condition:string;
  unlock:(s:{level:number;streak:number;tasks:number;xp:number})=>boolean;
}

export const TITLES:TitleDef[]=[
  {id:"novice",    label:"Новачок",       color:"text-gordemy-muted", condition:"Стартовий",            unlock:()=>true},
  {id:"student_t", label:"Учень",         color:"text-blue-400",      condition:"5 завдань",             unlock:s=>s.tasks>=5},
  {id:"explorer",  label:"Дослідник",     color:"text-cyan-400",      condition:"20 завдань",            unlock:s=>s.tasks>=20},
  {id:"fighter",   label:"Боєць",         color:"text-orange-400",    condition:"50 завдань",            unlock:s=>s.tasks>=50},
  {id:"master",    label:"Майстер",       color:"text-purple-400",    condition:"100 завдань",           unlock:s=>s.tasks>=100},
  {id:"champion",  label:"Чемпіон",       color:"text-yellow-400",    condition:"250 завдань",           unlock:s=>s.tasks>=250},
  {id:"legend_t",  label:"Легенда",       color:"text-red-400",       condition:"500 завдань",           unlock:s=>s.tasks>=500},
  {id:"streak3",   label:"На Хвилі",      color:"text-orange-300",    condition:"3 дні серії",           unlock:s=>s.streak>=3},
  {id:"streak7",   label:"Вогняний",      color:"text-red-400",       condition:"7 днів серії",          unlock:s=>s.streak>=7},
  {id:"streak30",  label:"Невгасимий",    color:"text-yellow-300",    condition:"30 днів серії",         unlock:s=>s.streak>=30},
  {id:"lvl5",      label:"Підмайстер",    color:"text-blue-300",      condition:"Рівень 5",              unlock:s=>s.level>=5},
  {id:"lvl10",     label:"Досвідчений",   color:"text-indigo-400",    condition:"Рівень 10",             unlock:s=>s.level>=10},
  {id:"lvl20",     label:"Елітний",       color:"text-violet-400",    condition:"Рівень 20",             unlock:s=>s.level>=20},
  {id:"xp1000",    label:"XP Фермер",     color:"text-gordemy-green", condition:"1000 XP",              unlock:s=>s.xp>=1000},
  {id:"nmt_ready", label:"Готовий до НМТ",color:"text-gordemy-blue",  condition:"Рівень 15 + 200 завдань",unlock:s=>s.level>=15&&s.tasks>=200},
];
