import React, { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  set,
  onValue,
  get,
  push,
  query,
  orderByChild,
  limitToLast,
  update,
  remove,
} from "firebase/database";

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyAJICuKbuMpbu9jOLyfmihyar3FQuEv23o",
  authDomain: "sepa-4d347.firebaseapp.com",
  databaseURL: "https://sepa-4d347-default-rtdb.firebaseio.com",
  projectId: "sepa-4d347",
  storageBucket: "sepa-4d347.firebasestorage.app",
  messagingSenderId: "272353568807",
  appId: "1:272353568807:web:b58b075f6988dcea5d8602",
  measurementId: "G-1JJJYH82J2",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- Assets ---
const ASSETS = {
  bg: "/images/syugio.png",
  floor: "/images/floor.png",
  ball: "/images/ball.png",
  mana: "/images/mana.png",

  avatar_t: "/images/avatar_t.png",
  avatar_s: "/images/avatar_s.png",
  avatar_a: "/images/avatar_a.png",

  cutout_t: "/images/cutout_t.png",
  cutout_s: "/images/cutout_s.png",
  cutout_a: "/images/cutout_a.png",
};

// ==========================================
// 🔧 レイアウト・配置 調整用パラメータ
// ==========================================
const LAYOUT = {
  // コートとネット
  courtTop: "5%",
  courtHeight: "90%",
  netTop: "40%",
  courtAngle: "30deg", // コートを見下ろす角度
  avatarAngle: "30deg", // プレイヤーカードの起き上がり角度

  // UIの配置 (Tailwindのクラス名で指定)
  hpPlayer: "bottom-24 right-4 sm:right-10", // ★ 中央から右側に変更
  hpEnemy: "top-4 right-4",
  passBtn: "top-0 right-4", // PASSボタン

  // アバター(プレイヤーカード)の大きさ
  avatarSizePlayer: "w-[90px] h-[125px] sm:w-[130px] sm:h-[180px]",
  avatarSizeEnemy: "w-[80px] h-[110px] sm:w-[110px] sm:h-[150px]",

  // 手札の扇形の調整
  handAngleMultiplier: 4, // カード同士の角度の開き具合
  handXMultiplier: 30, // 横の広がり具合 (px)
  handYMultiplier: 5, // 縦のズレ具合 (px)
};
// ==========================================

// --- Card Data ---
const CARD_LIST = [
  {
    id: "a1",
    name: "シザースアタック",
    type: "attacker",
    cost: 1,
    desc: "アタッカーの能力値+2",
    img: "/images/siza.png",
    effect: (b, p) => (b[p].buffs.attackAdd += 2),
  },
  {
    id: "a2",
    name: "ローリングアタック",
    type: "attacker",
    cost: 1,
    desc: "アタッカーの能力値*2",
    img: "/images/roll.png",
    effect: (b, p) => (b[p].buffs.attackMul *= 2),
  },
  {
    id: "a3",
    name: "フェイント",
    type: "attacker",
    cost: 1,
    desc: "アタッカーの能力値*5の固定ダメージ",
    img: "/images/feinta.png",
    effect: (b, p) => {
      b[p].buffs.fixedDamage = b[p].stats.attacker * 5;
    },
  },
  {
    id: "a4",
    name: "灼熱",
    type: "attacker",
    cost: 2,
    desc: "以後のターン、敵が毎ターン5ずつダメージ",
    img: "/images/syaku.png",
    effect: (b, p, opp) => (b[opp].buffs.burn = true),
  },
  {
    id: "a5",
    name: "巧みなタップ",
    type: "attacker",
    cost: 0,
    desc: "アタッカーの能力値+1(永続)",
    img: "/images/tap.png",
    effect: (b, p) => (b[p].stats.attacker += 1),
  },
  {
    id: "a6",
    name: "大爆発",
    type: "attacker",
    cost: 3,
    desc: "アタッカーの能力値+10(1ターン)",
    img: "/images/explo.png",
    effect: (b, p) => (b[p].buffs.attackAdd += 10),
  },
  {
    id: "t1",
    name: "食い込み",
    type: "tosser",
    cost: 1,
    desc: "トサーの能力値+2",
    img: "/images/kui.png",
    effect: (b, p) => (b[p].buffs.tossAdd += 2),
  },
  {
    id: "t2",
    name: "走らせ",
    type: "tosser",
    cost: 1,
    desc: "トサーの能力値*2",
    img: "/images/dash.png",
    effect: (b, p) => (b[p].buffs.tossMul *= 2),
  },
  {
    id: "t3",
    name: "速攻",
    type: "tosser",
    cost: 1,
    desc: "相手のブロックを必ず貫通",
    img: "/images/dasht.png",
    effect: (b, p) => (b[p].buffs.pierce = true),
  },
  {
    id: "t4",
    name: "正確無比",
    type: "tosser",
    cost: 2,
    desc: "トサーの能力値を永久に+2",
    img: "/images/sei.png",
    effect: (b, p) => (b[p].stats.tosser += 2),
  },
  {
    id: "t5",
    name: "間接視野",
    type: "tosser",
    cost: 1,
    desc: "デッキから2枚引く",
    img: "/images/sight.png",
    effect: (b, p) => drawCard(b, p, 2),
  },
  {
    id: "t6",
    name: "飄々とした態度",
    type: "tosser",
    cost: 0,
    desc: "HP(5×トサー値)回復",
    img: "/images/hyo.png",
    effect: (b, p) => {
      b[p].mana = Math.min(10, b[p].mana + 0);
      b[p].hp = Math.min(
        150,
        b[p].hp +
          5 * Math.max(0, b[p].stats.tosser - (b[p].buffs.allStatDown || 0))
      );
    },
  },
  {
    id: "s1",
    name: "フェイント(S)",
    type: "server",
    cost: 1,
    desc: "敵のマナ消費をこのターン1増加",
    img: "/images/feint.png",
    effect: (b, p, opp) => (b[opp].buffs.manaCostUp += 1),
  },
  {
    id: "s2",
    name: "ビタビタフェイント",
    type: "server",
    cost: 2,
    desc: "敵のマナ消費をこのターン2増加",
    img: "/images/needle.png",
    effect: (b, p, opp) => (b[opp].buffs.manaCostUp += 2),
  },
  {
    id: "s3",
    name: "恐るべき威力",
    type: "server",
    cost: 2,
    desc: "敵の全能力値を永久に1ダウン",
    img: "/images/damage.png",
    effect: (b, p, opp) => {
      b[opp].stats.server = Math.max(0, b[opp].stats.server - 1);
      b[opp].stats.tosser = Math.max(0, b[opp].stats.tosser - 1);
      b[opp].stats.attacker = Math.max(0, b[opp].stats.attacker - 1);
    },
  },
  {
    id: "s4",
    name: "サービスエース",
    type: "server",
    cost: 3,
    desc: "敵の攻撃を終了。サーバー値×5のダメージ。",
    img: "/images/ace.png",
    effect: (b, p, opp) => {
      const dmg = b[p].stats.server * 5;
      b[opp].hp -= dmg;
      b.damageText = { val: dmg, pos: opp === "p1" ? "bottom" : "top" };
      b.skipToNextTurn = true;
    },
  },
  {
    id: "s5",
    name: "速球",
    type: "server",
    cost: 2,
    desc: "相手にサーバーの能力値*10ダメージ",
    img: "/images/sok.png",
    effect: (b, p, opp) => {
      const dmg = b[p].stats.server * 10;
      b[opp].hp -= dmg;
      b.damageText = { val: dmg, pos: opp === "p1" ? "bottom" : "top" };
    },
  },
  {
    id: "s6",
    name: "緩急",
    type: "server",
    cost: 1,
    desc: "相手の手札をランダムに2枚破壊",
    img: "/images/sniper.png",
    effect: (b, p, opp) => {
      // 相手の手札の枚数と「2枚」を比べて、少ない方を破壊する回数にする
      // （相手の手札が1枚しかなければ1回だけ実行する）
      const destroyCount = Math.min(2, b[opp].hand.length);

      // destroyCountの回数分だけ、ランダムに捨てる処理を繰り返す
      for (let i = 0; i < destroyCount; i++) {
        // 現在の手札の中からランダムな位置を1つ決める
        const idx = Math.floor(Math.random() * b[opp].hand.length);

        // 決めた位置のカードを「1枚」抜き取る
        const discarded = b[opp].hand.splice(idx, 1)[0];

        // 抜き取ったカードを墓地に送る
        b[opp].discard.push(discarded);
      }
    },
  },
  {
    id: "s7",
    name: "絶望",
    type: "server",
    cost: 2,
    desc: "1ターン相手の全能力値を(サーバー値)下げる",
    img: "/images/despair.png",
    effect: (b, p, opp) =>
      (b[opp].buffs.allStatDown = Math.max(
        0,
        b[p].stats.server - (b[p].buffs.allStatDown || 0)
      )),
  },
  {
    id: "b1",
    name: "完璧なブロック",
    type: "block",
    cost: 2,
    desc: "相手のアタックダメージを反射",
    img: "/images/pblock.png",
    effect: (b, p) => (b[p].buffs.reflect = true),
  },
  {
    id: "b2",
    name: "ブロック",
    type: "block",
    cost: 0,
    desc: "受けるダメージ-10(表記は20ですが10です)",
    img: "/images/block.png",
    effect: (b, p) => (b[p].buffs.damageReduction += 10),
  },
  {
    id: "b3",
    name: "三枚ブロック",
    type: "block",
    cost: 1,
    desc: "受けるダメージを半減",
    img: "/images/tblock.png",
    effect: (b, p) => (b[p].buffs.damageHalf = true),
  },

  {
    id: "sp1",
    name: "タイムアウト",
    type: "special",
    cost: 0,
    desc: "デッキからカードを2枚引く",
    img: "/images/timeo.png",
    effect: (b, p) => drawCard(b, p, 2),
  },
  {
    id: "sp2",
    name: "ヨー！ホー！",
    type: "special",
    cost: 0,
    desc: "自分のHPを20回復",
    img: "/images/yoho.png",
    effect: (b, p) => (b[p].hp = Math.min(150, b[p].hp + 20)),
  },
  {
    id: "sp3",
    name: "諦めない心",
    type: "special",
    cost: 0,
    desc: "自身のマナ+1",
    img: "/images/akira.png",
    effect: (b, p) => (b[p].mana += 1),
  },
  {
    id: "sp4",
    name: "精神攻撃",
    type: "special",
    cost: 0,
    desc: "敵のHP-10",
    img: "/images/kou.png",
    effect: (b, p, opp) => {
      b[opp].hp -= 10;
      b.damageText = { val: 10, pos: opp === "p1" ? "bottom" : "top" };
    },
  },
  {
    id: "sp5",
    name: "落とさない気持ち",
    type: "special",
    cost: 1,
    desc: "一ターンの間、使用マナを1だけ下げる",
    img: "/images/oto.png",
    effect: (b, p) => (b[p].buffs.manaDiscount += 1),
  },
  {
    id: "sp6",
    name: "ブロックサーチ",
    type: "special",
    cost: 0,
    desc: "デッキからブロックカードを1枚引く",
    img: "/images/bsearch.png",
    effect: (b, p) => {
      const idx = b[p].deck.findIndex((c) => c.type === "block");
      if (idx !== -1) b[p].hand.push(b[p].deck.splice(idx, 1)[0]);
    },
  },
  {
    id: "sp7",
    name: "アタックサーチ",
    type: "special",
    cost: 0,
    desc: "デッキからアタッカーカードを1枚引く",
    img: "/images/asearch.png",
    effect: (b, p) => {
      const idx = b[p].deck.findIndex((c) => c.type === "attacker");
      if (idx !== -1) b[p].hand.push(b[p].deck.splice(idx, 1)[0]);
    },
  },
  {
    id: "sp8",
    name: "トスサーチ",
    type: "special",
    cost: 0,
    desc: "デッキからトサーカードを1枚引く",
    img: "/images/tsearch.png",
    effect: (b, p) => {
      const idx = b[p].deck.findIndex((c) => c.type === "tosser");
      if (idx !== -1) b[p].hand.push(b[p].deck.splice(idx, 1)[0]);
    },
  },
  {
    id: "sp9",
    name: "サーブサーチ",
    type: "special",
    cost: 0,
    desc: "デッキからサーバーカードを1枚引く",
    img: "/images/ssearch.png",
    effect: (b, p) => {
      const idx = b[p].deck.findIndex((c) => c.type === "server");
      if (idx !== -1) b[p].hand.push(b[p].deck.splice(idx, 1)[0]);
    },
  },
  {
    id: "sp10",
    name: "同行【アカンパニー】",
    type: "special",
    cost: 1,
    desc: "墓地からランダムに1枚回収する",
    img: "/images/retrieve.png",
    effect: (b, p) => {
      if (b[p].discard.length > 0) {
        const idx = Math.floor(Math.random() * b[p].discard.length);
        b[p].hand.push(b[p].discard.splice(idx, 1)[0]);
      }
    },
  },
  {
    id: "sp11",
    name: "おろそかな足元",
    type: "special",
    cost: 0,
    desc: "相手の手札をランダムに1枚破壊",
    img: "/images/destroy.png",
    effect: (b, p, opp) => {
      if (b[opp].hand.length > 0) {
        const idx = Math.floor(Math.random() * b[opp].hand.length);
        b[opp].discard.push(b[opp].hand.splice(idx, 1)[0]);
      }
    },
  },
  {
    id: "sp12",
    name: "二回行動",
    type: "special",
    cost: 2,
    desc: "このフェーズで2枚固有カードを使える",
    img: "/images/double.png",
    // ★ true ではなく、1（回数を追加）にする
    // もし「このカード使用後、さらに2枚使える」にしたいなら 2 にしてください。
    effect: (b, p) => {
      b[p].buffs.doubleAction = 1;
    },
  },
  {
    id: "sp13",
    name: "ポカリスエット",
    type: "special",
    cost: 0,
    desc: "三ターンの間HPを10回復",
    img: "/images/regen.png",
    effect: (b, p) => (b[p].buffs.regen = 3),
  },
];

const DEFAULT_DECK_IDS = [
  "a1",
  "a2",
  "a4",
  "a3",
  "t1",
  "t2",
  "t3",
  "t6",
  "s1",
  "s4",
  "s5",
  "s6",
  "b1",
  "b2",
  "sp1",
  "sp1",
  "sp2",
  "sp3",
  "sp4",
  "sp13",
];

const SERVE_DECK_IDS = [
  "a2",
  "a2",
  "t2",
  "t2",
  "s1",
  "s1",
  "s4",
  "s4",
  "s5",
  "s5",
  "sp9",
  "sp9",
  "sp1",
  "sp1",
  "b2",
  "sp2",
  "sp2",
  "sp3",
  "b1",
  "b2",
];

