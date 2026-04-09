"use client";

import { useEffect, useState, useRef, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { getComboState } from "@/lib/gamification";
import {
  CHARACTERS,
  DEFAULT_AVATAR,
  normalizeAvatarFull,
  calcHeroCombat,
  type AvatarConfig,
} from "@/lib/avatar";
import { getStudent, saveQuestionHistory, type Question } from "@/lib/student";
import BattleCharacter, { type BattleCue } from "@/components/BattleCharacter";

type Phase = "intro" | "countdown" | "battle" | "mk-finish" | "result";
type BossMode = "daily" | "weekly";
interface AvatarData { character: string; hat: string; accessory: string; aura: string; frame: string; }
interface FloatText { id: number; text: string; color: string; }
interface BossConfig {
  name: string; emoji: string; hp: number; questions: number; timePerQ: number;
  xpWin: number; xpLose: number; chestTier: "common"|"rare"|"epic"|"legendary";
  color: string; gradient: string; description: string;
}

const DAILY_BOSS: BossConfig = {
  name:"Денний Бос",emoji:"👹",hp:100,questions:7,timePerQ:15,
  xpWin:60,xpLose:15,chestTier:"rare",color:"border-red-500/50",
  gradient:"from-red-900/40 to-red-950/60",description:"Щоденна битва · Адаптивна складність",
};
const WEEKLY_BOSS: BossConfig = {
  name:"Тижневий Бос",emoji:"🐉",hp:200,questions:10,timePerQ:12,
  xpWin:200,xpLose:40,chestTier:"epic",color:"border-orange-400/60",
  gradient:"from-orange-900/40 to-amber-950/60",description:"Тижнева битва · Складніше · Більше нагород",
};
function FloatingDmg({texts}:{texts:FloatText[]}) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <AnimatePresence>
        {texts.map(t=>(
          <motion.div key={t.id} initial={{opacity:1,y:0,scale:1}} animate={{opacity:0,y:-60,scale:1.4}}
            exit={{opacity:0}} transition={{duration:0.8}}
            className={`absolute left-1/2 top-1/3 -translate-x-1/2 font-black text-2xl ${t.color} drop-shadow-lg`}>
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function HPBar({label,hp,maxHp,color,emoji,shaking}:{label:string;hp:number;maxHp:number;color:string;emoji:string;shaking:boolean}) {
  const pct=Math.max(0,Math.min(100,(hp/maxHp)*100));
  const bar=pct>60?"from-green-500 to-green-400":pct>30?"from-yellow-500 to-orange-400":"from-red-600 to-red-400";
  return (
    <motion.div animate={shaking?{x:[-8,8,-6,6,0]}:{}} transition={{duration:0.4}}
      className={`flex-1 rounded-2xl border ${color} bg-gordemy-card p-3`}>
      <div className="flex items-center gap-2 mb-2">
        <motion.span animate={shaking?{scale:[1,1.4,1]}:{}} className="text-3xl">{emoji}</motion.span>
        <div>
          <div className="text-white font-extrabold text-xs">{label}</div>
          <div className="text-gordemy-muted text-[10px]">{Math.max(0,hp)}/{maxHp} HP</div>
        </div>
      </div>
      <div className="h-3 rounded-full bg-black/40 border border-white/10 overflow-hidden">
        <motion.div animate={{width:`${pct}%`}} transition={{duration:0.5,ease:"easeOut"}}
          className={`h-full rounded-full bg-gradient-to-r ${bar} shadow-sm`}/>
      </div>
    </motion.div>
  );
}

function MKFinish({won,bossEmoji,playerEmoji,onDone}:{won:boolean;bossEmoji:string;playerEmoji:string;onDone:()=>void}) {
  useEffect(()=>{const t=setTimeout(onDone,2200);return()=>clearTimeout(t);},[onDone]);
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80">
      <motion.div initial={{opacity:1}} animate={{opacity:0}} transition={{duration:0.3}}
        className={`absolute inset-0 ${won?"bg-yellow-400/30":"bg-red-600/30"}`}/>
      <div className="flex items-end gap-8 mb-8 z-10">
        <motion.div initial={{x:-80,opacity:0}} animate={{x:0,opacity:1}} transition={{delay:0.1,type:"spring"}}
          className={`text-7xl ${!won?"grayscale opacity-40":""}`}>{playerEmoji}</motion.div>
        {won&&<motion.div initial={{scale:0}} animate={{scale:[0,1.5,1]}} transition={{delay:0.4}} className="text-4xl">💥</motion.div>}
        <motion.div initial={{x:80,opacity:0}}
          animate={{x:0,opacity:1,rotate:won?[0,-5,180]:0,y:won?[0,0,30]:0}}
          transition={{delay:0.2,type:"spring",duration:won?0.8:0.3}}
          className={`text-7xl ${won?"grayscale opacity-30":""}`}>{bossEmoji}</motion.div>
      </div>
      <motion.div initial={{scale:0.3,opacity:0}} animate={{scale:1,opacity:1}} transition={{delay:0.5,type:"spring",stiffness:300}} className="z-10 text-center">
        {won
          ?<><div className="text-5xl font-black text-yellow-300 tracking-widest mb-1 drop-shadow-lg">VICTORY!</div><div className="text-gordemy-muted text-sm tracking-widest">FLAWLESS</div></>
          :<><div className="text-5xl font-black text-red-400 tracking-widest mb-1 drop-shadow-lg">DEFEAT</div><div className="text-gordemy-muted text-sm tracking-widest">TRY AGAIN</div></>
        }
      </motion.div>
      {won&&(
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({length:12}).map((_,i)=>(
            <motion.div key={i} initial={{opacity:1,scale:0,x:"50vw",y:"50vh"}}
              animate={{opacity:0,scale:1,x:`${Math.cos((i/12)*Math.PI*2)*150+50}vw`,y:`${Math.sin((i/12)*Math.PI*2)*150+50}vh`}}
              transition={{delay:0.5,duration:1}} className="absolute text-2xl">
              {["⭐","💫","✨","🌟"][i%4]}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function BossPageInner() {
  const {user,loading:authLoading}=useAuth();
  const router=useRouter();
  const searchParams=useSearchParams();
  const mode:BossMode=searchParams.get("mode")==="weekly"?"weekly":"daily";
  const cfg=mode==="weekly"?WEEKLY_BOSS:DAILY_BOSS;

  const [student,setStudent]=useState<any>(null);
  const [phase,setPhase]=useState<Phase>("intro");
  const [questions,setQuestions]=useState<Question[]>([]);
  const [qIdx,setQIdx]=useState(0);
  const [selected,setSelected]=useState<number|null>(null);
  const [playerMaxHp,setPlayerMaxHp]=useState(100);
  const [playerHP,setPlayerHP]=useState(100);
  const [bossHP,setBossHP]=useState(cfg.hp);
  const [combo,setCombo]=useState(0);
  const [xpEarned,setXpEarned]=useState(0);
  const [timeLeft,setTimeLeft]=useState(cfg.timePerQ);
  const [shakePlayer,setShakePlayer]=useState(false);
  const [shakeBoss,setShakeBoss]=useState(false);
  const [flashColor,setFlashColor]=useState("");
  const [floats,setFloats]=useState<FloatText[]>([]);
  const [won,setWon]=useState(false);
  const [rewardDoneToday,setRewardDoneToday]=useState(false);
  const [rewardGrantedInFight,setRewardGrantedInFight]=useState(false);
  const [countdown,setCountdown]=useState(3);
  const timerRef=useRef<NodeJS.Timeout|null>(null);
  const floatId=useRef(0);
  const bossHPRef=useRef(cfg.hp);
  const playerHPRef=useRef(100);
  const xpRef=useRef(0);
  const comboRef=useRef(0);
  const battleCueNonce=useRef(0);
  const [battleCue,setBattleCue]=useState<BattleCue|null>(null);
  const pendingWinAnim=useRef(false);

  const heroCombat=useMemo(()=>{
    if(!student)return calcHeroCombat(normalizeAvatarFull(DEFAULT_AVATAR));
    const raw=(student as any).avatar_data;
    const av=raw&&typeof raw==="object"?raw:{};
    return calcHeroCombat(normalizeAvatarFull({...DEFAULT_AVATAR,...av}));
  },[student]);

  useEffect(()=>{
    if(!user)return;
    (async()=>{
      const st=await getStudent(user.id);
      if(!st){router.replace("/dashboard");return;}
      setStudent(st);
      const rawAv = (st as any).avatar_data;
      const av =
        rawAv && typeof rawAv === "object"
          ? (rawAv as Partial<AvatarConfig>)
          : {};
      const maxHp = calcHeroCombat(
        normalizeAvatarFull({ ...DEFAULT_AVATAR, ...av }),
      ).maxHp;
      setPlayerMaxHp(maxHp);
      playerHPRef.current = maxHp;
      setPlayerHP(maxHp);
      const today=new Date().toISOString().split("T")[0];
      const s=st as any;
      if(mode==="daily"&&s.boss_daily_reset===today)setRewardDoneToday(true);
      if(mode==="weekly"&&s.boss_weekly_reset===today)setRewardDoneToday(true);
    })();
  },[user,router,mode]);

  const addFloat=useCallback((text:string,color:string)=>{
    const id=floatId.current++;
    setFloats(p=>[...p,{id,text,color}]);
    setTimeout(()=>setFloats(p=>p.filter(f=>f.id!==id)),900);
  },[]);

  const endFight=useCallback(async(victory:boolean)=>{
    if(timerRef.current)clearInterval(timerRef.current);
    setWon(victory);
    setPhase("mk-finish");
    if(!user)return;
    const today=new Date().toISOString().split("T")[0];
    const {data:fresh}=await supabase.from("students").select("xp,gems,chest_inventory").eq("id",user.id).single();
    const inv=Array.isArray(fresh?.chest_inventory)?fresh.chest_inventory:[];
    const shouldReward=victory&&!rewardDoneToday;
    setRewardGrantedInFight(shouldReward);
    const xpGain=victory?cfg.xpWin:cfg.xpLose;
    const update:Record<string,unknown>={xp:(fresh?.xp||0)+xpGain};
    if(shouldReward){
      const gemsGain=mode==="weekly"?30:10;
      const tier=cfg.chestTier;
      const hours={common:1,rare:4,epic:12,legendary:24}[tier];
      const now=new Date();
      const chest={id:`boss-${Date.now()}`,tier,earnedAt:now.toISOString(),unlockAt:new Date(now.getTime()+hours*3600000).toISOString(),opened:false};
      update.gems=(fresh?.gems||0)+gemsGain;
      update.chest_inventory=[...inv,chest];
      if(mode==="daily"){update.boss_daily_done=true;update.boss_daily_reset=today;}
      else{update.boss_weekly_done=true;update.boss_weekly_reset=today;}
      setRewardDoneToday(true);
    }
    await supabase.from("students").update(update).eq("id",user.id);
  },[user,cfg,mode,rewardDoneToday]);

  const handleAnswer=useCallback((idx:number)=>{
    if(timerRef.current)clearInterval(timerRef.current);
    if(selected!==null)return;
    setSelected(idx);
    const q=questions[qIdx];
    if(!q)return;
    const correct=idx===q.correct_answer;
    if(user){
      void saveQuestionHistory({
        userId:user.id,
        questionId:q.id,
        wasCorrect:correct,
        mode:mode==="weekly"?"boss_weekly":"boss_daily",
      });
    }
    const newCombo=correct?comboRef.current+1:0;
    comboRef.current=newCombo;
    setCombo(newCombo);
    const mult=getComboState(newCombo).multiplier;
    const dmgBoss=correct
      ?Math.round(18*mult*heroCombat.damageMult*(1+(heroCombat.comboSpeed-1)*0.12))
      :0;
    const dmgPlayer=correct
      ?0
      :Math.max(1,Math.round((15+Math.random()*10)*(1-heroCombat.defenseMitigation)));
    const xpGain=correct?Math.round(8*mult):0;
    xpRef.current+=xpGain;
    setXpEarned(xpRef.current);

    if(correct){
      bossHPRef.current=Math.max(0,bossHPRef.current-dmgBoss);
      setBossHP(bossHPRef.current);
      const lethal=bossHPRef.current<=0;
      if(lethal)pendingWinAnim.current=true;
      setBattleCue({ kind:"attack", nonce:++battleCueNonce.current });
      setShakeBoss(true);setTimeout(()=>setShakeBoss(false),400);
      setFlashColor("bg-yellow-400/15");setTimeout(()=>setFlashColor(""),250);
      addFloat(`-${dmgBoss} 💥`,"text-yellow-300");
      addFloat(`+${xpGain} XP`,"text-gordemy-green");
    } else {
      pendingWinAnim.current=false;
      setBattleCue({ kind:"hit", nonce:++battleCueNonce.current });
      playerHPRef.current=Math.max(0,playerHPRef.current-dmgPlayer);
      setPlayerHP(playerHPRef.current);
      setShakePlayer(true);setTimeout(()=>setShakePlayer(false),400);
      setFlashColor("bg-red-600/20");setTimeout(()=>setFlashColor(""),250);
      addFloat(`-${dmgPlayer} 💀`,"text-red-400");
    }

    const afterRoundMs=correct&&bossHPRef.current<=0?1900:1100;
    setTimeout(async()=>{
      if(bossHPRef.current<=0){await endFight(true);return;}
      if(playerHPRef.current<=0){await endFight(false);return;}
      const next=qIdx+1;
      if(next>=questions.length){await endFight(bossHPRef.current<playerHPRef.current);return;}
      setQIdx(next);setSelected(null);
    },afterRoundMs);
  },[selected,questions,qIdx,addFloat,endFight,user,mode,heroCombat]);

  function onBattleActionComplete(kind:BattleCue["kind"]){
    if(kind==="attack"&&pendingWinAnim.current){
      pendingWinAnim.current=false;
      setBattleCue({ kind:"win", nonce:++battleCueNonce.current });
    }
  }

  const startTimer=useCallback(()=>{
    if(timerRef.current)clearInterval(timerRef.current);
    setTimeLeft(cfg.timePerQ);
    timerRef.current=setInterval(()=>{
      setTimeLeft(p=>{
        if(p<=1){clearInterval(timerRef.current!);handleAnswer(-1);return 0;}
        return p-1;
      });
    },1000);
  },[cfg.timePerQ,handleAnswer]);

  useEffect(()=>{
    if(phase==="battle"&&questions.length>0){startTimer();}
    return()=>{if(timerRef.current)clearInterval(timerRef.current);};
  },[phase,qIdx,questions.length,startTimer]);

  const startFight=useCallback(async()=>{
    if(!user||!student)return;
    const level=(student as any).level||1;
    const diff=level<5?"easy":level<10?"medium":"hard";
    const subjects=(student as any).subjects||["ukr","math"];
    const {data}=await supabase.from("questions").select("*").in("subject",subjects).eq("difficulty",diff).limit(cfg.questions*2);
    const pool=(data||[]).sort(()=>Math.random()-0.5).slice(0,cfg.questions);
    const final=pool.length>=3?pool:(await supabase.from("questions").select("*").limit(cfg.questions)).data||[];
    setQuestions(final.slice(0,cfg.questions) as Question[]);
    bossHPRef.current=cfg.hp;setBossHP(cfg.hp);
    playerHPRef.current=playerMaxHp;setPlayerHP(playerMaxHp);
    comboRef.current=0;setCombo(0);
    xpRef.current=0;setXpEarned(0);
    setRewardGrantedInFight(false);
    setQIdx(0);setSelected(null);
    setPhase("countdown");setCountdown(3);
    let c=3;
    const cd=setInterval(()=>{c--;setCountdown(c);if(c<=0){clearInterval(cd);setPhase("battle");}},800);
  },[user,student,cfg,playerMaxHp]);

  if(authLoading)return(
    <div className="min-h-screen flex items-center justify-center">
      <motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:"linear"}}
        className="w-10 h-10 rounded-full border-4 border-gordemy-purple border-t-transparent"/>
    </div>
  );

  const avatarData:AvatarData={...DEFAULT_AVATAR,...(student?.avatar_data||{})};
  const char=CHARACTERS.find(c=>c.id===avatarData.character)||CHARACTERS[0];

  if(phase==="intro")return(
    <div className="max-w-md mx-auto px-4 py-10 flex flex-col items-center text-center">
      <motion.div animate={{scale:[1,1.08,1],rotate:[-3,3,-3]}} transition={{duration:2,repeat:Infinity}} className="text-8xl mb-6">{cfg.emoji}</motion.div>
      <div className={`w-full rounded-2xl border bg-gradient-to-br ${cfg.gradient} ${cfg.color} p-6 mb-6`}>
        <h1 className="text-3xl font-black text-white mb-1">{cfg.name}</h1>
        {rewardDoneToday&&(
          <div className="inline-flex mt-2 px-3 py-1 rounded-full border border-gordemy-green/40 bg-gordemy-green/10 text-gordemy-green text-xs font-black tracking-wider">
            DONE
          </div>
        )}
        <p className="text-gordemy-muted text-sm mb-4">{cfg.description}</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[{v:cfg.questions,l:"Питань"},{v:`${cfg.timePerQ}с`,l:"На питання"},{v:`+${cfg.xpWin}`,l:"XP (перемога"}].map((x,i)=>(
            <div key={i} className="bg-black/20 rounded-xl p-2">
              <div className="text-white font-black">{x.v}</div>
              <div className="text-gordemy-muted text-[10px]">{x.l}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="w-full bg-gordemy-card border border-gordemy-border rounded-2xl p-4 mb-6 text-left">
        <div className="text-xs font-bold text-gordemy-muted uppercase mb-2">Комбо системи</div>
        {[{c:2,m:"×1.25",e:"⚡"},{c:3,m:"×1.5",e:"🔥"},{c:5,m:"×2.0",e:"💥"},{c:7,m:"×2.5",e:"🌀"}].map(x=>(
          <div key={x.c} className="flex items-center justify-between text-sm py-1">
            <span className="text-gordemy-muted">{x.e} {x.c}+ правильних</span>
            <span className="font-black text-yellow-300">{x.m} урон</span>
          </div>
        ))}
      </div>
      <motion.button whileHover={{scale:1.04}} whileTap={{scale:0.96}} onClick={startFight}
        className={`w-full py-5 rounded-2xl bg-gradient-to-r ${mode==="weekly"?"from-orange-600 to-amber-600":"from-red-600 to-red-800"} text-white font-black text-xl shadow-lg relative overflow-hidden`}>
        <motion.div animate={{x:["-100%","200%"]}} transition={{duration:2,repeat:Infinity,ease:"linear"}}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"/>
        ⚔️ БИТИСЯ!
      </motion.button>
      <button onClick={()=>router.push("/dashboard")} className="mt-4 text-gordemy-muted text-sm">← Назад</button>
    </div>
  );

  if(phase==="countdown")return(
    <div className="min-h-screen flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div key={countdown} initial={{scale:2,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.5,opacity:0}} transition={{duration:0.4}}
          className={`font-black text-center ${countdown===0?"text-gordemy-green":"text-white"}`}>
          <div className="text-9xl">{countdown===0?"GO!":countdown}</div>
          {countdown>0&&<div className="text-gordemy-muted text-lg mt-2">ПРИГОТУЙСЯ...</div>}
        </motion.div>
      </AnimatePresence>
    </div>
  );

  if(phase==="mk-finish")return(
    <MKFinish won={won} bossEmoji={cfg.emoji} playerEmoji={char.emoji} onDone={()=>setPhase("result")}/>
  );

  if(phase==="result"){
    const xpGain=won?cfg.xpWin:cfg.xpLose;
    const rewardGranted=won&&rewardGrantedInFight;
    const tier=rewardGranted?cfg.chestTier:"common";
    const tl={common:"Звичайний",rare:"Рідкісний",epic:"Епічний",legendary:"Легендарний"};
    return(
      <div className="max-w-md mx-auto px-4 py-12 flex flex-col items-center text-center">
        <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:"spring",stiffness:200}}>
          <span className="text-7xl">{won?"🏆":"💀"}</span>
        </motion.div>
        <motion.h1 initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.2}}
          className={`text-3xl font-black mt-4 mb-2 ${won?"text-yellow-300":"text-red-400"}`}>
          {won?"БОС ПЕРЕМОЖЕНИЙ!":"ПОРАЗКА"}
        </motion.h1>
        <p className="text-gordemy-muted mb-6">{won?`${cfg.name} впав!`:"Спробуй ще раз!"}</p>
        <div className="w-full bg-gordemy-card border border-gordemy-border rounded-2xl p-5 mb-6 space-y-2">
          <div className="flex justify-between"><span className="text-gordemy-muted text-sm">XP</span><span className="text-gordemy-green font-black">+{xpGain}</span></div>
          <div className="flex justify-between"><span className="text-gordemy-muted text-sm">Gems</span><span className="text-yellow-300 font-black">+{rewardGranted?(mode==="weekly"?30:10):0} 💎</span></div>
          <div className="flex justify-between"><span className="text-gordemy-muted text-sm">Сундук</span><span className="text-gordemy-blue font-bold">{rewardGranted?`🎁 ${tl[tier]}`:"DONE"}</span></div>
        </div>
        <button onClick={()=>router.push("/dashboard")} className="w-full py-4 rounded-2xl bg-gordemy-purple text-white font-black text-base">На головну</button>
      </div>
    );
  }

  // BATTLE
  const q=questions[qIdx];
  if(!q)return null;
  const cs=getComboState(combo);
  const tp=(timeLeft/cfg.timePerQ)*100;
  const tc=timeLeft>cfg.timePerQ*0.6?"from-green-500 to-green-400":timeLeft>cfg.timePerQ*0.3?"from-yellow-500 to-orange-400":"from-red-600 to-red-400";

  return(
    <div className="max-w-md mx-auto px-4 py-5 flex flex-col min-h-screen relative">
      {flashColor&&(
        <motion.div initial={{opacity:0.6}} animate={{opacity:0}} transition={{duration:0.3}}
          className={`fixed inset-0 pointer-events-none z-50 ${flashColor}`}/>
      )}
      <div className="flex gap-1.5 mb-4">
        {questions.map((_,i)=>(
          <div key={i} className={`flex-1 h-1.5 rounded-full ${i<qIdx?"bg-gordemy-green":i===qIdx?"bg-gordemy-blue":"bg-gordemy-border"}`}/>
        ))}
        <span className="text-xs text-gordemy-muted ml-1 self-center">{qIdx+1}/{questions.length}</span>
      </div>
      <div className="flex gap-3 mb-3 relative">
        <HPBar label={student?.name||"Ти"} hp={playerHP} maxHp={playerMaxHp} color="border-gordemy-blue/40" emoji="⚔️" shaking={shakePlayer}/>
        <div className="flex items-center font-black text-gordemy-orange text-sm">VS</div>
        <HPBar label={cfg.name} hp={bossHP} maxHp={cfg.hp} color={cfg.color} emoji={cfg.emoji} shaking={shakeBoss}/>
        <FloatingDmg texts={floats}/>
      </div>
      <div className="relative mb-3 flex min-h-[128px] items-start justify-center pt-1">
        <BattleCharacter cue={battleCue} onActionComplete={onBattleActionComplete} comboCount={combo} className="scale-95"/>
        <span className={`absolute right-0 top-3 text-sm font-black tabular-nums ${timeLeft<=5?"text-red-400":"text-gordemy-muted"}`}>{timeLeft}с</span>
      </div>
      <div className="h-2 rounded-full bg-gordemy-card border border-gordemy-border overflow-hidden mb-3">
        <motion.div animate={{width:`${tp}%`}} transition={{duration:0.25}} className={`h-full rounded-full bg-gradient-to-r ${tc}`}/>
      </div>
      {combo>=2&&(
        <div className="mb-2 flex justify-center">
          <span className={`text-[11px] font-black ${cs.color}`}>{cs.emoji} {cs.label} ×{cs.multiplier} урон</span>
        </div>
      )}
      <div className="bg-gordemy-card border border-gordemy-border rounded-2xl p-4 mb-4 flex-1 min-h-[100px] flex items-center">
        <p className="text-white font-semibold text-sm leading-relaxed w-full text-center">{q.question_text}</p>
      </div>
      <div className="grid grid-cols-1 gap-2 pb-4">
        {(q.options||[]).map((opt,i)=>{
          const isSel=selected===i;
          const isCorr=i===q.correct_answer;
          const show=selected!==null;
          const letters=["A","B","C","D"];
          return(
            <motion.button key={i} whileTap={{scale:0.97}} onClick={()=>selected===null&&handleAnswer(i)} disabled={selected!==null}
              className={`w-full text-left px-4 py-3 rounded-2xl border font-semibold text-sm transition-all ${!show?"bg-gordemy-card border-gordemy-border text-white hover:border-gordemy-blue/60":isCorr?"bg-gordemy-green/20 border-gordemy-green text-gordemy-green":isSel?"bg-red-500/20 border-red-500 text-red-400":"bg-gordemy-card border-gordemy-border text-gordemy-muted opacity-40"}`}>
              <span className="font-black mr-2">{letters[i]}.</span>{opt}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export default function BossPage() {
  return(
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 rounded-full border-4 border-gordemy-purple border-t-transparent animate-spin"/></div>}>
      <BossPageInner/>
    </Suspense>
  );
}