const TOSS_DECK_IDS = [
  "t1",
  "t2",
  "t2",
  "t3",
  "t3",
  "t4",
  "t6",
  "t6",
  "a1",
  "a2",
  "s5",
  "s6",
  "b1",
  "b1",
  "b2",
  "sp1",
  "sp2",
  "sp8",
  "sp8",
  "sp13",
];

const ATTACK_DECK_IDS = [
  "a2",
  "a2",
  "a4",
  "a4",
  "a6",
  "t2",
  "t3",
  "s1",
  "s6",
  "sp7",
  "sp7",
  "sp13",
  "sp1",
  "b1",
  "b1",
  "b2",
  "b3",
  "sp1",
  "sp2",
  "sp2",
];

const CPU_DECKS = {
  server: SERVE_DECK_IDS,
  attacker: ATTACK_DECK_IDS,
  tosser: TOSS_DECK_IDS,
  balance: DEFAULT_DECK_IDS,
};

const CPU_STAGE_NAMES = {
  server: "サーバー特化型",
  attacker: "アタッカー特化型",
  tosser: "トサー特化型",
  balance: "バランス型",
};

const getEndlessRandomStage = () => {
  const keys = Object.keys(CPU_STAGE_NAMES);
  return keys[Math.floor(Math.random() * keys.length)];
};

const createInitialDeck = (ids) =>
  ids.map((id) => ({
    ...CARD_LIST.find((c) => c.id === id),
    uid: Math.random().toString(36).substr(2, 9),
  }));
const shuffle = (array) => {
  let currentIndex = array.length,
    randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
};

// --- Firebase State Hydration ---
const cleanCardData = (cards) =>
  cards ? cards.map((c) => ({ id: c.id, uid: c.uid })) : [];
const hydrateCards = (cards) =>
  cards
    ? cards.map((c) => ({
        ...CARD_LIST.find((cl) => cl.id === c.id),
        uid: c.uid,
      }))
    : [];

const hydrateBattle = (b) => {
  if (!b) return null;
  let nb = cloneBattle(b);
  nb.p1.hand = hydrateCards(nb.p1.hand);
  nb.p1.deck = hydrateCards(nb.p1.deck);
  nb.p1.discard = hydrateCards(nb.p1.discard);
  nb.p2.hand = hydrateCards(nb.p2.hand);
  nb.p2.deck = hydrateCards(nb.p2.deck);
  nb.p2.discard = hydrateCards(nb.p2.discard);
  if (nb.actionCard)
    nb.actionCard = {
      ...CARD_LIST.find((cl) => cl.id === nb.actionCard.id),
      uid: nb.actionCard.uid,
    };
  if (nb.activeSpecialCard)
    nb.activeSpecialCard = {
      ...CARD_LIST.find((cl) => cl.id === nb.activeSpecialCard.id),
      uid: nb.activeSpecialCard.uid,
    };
  if (nb.hiddenTossCard)
    nb.hiddenTossCard = {
      ...CARD_LIST.find((cl) => cl.id === nb.hiddenTossCard.id),
      uid: nb.hiddenTossCard.uid,
    };
  if (nb.hiddenAttackCard)
    nb.hiddenAttackCard = {
      ...CARD_LIST.find((cl) => cl.id === nb.hiddenAttackCard.id),
      uid: nb.hiddenAttackCard.uid,
    };
  return nb;
};

// --- Helper Functions ---
const clonePlayer = (p) => ({
  ...p,
  stats: { ...p.stats },
  buffs: { ...p.buffs },
  deck: p.deck ? [...p.deck] : [],
  hand: p.hand ? [...p.hand] : [],
  discard: p.discard ? [...p.discard] : [],
});

const cloneBattle = (b) => {
  if (!b) return null;
  return {
    ...b,
    p1: clonePlayer(b.p1),
    p2: clonePlayer(b.p2),
    usedCardThisPhase: { ...b.usedCardThisPhase },
    damageText: b.damageText ? { ...b.damageText } : null,
  };
};

const drawCard = (b, pKey, count) => {
  for (let i = 0; i < count; i++) {
    if (b[pKey].deck.length === 0) {
      if (b[pKey].discard.length === 0) break;
      b[pKey].deck = shuffle([...b[pKey].discard]);
      b[pKey].discard = [];
    }
    b[pKey].hand.push(b[pKey].deck.pop());
  }
};

const resetTurnBuffs = (player) => {
  player.buffs.attackAdd = 0;
  player.buffs.attackMul = 1;
  player.buffs.tossAdd = 0;
  player.buffs.tossMul = 1;
  player.buffs.manaCostUp = 0;
  player.buffs.manaDiscount = 0;
  player.buffs.pierce = false;
  player.buffs.reflect = false;
  player.buffs.damageHalf = false;
  player.buffs.damageReduction = 0;
  player.buffs.fixedDamage = 0;
  player.buffs.allStatDown = 0; // ★これを追加
};

const getBallPosStyle = (pos) => {
  const p = {
    "p1-tosser": { top: "65%", left: "20%" },
    "p1-server": { top: "85%", left: "50%" },
    "p1-attacker": { top: "65%", left: "80%" },
    "p2-attacker": { top: "35%", left: "20%" },
    "p2-server": { top: "15%", left: "50%" },
    "p2-tosser": { top: "35%", left: "80%" },
    center: { top: "50%", left: "50%" },
  };
  const coord = p[pos] || p["center"];
  return {
    top: coord.top,
    left: coord.left,
    transform: "translate(-50%, -50%)",
  };
};

const getAvatarImgByType = (type) =>
  type === "attacker"
    ? ASSETS.avatar_a
    : type === "tosser"
    ? ASSETS.avatar_t
    : ASSETS.avatar_s;
const getCutoutImgByType = (type) =>
  type === "attacker"
    ? ASSETS.cutout_a
    : type === "tosser"
    ? ASSETS.cutout_t
    : ASSETS.cutout_s;

// --- Components ---
const CardUI = ({
  card,
  disabled,
  isEnemy,
  compact,
  highlight,
  onPointerDown,
  onPointerOver,
  onPointerOut,
  faceDown,
  extraClasses,
  effectiveCost, // ★ 追加：変動後の実際のコストを受け取る
}) => {
  if (isEnemy || faceDown) {
    return (
      <div
        className={`
    relative bg-slate-900 rounded-lg border-2 overflow-hidden select-none transition-all
    ${
      disabled
        ? "border-slate-600 cursor-not-allowed"
        : "border-slate-400 cursor-grab hover:ring-4 hover:ring-yellow-400 hover:shadow-[0_0_20px_rgba(250,204,21,0.8)]"
    }
    ${
      highlight
        ? "ring-4 ring-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.8)] transform scale-105"
        : "shadow-[0_8px_15px_rgba(0,0,0,0.6)]"
    }
    ${
      compact
        ? "w-16 h-24 m-0.5 text-[9px]"
        : "w-24 h-36 sm:w-32 sm:h-48 mx-1 mb-1 text-xs"
    }
    flex-shrink-0 ${extraClasses || ""}
`}
      >
        <img
          src="/images/card_back.png"
          alt="Card Back"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
      </div>
    );
  }
  if (!card) return null;

  // ★ 追加：実際のコストを計算し、色を決める
  const displayCost = effectiveCost !== undefined ? effectiveCost : card.cost;
  const isCostUp = displayCost > card.cost;
  const isCostDown = displayCost < card.cost;

  // コストが上がっていれば赤色、下がっていれば緑色、通常は白色
  let costTextColor = "text-white";
  if (isCostUp)
    costTextColor = "text-red-400 drop-shadow-[0_0_5px_rgba(248,113,113,0.8)]";
  if (isCostDown)
    costTextColor = "text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.8)]";

  return (
    <div
      onPointerDown={!disabled ? onPointerDown : undefined}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      className={`
                relative bg-slate-900 rounded-lg border-2 border-slate-400 shadow-[0_8px_15px_rgba(0,0,0,0.6)] overflow-hidden select-none transition-all
                ${
                  disabled
                    ? "brightness-75 cursor-not-allowed"
                    : "cursor-grab touch-none"
                }
                ${
                  highlight
                    ? "ring-4 ring-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.8)]"
                    : ""
                }
                ${
                  compact
                    ? "w-16 h-24 m-0.5 text-[9px]"
                    : "w-24 h-36 sm:w-32 sm:h-48 mx-1 mb-1 text-xs"
                }
                flex-shrink-0 ${extraClasses || ""}
            `}
    >
      <img
        src={card.img}
        alt={card.name}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-100"
      />
      {/* ★ 変更：costTextColor と displayCost を使うように修正 */}
      <div
        className={`absolute top-1 right-1 bg-gradient-to-br from-blue-500 to-indigo-900 ${costTextColor} rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center font-black text-[12px] sm:text-[14px] shadow-xl border-2 border-cyan-300 z-10 transition-colors`}
      >
        {displayCost}
      </div>
    </div>
  );
};

// --- タイトル画面 ---
function TitleScreen({ onStart }) {
  return (
    // 画面全体をタップ可能にし、文字を下部に配置(justify-end, pb-24)
    <div
      onClick={onStart}
      className="w-full h-[100dvh] flex flex-col items-center justify-end pb-24 bg-black relative cursor-pointer"
    >
      {/* ★ 既に作成済みのタイトル画像がある場合は、
        以下の url(...) の部分をご自身の画像パス（例: '/images/my_title.png' など）に変更してください
      */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/syugio.png')" }}
      ></div>

      {/* 「タップして始める」テキスト */}
      <div className="z-10 animate-pulse text-xl sm:text-2xl font-black tracking-widest drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] text-white bg-black/40 px-8 py-2 rounded-full border border-white/20">
        タップして始める
      </div>
    </div>
  );
}
// --- メニュー画面 ---
function MenuScreen({
  onOpenMatchmaking,
  onOpenCpuSelect,
  onSelectEndless,
  onOpenDeck,
  onOpenRules,
  onShowRanking,
  onBack,
}) {
  return (
    <div className="w-full h-[100dvh] flex flex-col items-center justify-end bg-black relative pb-10 px-6">
      {/* ① タイトルと同じ背景画像を設定（少し暗くしてUIを目立たせる） */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-50"
        style={{ backgroundImage: `url(${ASSETS.bg})` }}
      ></div>
      {/* 背景をさらに馴染ませるための黒グラデーション */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>

      <div className="z-10 w-full max-w-sm flex flex-col items-center mt-[40vh]">
        {/* メインの3ボタン（黒背景＋ゴールド枠＋輝く文字） */}
        <div className="w-full flex flex-col space-y-4 mb-6">
          <button
            onClick={onOpenCpuSelect}
            className="w-full py-4 bg-black/80 hover:bg-black backdrop-blur-sm rounded-xl text-xl font-black shadow-[0_0_15px_rgba(0,0,0,0.8)] border-2 border-yellow-600/80 hover:border-yellow-400 hover:shadow-[0_0_20px_rgba(234,179,8,0.4)] transition-all active:scale-95 text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-600 flex items-center justify-center tracking-wider"
          >
            CPU戦
          </button>

          <button
            onClick={onOpenMatchmaking}
            className="w-full py-4 bg-black/80 hover:bg-black backdrop-blur-sm rounded-xl text-xl font-black shadow-[0_0_15px_rgba(0,0,0,0.8)] border-2 border-yellow-600/80 hover:border-yellow-400 hover:shadow-[0_0_20px_rgba(234,179,8,0.4)] transition-all active:scale-95 text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-600 flex items-center justify-center tracking-wider"
          >
            PVP
          </button>

          <button
            onClick={onSelectEndless}
            className="w-full py-4 bg-black/80 hover:bg-black backdrop-blur-sm rounded-xl text-xl font-black shadow-[0_0_15px_rgba(0,0,0,0.8)] border-2 border-yellow-600/80 hover:border-yellow-400 hover:shadow-[0_0_20px_rgba(234,179,8,0.4)] transition-all active:scale-95 text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-600 flex items-center justify-center tracking-wider"
          >
            エンドレス
          </button>
        </div>

        {/* サブメニュー（少し抑えめなダークゴールド） */}
        <div className="w-full max-w-md grid grid-cols-3 gap-3 mb-6">
          <button
            onClick={onShowRanking}
            className="py-3 bg-zinc-900/90 hover:bg-black rounded-lg text-sm sm:text-base font-black shadow-md border border-yellow-700/50 hover:border-yellow-500 transition-all active:scale-95 text-yellow-500 flex items-center justify-center"
          >
            ランキング
          </button>
          <button
            onClick={onOpenDeck}
            className="py-3 bg-zinc-900/90 hover:bg-black rounded-lg text-sm sm:text-base font-black shadow-md border border-yellow-700/50 hover:border-yellow-500 transition-all active:scale-95 text-yellow-500 flex flex-col items-center justify-center"
          >
            デッキ作成
          </button>
          <button
            onClick={onOpenRules}
            className="py-3 bg-zinc-900/90 hover:bg-black rounded-lg text-sm sm:text-base font-black shadow-md border border-yellow-700/50 hover:border-yellow-500 transition-all active:scale-95 text-yellow-500 flex flex-col items-center justify-center"
          >
            ？
          </button>
        </div>

        {/* 戻るボタン */}
        <button
          onClick={onBack}
          className="text-zinc-400 hover:text-yellow-400 font-bold underline p-2 transition"
        >
          タイトルへ戻る
        </button>
      </div>
    </div>
  );
}

function MatchmakingScreen({ onJoinRoom, onBack }) {
  const [roomId, setRoomId] = useState("");

  return (
    <div className="w-full h-[100dvh] flex flex-col items-center justify-center bg-slate-950 p-6 relative">
      <h2 className="text-3xl font-black mb-6 text-red-400">ONLINE MATCH</h2>
      <div className="w-full max-w-sm bg-slate-900 p-6 rounded-xl border border-slate-700 space-y-4">
        <div>
          <label className="text-sm font-bold text-slate-300">
            Room IDを入力
          </label>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="w-full mt-2 p-3 bg-slate-800 text-white rounded outline-none focus:ring-2 focus:ring-red-500"
            placeholder="例: 1234"
          />
        </div>
        <button
          onClick={() => onJoinRoom(roomId)}
          disabled={!roomId}
          className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-black rounded-lg disabled:opacity-50"
        >
          入室 / 作成
        </button>
        <button
          onClick={onBack}
          className="w-full py-2 text-slate-400 hover:text-white underline text-sm"
        >
          戻る
        </button>
      </div>
    </div>
  );
}

function WaitingRoomScreen({ roomId, onCancel }) {
  return (
    <div className="w-full h-[100dvh] flex flex-col items-center justify-center bg-slate-950 p-6 relative">
      <h2 className="text-3xl font-black mb-6 text-red-400 animate-pulse">
        WAITING FOR OPPONENT...
      </h2>
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 text-center w-full max-w-sm">
        <p className="text-slate-300 mb-2">Room ID</p>
        <p className="text-4xl font-black text-white tracking-widest mb-6">
          {roomId}
        </p>
        <p className="text-sm text-slate-400 mb-6">
          対戦相手がこのIDを入力するのを待っています...
        </p>
        <button
          onClick={onCancel}
          className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg w-full font-bold"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

function RankingScreen({ onBack }) {
  const [rankings, setRankings] = useState([]);

  useEffect(() => {
    const fetchRankings = async () => {
      const ranksRef = query(
        ref(db, "rankings"),
        orderByChild("level"),
        limitToLast(10)
      );
      const snapshot = await get(ranksRef);
      const data = [];
      snapshot.forEach((child) => {
        data.push(child.val());
      });
      setRankings(data.reverse()); // 降順
    };
    fetchRankings();
  }, []);

  return (
    <div className="w-full h-[100dvh] bg-slate-950 p-6 flex flex-col items-center">
      <h2 className="text-3xl font-black text-yellow-400 mb-6 mt-10">
        ENDLESS RANKING
      </h2>
      <div className="w-full max-w-md bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
        {rankings.length === 0 ? (
          <p className="text-center text-slate-400 p-6">データがありません</p>
        ) : (
          <ul className="divide-y divide-slate-800">
            {rankings.map((r, i) => (
              <li
                key={i}
                className="flex justify-between items-center p-4 text-white font-bold"
              >
                <span>
                  <span className="text-slate-500 mr-2">{i + 1}.</span> {r.name}
                </span>
                <span className="text-yellow-400 text-xl">Lv {r.level}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        onClick={onBack}
        className="mt-8 px-8 py-3 bg-slate-800 text-white font-bold rounded-lg border border-slate-600"
      >
        戻る
      </button>
    </div>
  );
}

function CpuSelectScreen({ onStart, onBack }) {
  const [level, setLevel] = useState(3);
  const [stage, setStage] = useState("balance");

  // 1〜10の配列を用意
  const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return (
    <div className="w-full h-[100dvh] flex flex-col items-center justify-center bg-black p-6 space-y-6 relative">
      {/* ① CPU画面にもタイトルの背景画像を敷く */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: `url(${ASSETS.bg})` }}
      ></div>

      {/* タイトル文字を青から「輝くゴールド」に変更 */}

      {/* CPUレベル選択エリア */}
      <div className="flex flex-col items-center bg-black/70 p-5 rounded-xl border-2 border-yellow-700/50 shadow-[0_0_20px_rgba(0,0,0,0.8)] z-10 w-full max-w-sm">
        <span className="text-yellow-500 font-bold tracking-widest mb-3 text-sm drop-shadow-md">
          CPU LEVEL
        </span>
        <div className="grid grid-cols-5 gap-2 w-full">
          {levels.map((lv) => (
            <button
              key={lv}
              onClick={() => setLevel(lv)}
              className={`h-12 w-full flex items-center justify-center rounded-lg font-black text-xl transition-all border-2 ${
                level === lv
                  ? "bg-gradient-to-b from-yellow-300 to-yellow-600 text-black border-yellow-200 shadow-[0_0_15px_rgba(250,204,21,0.6)] scale-105"
                  : "bg-zinc-900 text-zinc-500 border-zinc-700 hover:bg-zinc-800 hover:border-yellow-700 hover:text-yellow-600"
              }`}
            >
              {lv}
            </button>
          ))}
        </div>
      </div>

      {/* ステージ(デッキ)選択エリア */}
      <div className="flex flex-col items-center bg-black/70 p-5 rounded-xl border-2 border-red-900/50 shadow-[0_0_20px_rgba(0,0,0,0.8)] z-10 w-full max-w-sm">
        <span className="text-red-500 font-bold tracking-widest mb-3 text-sm drop-shadow-md">
          STAGE (ENEMY DECK)
        </span>
        <div className="grid grid-cols-2 gap-3 w-full">
          {Object.keys(CPU_STAGE_NAMES).map((key) => (
            <button
              key={key}
              onClick={() => setStage(key)}
              className={`py-3 px-2 rounded-lg font-black text-xs sm:text-sm transition-all border-2 ${
                stage === key
                  ? "bg-gradient-to-b from-red-600 to-red-900 text-white border-red-400 shadow-[0_0_15px_rgba(220,38,38,0.6)]"
                  : "bg-zinc-900 text-zinc-500 border-zinc-700 hover:bg-zinc-800 hover:border-red-900 hover:text-red-400"
              }`}
            >
              {CPU_STAGE_NAMES[key]}
            </button>
          ))}
        </div>
      </div>

      {/* ボタン類 */}
      <button
        onClick={() => onStart(level, stage)}
        className="w-full max-w-sm px-6 py-4 bg-gradient-to-b from-yellow-300 via-yellow-500 to-yellow-700 hover:from-yellow-200 hover:to-yellow-600 rounded-xl text-2xl font-black text-black shadow-[0_0_20px_rgba(234,179,8,0.4)] border-2 border-yellow-200 z-10 transition transform hover:scale-105 active:scale-95 tracking-wider mt-4"
      >
        BATTLE START
      </button>

      <button
        onClick={onBack}
        className="text-zinc-400 hover:text-yellow-400 font-bold underline p-2 z-10 transition mt-2"
      >
        戻る
      </button>
    </div>
  );
}

function ResultScreen({ data, onBack, onSubmitScore }) {
  // 名前入力と送信状態を管理するState
  const [playerName, setPlayerName] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!data) {
    return (
      <div className="w-full h-[100dvh] flex items-center justify-center bg-slate-950 text-white text-2xl">
        データを読み込み中、またはデータがありません...
      </div>
    );
  }

  const isWin = data.winner === "p1";
  const endlessLevel = data.endlessLevel || 1;

  // 送信ボタンを押した時の処理
  const handleSubmit = () => {
    if (!playerName.trim() || isSubmitted) return;

    if (onSubmitScore) {
      onSubmitScore(playerName, endlessLevel);
      setIsSubmitted(true); // 送信済みにする
    }
  };

  return (
    <div className="w-full h-[100dvh] flex flex-col items-center justify-center bg-slate-950 p-6 relative">
      <div
        className="absolute inset-0 bg-cover opacity-20 mix-blend-overlay"
        style={{ backgroundImage: `url(${ASSETS?.bg || ""})` }}
      ></div>

      <div className="z-10 flex flex-col items-center space-y-8 animate-fadeIn">
        <h1
          className={`text-7xl sm:text-8xl font-black tracking-widest drop-shadow-[0_0_20px_rgba(0,0,0,0.8)] italic ${
            isWin
              ? "text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600"
              : "text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-800"
          }`}
        >
          {isWin ? "VICTORY" : "GAME OVER"}
        </h1>

        {data.mode === "endless" && (
          <div className="flex flex-col items-center space-y-6">
            <div className="text-2xl font-black text-slate-200 bg-slate-900/80 px-8 py-4 rounded-2xl border-2 border-slate-600 shadow-[0_10px_20px_rgba(0,0,0,0.5)] text-center w-full max-w-md">
              {isWin && endlessLevel === 15 ? (
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 animate-pulse block mb-2">
                  ENDLESS MODE COMPLETE!
                </span>
              ) : (
                <span className="block mb-2">
                  Reached Level:{" "}
                  <span className="text-yellow-400 text-3xl">
                    {endlessLevel}
                  </span>
                </span>
              )}
            </div>

            {/* ★ スコア送信UIエリア */}
            <div className="bg-slate-800/90 p-6 rounded-xl border border-slate-600 w-full max-w-md flex flex-col items-center space-y-4 shadow-lg">
              <h2 className="text-xl font-bold text-white">ランキングに登録</h2>

              {!isSubmitted ? (
                <>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="名前を入力 (10文字以内)"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-500 rounded text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={!playerName.trim()}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white font-bold rounded transition-colors"
                  >
                    スコアを送信する
                  </button>
                </>
              ) : (
                <div className="text-green-400 font-bold text-lg animate-pulse">
                  ※ランキングに記録されました！
                </div>
              )}
            </div>
          </div>
        )}

        {onBack && (
          <button
            onClick={onBack}
            className="mt-8 px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-full transition-colors border-2 border-slate-500"
          >
            タイトルへ戻る
          </button>
        )}
      </div>
    </div>
  );
}

function RuleScreen({ onBack }) {
  return (
    <div className="w-full h-[100dvh] bg-slate-950 p-4 sm:p-6 flex flex-col text-slate-200 relative">
      {/* タイトル */}
      <h2 className="text-3xl font-black text-yellow-400 mb-4 flex-shrink-0 border-b-2 border-slate-700 pb-2">
        📖 ルール説明
      </h2>

      {/* スクロール可能なコンテンツエリア */}
      <div className="space-y-6 text-sm sm:text-base leading-relaxed flex-1 overflow-y-auto pr-2 pb-4">
        {/* 1. 概要と勝利条件 */}
        <section className="bg-slate-900/80 p-4 sm:p-5 rounded-xl border border-slate-700 shadow-md">
          <h3 className="text-lg font-bold text-blue-400 mb-2 border-b border-slate-700 pb-1 flex items-center">
            <span className="mr-2">⚽</span> ゲームの概要
          </h3>
          <p className="mb-4">
            「蹴戯王SHU-GI-OH!」は、セパタクローを題材にした1対1のターン制カードバトルです。
          </p>
          <div className="bg-red-950/40 border border-red-800/50 p-3 rounded-lg flex items-center justify-center animate-pulse">
            <strong className="text-red-400 text-lg sm:text-xl">
              🏆 勝利条件: 相手のHP(150)を0にする
            </strong>
          </div>
        </section>

        {/* 2. デッキ構築と能力値 */}
        <section className="bg-slate-900/80 p-4 sm:p-5 rounded-xl border border-slate-700 shadow-md">
          <h3 className="text-lg font-bold text-green-400 mb-3 border-b border-slate-700 pb-1 flex items-center">
            <span className="mr-2">🃏</span> デッキと能力値
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✔</span>
              <div>
                <strong className="text-yellow-300">デッキ構築:</strong> 計20枚
                <br />
                <span className="text-slate-400 text-xs">
                  （アタッカー/トサー/サーバー/ブロック/特殊カード。一つのカードにつき2枚まで）
                </span>
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✔</span>
              <div>
                <strong className="text-yellow-300">能力値の振り分け:</strong>
                <br />
                「アタッカー」「トサー」「サーバー」の3人に
                <strong className="text-white border-b border-white">
                  合計10のステータス
                </strong>
                を自由に振り分け可能！
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✔</span>
              <div>
                <strong className="text-yellow-300">攻撃力の計算:</strong>
                <br />
                アタッカー能力値 × トサー能力値 ＝ 最終攻撃力
              </div>
            </li>
          </ul>
        </section>

        {/* 3. ターンの流れ */}
        <section className="bg-slate-900/80 p-4 sm:p-5 rounded-xl border border-slate-700 shadow-md">
          <h3 className="text-lg font-bold text-purple-400 mb-2 border-b border-slate-700 pb-1 flex items-center">
            <span className="mr-2">🔄</span> ターンの流れ
          </h3>
          <p className="text-slate-400 text-xs sm:text-sm mb-4">
            ※毎ターンマナが回復し、レシーブを受ける時にカードを1枚引きます。
          </p>

          <div className="space-y-3">
            <div className="bg-slate-800 p-3 rounded-lg border-l-4 border-cyan-500">
              <strong className="text-cyan-400 block mb-1">
                1. サーブ側 (Serve)
              </strong>
              サーブを打つ前に「サーバー固有カード」の使用を宣言できます。
            </div>
            <div className="bg-slate-800 p-3 rounded-lg border-l-4 border-orange-500">
              <strong className="text-orange-400 block mb-1">
                2. レシーブ側 (Toss / Attack)
              </strong>
              トス・アタックの両フェーズで、それぞれ対応する「固有カード」の使用を宣言できます。
            </div>
            <div className="bg-slate-800 p-3 rounded-lg border-l-4 border-pink-500">
              <strong className="text-pink-400 block mb-1">
                3. ブロック (Block)
              </strong>
              レシーブ側がカード選択を終了した後、サーブ側は「ブロックカード」で防御できます。
            </div>
          </div>
          <div className="mt-4 p-2 bg-slate-800/50 rounded text-center text-sm font-bold text-slate-300">
            ▶ 最終的な数値の四則演算によりダメージが決定！
          </div>
        </section>

        {/* 注意事項 */}
        <section className="text-center text-slate-500 text-xs py-2">
          ※変なカードをたくさん入れたので、バグが見つかったら教えてください
        </section>
      </div>

      {/* 戻るボタン (下に固定配置) */}
      <button
        onClick={onBack}
        className="mt-4 w-full py-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-black text-white flex-shrink-0 shadow-lg border border-slate-500 transition active:scale-95 z-10"
      >
        戻る
      </button>
    </div>
  );
} // 必要に応じて

function DeckBuildScreen({
  playerStats,
  setPlayerStats,
  playerDeckIds,
  setPlayerDeckIds,
  onBack,
  onInspectCard,
}) {
  const [localStats, setLocalStats] = useState({ ...playerStats });
  const totalStats =
    localStats.server + localStats.tosser + localStats.attacker;
  const statsRemain = 10 - totalStats;

  const addStat = (type) => {
    if (statsRemain > 0) setLocalStats((s) => ({ ...s, [type]: s[type] + 1 }));
  };
  const subStat = (type) => {
    if (localStats[type] > 0)
      setLocalStats((s) => ({ ...s, [type]: s[type] - 1 }));
  };
  const clearDeck = () => setPlayerDeckIds([]);

  const save = () => {
    if (playerDeckIds.length === 20 && statsRemain === 0) {
      setPlayerStats(localStats);
      onBack();
    }
  };

  const pointerDownTime = useRef(0);
  const pressTimer = useRef(null);

  const handlePointerDown = (c) => {
    pointerDownTime.current = Date.now();
    pressTimer.current = setTimeout(() => onInspectCard(c), 400);
  };
  const handlePointerMove = () => {
    clearTimeout(pressTimer.current);
    pointerDownTime.current = 0;
  };
  const handlePointerUp = (c) => {
    clearTimeout(pressTimer.current);
    if (
      pointerDownTime.current !== 0 &&
      Date.now() - pointerDownTime.current < 400
    ) {
      const count = playerDeckIds.filter((id) => id === c.id).length;
      if (count < 2 && playerDeckIds.length < 20)
        setPlayerDeckIds([...playerDeckIds, c.id]);
      else if (count > 0) {
        const idx = playerDeckIds.indexOf(c.id);
        const newDeck = [...playerDeckIds];
        newDeck.splice(idx, 1);
        setPlayerDeckIds(newDeck);
      }
    }
    pointerDownTime.current = 0;
  };

  return (
    <div className="w-full h-[100dvh] bg-slate-950 flex flex-col text-sm text-white select-none overflow-y-auto pb-8">
      <div className="bg-slate-900/80 backdrop-blur p-3 shadow-lg border-b border-slate-700 flex-shrink-0 sticky top-0 z-20">
        <div className="flex justify-between items-center mb-2 px-2">
          <span className="text-sm text-yellow-400 font-black tracking-wider drop-shadow">
            デッキ編成 ({playerDeckIds.length}/20)
          </span>
          <button
            onClick={clearDeck}
            className="text-xs bg-red-900/80 text-red-100 hover:bg-red-800 border border-red-500 px-4 py-1.5 rounded-full shadow-md font-bold transition active:scale-95"
          >
            全クリア
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 max-w-sm mx-auto bg-slate-950/80 p-2 rounded-xl border border-slate-700 shadow-inner min-h-[70px]">
          {playerDeckIds.map((id, idx) => {
            const card = CARD_LIST.find((c) => c.id === id);
            return (
              <div
                key={idx}
                onClick={() => {
                  const newDeck = [...playerDeckIds];
                  newDeck.splice(idx, 1);
                  setPlayerDeckIds(newDeck);
                }}
                className="w-[18%] aspect-[3/4] rounded-md bg-slate-800 border border-slate-600 flex items-center justify-center relative overflow-hidden group cursor-pointer hover:border-red-400 transition"
              >
                <img
                  src={card.img}
                  alt={card.name}
                  className="absolute inset-0 w-full h-full object-cover opacity-70 pointer-events-none"
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-4 bg-slate-900/50 border-b border-slate-800 flex-shrink-0">
        <div className="flex justify-between items-center mb-3 px-2">
          <span className="text-slate-200 font-bold">
            ステータス振分 (残り:{" "}
            <span
              className={`text-lg font-black ${
                statsRemain === 0
                  ? "text-green-400 drop-shadow-[0_0_5px_green]"
                  : "text-red-400"
              }`}
            >
              {statsRemain}
            </span>
            )
          </span>
        </div>
        <div className="flex justify-around bg-slate-950/60 p-3 rounded-xl border border-slate-700 shadow-inner">
          {["server", "tosser", "attacker"].map((t) => (
            <div key={t} className="flex flex-col items-center">
              {/* 役職名 */}
              <span className="capitalize text-xs text-slate-400 font-black mb-1">
                {t}
              </span>

              {/* 数字 (上に大きく表示) */}
              <span className="font-black text-white text-2xl drop-shadow mb-2">
                {localStats[t]}
              </span>

              {/* ボタン群 (数字の下にマイナスとプラスを配置) */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => subStat(t)}
                  className="w-8 h-8 bg-gradient-to-b from-red-700 to-red-900 text-white rounded-full font-black flex items-center justify-center shadow-lg border border-red-500/50 active:scale-90 transition"
                >
                  -
                </button>
                <button
                  onClick={() => addStat(t)}
                  className="w-8 h-8 bg-gradient-to-b from-blue-600 to-blue-900 text-white rounded-full font-black flex items-center justify-center shadow-lg border border-blue-400/50 active:scale-90 transition"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 text-center px-2 space-y-2">
          <button
            onClick={save}
            disabled={playerDeckIds.length !== 20 || statsRemain !== 0}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-800 disabled:from-slate-800 disabled:to-slate-900 text-white rounded-xl font-black text-base shadow-[0_5px_15px_rgba(0,0,0,0.3)] transition transform active:scale-95 border border-emerald-400/30 disabled:border-slate-700"
          >
            SAVE & EXIT{" "}
            <span className="text-xs font-normal block opacity-80">
              (20枚 & 10Pt必須)
            </span>
          </button>
          <button
            onClick={onBack}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold border border-slate-600 transition"
          >
            CANCEL
          </button>
        </div>
      </div>

      <div className="p-3 bg-slate-950">
        <div className="text-[11px] text-center text-yellow-500/80 mb-4 font-black tracking-widest bg-yellow-900/20 py-1.5 rounded-lg border border-yellow-700/30">
          長押し: 詳細確認 ／ タップ: 着脱
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-w-md mx-auto pb-4">
          {CARD_LIST.map((c) => {
            const count = playerDeckIds.filter((id) => id === c.id).length;
            return (
              <div
                key={c.id}
                className="relative flex flex-col items-center cursor-pointer"
                onPointerDown={() => handlePointerDown(c)}
                onPointerMove={handlePointerMove}
                onPointerUp={() => handlePointerUp(c)}
                onPointerLeave={handlePointerMove}
              >
                <CardUI card={c} compact />
                <div
                  className={`absolute -top-1.5 -right-1.5 w-6 h-6 flex items-center justify-center rounded-full font-black text-sm border-[2px] shadow-lg z-10 pointer-events-none transition-colors
                                  ${
                                    count > 0
                                      ? "bg-yellow-400 text-slate-900 border-white"
                                      : "bg-slate-800 text-slate-400 border-slate-600"
                                  }
                              `}
                >
                  {count}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CutinEffects({ type }) {
  const particles = Array.from({ length: 30 });
  if (type === "leaf")
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-emerald-500/20 animate-pulse mix-blend-screen"></div>
        {particles.map((_, i) => (
          <svg
            key={i}
            className="absolute text-emerald-400 w-10 h-10 fill-current drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]"
            style={{
              left: `-10%`,
              top: `${Math.random() * 100}%`,
              animation: `hurricaneLeaves ${
                0.5 + Math.random()
              }s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
              animationDelay: `${Math.random() * 0.3}s`,
            }}
            viewBox="0 0 24 24"
          >
            <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C8.38,19.3 10.28,18.53 12.44,17.3C18.44,13.8 19.5,8 19.5,8Z" />
          </svg>
        ))}
      </div>
    );
  if (type === "ice")
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-cyan-500/20 animate-pulse mix-blend-screen backdrop-blur-[2px]"></div>
        {particles.map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full shadow-[0_0_15px_rgba(103,232,249,1)]"
            style={{
              width: `${5 + Math.random() * 15}px`,
              height: `${5 + Math.random() * 15}px`,
              left: `${Math.random() * 100}%`,
              top: `-10%`,
              animation: `blizzard ${
                0.6 + Math.random()
              }s cubic-bezier(0.215, 0.61, 0.355, 1) forwards`,
              animationDelay: `${Math.random() * 0.2}s`,
            }}
          />
        ))}
      </div>
    );
  if (type === "fire")
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-red-600/30 animate-pulse mix-blend-screen"></div>
        {particles.map((_, i) => (
          <div
            key={i}
            className="absolute bg-gradient-to-t from-yellow-300 via-orange-500 to-red-600 rounded-full blur-[1px]"
            style={{
              width: `${10 + Math.random() * 30}px`,
              height: `${30 + Math.random() * 60}px`,
              left: `${Math.random() * 100}%`,
              bottom: `-10%`,
              boxShadow: "0 0 20px rgba(239,68,68,0.8)",
              animation: `explosion ${
                0.4 + Math.random() * 0.5
              }s ease-out forwards`,
              animationDelay: `${Math.random() * 0.2}s`,
            }}
          />
        ))}
      </div>
    );
  if (type === "steel")
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-slate-500/20 animate-pulse mix-blend-screen"></div>
        {particles.map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,1)]"
            style={{
              width: `${2 + Math.random() * 6}px`,
              height: `${10 + Math.random() * 40}px`,
              left: `${50 + (Math.random() - 0.5) * 40}%`,
              top: `100%`,
              animation: `spark ${
                0.3 + Math.random() * 0.4
              }s ease-out forwards`,
              animationDelay: `${Math.random() * 0.2}s`,
            }}
          />
        ))}
      </div>
    );
  return null;
}

export default function App() {
  const [screen, setScreen] = useState("title");
  const [mode, setMode] = useState("cpu");
  const [inspectingCard, setInspectingCard] = useState(null);
  const [playerStats, setPlayerStats] = useState({
    server: 3,
    tosser: 3,
    attacker: 4,
  });
  const [playerDeckIds, setPlayerDeckIds] = useState(DEFAULT_DECK_IDS);
  const [hoveredCardIdx, setHoveredCardIdx] = useState(null);
  const [battle, setBattle] = useState(null);
  const [startupPhase, setStartupPhase] = useState("init");
  const [resultData, setResultData] = useState(null);

  const [dragInfo, setDragInfo] = useState(null);
  const [inspectedCard, setInspectedCard] = useState(null);
  const [timeLeft, setTimeLeft] = useState(180);

  // For Online PvP
  const [roomId, setRoomId] = useState(null);
  const [isHost, setIsHost] = useState(true);

  const cpuTimer = useRef(null);

  const globalStyles = `
  /* ↓ 大ダメージ演出用のアニメーション */
  @keyframes epic-slide-in-right { 0% { transform: translateX(100px); opacity: 0; } 10% { transform: translateX(0); opacity: 1; } 90% { transform: translateX(0); opacity: 1; } 100% { transform: translateX(-50px); opacity: 0; } }
  @keyframes epic-slide-in-left { 0% { transform: translateX(-100px); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
  @keyframes epic-clash-left { 0%, 50% { transform: translateX(20px); } 55% { transform: translateX(-50px); } 60%, 100% { transform: translateX(10px); } }
  @keyframes epic-clash-right { 0%, 50% { transform: translateX(-20px); } 55% { transform: translateX(50px); } 60%, 100% { transform: translateX(-10px); } }
  @keyframes epic-number-pop { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(2); opacity: 1; filter: brightness(2); } 100% { transform: scale(1); opacity: 1; filter: brightness(1); } }
    @keyframes soft-drop { 0% { transform: translateY(-30px) scale(1.5); opacity: 0; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
    .animate-soft-drop { animation: soft-drop 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
    @keyframes slide-in-left { 0% { transform: translateX(-50px); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
    @keyframes soft-drop-fan { 0% { transform: translate(30px, -30px) rotate(0deg) scale(1.2); opacity: 0; } 100% { transform: translate(0, 0) rotate(15deg) scale(1); opacity: 1; } }
    @keyframes golden-expand { 0% { transform: scale(0.5); opacity: 0; } 20% { transform: scale(1.2); opacity: 1; } 80% { transform: scale(1.3); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
    @keyframes jump-out { 0% { transform: scale(1) translateY(0); opacity: 1; } 30% { transform: scale(1.6) translateY(-20%); opacity: 1; filter: drop-shadow(0 20px 30px rgba(0,0,0,0.9)); } 80% { transform: scale(1.6) translateY(-20%); opacity: 1; } 100% { transform: scale(2.5) translateY(-50%); opacity: 0; } }
    .animate-jump-out { animation: jump-out 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
    keyframes smash-to-face { 0% { transform: scale(1) translate(-50%, -50%); opacity: 1; } 100% { transform: scale(15) translate(-50%, -50%); opacity: 0; } }
    @keyframes smash-to-enemy { 0% { transform: scale(1) translate(-50%, -50%); opacity: 1; } 100% { transform: scale(0.1) translate(-50%, -400%); opacity: 0; } }
    @keyframes arc-high { 0% { transform: translateY(0); } 50% { transform: translateY(-160px) scale(1.3); } 100% { transform: translateY(0); } }
    .animate-arc-high { animation: arc-high 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
    @keyframes dealAvatarP2 { 0% { transform: translate(300px, 200px) scale(0.2) rotateX(15deg); opacity: 0; } 100% { transform: translate(0, 0) scale(1) rotateX(15deg); opacity: 1; } }
    .avatar-deal-p2 { animation: dealAvatarP2 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; opacity: 0; }
    @keyframes dealAvatarP1 { 0% { transform: translate(-300px, -200px) scale(0.2) rotateX(15deg); opacity: 0; } 100% { transform: translate(0, 0) scale(1) rotateX(15deg); opacity: 1; } }
    .avatar-deal-p1 { animation: dealAvatarP1 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; opacity: 0; }
    @keyframes dealCard { 0% { transform: translate(var(--start-x), var(--start-y)) scale(0.2) rotate(0deg); opacity: 0; } 100% { transform: translate(var(--end-x), var(--end-y)) rotate(var(--end-rot)) scale(1); opacity: 1; } }
    .card-deal { animation: dealCard 0.4s ease-out forwards; opacity: 0; }
    @keyframes slideText { 0% { transform: translateX(100vw) skewX(-15deg); opacity: 0; } 15% { transform: translateX(0) skewX(-15deg); opacity: 1; } 85% { transform: translateX(0) skewX(-15deg); opacity: 1; } 100% { transform: translateX(-100vw) skewX(-15deg); opacity: 0; } }
    .animate-slide-text { animation: slideText 1.5s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
    .court-container { perspective: 1000px; }
    .court-floor { transform: rotateX(15deg) scale(0.98); transform-origin: center center; box-shadow: 0 30px 60px rgba(0,0,0,0.6); border: 4px solid rgba(255,255,255,0.1); }
    .battle-bg { background-image: url('${
      ASSETS.bg
    }'); background-size: cover; background-position: center; }
    .net-pattern { background-image: linear-gradient(45deg, rgba(255,255,255,0.5) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.5) 75%, rgba(255,255,255,0.5)), linear-gradient(45deg, rgba(255,255,255,0.5) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.5) 75%, rgba(255,255,255,0.5)); background-size: 12px 12px; background-position: 0 0, 6px 6px; }
    .fan-card { transition: transform 0.15s ease-out, z-index 0s; }
    @keyframes hurricaneLeaves { 0% { transform: translateX(0) rotate(0deg) scale(0); opacity: 0; } 20% { opacity: 1; scale: 1.5; } 100% { transform: translateX(120vw) rotate(720deg) scale(1); opacity: 0; } }
    @keyframes blizzard { 0% { transform: translateY(0) scale(0); opacity: 0; } 20% { opacity: 1; } 100% { transform: translateY(120vh) translateX(-20vw) scale(1); opacity: 0; } }
    @keyframes explosion { 0% { transform: translateY(0) scale(0.5); opacity: 0; } 30% { opacity: 1; scale: 2; } 100% { transform: translateY(-100vh) scale(0); opacity: 0; } }
    @keyframes spark { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-80vh) rotate(${
      (Math.random() - 0.5) * 45
    }deg) scale(0); opacity: 0; } }
    @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
    .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
  `;

  // --- Battle Logic ---
  const initBattle = (
    gameMode,
    cLevel = 3,
    cStage = "balance",
    overrideState = null
  ) => {
    if (overrideState) {
      setBattle(hydrateBattle(overrideState));
      setScreen("battle");
      setStartupPhase("ready");
      return;
    }

    const finalStage =
      gameMode === "endless" ? getEndlessRandomStage() : cStage;
    const p1Stats = { ...playerStats };
    const p2Stats =
      gameMode === "cpu" || gameMode === "endless"
        ? { server: cLevel, tosser: cLevel, attacker: cLevel }
        : { server: 3, tosser: 3, attacker: 4 };
    const p2DeckIds =
      gameMode === "cpu" || gameMode === "endless"
        ? CPU_DECKS[finalStage]
        : DEFAULT_DECK_IDS;

    const b = {
      mode: gameMode,
      endlessLevel: gameMode === "endless" ? cLevel : 0,
      turn: 1,
      serverSide: "p1",
      currentPhase: "serve",
      activePlayer: "p1",
      usedCardThisPhase: { specific: false, special: false },

      p1: {
        hp: 150,
        mana: 1,
        stats: p1Stats,
        deck: shuffle(createInitialDeck(playerDeckIds)),
        hand: [],
        discard: [],
        buffs: {},
      },
      p2: {
        hp: 150,
        mana: 0,
        stats: p2Stats,
        deck: shuffle(createInitialDeck(p2DeckIds)),
        hand: [],
        discard: [],
        buffs: {},
      },

      seq: "idle",
      actionCard: null,
      activeSpecialCard: null,

      hiddenTossCard: null,
      hiddenAttackCard: null,
      revealHiddenCards: false,

      ballPos: "p1-server",
      ballTrajectory: "none",
      ballKey: 0,

      shake: false,
      isSmashingFace: false,
      isSmashingEnemy: false,
      scheduledDamage: 0,
      winner: null,
      damageText: null,

      phaseTextKey: Math.random(),
    };

    resetTurnBuffs(b.p1);
    resetTurnBuffs(b.p2);

    setBattle(b);
    setScreen("battle");
    setStartupPhase("init");
    setTimeLeft(180);

    setTimeout(() => setStartupPhase("avatars_p2"), 1000);
    setTimeout(() => setStartupPhase("avatars_p1"), 2500);
    setTimeout(() => {
      setBattle((prev) => {
        let nb = cloneBattle(prev);
        drawCard(nb, "p1", 5);
        drawCard(nb, "p2", 5);
        return nb;
      });
      setStartupPhase("hands");
    }, 4000);
    setTimeout(() => {
      setStartupPhase("ready");
      if (gameMode === "pvp" && isHost) syncBattleToFirebase(battle);
    }, 5500);
  };

  const handleJoinRoom = async (inputRoomId) => {
    setRoomId(inputRoomId);
    setMode("pvp");
    const roomRef = ref(db, `rooms/${inputRoomId}`);
    const snapshot = await get(roomRef);
    if (snapshot.exists()) {
      // 部屋がある場合は参加フラグを立てて待機画面へ（ホストの初期化を待つ）
      setIsHost(false);
      await update(roomRef, { player2Joined: true });
      setScreen("waitingRoom");
    } else {
      // 部屋がない場合は作成して待機画面へ
      setIsHost(true);
      await set(roomRef, { created: true });
      setScreen("waitingRoom");
    }
  };

  // PvPマッチング待機用の処理
  useEffect(() => {
    if (screen === "waitingRoom" && roomId) {
      const roomRef = ref(db, `rooms/${roomId}`);
      const unsub = onValue(roomRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          if (isHost && data.player2Joined && !data.battle) {
            // 相手が参加したらホストがバトルを初期化してスタート
            initBattle("pvp");
          } else if (!isHost && data.battle) {
            // ホストがバトルデータを書き込んだらゲストもスタート
            setBattle(hydrateBattle(data.battle));
            setScreen("battle");
            setStartupPhase("ready");
          }
        }
      });
      return () => unsub();
    }
  }, [screen, roomId, isHost]);

  const syncBattleToFirebase = (b) => {
    if (mode !== "pvp" || !roomId) return;
    // 関数を取り除いたクリーンな状態を送信
    const cleanState = cloneBattle(b);
    cleanState.p1.hand = cleanCardData(cleanState.p1.hand);
    cleanState.p1.deck = cleanCardData(cleanState.p1.deck);
    cleanState.p1.discard = cleanCardData(cleanState.p1.discard);
    cleanState.p2.hand = cleanCardData(cleanState.p2.hand);
    cleanState.p2.deck = cleanCardData(cleanState.p2.deck);
    cleanState.p2.discard = cleanCardData(cleanState.p2.discard);
    if (cleanState.actionCard)
      cleanState.actionCard = {
        id: cleanState.actionCard.id,
        uid: cleanState.actionCard.uid,
      };
    if (cleanState.activeSpecialCard)
      cleanState.activeSpecialCard = {
        id: cleanState.activeSpecialCard.id,
        uid: cleanState.activeSpecialCard.uid,
      };

    update(ref(db, `rooms/${roomId}`), { battle: cleanState });
  };

  // ----------------------------------------------------
  // ★ 追加：HPを監視して勝敗（次のステージ）を決めるレフェリー処理
  // ----------------------------------------------------
  useEffect(() => {
    // バトルが始まっていない、または既に勝敗が決まっている場合は何もしない
    if (!battle || battle.winner) return;

    if (battle.p2.hp <= 0) {
      // 敵のHPが0以下になったら「next_stage」状態にする！
      // （これがトリガーとなって、先ほど作った1.5秒後のリセット処理が走ります）
      setBattle((prev) => {
        let nb = cloneBattle(prev);
        nb.winner = "next_stage";
        return nb;
      });
    } else if (battle.p1.hp <= 0) {
      // プレイヤーのHPが0以下になったらゲームオーバー（敵の勝ち）
      setBattle((prev) => {
        let nb = cloneBattle(prev);
        nb.winner = "p2";
        return nb;
      });
    }
  }, [battle?.p1.hp, battle?.p2.hp, battle?.winner]);
  // Firebase Listener for PvP
  useEffect(() => {
    if (mode === "pvp" && roomId && screen === "battle") {
      const roomRef = ref(db, `rooms/${roomId}/battle`);
      const unsub = onValue(roomRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          if (
            (isHost && data.activePlayer === "p2") ||
            (!isHost && data.activePlayer === "p1")
          ) {
            setBattle(hydrateBattle(data));
          }
        }
      });
      return () => unsub();
    }
  }, [mode, roomId, screen, isHost]);

  const calculateCost = (b, pKey, card) =>
    Math.max(
      0,
      card.cost - b[pKey].buffs.manaDiscount + (b[pKey].buffs.manaCostUp || 0)
    );

  const canPlayCard = (b, pKey, card) => {
    if (
      !b ||
      b.activePlayer !== pKey ||
      startupPhase !== "ready" ||
      b.seq !== "idle"
    )
      return false;
    if (b.winner) return false;
    if (calculateCost(b, pKey, card) > b[pKey].mana) return false;

    // ★修正：特殊カード(special)なら無条件で使える(true)ように変更！
    if (card.type === "special") return true;

    // ★ 修正：すでにカードを使っていて、かつ二回行動バフの残り回数がないなら使えない
    if (b.usedCardThisPhase.specific && b[pKey].buffs.doubleAction <= 0) {
      return false;
    }

    if (b.currentPhase === "serve" && card.type === "server") return true;
    if (b.currentPhase === "toss" && card.type === "tosser") return true;
    if (b.currentPhase === "attack" && card.type === "attacker") return true;
    if (b.currentPhase === "damageDeal" && card.type === "block") return true;

    return false;
  };

  const startActionSequence = (pKey, cardIndex) => {
    let b = cloneBattle(battle);
    let playedCard = null;

    if (cardIndex !== null) {
      playedCard = b[pKey].hand[cardIndex];
      b[pKey].mana -= calculateCost(b, pKey, playedCard);
      b[pKey].hand.splice(cardIndex, 1);
      b[pKey].discard.push(playedCard);

      if (playedCard.type === "special") {
        // =========================================================
        // 特殊カード（「二回行動」など）を使った時の処理
        // ※ここではバフの消費はせず、効果（バフ付与など）だけを発動する
        // =========================================================
        playedCard.effect(b, pKey, pKey === "p1" ? "p2" : "p1");
        if (pKey === "p1") {
          b.activeSpecialCard = playedCard;
          setTimeout(
            () => setBattle((prev) => ({ ...prev, activeSpecialCard: null })),
            1500
          );
        }
        setBattle(b);
        syncBattleToFirebase(b);
        return;
      } else {
        // =========================================================
        // 固有カード（攻撃など）を使った時の処理
        // ★ ここでバフの消費、または使用済みフラグを立てる！
        // =========================================================
        if (b.usedCardThisPhase.specific && b[pKey].buffs.doubleAction > 0) {
          b[pKey].buffs.doubleAction -= 1; // 二回行動バフを1回消費
        } else {
          b.usedCardThisPhase.specific = true; // 1枚目の使用フラグ
        }

        playedCard.effect(b, pKey, pKey === "p1" ? "p2" : "p1");
        if (pKey === "p2") {
          if (b.currentPhase === "toss") b.hiddenTossCard = playedCard;
          if (b.currentPhase === "attack") b.hiddenAttackCard = playedCard;
        }
      }
    }

    b.actionCard = playedCard;

    if (b.currentPhase === "damageDeal") {
      b.seq = playedCard ? "cutin_block" : "action_short";
    } else if (pKey === "p2") {
      b.seq = "enemy_action";
    } else {
      b.seq = playedCard ? "cutin" : "cutin_short";
    }

    setBattle(b);
    syncBattleToFirebase(b);
  };

  const processImpact = (b) => {
    if (b.currentPhase === "attack") {
      const atkPlayer = b[b.activePlayer];
      const statAttacker = Math.max(
        0,
        atkPlayer.stats.attacker - (atkPlayer.buffs.allStatDown || 0)
      );
      const statTosser = Math.max(
        0,
        atkPlayer.stats.tosser - (atkPlayer.buffs.allStatDown || 0)
      );

      let dmg =
        (statAttacker + atkPlayer.buffs.attackAdd) *
        atkPlayer.buffs.attackMul *
        (statTosser + atkPlayer.buffs.tossAdd) *
        atkPlayer.buffs.tossMul;

      if (atkPlayer.buffs.fixedDamage > 0) dmg = atkPlayer.buffs.fixedDamage;
      b.scheduledDamage = dmg;
    } else if (b.currentPhase === "damageDeal") {
      const defKey = b.activePlayer;
      const atkKey = defKey === "p1" ? "p2" : "p1";
      const defPlayer = b[defKey];
      const atkPlayer = b[atkKey];

      let finalDmg = b.scheduledDamage;
      let reflected = false;

      if (!atkPlayer.buffs.pierce) {
        if (defPlayer.buffs.reflect) reflected = true;
        else {
          if (defPlayer.buffs.damageHalf)
            finalDmg = Math.max(0, Math.floor(finalDmg / 2));
          finalDmg = Math.max(0, finalDmg - defPlayer.buffs.damageReduction);
        }
      }

      b.revealHiddenCards = true;

      if (reflected) {
        atkPlayer.hp -= b.scheduledDamage;
        b.damageText = {
          val: b.scheduledDamage,
          pos: atkKey === "p1" ? "bottom" : "top",
          msg: "REFLECT!",
        };
        if (b.scheduledDamage > 0)
          atkKey === "p1"
            ? (b.isSmashingFace = true)
            : (b.isSmashingEnemy = true);
      } else {
        defPlayer.hp -= finalDmg;
        b.damageText = {
          val: finalDmg,
          pos: defKey === "p1" ? "bottom" : "top",
        };
        if (finalDmg > 0)
          defKey === "p1"
            ? (b.isSmashingFace = true)
            : (b.isSmashingEnemy = true);
      }
      b.shake = true;
    }
    return b;
  };

  const handlePhaseEnd = (b) => {
    if (b.p1.hp <= 0) {
      b.winner = "p2";
      return b; // HPが0なら、フェーズ進行を行わずにすぐ終わる
    } else if (b.p2.hp <= 0) {
      // ★ 追加：次のステージに行く前に、プレイヤーと敵のバフを綺麗にリセットする！
      resetTurnBuffs(b.p1);
      resetTurnBuffs(b.p2);
      // 反射バフだけじゃなく、すべてのバフを引き継がないようにします（※もし引き継ぎたいバフがある場合は要調整です）

      if (b.mode === "endless" && b.endlessLevel < 15) {
        b.winner = "next_stage";
      } else {
        b.winner = "p1";
      }
      return b;
    }

    if (b.winner) return b; // 念のためのストッパー
    b.usedCardThisPhase = { specific: false, special: false };
    b.p1.buffs.manaDiscount = 0;
    b.p2.buffs.manaDiscount = 0;
    b.p1.buffs.doubleAction = 0; // ★追加
    b.p2.buffs.doubleAction = 0; // ★追加
    const oppKey = b.serverSide === "p1" ? "p2" : "p1";

    if (b.currentPhase === "serve") {
      if (b.skipToNextTurn) {
        b.currentPhase = "end";
        return handlePhaseEnd(b);
      } else {
        b.currentPhase = "toss";
        b.activePlayer = oppKey;
        drawCard(b, b.activePlayer, 1);
      }
    } else if (b.currentPhase === "toss") {
      b.currentPhase = "attack";
    } else if (b.currentPhase === "attack") {
      b.currentPhase = "damageDeal";
      b.activePlayer = b.serverSide;
      setTimeLeft(30);
    } else if (b.currentPhase === "damageDeal") {
      b.currentPhase = "end";
      return handlePhaseEnd(b);
    } else if (b.currentPhase === "end") {
      b.turn++;
      b.serverSide = b.serverSide === "p1" ? "p2" : "p1";
      b.activePlayer = b.serverSide;
      b.currentPhase = "serve";
      b.skipToNextTurn = false;
      b.scheduledDamage = 0;
      b.hiddenTossCard = null;
      b.hiddenAttackCard = null;
      b.revealHiddenCards = false;

      b.p1.mana = Math.min(10, b.p1.mana + 1);
      b.p2.mana = Math.min(10, b.p2.mana + 1);

      // ★★★ 追加：手札事故による無限ループを防ぐためのドロー ★★★
      drawCard(b, b.activePlayer, 1);
      // ★★★ ここまで ★★★

      if (b.p1.buffs.burn) {
        // ...既存の処理が続く...
        b.p1.hp -= 5;
        b.damageText = { val: 5, pos: "bottom", msg: "BURN!" };
        b.shake = true;
      }
      if (b.p2.buffs.burn) {
        b.p2.hp -= 5;
        b.damageText = { val: 5, pos: "top", msg: "BURN!" };
        b.shake = true;
      }
      if (b.p1.buffs.regen > 0) {
        b.p1.hp = Math.min(150, b.p1.hp + 10);
        b.p1.buffs.regen--;
      }
      if (b.p2.buffs.regen > 0) {
        b.p2.hp = Math.min(150, b.p2.hp + 10);
        b.p2.buffs.regen--;
      }

      resetTurnBuffs(b.p1);
      resetTurnBuffs(b.p2);

      b.ballPos = `${b.activePlayer}-server`;
      b.ballTrajectory = "none";
      setTimeLeft(180);
    }

    b.phaseTextKey = Math.random();
    return b;
  };

  // --- Sequence Effect System ---
  useEffect(() => {
    if (!battle || battle.winner) return;

    const nextBallSetup = (b) => {
      let nextBallPos = b.ballPos;
      let nextTraj = "none";
      const oppKey = b.activePlayer === "p1" ? "p2" : "p1";

      if (b.currentPhase === "serve") {
        nextBallPos = `${oppKey}-tosser`;
        nextTraj = "sharp";
      } else if (b.currentPhase === "toss") {
        nextBallPos = `${b.activePlayer}-attacker`;
        nextTraj = "high";
      } else if (b.currentPhase === "attack") {
        nextBallPos = `center`;
        nextTraj = "sharp";
      }
      return { nextBallPos, nextTraj };
    };

    if (battle.seq === "cutin") {
      const t = setTimeout(() => {
        const { nextBallPos, nextTraj } = nextBallSetup(battle);
        setBattle((prev) => ({
          ...prev,
          seq: "action",
          ballPos: nextBallPos,
          ballTrajectory: nextTraj,
          ballKey: Math.random(),
        }));
      }, 3200);
      return () => clearTimeout(t);
    }

    if (battle.seq === "cutin_short") {
      const t = setTimeout(() => {
        const { nextBallPos, nextTraj } = nextBallSetup(battle);
        setBattle((prev) => ({
          ...prev,
          seq: "action_short",
          ballPos: nextBallPos,
          ballTrajectory: nextTraj,
          ballKey: Math.random(),
        }));
      }, 800);
      return () => clearTimeout(t);
    }

    if (battle.seq === "cutin_block") {
      const t = setTimeout(() => {
        setBattle((prev) => ({ ...prev, seq: "reveal" }));
      }, 1200);
      return () => clearTimeout(t);
    }

    if (battle.seq === "enemy_action") {
      const t = setTimeout(() => {
        const { nextBallPos, nextTraj } = nextBallSetup(battle);
        setBattle((prev) => ({
          ...prev,
          seq: "action_short",
          ballPos: nextBallPos,
          ballTrajectory: nextTraj,
          ballKey: Math.random(),
        }));
      }, 1000);
      return () => clearTimeout(t);
    }

    if (battle.seq === "action" || battle.seq === "action_short") {
      const isDamageDeal = battle.currentPhase === "damageDeal";
      const t = setTimeout(
        () => {
          if (isDamageDeal) {
            setBattle((prev) => ({
              ...prev,
              seq: "reveal",
              revealHiddenCards: true,
            }));
          } else {
            setBattle((prev) => ({ ...prev, seq: "impact" }));
          }
        },
        battle.seq === "action" ? 800 : 400
      );
      return () => clearTimeout(t);
    }

    if (battle.seq === "reveal") {
      const t = setTimeout(
        () => {
          setBattle((prev) => ({ ...prev, seq: "impact" }));
        },
        battle.scheduledDamage > 25 ? 5000 : 800
      );
      return () => clearTimeout(t);
    }

    // ★ ここから
    if (battle.seq === "impact") {
      let nextB = processImpact(cloneBattle(battle));
      setBattle(nextB);
      const t = setTimeout(() => {
        setBattle((prev) => {
          if (!prev) return null;
          let endB = cloneBattle(prev);
          endB.seq = "idle";
          endB.shake = false;
          endB.damageText = null;
          if (endB.winner) return endB;

          // =========================================================
          // ★ 修正ポイント：二回行動のストッパーをここに入れる！
          // 現在操作しているプレイヤー（activePlayer）にバフが残っているか確認
          // =========================================================
          const pKey = endB.activePlayer;
          if (endB[pKey] && endB[pKey].buffs.doubleAction > 0) {
            // バフが残っている場合は、フェーズを進めずに（idle状態で）待つ
            syncBattleToFirebase(endB);
            return endB;
          }

          // バフが無い場合は、これまで通り次のフェーズへ進行する
          const resultB = handlePhaseEnd(endB);
          syncBattleToFirebase(resultB);
          return resultB;
        });
      }, 1500);
      return () => clearTimeout(t);
    }
    // ★ ここまで
  }, [battle?.seq]);

  // Result Screen Transition & Endless Ranking Save

  // Timer countdown
  useEffect(() => {
    if (
      screen !== "battle" ||
      !battle ||
      battle.winner ||
      battle.seq !== "idle" ||
      startupPhase !== "ready"
    )
      return;
    if (
      mode === "pvp" &&
      ((isHost && battle.activePlayer !== "p1") ||
        (!isHost && battle.activePlayer !== "p2"))
    )
      return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          startActionSequence(battle.activePlayer, null);
          return battle.currentPhase === "damageDeal" ? 30 : 180;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [
    screen,
    battle?.currentPhase,
    battle?.activePlayer,
    battle?.seq,
    startupPhase,
    mode,
    isHost,
  ]);

  // Auto Progression & CPU Logic
  useEffect(() => {
    if (
      !battle ||
      battle.winner ||
      battle.seq !== "idle" ||
      dragInfo ||
      startupPhase !== "ready"
    )
      return;

    const b = battle;
    const pKey = b.activePlayer;

    // --------------------------------------------------------
    // ▼ CPU（p2）の処理
    // --------------------------------------------------------
    if ((b.mode === "cpu" || b.mode === "endless") && pKey === "p2") {
      clearTimeout(cpuTimer.current);
      cpuTimer.current = setTimeout(() => {
        const playable = b.p2.hand
          .map((c, i) => ({ card: c, idx: i }))
          .filter((c) => canPlayCard(b, "p2", c.card));
        const specialCards = playable.filter((c) => c.card.type === "special");
        const specificCards = playable.filter((c) => c.card.type !== "special");

        // ★修正ポイント：CPUも特殊カードを何枚でも使えるように制限を削除！
        if (specialCards.length > 0) {
          startActionSequence("p2", specialCards[0].idx);
        } else if (!b.usedCardThisPhase.specific && specificCards.length > 0) {
          startActionSequence("p2", specificCards[0].idx);
        } else {
          startActionSequence("p2", null); // 出せるカードがないのでパス
        }
      }, 1500);
      return;
    }

    // --------------------------------------------------------
    // ▼ プレイヤー（p1）の自動スキップ処理
    // --------------------------------------------------------
  }, [battle, dragInfo, startupPhase, battle?.seq]);
  // =========================================================
  // ★ 復活：勝敗が決まった時にリザルト画面（スコア送信画面）へ移行する処理
  // =========================================================
  // =========================================================
  // ★ 修正：勝敗が決まった時に結果データを保存してリザルト画面へ
  // =========================================================
  // =========================================================
  // ① 勝敗が決まった時に結果データを保存してリザルト画面へ（これだけにします）
  // =========================================================
  useEffect(() => {
    if (battle?.winner && battle.winner !== "next_stage") {
      const timer = setTimeout(() => {
        if (typeof setResultData === "function") {
          setResultData(battle);
        }
        setScreen("result");
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [battle?.winner]);

  // =========================================================
  // ② Firebaseへのスコア送信関数（独立して配置）
  // =========================================================
  const handleScoreSubmit = async (playerName, level) => {
    try {
      const rankingsRef = ref(db, "rankings");
      await push(rankingsRef, {
        name: playerName,
        level: level,
        timestamp: Date.now(),
      });
      console.log("スコア送信完了！");
    } catch (error) {
      console.error("スコアの送信に失敗しました:", error);
      alert("送信エラーが発生しました: " + error.message);
    }
  };

  // =========================================================
  // ★ 修正決定版：バフの初期化による NaN エラーを防ぐリセット処理
  // =========================================================
  // =========================================================
  // ★ 修正決定版：手札のシャッフル ＆ 敵のステータスレベルアップ追加
  // =========================================================
  useEffect(() => {
    if (battle?.winner === "next_stage") {
      const timer = setTimeout(() => {
        setBattle((prev) => {
          if (!prev) return null;
          let nb = cloneBattle(prev);

          // 1. 確実にカードをかき混ぜるシャッフル関数
          const shuffleArray = (array) => {
            const arr = [...array];
            for (let i = arr.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
          };

          // 2. レベル更新 ＆ ステータス強化処理！
          const nextLevel = (nb.endlessLevel || 1) + 1;
          const p2NewStats = { ...nb.p2.stats };

          // ★ 修正ポイント：数値のステータスをすべて自動的に＋1して強くする
          for (const key in p2NewStats) {
            if (typeof p2NewStats[key] === "number") {
              p2NewStats[key] += 1; // ステータスが1ずつ上がります（一気に強くしたい場合は 2 などにしてください）
            }
          }

          // 3. バトルの進行状態をリセット
          nb.winner = null;
          nb.endlessLevel = nextLevel;
          nb.currentPhase = "serve";
          nb.serverSide = "p1";
          nb.activePlayer = "p1";
          nb.turn = 1;
          nb.seq = "idle";
          nb.ballPos = "p1-server";
          nb.ballTrajectory = "none";
          nb.usedCardThisPhase = { specific: false, special: false };
          nb.skipToNextTurn = false;
          nb.scheduledDamage = 0;

          // 4. バフの安全な初期化
          const initialBuffs = {
            attackAdd: 0,
            attackMul: 1,
            tossAdd: 0,
            tossMul: 1,
            manaCostUp: 0,
            manaDiscount: 0,
            pierce: false,
            reflect: false,
            damageHalf: false,
            damageReduction: 0,
            fixedDamage: 0,
            allStatDown: 0,
            burn: false,
            regen: 0,
            doubleAction: 0,
          };

          // 5. プレイヤー（p1）のリセット
          const allP1Cards = [...nb.p1.deck, ...nb.p1.hand, ...nb.p1.discard];
          nb.p1 = {
            ...nb.p1,
            hp: 150,
            mana: 1,
            deck: shuffleArray(allP1Cards),
            hand: [],
            discard: [],
            buffs: { ...nb.p1.buffs, ...initialBuffs },
          };

          // 6. 敵（p2）のリセット
          const allP2Cards = [...nb.p2.deck, ...nb.p2.hand, ...nb.p2.discard];
          nb.p2 = {
            ...nb.p2,
            hp: 150,
            mana: 0,
            stats: p2NewStats,
            deck: shuffleArray(allP2Cards),
            hand: [],
            discard: [],
            buffs: { ...initialBuffs }, // ★ ココを変更！古いバフを引き継がず、まっさらにする！
          };
          // 7. 手札を5枚引き直す
          if (typeof drawCard === "function") {
            drawCard(nb, "p1", 5);
            drawCard(nb, "p2", 5);
          } else {
            nb.p1.hand = nb.p1.deck.slice(0, 5);
            nb.p1.deck = nb.p1.deck.slice(5);
            nb.p2.hand = nb.p2.deck.slice(0, 5);
            nb.p2.deck = nb.p2.deck.slice(5);
          }

          return nb;
        });
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [battle?.winner]);

  // --- Handlers ---

  const handlePointerDown = (e, index, pKey, card) => {
    if (mode === "pvp") {
      if ((isHost && pKey !== "p1") || (!isHost && pKey !== "p2")) return;
    } else {
      if (pKey !== "p1") return;
    }

    if (!canPlayCard(battle, pKey, card)) return;
    e.target.setPointerCapture(e.pointerId);
    setDragInfo({ index, pKey, card, x: e.clientX, y: e.clientY });
  };
  const handlePointerMove = (e) => {
    if (dragInfo) {
      setDragInfo((prev) => ({ ...prev, x: e.clientX, y: e.clientY }));
    }
  };
  const handlePointerUp = (e) => {
    if (!dragInfo) return;
    const dz = document.getElementById("drop-zone");
    let droppedOnZone = false;
    if (dz) {
      const rect = dz.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        droppedOnZone = true;
      }
    }

    if (droppedOnZone) {
      startActionSequence(dragInfo.pKey, dragInfo.index);
    }
    setDragInfo(null);
  };

  if (screen === "title")
    return <TitleScreen onStart={() => setScreen("menu")} />;
  if (screen === "menu")
    return (
      <MenuScreen
        onOpenMatchmaking={() => setScreen("matchmaking")}
        onOpenCpuSelect={() => setScreen("cpuSelect")}
        onSelectEndless={() => {
          setMode("endless");
          initBattle("endless", 1);
        }}
        onOpenDeck={() => setScreen("deckBuild")}
        onOpenRules={() => setScreen("rule")}
        onShowRanking={() => setScreen("ranking")}
        onBack={() => setScreen("title")}
      />
    );
  if (screen === "matchmaking")
    return (
      <MatchmakingScreen
        onJoinRoom={handleJoinRoom}
        onBack={() => setScreen("menu")}
      />
    );
  if (screen === "ranking")
    return <RankingScreen onBack={() => setScreen("menu")} />;
  if (screen === "cpuSelect")
    return (
      <CpuSelectScreen
        onStart={(level, stage) => {
          setMode("cpu");
          initBattle("cpu", level, stage);
        }}
        onBack={() => setScreen("menu")}
      />
    );
  if (screen === "rule") return <RuleScreen onBack={() => setScreen("menu")} />;
  if (screen === "waitingRoom")
    return (
      <WaitingRoomScreen
        roomId={roomId}
        onCancel={() => {
          remove(ref(db, `rooms/${roomId}`));
          setScreen("menu");
        }}
      />
    );
  if (screen === "deckBuild")
    return (
      // ★ Reactでは2つ以上の要素をreturnする時は <> と </> で囲む必要があります
      <>
        <DeckBuildScreen
          playerStats={playerStats}
          setPlayerStats={setPlayerStats}
          playerDeckIds={playerDeckIds}
          setPlayerDeckIds={setPlayerDeckIds}
          onBack={() => setScreen("menu")}
          onInspectCard={(c) => setInspectedCard(c)}
        />

        {/* ★ ここから下が拡大表示用のモーダルです */}
        {inspectedCard && (
          <div
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/85 p-6 backdrop-blur-sm touch-none"
            onClick={() => setInspectedCard(null)} // タップしたら閉じる
          >
            <div className="transform scale-150 mb-12 pointer-events-none">
              <CardUI card={inspectedCard} />
            </div>

            <div className="bg-slate-900 border border-slate-600 p-4 rounded-xl text-center shadow-xl mt-10 max-w-sm w-full">
              <h3 className="text-xl font-black text-yellow-400 mb-2">
                {inspectedCard.name}
              </h3>
              <p className="text-white text-sm whitespace-pre-wrap">
                {inspectedCard.desc}
              </p>
            </div>
          </div>
        )}
      </>
    );

  if (screen === "result") {
    return (
      <ResultScreen
        data={resultData}
        onBack={() => setScreen("menu")}
        onSubmitScore={handleScoreSubmit} // ★これを絶対に書いてください！
      />
    );
  }

  // --- Render Battle Screen ---
  if (screen === "battle" && battle) {
    const pTop = isHost ? "p2" : "p1";
    const pBot = isHost ? "p1" : "p2";
    const getPlayerHandStyle = (index, total) => {
      if (total <= 1) return { transform: "translate(-50%, 0px)" };
      const maxSpread = Math.min(window.innerWidth * 0.75, total * 25);
      const maxAngle = Math.min(25, total * 4);
      const stepX = maxSpread / (total - 1);
      const stepAngle = (maxAngle * 2) / (total - 1);
      const x = -maxSpread / 2 + index * stepX;
      const angle = -maxAngle + index * stepAngle;
      const offset = Math.abs(index - (total - 1) / 2);
      const y = offset * offset * 2;
      return {
        position: "absolute",
        left: "50%",
        bottom: "0px",
        transform: `translate(calc(-50% + ${x}px), ${y}px) rotate(${angle}deg)`,
        transformOrigin: "bottom center",
        zIndex: index,
      };
    };

    const getEnemyHandStyle = (index, total) => {
      if (total <= 1)
        return { transform: "translate(-50%, 0px) rotate(180deg)" };
      const maxSpread = Math.min(200, total * 30);
      const maxAngle = 15;
      const stepX = maxSpread / (total - 1);
      const stepAngle = (maxAngle * 2) / (total - 1);
      const x = -maxSpread / 2 + index * stepX;
      const angle = -maxAngle + index * stepAngle;
      const offset = Math.abs(index - (total - 1) / 2);
      const y = offset * offset * -1.5;
      return {
        position: "absolute",
        left: "50%",
        top: "0px",
        transform: `translate(calc(-50% + ${x}px), ${y}px) rotate(${
          180 + angle
        }deg)`,
        transformOrigin: "top center",
        zIndex: index,
      };
    };

    const renderPlayerAvatars = (pKey, isEnemy) => {
      const stats = battle[pKey].stats;
      const arr = [
        {
          label: "Tosser",
          short: "T",
          val: stats.tosser,
          id: `${pKey}-tosser`,
          img: ASSETS.avatar_t,
        },
        {
          label: "Server",
          short: "S",
          val: stats.server,
          id: `${pKey}-server`,
          img: ASSETS.avatar_s,
        },
        {
          label: "Attacker",
          short: "A",
          val: stats.attacker,
          id: `${pKey}-attacker`,
          img: ASSETS.avatar_a,
        },
      ];

      const displayArr = isEnemy ? [arr[2], arr[1], arr[0]] : arr;
      const phaseMatch = isEnemy ? "avatars_p2" : "avatars_p1";
      const isVisible =
        startupPhase === phaseMatch ||
        startupPhase === "hands" ||
        startupPhase === "ready";

      return (
        <div
          // ★ ここを変更しました。isEnemy が true の場合に 'mt-16' (下に下げる余白) を追加しています。
          className={`flex justify-center space-x-4 sm:space-x-10 px-2 w-full z-10 ${
            !isVisible ? "hidden" : ""
          } ${isEnemy ? "mt-24" : ""}`}
        >
          {displayArr.map((item, idx) => {
            // ★ ハイライト判定（自分のターン＆入力待ちの時に、対応する役割を光らせる）
            let isHighlight = false;
            if (
              !isEnemy &&
              startupPhase === "ready" &&
              battle.seq === "idle" &&
              battle.activePlayer === pBot
            ) {
              if (battle.currentPhase === "serve" && item.label === "Server")
                isHighlight = true;
              if (battle.currentPhase === "toss" && item.label === "Tosser")
                isHighlight = true;
              if (battle.currentPhase === "attack" && item.label === "Attacker")
                isHighlight = true;
            }

            // どのアバターが今アクションを起こしたかの判定
            const isActingNow =
              !isEnemy &&
              battle.seq === "cutin" &&
              battle.actionCard &&
              actionActor === item.label.toLowerCase();

            return (
              <div
                key={item.id}
                className={`flex flex-col items-center relative ${
                  startupPhase === phaseMatch
                    ? isEnemy
                      ? "avatar-deal-p2"
                      : "avatar-deal-p1"
                    : ""
                }`}
                style={{ animationDelay: `${idx * 0.15}s` }}
              >
                {/* アバター本体 */}
                <div
                  className={`
                              ${
                                isEnemy
                                  ? LAYOUT.avatarSizeEnemy
                                  : LAYOUT.avatarSizePlayer
                              } 
                              bg-slate-800 border border-slate-500 shadow-md relative overflow-hidden transition-all duration-300
                              ${
                                isHighlight
                                  ? "ring-4 ring-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.8)] transform scale-105"
                                  : ""
                              }
                          `}
                  style={{
                    transform: `perspective(600px) rotateX(${LAYOUT.avatarAngle})`,
                  }}
                >
                  <img
                    src={item.img}
                    alt={item.label}
                    className="absolute inset-0 w-full h-full object-cover opacity-80 z-0 pointer-events-none"
                  />
                  <div
                    className="absolute bottom-0 right-0 w-5 h-5 sm:w-6 sm:h-6 bg-slate-900/90 rounded-tl flex items-center justify-center text-[10px] sm:text-xs font-black z-20 text-white"
                    style={{ transform: "rotateX(-30deg)" }}
                  >
                    {item.val}
                  </div>
                </div>

                {/* ★ アバターの上に小さくカードが乗る＆属性エフェクト演出 */}
                {isActingNow && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center animate-soft-drop pointer-events-none">
                    {/* 属性エフェクト (炎/氷/葉) */}
                    <div className="absolute inset-0 scale-[2.0] z-0">
                      {item.label === "Attacker" && (
                        <CutinEffects type="fire" />
                      )}
                      {item.label === "Tosser" && <CutinEffects type="ice" />}
                      {item.label === "Server" && <CutinEffects type="leaf" />}
                    </div>
                    {/* ふんわり置かれるカード本体 */}
                    <div className="w-[70%] z-10 shadow-[0_10px_20px_rgba(0,0,0,0.8)] rounded-md">
                      <CardUI
                        card={battle.actionCard}
                        compact
                        extraClasses="w-full h-full m-0"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    };

    let actionActor = "server";
    if (battle.currentPhase === "serve") actionActor = "server";
    else if (battle.currentPhase === "toss") actionActor = "tosser";
    else if (battle.currentPhase === "attack") actionActor = "attacker";
    if (
      battle.actionCard &&
      ["server", "tosser", "attacker"].includes(battle.actionCard.type)
    ) {
      actionActor = battle.actionCard.type;
    }

    const avatarImg = getAvatarImgByType(actionActor);

    return (
      <div
        className={`w-full h-[100dvh] battle-bg relative overflow-hidden flex flex-col justify-between select-none text-white ${
          battle.shake ? "bg-red-950" : ""
        }`}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/80 pointer-events-none z-0"></div>

        <style>{globalStyles}</style>

        {/* --- 豪華版：フェーズ指示テキスト --- */}
        {startupPhase === "ready" &&
          battle.seq === "idle" &&
          !battle.winner &&
          battle.activePlayer === pBot &&
          battle.currentPhase !== "damageDeal" && (
            <div
              key={battle.currentPhase + battle.phaseTextKey}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 overflow-hidden"
            >
              <div className="animate-slide-text bg-white/95 px-16 py-4 shadow-[0_0_40px_rgba(255,255,255,1)] transform -skew-x-12 border-l-[12px] border-r-[12px] border-yellow-500">
                <span className="text-lg sm:text-base font-black italic text-slate-900 tracking-widest drop-shadow-md">
                  {battle.currentPhase === "serve" && "サーブを打て！"}
                  {battle.currentPhase === "toss" && "トスを上げろ！"}
                  {battle.currentPhase === "attack" && "アタックを打て！"}
                </span>
              </div>
            </div>
          )}

        {/* --- 豪華版：カットイン連鎖＆黄金エフェクト (seq === cutin) --- */}
        {battle.activePlayer === pBot &&
          battle.seq === "cutin" &&
          battle.currentPhase !== "damageDeal" && (
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-none opacity-0"
              style={{ animation: "fadeIn 0.4s ease-out 0.6s forwards" }}
            >
              <div className="relative flex flex-col items-center justify-center w-full max-w-3xl h-[600px]">
                {/* 1. プレイヤーカード (中央左寄りにスライドイン) */}
                <div
                  className="absolute top-[20%] left-[25%] w-40 h-56 sm:w-48 sm:h-64 bg-slate-900 rounded border-2 border-gray-400 shadow-[0_0_40px_rgba(0,0,0,0.8)] opacity-0"
                  style={{
                    zIndex: 20,
                    animation: "slide-in-left 0.4s ease-out 0.8s forwards",
                  }}
                >
                  <img
                    src={avatarImg}
                    className="absolute inset-0 w-full h-full object-cover opacity-80"
                  />
                </div>

                {/* 2. 連鎖する固有カード (ほの赤いハイライト、右下で扇形に重なる) */}
                {battle.actionCard && (
                  <div
                    className="absolute top-[35%] left-[45%] w-32 h-48 sm:w-40 sm:h-56 opacity-0"
                    style={{
                      zIndex: 30,
                      transformOrigin: "bottom left",
                      animation:
                        "soft-drop-fan 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) 1.1s forwards",
                    }}
                  >
                    <div className="w-full h-full rounded-xl shadow-[0_0_40px_rgba(255,0,0,0.7)] ring-4 ring-red-500/80 bg-black">
                      <CardUI
                        card={battle.actionCard}
                        extraClasses="w-full h-full m-0"
                      />
                    </div>
                  </div>
                )}

                {/* 3. カットアウト（飛び出し）と黄金エフェクト */}
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0"
                  style={{
                    zIndex: 40,
                    animation: "golden-expand 1.5s ease-in-out 1.5s forwards",
                  }}
                >
                  <img
                    src={getCutoutImgByType(actionActor)}
                    alt="cutout"
                    className="w-[130%] max-w-none object-contain drop-shadow-[0_0_30px_rgba(255,215,0,1)]"
                  />
                  <div className="absolute inset-0 bg-yellow-400/30 mix-blend-overlay rounded-full blur-3xl"></div>
                </div>
              </div>
            </div>
          )}
        {/* --- Top Bar --- */}
        <div
          className={`absolute top-2 left-0 w-full px-4 flex justify-between items-center z-50 pointer-events-auto transition-opacity duration-1000 ${
            startupPhase === "ready" ? "opacity-100" : "opacity-0"
          }`}
        >
          <button
            onClick={() => {
              if (window.confirm("リタイアしますか？")) setScreen("title");
            }}
            className="bg-red-900/80 hover:bg-red-800 text-red-100 text-xs font-bold py-1.5 px-4 rounded-full shadow-lg border border-red-500/50 backdrop-blur-sm transition active:scale-95"
          >
            RETIRE
          </button>
          <div className="absolute top-1 left-1/2 transform -translate-x-1/2 flex flex-col items-center pointer-events-none z-50">
            <span className="text-yellow-400 font-black text-sm sm:text-sm tracking-widest drop-shadow-md bg-black/70 px-6 py-2 rounded-full border border-yellow-500">
              {battle.currentPhase.toUpperCase()} PHASE
            </span>
          </div>
          <div
            className={`fixed top-1/2 left-4 transform -translate-y-1/2 font-black text-sm px-4 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-sm border shadow-lg z-50 ${
              timeLeft <= 10
                ? "text-red-400 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse"
                : "text-yellow-400 border-slate-600"
            }`}
          >
            {timeLeft}秒
          </div>
        </div>

        {/* --- 3D COURT CONTAINER --- */}
        <div className="absolute inset-0 court-container w-full h-full z-0 flex flex-col justify-between p-4 pointer-events-none">
          <div
            className="absolute inset-0 court-floor border-[4px] border-white/20 h-[90%] top-[5%] pointer-events-none rounded-xl"
            style={{ backgroundImage: `url(${ASSETS.floor})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent mix-blend-multiply"></div>
            <div className="absolute top-[30%] left-0 right-0 h-1 bg-white/20 shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
            <div className="absolute top-[50%] left-0 right-0 h-1.5 bg-white/30 shadow-[0_0_15px_rgba(255,255,255,0.6)]"></div>
            <div className="absolute top-[70%] left-0 right-0 h-1 bg-white/20 shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
            <div className="absolute top-[50%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-20 rounded-full border-4 border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.4)]"></div>
          </div>
        </div>

        {/* --- Enemy Area (Top Half) --- */}
        <div className="relative w-full h-[45%] flex flex-col items-center pt-16 z-10 justify-between pb-2">
          <div className="absolute top-4 right-4">
            <div
              className={`bg-slate-900/80 backdrop-blur p-2.5 rounded-xl text-xs flex flex-col border border-slate-600 shadow-md transition-opacity duration-1000 ${
                startupPhase === "ready" ? "opacity-100" : "opacity-0"
              }`}
            >
              <span className="text-red-400 font-black text-sm drop-shadow-sm">
                HP {battle[pTop].hp}
              </span>
            </div>
          </div>

          {renderPlayerAvatars(pTop, true)}

          <div
            className={`absolute top-28 left-1/2 transform -translate-x-1/2 flex justify-center z-20 pointer-events-none ${
              startupPhase === "init" ||
              startupPhase === "avatars_p2" ||
              startupPhase === "avatars_p1"
                ? "hidden"
                : ""
            }`}
          >
            {battle[pTop].hand.map((c, i) => {
              const total = battle[pTop].hand.length;
              const center = (total - 1) / 2;
              const offset = i - center;
              const angle = offset * 6;
              const translateY = -Math.abs(offset) * 8 - 40;
              const translateX = offset * 20;
              return (
                <div
                  key={i}
                  className={`absolute origin-top fan-card ${
                    startupPhase === "hands" ? "card-deal" : ""
                  }`}
                  style={{
                    "--start-x": "-150px",
                    "--start-y": "-200px",
                    "--end-rot": `${angle}deg`,
                    "--end-x": `${translateX}px`,
                    "--end-y": `${translateY}px`,
                    transform:
                      startupPhase === "ready"
                        ? `translateX(${translateX}px) translateY(${translateY}px) rotate(${angle}deg) scale(0.55)`
                        : "",
                    animationDelay: `${i * 0.08}s`,
                  }}
                >
                  <CardUI isEnemy />
                </div>
              );
            })}
          </div>

          <div
            className={`absolute left-4 top-[15%] flex flex-col items-center opacity-85 transition-opacity duration-1000 ${
              startupPhase === "ready" ? "opacity-100" : "opacity-0"
            }`}
          >
            <span className="text-[10px] text-slate-300 font-black drop-shadow mb-1">
              Deck: {battle[pTop].deck.length}
            </span>
            <div className="w-10 h-14 bg-gradient-to-br from-indigo-900 to-indigo-950 border-2 border-indigo-600/50 rounded-md shadow-[0_5px_15px_rgba(0,0,0,0.6)] flex items-center justify-center"></div>
          </div>
          <div
            className={`absolute right-4 top-[15%] flex flex-col items-center opacity-85 transition-opacity duration-1000 ${
              startupPhase === "ready" ? "opacity-100" : "opacity-0"
            }`}
          >
            <span className="text-[10px] text-slate-300 font-black drop-shadow mb-1">
              Discard: {battle[pTop].discard.length}
            </span>
            <div className="w-10 h-14 bg-slate-800 border-2 border-slate-600/50 rounded-md shadow-inner flex items-center justify-center overflow-hidden">
              {battle[pTop].discard.length > 0 ? (
                <div className="w-full h-full bg-indigo-900 opacity-50"></div>
              ) : (
                <span className="text-[8px] text-slate-500 font-black">
                  EMPTY
                </span>
              )}
            </div>
          </div>
        </div>

        {/* --- Center Court & Net w/ Poles --- */}
        {/*
        <div
          className="absolute left-4 right-4 h-12 z-10 transform -translate-y-1/2 flex justify-between pointer-events-none"
          style={{ top: LAYOUT.netTop }}
        >
          <div className="w-2 h-16 bg-gradient-to-r from-gray-400 to-gray-600 border-r-2 border-gray-300 rounded-t-sm shadow-xl transform -translate-y-4"></div>
          <div className="flex-1 h-10 border-y-[3px] border-white/50 shadow-[0_10px_30px_rgba(0,0,0,0.8)] relative mt-2 mx-[-2px]">
            <div className="w-full h-full net-pattern opacity-70"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
          </div>
          <div className="w-2 h-16 bg-gradient-to-l from-gray-400 to-gray-600 border-l-2 border-gray-300 rounded-t-sm shadow-xl transform -translate-y-4"></div>
        </div>
        */}

        {/* --- Drop Zone --- */}
        <div
          id="drop-zone"
          className="absolute top-[40%] left-0 w-full h-[20%] z-20 flex items-center justify-center pointer-events-none"
        >
          {dragInfo && (
            <div className="w-[85%] h-[80%] border-[6px] border-dashed border-yellow-400 bg-yellow-400/20 rounded-3xl flex items-center justify-center animate-pulse shadow-[0_0_40px_rgba(250,204,21,0.6)] backdrop-blur-sm">
              <span className="text-yellow-300 font-black text-3xl drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] tracking-widest">
                DROP TO PLAY
              </span>
            </div>
          )}
        </div>

        <div
          className={`absolute transition-all duration-700 ease-in-out z-30 pointer-events-none flex items-center justify-center
                  ${
                    battle.isSmashingFace
                      ? "animate-smash-face"
                      : battle.isSmashingEnemy
                      ? "animate-smash-enemy"
                      : ""
                  } 
                  ${
                    startupPhase !== "ready"
                      ? "opacity-0 scale-0"
                      : "opacity-100 scale-100"
                  }`}
          style={getBallPosStyle(battle.ballPos)}
        >
          <div
            key={battle.ballKey}
            className={`w-12 h-12 flex items-center justify-center overflow-visible ${
              battle.ballTrajectory === "high" ? "animate-arc-high" : ""
            }`}
          >
            <img
              src={ASSETS.ball}
              className="w-6 h-6 sm:w-8 sm:h-8 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]"
              alt="ball"
            />
          </div>
        </div>

        {battle.damageText && (
          <>
            {/* 1秒かけてゆっくり表示させるための専用アニメーション */}
            <style>{`
                @keyframes slowDamageFade {
                  0% { opacity: 0; transform: translate(-50%, 20px) scale(0.8); }
                  40% { opacity: 1; transform: translate(-50%, 0) scale(1.1); }
                  80% { opacity: 1; transform: translate(-50%, -10px) scale(1); }
                  100% { opacity: 0; transform: translate(-50%, -20px) scale(1); }
                }
              `}</style>
            <div
              className={`absolute left-1/2 transform -translate-x-1/2 text-[100px] sm:text-[120px] font-black text-transparent bg-clip-text bg-gradient-to-b from-red-400 to-red-700 drop-shadow-[0_0_30px_rgba(239,68,68,1)] z-50 pointer-events-none`}
              style={{
                top: battle.damageText.pos === "top" ? "30%" : "60%",
                animation: "slowDamageFade 1.5s ease-out forwards",
              }}
            >
              -{battle.damageText.val}
            </div>
          </>
        )}

        {/* --- 豪華版：超ダメージ時のブロック計算演出 --- */}
        {/* --- 豪華版：超ダメージ時のブロック計算演出 --- */}
        {battle.seq === "reveal" &&
          battle.currentPhase === "damageDeal" &&
          battle.scheduledDamage > 25 && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] pointer-events-none overflow-hidden animate-fadeIn">
              {/* 右側：アタッカーとトサーのカード */}
              <div
                className="absolute right-[10%] top-[20%] flex flex-col space-y-4 items-center"
                style={{ animation: "epic-slide-in-right 4.5s forwards" }}
              >
                <div className="flex space-x-6">
                  {/* トサーのアバターカード */}
                  <div
                    className="relative flex flex-col items-center"
                    style={{ animation: "epic-clash-right 4.5s forwards" }}
                  >
                    <div className="w-24 h-36 bg-slate-800 border-2 border-green-400 rounded-lg shadow-[0_0_20px_rgba(74,222,128,0.6)] relative overflow-hidden z-20">
                      <img
                        src="/images/avatar_t.png"
                        className="absolute inset-0 w-full h-full object-cover opacity-80"
                        alt="Tosser"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="text-5xl font-black text-green-400 drop-shadow-md">
                          {
                            battle[battle.activePlayer === "p1" ? "p2" : "p1"]
                              .stats.tosser
                          }
                        </span>
                      </div>
                    </div>
                    {/* 使ったトスカード（下敷き） */}
                    {(() => {
                      const atkP =
                        battle[battle.activePlayer === "p1" ? "p2" : "p1"];
                      const tossCard = atkP.discard
                        .slice()
                        .reverse()
                        .find((c) => c.type === "tosser");
                      if (!tossCard) return null;
                      return (
                        <div
                          className="absolute top-12 left-4 w-24 h-32 transform rotate-12 z-10 opacity-0"
                          style={{ animation: "soft-drop 0.5s 0.8s forwards" }}
                        >
                          <CardUI
                            card={tossCard}
                            extraClasses="w-full h-full shadow-[0_10px_20px_rgba(0,0,0,0.8)]"
                          />
                        </div>
                      );
                    })()}
                  </div>

                  {/* アタッカーのアバターカード */}
                  <div
                    className="relative flex flex-col items-center"
                    style={{ animation: "epic-clash-left 4.5s forwards" }}
                  >
                    <div className="w-24 h-36 bg-slate-800 border-2 border-red-400 rounded-lg shadow-[0_0_20px_rgba(248,113,113,0.6)] relative overflow-hidden z-20">
                      <img
                        src="/images/avatar_a.png"
                        className="absolute inset-0 w-full h-full object-cover opacity-80"
                        alt="Attacker"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="text-5xl font-black text-red-400 drop-shadow-md">
                          {
                            battle[battle.activePlayer === "p1" ? "p2" : "p1"]
                              .stats.attacker
                          }
                        </span>
                      </div>
                    </div>
                    {/* 使ったアタックカード（下敷き） */}
                    {(() => {
                      const atkP =
                        battle[battle.activePlayer === "p1" ? "p2" : "p1"];
                      const attackCard = atkP.discard
                        .slice()
                        .reverse()
                        .find((c) => c.type === "attacker");
                      if (!attackCard) return null;
                      return (
                        <div
                          className="absolute top-12 right-4 w-24 h-32 transform -rotate-12 z-10 opacity-0"
                          style={{ animation: "soft-drop 0.5s 1.2s forwards" }}
                        >
                          <CardUI
                            card={attackCard}
                            extraClasses="w-full h-full shadow-[0_10px_20px_rgba(0,0,0,0.8)]"
                          />
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* 衝突後の最終ダメージ */}
                <div
                  className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-600 drop-shadow-[0_0_30px_rgba(250,204,21,1)] mt-16"
                  style={{ animation: "epic-number-pop 0.5s 2.5s both" }}
                >
                  {battle.scheduledDamage}
                </div>
              </div>

              {/* 左側：ブロックカードの出現と数値変化 */}
              {battle.actionCard && (
                <div
                  className="absolute left-[15%] top-[30%] flex flex-col items-center"
                  style={{ animation: "epic-slide-in-left 0.5s 3.0s both" }}
                >
                  <div className="w-40 h-56 transform -rotate-6 shadow-[0_0_40px_rgba(96,165,250,0.8)]">
                    <CardUI
                      card={battle.actionCard}
                      extraClasses="w-full h-full"
                    />
                  </div>
                  <div className="mt-8 text-5xl font-black text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,1)] animate-bounce">
                    BLOCK!
                  </div>
                </div>
              )}
            </div>
          )}

        {battle.activeSpecialCard && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-none animate-fadeIn">
            <div className="transform scale-[1.7] shadow-[0_0_60px_rgba(255,255,255,0.9)] rounded-xl">
              <CardUI card={battle.activeSpecialCard} />
            </div>
          </div>
        )}

        {battle.seq === "cutin_block" && battle.actionCard && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-none animate-fadeIn">
            <CutinEffects type="steel" />
            <div className="transform scale-[1.7] shadow-[0_0_60px_rgba(255,255,255,0.9)] rounded-xl">
              <CardUI card={battle.actionCard} />
            </div>
          </div>
        )}

        {/* --- Player Area (Bottom Half) --- */}
        <div className="relative w-full h-[55%] flex flex-col items-center justify-end pb-4 pt-10 z-20">
          {battle.activePlayer === pBot && (
            <div
              className={`absolute top-0 right-4 z-50 transition-opacity duration-1000 ${
                startupPhase === "ready" ? "opacity-100" : "opacity-0"
              }`}
            >
              <button
                onClick={() => startActionSequence(battle.activePlayer, null)}
                disabled={
                  mode === "pvp"
                    ? (isHost && battle.activePlayer !== "p1") ||
                      (!isHost && battle.activePlayer !== "p2")
                    : battle.activePlayer !== "p1"
                }
                className="transform -translate-y-1/2 font-black text-sm px-4 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-sm border shadow-lg z-50"
              >
                PASS
              </button>
            </div>
          )}
          {renderPlayerAvatars(pBot, false)}

          <div
            className={`absolute bottom-4 left-4 flex flex-col items-center gap-2 opacity-85 transition-opacity duration-1000 z-50 ${
              startupPhase === "ready" ? "opacity-100" : "opacity-0"
            }`}
          >
            {/* 山札 (上) */}
            <div className="w-12 h-16 bg-slate-700 border border-slate-500 rounded text-center text-[10px] flex flex-col justify-center shadow-lg relative overflow-hidden">
              <span className="z-10 text-indigo-200 font-bold">DECK</span>
              <span className="z-10 font-black">
                {battle[pBot].deck.length}
              </span>
            </div>
            {/* 墓地 (下) */}
            <div className="w-12 h-16 bg-slate-800 border border-slate-600 rounded text-center text-[10px] flex flex-col justify-center shadow-lg">
              <span className="text-slate-400">DISCARD</span>
              <span className="font-black">{battle[pBot].discard.length}</span>
            </div>
          </div>

          {/* Hand Area */}
          <div
            className={`relative w-full max-w-[600px] h-[150px] mt-2 z-40 transition-transform duration-1000 ${
              startupPhase === "ready"
                ? "translate-y-0 opacity-100"
                : "translate-y-20 opacity-0"
            }`}
          >
            {battle[pBot].hand.map((c, i) => {
              const playable = canPlayCard(battle, pBot, c);
              const isHovered = hoveredCardIdx === i;
              const isDragging = dragInfo && dragInfo.index === i;

              return (
                <div
                  key={c.uid}
                  // ★ 過去に動いていたコードの transform 計算式を復活させます！
                  style={
                    isDragging && dragInfo
                      ? {
                          position: "absolute", // ★追加: 扇形と同じ配置方法にする
                          left: "50%", // ★追加: 画面の横幅の中央を基準にする
                          bottom: "0px", // ★追加: 画面の下端を基準にする
                          zIndex: 9999,
                          // calc(-50% + ...) とすることで、カードの中心と指の中心がピタッと合います
                          transform: `translate(calc(-50% + ${
                            dragInfo.x - window.innerWidth / 2
                          }px), ${
                            dragInfo.y - window.innerHeight + 120
                          }px) scale(1.1) rotate(0deg)`,
                        }
                      : getPlayerHandStyle(i, battle[pBot].hand.length)
                  }
                  className={`${
                    isDragging ? "" : "transition-all duration-300"
                  } ease-out`}
                >
                  {/* 見た目用レイヤー（ホバー時に拡大＆上にスライド） */}
                  <div
                    className="transition-all duration-200 pointer-events-none"
                    style={{
                      transform:
                        isHovered && !isDragging
                          ? "translateY(-40px) scale(1.15)"
                          : "translateY(0) scale(1)",
                    }}
                  >
                    <CardUI
                      card={c}
                      disabled={!playable && startupPhase === "ready"}
                      highlight={isHovered || isDragging}
                      // ★ 以下の1行を追加！実際のコストを計算して渡します
                      effectiveCost={Math.max(
                        0,
                        c.cost +
                          (battle[pBot].buffs.manaCostUp || 0) -
                          (battle[pBot].buffs.manaDiscount || 0)
                      )}
                    />
                  </div>

                  {/* 当たり判定用透明レイヤー（位置は固定） */}
                  <div
                    className="absolute inset-0 cursor-grab touch-none"
                    onPointerOver={() => setHoveredCardIdx(i)}
                    onPointerOut={() => setHoveredCardIdx(null)}
                    onPointerDown={(e) => {
                      setHoveredCardIdx(null);
                      handlePointerDown(e, i, pBot, c);
                    }}
                    // ★ 指の動きを追従させるために、ここにMoveとUpも必ずセットします
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                  ></div>
                </div>
              );
            })}
          </div>

          <div
            className={`absolute bottom-4 right-4 flex flex-col items-end transition-opacity duration-1000 z-50 ${
              startupPhase === "ready" ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="flex flex-col items-center gap-1 bg-slate-900/50 px-2 py-2 min-w-[50px] rounded-lg backdrop-blur-sm border border-slate-700">
              <span className="text-green-400 font-black text-[10px] drop-shadow-md leading-none">
                HP {battle[pBot].hp}
              </span>
              <div className="flex flex-col-reverse gap-1">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-4 h-3 sm:w-5 sm:h-4 rounded-sm border ${
                      i < battle[pBot].mana
                        ? "bg-cyan-400 border-cyan-200 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                        : "bg-slate-700 border-slate-500"
                    }`}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
