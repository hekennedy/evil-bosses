import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONSTANTS (unchanged from v11) ──────────────────────────────────────────
// --- PRONOUN SYSTEM ---
const PRONOUN_SETS = {
  "he/him":   { sub:"he",   obj:"him",  pos:"his",  posPro:"his",   ref:"himself", cap:"He",  capObj:"Him",  capPos:"His"  },
  "she/her":  { sub:"she",  obj:"her",  pos:"her",  posPro:"hers",  ref:"herself", cap:"She", capObj:"Her",  capPos:"Her"  },
  "they/them":{ sub:"they", obj:"them", pos:"their",posPro:"theirs",ref:"themself",cap:"They",capObj:"Them", capPos:"Their"},
};

const RECHARGE_INTERVAL  = 1800000;
const RECHARGE_AMOUNT    = 100;
const STARTING_SOULS     = 500;
const AGENDA_SIZE        = 3;
const RANK_OPTICS_NEEDED = [600, 1200, 2000, 3500, 6000, 10000, 18000, 0];
const RANK_SOUL_REWARDS  = [0, 200, 400, 700, 1000, 1500, 2500, 5000];
const MORALE_PROMOTION_GATE = 60;

// ─── FLAVOR TEXT (v12 names) ──────────────────────────────────────────────────
const AGENDA_FLAVOR = [
  "Gerry is incredibly busy. Linda has already cried once. These 3 items will help.",
  "Back-to-back all day. Henderson filed something this morning. These schemes won't run themselves.",
  "Scott figured out today's agenda, left a note that said 'same as last week,' and is already gone. It is noon.",
  "Three items. Beardogg already finished his. Darrell looked at the list and said 'bold choices.' He did not mean it as a compliment.",
  "Selected from a schedule so full that even the buffer time has buffer time. Bitsy has rebranded the buffer time as 'white space for ideation.'",
  "Today's agenda was personally curated at 11:47pm last night. Via Ping. Casey updated her resignation letter at 11:48pm.",
  "Linda is on item two already. She cried through item one. She always gets through item one.",
];

const REPRIORITIZE_FLAVOR = [
  "The previous agenda no longer reflects our strategic direction. No further questions.",
  "Priorities have shifted. Henderson would have questions about this. Henderson is not here.",
  "Scott looked at the new agenda and said 'yep.' Already done. Back to his documentary. It's 10:45am. He will leave at 2.",
  "Casey almost quit over the previous agenda. This one is different. She will still almost quit.",
  "Darrell looked at the reprioritization and said 'that tracks.' It did not track.",
  "Bitsy called this 'a vibe pivot.' She is wearing a blazer with fringe. HR has seen it. HR said nothing.",
];

const RANKS = [
  { title:"Team Lead",        level:1, icon:"📋" },
  { title:"Manager",          level:2, icon:"💼" },
  { title:"Senior Manager",   level:3, icon:"😤" },
  { title:"Director",         level:4, icon:"🔥" },
  { title:"VP",               level:5, icon:"😈" },
  { title:"EVP",              level:6, icon:"🎩" },
  { title:"COO",              level:7, icon:"🌑" },
  { title:"PE-Installed CEO", level:8, icon:"👑" },
];

const PRESTIGE_TITLES = [
  "Consultant","Advisor","Interim Everything",
  "Executive in Residence","Thought Leader","Disruptor","Visionary (ironic)",
];

const MOOD = [
  { bg:"#080810", accent:"#ffd700", subtext:"#777", border:"rgba(255,215,0,0.08)" },
  { bg:"#080812", accent:"#ffd700", subtext:"#777", border:"rgba(255,215,0,0.09)" },
  { bg:"#090810", accent:"#ff9f0a", subtext:"#888", border:"rgba(255,159,10,0.1)"  },
  { bg:"#0a0808", accent:"#ff9f0a", subtext:"#888", border:"rgba(255,159,10,0.12)" },
  { bg:"#0c0808", accent:"#ff6b35", subtext:"#999", border:"rgba(255,107,53,0.14)" },
  { bg:"#0e0606", accent:"#ff2d55", subtext:"#aaa", border:"rgba(255,45,85,0.16)"  },
  { bg:"#100404", accent:"#ff2d55", subtext:"#bbb", border:"rgba(255,45,85,0.2)"   },
  { bg:"#120202", accent:"#ff2d55", subtext:"#ccc", border:"rgba(255,45,85,0.25)"  },
];

function opticsBonus(cost) {
  if (cost >= 800) return 2.2;
  if (cost >= 401) return 1.8;
  if (cost >= 151) return 1.5;
  if (cost >= 50)  return 1.2;
  return 1.0;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const AI_IDS = [21,31,32,41,49,50,56,61,62,241,254,271,275];

// ─── CAST (v12 names) ─────────────────────────────────────────────────────────
const CAST = [
  { name:"Henderson", emoji:"🧾", role:"Analyst",              desc:"Has been building a case since Q2. Notebook. Lawyer. Footnotes. Has never raised his voice. Has never needed to." },
  { name:"Linda",     emoji:"😢", role:"Senior Associate",     desc:"Cries at everything. The printer jamming. A Tuesday. The word 'restructuring.' Has been here 11 years and will outlast everyone, including you." },
  { name:"Casey",     emoji:"🤌", role:"Project Manager",      desc:"Threatens to quit every quarter. Has never quit. Her resignation letter is currently 14 pages and has been cited by three employment lawyers as 'unusually compelling.'" },
  { name:"Scott",     emoji:"🌿", role:"Senior Analyst",       desc:"Quietly the smartest person in the building. Solves whatever needs solving by 11am, then clocks out mentally for the rest of the day. Leaves at 2 regardless of what's happening. Has never once asked what Gerry thinks about anything. Has snacks." },
  { name:"Darrell",    emoji:"🪨", role:"Associate",            desc:"Says almost nothing. When he does speak it's usually one sentence, perfectly timed, and slightly funnier than it has any right to be. Has been watching everything for four years and has opinions about all of it. Just doesn't share them unless it's worth it." },
  { name:"Beardogg",   emoji:"🐕", role:"Lead Engineer",        desc:"Real name Shafiq. Called himself Beardogg once as a joke. It stuck. Most competent person in the building. His work has won two industry awards you accepted on stage. He has the smile. Everyone who knows Beardogg knows the smile." },
  { name:"Bitsy",     emoji:"🌅", role:"Chief Vibe Officer",   desc:"Joined because the CEO was 'blown away by her energy.' Today she's wearing a blazer with sequin lapels and platform sneakers. HR has not said anything. HR is also a little scared of her. Has rebranded the kitchen as 'The Collab Kitchen.' Henderson has noted this." },
  { name:"Tyler", emoji:"🎓", role:"Innovation Liaison", desc:"Gerry's nephew. BMW in the lot. Beardogg does his work." },
  { name:"JJ",        emoji:"😐", role:"Associate",            desc:"A completely different person depending on whether leadership is in the room. Posts on LinkUp every Monday morning. The posts were written Sunday night. Casey has noted the timestamp pattern." },
];

// ─── HENDERSON 5-LEVEL SYSTEM ────────────────────────────────────────────────
const HENDERSON_LEVELS = [
  { level:1, label:"Watching",         emoji:"🧾", color:"#888",    glowColor:"rgba(150,150,150,0.1)",  desc:"Henderson has a notebook. He has always had a notebook. Nothing has been filed. This is the baseline.",                                                                                                                 threat:"Low",              activity:"Observing from a distance. The notebook is open. Your name appears twice.",                                                                                 appease:"Standard professionalism will hold this. For now." },
  { level:2, label:"Note-Taking",      emoji:"📋", color:"#ff9f0a", glowColor:"rgba(255,159,10,0.15)",  desc:"A pattern has formed. The notebook has a dedicated section now. Henderson has begun asking questions that are technically about the project but are not about the project.",                                              threat:"Elevated",          activity:"Dates. Times. Names. Color-coded tabs. Scott has been asked to clarify a few things. Scott clarified them.",                                                       appease:"A genuine gesture — real wellness investment, a fair promotion — can bring this back down." },
  { level:3, label:"Building a Case",  emoji:"📁", color:"#ff6b35", glowColor:"rgba(255,107,53,0.2)",   desc:"This is formal now. HR has been notified of a potential concern. Henderson has witness accounts. Darrell contributed one sentence to the documentation. The sentence is very specific.",                                 threat:"Serious",           activity:"Henderson has a filing system with categories. One category is labeled with your name. There are sub-categories.",                                                   appease:"Pizza parties won't cut it. Real structural change — promoting Linda, settling quietly — is your only path down." },
  { level:4, label:"Filed with HR",    emoji:"⚖️", color:"#ff2d55", glowColor:"rgba(255,45,85,0.25)",   desc:"HR has received a formal complaint. It is four pages with footnotes. The footnotes have footnotes. Darrell read the footnotes and said: 'the footnotes have footnotes.' Henderson is still in the building. He will always be in the building.", threat:"Critical",          activity:"HR is involved. Legal has been cc'd. Scott was asked if he saw this coming. Scott said: 'Yeah, around Q2.' He left at 2.",                                         appease:"Settling costs significant Souls but brings Henderson back two levels. Do it now or face the Board." },
  { level:5, label:"Lawyer Retained",  emoji:"🔴", color:"#ff0040", glowColor:"rgba(255,0,64,0.3)",     desc:"Henderson has counsel. Everything Gerry says is now potentially Exhibit Something. The Board has been informed. A demotion review is underway.",                                                                         threat:"DEMOTION IMMINENT", activity:"Henderson's lawyer has sent a letter. It references 'a pattern.' Scott proofread it from his car: 'Very tight structure.' The demotion clock is running.",  appease:"Settle immediately — it costs 800 Souls but stops the demotion clock. Or face the Board." },
];

const HENDERSON_APPEASEMENTS = [
  { id:"wellness", label:"🫶 Real Wellness Program", cost:250, drop:2, cooldown:600,
    desc:"Cancel the $4 app. Reinstate the EAP. Issue a genuine policy change. Henderson notes the structural improvement. The notebook stays open but the current section closes.",
    story:"The announcement goes out. Henderson reads it. Reads it again. Says to Scott: 'The EAP is back.' Scott, from his car: 'yeah i saw.' Henderson nods. Closes the current section of the notebook. Opens a new one. Gerry is still in it. The font is slightly smaller." },
  { id:"promote",  label:"⬆️ Promote Someone Fair",   cost:600, drop:2, cooldown:999,
    desc:"Promote Linda, Casey, or Beardogg to something they've genuinely earned. Henderson respects demonstrated fairness. This is one of the few things that actually moves him.",
    story:"The promotion is announced. Henderson reads it. Says nothing for a long time. Then: 'Good.' Just that. One word. It is the most unambiguous thing Henderson has ever said in four years. The team notices. Morale lifts. Henderson closes the current section of the notebook. Opens a new one. Gerry is still in it. The font is much smaller." },
  { id:"memo",     label:"📝 Issue a Clarifying Memo", cost:0,   drop:1, cooldown:1200,
    desc:"Send a company-wide memo clarifying that everything is fine. Henderson reads it. Says nothing. Files it. But the gesture buys time.",
    story:"The memo goes out. 'We remain committed to open dialogue and continuous improvement.' Henderson reads it. Files it as Exhibit F-1. Says to Scott: 'He sent a memo.' Scott: 'yeah i saw.' Henderson: 'It doesn't help.' Scott: 'no.' But Henderson's current line of inquiry pauses. Briefly." },
  { id:"settle",   label:"🤐 Settle Quietly",         cost:900, drop:3, cooldown:999,
    desc:"HR facilitates. Legal is involved. An NDA is signed. Henderson accepts. This is expensive. This is the only thing that moves Henderson more than one level. It is a pause, not an ending.",
    story:"Settlement reached. NDA signed. $40,000 in legal fees, not counting yours. Henderson's lawyer calls it 'a reasonable outcome.' Henderson calls it 'a pause.' There is a difference between a pause and an ending. Henderson knows the difference. The notebook goes into Henderson's bag. The bag goes home every night. It has always gone home every night." },
];

const HENDERSON_DEMOTION_SECONDS = 180;


// ─── HENDERSON CRISIS SCENES ─────────────────────────────────────────────────
const HENDERSON_CRISIS = {
  onset: {
    title: "Henderson Has a Lawyer.",
    body: "A letter has arrived from Henderson's legal counsel. It references — and these are direct quotes — 'a sustained pattern of retaliatory conduct,' 'deliberate misrepresentation of deliverables,' and 'a documented culture of psychological harm.' Scott read it from his car. Texted one word: 'thorough.' Darrell read it at his desk. Said nothing. Folded a new napkin. The napkin has a label now.",
    options: [
      "Issue a statement. 'We take all concerns seriously.'",
      "Call an emergency all-hands.",
      "Call your own lawyer. Immediately.",
    ],
    outcomes: [
      { souls:-200, msg:"The statement is released. Henderson's lawyer responds within four hours. The response is longer than the statement. Scott reads both. From his car. Texts Darrell: 'statement ratio is bad.' Darrell already knew.", morale:5 },
      { souls:-300, msg:"The all-hands is held. Henderson attends. Henderson has prepared remarks. The remarks are organized by exhibit. You are referred to as 'the respondent' throughout. Linda cries. Darrell says: 'Exhibit F is the good one.' He means good for Henderson.", morale:8 },
      { souls:-400, msg:"Your lawyer is retained at $450/hour. Your lawyer reads the letter. Your lawyer says: 'This is very organized.' Your lawyer bills for the reading. Henderson's lawyer has been working on this since Q2. Scott knew it was Q2. Scott always knows.", morale:3 },
    ],
  },
  demotion: {
    title: "The Board Has Reviewed Henderson's File.",
    body: "The meeting lasted two hours. Henderson presented for ninety minutes. Darrell's one sentence from FINAL v2 was the final slide. Scott's parking-lot bullet points were slide four. The Board has voted. Gerry is being moved to a reduced scope role, effective immediately. Henderson watches from the window as the decision is communicated. Henderson does not celebrate. Henderson closes the notebook. Henderson opens a new one.",
    flavor: "Scott hears the news from his car. Texts: 'hm.' That's all. Darrell hears the news. Says: 'The notebook was always going to be enough.' Linda cries. Casey closes her resignation letter for the first time in months. Henderson is still here. Henderson will always be here.",
  },
  appeaseOutcomes: {
    memo: "The memo goes out. 'We remain committed to open dialogue and continuous improvement.' Henderson reads it. Files it as Exhibit F-1. Says to Scott: 'He sent a memo.' Scott: 'yeah i saw.' Henderson: 'It doesn't help.' Scott: 'no.' But Henderson pauses. Briefly.",
    pizza: "The pizza arrives. Henderson looks at the pizza. Looks at Gerry. Says: 'Pizza.' Not as a question. Not as a statement. Just as an observation of what is happening. Henderson eats one slice. It is a very good slice. Henderson writes something in the notebook. The pizza has bought you time. Not much. But time.",
    wellness: "The EAP is reinstated. Henderson reads the announcement. Reads it again. Says to Scott: 'The app is back.' Scott, from his car: 'yeah i saw.' Henderson notes the improvement. Drops the inquiry one level. The notebook is still open. It will always be open.",
    promote: "The promotion is announced. Henderson reads it. Says nothing for a long time. Then: 'Good.' Just 'good.' It is the most unambiguous thing Henderson has ever said. The team notices. Morale lifts visibly. Henderson closes the current section of the notebook. Opens a new section. Gerry is still in it. But the font size is smaller.",
    settle: "The settlement is reached. NDA signed. $40,000 in legal fees. Henderson's lawyer calls it 'a reasonable outcome.' Henderson calls it 'a pause.' There is a difference between a pause and an ending. Henderson knows the difference. Henderson has always known the difference. The notebook is in Henderson's bag. The bag goes home with Henderson every night.",
    apologize: "Gerry reads a prepared statement of apology in the all-hands. It is four minutes long. It uses the word 'journey' twice. Henderson watches from the second row. When it ends, Henderson says: 'Thank you for that.' Then Henderson opens the notebook. Darrell watches this happen. Says, quietly: 'the notebook opened.' Scott, who is watching from his car via calendar link: 'yeah it was going to.'",
  },
};

// ─── HENDERSON ARC ───────────────────────────────────────────────────────────
const HENDERSON_EVENTS = [
  { rankIdx:1, emoji:"🧾", title:"Henderson Has Questions.", body:`Henderson has requested "a quick chat about team direction." Scott prepared a briefing in 18 minutes. It is very good. You did not use it. Henderson has a notebook.`, options:["'My door is always open, Henderson.'","Ignore the Ping.","Forward it to HR as 'concerning.'"], outcomes:[{souls:0,msg:"47 minutes. Henderson has data. You say 'great points' and leave. Darrell: 'forty-seven minutes. Respect.' He means Henderson.",henderson:1,moraleWin:true},{souls:100,msg:"Henderson sends two follow-ups. Henderson is taking notes. Scott left at 2. He considered saying something. Decided it wasn't worth staying for.",henderson:2,moraleWin:false},{souls:-200,msg:"HR agrees with Henderson. Linda cries. Darrell: 'well that aged badly.' He writes it down.",henderson:3,moraleWin:true}] },
  { rankIdx:2, emoji:"📋", title:"Henderson Has Filed a Complaint.", body:`HR has received a formal complaint. Four pages. Footnotes. Scott proofread it: 'Fixed a comma on page 3. Very tight structure.' He left at 2.`, options:["Meet with Henderson. Professionally.","Dispute every point. In writing.","Offer Henderson a lateral move to a different floor."], outcomes:[{souls:-100,msg:"Civil. Henderson has notes. The notebook is getting thick. Darrell walked past, looked in, said 'bold,' kept walking.",henderson:2,moraleWin:true},{souls:50,msg:"HR has eight pages. Nothing is resolved. Henderson considers this a win. Scott read both docs from his car. Texted: 'Bold structure.' Did not elaborate.",henderson:3,moraleWin:false},{souls:150,msg:"The new floor is worse. Henderson files a second complaint. Darrell: 'Yeah that was always going to be Exhibit B.'",henderson:3,moraleWin:false}] },
  { rankIdx:3, emoji:"🔗", title:"Henderson Is on LinkUp.", body:`Henderson has updated their profile. New headshot. 'Exploring opportunities in ethical workplace culture.' Scott: 'Good photo.' He left at 2.`, options:["Send Henderson a connection request.","Flag the profile to your PR firm.","Give Henderson a surprise 'spot bonus' to buy their silence."], outcomes:[{souls:0,msg:"Henderson accepts. Does not endorse you for anything. Darrell: 'Smart move.' Nobody knows which move he meant.",henderson:2,moraleWin:false},{souls:-150,msg:"'It's just a LinkUp profile.' $400. Scott, from his car: 'lol.' Full response.",henderson:2,moraleWin:false},{souls:200,msg:"Henderson uses the bonus for an employment lawyer consultation. You funded Henderson's legal strategy. Darrell: 'Most efficient thing Gerry has ever done.' He is not joking.",henderson:5,moraleWin:false}] },
  { rankIdx:4, emoji:"⚖️", title:"Henderson Has a Lawyer.", body:`Henderson's lawyer has sent a letter. 'A pattern of retaliatory conduct.' Scott, when asked: 'Yeah, around Q2.' He was texting. He left at 2.`, options:["Settle quietly. Now.","Fight it. You have lawyers too.","Promote Henderson. Immediately."], outcomes:[{souls:-500,msg:"Settlement reached. NDA signed. Darrell: 'Efficient.' He means Henderson.",henderson:3,moraleWin:true},{souls:-300,msg:"Legal battle begins. Henderson's lawyer is excellent. Scott sent the timeline docs from his car. Henderson's lawyer: 'unusually thorough.' Scott was already home.",henderson:4,moraleWin:false},{souls:300,msg:"Henderson is promoted. Holds a psychological safety meeting day one. Everyone attends voluntarily. Scott, leaving at 2: 'good meeting. henderson's got it.' The room was still going.",henderson:2,moraleWin:true}] },
  { rankIdx:5, emoji:"📰", title:"Henderson Spoke to a Journalist.", body:`Jamie has spoken with 'several current and former employees.' One source is 'particularly detailed and well-documented.' That is Henderson. Scott contributed two sentences. Both devastating. He left at 2.`, options:["No comment.","Issue a statement about your 'people-first culture.'","Find out what Henderson said. Exactly."], outcomes:[{souls:0,msg:"The article runs. Scott's two sentences are cited as 'corroborating in their brevity.' Darrell: 'Scott didn't need more than two sentences.' He means it as a compliment. To Scott.",henderson:3,moraleWin:true},{souls:-100,msg:"'We are committed to a respectful workplace.' Next to Henderson's quotes. 4,200 readers notice the contrast. Darrell: 'That's going to haunt you.' Already walking to his car.",henderson:3,moraleWin:true},{souls:100,msg:"Henderson said everything. Organized by date. Scott helped from his car. Texted: 'had these already tbh.' Left at 1:58.",henderson:3,moraleWin:true}] },
  { rankIdx:6, emoji:"📢", title:"Henderson Is Organizing.", body:`Henderson has been holding off-site meetings. A shared doc: 'Collective Concerns — FINAL v1.' 23 contributors. Scott contributed one bullet from his car. Clearest one. Darrell contributed one sentence. Funnier than everything else, which made it worse. Bitsy signed it.`, options:["Do nothing. This will pass.","Call an all-hands. Address the 'rumors.'","Offer the entire team a pizza party."], outcomes:[{souls:-200,msg:"FINAL v1 becomes FINAL v2. Scott added two bullets from the parking lot. Texted: 'just a couple clarifications.' They are devastating.",henderson:3,moraleWin:true},{souls:-150,msg:"Henderson asks three questions. You cannot answer any. Scott had sent all three answers in advance from his car. Three bullet points. All correct. Dash S.",henderson:3,moraleWin:true},{souls:-300,msg:"Henderson: 'A pizza party is not a substitute for systemic change.' Darrell: 'True. Also the pizza was bad.' The clapping gets louder.",henderson:4,moraleWin:true}] },
  { rankIdx:7, emoji:"👑", title:"Henderson vs. The Board.", body:`Henderson has requested a Board meeting. The Board accepted. He's bringing the notebook, the lawyer, Scott's bullet points, and Darrell's sentence from FINAL v2. You have not been invited. Scott texted: 'go get em' from his car.`, options:["Request to attend. As a courtesy.","Preempt it. Resign before the meeting.","Let it happen. You have a golden parachute."], outcomes:[{souls:-500,msg:"Request denied. Three hours. Henderson presents for two. Darrell's sentence is the last slide. The Board reads it twice. They do not explain why.",henderson:3,moraleWin:true},{souls:0,msg:"You resign. Henderson's counter-statement is more accurate than your press release. Darrell: 'Yeah, that about covers it.' Scott left at 2.",henderson:3,moraleWin:true},{souls:500,msg:"The parachute deploys. Henderson watches from the window. Darrell waves. Scott: 'later.' Linda cries — happy tears. Casey deletes her resignation letter. You are gone. The office exhales.",henderson:3,moraleWin:true}] },
];

// ─── SCHEMES (v12 names — every instance of old names replaced) ───────────────
const SCHEMES = [
// RANK 1
{id:1,  emoji:"🖨️",text:"Monitor the Confession Booth",              flavor:"Gerry calls it the Confession Booth. Nobody else calls it that. Linda has already printed three \'Hang in There\' cat posters. Scott: \'Nice.\'",optics:50, cost:20,time:4, minLevel:1},
{id:2,  emoji:"📧",text:"Send a HIGH IMPORTANCE email about nothing",  flavor:"Send it. Go silent for 45 minutes. Linda assumes it\'s about her. It is about everyone.",optics:78, cost:25,time:3, minLevel:1},
{id:3,  emoji:"💬",text:"Send a Ping that just says 'Hi'",             flavor:"Mark it urgent. Gerry calls it high priority. Scott reads it. Says: \'Hm.\' Closes it.",optics:50, cost:20,time:2, minLevel:1},
{id:4,  emoji:"🐟",text:"Microwave fish at 9am",                      flavor:"Fill the office with smell at 9am. Scott looks up: \'Bold choice.\' Goes back to his alien documentary. It\'s somehow worse.",optics:75, cost:25,time:3, minLevel:1},
{id:5,  emoji:"👁️",text:"Hover behind someone's desk without speaking",flavor:"Scott\'s desk. Scott does not look up. He is aware you are there. He has decided not to engage.",optics:94, cost:30,time:3, minLevel:1},
{id:6,  emoji:"🥗",text:"Schedule a meeting during lunch",             flavor:"Casey: \'Is this really necessary?\' Darrell shows up on time. Leaves on time. Says one thing. You think about it for a week.",optics:70, cost:28,time:2, minLevel:1},
{id:7,  emoji:"🧊",text:"Force icebreakers on exhausted adults",       flavor:"\'Share a fun fact.\' Scott shares something about freight logistics that is genuinely fascinating. You redirect to the agenda. This was a mistake.",optics:100,cost:32,time:4, minLevel:1},
{id:8,  emoji:"🥡",text:"Eat someone's labeled lunch",                 flavor:"It was Scott\'s. Scott sees the empty container. Says: \'noted.\' Opens his bag. Has a backup. Scott always has a backup.",optics:65, cost:25,time:2, minLevel:1},
{id:9,  emoji:"📝",text:"Make the intern take notes",                  flavor:"The intern has a master\'s degree. They are documenting your opinion on font sizes. Darrell watches this happening and makes a note of his own.",optics:94, cost:30,time:3, minLevel:1},
{id:10, emoji:"⏰",text:"Start the meeting by waiting for latecomers", flavor:"You wait. Casey is late again — she\'s deciding whether to quit. Darrell, who arrived on time, looks at the clock. Says: \'Twelve minutes.\'",optics:55, cost:22,time:2, minLevel:1},
{id:101,emoji:"🎧",text:"Ban headphones. 'We value collaboration.'",   flavor:"Scott removes one earbud. He was done with the Q3 framework an hour ago. He says 'sure.' Stares at the middle distance. Leaves at 2.",optics:60, cost:24,time:2, minLevel:1},
{id:102,emoji:"🌡️",text:"Control the thermostat and tell no one",     flavor:"It is 61 degrees. Linda is wearing three layers. Darrell puts on a sweater. Says: 'February.' That's his entire complaint.",optics:55, cost:22,time:2, minLevel:1},
{id:103,emoji:"🍕",text:"Order pizza instead of giving a raise",      flavor:"Scott's review was exceptional. The raise would have been $6,000. The pizza cost $52. Darrell looks at the pizza. Looks at Scott. Says: 'That's the trade.'",optics:85, cost:32,time:3, minLevel:1},
{id:104,emoji:"📸",text:"Post a photo of the team on LinkUp",         flavor:"Linda is mid-cry in the background. Scott is watching something. Darrell is looking directly at the camera. Henderson screenshots it.",optics:70, cost:27,time:2, minLevel:1},
{id:105,emoji:"🗣️",text:"Interrupt Beardogg mid-presentation",        flavor:"He is on slide 3. You interrupt. What you say is less good than what Beardogg was about to say. Darrell looks at the ceiling briefly. Goes back to looking at Beardogg.",optics:82, cost:32,time:3, minLevel:1},
{id:106,emoji:"😤",text:"Sigh loudly during Scott's update",          flavor:"Scott is presenting the Q3 framework. Your sigh is long. Scott pauses. Says: 'You good?' Then continues. Numbers correct. Done in eight minutes.",optics:78, cost:30,time:3, minLevel:1},
{id:107,emoji:"💬",text:"Tell Casey her resignation letter has a typo",flavor:"She opens it to check. It doesn't have a typo. She reads a paragraph she forgot she wrote. It's very good. She adds a new one. About you.",optics:90, cost:35,time:3, minLevel:1},
{id:108,emoji:"🤫",text:"Tell Linda something 'in confidence'",        flavor:"'Just between us.' Linda will not tell anyone. She will cry about it alone. Scott overhears. Says: 'That's cold.' He means you.",optics:80, cost:30,time:3, minLevel:1},
{id:109,emoji:"🌅",text:"Let Bitsy rebrand the Monday standup",      flavor:"It's now the 'Monday Momentum Moment.' Bitsy has a slide with a sunrise and a blazer with cartoon clouds on it. Darrell says: 'Sunrise.' Bitsy takes this as enthusiasm.",optics:75, cost:28,time:3, minLevel:1},
{id:110,emoji:"🌬️",text:"Turn off the office heat. 'Budget.'",       flavor:"Linda is wearing a coat indoors. Scott hasn't noticed — he runs warm. He's been in shorts since October. Darrell puts on a sweater. Says: 'Cold.' He means it warmly. Relatively.",optics:68, cost:26,time:2, minLevel:1},
// RANK 2
{id:11, emoji:"🪑",text:"Spin your chair and refuse to speak",        flavor:"Something goes wrong. You spin. Linda enters. You scream. Linda leaves. Linda was bringing coffee. Darrell heard this from the hallway. He says, to no one: 'And that's a headline.' He writes it down.",optics:192,cost:70, time:6, minLevel:2},
{id:12, emoji:"🖨️",text:"Interrogate Beardogg about a printout",      flavor:"Beardogg made notes on the strategic objectives — how to help the company. Confront him about defacing corporate property. Beardogg says nothing. Emails you the notes as a SharedSuffering doc. They're excellent. Scott read them: 'Solid doc.'",optics:180,cost:65, time:5, minLevel:2},
{id:13, emoji:"🎤",text:"Take credit in the all-hands",               flavor:"Casey built 90% of it. Scott figured out the hard part between 9 and 11am. Darrell, to Casey afterward: \'For what it\'s worth, everyone knows.\' Casey: \'I know. It\'s in the document.\'",optics:204,cost:75, time:6, minLevel:2},
{id:14, emoji:"📧",text:"Reply-all: 'Per my last Ping'",              flavor:"Casey didn't read it. She was updating her resignation letter. Scott read it immediately, understood it, and said nothing because nothing needed to be said. Darrell replied with a single period. You have not stopped thinking about the period.",optics:120,cost:40, time:3, minLevel:2},
{id:15, emoji:"🔗",text:"Post on LinkUp about servant leadership",    flavor:"Scott sees it. Scott has 847 endorsements on LinkUp and has not logged in since 2019. He logs in briefly, reads the post, logs out. This is somehow more cutting than any response he could have given.",optics:156,cost:55, time:4, minLevel:2},
{id:16, emoji:"🌙",text:"Send emails after midnight",                  flavor:"Scott responds at 12:04am with the correct answer. The response is one sentence. It solves the problem entirely. You hadn't expected a response. Scott goes back to sleep. Scott had the answer before he went to bed.",optics:168,cost:60, time:3, minLevel:2},
{id:17, emoji:"✏️",text:"Rewrite Beardogg's work to insert yourself",  flavor:"Casey\'s draft was exceptional. You change 11 words and add your name. Scott, from his car: \'you changed the good sentence btw.\' No further contact until Monday.",optics:216,cost:78, time:6, minLevel:2},
{id:18, emoji:"🎄",text:"Cancel the Christmas bonus. Again.",          flavor:"December 22nd. One company value is Generosity. Linda cries. Casey's resignation letter gets a section about this specifically. Darrell looks at the company values poster on the wall. Just looks at it. For a long time.",optics:228,cost:82, time:6, minLevel:2},
{id:19, emoji:"🤖",text:"Announce you're 'leveraging AI' to replace two developers",flavor:"Hire a consultant to explain what AI is. Pay them $40,000. Casey has been using AI tools since they existed. Scott built a small AI tool last Tuesday for fun. 'Just a thing I was curious about,' Scott said.",optics:240,cost:88, time:7, minLevel:2},
{id:20, emoji:"🥶",text:"Deny Casey's sick day",                      flavor:"Casey comes in sick. Updates her resignation letter on company time. Darrell sees Casey at her desk. Says: 'You look terrible.' Casey says: 'I know.' Darrell says: 'Go home.' Casey says: 'I can't.' Darrell: 'Yeah.'",optics:200,cost:72, time:5, minLevel:2},
{id:21, emoji:"🤖",text:"'Leveraging AI' to replace two developers",  flavor:"Hire a consultant. $40,000. Scott built something equivalent last Tuesday for fun. 'It's not perfect,' Scott says. It is perfect.",optics:240,cost:88, time:7, minLevel:2},
{id:111,emoji:"📊",text:"Assign Scott's project to someone else mid-stream",flavor:"Scott has been leading this for two months. Reassign it. Scott shrugs. Picks up his phone. Has already figured out how this ends.",optics:210,cost:76, time:6, minLevel:2},
{id:112,emoji:"🌅",text:"Give Bitsy Scott's budget",                  flavor:"Scott's budget was for tooling that would have saved $40,000. Bitsy's budget produces a neon sign that says 'COLLAB.' Darrell: 'There it is.'",optics:195,cost:70, time:5, minLevel:2},
{id:113,emoji:"😭",text:"Make Linda cry before the 10am standup",     flavor:"Mention the font. That's all it takes. Scott, packing up to leave at 1:50, detours to Linda's desk. Leaves a snack and a Post-it: 'it passes.' Linda keeps the Post-it.",optics:175,cost:63, time:4, minLevel:2},
{id:114,emoji:"📅",text:"Schedule a meeting during Casey's vacation",  flavor:"Casey attends from the beach. Updates her resignation letter from the beach. Darrell is in the meeting. On time. At the end says: 'She was on vacation.'",optics:185,cost:67, time:5, minLevel:2},
{id:115,emoji:"🐕",text:"Assign Beardogg a fourth project",            flavor:"'I know I can count on you, Beardogg.' Beardogg says 'yeah bro, locked in.' Scott quietly does all four. Beardogg texts Gerry: 'crushed it bro.'",optics:220,cost:80, time:6, minLevel:2},
// RANK 3
{id:22, emoji:"💎",text:"Collect farewell contributions. Pocket the difference.",           flavor:"Three employees leaving. You collect $780. Each gets a $25 gift card. Combined: $75. Casey does the math immediately.",optics:630,cost:180,time:14,minLevel:3},
{id:380,emoji:"🖼️",text:"Commission abstract art for the executive hallway.",
  flavor:"$680. Oil on canvas. The price tag is still on the frame. 'Blue Disruption No. 4.' Linda notices the painting first. Then the price tag. She does the math. Goes to her desk. Cries quietly for eleven minutes. Delivers everything on time.",optics:700,cost:200,time:14,minLevel:3},
{id:381,emoji:"📋",text:"Get caught. Deny everything.",
  flavor:"Casey presents it as a 'quick math question.' Collected: $780. Gift cards: $75. Art on the wall: $680. Remainder: $25, unaccounted for. The price tag is still on the frame. Darrell looks at the painting. Looks at the price tag. Says: 'Blue Disruption No. 4.' Just that.",optics:15,cost:5,time:16,minLevel:3},
{id:23, emoji:"🧘",text:"Launch a mandatory wellness initiative",       flavor:"Cancel the EAP. Replace with a $4/month app. Bitsy runs yoga at 6am in athleisure with fringe on it. Scott attends once. Falls asleep during the meditation.",optics:450,cost:130,time:10,minLevel:3},
{id:24, emoji:"🔀",text:"Reorg for no reason",                        flavor:"Scott now reports to someone who reports to Scott\'s old reports. Scott looks at the org chart for four seconds. Says \'hm, okay.\' Leaves at 2.",optics:540,cost:155,time:12,minLevel:3},
{id:25, emoji:"📉",text:"Outsource the team. Rehire as contractors.",  flavor:"Beardogg\'s contract pays 30% less. Scott renegotiates to clause 4b: deliverable-based, not hours-based. His output increases. He now leaves at 1:45.",optics:600,cost:170,time:13,minLevel:3},
{id:26, emoji:"🌀",text:"Spend 8 months defining ownership",          flavor:"Scott produced a RACI in 48 hours. You tabled it. Eight months later it\'s still in the shared drive. Untouched. Correct.",optics:510,cost:145,time:12,minLevel:3},
{id:27, emoji:"🥅",text:"Move the goalpost on Beardogg",               flavor:"Casey is 90% done. Change the requirements. Casey rebuilds and delivers early. Her resignation letter gets a paragraph. Scott: \'that\'s twice now.\' Leaves a snack on Casey\'s desk on the way out.",optics:465,cost:135,time:10,minLevel:3},
{id:28, emoji:"🦸",text:"Create chaos. Arrive as the hero.",          flavor:"Withhold critical information for two weeks. Solve the crisis with the information you were holding. Scott knew since week one. Texted Beardogg: \'lol classic.\'",optics:540,cost:155,time:12,minLevel:3},
{id:29, emoji:"🕔",text:"Manufacture urgency at 4:58 PM Friday",     flavor:"\'Can everyone stay a few minutes?\' Scott left at 2. He solved it from home and texted the group. Darrell reads it aloud: \'he did it from his car.\'",optics:420,cost:120,time:9, minLevel:3},
{id:30, emoji:"🤖",text:"Describe yourself as a disruptor on LinkUp", flavor:"Scott screenshots it and sends it to a group chat. You don\'t know which one. You don\'t know who\'s in it.",optics:465,cost:135,time:10,minLevel:3},
{id:31, emoji:"💬",text:"Tell Henderson that Darrell is their new point of contact",flavor:"Henderson looks at you. Looks at Darrell. Darrell meets Henderson\'s gaze. Says nothing. Something has been understood. You were not part of it.",optics:580,cost:165,time:13,minLevel:3},
{id:116,emoji:"🌅",text:"Give Bitsy a speaking slot at the all-hands",flavor:"47 slides. Each has a sunrise. Bitsy is wearing a sequined turtleneck. It is Tuesday. Darrell: 'every slide AND the turtleneck.' That was his entire review.",optics:500,cost:145,time:11,minLevel:3},
{id:117,emoji:"🐕",text:"Present Beardogg's award-winning work as your own",flavor:"You present. Beardogg got himself on stage somehow — Douglas Pinnacle connection. He's wearing Vineyard Vines. Scott, in the audience, writes something on a napkin.",optics:560,cost:160,time:13,minLevel:3},
{id:118,emoji:"😭",text:"Assign Linda to Henderson's support request", flavor:"Henderson gives Linda a tissue and asks if she's okay. Nobody has asked Linda if she's okay in three years. She says a lot of things. Henderson takes notes.",optics:490,cost:140,time:11,minLevel:3},
{id:119,emoji:"🧾",text:"Expense your vacation as a 'site visit'",    flavor:"You went to Cancun. The expense report says 'market research.' There is a receipt for a margarita labeled 'client entertainment.' The client does not exist.",optics:560,cost:160,time:13,minLevel:3},
{id:120,emoji:"⚖️",text:"Apply rules selectively and deny it",        flavor:"You were late seven times this month. You have a corner office. Darrell has been tracking this. He tells you directly. Says: 'Seven times.' Walks away.",optics:575,cost:165,time:13,minLevel:3},
// RANK 4
{id:33, emoji:"💰",text:"Give yourself a 40% raise",                  flavor:"\'Compensation alignment with market benchmarks.\' Scott calculated real benchmarks last quarter. Filed it as \'fyi_compensation_actual.pdf.\' Darrell has read it.",optics:860,cost:220,time:14,minLevel:4},
{id:34, emoji:"🗒️",text:"Fire someone via Post-it note",              flavor:"Canary yellow. \'Today is your last day. Thanks!\' Linda photographs it. Henderson receives the photograph. Darrell: \'Post-it.\' Just that.",optics:925,cost:240,time:15,minLevel:4},
{id:35, emoji:"🤥",text:"Gaslight HR about a policy you invented",    flavor:"Enforce a rule that doesn\'t exist. Scott pulls up the handbook in nine seconds: \'Not in here.\' You: \'It\'s a cultural thing.\' Scott says \'okay\' in a tone that means the opposite.",optics:790,cost:200,time:13,minLevel:4},
{id:36, emoji:"⌚",text:"Redefine full time as 60 hours",             flavor:"Beardogg was already working 60 hours. Scott renegotiated his contract three months ago — clause 4b. He saw this coming.",optics:890,cost:230,time:14,minLevel:4},
{id:37, emoji:"📊",text:"Build a 63-slide TraumaPoint nobody will read",flavor:"Add the Whoosh transition. Bitsy contributed slides 4-12. All have sunrises. Scott got through slide 3. His feedback on slide 3 was correct and comprehensive.",optics:790,cost:200,time:13,minLevel:4},
{id:38, emoji:"📋",text:"Schedule the performance review at 4:30 Friday",flavor:"You\'ve known since Tuesday. Begin at 4:47. Say \'inconsistent.\' Give no examples. Scott hears about it. Says: \'Friday at 4:30.\' Shakes his head slowly.",optics:925,cost:240,time:15,minLevel:4},
{id:39, emoji:"🌫️",text:"Deploy weaponized ambiguity on Casey",      flavor:"Give unclear instructions. When wrong: \'you should\'ve known.\' Darrell, to Casey: \'Write it down.\' She does. The resignation letter is now 13 pages.",optics:825,cost:210,time:13,minLevel:4},
{id:40, emoji:"🔀",text:"Announce a second reorg",                    flavor:"Scott: \'so I report to... okay.\' Leaves at 2. Darrell draws the org chart on a napkin. Adds an annotation that says \'lol.\'",optics:715,cost:185,time:12,minLevel:4},
{id:41, emoji:"🤖",text:"Give a TraumaPoint on AI transformation",    flavor:"Use \'machine learning\' eleven times. Scott built something equivalent last weekend because he was bored. It is better than your deck.",optics:840,cost:215,time:14,minLevel:4},
{id:121,emoji:"🌅",text:"Give Bitsy Beardogg's project",               flavor:"Casey's project is 70% complete. Assign to Bitsy for 'fresh energy.' Bitsy renames it. Adds a sunrise. Casey quietly continues doing the actual work. Scott: 'There it is.'",optics:870,cost:225,time:14,minLevel:4},
{id:122,emoji:"🏖️",text:"Take two weeks vacation with no coverage plan",flavor:"You are in Santorini. Decisions require your sign-off. You respond to one email. About your return flight. Scott handles everything else without being asked.",optics:760,cost:195,time:12,minLevel:4},
{id:123,emoji:"🏢",text:"Announce a hiring freeze. Hire a friend.",    flavor:"Headcount is frozen. Two weeks later your friend joins as 'Strategic Advisor.' Darrell: 'Different budget.' That's all. He already knew.",optics:855,cost:220,time:14,minLevel:4},
{id:124,emoji:"📁",text:"Request all files copied to your personal drive",flavor:"'Redundancy.' Scott looks at the request. Says: 'That's one word for it.' Sets up the transfer. Adds a note to the log. Three words. Not favorable.",optics:770,cost:195,time:12,minLevel:4},
{id:125,emoji:"🐕",text:"Send Beardogg to cover the client call you missed",flavor:"Beardogg handles it. Client: 'the most competent person we've spoken to.' You forward the email with 'Great to see the team showing up.' Scott: 'Bold move.'",optics:780,cost:200,time:12,minLevel:4},
// RANK 5
{id:390,emoji:"🎙️",text:"Launch a leadership podcast. 'The Gerry Pod.'",
  flavor:"Episode 1: 'What I've Learned About Winning.' Episode 2: 'Failure Is Just Winning Later.' Episode 3: never recorded. JJ is the first subscriber. JJ leaves a five-star review. Darrell: 'Three episodes.' He says it like a verdict.",optics:1310,cost:315,time:20,minLevel:5},
{id:391,emoji:"🎙️",text:"The Gerry Pod: interview a thought leader.",
  flavor:"Your guest is a man with a podcast about podcasting. His main insight: 'consistency.' You nod a lot. JJ clips it for LinkUp. 47 plays. 44 of them are JJ. Scott: 'never heard of him.'",optics:1440,cost:345,time:22,minLevel:5},
{id:392,emoji:"🎙️",text:"The Gerry Pod: episode on 'authentic leadership.'",
  flavor:"22 minutes. The word 'authentic' appears fourteen times. Henderson listens. Takes notes. Not because he wants to. Because he has to. The episode is now Exhibit Z.",optics:1510,cost:360,time:24,minLevel:5},
{id:42, emoji:"👦",text:"Give Tyler a title upgrade: VP of Strategic Innovation.", flavor:"Tyler has been here three months. You approve the title change yourself. His new card says 'VP of Strategic Innovation.' Darrell reads the card. Says: 'VP.' Sets it down.",optics:1295,cost:310,time:20,minLevel:5},
{id:43, emoji:"⛵",text:"Cut the pension. Fund the yacht.",            flavor:"Linda cries when she reads the announcement. Scott calculates the long-term financial impact. Files it as \'FYI.\' Darrell reads it. Says: \'Yeah.\'",optics:1510,cost:360,time:22,minLevel:5},
{id:44, emoji:"🎤",text:"Give a TED Talk on the value of hard work",   flavor:"You have not worked hard since 2011. Scott is in the audience. He finished everything by noon and is asleep with the specific ease of someone with zero concerns.",optics:1225,cost:295,time:18,minLevel:5},
{id:45, emoji:"⚔️",text:"Pit employees against each other",           flavor:"Tell two people contradictory things about each other. Darrell says to both of them afterward: \'He made it up.\' The conflict ends. You have made an enemy of Darrell.",optics:1370,cost:330,time:20,minLevel:5},
{id:46, emoji:"🎭",text:"Perform empathy. Do not practice it.",        flavor:"An employee says they\'re struggling. You say \'I hear you.\' Cancel the follow-up. Scott, on his way out at 2, sits with them for ten minutes. Says nothing else.",optics:1150,cost:275,time:17,minLevel:5},
{id:47, emoji:"😤",text:"'Why didn't you escalate?' after discouraging escalation",flavor:"Six months of signals that escalation is weakness. When crisis arrives: \'Why did nobody escalate?\' Darrell has a list. He reads one item. Sets it down. The meeting ends.",optics:1260,cost:300,time:19,minLevel:5},
{id:48, emoji:"🔀",text:"Third reorg.",                               flavor:"Scott: \'that\'s three.\' Leaves. Darrell draws it on a napkin. Adds an annotation that says \'lol.\'",optics:1105,cost:265,time:16,minLevel:5},
{id:49, emoji:"🤖",text:"Tell the board you're 'leaning into AI'",    flavor:"\'We are leaning into AI.\' Scott wrote the technical spec for fun last summer. You are leaning into something Scott built on a weekend.",optics:1315,cost:315,time:20,minLevel:5},
{id:50, emoji:"🌅",text:"Make Bitsy Chief Innovation Officer",        flavor:"Bitsy renames the innovation process \'ideation journey.\' Adds a neon sign. Scott: \'sure.\' Darrell: \'she\'s going to order more neon.\'",optics:1260,cost:300,time:19,minLevel:5},
{id:126,emoji:"🐕",text:"Have Beardogg train his own replacement",     flavor:"Beardogg sends a framework doc with a golf course on the cover. Darrell trains the replacement in two afternoons. The replacement learns everything from Darrell. Says it was the best onboarding they've ever had.",optics:1290,cost:310,time:19,minLevel:5},
{id:127,emoji:"😭",text:"Tell Linda she's 'too emotional' for leadership",flavor:"Linda has applied for team lead. Linda is qualified. Scott, who was leaving at 2, stops. Sits back down. Stays until 5. Does not eat a snack all afternoon.",optics:1290,cost:310,time:19,minLevel:5},
{id:128,emoji:"🧮",text:"Change the commission structure retroactively",flavor:"The quarter ended. The commission structure has also changed. Effective last quarter. Darrell folds the memo in half. Puts it in his jacket pocket.",optics:1400,cost:335,time:21,minLevel:5},
// RANK 6
{id:51, emoji:"🏢",text:"Acquire a competitor. Shut it down.",         flavor:"Their best engineer joins. Sits next to Beardogg. Scott introduced himself on day one: \'Welcome. It\'s a thing here.\' He left at 2.",optics:1880,cost:495,time:27,minLevel:6},
{id:52, emoji:"🏛️",text:"Lobby to make overtime unenforceable",       flavor:"Beardogg was already working overtime. Scott renegotiated six months ago to exempt himself. \'Just seemed like something Gerry would do.\'",optics:2130,cost:560,time:31,minLevel:6},
{id:53, emoji:"🔇",text:"Disable the chat during Henderson's all-hands",flavor:"Henderson raises a hand. You don\'t call on him. He writes the question down. Darrell: \'That was the question too.\'",optics:1710,cost:450,time:25,minLevel:6},
{id:54, emoji:"📊",text:"Post a 'People First' TraumaPoint during layoffs",flavor:"Slide 1: your face, softly lit. Slide 4: \'Exciting chapter ahead.\' Scott, near the door: \'slide 4 is a choice.\' Darrell reads slide 4 twice. Folds a napkin.",optics:1955,cost:515,time:28,minLevel:6},
{id:55, emoji:"🔀",text:"Fourth reorg.",                              flavor:"Darrell now has four napkins. Each is an org chart. He looks at them in order. Says: \'Hm.\' Scott: \'What?\' Darrell: \'Nothing. Just hm.\'",optics:1805,cost:475,time:26,minLevel:6},
{id:56, emoji:"🤖",text:"Launch an 'AI-first' strategy. Credit yourself.",flavor:"Darrell built it. Scott wrote the spec for fun. You announce it. Beardogg updates his resume during the announcement. Darrell: \'he wrote the spec, you know.\' He means Scott. He means himself too.",optics:2050,cost:540,time:30,minLevel:6},
{id:129,emoji:"🌅",text:"Give Bitsy a $200,000 culture budget",       flavor:"Three neon signs, a ball pit, a vibe consultant, and a candle partnership. Bitsy presented the proposal in a sequin blazer over a rhinestone COLLAB tee. Darrell: 'the ball pit and the rhinestones are from the same budget.'",optics:1765,cost:465,time:26,minLevel:6},
{id:130,emoji:"🐕",text:"Retire Beardogg's title. Keep his responsibilities.",flavor:"New title: 'Solutions Enablement Specialist.' Beardogg texts Gerry: 'sick title bro.' Updates his LinkUp. New bio: 'Solutions Enablement Specialist | Enabling Solutions | Golf ⛳.' Scott says the title out loud. Lets it sit.",optics:2070,cost:545,time:30,minLevel:6},
// RANK 7
{id:57, emoji:"🛥️",text:"Prerecord town hall from your yacht",        flavor:"\'A challenging quarter for all of us.\' Beardogg notices the waiter in the background. Updates his resume. Scott: \'there\'s a waiter at 0:47.\' Drives away.",optics:3590,cost:855,time:42,minLevel:7},
{id:58, emoji:"🪂",text:"Golden parachute yourself: $47M",             flavor:"$47M. Gerry considers this earned. Scott calculates what it would mean distributed. Files it as \'Math.\' Darrell reads \'Math.\' Says: \'Yeah.\'",optics:3990,cost:950,time:46,minLevel:7},
{id:59, emoji:"📈",text:"Announce restructuring during record profits", flavor:"The company has never made more money. 340 people lose their jobs. Darrell is quiet all day. At 5pm: \'That\'s the thing about record profits.\'",optics:4345,cost:1035,time:50,minLevel:7},
{id:60, emoji:"🔀",text:"Final reorg. You won't be here for it.",      flavor:"Scott will implement it correctly and finish early and leave at 2. He leaves a snack on the conference table on his way out.",optics:3800,cost:905,time:44,minLevel:7},
{id:61, emoji:"🤖",text:"Replace middle management with AI. Keep your job.",flavor:"Scott reviewed the AI model: \'It agrees with everything. That\'s the problem.\' Filed it as \'FYI.\' Most important document no one will read.",optics:4160,cost:990,time:48,minLevel:7},
{id:131,emoji:"🖼️",text:"Commission a portrait of yourself for the boardroom",flavor:"$12,000. Oil on canvas. Henderson photographs it. It is Exhibit O. Beardogg: 'sick portrait bro.' Gerry considers this the highest compliment.",optics:3465,cost:825,time:40,minLevel:7},
{id:132,emoji:"📜",text:"Rewrite company history to center yourself",  flavor:"You arrived in year seven. The company was founded in year one. Darrell reads the new About Us page. Says: 'Year seven.' Just year seven. Henderson screenshots it.",optics:3865,cost:920,time:45,minLevel:7},
// RANK 8
{id:310,emoji:"🤝",text:"Host a Community Service Day. Pose for photos. Leave before lunch.",
  flavor:"Gerald Sr. sponsors the shirts. Gerry poses with a shovel in seven photos and leaves by 10:15. Scott builds an actual raised bed. Sends a donation larger than Gerry\'s.",
  optics:3990,cost:950,time:46,minLevel:7},
{id:311,emoji:"🤝",text:"Issue a press release about the Community Service Day",
  flavor:"Six paragraphs. Gerry\'s name appears eleven times. The shovel in the photo is clean. Scott\'s shovel built an actual raised bed. The kale is thriving.",
  optics:3130,cost:745,time:36,minLevel:7},

{id:62, emoji:"🎙️",text:"Deliver a keynote in jargon only",           flavor:"22 minutes. Say nothing. Scott left at 2. He sent a text: \'good luck.\' He meant it. Darrell is in the front row. Writes one thing. Folds the napkin.",optics:7260,cost:1425,time:58,minLevel:8},
{id:63, emoji:"💸",text:"Sell the company. Keep the money.",           flavor:"Employees get tote bags. You get a wire transfer. Darrell: \'bold of them to give us tote bags.\' He means you. He has always meant you.",optics:8360,cost:1640,time:65,minLevel:8},
{id:133,emoji:"🌿",text:"Make Scott present the strategy you ignored",  flavor:"Scott's Q2 doc — the one you shelved — is now urgent. Scott finds it in 3 seconds. Presents it in 9 minutes. Board: 'Remarkable foresight.' Scott: 'wrote it in April.'",optics:7800,cost:1530,time:62,minLevel:8},
{id:134,emoji:"🪨",text:"Ask Darrell what he really thinks",            flavor:"Darrell looks at you. Says: 'You sure?' You say yes. Eleven minutes. Specific, accurate, occasionally very funny, which somehow makes it worse. You haven't slept well since.",optics:7500,cost:1470,time:60,minLevel:8},
// ─── GERRY BRAGGING / SELF-UNAWARENESS SCHEMES ──────────────────────────────
{id:350,emoji:"🚗",text:"Buy nephew Tyler a car as a 'graduation gift.' Expense it as 'recruitment.'",
  flavor:"The BMW is in the lot. The expense report says \'Talent Acquisition.\' Tyler has been here two weeks. His desk notebook is labeled \'INNOVATION LIAISON — IDEAS.\' It has one entry. Darrell has read the entry.",
  optics:1400,cost:335,time:21,minLevel:5},
{id:351,emoji:"🎓",text:"Give Tyler a real project. Watch what happens.",
  flavor:"Tyler presents. Says \'we\' nine times. All nine are Beardogg\'s work. Bitsy: \'Great energy.\' Scott: \'bmw thing all over again.\'",
  optics:1600,cost:385,time:24,minLevel:5},
{id:352,emoji:"🏎️",text:"Upgrade Gerry's company car. 'Leadership presence matters.'",
  flavor:"New car. Expensed as \'Brand Representation.\' Henderson has had the receipt since Tuesday. It is Exhibit D.",
  optics:900,cost:230,time:14,minLevel:4},
{id:353,emoji:"🥂",text:"Expense a $1,200 dinner and describe it as 'team building.'",
  flavor:"Three attendees. Gerry, Tyler, someone\'s son. The receipt has $340 in \'miscellaneous entertainment.\' Unexplained. Henderson has sent it to Jamie.",
  optics:840,cost:215,time:13,minLevel:4},
{id:354,emoji:"🛳️",text:"Book the yacht for a 'strategy retreat.' Invite Tyler. Do not invite the strategy team.",
  flavor:"Three nights. The Bahamas. \'Leadership Only.\' The strategy team is Beardogg, Scott, and Casey. Casey\'s resignation letter gets a new section: \'The Yacht.\'",
  optics:1955,cost:515,time:28,minLevel:6},
{id:355,emoji:"🎁",text:"Give the board a gift basket that includes a bottle of wine you expensed separately.",
  flavor:"Gift basket: $240. Expensed. The wine is also expensed, separately. The wine is in the basket. Henderson has both receipts. They are Exhibits E and E-1.",
  optics:760,cost:195,time:12,minLevel:4},
{id:356,emoji:"💬",text:"Tell Beardogg 'you're doing great — for someone with your background.'",
  flavor:"Gerry means this as a compliment. Gerry is smiling. Beardogg: \'Thanks.\' Goes back to work. Scott hears about it. Just drives home. Doesn\'t leave a snack.",
  optics:500,cost:145,time:10,minLevel:3},
{id:357,emoji:"💬",text:"Compliment Linda on how 'emotional' she is — 'it means you really care.'",
  flavor:"Linda stares at Gerry for four seconds. Then cries. Gerry takes this as confirmation. Casey documents the quote. It is now page 11 of the resignation letter.",
  optics:440,cost:125,time:9,minLevel:3},
{id:358,emoji:"💬",text:"Tell Scott 'I wish I had your ability to just... not worry about things.'",
  flavor:"Scott has completed this week\'s work, next week\'s outline, and a side project. He is not \'not worrying.\' He has simply finished. Says: \'Sure.\'",
  optics:380,cost:110,time:8,minLevel:2},
{id:359,emoji:"💬",text:"Tell Casey her 'passion is inspiring' right after denying her promotion.",
  flavor:"Gerry tells Casey her passion is inspiring two days after denying her promotion. Adds three paragraphs to page 12. Scott reads page 12: \'Page 12 is the best page.\'",
  optics:620,cost:175,time:11,minLevel:3},
{id:360,emoji:"💰",text:"Announce at the all-hands that you 'could have made more money elsewhere' but chose this company.",
  flavor:"\'I could have made more money elsewhere.\' The team averages $67,000. Gerry made $1.4M plus options. Scott, on the call from his car, mutes himself. Then: \'yeah okay.\'",
  optics:1635,cost:430,time:22,minLevel:6},
{id:361,emoji:"💰",text:"Mention casually that you 'probably need a bigger boat' in the quarterly review.",
  flavor:"The quarter was flat. Twelve people were laid off. Gerry mentions needing a bigger boat. Henderson writes \'the boat comment\' with a timestamp.",
  optics:2415,cost:575,time:30,minLevel:7},
{id:362,emoji:"💰",text:"Post on LinkUp about 'the sacrifices leadership requires' from your vacation.",
  flavor:"Location metadata: Santorini. Caption: \'Real leadership means never fully switching off.\' Darrell reads the caption. Says: \'Santorini.\' Writes it down.",
  optics:3215,cost:765,time:38,minLevel:7},
{id:363,emoji:"💰",text:"Expense Tyler's relocation package.",
  flavor:"Tyler moved 12 minutes from his parents\' house. Relocation package: $18,000. Categories include \'Transition Support.\' Henderson has the breakdown. Exhibits Q through S.",
  optics:2815,cost:670,time:34,minLevel:7},

// ─── HENDERSON MANAGEMENT SCHEMES ───────────────────────────────────────────
{id:370,emoji:"🧾",text:"Move Henderson's desk to face a wall.",
  flavor:"Henderson\'s new desk faces a wall. Henderson files three new exhibits from the new desk on day one. The wall has not stopped Henderson.",
  optics:380,cost:110,time:8,minLevel:2},
{id:371,emoji:"🧾",text:"Assign Henderson to a project he is overqualified for.",
  flavor:"Henderson formats the handbook. Henderson also adds a section on whistleblower protections citing three federal statutes. Darrell: \'He added something.\'",
  optics:420,cost:120,time:9,minLevel:2},
{id:372,emoji:"🧾",text:"Cc Henderson's manager on a minor mistake. 'Just keeping everyone aligned.'",
  flavor:"The mistake: wrong template. You cc HR and the department head. Henderson responds with the corrected version and a polite note. Then files Exhibit G.",
  optics:460,cost:130,time:9,minLevel:2},
{id:373,emoji:"🧾",text:"Give Henderson a glowing review that contains zero specific feedback.",
  flavor:"\'Henderson is a real asset.\' Six sentences. All vague. Henderson files it as Exhibit H. Footnote: \'Pattern consistent with documentation suppression.\'",
  optics:520,cost:150,time:10,minLevel:3},
{id:374,emoji:"🧾",text:"Invite Henderson to a social event he definitely won't enjoy.",
  flavor:"Poker night. Henderson attends. Henderson wins $340. Donates it to a legal fund. Has a separate notebook just for the poker night.",
  optics:600,cost:170,time:11,minLevel:3},
{id:375,emoji:"🧾",text:"Publicly thank Henderson in an all-hands for 'keeping us honest.'",
  flavor:"You thank Henderson publicly for \'keeping us honest.\' Henderson opens his notebook. Writes the time. The room goes quiet.",
  optics:700,cost:200,time:12,minLevel:4},
{id:376,emoji:"🧾",text:"Suggest Henderson would be 'great in a client-facing role' — move him out of HQ.",
  flavor:"\'A real opportunity.\' The client-facing role is 45 minutes away. The notebook commutes with him. Two colleagues become sources within two weeks.",
  optics:900,cost:230,time:14,minLevel:5},
{id:377,emoji:"🧾",text:"Have Bitsy lead Henderson's next performance review.",
  flavor:"Bitsy arrives with a sunrise slide and a candle. Henderson arrives with his annotated job description. The review takes three minutes. Henderson has a transcript.",
  optics:1100,cost:265,time:16,minLevel:5},

// ─── JJ SCHEMES (rank-appropriate) ───────────────────────────────────────────
{id:301,emoji:"😐",text:"Let JJ present your slides",flavor:"JJ adds three slides. Slide two is just JJ. Slide three is a photo of JJ and Gerry with the caption 'Leadership in action.' Darrell: 'He centered himself.'",optics:85,cost:30,time:3,minLevel:1},
{id:302,emoji:"😐",text:"Make JJ take notes in the all-hands",flavor:"JJ's notes have a cover page that says 'Meeting Summary — Prepared by JJ.' He sends them company-wide. Four uses of 'brilliant framing.' Henderson requests a copy.",optics:70,cost:25,time:2,minLevel:1},
{id:303,emoji:"😐",text:"Assign JJ to the cross-functional task force",flavor:"JJ immediately creates a 'JJ — Task Force Lead' title for himself on LinkUp. The task force has not met. The task force will never meet.",optics:165,cost:60,time:4,minLevel:2},
{id:304,emoji:"😐",text:"Let JJ run the town hall Q&A",flavor:"JJ paraphrases Henderson's question as: 'Henderson is looking forward to learning more about our strategic roadmap.' Henderson has the original. And JJ's paraphrase. Both.",optics:540,cost:155,time:12,minLevel:3},
{id:305,emoji:"😐",text:"Give JJ the title 'Chief of Staff'",flavor:"New title: 'Chief of Staff to Visionary Leadership.' Darrell reads it. Says: 'to Visionary Leadership.' He says it carefully. Twice.",optics:860,cost:220,time:14,minLevel:4},
{id:306,emoji:"😐",text:"Have JJ run the culture survey",flavor:"JJ designs the survey. The scale is: Agree, Strongly Agree, Wholeheartedly Agree. Henderson files the survey design as Exhibit Y.",optics:1290,cost:310,time:19,minLevel:5},
{id:307,emoji:"😐",text:"Feature JJ in the company newsletter as 'Rising Star'",flavor:"JJ wrote the article himself. He describes his own leadership style as 'quietly visionary.' Darrell writes 'quietly visionary' on a napkin. Folds it. It joins the others.",optics:1880,cost:495,time:27,minLevel:6},
{id:308,emoji:"😐",text:"Bring JJ to the board meeting",flavor:"JJ prepares a 40-slide deck about himself. Henderson is visible in the background of slide 38. He is looking directly at the camera. Henderson has this slide.",optics:3590,cost:855,time:42,minLevel:7},
{id:309,emoji:"😐",text:"Make JJ your successor announcement",flavor:"JJ posts about it within 90 seconds. 'Humbled. Honored. Ready.' Eleven hashtags. Darrell to Scott: 'ninety seconds.' Scott: 'yeah.' Neither is surprised.",optics:8360,cost:1640,time:65,minLevel:8},

// ─── NEW SCHEMES v14 ─────────────────────────────────────────────────────────
// RANK 1 NEW
{id:201,emoji:"📱",text:"Reply to a Ping with a thumbs up and nothing else",flavor:"Linda sent a 14-paragraph update on Ping. You thumbs-upped it. Linda stares at her screen. The thumbs-up has no context. The thumbs-up will haunt her. Darrell sees the thumbs-up. Says: 'Classic.' He does not mean it as a compliment.",optics:60,cost:20,time:2,minLevel:1},
{id:202,emoji:"🪟",text:"Book all the glass-walled rooms and use none of them",flavor:"Four conference rooms. All day. All yours. You hold one meeting in your office instead. The rooms sit empty. Three teams hold their standups in the hallway. Casey documents the room waste. It is now a tab in the separate document.",optics:70,cost:25,time:3,minLevel:1},
{id:203,emoji:"🔔",text:"Set your Ping status to 'In Deep Work' and browse LinkUp",flavor:"'Do Not Disturb.' You have not done deep work in three years. Linda has a genuine question. She waits. The answer was time-sensitive. Scott, who is also browsing LinkUp, answers it from his phone. His status says nothing because Scott does not update his status.",optics:65,cost:25,time:2,minLevel:1},
{id:204,emoji:"🎯",text:"Introduce OKRs without explaining what OKRs are",flavor:"\'We\'re moving to an OKR framework.\' Beardogg already uses them. Darrell: \'Are these the same as the old goals with a different acronym?\' You say no. They are the same goals.",optics:80,cost:30,time:3,minLevel:1},
{id:205,emoji:"📞",text:"Call someone when a Ping would do",flavor:"The phone rings. It is you. The question could have been a Ping. Casey answers. You ask if she \'got\' your email. She did. She confirmed it. In the email.",optics:55,cost:20,time:2,minLevel:1},
{id:206,emoji:"🖥️",text:"Share your screen before arranging your tabs",flavor:"Forty-seven tabs. Personal calendar. Something that is definitely a vacation search. Henderson's LinkUp profile, which you were looking at for reasons you cannot explain. Casey is on the call. Casey sees everything. Darrell is also on the call. Darrell says nothing. He does not need to.",optics:75,cost:25,time:2,minLevel:1},
{id:207,emoji:"💡",text:"Call a meeting to discuss having a meeting",flavor:"'I think we need to sync about the cadence of our syncs.' Casey's resignation letter gets a new paragraph. It is the sharpest paragraph. Darrell looks at the invite. Says: 'The pre-meeting has a pre-meeting.' He says it quietly. Everyone hears it.",optics:85,cost:30,time:3,minLevel:1},
{id:208,emoji:"🗑️",text:"Delete Beardogg's comment thread without reading it",flavor:"Beardogg had flagged a critical infrastructure issue. The thread had seventeen replies. You deleted it for 'channel hygiene.' Beardogg rebuilds the thread in a new channel. Scott reads it. Says: 'Yeah this is the one that matters.' You are not in the new channel.",optics:80,cost:30,time:3,minLevel:1},
{id:209,emoji:"⏳",text:"Start every sentence with 'Going forward'",flavor:"'Going forward, we're going to have better communication.' 'Going forward, this is how decisions will be made.' 'Going forward, I expect more accountability.' Darrell counts. Later that day, in a separate conversation, Darrell says: 'Eleven.' Nobody asks what he means. Everyone knows.",optics:70,cost:25,time:2,minLevel:1},
{id:210,emoji:"🧩",text:"Describe a simple task as a 'strategic initiative'",flavor:"The task is to rename a folder. You call it a Nomenclature Alignment Initiative. Assign a workstream. Schedule a kickoff. Casey renames the folder in four seconds. She sends no email about it. The initiative continues regardless.",optics:70,cost:25,time:2,minLevel:1},
// RANK 2 NEW
{id:211,emoji:"🔄",text:"Move the all-hands to a different platform every month",flavor:"January: Zoom. February: Teams. March: 'Something new.' The link doesn't work. Linda is in the wrong app. Casey is in both apps on principle. Scott joins via phone from his car. 'Same meeting,' Scott says. It is the same meeting.",optics:160,cost:60,time:4,minLevel:2},
{id:212,emoji:"🧠",text:"Announce a 'culture of psychological safety' and then punish honesty",flavor:"'This is a safe space.' Beardogg says the timeline is unrealistic. You take him off the project. Scott heard both things. In that order. Says: 'Hm. Fast.' Leaves at 2.",optics:210,cost:75,time:6,minLevel:2},
{id:213,emoji:"📌",text:"Make everything urgent. Nothing gets prioritized.",flavor:"Everything is P0. Everything is critical. Casey built a priority matrix and shared it in the channel last week. You marked it P0. Casey: 'I know. I saw.'",optics:185,cost:65,time:5,minLevel:2},
{id:214,emoji:"🎪",text:"Host a 'Town Hall' where no questions are taken",flavor:"'Thank you for all the great questions. We're out of time.' There were no questions. The Q&A window was two minutes. Henderson submitted a question in advance in writing. The question appears in the chat after the call ends, unanswered. Henderson screenshots it.",optics:220,cost:80,time:6,minLevel:2},
{id:215,emoji:"🧪",text:"Pilot a new process that makes the old process worse",flavor:"The new process has eleven steps. The old process had three. The new process produces the same output. Casey has been waiting for the required sign-off since Tuesday.",optics:195,cost:70,time:5,minLevel:2},
{id:216,emoji:"🤳",text:"Ask for 'authentic' content for the company Instagram",flavor:"Bitsy takes photos of the Collab Kitchen and the DISRUPT sign. Linda is crying in the first photo. You post the one where you\'re centered and everyone else is blurry.",optics:175,cost:65,time:4,minLevel:2},
{id:217,emoji:"📋",text:"Create a framework for creating frameworks",flavor:"'Before we build anything, we need alignment on how we build things.' Darrell has finished two things since the meeting started. Scott, from his car, texts Darrell: 'the framework has a framework.' Darrell: 'two actually.' They do not elaborate.",optics:200,cost:70,time:5,minLevel:2},
{id:218,emoji:"🔍",text:"Audit Beardogg's time and find nothing wrong",flavor:"You commission a time-tracking audit. Beardogg\'s hours are correct. His output is exceptional. The audit costs $2,300. The audit costs more than the amount it could have saved.",optics:190,cost:70,time:5,minLevel:2},
{id:219,emoji:"📣",text:"Send a 'Just checking in!' Ping at 7am",flavor:"'Just checking in on the deliverable!' The deliverable was due Monday. Today is Wednesday. The deliverable was submitted Monday. On time. By Casey. Who replies: 'Sent Monday.' Two words. Casey's resignation letter has a section titled 'Checking In.' It is the longest section.",optics:165,cost:60,time:4,minLevel:2},
{id:220,emoji:"🤝",text:"Bring in a consultant to say what Beardogg already said",flavor:"$22,000. Three-week engagement. Deck: 47 slides. Conclusion: the infrastructure needs refactoring. Beardogg flagged this in Q1. In writing. With a proposed solution. Scott reads the consultant's deck. Texts from his car: 'beardog said this in march.' He leaves at 2.",optics:230,cost:85,time:7,minLevel:2},
// RANK 3 NEW
{id:221,emoji:"🏗️",text:"Restructure the team around yourself",flavor:"'Span of control optimization.' Everyone now reports to you directly. Except Scott, who renegotiated his contract to be 'functionally autonomous' two months ago when he saw this coming. He files no reports. His output is unchanged. He leaves at 2.",optics:520,cost:150,time:11,minLevel:3},
{id:222,emoji:"💼",text:"Bring your personal brand into a business meeting",flavor:"'I think what my personal brand teaches us here is—' Darrell looks up from his notebook. Looks back down. Writes something. The something is very short. Casey opens her resignation letter and starts a new paragraph. It begins: 'On the subject of personal branding.'",optics:480,cost:135,time:10,minLevel:3},
{id:223,emoji:"🧭",text:"Rewrite the company values and present them as timeless",flavor:"The old values were: Integrity, Collaboration, Excellence. The new values are: Own It, Drive It, Be It. Bitsy contributed 'Be It.' Henderson photographs the new values poster. It is Exhibit H. Darrell looks at the poster. Says: 'Be it.' That's all he says.",optics:560,cost:160,time:12,minLevel:3},
{id:224,emoji:"🌐",text:"Hire a Chief Transformation Officer",flavor:"He is 34. He uses 'velocity' as a verb. He has a podcast. He and Gerry do a joint LinkUp post about 'organizational evolution.' Beardogg reads it. Says nothing. Updates his resume. Darrell reads it. Says: 'velocity.' Just that. Just that one word.",optics:600,cost:170,time:13,minLevel:3},
{id:225,emoji:"🗺️",text:"Create a 'strategic roadmap' with no deliverables",flavor:"Twelve slides. Four color-coded swimlanes. Zero due dates. 'This is directional.' Casey asks which lane her work falls in. The answer is unclear. She adds a tab to the separate document. Scott, from his car: 'there are no dates on this.' He already knew.",optics:535,cost:155,time:11,minLevel:3},
{id:226,emoji:"🧲",text:"Introduce a 'talent magnetism' initiative",flavor:"We need to be a place where people want to work. The EAP is still cancelled. The bonus is missing. The thermostat is 61 degrees. Bitsy designs the poster. It has a sunrise. It has a magnet.",optics:490,cost:140,time:10,minLevel:3},
{id:227,emoji:"🏆",text:"Launch an internal awards program you control",flavor:"You nominate the categories. Sit on the selection committee. Present the award. Accept the award. It is for Leadership Excellence. Darrell: \'Efficient.\' He means the awards program. Not in a good way.",optics:580,cost:165,time:13,minLevel:3},
{id:228,emoji:"📐",text:"Demand all presentations use the new template",flavor:"The template has fourteen mandatory slides including an \'executive bio\' for the presenter. Beardogg is presenting a technical architecture. He submits 31 slides using the template on each one. Darrell: \'Committed.\'",optics:510,cost:145,time:11,minLevel:3},
{id:229,emoji:"🎓",text:"Send the team to a mandatory leadership training. Don't attend.",flavor:"Four hours. Offsite. A facilitator named Derek. Derek has a book. You skip it for a \'board prep call.\' The board prep call is 20 minutes. Darrell attended. Said afterward: \'Derek had some good points.\' He means about Gerry.",optics:545,cost:155,time:12,minLevel:3},
{id:230,emoji:"🔧",text:"Break something and call it an 'iterative process'",flavor:"Scott produced a stable version in 2021 that you deprecated. The new workflow crashes three times the first week. \'This is expected. We\'re learning.\' Scott: \'The 2021 version worked.\'",optics:500,cost:145,time:10,minLevel:3},
// RANK 4 NEW
{id:231,emoji:"📊",text:"Present last year's data as this year's innovation",flavor:"\'Exciting new insights from our data team.\' Darrell recognizes the charts. He built them in Q2 of last year. He checks the metadata. Same file. Renamed. He folds a napkin.",optics:810,cost:205,time:13,minLevel:4},
{id:232,emoji:"🎭",text:"Schedule a 'vulnerability session' and share nothing personal",flavor:"You share that you \'sometimes feel like people don\'t understand your vision.\' The room is quiet. That is not vulnerability. Henderson takes notes. Darrell: \'Hm.\'",optics:870,cost:220,time:14,minLevel:4},
{id:233,emoji:"💰",text:"Bonus yourself for 'navigating a difficult quarter'",flavor:"$45,000 bonus for \'navigating a difficult quarter.\' The quarter was difficult because of decisions you made. The team receives a thank-you email. \'Resilience\' appears four times.",optics:925,cost:240,time:15,minLevel:4},
{id:234,emoji:"🏃",text:"Conduct a 'listening tour' that visits no one",flavor:"\'Listening Tour — Q3.\' Fourteen meetings. All fourteen are with people who report to you. Linda, who has eleven years of institutional knowledge, is not on the list.",optics:840,cost:215,time:13,minLevel:4},
{id:235,emoji:"🔒",text:"Classify the org chart as confidential",flavor:"\'For strategic reasons, the organizational structure is internal only.\' Darrell has the org chart drawn from memory on four separate napkins. Scott has it in a spreadsheet. \'Seemed useful,\' he said.",optics:790,cost:200,time:12,minLevel:4},
{id:236,emoji:"🧾",text:"Expense a 'client dinner' with no client",flavor:"$340. Miso Black Cod. \'Client entertainment.\' The client is listed as \'TBD.\' The client remains TBD. Henderson has the receipt. It is Exhibit L.",optics:860,cost:220,time:14,minLevel:4},
{id:237,emoji:"🎯",text:"Set impossible targets and call missing them 'a growth opportunity'",flavor:"Q3 target: 400% revenue growth. Q3 actual: flat. Beardogg flagged this in April with data. In writing. Darrell saved it. It\'s in the pocket now.",optics:890,cost:230,time:14,minLevel:4},
{id:238,emoji:"📲",text:"Ping at 11pm and mark it low priority",flavor:"\'Low priority but when you get a chance.\' It is 11:17pm. Casey sees it. Opens her resignation letter. Adds three sentences.",optics:800,cost:205,time:12,minLevel:4},
{id:239,emoji:"🌀",text:"Run a team offsite with no agenda",flavor:"\'We just need to connect as humans.\' Two days at a hotel. No agenda. Beardogg builds the Q4 architecture on his laptop during \'free time.\' Scott attends one session and drives home.",optics:760,cost:195,time:12,minLevel:4},
{id:240,emoji:"🖊️",text:"Redline Beardogg's technical spec until it's wrong",flavor:"Casey\'s spec was correct. You change seventeen things. Three introduce errors. Casey accepts all tracked changes without a word. The document now has a full audit trail of every correct thing you made incorrect. Casey has a copy of the original.",optics:855,cost:220,time:14,minLevel:4},
// RANK 5 NEW
{id:241,emoji:"🤖",text:"Announce AI will 'augment' roles. Don't say which ones.",flavor:"'AI is an incredible opportunity for our team.' Scott, from his car: 'it's the two analyst roles.' Darrell already knew.",optics:1320,cost:315,time:20,minLevel:5},
{id:242,emoji:"🎪",text:"Hire a Chief Storytelling Officer",flavor:"She has a TED talk. Uses 'narrative architecture' unironically. Beardogg reads her first deliverable: 'Is this about us?' Darrell: 'It's about vibes.'",optics:1260,cost:300,time:19,minLevel:5},
{id:243,emoji:"📉",text:"Lay off 12% of the workforce. Give yourself a raise.",flavor:"'Difficult decisions to position us for growth.' Casey absorbs two additional workstreams without being asked or compensated. Scott calculates the math. Files it as 'Math_2.' Leaves at 2.",optics:1510,cost:360,time:22,minLevel:5},
{id:244,emoji:"🏢",text:"Move the office to a 'dynamic workspace' with no assigned desks",flavor:"Linda arrives at 7:45 as always. Her spot is taken. She cries in the stairwell, which is now a 'focus zone.' Darrell claims a corner and never moves from it.",optics:1370,cost:330,time:20,minLevel:5},
{id:245,emoji:"🔬",text:"Commission a 'culture diagnostic' that confirms what everyone already knows",flavor:"$38,000. Six weeks. Results: morale is low, leadership trust is at 23%. Beardogg submitted the same findings in a survey response. In February. For free.",optics:1260,cost:300,time:19,minLevel:5},
{id:246,emoji:"🗳️",text:"Hold a 'vote' on a decision you've already made",flavor:"The decision was made last Tuesday. You signed something last Tuesday. The vote is today. The options are: A) what you decided, B) a worse version of A, C) clearly not viable. Darrell votes A. He knows.",optics:1190,cost:285,time:18,minLevel:5},
{id:247,emoji:"🌅",text:"Let Bitsy redesign the website without a brief",flavor:"Bitsy renames it. Adds a sunrise to the brief. The website now takes four seconds to load. Bitsy calls this 'intentional pacing.' Darrell reads this to Scott. Scott: 'intentional pacing.'",optics:1240,cost:295,time:19,minLevel:5},
{id:248,emoji:"🧸",text:"Introduce 'radical candor' and only use it downward",flavor:"You use radical candor downward. When Scott offers candid feedback on the Q3 plan: \'Let\'s take this offline.\' Scott: \'sure.\' Neither of you follow up.",optics:1310,cost:315,time:20,minLevel:5},
{id:249,emoji:"🧮",text:"Implement a stack ranking system",flavor:"Every quarter: the bottom 10% is at risk. Scott is exempt by clause. Casey's resignation letter has a section on this. Titled 'The Hunger Games Reference Is Intentional.'",optics:1400,cost:335,time:21,minLevel:5},
{id:250,emoji:"🔑",text:"Gate all information behind your sign-off",flavor:"'Loop me in before anything goes out.' Nothing goes out. The security patch has been waiting eleven days. Darrell: 'The security patch is behind the newsletter draft.'",optics:1290,cost:310,time:19,minLevel:5},
// RANK 6 NEW
{id:251,emoji:"🎰",text:"Gamble on a pivot. Call it 'bold strategic repositioning.'",flavor:"'We're moving from B2B SaaS to consumer hardware.' Beardogg: 'Is there a plan?' There is a deck. Beardogg reads the deck. The deck has no plan.",optics:1955,cost:515,time:28,minLevel:6},
{id:252,emoji:"📡",text:"Expand into three new markets simultaneously",flavor:"'We need to think bigger.' The current market is not fully captured. Beardogg flags this. Scott flags this. The expansion begins. All three markets underperform.",optics:2130,cost:560,time:31,minLevel:6},
{id:253,emoji:"🌍",text:"Open an office in a city nobody needs to be in",flavor:"Three people. Two of them are Gerry's acquaintances. One is Gerry's acquaintance's roommate. The office has a ping-pong table and a neon sign that says DISRUPT.",optics:1805,cost:475,time:26,minLevel:6},
{id:254,emoji:"🤖",text:"Build a GPT wrapper and call it proprietary AI",flavor:"'Pinnacle Intelligence™.' It is a ChatGPT wrapper with the company logo. Beardogg reads the architecture doc and says nothing for eleven seconds. Then: 'I see.'",optics:2050,cost:540,time:30,minLevel:6},
{id:255,emoji:"💎",text:"Sponsor a conference you'll speak at",flavor:"$80,000 sponsorship. Your speaking slot: 'Visionary Leadership in the Age of Disruption.' Beardogg updates his resume during slide 3. Scott leaves when the second photo of you appears.",optics:1880,cost:495,time:27,minLevel:6},
{id:256,emoji:"📦",text:"Spin off a division and call it innovation",flavor:"'Pinnacle Labs.' Seven people. $1.2M budget. Zero deliverables required. Casey shipped the actual product from her desk while Pinnacle Labs had a foosball table. She has not mentioned this.",optics:1955,cost:515,time:28,minLevel:6},
{id:257,emoji:"🎯",text:"Introduce NPS for internal processes",flavor:"'How likely are you to recommend this meeting to a colleague?' Casey gives it a 2. Linda gives it a 4 and cries about giving a 4. Beardogg adds a comment. It's the most actionable thing said.",optics:1710,cost:450,time:25,minLevel:6},
{id:258,emoji:"🔐",text:"Create a two-tier access system where you have tier one",flavor:"Tier One: Gerry, Bitsy, the nephew. Tier Two: everyone who does the work. Casey needs access to her own project data. Her sponsor is Bitsy. Bitsy is in Ibiza. Casey builds a workaround in an afternoon.",optics:1860,cost:490,time:26,minLevel:6},
{id:259,emoji:"🎪",text:"Throw a mandatory company 'celebration' the day after layoffs",flavor:"Day one: 12% reduction. Day two: pizza, a photo booth, a DJ. Darrell stands near the photo booth. Says: 'This is a choice.' Scott is not here. Scott sent a voicemail: 'thinking of everyone.'",optics:2070,cost:545,time:30,minLevel:6},
{id:260,emoji:"📋",text:"Introduce a 'skip-level' meeting structure and never use it",flavor:"Four skip-levels scheduled. Gerry cancels three. The fourth happens. Linda attends. Linda has things to say. The meeting ends at the scheduled time. She is not done.",optics:1900,cost:500,time:27,minLevel:6},
// RANK 7 NEW
{id:261,emoji:"🛫",text:"Fly business class. Log it as coach.",flavor:"$4,200 seat. Expensed as $820. Henderson has the original receipt. It is Exhibit M. It has always been Exhibit M.",optics:3990,cost:950,time:46,minLevel:7},
{id:262,emoji:"🏛️",text:"Lobby against the legislation that would protect your employees",flavor:"$120,000 to a lobbying firm. The legislation would have required 60-day severance notice. Beardogg gets 72 hours. Beardogg was already updating his resume. He was already fine.",optics:4345,cost:1035,time:50,minLevel:7},
{id:263,emoji:"🎩",text:"Negotiate a retention bonus for yourself during a hiring freeze",flavor:"$600,000. Two-year vest. 'Critical talent retention.' Beardogg's team of four is now a team of two. Scott: exempt by clause 4b. He leaves at 2.",optics:3800,cost:905,time:44,minLevel:7},
{id:264,emoji:"🌐",text:"Announce a 'digital transformation' with no technical plan",flavor:"'We are a technology-first company now.' Beardogg IS the technology. He forwards the announcement to Scott. Scott, from his car: 'you've been a technology-first company since beardogg arrived.'",optics:3465,cost:825,time:40,minLevel:7},
{id:265,emoji:"📺",text:"Hire a PR firm to improve your personal reputation",flavor:"$18,000 a month. Three articles. Each calls you 'a visionary builder.' Henderson saves all three. They are Exhibits N through P.",optics:3590,cost:855,time:42,minLevel:7},
{id:266,emoji:"⚙️",text:"Automate yourself into irrelevance and hope nobody notices",flavor:"Every decision routes through a framework Bitsy helped design. The framework produces the same outcome as not using it. You have not made a decision in six weeks.",optics:3340,cost:795,time:39,minLevel:7},
{id:267,emoji:"🗃️",text:"Archive seven years of employee feedback without reading it",flavor:"3,847 survey responses. 11 focus group transcripts. A 200-page Culture Report Linda helped write. Archived. Unread. Beardogg's response from 2020 is in there. It was correct about everything.",optics:3990,cost:950,time:46,minLevel:7},
{id:268,emoji:"💳",text:"Charge the company card at a casino. Categorize it as 'team building.'",flavor:"Henderson has requested clarification on which team members attended the 'team building event.' The answer is: none. One receipt says 'working dinner.' It was 2am.",optics:4160,cost:990,time:48,minLevel:7},
{id:269,emoji:"🧠",text:"Trademark a phrase you didn't coin",flavor:"'Move Fast With Purpose™.' Scott coined it in a Ping in 2021. The message is still there. Henderson has it. Henderson sent it to the trademark attorney.",optics:3610,cost:860,time:42,minLevel:7},
{id:270,emoji:"📰",text:"Issue a press release about a partnership that isn't finalized",flavor:"'Pinnacle and [Partner] announce strategic alliance.' The partner has not approved this language. The release is retracted. 'Premature enthusiasm.' Darrell: 'That's a new one.'",optics:3800,cost:905,time:44,minLevel:7},
// RANK 8 NEW
{id:271,emoji:"👑",text:"Appoint yourself Chief AI Officer in addition to CEO",flavor:"'I'll be taking a more hands-on role in AI.' Beardogg has been the actual AI infrastructure for two years. His LinkUp post gets 847 likes. Yours gets 12. One is Bitsy.",optics:8360,cost:1640,time:65,minLevel:8},
{id:272,emoji:"🏖️",text:"Take a six-week sabbatical. Call it 'strategic reflection.'",flavor:"Nothing changes while you're gone except everything gets better. Beardogg ships four things. Linda cries happy tears twice. Scott's emails become slightly warmer.",optics:7800,cost:1530,time:62,minLevel:8},
{id:273,emoji:"📡",text:"Announce a merger on earnings day to distract from the numbers",flavor:"\'Exciting news.\' The numbers are not exciting. The merger will not close. Darrell reads the announcement ten minutes before the call. Says: \'The numbers are bad.\'",optics:8800,cost:1725,time:68,minLevel:8},
{id:274,emoji:"🎭",text:"Give a TEDx talk titled 'Failure Is Just Unfinished Success'",flavor:"18 uses of the word \'journey.\' Scott, from his car: \'eighteen journeys.\' Darrell: \'nineteen. there was one in the intro.\' Scott: \'fair.\'",optics:7500,cost:1470,time:60,minLevel:8},
{id:275,emoji:"🌊",text:"Announce a 'digital-first transformation' three years after everyone else",flavor:"'The future is digital.' Beardogg has been digital-first since he arrived. JJ posts about it. Henderson screenshots the original announcement. It is Exhibit AA.",optics:7260,cost:1425,time:58,minLevel:8},
{id:276,emoji:"💸",text:"Pay yourself in stock options during a cash flow crisis",flavor:"The company has a cash flow problem. You align your compensation with future upside instead. The team receives a thank-you email. \'Resilience\' appears five times.",optics:9000,cost:1765,time:70,minLevel:8},
{id:277,emoji:"🏛️",text:"Testify before a regulatory body and say nothing for six hours",flavor:"Six hours. Fourteen questions. Zero direct answers. Scott watches from his car. Says nothing for four hours. Then, at hour five: 'hm.' Darrell: 'seventeen non-answers per hour.'",optics:9500,cost:1860,time:75,minLevel:8},
{id:278,emoji:"📊",text:"Certify a misleading earnings report",flavor:"\'Record-breaking quarter.\' Record-breaking if you exclude the write-downs, the charges, and the settlement. Henderson has the unedited version. He\'s had it since Tuesday.",optics:8600,cost:1685,time:66,minLevel:8},
{id:279,emoji:"🤝",text:"Shake hands with a competitor and leak their roadmap",flavor:"Beardogg refuses to use the stolen roadmap. 'That's not ours.' Deletes his copy. Tells Scott. Scott texts Darrell: 'beardog did the right thing.' Darrell: 'yeah.'",optics:8200,cost:1605,time:64,minLevel:8},
{id:280,emoji:"🎬",text:"Produce a documentary about yourself without disclosing you funded it",flavor:"42 minutes. \'Unauthorized.\' Fully authorized. Beardogg is shown on screen despite building nothing in it. Scott: \'I built most of what\'s in this.\' Casey: \'I built the rest.\' Neither of them are credited.",optics:9200,cost:1805,time:72,minLevel:8},
];

// ─── PERKS (unchanged) ────────────────────────────────────────────────────────
const PERKS = [
  {id:1, icon:"🐍",name:"Spineless Yes-Men",   desc:"Schemes complete 20% faster",         cost:800},
  {id:2, icon:"🏙️",name:"Corner Office",        desc:"+25% Optics on all schemes",          cost:1200},
  {id:3, icon:"⚖️",name:"Lawyer on Retainer",   desc:"Unlock schemes one level early",      cost:1800},
  {id:4, icon:"📈",name:"Executive Coach",       desc:"+50% Optics on all schemes",          cost:3500},
  {id:5, icon:"🤝",name:"Board Infiltration",    desc:"Schemes complete 40% faster",         cost:6000},
  {id:6, icon:"📰",name:"PR Firm on Speed Dial", desc:"Random events always resolve well",   cost:4500},
  {id:7, icon:"📅",name:"Calendar Dominance",    desc:"Run 4 schemes simultaneously",        cost:2800},
  {id:8, icon:"⚡",name:"Soul Harvester",        desc:"Recharge gives +150 instead of +100", cost:2000},
  {id:9, icon:"⏩",name:"Accelerated Recharge",  desc:"Recharge every 15 min instead of 30", cost:5000},
  {id:10,icon:"🤖",name:"AI Strategy Deck",      desc:"AI schemes give +30% Optics",         cost:3000},
  {id:11,icon:"🍕",name:"Mandatory Fun Event",   desc:"Instantly boost morale by +15%",      cost:800, moraleBoost:15},
  {id:12,icon:"🫶",name:"Wellness Initiative (Real)", desc:"Boost morale by +25%. One time.", cost:1500, moraleBoost:25},
];

// ─── COMPANY STORE (unchanged) ────────────────────────────────────────────────
const COMPANY_STORE = [
  {id:1,name:"Petty Cash",           souls:500,  price:"$0.99", flavor:"Enough to cause minor inconvenience."},
  {id:2,name:"Expense Account",      souls:1500, price:"$2.99", flavor:"Technically reimbursable. Nobody will check."},
  {id:3,name:"Slush Fund",           souls:4000, price:"$6.99", flavor:"Origin of funds: unclear. Yours now."},
  {id:4,name:"Offshore Account",     souls:10000,price:"$14.99",flavor:"What offshore account? Exactly."},
  {id:5,name:"The Golden Handshake", souls:30000,price:"$29.99",flavor:"You've earned this. You haven't, but that's never stopped you."},
  {id:6,name:"Fast Recharge",        souls:0,    price:"$0.99", flavor:"Skip the 30-minute wait. Time is money. Yours specifically.",special:"recharge"},
];

// ─── RANDOM EVENTS (v12 names) ────────────────────────────────────────────────
const ALL_EVENTS = [
  {id:1, emoji:"😭",text:"Linda is crying in the Collab Kitchen.",sub:"Nobody knows why yet. Scott is making her tea.",options:["'Linda, my door is always open.'","Ask Bitsy to handle it.","Ignore it."],outcomes:[{souls:0,optics:0,msg:"Linda appreciates the offer. Does not use the open door. Cries 20 more minutes. Returns to her desk. Delivers everything on time. She always does.",moraleBoost:5},{souls:-50,optics:0,msg:"Bitsy handles it with a crystal and a breathing exercise. Darrell watches. Says: 'That made it worse.' He was right."},{souls:80,optics:0,msg:"Scott leaves a snack on Linda's desk and a Post-it that says 'it passes.' Linda keeps the Post-it. Scott goes back to his documentary. It is about Roswell. He has seen it four times."}]},
  {id:2, emoji:"🤌",text:"Casey has submitted her resignation. Again.",sub:"This is the eighth time. The letter is now 13 pages. Scott proofread it: 'Clean draft.' Casey has a whole other life outside this place. This job is the worst thing about her week. The best thing about her week is something nobody here knows about. She stays for the dental.",options:["Accept it this time.","Talk her out of it. Again.","Promote her. Right now."],outcomes:[{souls:-200,optics:0,msg:"Casey is shocked. Stays anyway — needs two weeks to transition. Never finishes transitioning. Doesn't leave. Casey will never leave. Darrell: 'Called it.'"},{souls:100,optics:0,msg:"Casey stays. Updates the letter. There is now a Part Two titled 'Why I Should Have Quit Last Time.' Scott read it. Said: 'Part Two is stronger.'"},{souls:-300,optics:0,msg:"Casey is promoted. The resignation is withdrawn. Casey makes things better. Darrell says: 'There we go.' Scott nods from across the room.",moraleBoost:10}]},
  {id:3, emoji:"🌿",text:"Scott has completed the project three days early.",sub:"Again. He always does this. He finished at 10:45 and has been on his phone since. He will leave at 2.",options:["Present Scott's work as your initiative.","Give Scott a $200 spot bonus.","Assign Scott three more projects immediately."],outcomes:[{souls:0,optics:150,msg:"You present Scott's work. Scott is in the hallway. Eating a snack. When asked later: 'Yeah, that was the one I did.' Said plainly. No edge. Somehow worse."},{souls:-100,optics:0,msg:"Scott receives $200. Says: 'cool thx.' Has already calculated the difference from market rate. Texted it to himself. Left at 2. He is not angry. He is simply noted.",moraleBoost:4},{souls:100,optics:0,msg:"Scott accepts all three. Completes them all early. Still leaves at 2 every day. Still does not care what Gerry does. His resignation letter is one paragraph. He wrote it two years ago. It is not dramatic. It is simply correct."}]},
  {id:4, emoji:"🪨",text:"Darrell said something in the meeting.",sub:"One sentence. It was also quietly funny in a way that made two people look at their shoes. You changed the slide. Darrell went back to whatever he was reading. It was about water chemistry.",options:["Ask Darrell to elaborate.","Pretend you didn't hear it.","Ask Darrell to put it in writing."],outcomes:[{souls:-100,optics:80,msg:"Darrell elaborates. Three sentences. The second one gets an involuntary laugh from two people who immediately feel bad about laughing. The third one ends the meeting."},{souls:0,optics:0,msg:"Darrell knows you heard it. Darrell knows you heard it. Darrell knows you heard it. He does not repeat himself. He never repeats himself."},{souls:50,optics:50,msg:"Darrell puts it in writing. It is six words. Two of them are doing a lot of work. He writes it on the back of a homebrew label draft — the label says 'Pinnacle Pale Ale: Notes of Disappointment.' Henderson requests a copy. Scott tapes it to his monitor."}]},
  {id:5, emoji:"🐕",text:"Beardogg has been offered a job at a competitor.",sub:"40% raise. Full remote. Own credit for his own work for the first time. Scott: 'Take it.' Darrell: 'Take it.' Beardogg texts Gerry first: 'just want to be transparent bro. loyalty is everything.'",options:["Counter-offer. Match it.","Don't counter. He won't leave.","Promote him. Now. Finally."],outcomes:[{souls:-400,optics:0,msg:"Beardogg stays. Texts Gerry: 'loyalty bro.' Updates his LinkUp anyway. New headline: 'Committed to Excellence | Open to Conversations.' Darrell reads the headline. Says: 'Open to Conversations.' Just that.",moraleBoost:0},{souls:-300,optics:0,msg:"Beardogg leaves. Goes to the competitor. First week he texts Gerry: 'miss you bro.' Second week: nothing. Beardogg has a new network now. The network is the point."},{souls:-200,optics:0,msg:"Beardogg is promoted. Texts Gerry: 'lets gooo bro.' The team hears about the promotion. Darrell looks at the org chart. Doesn't say anything. Folds a napkin. Scott: 'hm.' That's all Scott says.",moraleBoost:0}]},
  {id:6, emoji:"🌅",text:"Bitsy has rebranded something without asking.",sub:"The company mission statement. It now includes 'vibe' twice. Darrell read it. Said: 'Twice.'",options:["Approve it. 'I love the energy.'","Revert it. Quietly.","Let Henderson find out."],outcomes:[{souls:0,optics:80,msg:"The mission statement now has 'vibe' twice. Scott: 'Bold.' Henderson: files a note. It is now Exhibit R."},{souls:50,optics:0,msg:"Reverted. Bitsy doesn't notice for three days. When she does, she rebrands something else. The Collab Kitchen is now 'The Ideation Hydration Station.' Darrell: 'Third name.'"},{souls:100,optics:0,msg:"Henderson finds out. Adds it to FINAL v5. Henderson's analysis of the mission statement is more accurate than the mission statement. Scott: 'Solid analysis.'"}]},
  {id:7, emoji:"📋",text:"HR has received a complaint. About you.",sub:"Henderson has been notified. Darrell already knew.",options:["Pay out quietly.","Gaslight HR.","Blame someone else."],outcomes:[{souls:-500,optics:0,msg:"Resolved quietly. Henderson has filed the resolution alongside the original complaint. These are a matched set. Darrell: 'Neat pair.'"},{souls:100,optics:0,msg:"HR backs down. Henderson has the HR response filed alongside the original complaint. Scott: 'Still on file.' He knew that."},{souls:-100,optics:0,msg:"The person you blamed is now also in an HR conversation. Darrell watches this unfold. Says nothing for a very long time. Then: 'Hm.'"}]},
  {id:8, emoji:"🕔",text:"It is 4:58 PM Friday.",sub:"Scott left at 2. He was done by noon. He had a real lunch. He said bye to Linda on his way out.",options:["'Can everyone stay a few minutes?'","Let them go. Revolutionary.","Ping Beardogg only."],outcomes:[{souls:100,optics:0,msg:"They stay. Casey updates her resignation letter in the meeting. Scott, who left at 2, texts the solution at 2:02. Darrell reads it aloud to the room. Says: 'he did it from his car.' The meeting ends."},{souls:-80,optics:0,msg:"They leave. Morale improves. Scott, from his car, texts: 'good call.' He had already left. He didn't witness it. He just knows.",moraleBoost:8},{souls:150,optics:0,msg:"Beardogg gets the Ping. Responds: 'On it bro.' Texts Gerry three times with updates. The task is something Casey had already finished that afternoon and filed quietly without telling anyone."}]},
  {id:9, emoji:"🤖",text:"The board wants an AI strategy. By Monday.",sub:"Scott wrote a spec last summer 'out of curiosity.' It is excellent. Beardogg has told Gerry he's been 'all over the AI space.' He has not been all over the AI space.",options:["Ask Scott for his spec.","Have Beardogg present it so you look collaborative.","Build something yourself. Quickly."],outcomes:[{souls:0,optics:100,msg:"Scott sends the spec in 4 seconds. It is perfect. You present it. The board is impressed. Scott watches from home. Texts Darrell: 'they used the spec.' Darrell: 'yeah.'"},{souls:50,optics:150,msg:"You have Beardogg present Scott's spec. Beardogg adds three slides about himself. The board asks about slide 2. Beardogg cannot explain slide 2. Beardogg built none of slide 2."},{souls:0,optics:180,msg:"Scott finds his spec in 4 seconds. 'This one?' he says. Sends it. Picks up his phone. The spec is perfect. Scott knew it was there. Scott always knows where things are."}]},
  {id:10,emoji:"📊",text:"The anonymous survey results have arrived.",sub:"Morale: Critical. Leadership: Poor. Scott listed as 'the only reason some of us are still here' in 17 responses. Darrell wrote one sentence. It is the most quoted.",options:["Ignore them.","Delete them.","Share the Scott/Darrell feedback."],outcomes:[{souls:0,optics:0,msg:"Filed. Henderson will find them. Henderson always finds things. Scott sends a thumbs up emoji and goes back to a documentary about alleged government cover-ups. He has seen this one before. He watches it again."},{souls:80,optics:0,msg:"Deleted. Scott saved a copy. Scott saves copies of everything. He says nothing about this. He just has the copy."},{souls:-100,optics:50,msg:"Scott receives the feedback. Is visibly moved. Works harder the next week. Darrell's sentence is read aloud. The room is quiet for a long time."}]},
  {id:11,emoji:"😭",text:"Linda has requested a mental health day.",sub:"Her first one. She has needed one every day for three years. Scott: 'Long overdue.'",options:["Approve it immediately.","'We need you in today, Linda.'","Approve it. Check in every two hours."],outcomes:[{souls:-50,optics:0,msg:"Linda takes the day. Returns noticeably better with a small ceramic dish she made at a studio. She leaves it on Scott's desk. Scott texts Darrell: 'linda made me a dish.' Darrell: 'what kind.' Scott: 'small. glazed. blue.' Darrell: 'yeah she made me one too.' Neither of them mentions they're keeping it.",moraleBoost:7},{souls:-100,optics:0,msg:"Linda comes in. Scott brings her tea. Says: 'This was avoidable.' Goes back to his desk. Darrell is listening. He writes something down."},{souls:80,optics:0,msg:"Linda takes the day. You Ping twice. She responds once, saying she's 'doing okay.' Scott hears you Pinged. Looks at you. No expression. Long enough to notice. Then goes back to his documentary. It is about crop circles. He has opinions about the editing."}]},
  {id:12,emoji:"🔀",text:"A reorg has landed on your desk.",sub:"Scott's name is on the list. Darrell found out before you told anyone.",options:["Cut Scott.","Cut someone else.","Refuse. 'I won't cut Scott.'"],outcomes:[{souls:150,optics:0,msg:"Scott is cut. Leaves with grace. Sends a farewell Ping. It is one paragraph. It is the best-written thing anyone has ever received at this company. Hired by a competitor in eight days."},{souls:80,optics:100,msg:"Someone else is cut. Scott hears about it. Says: 'Okay.' Then: 'Let me know if I can help with the transition.' He helps. Thoroughly. Offers snacks to the departing person on their last day."},{souls:-200,optics:0,msg:"You refuse. Scott stays. Darrell hears that you refused. Says nothing for a while. Then: 'Hm.' There is something in the hm that wasn't there before.",moraleBoost:6}]},
  {id:13,emoji:"🌅",text:"Bitsy wants to host a team retreat. In Ibiza.",sub:"Budget: $47,000. Scott has a plan for $2,000. 'Same outcome,' Scott says.",options:["Approve Bitsy's retreat.","Use Scott's plan.","Approve Bitsy's retreat and invite Henderson."],outcomes:[{souls:-200,optics:80,msg:"Ibiza. Scott was not invited. Scott completed two projects while the team was in Ibiza. Darrell heard about the output. Said: 'Of course.'"},{souls:-50,optics:50,msg:"Scott's plan is used. The team learns things. Morale improves. Bitsy: 'Charming in a low-vibe kind of way.' Darrell: 'That's the highest compliment Bitsy gives.'"},{souls:100,optics:0,msg:"Henderson attends. Takes notes in Ibiza. Returns with a comprehensive report. Scott reads the report. Says: 'Thorough.' High praise from Scott."}]},
  {id:14,emoji:"🌿",text:"Scott just said something that stopped the room.",sub:"One observation, delivered while packing up to leave at 2. You have been thinking about it since.",options:["Ask Scott to repeat it.","Move on. Quickly.","Cancel the rest of the agenda and keep talking to Scott."],outcomes:[{souls:-100,optics:100,msg:"Scott repeats it. Slightly different. Better. Then says 'anyway' and leaves. It is 1:58. Darrell nods slowly and says: 'yeah he's been sitting on that one.'"},{souls:0,optics:0,msg:"You move on. Scott goes back to his phone. The thing he said is still in the room. It will be in the room tomorrow. Everyone heard it."},{souls:-200,optics:200,msg:"Scott stays past 2. This gets everyone's attention immediately. He talks for 40 minutes. Strategy emerges. It is the best thing this company has ever produced. Scott says 'that was actually kind of fun' and leaves. It is 3pm. People will talk about this for years."}]},
  {id:15,emoji:"🤌",text:"Casey has been offered the same job she almost quit for three times.",sub:"Same role. Competitor. 30% raise. She's close. Scott: 'Take it.' Darrell: 'Take it.' Both said it immediately.",options:["Finally give Casey the raise she's owed.","Let her go.","'I see a real future for you here.'"],outcomes:[{souls:-300,optics:0,msg:"Casey gets the raise. Stays. Deletes 11 of the 13 pages of her resignation letter. Keeps pages 1 and 13. Just in case. Darrell: 'Smart.' Scott: 'Good call.'",moraleBoost:9},{souls:100,optics:0,msg:"Casey leaves. Her farewell is six sentences. Contains no criticism. The resignation letter is published on Office Confessional anonymously. 4,200 upvotes. Scott reads it: 'Part Two was stronger but this is the definitive version.'"},{souls:50,optics:0,msg:"Casey stays. Doesn't believe you. Adds 'false promises' to page 8. The letter is now 14 pages. Scott proofreads page 8. 'Good page,' he says. 'Specific.'"}]},
  // ─── JAMIE ARC ──────────────────────────────────────────────────────────────
  {id:20,emoji:"📰",minRank:1,text:"A business reporter named Jamie wants a quote.",
    sub:"She covers the local business beat. Routine piece. 'Companies to Watch.' Gerry has 20 minutes.",
    options:["Give Jamie the full tour. Very enthusiastic.","'We're a family here.' Send her to Bitsy.","Keep it brief. One quote. Done."],
    outcomes:[
      {souls:0,optics:120,msg:"Gerry talks for 38 minutes. Jamie records everything. The article runs: 'Pinnacle Solutions: A Culture of Ambition.' Henderson is quoted in the sidebar as 'a current employee who preferred not to be named.' Gerry reads the article four times. Frames it. The framed article is Exhibit A in what will eventually be a very long list.",moraleBoost:0},
      {souls:50,optics:80,msg:"Bitsy gives Jamie a tour of the Collab Kitchen and the DISRUPT neon sign. Jamie photographs the neon sign. The photo runs. The caption: 'Pinnacle's 'culture infrastructure,' valued internally at $200,000.' Henderson has the caption. Henderson has had the caption since the article ran.",moraleBoost:0},
      {souls:100,optics:60,msg:"One quote: 'We're building something special here.' Jamie runs it. Notes Gerry left after 8 minutes. Notes the lobby had a portrait of Gerry. Notes the portrait cost $12,000. She does not publish these notes. Yet. She keeps them in a folder.",moraleBoost:0},
    ]},
  {id:21,emoji:"📰",minRank:2,text:"Jamie is back. She has follow-up questions.",
    sub:"She heard about the farewell gift card incident. She heard about the Christmas bonus. She heard about the art on the wall. She uses the phrase 'just want to give you a chance to respond.'",
    options:["'It was a misunderstanding. We've moved on.'","Offer Jamie exclusive access. 'Come see us anytime.'","Refer her to the PR firm."],
    outcomes:[
      {souls:0,optics:0,msg:"The follow-up runs. 'Company calls gift card incident a misunderstanding.' Jamie's notes say: 'Company says misunderstanding. Three employees said otherwise. One employee — Henderson — provided documentation.' Jamie kept the documentation. The documentation is very organized.",moraleBoost:0},
      {souls:-200,optics:0,msg:"Jamie takes the offer. Jamie comes back four times in two months. Jamie has now spoken to Linda, Casey, Beardogg, Scott (from his car, briefly), and Darrell. Darrell gave her one sentence. She has used it in three different pieces. It fits everywhere.",moraleBoost:4},
      {souls:100,optics:0,msg:"The PR firm charges $4,000 to speak to Jamie for 20 minutes. The 20 minutes produce a statement. The statement is six sentences. Jamie publishes four of them. The two she cuts were the only ones that said anything.",moraleBoost:0},
    ]},
  {id:22,emoji:"📰",minRank:3,text:"Jamie has filed a public records request on Gerry's side businesses.",
    sub:"Gerald Sr.'s truck company has come up. The pest control LLC. The demolition permits. A family member is listed as a registered agent.",
    options:["'These are entirely separate entities.'","Call Gerald Sr. Immediately.","'I'm proud of my entrepreneurial spirit.'"],
    outcomes:[
      {souls:-100,optics:0,msg:"Jamie runs: 'Executive's Family Business Operates From Company Contacts.' It is a short piece. Henderson has a longer version ready. Henderson gave Jamie the longer version. Jamie is fact-checking it. She is very thorough.",moraleBoost:0},
      {souls:-300,optics:0,msg:"Gerald Sr. is already talking to his own lawyer. Gerald Sr.'s lawyer and Henderson's lawyer have exchanged emails. Scott heard about it from his car. Texted Darrell: 'gerald sr. has a lawyer.' Darrell: 'yeah.' Neither of them is surprised.",moraleBoost:0},
      {souls:0,optics:150,msg:"'Entrepreneurial spirit' becomes the headline. The subheadline is about the pest control LLC. The second paragraph is about the demolition permits. Jamie calls this 'a good day.' Henderson calls it 'Exhibit C through F.' Both of them are right.",moraleBoost:0},
    ]},
  {id:23,emoji:"📰",minRank:4,text:"Jamie has published a profile. Gerry approved it. Gerry thinks it's positive.",
    sub:"Headline: 'I Built This From Nothing.' There are eight pull-quotes. Six are Gerry's. One is Bitsy's. One is from 'a company insider.' The insider is Casey. Gerry does not know this.",
    options:["Share the profile everywhere. 'Incredible piece.'","Read it very carefully.","Send Jamie a thank-you note."],
    outcomes:[
      {souls:0,optics:300,msg:"Gerry shares the profile on LinkUp with the caption 'Grateful and humbled 🙏.' JJ reposts it within 90 seconds. Henderson reads it. Says nothing. Saves it. It is Exhibit J. The Beardogg quote is on page 4. It is the most-quoted paragraph in the piece. Nobody at the company knows Beardogg said it. Beardogg knows.",moraleBoost:0},
      {souls:-100,optics:0,msg:"The Casey quote is on page 4: 'The work speaks for itself. Someone\'s name just happens to be on it.' Gerry reads it. Reads it again. Calls Casey. Casey answers. Gerry says: 'Great quote.' Casey says: 'Yes.' They both know. Neither says it. Casey opens her resignation letter. Closes it. Leaves it at 13 pages.",moraleBoost:0},
      {souls:50,optics:100,msg:"Jamie receives the thank-you note. Saves it. Photographs it. The photograph is labeled 'Exhibit K — Tone Deaf Gratitude.' Jamie is no longer covering the business beat. Jamie has requested the investigations desk. Her editor says yes.",moraleBoost:0},
    ]},
  {id:24,emoji:"🗞️",minRank:5,text:"Jamie and Henderson have been in contact.",
    sub:"Henderson's lawyer made the introduction. Jamie has the notebook, the exhibits, Scott's parking-lot bullet points, and Darrell's sentence from FINAL v2. She also has the thank-you note. She is using all of it.",
    options:["Get ahead of it. Call Jamie first.","Say nothing. Hope it passes.","Offer Jamie an exclusive exit interview."],
    outcomes:[
      {souls:-200,optics:0,msg:"Gerry calls Jamie. Jamie records the call — legally, with disclosure. The call lasts 14 minutes. Gerry uses the phrase 'I think what people misunderstand' seven times. Jamie uses the phrase 'for the record' eleven times. The transcript is Exhibit L. Darrell reads the transcript. Says: 'Seven times.' He means 'what people misunderstand.' He is counting.",moraleBoost:0},
      {souls:100,optics:0,msg:"The silence doesn't help. Jamie publishes the first installment. It is 4,000 words. Henderson is in it. Casey is in it, anonymously, as 'a source with direct knowledge of the work.' Scott's two sentences are in it. Darrell's one sentence is the epigraph. Darrell: 'Hm.' That was all he said.",moraleBoost:5},
      {souls:-400,optics:0,msg:"Jamie says yes. The exit interview runs 90 minutes. Gerry explains his vision, his legacy, and 'what people don't understand about leading at this level.' Jamie publishes the full transcript. Unedited. It is six installments. Parts 2 through 6 are sourced entirely from Henderson's notebook.",moraleBoost:0},
    ]},
  {id:25,emoji:"🗞️",minRank:6,text:"Jamie's investigation has run. Six parts. It took four months.",
    sub:"Part one: the culture. Part two: the side hustles. Part three: the bonus structure. Part four: the community service day. Part five: the art on the wall. Part six: the notebook.",
    options:["Issue a full statement. Lawyers reviewed it.","'I'm proud of everything we built here.'","Read Part six."],
    outcomes:[
      {souls:-500,optics:0,msg:"The statement: six paragraphs. Standard. Henderson's lawyer releases a counter-statement within two hours. The counter-statement: also six paragraphs. Every paragraph directly contradicts the corresponding paragraph in Gerry's statement. Darrell reads both side by side. Says: 'Efficient.' He means the counter-statement.",moraleBoost:10},
      {souls:0,optics:0,msg:"'I'm proud of everything we built here.' Jamie runs the quote next to Part five, which is about the art on the wall. The math: $780 collected, $75 in gift cards, $680 on the painting. $25 unaccounted for. The $25 is somehow the most damning part. Casey reads it. Opens her resignation letter. Closes it. She already has four offers.",moraleBoost:8},
      {souls:200,optics:0,msg:"Part six is Henderson's notebook. Forty-three pages. Organized by date, exhibit, and category. Darrell's sentence from FINAL v2 appears on page 38. Scott's parking-lot bullet points are Appendix B. Jamie was given the notebook by Henderson directly. Henderson made a copy first. Henderson always makes a copy.",moraleBoost:0},
    ]},

  // ─── COMMUNITY SERVICE EVENT ─────────────────────────────────────────────────
  {id:26,emoji:"🤝",minRank:6,text:"The Community Service Day has been covered by a local journalist.",
    sub:"Jamie is there. Her camera was already out when Gerry arrived. She knew he would leave early. Henderson told her.",
    options:["Issue a statement: 'Gerry was needed back at the office.'","Call Jamie directly.","Send JJ to handle it."],
    outcomes:[
      {souls:-100,optics:0,msg:"The statement runs alongside a photo of Beardogg building the raised bed alone. Caption: 'Pinnacle employees volunteer while leadership returns to the office.' Henderson has the article. Exhibit T. Darrell: 'Good photo of Beardogg.' Scott from his car: 'really good photo.'",moraleBoost:0},
      {souls:0,optics:0,msg:"Jamie takes the call. Publishes the story anyway. The headline is about Beardogg. The subheadline mentions Gerry's 'early departure for a prior engagement.' The prior engagement was lunch. Scott reads the article. Texts: 'beardog built a whole thing.' He left at 2. He was proud of Beardogg.",moraleBoost:5},
      {souls:100,optics:0,msg:"JJ arrives and tells Jamie that Gerry 'planted the seeds of this initiative — literally and figuratively.' Jamie looks at JJ for a long time. The article quotes JJ. The quote does not help. It is now two exhibits. Darrell reads JJ's quote. Says: 'planted the seeds.' He says it the way you'd read a warning label.",moraleBoost:0},
    ]},

  // ─── GUARANTEED RANK 4 — THE NEPHEW ─────────────────────────────────────
  {id:27,emoji:"🎓",text:"Tyler has arrived.",
    sub:"Gerry's nephew. 2.4 GPA. Lacrosse school. His graduation gift was a BMW M3, expensed under 'Talent Acquisition.' He starts Monday as Innovation Liaison. His parking spot is better than Beardogg's.",
    options:["Welcome Tyler personally. Give him a tour.","Assign Tyler to Casey. 'She'll get him up to speed.'","Give Tyler Scott's old project. 'Fresh eyes.'"],
    outcomes:[
      {souls:0,optics:120,msg:"The tour takes 90 minutes. Tyler asks what the analysts do. You explain. Tyler says: 'Wild.' Beardogg texts Gerry: 'sick addition bro.' JJ posts about Tyler on LinkUp within four minutes. Tags Gerry. Darrell looks at Tyler's parking spot. Says nothing. Folds a napkin.",moraleBoost:0},
      {souls:-200,optics:0,msg:"Casey receives Tyler at 9am. By 9:45 Casey has rebuilt his entire onboarding from scratch because Tyler's onboarding doc had no onboarding information in it. Casey's resignation letter gets a new section titled 'Tyler.' It is four pages. They are the most controlled four pages she has ever written.",moraleBoost:3},
      {souls:0,optics:200,msg:"Tyler is given the Q3 strategic initiative. Casey built the foundation over four months. Tyler has a question about the printer. Casey handles all of it. Tyler presents it. Tyler says 'we' nine times. All nine refer to Casey's work. Scott, from his car: 'it's the bmw thing all over again.'",moraleBoost:0},
    ]},

  {id:16,emoji:"😐",text:"JJ has cc'd three people on something you said in private.",sub:"Subject line: 'Just flagging — wanted to make sure the right people had visibility 🙌' Darrell looked at the email. The emoji. Said: 'There's an emoji.' He wrote it down.",options:["Address it directly with JJ.","Pretend it didn't happen.","CC JJ's manager on something minor."],outcomes:[{souls:0,optics:0,msg:"JJ's posture changes. The smile arrives — the big one, the one he uses when leadership is watching. 'I just want to make sure everyone has visibility.' He uses the word visibility three times in the apology. Henderson has copied the email and the apology."},{souls:80,optics:0,msg:"JJ does it again three days later with something bigger. JJ has also started replying to his own cc'd emails with follow-up thoughts. Darrell now has a napkin that is just a timeline. The timeline starts before you noticed."},{souls:-100,optics:0,msg:"JJ laughs at your next joke first and longest. Darrell watches you both. Writes nothing. The absence of the napkin this time is the message."}]},
];

// ─── DAILY MEMOS (v12 names) ──────────────────────────────────────────────────
const DAILY_MEMOS = [
  {souls:100,note:"Welcome back. Linda had already cried once before you arrived. Scott finished the Morrison report at 9:45 and is now watching something about ancient astronauts. Casey updated her resignation letter at 8:02am. JJ posted on LinkUp at 8:02am — the same minute as Casey's resignation letter update — and then immediately replied to his own post with a follow-up thought. Casey has noted this. It is in the document. Darrell arrived exactly on time and said nothing. This is a normal morning."},
  {souls:150,note:"Two days in a row. Scott delivered this week's summary at 7:45am, left a snack on Linda's desk, was gone by 2, and is currently watching a four-part series about the Bermuda Triangle. He has thoughts about part three. He does this every Monday. Darrell acknowledged it with a nod once and said: 'man does not waste a minute.' That was Scott's performance review."},
  {souls:200,note:"Three days. Scott has completed this week's project. It is Monday. Beardogg texted Gerry about it, taking partial credit: 'yeah we crushed it bro.' Darrell heard about both things. Said: 'Of course.' These Souls represent your continued operational capacity."},
  {souls:250,note:"Four days. Scott said something in yesterday's meeting that you're still thinking about. You will be thinking about it at 3am. Henderson's lawyer sent another letter. These Souls are yours."},
  {souls:350,note:"Day five. Bitsy rebranded something while wearing what can only be described as office-adjacent fashion. Casey almost quit. Beardogg delivered early. Linda cried. Darrell said one thing about the rebranding that made Casey laugh for the first time this week. Scott left at 2. Normal Tuesday."},
  {souls:400,note:"Six days. The Office Confessional now has nineteen reviews. Six mention Scott favorably. Three quote Darrell's sentence directly. One says Darrell's sentence 'changed how I think about Tuesdays.' All mention Henderson. Darrell brought in a homebrew today — a saison, dry-hopped with Citra. He left one bottle on Scott's desk. Said nothing about it. Scott drank it and texted: 'good.' Darrell considered this a rave review."},
  {souls:500,note:"Seven days. Scott's one-paragraph resignation letter is ready, has been ready, will remain ready until he decides. Darrell's napkin pile has grown. Henderson's case is strengthening. You are here. So are they."},
];

// ─── CONFESSIONAL REVIEWS (v12 names) ────────────────────────────────────────
const CONFESSIONAL_REVIEWS = [
  (n)=>`"${n} took credit for Scott's work on stage. Beardogg was also on stage. Nobody knows how Beardogg got on stage. Scott was in the audience. Scott had a snack. Scott was writing something on a napkin. The napkin later appeared in Darrell's collection." — Anonymous`,
  ()=>`"Linda cried four times today. Scott left her a snack and a note. Darrell said, on his way past: 'it always does, for what it's worth.' It passed. Linda was back at her desk in an hour, on time, as always." — Current Employee`,
  ()=>`"Casey threatened to quit again. We've started a pool. The resignation letter is now 13 pages. Scott proofread it. He said: 'Clean draft. Part Two is the strongest section.'" — Anonymous`,
  (n)=>`"Scott delivered the quarterly report three days early. ${n} described it as 'meeting expectations.' Scott's response: he went back to his documentary. He always goes back to his documentary. It was about the Nazca lines. He has seen it before." — Current Employee`,
  (n)=>`"Darrell said one sentence in the all-hands. ${n} changed the slide immediately after. Nobody talked about the slide. Everyone talked about the sentence." — Anonymous`,
  (n)=>`"${n} told Henderson that Darrell was their new point of contact. Henderson looked at Darrell. Darrell nodded slightly. Henderson nodded back. Something happened in that exchange that nobody outside it will ever understand." — Anonymous`,
  ()=>`"Bitsy rebranded the kitchen again. Darrell looked at the new name for a long time. Said: 'Third name.' Scott said: 'Hm.' That was the whole review. It was accurate." — Current Employee`,
  (n)=>`"Beardogg won another award. ${n} accepted it. Scott was watching the livestream. Eating a chip. The chip was louder than the applause in context." — Former Employee`,
  ()=>`"The survey said morale was critical. Management hosted a pizza party. Darrell looked at the pizza. Looked at Scott. Scott said: 'That's the trade.' Darrell said: 'Yeah.' They ate the pizza." — Anonymous`,
  (n)=>`"Henderson filed a new complaint. It has footnotes. Scott proofread it. 'Fixed a comma on page 3. Good structure.' Then he went back to his documentary about alleged extraterrestrial contact with ancient civilizations. He left at 2. He had opinions about episode four." — Anonymous`,
  ()=>`"Casey's resignation letter is now 14 pages. I've read it. All of it. Part Two is the strongest section. Scott agrees. Scott shouldn't have read it either but here we are." — Current Employee`,
  (n)=>`"${n} used 'I' twenty-three times in a speech about teamwork. Darrell counted without being asked and then said: 'twenty-three, by the way' after the room had gone quiet. The silence lasted a while." — Anonymous`,
  ()=>`"Scott said one thing in the meeting. Eleven words. I've been thinking about those eleven words for three days. I think I'm going to change careers." — Current Employee (for now)`,
  (n)=>`"JJ laughed at ${n}'s last joke before anyone else in the room. Casey timed it. 0.4 seconds. It is in a spreadsheet. The spreadsheet has a chart. The chart shows JJ's laugh timing getting faster as ${n}'s rank increases." — Current Employee`,
  (n)=>`"JJ updated his LinkUp profile twelve minutes after ${n}'s last promotion announcement. Casey has the timestamps. There is a graph. The graph has a trendline. The trendline is, according to Casey, 'statistically significant.'" — Anonymous`,
  (n)=>`"JJ has a printed copy of ${n}'s LinkUp profile above his desk. It is annotated. The annotations are color-coded. Henderson photographed it during a team visit. It is Exhibit H. Darrell found out about the photo. Said: 'annotated.' Just that." — Anonymous`,
  (n)=>`"JJ called ${n} 'visionary' in a meeting. Just dropped it in. Mid-sentence. 'As our visionary leader often says.' Nobody said anything. The word sat there. Darrell looked at the ceiling for a long time. Scott, on the calendar link from his car, put his phone down and then picked it back up." — Current Employee`,
  (n)=>`"JJ sent a Ping at 11pm that said 'low priority but wanted you to see this' followed by a screenshot of a LinkedIn post about leadership. The post was written by ${n}. ${n} wrote it. ${n} sent it to ${n}. Darrell heard about this. Said: 'Full circle.' Scott: 'yeah.'" — Anonymous`,
  (n)=>`"At Rank 1, JJ didn't know ${n}'s name. At Rank 4, JJ had ${n}'s schedule memorized. At Rank 7, JJ described ${n} as 'transformative' in three separate documents. Casey has all three documents. They are in the separate document. There is a separate document for the documents about ${n}." — Former Employee`,

    (n)=>`"Darrell has a pile of folded napkins in his desk drawer. Each one is an org chart with small annotations. He showed them to Scott once. Scott said: 'the notes are the part that gets me.' Darrell: 'I have opinions.' He has opinions about a lot of things. Most of them are about dry-hopping schedules and grain bills. None of those napkins are in the desk drawer. Scott left at 2. Darrell kept the org chart napkins." — Anonymous`,
];

// ─── LINKUP BIOS (v12 names) ──────────────────────────────────────────────────
const LINKUP_BIOS = [
  "Passionate Team Lead with a proven track record.",
  "Manager driving cross-functional alignment.",
  "Senior leader with a corner office.",
  "Director. I am fine.",
  "VP. The chip was louder than my speech, somehow.",
  "EVP. I have not read FINAL v2.",
  "COO. I should have been more concerned about what Darrell was observing.",
  "PE-Installed CEO. Henderson won. I have a yacht.",
];
const GERRY_LINKUP = {
  taglines: [
    "Team Lead | Builder | People-First Leader | Very open to coffee chats.",
    "Manager | Driving cross-functional alignment | Results-driven | Let's connect.",
    "Senior Manager | Thought Leader | Open to conversations that move the needle.",
    "Director | Visionary | Passionate about organizational excellence | Speaker.",
    "VP | Strategic Executive | Elevating teams and culture | Keynote available.",
    "EVP | C-Suite Leader | Transformational | Featured in 3 trade publications.",
    "COO | Operator | Builder | Committed to people-first leadership. Always.",
    "PE-Installed CEO | Founder Mindset | Visionary | Board Advisor | Author (forthcoming).",
  ],
  about: [
    "Passionate about building great teams. Gerry brings a unique blend of strategic vision and operational execution to everything. Open to connecting.",
    "A decade of cross-functional leadership. Gerry has consistently delivered results across diverse environments. The team is everything.",
    "Gerry believes that culture is the foundation of performance. This belief is sincere. The implementation is ongoing.",
    "Gerry has been described by colleagues as 'decisive,' 'present,' and 'very specific about the spelling of Gerry.' These are direct quotes from JJ.",
    "Gerry leads with empathy. Gerry also leads with a performance framework, a stack ranking system, and a yacht that has been expensed as a 'strategic offsite.' But mainly empathy.",
    "Multiple industry recognitions. Gerry has accepted three awards on behalf of the team. The team was notified after the ceremony. The awards are in Gerry's office.",
    "Gerry is proud to have built something meaningful here. The people are the product. Darrell has read this. Said: 'Hm.'",
    "Gerry has a forthcoming book tentatively titled 'I Built This From Nothing.' Scott has noted that the company was founded six years before Gerry arrived. Filed as 'Math_3.'",
  ],
  endorsements: [
    ["Leadership","Vision","Synergy","Saying Gerry with a G"],
    ["Strategic Thinking","Leadership","Vision","Cross-Functional Alignment","Synergy"],
    ["Leadership","Strategic Vision","Thought Leadership","Executive Presence","Disruption"],
    ["C-Suite Leadership","Strategic Vision","Keynote Speaking","Organizational Transformation","Synergy"],
    ["Visionary Leadership","Executive Strategy","Board Relations","Innovation","Culture (Claimed)"],
    ["Transformational Leadership","Visionary Strategy","Industry Recognition","Keynote","Authentic Leadership"],
    ["Enterprise Leadership","COO-Level Operations","Visionary Execution","Published Insights","Golf"],
    ["CEO","Visionary","Builder","Author (Forthcoming)","Strategic Acquirer","Legacy"],
  ],
  endorsedBy: [
    ["JJ ('Gerry is a real thought leader.')"],
    ["JJ ('Gerry gets it.')","Beardogg ('Great guy. Great golfer.')"],
    ["JJ ('Gerry is the real deal.')","Beardogg ('Legend.')","Douglas Pinnacle ('Tremendous.')"],
    ["JJ ('Four years working alongside Gerry and every day I learn something new.')","Beardogg ('🔥')","Douglas Pinnacle ('Tremendous.')","Tyler (new)"],
    ["JJ ('Genuinely humbled to work alongside this level of vision.')","Beardogg ('The GOAT 🐐')","Douglas Pinnacle ('Tremendous.')","Tyler ('Role model.')"],
    ["JJ ('Gerry has changed how I think about what leadership means.')","Tyler ('Literally the most visionary person I have ever met.')","Beardogg ('🐐🐐🐐')","Douglas Pinnacle ('Tremendous.')"],
    ["JJ ('I have updated my personal mission statement because of Gerry.')","Tyler ('A once-in-a-generation leader.')","Beardogg ('Legend.')","Douglas Pinnacle ('Tremendous.')"],
    ["JJ ('Words cannot express what Gerry means to me professionally and spiritually.')","Tyler ('The standard.')","Beardogg ('🐐🐐🐐🐐🐐')","Douglas Pinnacle ('Tremendous.')","Board Member ('This was not meant to be public.')"],
  ],
  featured: [
    `"Excited to be starting a new chapter at Pinnacle. Big things ahead. 🙏 #leadership #grateful"`,
    `"Had an incredible standup this morning. The team is LOCKED IN. #leadership #culture"`,
    `"Proud to share that Pinnacle had a record quarter. Couldn't have done it without the team. (The team did most of it.) #grateful"`,
    `"True leadership is about getting out of the way. Trusting the people around you. (I am stepping back slightly.) #leadership"`,
    `"Humbled to accept the Regional Excellence Award on behalf of the team. The team was not at the ceremony. They were at work. #leadership #grateful"`,
    `"Real leaders don't need the spotlight. (I have three spotlights. They are aimed at me. But the sentiment stands.) #leadership"`,
    `"Grateful for the journey. The people. The process. The outcomes. The platform. #grateful #leadership #vision #culture #growth"`,
    `"What does it mean to truly lead? I've been thinking about this since my TEDx talk. The answer is me. But also the team. Mostly me. #leadership #author"`,
  ],
  featuredLikes: [
    "JJ liked this within 4 minutes. Nobody else has interacted.",
    "JJ liked it, commented 'So true!'. Beardogg liked it. Nobody else. Darrell has seen it.",
    "JJ liked, commented, and shared with the caption 'This is leadership.' Henderson has the post. It is Exhibit J.",
    "JJ liked it within 90 seconds and commented 'couldn't agree more.' The team has not liked it.",
    "JJ liked it, shared it, and replied to his own share with a follow-up thought. Casey: 'That's four interactions on one post.'",
    "JJ liked it, commented, shared, and posted a tribute post. Darrell: 'Five.' He means the number of interactions.",
    "JJ's activity on this post spans three hours. He has replied to four commenters he has no affiliation with.",
    "JJ has bookmarked, shared, printed, and framed this post. It is hanging in his apartment next to the ring light.",
  ],
  note: [
    "JJ followed Gerry before Gerry connected back. JJ tracks this.",
    "Gerry's profile has been viewed 340 times this month. 280 of those views are from JJ.",
    "Gerry's profile has been updated six times this month. Each update coincides with something bad happening.",
    "Henderson has viewed Gerry's profile 144 times. This is Exhibit A in a different section of the notebook.",
    "JJ has endorsed Gerry for 23 skills. Gerry has endorsed JJ for zero. JJ has not mentioned this.",
    "Three trade publications have cited Gerry's LinkUp bio. One was sourced by Jamie. Not used the way Gerry expected.",
    "The bio contains 'I built this from nothing' twice. Scott has filed a note about the founding date discrepancy. It is 'Math_3.'",
    "Gerry's banner photo is a sunrise. Bitsy provided it. The sunrise is the same one from Bitsy's slide deck. Henderson has mentioned this. To his lawyer.",
  ],
};

const getLinkUpBio = (idx, bossName, gp) => {
  const bios = [
    `Passionate Team Lead. Scott delivered everything early. ${gp("cap")} presented it. Darrell watched. ${gp("cap")} tries not to think about how Darrell watched.`,
    `Manager driving cross-functional alignment. Scott figured out the hard part before noon and left at 2. Beardogg built it. ${gp("cap")} presents things.`,
    `Senior leader. Beardogg built the systems. Scott found a better approach on a weekend for fun. Henderson is building a case. ${gp("cap")} has a corner office.`,
    `Director. Scott said something in the meeting that ${gp("sub")} is still thinking about. Darrell has four folded napkins. Henderson has a lawyer. ${gp("cap")} gave Bitsy the culture budget. ${gp("cap")} is fine.`,
    `VP. Beardogg's fourth award arrived. ${gp("cap")} accepted it. The chip was louder than ${gp("pos")} speech. Darrell: 'There it is.'`,
    `EVP. Henderson spoke to journalist Jamie. Scott corroborated. Darrell contributed one sentence to FINAL v2. ${gp("cap")} has not read FINAL v2.`,
    `COO. The napkin pile has six entries. ${gp("cap")} should have been more concerned about what Darrell was observing.`,
    `PE-Installed CEO. Beardogg built everything. Scott figured everything out. Darrell observed everything. Henderson won. ${gp("cap")} has a yacht.`,
  ];
  return bios[Math.min(idx, bios.length-1)];
};


// ─── V12 NEW: SIDE HUSTLES ────────────────────────────────────────────────────
const SIDE_HUSTLES = [
  {
    id:"pest", emoji:"🐛", name:"Gerry's Pest Control", unlockRank:1, cost:50, reward:35,
    desc:"Accesses every room. Plausible deniability. Gerald Sr. owns the trucks.",
    targets:{
      Henderson:"Crew arrives. Henderson photographs the license plate before they enter. The plate is now Exhibit DD. They find nothing. Henderson found everything.",
      Linda:"Linda is home. She offers them coffee. They feel terrible about this and do a very thorough job. Linda rates them 5 stars. The review mentions your name.",
      Casey:"Casey was waiting. She has a log. Arrival time, truck number, crew names. It's already in the separate document.",
      Scott:"Crew finds 14 chip bags, a blanket, 3 documentaries on DVD, and a snack infrastructure Scott described as 'just how I organize things.' They leave. One crew member updates his own resume.",
      Darrell:"Darrell opens the door. Looks at them. Says one thing. They leave. Nobody knows what he said.",
      Beardogg:"Beardogg chats with the crew for 20 minutes. Remembers their names. Asks about their families. They forget what they came for. Leave satisfied.",
      Bitsy:"Bitsy: 'Oh my GOD I've been meaning to call about this.' Gives them a candle. They leave confused but happy. A partnership forms.",
      JJ:"JJ is not home. JJ is at the office. Standing near where Gerry usually stands. Practicing the proximity. The crew notes the ring light in the corner of the living room. There is a teleprompter next to the ring light. The teleprompter has Gerry's recent quotes on it.",
    },
    hendersonEvidence:true,
  },
  {
    id:"dogwalk", emoji:"🐕‍🦺", name:"Gerry's Dog Walking", unlockRank:1, cost:30, reward:25,
    desc:"Gets them out of the house. Or gets something out while they're gone.",
    targets:{
      Henderson:"Henderson doesn't have a dog. The walker reports back: 'Just a notebook on the table. A very thick notebook.' This was not useful. This was also somehow worse.",
      Linda:"Linda's dog comes back with a little bow tied on. Linda cries. Happy tears. She tips generously. The walker says it was the highlight of their week.",
      Casey:"Casey's dog is named Gerald Jr. The walker and Gerald Jr. have a great time. Casey documents the walker's arrival and departure in the separate document anyway.",
      Scott:"Scott doesn't have a dog. Scott has a fish. The fish is fine. The walker reports: 'Just a fish. Very calm in there. Lots of snacks though.'",
      Darrell:"Darrell's dog — a large silent dog that looks exactly like Darrell — walks beside the crew without a leash and returns home on its own. The crew does not charge extra.",
      Beardogg:"Beardogg has a yellow lab named Shotgun. Shotgun is also wearing croakies somehow. The walker takes Shotgun to the park. Shotgun is extremely friendly. Beardogg texts while this happens. Beardogg is texting Gerry about golf.",
      Bitsy:"Bitsy's dog is named Sunrise. The walker takes Sunrise to a dog park and posts about it. Bitsy reposts it. It gets 200 likes. Your scheme is now content.",
      JJ:"JJ posts a photo with the dog before the walk even starts. Tags Gerry's Hustles. Gets 63 likes. Tags Gerry. Uses the caption: 'Love seeing leadership invest in the community. 🐕 #culture #leadership'. Gerry has not invested in the community. Gerry dispatched a dog walker.",
    },
    hendersonEvidence:false,
  },
  {
    id:"demo", emoji:"🏚️", name:"Gerry's Demolition Co.", unlockRank:2, cost:80, reward:60,
    desc:"Three swings before insurance stops it. Gerald Sr. handles the permits.",
    targets:{
      Henderson:"Crew arrives. Henderson is ready. Has printed a copy of the local ordinance. Photographs the crew. They are now witnesses. This backfired completely.",
      Linda:"Linda is home and starts crying before they say anything. The crew puts everything back. One of them fixes her doorknob on the way out.",
      Casey:"Casey has already called the city. There's a hold on the permit. She did this two days ago. The separate document has a tab for this.",
      Scott:"Scott is home watching something. Crew knocks. Scott opens door. Looks at the truck. Says: 'Hm.' Closes the door. Calls someone. You don't know who.",
      Darrell:"Darrell opens the door before they knock. Looks at the truck. Looks at them. They get back in the truck.",
      Beardogg:"The house is structurally perfect. Beardogg built the addition himself. The sledgehammer bounces. Crew leaves with respect.",
      Bitsy:"Bitsy has a neon sign out front that says IDEATE. Crew mistakes it for commercial zoning. Does twice the work. You receive a fine.",
      JJ:"JJ is not home. JJ is at Gerry's side, which is where JJ has decided to be. The crew checks the calendar on JJ's fridge. JJ has blocked out time every morning labeled 'Gerry alignment.' The crew photographs this. The photograph is, objectively, the most unsettling thing they have ever photographed.",
    },
    hendersonEvidence:true,
  },
  {
    id:"landscape", emoji:"🌿", name:"Gerry's Landscaping", unlockRank:2, cost:45, reward:35,
    desc:"Tasteful. Legal. Potentially counterproductive.",
    targets:{
      Henderson:"Henderson asks the crew for their business license number. Files it. The crew is now documented. Henderson rates them 4 stars and recommends them to a lawyer friend.",
      Linda:"Linda loves it. Cries looking at the new flowers. Posts a photo. Gets 60 likes. The comments are all sweet. Your scheme is now someone's joy.",
      Casey:"Casey documents the arrival, the work performed, and the plant species. For the separate document. She has a whole section now.",
      Scott:"Scott waves from the window, goes back to his documentary — something about unexplained structures in Peru — and the yard is never mentioned again. Scott had already done his own yard on a weekend. 'Just a thing,' he said.",
      Darrell:"Darrell watches from his porch. Says nothing. The crew works faster than usual. Darrell nods when they leave. This is the highest rating Darrell gives anyone.",
      Beardogg:"Beardogg helps them. They finish in half the time. The yard looks incredible. They ask if he wants a job.",
      Bitsy:"Bitsy: 'We're doing a sunrise garden.' The crew doesn't know what that means. They plant sunflowers. Bitsy posts about it daily.",
      JJ:"JJ posts before and after photos. Captions it: 'Grateful to support leadership vision in every space — including the yard. 🌿 #culture #gerry'. He tags Gerry. Gerry reposts it. JJ screenshots the repost. JJ posts the screenshot. Darrell: 'He posted a screenshot of a repost.' Casey: 'Of a before and after.' Darrell: 'Yes.'",
    },
    hendersonEvidence:false,
  },
  {
    id:"cleaning", emoji:"🧹", name:"Gerry's Cleaning Service", unlockRank:3, cost:100, reward:75,
    desc:"The one targeting Henderson. Plausible deniability: 'I gave everyone a gift card.'",
    targets:{
      Henderson:"What they found: the notebook (Henderson has two backups), FINAL v9 (cloud-synced to three locations), a printed copy of your expense report labeled Exhibit C. Henderson had a camera. The crew is now Exhibit EE.",
      Linda:"They organize Linda's desk better than it has ever been. She cries. She leaves them a handwritten thank-you note. She has very nice handwriting.",
      Casey:"Casey's resignation letter is laminated and framed above her desk. They dust around it. They do not touch it. They understand.",
      Scott:"Scott is watching something. They clean around him. He says: 'You don't have to do my area.' They do it anyway. He says: 'Oh. Thanks.' Offers them snacks.",
      Darrell:"Darrell isn't home. The apartment is already immaculate. One napkin folded on the table. They dust around it. Do not unfold it. Nobody unfolds it.",
      Beardogg:"Beardogg helps them clean. His place was already spotless. They finish in 20 minutes. He asks them about their kids. Remembers the names.",
      Bitsy:"Crew arrives. Bitsy has rebranded her living room as 'The Restoration Space.' They clean it. Bitsy films the whole thing for content.",
      JJ:"JJ's apartment has motivational posters. A ring light. A backup ring light. A printed copy of Gerry's LinkUp profile above the desk — annotated. The annotations are color-coded. The crew photographs everything and leaves without cleaning anything. They could not focus.",
    },
    hendersonEvidence:true,
  },
  {
    id:"detail", emoji:"🚗", name:"Gerry's Car Detailing", unlockRank:4, cost:120, reward:90,
    desc:"Corporate espionage with wax and a chamois.",
    targets:{
      Henderson:"Car contains: a printed dossier labeled with your name, a second notebook, and a folder marked 'For Jamie.' Henderson was ready for this too.",
      Linda:"Car has a Tuesday lunch receipt from every week for eleven years. The crew is moved. One of them cries.",
      Casey:"Glove compartment: the resignation letter. All 14 pages. Laminated. Casey knew.",
      Scott:"Car contains: a blanket, 7 kinds of snacks organized by type, his resignation letter, and a book about unexplained aerial phenomena he is reading for fun. One paragraph. The crew reads it. One of them updates his own resume in the parking lot.",
      Darrell:"Car is empty. Clean. No registration visible. No receipts. Not even a parking stub. The crew returns the keys in silence.",
      Beardogg:"Car: a 2023 Tahoe with a Fraternity sticker on the back window, three golf gloves on the passenger seat, and a parking pass for Douglas Pinnacle's club on the dash. Fantasy league app open. He's winning. The crew finds a scorecard. It shows a 94. The handicap on his LinkUp says 14.",
      Bitsy:"Car has a sunrise photo taped to the dashboard. A small candle in the cupholder. A vibe playlist visible on the screen. The crew rates it the most 'on brand' car they've ever detailed.",
      JJ:"Car contains: professional headshots (multiple looks), Gerry's calendar for the next six weeks, a list titled 'Topics Gerry Cares About' with seventeen entries, and a sticky note on the dash that says 'BE ESSENTIAL.' The crew reads the sticky note. One of them updates their own resume in the parking lot. They are unsettled in a different way than usual.",
    },
    hendersonEvidence:true,
  },
];

// ─── V12 NEW: DESK ACHIEVEMENTS ───────────────────────────────────────────────
const DESK_ITEMS = [
  {id:"polo",       emoji:"🖼️", name:"The Polo Photo",              cat:"Photos",    desc:"Gerry and Douglas Pinnacle at the club. Douglas is looking at the horse.",                                              unlockNote:"Always unlocked"},
  {id:"mba",        emoji:"📜", name:"MBA Diploma",                  cat:"Documents", desc:"The school has a building named after Gerald Sr.'s polo partner's family.",                                             unlockNote:"Start of game"},
  {id:"mug",        emoji:"☕", name:"'World's Okayest Boss' Mug",  cat:"Objects",   desc:"Team gift. Cost $8. Gerry has referenced it in three LinkUp posts. Never washed.",                                      unlockNote:"Complete any scheme"},
  {id:"plant",      emoji:"🪴", name:"The Desk Plant",              cat:"Objects",   desc:"Fake. Gerry didn't know for 8 months. Casey knew immediately. Said nothing.",                                           unlockNote:"Reach Rank 2"},
  {id:"teamphoto",  emoji:"📷", name:"Team Photo",                  cat:"Photos",    desc:"Linda is mid-cry in the background. Darrell is looking slightly left of camera. Scott is not visible — stepped out for a snack. JJ is closest to Gerry.", unlockNote:"Reach Rank 2"},
  {id:"award",      emoji:"🏆", name:"Industry Award",              cat:"Awards",    desc:"Gerry accepted it on stage. Beardogg was also on stage. Nobody is sure how Beardogg got on stage. Beardogg has the smile. The actual work was Scott's. Scott watched from the back. Ate something.",             unlockNote:"Complete a Beardogg scheme"},
  {id:"hardhat",    emoji:"⛑️", name:"Demolition Hard Hat",         cat:"Objects",   desc:"'Pinnacle Demo Co.' in vinyl letters. Gerry has never been to a demolition site. There is a photo shoot receipt.",     unlockNote:"Deploy Gerry's Demolition Co."},
  {id:"polo2",      emoji:"🖼️", name:"Second Polo Photo",           cat:"Photos",    desc:"Different horse. Douglas not present. This was not a good day at the club.",                                            unlockNote:"Reach Rank 3"},
  {id:"leadership", emoji:"🏅", name:"Leadership Excellence Award", cat:"Awards",    desc:"Gerry nominated himself. $200 submission fee. Expensed as 'professional development.' Scott: 'Hm.'",                  unlockNote:"Reach Rank 3"},
  {id:"napkin",     emoji:"🗒️", name:"Darrell's Org Chart (Found)",  cat:"Documents", desc:"Darrell left a napkin. Gerry found it. Kept it. The org chart has a small asterisk next to Gerry's name and a small drawing of what appears to be a fermentation vessel in the corner. No key provided for either.", unlockNote:"Complete 3 reorgs"},
  {id:"letter",     emoji:"📋", name:"Casey's Resignation Letter (Framed)",cat:"Documents",desc:"Casey doesn't know it's here. It is 14 pages. The frame is from Pottery Barn.",                              unlockNote:"Trigger Casey event 3 times"},
  {id:"pen",        emoji:"✒️", name:"Montblanc Pen",               cat:"Objects",   desc:"Expensed as 'office supply.' Henderson has the receipt. It is Exhibit C.",                                              unlockNote:"Reach Rank 4"},
  {id:"scot_note",  emoji:"📌", name:"Scott's One-Line Note",       cat:"Documents", desc:"Scott left a note on a project doc. One line. Gerry framed it. The note says: 'See attached.' There is no attachment.", unlockNote:"Trigger Scott event"},
  {id:"parachute",  emoji:"🪂", name:"Mini Parachute (Novelty)",    cat:"Objects",   desc:"Promotional item from an EVP conference. Tagline: 'Always have an exit strategy.' Darrell saw this on the desk. Said: 'Yeah.'", unlockNote:"Reach Rank 5"},
  {id:"bluedisruption", emoji:"🖼️", name:"Blue Disruption No. 4",    cat:"Photos",    desc:"$680. Oil on canvas. The price tag is still on the frame. $780 was collected. $75 went to gift cards. $680 went here. $25 is unaccounted for. Henderson photographed the painting and the price tag. Casey did the math. The math is in the separate document.",                   unlockNote:"Complete the art scandal"},
  {id:"portrait",   emoji:"🖼️", name:"Oil Portrait of Gerry",       cat:"Photos",    desc:"$12,000. Commissioned. Darrell heard about this. Folded a new napkin. The napkin has a category now. Beardogg said 'sick portrait bro.' Gerry took this as the highest compliment.",                   unlockNote:"Complete boardroom portrait scheme"},
  {id:"drawer",     emoji:"🗄️", name:"The Locked Drawer",           cat:"Special",   desc:"Nobody asks about the drawer. Darrell has asked about the drawer. Exactly once. Gerry said: 'Just files.' Darrell said: 'Okay.'", unlockNote:"Tap to open"},
];

// ─── V12 NEW: LINKUP PROFILES ─────────────────────────────────────────────────
const LINKUP_PROFILES = {
  Henderson: {
    title:"Analyst → Documenting Everything",
    tagline:"Experienced professional exploring opportunities in ethical workplace culture.",
    endorsements:["Documentation","Pattern Recognition","Ethical Conduct","Knowing When Something Is Wrong"],
    endorsedBy:["Scott (for Documentation)","Darrell (for Pattern Recognition, silently)"],
    openTo:"Open to: conversations about systemic change. Not open to: NDAs.",
    featured:`Latest post: "When the notebook gets thick enough, it becomes a book. Working on the book."`,
    featuredLikes:"Scott liked this. Jamie (journalist) liked this.",
    note:"Henderson's profile has 847 connections. Henderson has never posted about 'servant leadership.'",
  },
  Linda: {
    title:"Senior Associate, 11 Years",
    tagline:"Here before you. Here after you. Currently hand-lettering a card for someone's birthday. Crying a little, but productively.",
    endorsements:["Institutional Memory","Resilience","Knowing Where Everything Is","Crafting","Crying at Appropriate Times"],
    endorsedBy:["Casey (for Resilience)","Scott (for Knowing Where Everything Is)","Beardogg ('Linda is the best. Full stop.')"],
    openTo:"Open to: a Tuesday that doesn't start with a Ping from Gerry.",
    featured:`Latest post: nothing. Linda doesn't post. Linda knows things. Linda doesn't need to post.`,
    featuredLikes:"",
    note:"Linda has been tagged in 4 company photos. She is crying in 3 of them. In the 4th, she is mid-blink. She gave everyone a hand-stamped card at the last holiday party. Each one was different. Each one said something specific and kind. Casey keeps hers. Darrell keeps his. Scott keeps his. Henderson keeps his. Henderson's is in the notebook. Pressed flat. Not as evidence. Just because it was nice.",
  },
  Casey: {
    title:"Project Manager",
    tagline:"Delivering on time, under budget, and despite everything. The dental plan is excellent.",
    endorsements:["Project Management","Risk Assessment","Resignation Letter Drafting (14 pages, cited by 3 lawyers)","Staying Anyway"],
    endorsedBy:["Scott ('Casey is the reason things get done.')","Darrell (endorsed Casey for 'Judgment.' Said nothing else.)"],
    openTo:"Open to: new opportunities, better management, or just a week where the agenda doesn't change on Thursday.",
    featured:`Latest post: "Grateful for the team. You know who you are. The resignation letter is currently 14 pages. That's for a different audience."`,
    featuredLikes:"Linda liked this. Scott liked this. Henderson liked this. JJ liked this first and added a comment.",
    note:"Casey's profile has been updated 14 times in the last quarter. Each update coincides with a Gerry all-hands. Casey has options. Casey has always had options. Casey has a whole life outside this office that nobody here knows about, which is, honestly, the move. She stays for the dental. The dental is genuinely exceptional.",
  },
  Scott: {
    title:"Senior Analyst",
    tagline:"I work here. I leave at 2.",
    endorsements:["Everything","Leaving At 2","Knowing Things Before They Happen","Not Making It Anyone's Problem"],
    endorsedBy:["847 people. Scott has not logged into LinkUp since 2019. He checked in once to see the Henderson post. Left again immediately."],
    openTo:"Open to: nothing in particular. Has snacks.",
    featured:`Last post: 2019. Three words. Nobody knows what it means. 203 likes. Scott doesn't remember posting it.`,
    featuredLikes:"Darrell liked it. That's all anyone needed.",
    note:"Scott's resignation letter is one paragraph. Written two years ago in about ten minutes. It is better than Casey's 14 pages. Casey has read it. Casey has feelings about this. Scott's most-watched series is Ancient Aliens. Scott has never confirmed or denied whether he believes it. He simply watches it. Carefully.",
  },
  Darrell: {
    title:"Associate",
    tagline:"I have opinions.",
    endorsements:["Observation","Dry Wit","Saying The Right Thing At The Right Time","Knowing When Not To"],
    endorsedBy:["Nobody has endorsed Darrell. Darrell declined all endorsements. When asked, he said: 'I'd rather not.'"],
    openTo:"Conversations that are worth having.",
    featured:`No posts. One comment, once, on Casey's post. It was four words. 200 people liked it. Nobody knows exactly why.`,
    featuredLikes:"Henderson liked the comment. Scott liked it. Casey screenshot it.",
    note:"Darrell has 12 connections. All 12 have independently described him as 'the funniest person in the building who doesn't try to be funny.' Darrell is aware of this. He considers it the correct arrangement.",
  },
  Beardogg: {
    title:"Lead Engineer",
    tagline:"Building things. Winning fantasy leagues. Having the smile.",
    endorsements:["Everything Technical","Being A Good Person","Fantasy Football","Making Everyone Feel Welcome"],
    endorsedBy:["Scott ('Beardogg built the thing. I helped with one part.')","Darrell ('Beardogg.' That was the whole endorsement.)","Everyone who has ever worked with Beardogg"],
    openTo:"Open to: being credited for his own work, eventually. Also open to: fantasy football trades.",
    featured:`Latest post: just accepted a job offer. New title. Own credit. "Big things ahead. The network never stops. If you need me I'll be at the club. 🐕⛳ #blessed #leadership #nextchapter"`,
    featuredLikes:"Gerry liked it first and commented 'Love you bro.' JJ liked it second. Douglas Pinnacle commented 'That's my guy!' Linda liked it and cried. Scott did not like it. Darrell did not like it. Henderson liked it. Henderson likes everything. Henderson is collecting.",
    note:"Beardogg's leaving post has 40 likes, mostly from people in his fraternity and three golf contacts. Gerry shared it company-wide. JJ reposted it with the caption 'Class act.' Scott has not liked it. Scott has never liked anything Beardogg has posted.",
  },
  Bitsy: {
    title:"Chief Vibe Officer → Chief Innovation Officer",
    tagline:"Experience architect. Culture catalyst. Sunrise enthusiast.",
    endorsements:["Vibe Curation","Energy","Rebranding Things","Having A Budget"],
    endorsedBy:["Gerry ('Bitsy brings incredible energy!')","Bitsy (endorsed herself for 'Vision')"],
    openTo:"Open to: speaking engagements, brand partnerships, candle collaborations, and anyone who understands the assignment.",
    featured:`Latest post: "Culture isn't a department. It's a decision. It's a VIBE. Who's with me?? 🌅✨" [47 slides attached]`,
    featuredLikes:"Gerry liked it immediately. Henderson screenshotted it.",
    note:"Bitsy's profile has a sunrise in the header photo. Bitsy's profile photo also has a sunrise. Bitsy's featured section has three sunrises. Darrell looked at the profile once. Said: 'Consistent.'",
  },
  Tyler: {
    title:"Innovation Liaison",
    tagline:"Builder. Thinker. Innovation Liaison at Pinnacle Solutions Group. Grateful. 🙏",
    endorsements:["Leadership","Innovation","Strategic Thinking","Golf (learning)","Being Present"],
    endorsedBy:["Gerry ('Tyler is a real asset. Family first.')","JJ ('Tyler gets it. Day one energy.')","Beardogg ('Great guy 🤙')"],
    openTo:"Open to: learning, growing, connecting, and any conversation about leadership or the BMW M3.",
    featured:`Latest post (day 4 at Pinnacle): "So grateful to be surrounded by such incredible talent. When your uncle believes in you, you believe in yourself. #innovation #leadership #grateful"`,
    featuredLikes:"Gerry liked it and commented 'That\'s my guy! 💪'. JJ liked within 60 seconds. Henderson liked it. Henderson likes everything. Darrell has not liked it.",
    note:"Tyler\'s profile lists previous experience as: 'Lacrosse Captain (4 years),' 'Leadership Summit Attendee,' and 'Entrepreneur (briefly).' The entrepreneurship was a car wash he ran for two weekends. It broke even.",
  },
  JJ: {
    title:"Associate",
    tagline:"People-first leader. Strategic thinker. Passionate collaborator. Authentic human. Results-driven. Vision-aligned. Team player. (All of these are in his bio simultaneously.)",
    endorsements:["Stakeholder Management","Being Visible","Laughing At The Right Time","Strategic Proximity"],
    endorsedBy:["Gerry ('JJ is a real team player!')"],
    openTo:"Open to: conversations with leadership, speaking opportunities, panel invitations, advisory roles, mentorship (giving, not receiving), and being the first to like things. DMs open.",
    featured:`Latest post (Monday 8:02am, written Sunday night): "Grateful to be surrounded by such an incredible team. When you love what you do and who you do it with — it doesn't feel like work. #leadership #culture #grateful"`,
    featuredLikes:"Gerry liked it first. Bitsy commented '🌅🌅🌅'. Casey did not like it. Scott did not like it. Darrell did not like it.",
    note:"JJ's posts go up every Monday at 8:02am. He then replies to his own post within four minutes with a follow-up thought. He has done this for eleven consecutive weeks. Casey has documented the timestamps, the reply times, and the word count of each follow-up. It is in the separate document. There is a graph.",
    // Rank-aware profile snapshots
    byRank: [
      { // Rank 1
        tagline: "Building my career in the right environment. Still looking.",
        featured: `Latest post: "Excited to be growing in my role. Big things ahead. (Not here necessarily.)"`,
        featuredLikes: "3 likes. None from Gerry. Gerry does not know JJ's name yet. JJ has replied to his own post with a clarifying thought. The clarifying thought has zero likes.",
        note: "JJ has not introduced himself to Gerry. JJ does not think this is necessary. Casey has noted this.",
      },
      { // Rank 2
        tagline: "Cross-functional collaborator. Stakeholder of many things.",
        featured: `Latest post: "Great learnings from our all-hands today. Grateful for leadership that communicates. #growth"`,
        featuredLikes: "12 likes. Gerry liked it 4 minutes after it posted. JJ noticed. JJ has noted Gerry's notification timing.",
        note: "JJ has begun cc'ing Gerry on emails that don't require Gerry. Casey: 'He's hedging.' It is in the separate document.",
      },
      { // Rank 3
        tagline: "People-first leader in the making. Learning from the best.",
        featured: `Latest post: "Sometimes you work somewhere and you just know the leadership gets it. Feeling that today. #grateful #culture"`,
        featuredLikes: "Gerry liked it within 90 seconds. Bitsy commented '🌅'. Casey has started timing the likes. It is a spreadsheet now.",
        note: "JJ laughed at Gerry's last joke 0.4 seconds before anyone else. Casey timed this. It is in the separate document. There is a graph.",
      },
      { // Rank 4
        tagline: "Passionate about great leadership. Lucky to be learning from it daily.",
        featured: `Latest post: "What does great leadership look like? It looks like someone who makes the hard calls. Grateful to witness it. #leadership #inspired"`,
        featuredLikes: "Gerry liked it immediately. Darrell read it. Read it again. Said: 'witness it.' Just those two words.",
        note: "JJ volunteered to present Gerry's slides at the last all-hands. Gerry said yes. Darrell: 'That's new.' Henderson photographed the moment. It is Exhibit W.",
      },
      { // Rank 5
        tagline: "Aligned with the mission. Energized by the vision. Grateful for the leadership.",
        featured: `Latest post: "Proud to say I work somewhere where leadership isn't just a title — it's a standard. Humbled every day. #vp #culture #leadership"`,
        featuredLikes: "Gerry liked it, shared it, and commented 'This. 🙌'. Darrell read the comment. Said nothing. Folded a napkin. The napkin has JJ's name on it now.",
        note: "JJ has started standing near Gerry in photos. Not next to. Near. There is a geometry to it. Casey has a diagram. It is in the separate document.",
      },
      { // Rank 6
        tagline: "Proud to be part of something transformative. Results-driven. Vision-aligned.",
        featured: `Latest post (posted 8 minutes after Gerry's announcement): "When leadership moves like this, you just get out of the way and support the vision. Honored. #evp #leadership #culture #grateful"`,
        featuredLikes: "Gerry liked it first. Gerry shared it. Gerry commented three times. Henderson screenshots every comment. Casey has the screenshot timestamps.",
        note: "JJ references Gerry in every post now. Not by name. 'Leadership.' 'The vision.' 'Someone who gets it.' Henderson has filed a note about JJ under 'Persons of Interest.' This is new.",
      },
      { // Rank 7
        tagline: "Building alongside visionary leadership. Grateful. Energized. Present.",
        featured: `Latest post: "Some people inspire you to be better just by being in the room. I work with one of those people. Grateful every single day. #coo #leadership #grateful #vision"`,
        featuredLikes: "Gerry liked it, commented 'JJ gets it 💯', and reshared it with the caption 'This team 🙌'. Darrell read all three interactions. Said: 'Hm.' Scott read it from his car. Texted Darrell: 'the 💯 is new.' Darrell: 'yeah.'",
        note: "JJ has a framed photo on his desk. The photo is of JJ and Gerry at the offsite. Gerry is not looking at the camera. JJ is. JJ is smiling the smile. Henderson has photographed the photo. It is Exhibit Z.",
      },
      { // Rank 8
        tagline: "Humbled to work alongside someone rewriting what leadership means.",
        featured: `Latest post: "I don't use this word lightly. Visionary. There. I said it. Working with Gerry has changed how I think about what's possible. #ceo #leadership #grateful #blessed #vision #culture #team"`,
        featuredLikes: "Gerry liked it, commented, shared it company-wide, and referenced it in his next all-hands. Henderson has the post, the comment, the share, and the all-hands clip. They are Exhibits AA through AD. Casey: 'That's four exhibits for one post.' Darrell: 'It's efficient, honestly.'",
        note: "JJ has updated his bio to say 'Trusted advisor to visionary leadership.' Scott read the bio from his car. Texted one word: 'advisor.' He left at 2. He has been done since noon.",
      },
    ],
  },
};

// ─── TIME UTIL (unchanged) ────────────────────────────────────────────────────
function timeUntilRecharge(last, interval) {
  const remaining = Math.max(0, last + interval - Date.now());
  if (remaining <= 0) return null;
  const m = Math.floor(remaining / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return `${m}m ${s}s`;
}

// ─── MINI-GAMES (v12 names in comments/strings) ───────────────────────────────
function PaperBasketball({ onComplete }) {
  const [phase, setPhase]   = useState("power");
  const [power, setPower]   = useState(50);
  const [angle, setAngle]   = useState(50);
  const [fired, setFired]   = useState(false);
  const [scored, setScored] = useState(null);
  const powerDir = useRef(1);
  const angleDir = useRef(1);
  const tick = useRef(null);

  useEffect(() => {
    if (phase === "power" && !fired) {
      tick.current = setInterval(() => {
        setPower(p => {
          const next = p + powerDir.current * 3;
          if (next >= 100) powerDir.current = -1;
          if (next <= 0) powerDir.current = 1;
          return Math.max(0, Math.min(100, next));
        });
      }, 30);
    } else if (phase === "angle" && !fired) {
      tick.current = setInterval(() => {
        setAngle(a => {
          const next = a + angleDir.current * 2.5;
          if (next >= 100) angleDir.current = -1;
          if (next <= 0) angleDir.current = 1;
          return Math.max(0, Math.min(100, next));
        });
      }, 25);
    }
    return () => clearInterval(tick.current);
  }, [phase, fired]);

  const tap = () => {
    if (fired) return;
    clearInterval(tick.current);
    if (phase === "power") { setPhase("angle"); return; }
    const win = power >= 35 && power <= 70 && angle >= 35 && angle <= 65;
    setFired(true);
    setScored(win);
    setTimeout(() => onComplete(win), 800);
  };

  return (
    <div style={{ userSelect:"none" }}>
      <div onClick={tap} style={{ position:"relative", height:160, background:"rgba(255,255,255,0.03)", borderRadius:12, marginBottom:16, overflow:"hidden", border:"1px solid rgba(255,255,255,0.07)", cursor:fired?"default":"pointer", display:"flex", alignItems:"flex-end", justifyContent:"space-between", padding:"0 24px 24px" }}>
        <div style={{ fontSize:30, transition:fired?"all 1s ease":"none", transform:fired?(scored?"translateX(180px) translateY(-80px)":"translateX(100px) translateY(30px)"):"none", opacity:fired&&!scored?0.3:1 }}>🗞️</div>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:32 }}>🗑️</div>
          <div style={{ fontSize:10, color:"#555" }}>Henderson's bin</div>
        </div>
        {scored !== null && (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.5)", fontSize:52 }}>
            {scored ? "🎯" : "💨"}
          </div>
        )}
      </div>
      {!fired && (
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:12, color:"#666", marginBottom:6 }}>{phase === "power" ? "TAP to set POWER" : "TAP to set ANGLE & SHOOT"}</div>
          <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:99, height:10, overflow:"hidden", marginBottom:4 }}>
            <div style={{ width:`${phase==="power"?power:100}%`, height:"100%", background:phase==="power"?"linear-gradient(90deg,#30d158,#ffd700)":"rgba(255,255,255,0.15)", transition:"width 0.03s", borderRadius:99 }} />
          </div>
          {phase === "angle" && (
            <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:99, height:10, overflow:"hidden" }}>
              <div style={{ width:`${angle}%`, height:"100%", background:"linear-gradient(90deg,#ffd700,#ff9f0a)", transition:"width 0.025s", borderRadius:99 }} />
            </div>
          )}
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#555", marginTop:4 }}>
            <span>Too weak</span><span style={{ color:"#30d158" }}>Sweet spot</span><span>Too strong</span>
          </div>
        </div>
      )}
      {!fired && (
        <button onClick={tap} style={{ width:"100%", padding:14, marginTop:8, background:"linear-gradient(135deg,#ff2d55,#c0392b)", border:"none", borderRadius:12, color:"white", fontFamily:"Georgia,serif", fontSize:14, fontWeight:"bold", cursor:"pointer" }}>
          {phase === "power" ? "Set Power" : "SHOOT"}
        </button>
      )}
    </div>
  );
}

function ReplyAllRoulette({ onComplete }) {
  const segments = ["Reply","Reply","Delete","Reply All","Forward to CEO","CC Henderson","Reply","Delete","Reply All","Reply"];
  const bad      = ["Reply All","Forward to CEO","CC Henderson"];
  // Alternating green/red based on whether segment is bad
  const segColor = (seg) => bad.includes(seg) ? "#ff2d55" : "#30d158";
  const [spinning, setSpinning] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [landed, setLanded]     = useState(null);
  const [won, setWon]           = useState(null);
  const tick = useRef(null);
  const rot  = useRef(0);

  useEffect(() => {
    tick.current = setInterval(() => { rot.current += 6; setRotation(rot.current); }, 16);
    return () => clearInterval(tick.current);
  }, []);

  const stop = () => {
    if (!spinning) return;
    clearInterval(tick.current);
    setSpinning(false);
    const segDeg = 360 / segments.length;
    const norm = ((rot.current % 360) + 360) % 360;
    const idx  = Math.floor(norm / segDeg) % segments.length;
    const seg  = segments[idx];
    const win  = !bad.includes(seg);
    setLanded(seg);
    setWon(win);
    setTimeout(() => onComplete(win), 1600);
  };

  const segAngle = 360 / segments.length;

  return (
    <div style={{ userSelect:"none" }}>
      <div style={{ position:"relative", width:200, height:200, margin:"0 auto 20px" }}>
        <svg width={200} height={200} style={{ transform:`rotate(${rotation}deg)`, transition:spinning?"none":"transform 0.3s ease-out" }}>
          {segments.map((seg, i) => {
            const a1  = (segAngle * i * Math.PI) / 180;
            const a2  = (segAngle * (i+1) * Math.PI) / 180;
            const x1  = 100 + 95 * Math.cos(a1); const y1 = 100 + 95 * Math.sin(a1);
            const x2  = 100 + 95 * Math.cos(a2); const y2 = 100 + 95 * Math.sin(a2);
            const col = segColor(seg);
            return (
              <g key={i}>
                <path d={`M 100 100 L ${x1} ${y1} A 95 95 0 0 1 ${x2} ${y2} Z`} fill={col} opacity={0.7} />
                <path d={`M 100 100 L ${x1} ${y1} A 95 95 0 0 1 ${x2} ${y2} Z`} fill="none" stroke="#080810" strokeWidth={2} />
              </g>
            );
          })}
          <circle cx={100} cy={100} r={28} fill="#0e0e18" stroke="rgba(255,255,255,0.15)" strokeWidth={2} />
          <text x={100} y={106} textAnchor="middle" fill="#f0e6d3" fontSize={18}>📧</text>
        </svg>
        <div style={{ position:"absolute", top:-8, left:"50%", transform:"translateX(-50%)", fontSize:22, color:"#ffd700", textShadow:"0 0 8px rgba(255,215,0,0.8)" }}>▼</div>
      </div>
      {landed && (
        <div style={{ textAlign:"center", marginBottom:12 }}>
          <div style={{ fontSize:16, fontWeight:"bold", color:won?"#30d158":"#ff2d55" }}>{won?"✅":"❌"} {landed}</div>
        </div>
      )}
      {spinning && (
        <button onClick={stop} style={{ width:"100%", padding:14, marginTop:8, background:"linear-gradient(135deg,#ff2d55,#c0392b)", border:"none", borderRadius:12, color:"white", fontFamily:"Georgia,serif", fontSize:14, fontWeight:"bold", cursor:"pointer" }}>
          STOP THE WHEEL
        </button>
      )}
      {!spinning && won === null && (
        <div style={{ textAlign:"center", color:"#666", fontSize:13, marginTop:8 }}>Calculating...</div>
      )}
    </div>
  );
}

function ConfessionBoothJam({ onComplete }) {
  const [jams, setJams]     = useState([]);
  const [score, setScore]   = useState(0);
  const [missed, setMissed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [done, setDone]     = useState(false);
  const [won, setWon]       = useState(null);
  const spawnRef = useRef(null); const timerRef = useRef(null); const idRef = useRef(0);
  const comments = {
    win:["Scott: 'Efficient.' Goes back to his documentary. He does not say which one.","Darrell, on his way past: 'clean.' It is 2.","Beardogg: 'Good reflexes.' High praise from Beardogg.","Linda: 'You're so good at this!' [cries proudly]"],
    lose:["Henderson retrieved what you were printing. Exhibit U.","Linda saw the printout. Linda is crying about the printout.","Scott: 'Hm. The timing.' Offers a snack.","Darrell: 'Hm.' Folds a napkin. Adds it to the pile."],
  };
  useEffect(() => {
    spawnRef.current = setInterval(() => {
      if (done) return;
      const jamId = ++idRef.current;
      const isH = Math.random() < 0.2;
      setJams(prev => [...prev, { id: jamId, slot: Math.floor(Math.random() * 6), isHenderson: isH }]);
      setTimeout(() => {
        setJams(prev => {
          const exists = prev.find(j => j.id === jamId);
          if (exists) setMissed(m => m + 1);
          return prev.filter(j => j.id !== jamId);
        });
      }, 1800);
    }, 900);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(spawnRef.current); clearInterval(timerRef.current); setDone(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { clearInterval(spawnRef.current); clearInterval(timerRef.current); };
  }, []);
  useEffect(() => {
    if (done && won === null) { const w = score >= 5 && missed <= 3; setWon(w); setTimeout(() => onComplete(w), 1800); }
  }, [done]);
  const clearJam = (id, isHenderson) => {
    if (done) return;
    setJams(prev => prev.filter(j => j.id !== id));
    setScore(s => s + (isHenderson ? 2 : 1));
  };
  return (
    <div style={{ userSelect:"none" }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12, fontSize:13 }}>
        <span style={{ color:"#ffd700" }}>Cleared: {score}</span>
        <span style={{ color:timeLeft<=5?"#ff2d55":"#666" }}>⏱ {timeLeft}s</span>
        <span style={{ color:"#ff2d55" }}>Missed: {missed}</span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:12 }}>
        {[0,1,2,3,4,5].map(slot => {
          const jam = jams.find(j => j.slot === slot);
          return (
            <div key={slot} onClick={() => jam && clearJam(jam.id, jam.isHenderson)}
              style={{ height:72, background:"rgba(255,255,255,0.03)", borderRadius:10, border:`1px solid ${jam ? (jam.isHenderson ? "rgba(255,45,85,0.4)" : "rgba(255,215,0,0.2)") : "rgba(255,255,255,0.05)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, cursor:jam?"pointer":"default", transition:"border 0.1s" }}>
              {jam ? (jam.isHenderson ? "🧾" : "📄") : ""}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize:11, color:"#555", textAlign:"center", marginBottom:8 }}>🧾 Henderson jam = 2 points. Tap to clear!</div>
      {won !== null && (
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:32, marginBottom:8 }}>{won ? "✅" : "❌"}</div>
          <div style={{ fontSize:13, color:"#888", fontStyle:"italic", lineHeight:1.6 }}>{(won ? comments.win : comments.lose)[Math.floor(Math.random() * 4)]}</div>
        </div>
      )}
    </div>
  );
}

// ─── V12 NEW MINI-GAME: THE IDEATION GRID (Match-3) ──────────────────────────
const GRID_PIECES = ["📎","📄","☕","💻","📊","📁","🗓️"];
const GRID_SIZE = 6;

function IdeationGrid({ onComplete }) {
  const makeGrid = () => Array(GRID_SIZE).fill(null).map(() =>
    Array(GRID_SIZE).fill(null).map(() => GRID_PIECES[Math.floor(Math.random() * GRID_PIECES.length)])
  );
  const [grid, setGrid]   = useState(makeGrid);
  const [sel, setSel]     = useState(null);
  const [souls, setSouls] = useState(0);
  const [moves, setMoves] = useState(20);
  const [msg, setMsg]     = useState("");
  const [done, setDone]   = useState(false);
  const soulsRef = useRef(0); // track souls without stale closure

  const findMatches = (g) => {
    const matched = new Set();
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE - 2; c++) {
        if (g[r][c] && g[r][c] === g[r][c+1] && g[r][c] === g[r][c+2]) {
          let len = 3;
          while (c + len < GRID_SIZE && g[r][c] === g[r][c+len]) len++;
          for (let k = 0; k < len; k++) matched.add(`${r},${c+k}`);
        }
      }
    }
    for (let c = 0; c < GRID_SIZE; c++) {
      for (let r = 0; r < GRID_SIZE - 2; r++) {
        if (g[r][c] && g[r][c] === g[r+1][c] && g[r][c] === g[r+2][c]) {
          let len = 3;
          while (r + len < GRID_SIZE && g[r][c] === g[r+len][c]) len++;
          for (let k = 0; k < len; k++) matched.add(`${r+k},${c}`);
        }
      }
    }
    return matched;
  };

  const applyGravity = (g) => {
    const ng = g.map(r => [...r]);
    for (let c = 0; c < GRID_SIZE; c++) {
      const col = ng.map(r => r[c]).filter(Boolean);
      while (col.length < GRID_SIZE) col.unshift(GRID_PIECES[Math.floor(Math.random() * GRID_PIECES.length)]);
      for (let r = 0; r < GRID_SIZE; r++) ng[r][c] = col[r];
    }
    return ng;
  };

  const processMatches = (g) => {
    const matches = findMatches(g);
    if (!matches.size) return { grid: g, earned: 0, special: "" };
    const ng = g.map(r => [...r]);
    matches.forEach(k => { const [r,c] = k.split(",").map(Number); ng[r][c] = null; });
    const count = matches.size;
    let special = "";
    let earned = count * 10;
    if (count >= 5) { special = "⚡ Strategic Realignment! +50 bonus"; earned += 50; }
    else if (count >= 4) { special = "🔥 All-Hands Blast! +25 bonus"; earned += 25; }
    return { grid: applyGravity(ng), earned, special };
  };

  const swap = (r1, c1, r2, c2) => {
    if (moves <= 0 || done) return;
    const ng = grid.map(r => [...r]);
    [ng[r1][c1], ng[r2][c2]] = [ng[r2][c2], ng[r1][c1]];
    const { grid: ng2, earned, special } = processMatches(ng);
    if (earned === 0) { setMsg("No match. Darrell: 'Hm.'"); return; }
    const newSouls = soulsRef.current + earned;
    soulsRef.current = newSouls;
    setSouls(newSouls);
    setMsg(special || `+${earned} 💀`);
    setGrid(ng2);
    const newMoves = moves - 1;
    setMoves(newMoves);
    if (newMoves <= 0) {
      setDone(true);
      // Auto-complete so modal result phase handles everything
      // player taps Collect to proceed
    }
  };

  const handleTap = (r, c) => {
    if (done) return;
    if (!sel) { setSel([r,c]); return; }
    const [sr, sc] = sel;
    setSel(null);
    if (sr === r && sc === c) return;
    if (Math.abs(sr-r) + Math.abs(sc-c) !== 1) { setSel([r,c]); return; }
    swap(sr, sc, r, c);
  };

  return (
    <div style={{ userSelect:"none" }}>
      <div style={{ fontSize:12, color:"#888", fontStyle:"italic", textAlign:"center", marginBottom:4 }}>
        Bitsy renamed it. Darrell: "Still match-3."
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10, fontSize:13 }}>
        <span style={{ color:"#ffd700" }}>💀 {souls}</span>
        <span style={{ color:"#888", fontSize:11, fontStyle:"italic" }}>{msg}</span>
        <span style={{ color:moves<=5?"#ff2d55":"#666" }}>Moves: {moves}</span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:`repeat(${GRID_SIZE}, 1fr)`, gap:4, marginBottom:12 }}>
        {grid.map((row, r) => row.map((piece, c) => (
          <div key={`${r},${c}`} onClick={() => handleTap(r,c)}
            style={{ height:44, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18,
              background: sel && sel[0]===r && sel[1]===c ? "rgba(255,215,0,0.15)" : "rgba(255,255,255,0.03)",
              border: sel && sel[0]===r && sel[1]===c ? "1px solid rgba(255,215,0,0.4)" : "1px solid rgba(255,255,255,0.06)",
              borderRadius:8, cursor:done?"default":"pointer", opacity:done?0.5:1, transition:"background 0.1s" }}>
            {piece}
          </div>
        )))}
      </div>
      {done ? (
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:13, color:"#888", fontStyle:"italic", marginBottom:12 }}>
            Bitsy: "The grid has spoken." Darrell: "Still match-3."
          </div>
          <div style={{ fontSize:14, color: souls >= 30 ? "#30d158" : "#ff9f0a", fontWeight:"bold", marginBottom:12 }}>
            {souls >= 30 ? "✅ Strong session." : "💨 Could be worse."}
          </div>
          <button onClick={() => onComplete(souls >= 30)} style={{ width:"100%", padding:14, background:"linear-gradient(135deg,#ffd700,#ff9f0a)", border:"none", borderRadius:12, color:"#080810", fontFamily:"Georgia,serif", fontSize:14, fontWeight:"bold", cursor:"pointer" }}>Collect & Continue</button>
        </div>
      ) : (
        <>
          <div style={{ fontSize:11, color:"#555", textAlign:"center", marginBottom:10 }}>
            Tap a piece, then tap adjacent piece to swap. Match 3+.
          </div>
          <button onClick={() => onComplete(soulsRef.current)}
            style={{ width:"100%", padding:10, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, color:"#555", fontFamily:"Georgia,serif", fontSize:12, cursor:"pointer" }}>
            Cash out early ({souls} 💀)
          </button>
        </>
      )}
    </div>
  );
}

// ─── MINI-GAME LIST ───────────────────────────────────────────────────────────
const MINI_GAMES = [
  { id:"basketball", name:"Paper Basketball",    emoji:"🏀", desc:"Flick a ball into Henderson's bin. Scott keeps score. Linda cries when you miss.", cost:50, winOptics:220, loseOptics:40 },
  { id:"roulette",   name:"Reply-All Roulette",  emoji:"📧", desc:"Stop the wheel before it lands on 'CC Henderson.' Darrell is watching the whole time.", cost:40, winOptics:190, loseOptics:35 },
  { id:"printer",    name:"Confession Booth Jam",emoji:"🖨️", desc:"Clear paper jams before Linda sees what you were printing. Henderson appears as a boss jam.", cost:45, winOptics:170, loseOptics:30 },
  { id:"escape",     name:"The Quiet Exit",       emoji:"🚪", desc:"Tap the door when Henderson looks down at his notebook. Scott left two hours ago. You are still here.", cost:35, winOptics:160, loseOptics:25 },
  { id:"ideation",   name:"The Ideation Grid",    emoji:"🔮", desc:"Bitsy rebranded the match-3. Darrell: 'Still match-3.' Match pieces. Win or lose — you get Optics. More matches = more Optics.", cost:40, winOptics:250, loseOptics:80 },
];

function MeetingEscape({ onComplete }) {
  const [hWatching, setHWatching] = useState(true);
  const [steps, setSteps]         = useState(0);
  const [timeLeft, setTimeLeft]   = useState(15);
  const [done, setDone]           = useState(false);
  const [won, setWon]             = useState(null);
  const [flash, setFlash]         = useState(null);
  const timerRef = useRef(null);
  const lookRef  = useRef(null);

  useEffect(() => {
    const cycle = () => {
      const away = 700 + Math.random() * 1400;
      const back = 500 + Math.random() * 900;
      setHWatching(false);
      lookRef.current = setTimeout(() => {
        setHWatching(true);
        lookRef.current = setTimeout(cycle, back);
      }, away);
    };
    lookRef.current = setTimeout(cycle, 800);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); setDone(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { clearInterval(timerRef.current); clearTimeout(lookRef.current); };
  }, []);

  useEffect(() => {
    if (done && won === null) {
      const w = steps >= 5;
      setWon(w);
      setTimeout(() => onComplete(w), 1600);
    }
  }, [done]);

  const tap = () => {
    if (done) return;
    if (!hWatching) {
      setSteps(s => s + 1);
      setFlash("✅ Step taken.");
      setTimeout(() => setFlash(null), 400);
    } else {
      setFlash("❌ Henderson sees you.");
      setTimeout(() => setFlash(null), 700);
    }
  };

  return (
    <div style={{ userSelect:"none" }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16, fontSize:13 }}>
        <span style={{ color:"#ffd700" }}>Steps: {steps}/5</span>
        <span style={{ color:timeLeft<=5?"#ff2d55":"#666" }}>⏱ {timeLeft}s</span>
      </div>
      <div style={{ textAlign:"center", marginBottom:20 }}>
        <div style={{ fontSize:64, marginBottom:8 }}>{hWatching ? "🧾" : "🚪"}</div>
        <div style={{ fontSize:14, fontWeight:"bold", color:hWatching?"#ff2d55":"#30d158" }}>
          {hWatching ? "Henderson is watching." : "Henderson looked down — GO!"}
        </div>
        {flash && <div style={{ fontSize:13, fontWeight:"bold", marginTop:8, color:flash.includes("❌")?"#ff2d55":"#30d158" }}>{flash}</div>}
      </div>
      <button onClick={tap} disabled={done}
        style={{ width:"100%", padding:20, background:hWatching?"rgba(255,45,85,0.07)":"rgba(48,209,88,0.1)", border:`1px solid ${hWatching?"rgba(255,45,85,0.2)":"rgba(48,209,88,0.3)"}`, borderRadius:16, color:hWatching?"#ff2d55":"#30d158", fontFamily:"Georgia,serif", fontSize:16, fontWeight:"bold", cursor:done?"default":"pointer", transition:"all 0.15s" }}>
        {hWatching ? "🧾 Hold still..." : "🚪 Move now!"}
      </button>
      {won !== null && (
        <div style={{ textAlign:"center", marginTop:16 }}>
          <div style={{ fontSize:32, marginBottom:8 }}>{won ? "✅" : "❌"}</div>
          <div style={{ fontSize:13, color:"#888", fontStyle:"italic", lineHeight:1.6 }}>
            {won ? "Henderson looked down at the right moment. You are out. The notebook stays open." : "Henderson saw you. He writes the time. He always writes the time."}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniGameModal({ game, opticsMult, prestige, onResult, onClose }) {
  const [phase, setPhase] = useState("intro");
  const [won, setWon]     = useState(null);

  const handleComplete = (result) => {
    setWon(result);
    setPhase("result");
  };
  const handleCollect = () => { onResult(won, 0); onClose(); };

  const adjWin  = Math.round(game.winOptics  * opticsMult * (1 + prestige * 0.15));
  const adjLose = Math.round(game.loseOptics * opticsMult * (1 + prestige * 0.15));

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.95)", zIndex:990, display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"Georgia,serif" }}>
      <div style={{ background:"#0e0e18", border:"1px solid rgba(255,215,0,0.15)", borderRadius:20, padding:24, maxWidth:380, width:"100%", maxHeight:"92vh", overflowY:"auto" }}>
        {phase === "intro" && (
          <>
            <div style={{ fontSize:44, textAlign:"center", marginBottom:12 }}>{game.emoji}</div>
            <div style={{ fontSize:18, fontWeight:"bold", textAlign:"center", marginBottom:8 }}>{game.name}</div>
            <div style={{ fontSize:13, color:"#888", textAlign:"center", fontStyle:"italic", marginBottom:20, lineHeight:1.6 }}>{game.desc}</div>
            <div style={{ display:"flex", justifyContent:"space-around", marginBottom:20, fontSize:13 }}>
              <div style={{ textAlign:"center" }}><div style={{ color:"#ff2d55", fontWeight:"bold" }}>−{game.cost} 💀</div><div style={{ color:"#555", fontSize:11 }}>entry</div></div>
              <div style={{ textAlign:"center" }}><div style={{ color:"#30d158", fontWeight:"bold" }}>+{adjWin} Optics</div><div style={{ color:"#555", fontSize:11 }}>win</div></div>
              <div style={{ textAlign:"center" }}><div style={{ color:"#ffd700", fontWeight:"bold" }}>+{adjLose} Optics</div><div style={{ color:"#555", fontSize:11 }}>lose</div></div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setPhase("playing")} style={{ flex:2, padding:14, background:"linear-gradient(135deg,#ff2d55,#c0392b)", border:"none", borderRadius:12, color:"white", fontFamily:"Georgia,serif", fontSize:14, fontWeight:"bold", cursor:"pointer" }}>Play</button>
              <button onClick={onClose} style={{ flex:1, padding:14, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, color:"#666", fontFamily:"Georgia,serif", fontSize:14, cursor:"pointer" }}>Cancel</button>
            </div>
          </>
        )}
        {phase === "playing" && (
          <>
            <div style={{ fontSize:15, fontWeight:"bold", textAlign:"center", marginBottom:20 }}>{game.emoji} {game.name}</div>
            {game.id === "basketball" && <PaperBasketball onComplete={handleComplete} />}
            {game.id === "roulette"   && <ReplyAllRoulette onComplete={handleComplete} />}
            {game.id === "printer"    && <ConfessionBoothJam onComplete={handleComplete} />}
            {game.id === "escape"     && <MeetingEscape onComplete={handleComplete} />}
            {game.id === "ideation"   && <IdeationGrid onComplete={handleComplete} />}
          </>
        )}
        {phase === "result" && (
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:56, marginBottom:12 }}>{won ? "🎯" : "💨"}</div>
            <div style={{ fontSize:18, fontWeight:"bold", color:won?"#30d158":"#ff9f0a", marginBottom:8 }}>{won ? "Nice work." : "Could be worse."}</div>
            <div style={{ fontSize:22, color:"#ffd700", fontWeight:"bold", marginBottom:6 }}>+{won ? adjWin : adjLose} Optics</div>
            <div style={{ fontSize:12, color:"#555", fontStyle:"italic", marginBottom:24 }}>{won ? "Henderson noted this." : "Henderson also noted this."}</div>
            <button onClick={handleCollect} style={{ width:"100%", padding:14, background:"linear-gradient(135deg,#ffd700,#ff9f0a)", border:"none", borderRadius:12, color:"#080810", fontFamily:"Georgia,serif", fontSize:14, fontWeight:"bold", cursor:"pointer" }}>Collect & Continue</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ONBOARDING (v12: LinkUp) ─────────────────────────────────────────────────
function OnboardingScreen({ onDone }) {
  const [step, setStep]       = useState(0);
  const [visible, setVisible] = useState(true);
  const slides = [
    { corp:true,  text:"PINNACLE SOLUTIONS GROUP", sub:"New Employee Orientation — Module 1 of 47" },
    { corp:true,  text:"Welcome! We are so excited to have you join the Pinnacle family.", sub:null },
    { corp:true,  text:"At Pinnacle, we believe our people are our greatest asset.", sub:null },
    { corp:true,  text:"We value integrity, collaboration, and servant leadership.", sub:null },
    { corp:true,  text:"We also value transparency, psychological safety, and work-life balance.", sub:null },
    { corp:false, text:"That was the orientation.", sub:null, pause:true },
    { corp:false, text:"You sat through it.", sub:null },
    { corp:false, text:"You nodded at the right moments.", sub:null },
    { corp:false, text:"You have no intention of following any of it.", sub:null },
    { corp:false, text:"You never have.", sub:null, dramatic:true },
    { corp:false, text:"EVIL BOSSES", sub:"The worse you behave, the faster you rise.", title:true },
  ];
  const advance = () => {
    if (step < slides.length - 1) {
      setVisible(false);
      setTimeout(() => { setStep(s => s + 1); setVisible(true); }, 300);
    } else { onDone(); }
  };
  const slide = slides[step];
  return (
    <div onClick={advance} style={{ minHeight:"100vh", background: step < 5 ? "#f5f5f0" : "#080810", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:40, fontFamily: step < 5 ? "Arial, sans-serif" : "Georgia, serif", textAlign:"center", cursor:"pointer", userSelect:"none", transition:"background 0.5s ease" }}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} @keyframes pulse{0%,100%{opacity:0.3}50%{opacity:0.9}} @keyframes dramaticPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(1.02)}}`}</style>
      {step < 5 && (
        <div key={step} style={{ opacity:visible?1:0, transition:"opacity 0.3s ease", animation:visible?"fadeIn 0.4s ease":"none", maxWidth:420 }}>
          {step === 0 ? (
            <div>
              <div style={{ fontSize:13, letterSpacing:4, color:"#888", marginBottom:16 }}>🏢</div>
              <div style={{ fontSize:22, fontWeight:"bold", color:"#333", marginBottom:8 }}>{slide.text}</div>
              <div style={{ fontSize:13, color:"#aaa", letterSpacing:1 }}>{slide.sub}</div>
              <div style={{ marginTop:20, padding:"8px 16px", background:"#e8e8e0", borderRadius:4, display:"inline-block", fontSize:11, color:"#999" }}>Please tap to proceed with your orientation.</div>
            </div>
          ) : (
            <div style={{ fontSize:18, color:"#444", lineHeight:1.7 }}>{slide.text}</div>
          )}
        </div>
      )}
      {step === 5 && (
        <div key={step} style={{ opacity:visible?1:0, transition:"opacity 0.4s ease", animation:visible?"fadeIn 0.5s ease":"none" }}>
          <div style={{ fontSize:13, letterSpacing:4, color:"#666", textTransform:"uppercase", marginBottom:24 }}>One moment.</div>
          <div style={{ fontSize:26, color:"#f0e6d3", fontWeight:"bold" }}>{slide.text}</div>
        </div>
      )}
      {step > 5 && step < 10 && (
        <div key={step} style={{ opacity:visible?1:0, transition:"opacity 0.3s ease", animation:visible?"fadeIn 0.4s ease":"none", maxWidth:380 }}>
          <div style={{ fontSize: slide.dramatic ? 28 : 20, color: slide.dramatic ? "#ff2d55" : "#f0e6d3", lineHeight:1.7, fontWeight: slide.dramatic ? "bold" : "normal", animation: slide.dramatic ? "dramaticPulse 1.5s infinite" : "none" }}>
            {slide.text}
          </div>
        </div>
      )}
      {step === 10 && (
        <div key={step} style={{ opacity:visible?1:0, transition:"opacity 0.4s ease", animation:visible?"fadeIn 0.6s ease":"none", textAlign:"center" }}>
          <div style={{ fontSize:52, marginBottom:16 }}>😈</div>
          <div style={{ fontSize:36, fontWeight:"bold", color:"#ffd700", letterSpacing:4, marginBottom:12 }}>{slide.text}</div>
          <div style={{ fontSize:16, color:"#888", fontStyle:"italic" }}>{slide.sub}</div>
        </div>
      )}
      <div style={{ position:"fixed", bottom:40, left:"50%", transform:"translateX(-50%)", display:"flex", gap:8, alignItems:"center" }}>
        {slides.map((_, i) => (<div key={i} style={{ width: i === step ? 20 : 6, height:6, borderRadius:99, background:i===step?(step<5?"#999":"#ffd700"):(step<5?"#ccc":"#222"), transition:"all 0.3s" }} />))}
      </div>
      <div style={{ position:"fixed", bottom:16, left:"50%", transform:"translateX(-50%)", fontSize:11, color:step<5?"#ccc":"#444", letterSpacing:3, textTransform:"uppercase", animation:"pulse 2s infinite" }}>
        {step < slides.length-1 ? "tap to continue" : "tap to begin"}
      </div>
    </div>
  );
}


function GenderScreen({ name, onSelect }) {
  const opts = [
    { id:"he/him",    label:"He / Him"    },
    { id:"she/her",   label:"She / Her"   },
    { id:"they/them", label:"They / Them" },
  ];
  return (
    <div style={{ minHeight:"100vh", background:"#080810", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32, fontFamily:"Georgia,serif", textAlign:"center" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ fontSize:60, marginBottom:20, animation:"fadeUp 0.6s ease" }}>😈</div>
      <div style={{ fontSize:20, color:"#f0e6d3", fontWeight:"bold", marginBottom:8, animation:"fadeUp 0.6s ease 0.1s both" }}>One more thing about {name}.</div>
      <div style={{ fontSize:13, color:"#555", marginBottom:36, fontStyle:"italic", animation:"fadeUp 0.6s ease 0.2s both" }}>The team will refer to {name} accordingly.</div>
      <div style={{ display:"flex", flexDirection:"column", gap:12, width:"100%", maxWidth:280, animation:"fadeUp 0.6s ease 0.3s both" }}>
        {opts.map(o => (
          <button key={o.id} onClick={() => onSelect(o.id)}
            style={{ padding:"18px 24px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,215,0,0.15)", borderRadius:16, color:"#f0e6d3", fontFamily:"Georgia,serif", cursor:"pointer", textAlign:"center" }}>
            <div style={{ fontSize:18, fontWeight:"bold" }}>{o.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function NameScreen({ onSelect }) {
  const [showInput, setShowInput] = useState(false);
  const [custom, setCustom]       = useState("");
  const nb = () => ({ padding:"20px 28px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,215,0,0.15)", borderRadius:16, color:"#f0e6d3", fontFamily:"Georgia,serif", cursor:"pointer", minWidth:130 });
  return (
    <div style={{ minHeight:"100vh", background:"#080810", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32, fontFamily:"Georgia,serif", textAlign:"center" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ fontSize:60, marginBottom:20, animation:"fadeUp 0.6s ease" }}>😈</div>
      <div style={{ fontSize:11, letterSpacing:6, color:"#555", textTransform:"uppercase", marginBottom:36, animation:"fadeUp 0.6s ease 0.1s both" }}>Evil Bosses</div>
      <div style={{ fontSize:15, color:"#888", marginBottom:28, animation:"fadeUp 0.6s ease 0.2s both" }}>One more thing.</div>
      <div style={{ fontSize:22, color:"#f0e6d3", fontWeight:"bold", marginBottom:12, animation:"fadeUp 0.6s ease 0.3s both" }}>What is the boss's name?</div>
      <div style={{ fontSize:13, color:"#555", marginBottom:32, fontStyle:"italic", animation:"fadeUp 0.6s ease 0.35s both" }}>Classic. Or change it below.</div>
      {!showInput ? (
        <div style={{ display:"flex", gap:12, animation:"fadeUp 0.6s ease 0.4s both" }}>
          <button onClick={() => onSelect("Gerry")} style={nb()}><div style={{ fontSize:20, fontWeight:"bold", marginBottom:4 }}>Gerry</div></button>
          <button onClick={() => setShowInput(true)} style={nb()}><div style={{ fontSize:20, fontWeight:"bold", marginBottom:4 }}>Change it</div><div style={{ fontSize:12, color:"#666", fontStyle:"italic" }}>...also fine.</div></button>
        </div>
      ) : (
        <div style={{ animation:"fadeUp 0.4s ease" }}>
          <input autoFocus value={custom} onChange={e => setCustom(e.target.value)}
            onKeyDown={e => e.key === "Enter" && custom.trim() && onSelect(custom.trim())}
            maxLength={20} placeholder="Enter name..."
            style={{ background:"transparent", border:"none", borderBottom:"2px solid #ffd700", color:"#ffd700", fontSize:28, textAlign:"center", fontFamily:"Georgia,serif", outline:"none", width:220, padding:"8px 0", marginBottom:24 }} />
          <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
            <button onClick={() => custom.trim() && onSelect(custom.trim())} style={{ padding:"12px 28px", background:"linear-gradient(135deg,#ffd700,#ff9f0a)", border:"none", borderRadius:99, color:"#080810", fontFamily:"Georgia,serif", fontSize:14, fontWeight:"bold", cursor:"pointer" }}>Confirm</button>
            <button onClick={() => setShowInput(false)} style={{ padding:"12px 28px", background:"transparent", border:"1px solid #333", borderRadius:99, color:"#666", fontFamily:"Georgia,serif", fontSize:14, cursor:"pointer" }}>Back</button>
          </div>
        </div>
      )}
      <div style={{ marginTop:40, fontSize:12, color:"#1a1a25", fontStyle:"italic" }}>*No real Gerrys, Lindas, Caseys, Scotts, Darrells, Beardoggs, Bitsys, JJs, or Hendersons were harmed. Probably.</div>
    </div>
  );
}

// ─── MODALS ───────────────────────────────────────────────────────────────────
function DailyMemo({ name, streak, onClaim }) {
  const memo = DAILY_MEMOS[Math.min((streak-1)%7,6)];
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", zIndex:900, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ background:"#0e0e18", border:"1px solid rgba(255,215,0,0.2)", borderRadius:20, padding:28, maxWidth:340, width:"100%", fontFamily:"Georgia,serif" }}>
        <div style={{ fontSize:11, letterSpacing:4, color:"#ffd700", textTransform:"uppercase", marginBottom:20 }}>Internal Memo</div>
        <div style={{ fontSize:13, color:"#666", marginBottom:3 }}>TO: {name}</div>
        <div style={{ fontSize:13, color:"#666", marginBottom:3 }}>FROM: Finance (you)</div>
        <div style={{ fontSize:13, color:"#666", marginBottom:20 }}>RE: Daily Expense Allocation</div>
        <div style={{ fontSize:14, color:"#999", fontStyle:"italic", lineHeight:1.7, marginBottom:24 }}>"{memo.note}"</div>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:36, fontWeight:"bold", color:"#ffd700" }}>+{memo.souls} 💀</div>
          <div style={{ fontSize:13, color:"#666", marginTop:6 }}>Corporate Souls deposited</div>
          {streak>1&&<div style={{ fontSize:14, color:"#ff9f0a", marginTop:8 }}>🔥 Day {streak} streak</div>}
        </div>
        <button onClick={onClaim} style={{ width:"100%", padding:16, background:"linear-gradient(135deg,#ffd700,#ff9f0a)", border:"none", borderRadius:12, fontFamily:"Georgia,serif", fontSize:15, fontWeight:"bold", cursor:"pointer", color:"#080810" }}>Accept Funds</button>
      </div>
    </div>
  );
}

function HendersonModal({ event, name, onResolve }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.96)", zIndex:995, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <style>{`@keyframes hIn{0%{transform:scale(0.85) translateY(20px);opacity:0}100%{transform:scale(1) translateY(0);opacity:1}}`}</style>
      <div style={{ background:"#0e0e16", border:"2px solid rgba(255,45,85,0.4)", borderRadius:20, padding:28, maxWidth:360, width:"100%", animation:"hIn 0.5s ease", fontFamily:"Georgia,serif", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <div style={{ fontSize:36 }}>{event.emoji}</div>
          <div>
            <div style={{ fontSize:11, letterSpacing:3, color:"#ff2d55", textTransform:"uppercase", marginBottom:4 }}>Henderson Update</div>
            <div style={{ fontSize:17, fontWeight:"bold", color:"#f0e6d3" }}>{event.title}</div>
          </div>
        </div>
        <div style={{ fontSize:14, color:"#999", lineHeight:1.7, marginBottom:24, fontStyle:"italic" }}>{event.body}</div>
        <div style={{ fontSize:11, color:"#555", textAlign:"center", marginBottom:16, letterSpacing:2, textTransform:"uppercase" }}>How does {name} respond?</div>
        {event.options.map((opt,i)=>(
          <button key={i} onClick={()=>onResolve(i)} style={{ display:"block", width:"100%", marginBottom:10, padding:"14px 18px", borderRadius:12, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,45,85,0.15)", color:"#f0e6d3", fontFamily:"Georgia,serif", fontSize:14, cursor:"pointer", textAlign:"left" }}>
            {opt}
          </button>
        ))}
        <div style={{ marginTop:8, fontSize:11, color:"#333", textAlign:"center", fontStyle:"italic" }}>Henderson is watching. Henderson is always watching.</div>
      </div>
    </div>
  );
}

function HendersonResult({ result, hendersonLevel, onClose }) {
  const safeLevel = Math.min(Math.max(hendersonLevel||1, 1), 5);
  const hlvl = HENDERSON_LEVELS[safeLevel - 1];
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.9)", zIndex:994, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ background:"#0e0e16", border:"1px solid rgba(255,45,85,0.3)", borderRadius:20, padding:28, maxWidth:320, width:"100%", textAlign:"center", fontFamily:"Georgia,serif" }}>
        <div style={{ fontSize:15, color:"#999", fontStyle:"italic", lineHeight:1.8, marginBottom:20 }}>"{result.msg}"</div>
        <div style={{ display:"flex", gap:10, justifyContent:"center", marginBottom:16, flexWrap:"wrap" }}>
          {result.souls!==0&&(<div style={{ padding:"10px 18px", borderRadius:99, background:result.souls>0?"rgba(48,209,88,0.1)":"rgba(255,45,85,0.1)", border:result.souls>0?"1px solid rgba(48,209,88,0.3)":"1px solid rgba(255,45,85,0.3)" }}><span style={{ fontSize:18, fontWeight:"bold", color:result.souls>0?"#30d158":"#ff2d55" }}>{result.souls>0?`+${result.souls}`:result.souls} 💀</span></div>)}
          {result.moraleBoost>0&&(<div style={{ padding:"10px 18px", borderRadius:99, background:"rgba(48,209,88,0.08)", border:"1px solid rgba(48,209,88,0.25)" }}><span style={{ fontSize:18, fontWeight:"bold", color:"#30d158" }}>+{result.moraleBoost}% morale</span></div>)}
        </div>
        {result.moraleBoost>0&&<div style={{ fontSize:12, color:"#30d158", marginBottom:12, fontStyle:"italic" }}>The office heard about this. They feel slightly better. Scott nodded.</div>}
        <div style={{ fontSize:12, color:hlvl.color, marginBottom:20, fontStyle:"italic" }}>Henderson is now: {hlvl.label}. {hlvl.activity}</div>
        <button onClick={onClose} style={{ padding:"12px 32px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:99, color:"#f0e6d3", fontFamily:"Georgia,serif", fontSize:14, cursor:"pointer" }}>Continue</button>
      </div>
    </div>
  );
}

function HendersonCrisisModal({ bossName, onResolve }) {
  const [chosen, setChosen] = useState(null);
  const crisis = HENDERSON_CRISIS.onset;
  if (chosen !== null) {
    const outcome = crisis.outcomes[chosen];
    return (
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.97)", zIndex:996, display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"Georgia,serif" }}>
        <div style={{ background:"#0e0e16", border:"2px solid rgba(255,0,64,0.4)", borderRadius:20, padding:28, maxWidth:360, width:"100%", textAlign:"center" }}>
          <div style={{ fontSize:40, marginBottom:16 }}>⚖️</div>
          <div style={{ fontSize:14, color:"#999", fontStyle:"italic", lineHeight:1.8, marginBottom:20 }}>"{outcome.msg}"</div>
          {outcome.souls !== 0 && <div style={{ fontSize:18, color:"#ff2d55", fontWeight:"bold", marginBottom:8 }}>{outcome.souls} 💀</div>}
          <div style={{ fontSize:13, color:"#30d158", marginBottom:20 }}>+{outcome.morale}% morale — the team heard about this.</div>
          <div style={{ fontSize:12, color:"#444", fontStyle:"italic", marginBottom:20 }}>Henderson is still here. The notebook is still open. The level has not changed. What happens next depends on what Gerry does.</div>
          <button onClick={()=>onResolve(chosen)} style={{ width:"100%", padding:14, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, color:"#f0e6d3", fontFamily:"Georgia,serif", fontSize:14, cursor:"pointer" }}>Continue</button>
        </div>
      </div>
    );
  }
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.97)", zIndex:996, display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"Georgia,serif" }}>
      <style>{`@keyframes crisisIn{0%{transform:scale(0.85) translateY(20px);opacity:0}100%{transform:scale(1) translateY(0);opacity:1}}`}</style>
      <div style={{ background:"#0a0008", border:"2px solid rgba(255,0,64,0.5)", borderRadius:20, padding:28, maxWidth:380, width:"100%", animation:"crisisIn 0.6s ease", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ fontSize:11, letterSpacing:4, color:"#ff0040", textTransform:"uppercase", marginBottom:16, textAlign:"center" }}>⚖️ Henderson Event — Level 5</div>
        <div style={{ fontSize:18, fontWeight:"bold", marginBottom:14, textAlign:"center" }}>{crisis.title}</div>
        <div style={{ fontSize:13, color:"#888", fontStyle:"italic", lineHeight:1.8, marginBottom:20 }}>{crisis.body}</div>
        <div style={{ background:"rgba(255,0,64,0.06)", border:"1px solid rgba(255,0,64,0.2)", borderRadius:10, padding:12, marginBottom:20 }}>
          <div style={{ fontSize:11, color:"#ff0040", marginBottom:6, letterSpacing:2, textTransform:"uppercase" }}>⏰ Demotion clock is running</div>
          <div style={{ fontSize:12, color:"#888" }}>Appease Henderson in the Profile tab or the Board will review Gerry's position. The appeasements are real. The consequences are real. Henderson is very real.</div>
        </div>
        <div style={{ fontSize:11, color:"#555", marginBottom:14, textAlign:"center", letterSpacing:1 }}>How does {bossName} respond right now?</div>
        {crisis.options.map((opt, i) => (
          <button key={i} onClick={() => setChosen(i)} style={{ display:"block", width:"100%", marginBottom:10, padding:"14px 18px", borderRadius:12, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,45,85,0.2)", color:"#f0e6d3", fontFamily:"Georgia,serif", fontSize:14, cursor:"pointer", textAlign:"left" }}>{opt}</button>
        ))}
      </div>
    </div>
  );
}

function EventResult({ result, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.9)", zIndex:998, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ background:"#0e0e18", border:"1px solid rgba(255,215,0,0.15)", borderRadius:20, padding:28, maxWidth:320, width:"100%", textAlign:"center", fontFamily:"Georgia,serif" }}>
        <div style={{ fontSize:15, color:"#999", fontStyle:"italic", lineHeight:1.8, marginBottom:24 }}>"{result.msg}"</div>
        <div style={{ display:"flex", gap:10, justifyContent:"center", marginBottom:24, flexWrap:"wrap" }}>
          {result.souls!==0&&(<div style={{ padding:"10px 18px", borderRadius:99, background:result.souls>0?"rgba(48,209,88,0.1)":"rgba(255,45,85,0.1)", border:result.souls>0?"1px solid rgba(48,209,88,0.3)":"1px solid rgba(255,45,85,0.3)" }}><span style={{ fontSize:18, fontWeight:"bold", color:result.souls>0?"#30d158":"#ff2d55" }}>{result.souls>0?`+${result.souls}`:result.souls} 💀</span></div>)}
          {result.optics!=null&&result.optics!==0&&(<div style={{ padding:"10px 18px", borderRadius:99, background:"rgba(255,215,0,0.08)", border:"1px solid rgba(255,215,0,0.2)" }}><span style={{ fontSize:18, fontWeight:"bold", color:"#ffd700" }}>+{result.optics} Optics</span></div>)}
          {result.moraleBoost>0&&(<div style={{ padding:"10px 18px", borderRadius:99, background:"rgba(48,209,88,0.08)", border:"1px solid rgba(48,209,88,0.2)" }}><span style={{ fontSize:16, fontWeight:"bold", color:"#30d158" }}>+{result.moraleBoost}% morale</span></div>)}
          {!result.souls&&!result.optics&&!result.moraleBoost&&<div style={{ fontSize:14, color:"#666" }}>No immediate effect. Watch this space.</div>}
        </div>
        {result.hendersonNote && (
          <div style={{ fontSize:12, color:"#ff9f0a", fontStyle:"italic", marginBottom:16 }}>{result.hendersonNote}</div>
        )}
        <button onClick={onClose} style={{ padding:"12px 32px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:99, color:"#f0e6d3", fontFamily:"Georgia,serif", fontSize:14, cursor:"pointer" }}>Continue</button>
      </div>
    </div>
  );
}

function RankUpModal({ rank, soulsReward, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.93)", zIndex:997, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={onClose}>
      <style>{`@keyframes popIn{0%{transform:scale(0.4);opacity:0}70%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}}`}</style>
      <div style={{ animation:"popIn 0.5s ease", textAlign:"center", padding:32 }}>
        <div style={{ fontSize:80 }}>{rank.icon}</div>
        <div style={{ fontSize:11, letterSpacing:6, color:"#ffd700", textTransform:"uppercase", marginTop:18 }}>Promoted</div>
        <div style={{ fontSize:26, fontWeight:"bold", marginTop:10 }}>{rank.title}</div>
        <div style={{ fontSize:14, color:"#666", marginTop:8, fontStyle:"italic" }}>The worst rise fastest.</div>
        {soulsReward>0&&(<div style={{ marginTop:20, padding:"14px 28px", background:"rgba(255,215,0,0.08)", border:"1px solid rgba(255,215,0,0.25)", borderRadius:14, display:"inline-block" }}><div style={{ fontSize:22, fontWeight:"bold", color:"#ffd700" }}>+{soulsReward.toLocaleString()} 💀</div><div style={{ fontSize:12, color:"#666", marginTop:4 }}>Promotion bonus deposited</div></div>)}
        <div style={{ marginTop:24, fontSize:12, color:"#444", letterSpacing:2, textTransform:"uppercase" }}>tap to continue</div>
      </div>
    </div>
  );
}




// ─── SAVE / LOAD ─────────────────────────────────────────────────────────────
const SAVE_KEY = 'evil_bosses_save_v2';
const loadSave = () => {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
};
const clearSave = () => { try { localStorage.removeItem(SAVE_KEY); } catch(e) {} };

// ─── MAIN GAME ─────────────────────────────────────────────────────────────────
export default function EvilBosses() {
  const [screen, setScreen]               = useState("onboarding");
  const [bossName, setBossName]           = useState("Gerry");
  const [pronouns, setPronouns]           = useState("he/him");
  const [rankOptics, setRankOptics]       = useState(0);
  const [totalOptics, setTotalOptics]     = useState(0);
  const [souls, setSouls]                 = useState(STARTING_SOULS);
  const [rankIdx, setRankIdx]             = useState(0);
  const [prestige, setPrestige]           = useState(0);
  const [activeTasks, setActiveTasks]     = useState([]);
  const [doneIds, setDoneIds]             = useState([]);
  const [ownedPerks, setOwnedPerks]       = useState([]);
  const [agenda, setAgenda]               = useState([]);
  const [tab, setTab]                     = useState("schemes");
  const [toast, setToast]                 = useState(null);
  const [toastKey, setToastKey]           = useState(0);
  const [rankUpData, setRankUpData]       = useState(null);
  const [event, setEvent]                 = useState(null);
  const [eventResult, setEventResult]     = useState(null);
  const [hendersonEvent, setHendersonEvent] = useState(null);
  const [hendersonResult, setHendersonResult] = useState(null);
  const [hendersonLevel, setHendersonLevel]   = useState(1);
  const [hendersonAtMax, setHendersonAtMax]   = useState(null); // timestamp when hit level 5
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const [crisisResolved, setCrisisResolved]   = useState(false); // prevents repeat crisis modal
  const [usedAppeasements, setUsedAppeasements] = useState([]);
  const [appeaseCooldowns, setAppeaseCooldowns] = useState({});
  const [triggeredH, setTriggeredH]       = useState([]);
  const [morale, setMorale]               = useState(82);
  const [streak, setStreak]               = useState(1);
  const [showMemo, setShowMemo]           = useState(false);
  const [reorgCount, setReorgCount]       = useState(0);
  const [lastRecharge, setLastRecharge]   = useState(Date.now());
  const [rechargeTimer, setRechargeTimer] = useState(null);
  const [notification, setNotification]   = useState(null);
  const [agendaFlavor, setAgendaFlavor]   = useState(AGENDA_FLAVOR[0]);
  const [seenEventIds, setSeenEventIds]   = useState([]);
  const [activeGame, setActiveGame]       = useState(null);
  const [moraleGateFired, setMoraleGateFired] = useState(false);

  // ── V12 new state ──
  const [hustle, setHustle]               = useState(null);   // selected hustle
  const [hustleTarget, setHustleTarget]   = useState(null);   // selected target name
  const [hustleResult, setHustleResult]   = useState(null);   // result text
  const [unlockedDesk, setUnlockedDesk]   = useState(["polo","mba"]);
  const [selectedDeskItem, setSelectedDeskItem] = useState(null);
  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [profileCast, setProfileCast]     = useState(null);   // name of cast member to view
  const [showGerryProfile, setShowGerryProfile] = useState(false);

  const tickRef     = useRef(null);
  // ── Auto-save ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== "game") return;
    try {
      const save = {
        bossName, pronouns, rankIdx, rankOptics, totalOptics,
        souls, prestige, doneIds, ownedPerks, morale, streak,
        lastRecharge, reorgCount, seenEventIds,
        unlockedDesk, hendersonLevel, triggeredH, crisisResolved,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch(e) {}
  }, [bossName, pronouns, rankIdx, rankOptics, totalOptics, souls, prestige,
      doneIds, ownedPerks, morale, streak, lastRecharge, reorgCount,
      seenEventIds, unlockedDesk, hendersonLevel, triggeredH, crisisResolved, screen]);

  const rechargeRef = useRef(null);
  const notifRef    = useRef(null);

  const mood        = MOOD[Math.min(rankIdx, MOOD.length-1)];
  // Pronoun helper — gp("sub")=he/she/they, gp("pos")=his/her/their, gp("cap")=He/She/They etc.
  const ps = PRONOUN_SETS[pronouns] || PRONOUN_SETS["he/him"];
  const gp = (type) => ps[type] || "";
  const rank        = RANKS[rankIdx];
  const nextRank    = RANKS[rankIdx+1];
  const rankTarget  = RANK_OPTICS_NEEDED[rankIdx] || 1;
  const moraleGated = nextRank && morale < MORALE_PROMOTION_GATE;
  const xpPct = nextRank
    ? moraleGated ? Math.min((rankOptics / rankTarget) * 100, 95) : Math.min((rankOptics / rankTarget) * 100, 100)
    : 100;

  const speedMult    = ownedPerks.includes(5)?0.6:ownedPerks.includes(1)?0.8:1;
  const opticsMult   = ownedPerks.includes(4)?1.5:ownedPerks.includes(2)?1.25:1;
  const aiBonus      = ownedPerks.includes(10)?1.3:1;
  const effectiveLvl = ownedPerks.includes(3)?rankIdx+2:rankIdx+1;
  const maxConc      = ownedPerks.includes(7)?4:3;
  const rechargeAmt  = ownedPerks.includes(8)?150:RECHARGE_AMOUNT;
  const rechargeInt  = ownedPerks.includes(9)?RECHARGE_INTERVAL/2:RECHARGE_INTERVAL;
  const reprioCost   = [50,50,100,100,175,175,250,250][rankIdx]||50;

  // ── Desk unlock helper ──
  const unlockDesk = useCallback((id) => {
    setUnlockedDesk(prev => prev.includes(id) ? prev : [...prev, id]);
  }, []);

  const buildAgenda = useCallback((done, active, level) => {
    // As Gerry rises, the agenda should feel appropriate — no rank 1 schemes at rank 7
    // Floor: don't show schemes more than 3 ranks below current level
    const minFloor = Math.max(1, level - 3);
    const pool = SCHEMES.filter(s =>
      s.minLevel <= level &&
      s.minLevel >= minFloor &&
      !done.includes(s.id) &&
      !active.find(a => a.id === s.id)
    );
    // Safety: if filtered pool is too small, widen the floor
    const safePool = pool.length >= AGENDA_SIZE
      ? pool
      : SCHEMES.filter(s => s.minLevel <= level && !done.includes(s.id) && !active.find(a => a.id === s.id));
    setAgenda(shuffle(safePool).slice(0, AGENDA_SIZE));
    setAgendaFlavor(AGENDA_FLAVOR[Math.floor(Math.random()*AGENDA_FLAVOR.length)]);
  }, []);

  const getNextEvent = useCallback((seen) => {
    // Filter by minRank if set, and exclude already seen
    const eligible = ALL_EVENTS.filter(e =>
      !seen.includes(e.id) &&
      (e.minRank === undefined || e.minRank <= rankIdx)
    );
    // Fallback: any unseen event if no rank-eligible ones
    const fallback = ALL_EVENTS.filter(e => !seen.includes(e.id));
    const pool = eligible.length ? eligible : fallback;
    return pool.length ? shuffle(pool)[0] : ALL_EVENTS[Math.floor(Math.random()*ALL_EVENTS.length)];
  }, [rankIdx]);

  useEffect(() => { if (screen === "game") { buildAgenda([],[],1); setTimeout(()=>setShowMemo(true),900); } }, [screen]);

  // Rank-based desk unlocks
  useEffect(() => {
    if (rankIdx >= 1) { unlockDesk("plant"); unlockDesk("teamphoto"); }
    if (rankIdx >= 2) { unlockDesk("polo2"); unlockDesk("leadership"); }
    if (rankIdx >= 3) { unlockDesk("pen"); }
    if (rankIdx >= 4) { unlockDesk("parachute"); }
  }, [rankIdx]);

  // Tick
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setActiveTasks(prev => prev.map(t => ({...t, elapsed: Math.min(t.elapsed+0.1, t.duration)})));
    }, 100);
    return () => clearInterval(tickRef.current);
  }, []);

  // Complete tasks
  useEffect(() => {
    const done = activeTasks.filter(t => t.elapsed >= t.duration);
    if (!done.length) return;
    done.forEach(t => {
      const isAI = AI_IDS.includes(t.id);
      const tier = opticsBonus(t.cost);
      const o    = Math.round(t.baseOptics * opticsMult * tier * (isAI?aiBonus:1) * (1+prestige*0.15));
      setRankOptics(prev => prev+o);
      setTotalOptics(prev => prev+o);
      setDoneIds(prev => { const newDone = prev.includes(t.id) ? prev : [...prev, t.id]; return newDone; });
      const newDone = [...doneIds, t.id];
      setMorale(prev => {
        const drained = Math.max(0, prev - Math.floor(Math.random()*4+1));
        // Safety net: morale never permanently locks below 15 - team always has some spirit
        return Math.max(drained, drained === 0 ? 10 : drained);
      });
      if (t.text.toLowerCase().includes("reorg")) setReorgCount(r=>r+1);
      // Desk: award if Beardogg scheme
      if ([117,115,125,126,130].includes(t.id)) unlockDesk("award");
      if (t.id === 131) unlockDesk("portrait");
      if ([14,3].some(id => t.id === id)) unlockDesk("scot_note"); // scott event
      unlockDesk("mug"); // first completed scheme
      setAgenda(prev => {
        const kept = prev.filter(s => s.id !== t.id);
        const floorLvl = Math.max(1, effectiveLvl - 3);
          const pool = SCHEMES.filter(s => s.minLevel<=effectiveLvl && s.minLevel>=floorLvl && !newDone.includes(s.id) && !activeTasks.filter(a=>a.elapsed<a.duration&&a.id!==t.id).find(a=>a.id===s.id) && !kept.find(k=>k.id===s.id) && s.id!==t.id);
          const safeReplPool = pool.length > 0 ? pool : SCHEMES.filter(s => s.minLevel<=effectiveLvl && !newDone.includes(s.id) && !activeTasks.filter(a=>a.elapsed<a.duration&&a.id!==t.id).find(a=>a.id===s.id) && !kept.find(k=>k.id===s.id) && s.id!==t.id);
        const rep = shuffle(safeReplPool)[0];
        return rep ? [...kept, rep].slice(0, AGENDA_SIZE) : kept.slice(0, AGENDA_SIZE);
      });
      showToast(`${t.emoji} +${o} Optics`);
      if (Math.random()<0.25 && !event && !hendersonEvent) {
        setTimeout(() => {
          setEvent(cur => { if (cur) return cur; const next=getNextEvent(seenEventIds); setSeenEventIds(s=>[...s, next.id]); return next; });
        }, 2000);
      }
    });
    setActiveTasks(prev => prev.filter(t => t.elapsed < t.duration));
  }, [activeTasks]);

  // Rank up
  useEffect(() => {
    if (!nextRank || rankOptics < rankTarget) return;
    if (moraleGated) {
      if (!moraleGateFired) { setMoraleGateFired(true); showToast(`⚠️ The Board won't promote you into this mess. Boost morale above ${MORALE_PROMOTION_GATE}%.`); }
      return;
    }
    setMoraleGateFired(false);
    const newIdx  = Math.min(rankIdx+1, RANKS.length-1);
    const newRank = RANKS[newIdx];
    const reward  = RANK_SOUL_REWARDS[newIdx]||0;
    setRankIdx(newIdx); setRankOptics(0);
    setSouls(prev => prev+reward);
    setRankUpData({rank:newRank, soulsReward:reward});
    setTimeout(()=>buildAgenda(doneIds, activeTasks, ownedPerks.includes(3)?newIdx+2:newIdx+1), 50);
    const hEvent = HENDERSON_EVENTS.find(e => e.rankIdx===newIdx && !triggeredH.includes(newIdx));
    if (hEvent) { setTriggeredH(prev=>[...prev,newIdx]); setTimeout(()=>setHendersonEvent(hEvent), 3200); }
    // Guaranteed nephew event at Director (rank index 3)
    if (newIdx === 3 && !seenEventIds.includes(27)) {
      const nephewEvent = ALL_EVENTS.find(e => e.id === 27);
      if (nephewEvent) {
        setTimeout(() => {
          setEvent(cur => {
            if (cur) {
              // Henderson still open — try again in 10 more seconds
              setTimeout(() => setEvent(c2 => { if (c2) return c2; setSeenEventIds(s=>[...s, 27]); return nephewEvent; }), 10000);
              return cur;
            }
            setSeenEventIds(s=>[...s, 27]);
            return nephewEvent;
          });
        }, 15000);
      }
    }
  }, [rankOptics, moraleGated]);

  useEffect(() => {
    if (moraleGated && moraleGateFired && morale >= MORALE_PROMOTION_GATE) setMoraleGateFired(false);
  }, [morale]);

  // Recharge
  useEffect(() => {
    rechargeRef.current = setInterval(() => {
      const remaining = timeUntilRecharge(lastRecharge, rechargeInt);
      setRechargeTimer(remaining);
      if (!remaining) { setSouls(prev=>prev+rechargeAmt); setLastRecharge(Date.now()); showToast(`⚡ +${rechargeAmt} 💀 recharged`); }
    }, 1000);
    return () => clearInterval(rechargeRef.current);
  }, [lastRecharge, rechargeInt, rechargeAmt]);

  // ── Henderson level 5: fire crisis modal once ──
  useEffect(() => {
    if (hendersonLevel >= 5 && !crisisResolved && !showCrisisModal) {
      setShowCrisisModal(true);
    }
  }, [hendersonLevel]);

  // ── Henderson demotion timer ──
  useEffect(() => {
    if (hendersonAtMax === null) return;
    const check = setInterval(() => {
      const elapsed = (Date.now() - hendersonAtMax) / 1000;
      if (elapsed >= HENDERSON_DEMOTION_SECONDS) {
        // Trigger demotion with full scene
        const newIdx = Math.max(0, rankIdx - 1);
        setRankIdx(newIdx);
        setRankOptics(0);
        setHendersonLevel(3); // Henderson resets to Building a Case — never goes away
        setHendersonAtMax(null);
        setCrisisResolved(false); // crisis can fire again if they climb back to 5
        setMorale(p => Math.min(100, p + 20)); // team exhales
        // Show demotion scene
        setEvent({
          id: 9999,
          emoji: "⚖️",
          text: HENDERSON_CRISIS.demotion.title,
          sub: HENDERSON_CRISIS.demotion.flavor,
          options: ["Take the demotion. Regroup.", "Gerry considers resigning. Decides not to."],
          outcomes: [
            { souls: 0, optics: 0, msg: "Gerry is now a " + (RANKS[newIdx]?.title||"lower rank") + ". The office is quieter. Henderson is still here. The notebook is still open. It has a new section now. The new section is labeled: 'Post-Board Actions.'" },
            { souls: 200, optics: 0, msg: "Gerry stays. Of course Gerry stays. Scott hears Gerry is staying. From his car. Texts Darrell: 'of course.' Darrell: 'yeah.' Henderson: already knew." },
          ],
        });
      }
    }, 1000);
    return () => clearInterval(check);
  }, [hendersonAtMax, rankIdx]);

  // ── Henderson random escalation ──
  useEffect(() => {
    if (screen !== "game") return;
    const escalate = setInterval(() => {
      // Every 4 minutes there's a small chance Henderson escalates on his own
      if (Math.random() < 0.04) {
        setHendersonLevel(prev => {
          // Random escalation caps at 4 — reaching level 5 requires deliberate bad choices
          const next = Math.min(4, prev + 1);
          if (next > prev) showToast("🧾 Henderson has escalated. The notebook is getting thicker.", 5500);
          return next;
        });
      }
    }, 240000);
    return () => clearInterval(escalate);
  }, [screen]);

  const appeaseHenderson = (appeasement) => {
    if (souls < appeasement.cost) return showToast("💀 Not enough Souls. Henderson is unimpressed.", 5000);
    if (appeaseCooldowns[appeasement.id] && Date.now() < appeaseCooldowns[appeasement.id]) {
      return showToast("⏳ Gerry just did this. Henderson has a memory. The memory is very organized.", 5000);
    }
    setSouls(p => p - appeasement.cost);
    const nextLevel = Math.max(1, hendersonLevel - appeasement.drop);
    setHendersonLevel(nextLevel);
    setHendersonAtMax(null);
    const moraleGain = appeasement.id === "promote" ? 16 : appeasement.id === "settle" ? 14 : 10;
    setMorale(p => Math.min(100, p + moraleGain));
    setAppeaseCooldowns(p => ({...p, [appeasement.id]: Date.now() + appeasement.cooldown * 1000}));
    const levelDesc = HENDERSON_LEVELS[Math.max(0, nextLevel - 1)];
    setEventResult({
      msg: appeasement.story || "Henderson acknowledges the gesture. The notebook stays open.",
      souls: 0,
      optics: 0,
      moraleBoost: moraleGain,
      hendersonNote: `Henderson is now: ${levelDesc.emoji} ${levelDesc.label}. The notebook is still open.`,
    });
  };


  useEffect(() => {
    if (screen !== "game") return;
    const msgs = [
      // LINDA
      `😢 Linda has made everyone a ceramic dish. They are hand-glazed. Darrell's is blue. He is keeping it.`,
      `😢 Linda cried during the fire drill. Not because of the drill. Just timing.`,
      `😢 Linda has been here eleven years. Today she found a Post-it she wrote in year one. It said 'hang in there.' She is crying but in a productive way.`,
      `😢 Linda brought in homemade jam for the office. Every flavor. Labeled by hand. Casey has eaten all of hers. This is the most Casey has felt at peace in months.`,
      `😢 Linda made handmade cards for everyone's work anniversaries. Yours was technically accurate but somehow felt like a warning.`,
      `😢 Linda cried when the new coffee machine arrived. Happy tears. Scott: 'The good kind.' He went back to his documentary.`,
      `😢 Linda has knitted something for the new intern. The intern does not know what it is. Neither does Linda, technically. It is abstract. It is made with love.`,
      `😢 Linda organized a birthday card for someone who had already left the company six months ago. She mailed it anyway. To their home address. Scott: 'That tracks.'`,
      `😢 Linda found the office plant dead this morning. She held a small moment of silence. Darrell participated. Henderson bowed his head slightly. Nobody acknowledged it out loud.`,
      `😢 Linda has started making a ceramic bowl for every person who quits. She has a kiln at home now. Darrell: 'She has a kiln.'`,
      // CASEY
      `🤌 Casey has updated her resignation letter. It is now 14 pages. Scott proofread page 12. 'That's the best page,' he said.`,
      `🤌 Casey is on her third iced coffee. This is a normal Tuesday for Casey. Casey is fine. Casey is absolutely fine.`,
      `🤌 Casey has been offered the same job she almost left for three times. She stays. The dental is exceptional. She has mentioned the dental.`,
      `🤌 Casey reorganized the entire project timeline in 40 minutes while everyone else was in a meeting about having meetings. She did not attend the meeting.`,
      `🤌 Casey's resignation letter has been cited by three employment lawyers. She has not met them. They found it online. Someone posted it anonymously. It has 4,200 upvotes.`,
      `🤌 Casey has declined to explain what she does on weekends. This is the right call. Nobody here deserves to know. It is clearly excellent.`,
      `🤌 Casey updated her LinkedIn. Changed her title from 'Project Manager' to 'Project Manager (unfortunately).' Changed it back four minutes later. Screenshot exists.`,
      `🤌 Casey delivered the Q3 deck in two hours. She had allotted four. She used the remaining two to start a sourdough starter. It is thriving.`,
      `🤌 Casey sent one email today. It solved three problems and preemptively answered two questions nobody had asked yet. She has been gone since noon.`,
      `🤌 Casey told JJ his framework was 'a document.' JJ asked what that meant. Casey said: 'It is a document, JJ.' Henderson wrote this down.`,
      // SCOTT
      `🌿 Scott arrived at 10. It is now 1:47pm. He has solved the infrastructure problem, filed the Q4 report, and is watching something about the Bermuda Triangle.`,
      `🌿 Scott left a snack on Casey's desk. No note. Casey knows it was Scott. Everyone knows it was Scott. This is how Scott communicates care.`,
      `🌿 Scott answered a question in the standup that nobody had asked yet. Then answered it again, better. Then left at 2.`,
      `🌿 Scott's out-of-office message says: 'Back on [date]. If urgent, it probably isn't.' He has used this message for four years. Nobody has ever pushed back on it.`,
      `🌿 Scott watched a documentary about ancient astronauts for the third time this week. He has notes. The notes are better than most strategy decks in this building.`,
      `🌿 Scott has not attended a meeting before 10:30am in three years. His contract has a clause. The clause is real. Nobody knows exactly what it says. Scott knows what it says.`,
      `🌿 Scott texted the group chat a single link. No context. The link resolved the budget crisis. He then went back to watching a documentary about the Nazca lines.`,
      `🌿 Scott has been asked to mentor the new hire. Scott agreed. Their first session was 12 minutes. The new hire described it as 'the most valuable 12 minutes of my career.'`,
      `🌿 Scott's desk has seven kinds of snacks. They are organized by category. There is a small laminated label system. Nobody has ever commented on it. Nobody would dare.`,
      `🌿 Scott heard about the reorg from his car. Texted Darrell: 'called it in march.' Darrell: 'february actually.' Scott: 'fair.'`,
      `🌿 Scott is watching Ancient Aliens. He is also on the board call. He has not missed a board question. He answered three of them. Nobody knows he is watching Ancient Aliens.`,
      // DARRELL
      `🪨 Darrell said one sentence in the all-hands. Two people immediately checked their LinkedIn.`,
      `🪨 Darrell has a new homebrew. It is a saison. He described it as 'dry and aggressive.' This could be about the beer or about the workplace. Both apply.`,
      `🪨 Darrell brought in a bottle of his latest homebrew for Scott. Left it on his desk. No note. Scott texted: 'this is good.' Darrell: 'yeah.'`,
      `🪨 Darrell has annotated the org chart napkin six times. The current version has footnotes. The footnotes have asterisks. The asterisks reference events that haven't happened yet.`,
      `🪨 Darrell has been at the same desk for seven years. The desk knows things. Darrell knows things. The desk and Darrell have an understanding.`,
      `🪨 Darrell's homebrew won a local competition last weekend. He mentioned it once. Nobody asked a follow-up question. He mentioned it was a saison. That was it.`,
      `🪨 Darrell watched the all-hands announcement without expression. Then said: 'Hm.' Walked to his desk. Nobody asked what 'hm' meant. Everyone knew what 'hm' meant.`,
      `🪨 Darrell has been offered a promotion three times. He has said 'I'm good' three times. This is either very zen or very tactical. Possibly both.`,
      `🪨 Darrell looked at the new mission statement for exactly four seconds. Folded a napkin. Put it in his pocket. It joined the others.`,
      `🪨 Darrell brewed a stout he named 'Pinnacle Porter.' The label has a small illustration of the office building on fire. He sells it at the farmer's market on weekends.`,
      // BEARDOGG
      `🐕 Beardogg has forwarded Scott's work to the client with his name in the subject line. The client replied: 'Great work, Brad.' Beardogg: 'Thanks.'`,
      `🐕 Beardogg updated his handicap on LinkUp. It is now 13. He has also added 'AI Thought Leader' to his bio. Darrell read the bio. Said: 'Thought leader.'`,
      `🐕 Beardogg's dog Shotgun is wearing a tiny polo shirt in his LinkUp profile photo. Gerry has commented 'LMAO legend 🐶.' JJ liked it within 90 seconds.`,
      `🐕 Beardogg has called a 'quick sync' that is now in its 47th minute. He does not know what the sync is about. He scheduled it on instinct.`,
      `🐕 Beardogg is in a fantasy football league with three clients and Douglas Pinnacle's son. He refers to this as 'stakeholder relationship management.'`,
      `🐕 Beardogg bought everyone donuts. This is the most work Beardogg has done this week. The donuts are excellent. Scott took two. Left at 2.`,
      `🐕 Beardogg has described himself as 'technical' in a meeting. Darrell looked up from his notebook. Wrote something. Looked back down.`,
      `🐕 Beardogg's expense report has a line item labeled 'golf: strategic.' Henderson has noted this. The word 'strategic' is circled. Twice.`,
      `🐕 Beardogg texted Gerry at 7am about a golf tee time this weekend. Texted Gerry at 7:15 about the project that was due yesterday. Order noted.`,
      // BITSY
      `🌅 Bitsy has renamed the conference rooms. They are now called Clarity, Synergy, Momentum, and Vibe. Darrell has begun calling them Rooms 1, 2, 3, and 4.`,
      `🌅 Bitsy has introduced 'silent Wednesdays.' Nobody is silent. Bitsy is silent. Bitsy has AirPods in and is watching something about crystals.`,
      `🌅 Bitsy has ordered a second neon sign. This one says 'GROWTH.' Darrell: 'Two neons.' He predicted this in February.`,
      `🌅 Bitsy has suggested the team do a 'vision board workshop.' The workshop is during lunch. Attendance is mandatory. The vision boards will be displayed in the hallway.`,
      `🌅 Bitsy has a new blazer with fringe on the sleeves. It is technically fine. It is technically okay. Casey has looked at it once and then very deliberately looked away.`,
      `🌅 Bitsy has rebranded the bathroom. It is now 'The Refresh Zone.' There is a diffuser. Darrell: 'I know what a bathroom is.'`,
      `🌅 Bitsy has sent a 'good vibes only' company-wide Ping. Henderson has filed it. Not as an exhibit. He just finds it genuinely baffling.`,
      `🌅 Bitsy wore a blazer with cartoon clouds on it to the board presentation. The board did not comment. Darrell did not comment. The clouds were very large.`,
      `🌅 Bitsy has proposed a 'gratitude wall' in the Collab Kitchen. She has already added seven items. Five are about herself. Two are about the coffee machine.`,
      `🌅 Bitsy's desk has three plants, two crystals, and a motivational poster that says 'You Are The CEO of Your Own Energy.' Casey: 'I have questions about that syntax.'`,
      // JJ
      `😐 JJ posted on LinkUp at 8:02am. He replied to his own post at 8:06am with a 'follow-up thought.' He replied again at 8:09am with 'building on this.'`,
      `😐 JJ has raised his hand in three consecutive meetings without knowing the answer. He provides the answer anyway. The answer is always a restatement of the question.`,
      `😐 JJ has described himself as 'low-key passionate' in a meeting. Casey wrote this down. It is now on page 14 of the resignation letter. The page is titled 'Selected Phrases.'`,
      `😐 JJ has sent a Ping that says 'just looping you in!' You are now in twelve threads you did not need to be in.`,
      `😐 JJ has created a personal 'brand deck.' It is 22 slides. It includes a slide titled 'My Core Values.' One of his core values is 'visibility.'`,
      `😐 JJ has 'liked' every post Gerry has made this month. His streak is unbroken. Casey has a spreadsheet tracking the streak. There is a graph.`,
      `😐 JJ has volunteered to 'own the narrative' on a project he has not been involved in. Scott: 'JJ has not been involved in this.' JJ: 'I can get up to speed.' Scott: 'okay.'`,
      `😐 JJ sent a follow-up email to his own follow-up email. The second follow-up asks if the first follow-up was received. Casey: 'This is a new genre.'`,
      `😐 JJ has asked Gerry for a 'quick coffee chat.' The coffee chat is 45 minutes. It is about JJ's career trajectory. Gerry has said he sees 'real potential.' JJ has updated his bio.`,
      `😐 JJ's new LinkUp bio says 'Trusted advisor to leadership.' Scott reads it from his car. Texts Darrell: 'trusted advisor.' Darrell: 'saw it.'`,
      // HENDERSON
      `🧾 Henderson has arrived. Henderson has his notebook. Henderson has a second notebook. This is new.`,
      `🧾 Henderson asked a question in the quarterly review that technically was about projections but was not about projections. Darrell watched this happen. Wrote nothing. Didn't need to.`,
      `🧾 Henderson's filing system now has a sub-tab labeled 'sub-tab.' Darrell found out about this. Said: 'Recursive.' He means this as a compliment. To Henderson.`,
      `🧾 Henderson ate his lunch at his desk while reviewing documents. His lunch was very organized. The documents were very organized. Everything Henderson does is organized.`,
      `🧾 Henderson has connected with Jamie on LinkUp. Gerry has seen this. Gerry has not said anything. Gerry's hands are doing a thing they do when Gerry is worried.`,
      `🧾 Henderson made a copy of something before anyone asked him to. The copy is filed. The copy has a cover sheet. The cover sheet has a date.`,
      `🧾 Henderson attended the optional company picnic. Henderson brought a casserole. Henderson photographed the seating arrangement. The seating arrangement is now Exhibit H.`,
      `🧾 Henderson has submitted a vacation request. The destination is unknown. He will have email access. He always has email access.`,
      `🧾 Henderson's notebook has a color-coded tab system. One color is for general observations. One is for meeting notes. One color has never been explained. Nobody has asked.`,
      `🧾 Henderson completed the anonymous culture survey. It was not anonymous to Henderson. Henderson footnoted his answers. The footnotes are longer than the answers.`,
      // JAMIE
      `📰 Jamie has filed another public records request. It is her fourth this quarter. Gerald Sr.'s name appears in all four. The trucks are still running.`,
      `📰 Jamie was seen in the lobby photographing the art on the wall. 'Blue Disruption No. 4.' She photographed the frame. Specifically the corner of the frame. The price tag is still on it. $680.`,
      `📰 Jamie has published part three of the investigation. Part three is about the side hustle permits. Gerald Sr. has not commented. The trucks are still running.`,
      `📰 Jamie attended the community service day. Her camera was already out when Gerry arrived. She has since filed four exhibits. The kale in the garden is in exhibit three.`,
      `📰 Jamie and Henderson had coffee. Henderson brought documents. Jamie brought a recorder. Both were aware of both. Darrell heard about this. Said: 'Yeah.'`,
      `📰 Jamie's editor has approved six-part investigative series. She already has five parts written. She is waiting on one document. Henderson has the document.`,
      // TYLER (the nephew)
      // TYLER: `🎓 Tyler has arrived. Tyler has a BMW. Tyler has a parking spot. The parking spot is better than Beardogg's. Beardogg has noted this. On LinkUp.`,
      // TYLER: `🎓 Tyler has asked what 'asynchronous' means in a meeting. Beardogg explained it incorrectly. Scott, not present, somehow already knew this would happen.`,
      // TYLER: `🎓 Tyler has updated his LinkUp to say 'Innovation Liaison | Visionary Thinker | Pinnacle Solutions Group.' He has been here for nine days.`,
      // TYLER: `🎓 Tyler asked to be added to all meetings 'just to learn.' He is now in 24 recurring meetings. He has spoken in one. He said 'totally' and nodded.`,
      // TYLER: `🎓 Tyler expensed lunch for six people under 'team building.' Two of them were his college friends. None of them work here.`,
      // TYLER: `🎓 Tyler sent a Ping at 11:45pm asking if anyone wanted to 'jam on ideas.' Nobody responded. JJ responded at 11:46pm. They are now in a document together.`,
      // RANDOM OFFICE HORRORS (inspired by real stories, cast filtered)
      `📋 The printer has jammed for the fourth time today. Linda is handling it. Linda always handles it. Nobody knows how Linda handles it. Linda has a system.`,
      `📋 The company has introduced a 'happiness metric.' It is measured via a weekly smiley face survey. Henderson has given it a neutral face every week. Every. Week.`,
      `📋 A mandatory fun event has been scheduled for Saturday at 8am. It is a 5K. Seven people have signed up. Two of them did it by accident.`,
      `📋 The kitchen fridge has been cleaned out. Linda's clearly labeled lunch was included. Linda has not said anything about this. Linda will never say anything about this.`,
      `📋 The company has banned personal phone calls at desks. Scott has renegotiated his contract to include a 'vehicle communication clause.' He calls from his car. As always.`,
      `📋 The office thermostat has been locked. It is set to 61 degrees. Management has declined to provide the code. Darrell has three sweaters at his desk. He planned ahead.`,
      `📋 A suggestion box has been installed. Henderson has submitted six suggestions. Each is three pages. Each has a cover letter.`,
      `📋 The new hot-desking policy starts Monday. Darrell has already identified his corner. He did not write his name on it. He does not need to. The corner knows.`,
      `📋 An all-company email was sent about 'email etiquette.' The email was 1,400 words. It had four attachments. Scott did not open it. He already knows etiquette.`,
      `📋 The office has introduced a clean desk policy. Darrell's napkin collection is in a locked drawer. The org charts are still in there. The drawer is full.`,
      `📋 A team-building escape room has been booked. Nobody has been told how many people will attend. Beardogg has already googled the solutions. He considers this leadership.`,
      `📋 The company has announced 'no meeting Fridays.' This lasted one Friday. On the second Friday a mandatory all-hands was scheduled 'as an exception.'`,
      `📋 The new employee handbook is 84 pages. Linda has read all 84 pages. Linda has highlighted portions. Linda has Post-its on the Post-its.`,
      `📋 An anonymous feedback form was distributed. The results have not been shared. They will never be shared. Henderson made a personal copy before submitting.`,
      // TYLER: `📋 The office has a ping-pong table. It has been used twice. Once by Tyler. Once by Bitsy, alone, against herself. She won.`,
      `📋 A mandatory training on 'unconscious bias' was scheduled for 4:30 on a Friday. Scott was already in his car. He attended from the parking lot. He passed.`,
      `📋 There is a new office dog policy. Dogs are now welcome on Tuesdays. Beardogg has brought Shotgun every Tuesday. Shotgun has been named Employee of the Month.`,
      `📋 The company has ordered branded merch for the team. It arrives. It is the wrong size for everyone. JJ posts a photo wearing his anyway. Tags Gerry.`,
      `📋 The WiFi has been down for three hours. Beardogg has used this to 'connect offline with stakeholders.' Scott drove home and worked from there. His output is unchanged.`,
      `📋 A new KPI dashboard has been launched. It has 47 metrics. Three of them measure the same thing. One of them measures Bitsy's calendar 'vibrancy score.'`,
      `📋 The elevator has been playing the same four songs on rotation since 2019. Darrell has never commented on this. He has folded one napkin per song.`,
      `📋 A 'culture committee' has been formed. JJ volunteered immediately. JJ is the only volunteer. JJ is now the committee. The committee has a logo. JJ designed it. It includes JJ.`,
      `📋 The company has issued new branded lanyards. They say 'TEAM PINNACLE.' Darrell has put his in a drawer. His badge is now attached with a paper clip.`,
      `📋 The parking lot has been reorganized. Reserved spots now require a QR scan. Henderson scanned his on day one. Filed the confirmation email. Just in case.`,
      `📋 There is a new rule about plants on desks. No more than two per employee. Scott has zero. Bitsy has eleven. This has not been addressed.`,
      `📋 The company has sponsored a charity golf tournament. Beardogg signed up in under four seconds. His registration listed his title as 'Chief Strategy Officer.' He is not Chief Strategy Officer.`,
      `📋 Someone microwaved fish in the Collab Kitchen. Linda cried. Darrell said: 'Again.' He has a note of every time this has happened. He has never said who it is. He knows who it is.`,
      `📋 A new vendor has been selected for coffee. The new coffee is worse. This was the outcome of a three-month procurement process. Scott has started bringing his own.`,
      `📋 A team photo has been taken. You are front and center. Beardogg is also front and center. Scott is not visible. Scott is technically in the photo. He is behind the plant.`,
      // TYLER: `📋 Tyler has sent a company-wide Ping asking for 'inspo.' Nobody has responded. JJ has responded. JJ's response has been ignored. JJ has sent a follow-up.`,
      `📋 'Blue Disruption No. 4' is now in the main hallway. The price tag is still on the frame. Darrell passes it every day. Has never looked at it directly. Has looked at the price tag. Once.`,
      `📋 An employee has been caught napping in the 'quiet focus pod.' The pod was designed for this. HR still sent a message about it. Henderson has filed the message.`,
      `📋 There is a new onboarding checklist. It has 34 steps. Step 22 requires sign-off from a manager. The manager is never available. Everyone skips step 22. Nobody knows what step 22 is.`,
      `📋 The company has introduced a 'meeting score' system. All meetings are rated 1-5. All meetings are given 5s by everyone. Except Henderson. Henderson gives accurate scores.`,
      `📋 A fire drill was held at 11:58am. Scott was already in his car. He was not counted in the drill. He texted his attendance from the parking lot. HR: 'That's not how drills work.' Scott: 'okay.'`,
      `📋 JJ has started ending emails with 'Let's build something great.' Casey has started ending her resignation letter drafts with 'Let's not.'`,
      `📋 Beardogg has given a toast at the office happy hour. The toast was three minutes. It was about himself. He used the word 'journey.' He used it four times.`,
      `📋 The new printer requires a five-step authentication process. Linda has memorized all five steps. She helps everyone else. She has helped the same people four hundred times.`,
      `📋 An email went out about the retirement of a longtime vendor. Nobody knew what this vendor did. The email had a 'moment of silence' request. Henderson observed it.`,
      `📋 The office is out of coffee pods. This was discovered at 8:03am. Casey declared it a crisis. Scott, arriving at 10, brought a French press. He did not share it. That is fair.`,
      `📋 A company awards ceremony is scheduled. You have pre-selected the winners. Henderson has filed the selection criteria. Or lack thereof.`,
      // TYLER: `📋 Tyler has asked for a corner office. He has been here for three weeks. Casey: 'No.' Tyler: 'Is that the final answer?' Casey opened the resignation letter. Added a paragraph.`,
      `📋 Darrell's homebrew 'Redundancy Red Ale' placed second at the regional craft beer festival. He mentioned it once. At his desk. To nobody in particular. That was enough.`,
      `📋 The company has engaged a 'Chief Happiness Officer.' Nobody knows where their office is. Their email bounces. Their title is on the website. Scott: 'Classic.'`,
      `📋 A new dress code memo has been distributed. It is four pages. Page three explicitly prohibits 'footwear that communicates leisure.' Beardogg is wearing boat shoes. Again.`,
      `📋 Henderson's car was detailed this week. The crew reported finding organized folders in the back seat. Labeled. With dates. They did not elaborate. They did not need to.`,
      `📋 Bitsy has installed an 'inspiration jar' near the entrance. Employees are encouraged to leave positive notes. Henderson left a note. It cited two statutes. Bitsy removed it.`,
      `📋 The company has a new org chart. It is displayed in the lobby. Darrell looked at it for six seconds. Said: 'Different from mine.' His is more accurate.`,
      `📋 An employee wellness survey was sent. Scott completed it in 90 seconds. His responses were detailed, accurate, and actionable. They will not be acted upon.`,
      `📋 Beardogg has created a WhatsApp group for 'the boys.' You are in it. Douglas Pinnacle's son is in it. There is a lot of golf emoji content.`,
      `📋 The office has run out of pens. Nobody knows how. Linda has counted: there were 400 pens in January. It is July. There are four pens. Darrell has not commented. He uses a pencil.`,
      `📋 The Q2 all-hands ran 40 minutes over. Scott had left at the 15-minute mark. His callback summary was more accurate than the meeting notes. He submitted it from his car.`,
      `📋 Casey has been offered another job. She declined. The dental here is exceptional. She has mentioned this to Darrell. Darrell: 'The dental is exceptional.' He agrees. He also stays for the dental.`,
      `📋 The company has hired a 'Director of Remote Culture.' The director works remotely. Nobody has met the director. The director sends a weekly newsletter. Henderson replies to every one.`,
      `📋 Bitsy has proposed mood lighting for the office. The proposal was 14 pages. It included a color theory section. Darrell read the color theory section. Said: 'Hm.' Darrell never says hm about things he finds credible.`,
      `📋 An anonymous source has told Jamie that the annual holiday party budget was cut by 60% but the executive retreat budget increased by 120%. The source provided a spreadsheet.`,
      `📋 Linda has sent a card to a vendor on their company's 20th anniversary. The card has a hand-stamped border. She found the company's founding date through research. Nobody asked her to do this.`,
      // TYLER: `📋 Tyler has introduced himself to Darrell for the third time. Darrell has been politely informative each time. Darrell knows exactly who Tyler is. Darrell has a napkin about Tyler.`,
      `📋 The company has banned the use of the word 'bandwidth' in emails. This was requested by Scott. In writing. With supporting arguments. It was approved immediately.`,
      `📋 JJ has started a 'thought leadership' newsletter. It goes out on Monday mornings. It has one subscriber. The subscriber is JJ. His open rate is 100%.`,
      `📋 Beardogg has introduced himself to a new client as 'the architect of our technical strategy.' Scott built the technical strategy. Scott is aware Beardogg said this. Scott has said nothing.`,
      `📋 Henderson drinks tea. Henderson has always drunk tea. Henderson's tea is the same brand every day. The brand is noted. The brand is a small clue about Henderson that nobody has followed up on.`,
      `📋 Linda has made jam favors for the company holiday party. Each jar has a hand-written label. Each label is different. Yours says: 'For your journey ahead.' This is somehow ominous.`,
      `📋 The company has started 'leadership shadowing.' Tyler has shadowed Gerry for two weeks. Tyler has not shadowed anyone in operations. Tyler has published a LinkedIn post about what he learned. It is about Gerry.`,
      `📋 Darrell has been approached about a VP role at a competitor. He declined. He has not mentioned this to anyone. Scott somehow knows. They have not discussed it.`,
      `📋 Casey's coffee order is complex. She remembers everyone else's. She has never been thanked for this. She does not require thanks. She requires a competent org and a living wage. She has the dental.`,
      `📋 The printer in the C-suite has run out of paper. Linda is the only one who knows where the paper is stored. She is in a meeting. The meeting has run 25 minutes over.`,
      `📋 Scott's desk plant has been alive for four years. He waters it once a week. He has never named it. He has referred to it as 'the plant.' The plant is thriving.`,
      `📋 Beardogg's golf scorecard from last Saturday is on his desk. Scott glanced at it. Texted Darrell: 'he shot a 96.' The handicap on his LinkUp says 13. Darrell: 'noted.'`,
      `📋 Henderson submitted a 12-page response to the employee handbook revision. The response included a table of contents. Casey read it. Said: 'He's not wrong.'`,
    ];
    // Tyler msgs only after rank 4
    const tylerMsgs = [
      `🎓 Tyler has arrived. Tyler has a BMW. Tyler has a parking spot. The parking spot is better than Beardogg's. Beardogg has noted this. On LinkUp.`,
      `🎓 Tyler has asked what 'asynchronous' means in a meeting. Beardogg explained it incorrectly. Scott already knew this would happen.`,
      `🎓 Tyler has updated his LinkUp to say 'Innovation Liaison | Visionary Thinker | Pinnacle Solutions Group.' He has been here for nine days.`,
      `🎓 Tyler asked to be added to all meetings 'just to learn.' He is now in 24 recurring meetings. He has spoken in one. He said 'totally' and nodded.`,
      `🎓 Tyler expensed lunch for six people under 'team building.' Two of them were his college friends. None of them work here.`,
      `📋 The office has a ping-pong table. It has been used twice. Once by Tyler. Once by Bitsy, alone, against herself. She won.`,
      `📋 Tyler has asked for a corner office. He has been here for three weeks. Casey: 'No.' Tyler: 'Is that the final answer?' Casey opened the resignation letter. Added a paragraph.`,
      `📋 Tyler has introduced himself to Darrell for the third time. Darrell knows exactly who Tyler is. He has a napkin about Tyler.`,
    ];
    const allMsgs = rankIdx >= 3 ? [...msgs, ...tylerMsgs] : msgs;
    const pick = () => allMsgs[Math.floor(Math.random()*allMsgs.length)];
    setNotification(pick());
    notifRef.current = setInterval(() => {
      setNotification(pick());
    }, 42000);
    return () => clearInterval(notifRef.current);
  }, [bossName, rank, screen]);

  const showToast = useCallback((msg, duration=3800) => {
    setToast(msg); setToastKey(k=>k+1);
    setTimeout(()=>setToast(null), duration);
  }, []);

  const startScheme = (s) => {
    if (activeTasks.length >= maxConc) return showToast(`📅 ${bossName} is at capacity.`);
    if (souls < s.cost) return showToast(`💀 Not enough Souls. Scott could solve this. Scott is not here.`);
    setSouls(prev => prev-s.cost);
    const task = {...s, baseOptics:s.optics, elapsed:0, duration:s.time*speedMult};
    setActiveTasks(prev => [...prev, task]);
    setAgenda(prev => {
      const kept = prev.filter(x => x.id !== s.id);
      const flrLvl = Math.max(1, effectiveLvl - 3);
      const basePool = SCHEMES.filter(sc => sc.minLevel<=effectiveLvl && sc.minLevel>=flrLvl && !doneIds.includes(sc.id) && ![...activeTasks,task].find(a=>a.id===sc.id) && !kept.find(k=>k.id===sc.id) && sc.id!==s.id);
      const pool = basePool.length > 0 ? basePool : SCHEMES.filter(sc => sc.minLevel<=effectiveLvl && !doneIds.includes(sc.id) && ![...activeTasks,task].find(a=>a.id===sc.id) && !kept.find(k=>k.id===sc.id) && sc.id!==s.id);
      const rep = shuffle(pool)[0];
      return rep ? [...kept, rep].slice(0, AGENDA_SIZE) : kept.slice(0, AGENDA_SIZE);
    });
    showToast(`${s.emoji} Initiated. −${s.cost} 💀`);
  };

  const reprioritize = () => {
    if (souls < reprioCost) return showToast(`💀 Not enough Souls. Even pivots cost something.`);
    setSouls(prev => prev-reprioCost);
    buildAgenda(doneIds, activeTasks, effectiveLvl);
    showToast(`🔀 ${REPRIORITIZE_FLAVOR[Math.floor(Math.random()*REPRIORITIZE_FLAVOR.length)]}`);
  };

  const buyPerk = (p) => {
    if (souls < p.cost) return;
    // Morale perks (pizza/wellness): repeatable, don't permanently lock
    if (p.moraleBoost) {
      const cdKey = `__perkcd_${p.id}`;
      const lastUsed = window[cdKey] || 0;
      const cooldown = p.id === 11 ? 300000 : 900000; // 5min pizza, 15min wellness
      if (ownedPerks.includes(p.id) && Date.now() - lastUsed < cooldown) {
        return showToast(`⏳ The team saw through the last one. Give it a few minutes.`);
      }
      window[cdKey] = Date.now();
      setSouls(prev => prev - p.cost);
      if (!ownedPerks.includes(p.id)) setOwnedPerks(prev => [...prev, p.id]);
      setMorale(prev => Math.min(100, prev + p.moraleBoost));
      showToast(`${p.icon} +${p.moraleBoost}% morale — ${bossName} briefly appears to care.`);
      return;
    }
    if (ownedPerks.includes(p.id)) return;
    setSouls(prev => prev - p.cost);
    setOwnedPerks(prev => [...prev, p.id]);
    showToast(`${p.icon} Unlocked: ${p.name}`);
  };

  const resolveEvent = (optIdx) => {
    if (!event) return;
    const outcome = event.outcomes?.[optIdx];
    if (outcome) {
      setSouls(prev => Math.max(0, prev+(outcome.souls||0)));
      // Rule: kind choices (moraleBoost or soul-costing) never award Optics
      const explicitBoost = outcome.moraleBoost || 0;
      const implicitBoost = (!explicitBoost && (outcome.souls||0) < 0) ? Math.floor(Math.random()*5+3) : 0;
      const totalBoost = explicitBoost + implicitBoost;
      const effectiveOptics = totalBoost > 0 ? 0 : (outcome.optics || 0);
      if (effectiveOptics > 0) {
        setRankOptics(prev => prev + effectiveOptics);
        setTotalOptics(prev => prev + effectiveOptics);
      }
      if (totalBoost > 0) {
        setMorale(prev => Math.min(100, prev + totalBoost));
        if (totalBoost >= 5) showToast(`💚 +${totalBoost}% morale — the team noticed.`);
      }
      setEventResult({...outcome, optics: effectiveOptics, moraleBoost: totalBoost});
    }
    setEvent(null);
  };

  const resolveHenderson = (optIdx) => {
    if (!hendersonEvent) return;
    const outcome = hendersonEvent.outcomes?.[optIdx]; if (!outcome) return;
    setSouls(prev => Math.max(0, prev+outcome.souls));
    const newLevel = Math.min(5, Math.max(1, outcome.henderson||1));
    setHendersonLevel(prev => {
      const next = Math.max(1, Math.min(5, prev + (newLevel - 1)));
      if (next >= 5) setHendersonAtMax(Date.now());
      else setHendersonAtMax(null);
      return next;
    });
    const moraleBoost = outcome.moraleWin ? Math.floor(Math.random()*8+5) : 0;
    if (moraleBoost > 0) { setMorale(prev => Math.min(100, prev+moraleBoost)); showToast(`📎 Henderson wins one. Team morale +${moraleBoost}%`, 5500); }
    setHendersonResult({msg:outcome.msg, souls:outcome.souls, henderson:outcome.henderson, moraleBoost, hendersonWins:outcome.moraleWin});
    setHendersonEvent(null);
  };

  const playMiniGame = (game) => {
    if (souls < game.cost) return showToast(`💀 Not enough Souls for that.`);
    setSouls(prev => prev-game.cost);
    setActiveGame(game);
  };

  const handleMiniGameResult = (won) => {
    if (!activeGame) return;
    const raw = won ? activeGame.winOptics : activeGame.loseOptics;
    const adj = Math.round(raw * opticsMult * (1+prestige*0.15));
    setRankOptics(prev => prev+adj);
    setTotalOptics(prev => prev+adj);
    showToast(`${won?"🎯":"💨"} +${adj} Optics`);
  };

  const deployHustle = (h, targetName) => {
    if (souls < h.cost) return showToast(`💀 Not enough Souls for this operation.`);
    setSouls(prev => prev - h.cost);
    const resultText = h.targets[targetName] || "Nothing notable happened. They weren't home.";
    let soulsGain = h.reward;
    let opticsGain = 0;
    let moraleGain = 0;
    let hendersonDrop = 0;
    let hendersonRise = false;
    let bonusNote = "";

    if (h.id === "dogwalk") {
      // Pure morale play — the team hears Gerald Sr.'s crew is doing something harmless
      moraleGain = Math.floor(Math.random() * 10) + 12; // +12 to +21%
      soulsGain = h.reward + 80;
      bonusNote = `+${moraleGain}% morale.`;
    }

    if (h.id === "pest") {
      // Intel hustle — generates Optics, chance to get Henderson dirt OR get caught
      soulsGain = h.reward + 50;
      if (targetName === "Henderson") {
        const caught = Math.random() < 0.4;
        if (!caught) {
          // Found something useful
          opticsGain = Math.floor(Math.random() * 100) + 80;
          hendersonDrop = 1;
          bonusNote = `🧾 Filed system photographed. +${opticsGain} Optics. Henderson drops 1 level. He has backups. But still.`;
        } else {
          // Henderson was watching
          hendersonRise = true;
          bonusNote = "⚠️ Henderson photographed the crew's plates before they entered. Exhibit EE. Henderson escalates.";
        }
      } else {
        opticsGain = Math.floor(Math.random() * 120) + 100;
        bonusNote = `+${opticsGain} Optics — the intel is in. Gerald Sr.'s crew sees everything.`;
        if (h.hendersonEvidence && Math.random() < 0.35) hendersonRise = true;
      }
    }

    if (h.id === "demo") {
      // High risk/reward — big Optics, Henderson escalation likely, but targeting Henderson directly is always a backfire
      opticsGain = Math.floor(Math.random() * 200) + 150;
      soulsGain = h.reward + 60;
      unlockDesk("hardhat");
      if (targetName === "Henderson") {
        // Henderson had the permits memorized. This backfires.
        hendersonRise = true;
        opticsGain = Math.floor(opticsGain * 0.4); // still some chaos optics
        bonusNote = `+${opticsGain} Optics — Henderson had the ordinance printed in advance. The crew is now Exhibit FF. Henderson escalates.`;
      } else {
        bonusNote = `+${opticsGain} Optics. Loud. Gerald Sr. handled the permits. Probably.`;
        if (h.hendersonEvidence && Math.random() < 0.65) hendersonRise = true;
      }
    }

    if (h.id === "landscape") {
      // Morale hustle — team sees something vaguely decent happening
      moraleGain = Math.floor(Math.random() * 10) + 12; // +12 to +21%
      soulsGain = h.reward + 20;
      bonusNote = `+${moraleGain}% morale. The flowers are real. The surveillance is also real.`;
    }

    if (h.id === "cleaning") {
      // Henderson-specific hustle — best chance of dropping Henderson's level
      soulsGain = h.reward + 25;
      if (targetName === "Henderson") {
        const success = Math.random() < 0.58;
        if (success) {
          hendersonDrop = 1;
          opticsGain = Math.floor(Math.random() * 100) + 80;
          bonusNote = `🗂️ Backup system found and photographed. +${opticsGain} Optics. Henderson drops 1 level. Second backup is at his mother's house.`;
        } else {
          hendersonRise = true;
          bonusNote = "⚠️ Henderson was watching. Crew is Exhibit EE. Invoice is Exhibit FF. Henderson escalates.";
        }
      } else {
        moraleGain = Math.floor(Math.random() * 8) + 10;
        bonusNote = `+${moraleGain}% morale. Linda found the thank-you note. Happy tears.`;
      }
    }

    if (h.id === "detail") {
      // Espionage hustle — targeting Henderson drops his level, others give big Optics/Souls
      soulsGain = h.reward + 80;
      if (targetName === "Henderson") {
        // The car is a goldmine — but Henderson sometimes notices
        const caught = Math.random() < 0.3;
        if (!caught) {
          hendersonDrop = 1;
          opticsGain = Math.floor(Math.random() * 160) + 140;
          bonusNote = `🧾 The dossier, the second notebook, the folder for Jamie — all photographed. +${opticsGain} Optics. Henderson drops 1 level. He has copies at home.`;
        } else {
          hendersonRise = true;
          opticsGain = Math.floor(Math.random() * 40) + 20;
          bonusNote = `⚠️ Henderson noticed. Receipt is Exhibit GG. Henderson escalates. The car looks great though.`;
        }
      } else if (targetName === "Scott") {
        // Scott's resignation letter in the car
        opticsGain = Math.floor(Math.random() * 100) + 80;
        bonusNote = `+${opticsGain} Optics — the crew read Scott's resignation letter. One of them updated their own resume in the parking lot. High praise.`;
      } else if (targetName === "Beardogg") {
        // Fantasy league intel + good vibes
        moraleGain = 8;
        soulsGain += 30;
        bonusNote = `+${moraleGain}% morale, +30 💀 bonus — Beardogg's car was immaculate. The crew rated it 5 stars. They also checked his fantasy lineup. He's winning.`;
      } else {
        opticsGain = Math.floor(Math.random() * 130) + 100;
        bonusNote = `+${opticsGain} Optics — the car contained things. Things have been noted.`;
      }
    }

    // Apply all effects
    setSouls(prev => prev + soulsGain);
    if (opticsGain > 0) { setRankOptics(prev => prev + opticsGain); setTotalOptics(prev => prev + opticsGain); }
    if (moraleGain > 0) setMorale(prev => Math.min(100, prev + moraleGain));
    if (hendersonDrop > 0) {
      setHendersonLevel(prev => Math.max(1, prev - hendersonDrop));
      setHendersonAtMax(null);
    }
    if (hendersonRise) {
      setHendersonLevel(prev => {
        const next = Math.min(5, prev + 1);
        if (next >= 5 && !hendersonAtMax) setHendersonAtMax(Date.now());
        return next;
      });
    }

    setHustleResult({
      hustle: h,
      target: targetName,
      text: resultText,
      soulsGain,
      opticsGain,
      moraleGain,
      hendersonDrop,
      hendersonRise,
      bonusNote,
    });
    setHustle(null);
  };

  const buyFromStore = (item) => {
    if (item.special === "recharge") { setSouls(prev=>prev+rechargeAmt); setLastRecharge(Date.now()); showToast(`⚡ +${rechargeAmt} 💀 instant recharge`); }
    else { const amt = item.souls||0; setSouls(prev=>prev+amt); showToast(`💀 +${amt.toLocaleString()} Souls deposited`); }
  };

  const [showParachute, setShowParachute] = useState(false);
  const [parachuteReady, setParachuteReady] = useState(false);

  const doPrestige = () => {
    setShowParachute(true);
setParachuteReady(false);
  };

  const claimMemo = () => {
    const memo = DAILY_MEMOS[Math.min((streak-1)%7,6)];
    setSouls(prev=>prev+memo.souls); setShowMemo(false);
    showToast(`💀 +${memo.souls} Souls from Finance`);
  };

  if (screen==="onboarding") return <OnboardingScreen onDone={()=>setScreen("name")} />;
  if (screen==="name")       return <NameScreen onSelect={(n)=>{setBossName(n);setScreen("gender");}} />;
  if (screen==="gender")     return <GenderScreen name={bossName} onSelect={(p)=>{setPronouns(p);setScreen("game");}} />;

  const TABS = [
    {k:"schemes",  l:"📋"},
    {k:"hustles",  l:"💼"},
    {k:"games",    l:"🎮"},
    {k:"desk",     l:"🖥️"},
    {k:"perks",    l:"🏆"},
    {k:"store",    l:"🏪"},
    {k:"profile",  l:"😈"},
  ];

  return (
    <div style={{ minHeight:"100vh", background:mood.bg, fontFamily:"Georgia,serif", color:"#f0e6d3", transition:"background 1s ease" }}>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}} @keyframes slideDown{from{opacity:0;transform:translateY(-16px)}to{opacity:1;transform:translateY(0)}} @keyframes tickerScroll{0%{transform:translateX(0)}100%{transform:translateX(calc(-100% - 100vw))}} @keyframes moraleFlick{0%,100%{opacity:1}50%{opacity:0.3}} @keyframes rechargeGlow{0%,100%{opacity:0.6}50%{opacity:1}} @keyframes popIn{0%{transform:scale(0.4);opacity:0}70%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}} @keyframes hPulse{0%,100%{border-color:rgba(255,45,85,0.2)}50%{border-color:rgba(255,45,85,0.5)}} @keyframes gateWarn{0%,100%{box-shadow:none}50%{box-shadow:0 0 16px rgba(255,45,85,0.4)}} @keyframes moneyFall{0%{transform:translateY(-60px) rotate(0deg) scale(1);opacity:1}100%{transform:translateY(110vh) rotate(720deg) scale(0.6);opacity:0}} @keyframes parachuteIn{0%{opacity:0;transform:scale(0.5)}100%{opacity:1;transform:scale(1)}} .sc:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(255,45,85,0.12)!important} .sc{transition:all 0.18s ease;cursor:pointer} .pk:hover{transform:translateY(-2px)} .pk{transition:all 0.18s ease} .tb{transition:all 0.2s ease} .mg:hover{transform:translateY(-2px)} .mg{transition:all 0.18s ease;cursor:pointer} ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#1a1a25;border-radius:99px}`}</style>

      {showMemo&&<DailyMemo name={bossName} streak={streak} onClaim={claimMemo} />}
      {rankUpData&&<RankUpModal rank={rankUpData.rank} soulsReward={rankUpData.soulsReward} onClose={()=>setRankUpData(null)} />}
      {eventResult&&<EventResult result={eventResult} onClose={()=>setEventResult(null)} />}
      {showParachute && (()=>{
        const emojis = ["💰","💸","🤑","💵","💴","💶","💷","🪙","💎","🏆","🥂","🛳️","🪂","✈️","🏖️"];
        const coins = Array.from({length:60}, (_,i) => ({
          id:i,
          emoji:emojis[i % emojis.length],
          left: Math.random()*100,
          delay: Math.random()*2,
          duration: 2 + Math.random()*1.5,
          size: 20 + Math.random()*28,
        }));
        return (
          <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.92)", overflow:"hidden", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
            {coins.map(c=>(
              <div key={c.id} style={{
                position:"absolute", top:-60, left:`${c.left}%`,
                fontSize:c.size, animation:`moneyFall ${c.duration}s ${c.delay}s ease-in forwards`,
                userSelect:"none", pointerEvents:"none",
              }}>{c.emoji}</div>
            ))}
            <div style={{ textAlign:"center", animation:"parachuteIn 0.5s ease", position:"relative", zIndex:1 }}>
              <div style={{ fontSize:80, marginBottom:16 }}>🪂</div>
              <div style={{ fontSize:28, fontWeight:"bold", color:"#ffd700", fontFamily:"Georgia,serif", marginBottom:8 }}>
                $47,000,000
              </div>
              <div style={{ fontSize:16, color:"#f0e6d3", fontFamily:"Georgia,serif", marginBottom:6 }}>
                {bossName} has taken the golden parachute.
              </div>
              <div style={{ fontSize:13, color:"#888", fontStyle:"italic", fontFamily:"Georgia,serif", marginBottom:20 }}>
                Henderson watches from the window. The office exhales.
              </div>
              {parachuteReady && (
                <button onClick={()=>{
                  setShowParachute(false); setParachuteReady(false);
                  setPrestige(p=>p+1); setRankOptics(0); setTotalOptics(0); setRankIdx(0);
                  setActiveTasks([]); setDoneIds([]); setMorale(100);
                  setEvent(null); setEventResult(null); setHendersonEvent(null); setHendersonResult(null);
                  setReorgCount(0); setSeenEventIds([]); setTriggeredH([]); setMoraleGateFired(false);
                  setSouls(prev => prev+500);
                  buildAgenda([],[],1);
                  showToast(`🪂 ${bossName} lands softly. +500 💀 severance. The office exhales.`);
                }} style={{ padding:"14px 40px", background:"linear-gradient(135deg,#ffd700,#ff9f0a)", border:"none", borderRadius:99, color:"#080810", fontFamily:"Georgia,serif", fontSize:16, fontWeight:"bold", cursor:"pointer", animation:"popIn 0.4s ease" }}>
                  Take the money
                </button>
              )}
            </div>
          </div>
        );
      })()}
      {showGerryProfile && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.96)", zIndex:996, display:"flex", alignItems:"center", justifyContent:"center", padding:20, overflowY:"auto" }}>
          <div style={{ background:"#0e0e18", border:"1px solid rgba(255,215,0,0.15)", borderRadius:20, padding:24, maxWidth:380, width:"100%", fontFamily:"Georgia,serif", maxHeight:"90vh", overflowY:"auto" }}>
            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16, paddingBottom:14, borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ width:60, height:60, borderRadius:99, background:`linear-gradient(135deg,${mood.accent},#ff9f0a)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28 }}>{rank.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:"bold", fontSize:18 }}>{bossName}</div>
                <div style={{ fontSize:13, color:mood.accent }}>{rank.title} • Pinnacle Solutions Group</div>
                <div style={{ fontSize:11, color:"#555", marginTop:2 }}>🔗 {200 + rankIdx * 340 + 47} connections</div>
              </div>
            </div>
            {/* Tagline */}
            <div style={{ fontSize:13, color:"#888", fontStyle:"italic", marginBottom:14, lineHeight:1.6 }}>
              "{GERRY_LINKUP.taglines[Math.min(rankIdx, 7)]}"
            </div>
            {/* About */}
            <div style={{ fontSize:11, letterSpacing:2, color:mood.accent, textTransform:"uppercase", marginBottom:6 }}>About</div>
            <div style={{ fontSize:13, color:"#777", lineHeight:1.7, marginBottom:14 }}>{GERRY_LINKUP.about[Math.min(rankIdx, 7)]}</div>
            {/* Featured Post */}
            <div style={{ padding:12, background:"rgba(255,255,255,0.02)", borderRadius:10, marginBottom:14 }}>
              <div style={{ fontSize:11, color:mood.accent, marginBottom:6, letterSpacing:1 }}>Featured Post</div>
              <div style={{ fontSize:12, color:"#aaa", fontStyle:"italic", lineHeight:1.7, marginBottom:6 }}>{GERRY_LINKUP.featured[Math.min(rankIdx, 7)]}</div>
              <div style={{ fontSize:11, color:"#555" }}>{GERRY_LINKUP.featuredLikes[Math.min(rankIdx, 7)]}</div>
            </div>
            {/* Endorsements */}
            <div style={{ fontSize:11, letterSpacing:2, color:mood.accent, textTransform:"uppercase", marginBottom:8 }}>Skills & Endorsements</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14 }}>
              {GERRY_LINKUP.endorsements[Math.min(rankIdx, 7)].map((e,i)=>(
                <div key={i} style={{ padding:"4px 10px", borderRadius:99, background:"rgba(255,215,0,0.06)", border:"1px solid rgba(255,215,0,0.15)", fontSize:11, color:"#888" }}>{e}</div>
              ))}
            </div>
            {/* Endorsed by */}
            <div style={{ fontSize:11, letterSpacing:2, color:mood.accent, textTransform:"uppercase", marginBottom:8 }}>Endorsed By</div>
            {GERRY_LINKUP.endorsedBy[Math.min(rankIdx, 7)].map((e,i)=>(
              <div key={i} style={{ fontSize:12, color:"#666", padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.03)", fontStyle:"italic" }}>{e}</div>
            ))}
            {/* Note */}
            <div style={{ marginTop:14, fontSize:11, color:"#333", fontStyle:"italic", lineHeight:1.6 }}>{GERRY_LINKUP.note[Math.min(rankIdx, 7)]}</div>
            <button onClick={()=>setShowGerryProfile(false)} style={{ marginTop:20, width:"100%", padding:12, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, color:"#888", fontFamily:"Georgia,serif", fontSize:14, cursor:"pointer" }}>Close</button>
          </div>
        </div>
      )}
      {showCrisisModal && (
        <HendersonCrisisModal
          bossName={bossName}
          onResolve={(chosenIdx) => {
            setShowCrisisModal(false);
            setCrisisResolved(true);
            const o = HENDERSON_CRISIS.onset.outcomes[chosenIdx||0];
            if (o) {
              setSouls(p => Math.max(0, p + (o.souls||0)));
              setMorale(p => Math.min(100, p + (o.morale||0)));
            }
          }}
        />
      )}
      {hendersonEvent&&<HendersonModal event={hendersonEvent} name={bossName} onResolve={resolveHenderson} />}
      {hendersonResult&&<HendersonResult result={hendersonResult} hendersonLevel={hendersonLevel} onClose={()=>setHendersonResult(null)} />}
      {activeGame&&<MiniGameModal game={activeGame} opticsMult={opticsMult} prestige={prestige} onResult={handleMiniGameResult} onClose={()=>setActiveGame(null)} />}

      {/* Hustle result modal */}
      {hustleResult&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.93)", zIndex:996, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ background:"#0e0e18", border:"1px solid rgba(255,215,0,0.15)", borderRadius:20, padding:28, maxWidth:340, width:"100%", fontFamily:"Georgia,serif" }}>
            <div style={{ fontSize:11, letterSpacing:3, color:"#ffd700", textTransform:"uppercase", marginBottom:4 }}>{hustleResult.hustle.emoji} {hustleResult.hustle.name}</div>
            <div style={{ fontSize:13, color:"#ff9f0a", marginBottom:14 }}>Target: {hustleResult.target}</div>
            <div style={{ fontSize:14, color:"#999", fontStyle:"italic", lineHeight:1.8, marginBottom:14 }}>"{hustleResult.text}"</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
              {(hustleResult.soulsGain||0) > 0 && <div style={{ padding:"8px 14px", borderRadius:99, background:"rgba(48,209,88,0.1)", border:"1px solid rgba(48,209,88,0.3)", fontSize:13, color:"#30d158", fontWeight:"bold" }}>+{hustleResult.soulsGain} 💀</div>}
              {(hustleResult.opticsGain||0) > 0 && <div style={{ padding:"8px 14px", borderRadius:99, background:"rgba(255,215,0,0.08)", border:"1px solid rgba(255,215,0,0.2)", fontSize:13, color:"#ffd700", fontWeight:"bold" }}>+{hustleResult.opticsGain} Optics</div>}
              {(hustleResult.moraleGain||0) > 0 && <div style={{ padding:"8px 14px", borderRadius:99, background:"rgba(48,209,88,0.06)", border:"1px solid rgba(48,209,88,0.2)", fontSize:13, color:"#30d158", fontWeight:"bold" }}>+{hustleResult.moraleGain}% morale</div>}
              {(hustleResult.hendersonDrop||0) > 0 && <div style={{ padding:"8px 14px", borderRadius:99, background:"rgba(255,159,10,0.08)", border:"1px solid rgba(255,159,10,0.2)", fontSize:13, color:"#ff9f0a", fontWeight:"bold" }}>🧾 Henderson ↓1</div>}
              {hustleResult.hendersonRise && <div style={{ padding:"8px 14px", borderRadius:99, background:"rgba(255,45,85,0.08)", border:"1px solid rgba(255,45,85,0.2)", fontSize:13, color:"#ff2d55", fontWeight:"bold" }}>🧾 Henderson ↑1</div>}
            </div>
            <button onClick={()=>setHustleResult(null)} style={{ width:"100%", padding:14, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, color:"#f0e6d3", fontFamily:"Georgia,serif", fontSize:14, cursor:"pointer" }}>Continue</button>
          </div>
        </div>
      )}

      {/* Desk item modal */}
      {selectedDeskItem&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", zIndex:996, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }} onClick={()=>setSelectedDeskItem(null)}>
          <div style={{ background:"#0e0e18", border:"1px solid rgba(255,215,0,0.15)", borderRadius:20, padding:28, maxWidth:320, width:"100%", textAlign:"center", fontFamily:"Georgia,serif" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>{selectedDeskItem.emoji}</div>
            <div style={{ fontSize:17, fontWeight:"bold", marginBottom:8 }}>{selectedDeskItem.name}</div>
            <div style={{ fontSize:13, color:"#888", fontStyle:"italic", lineHeight:1.7, marginBottom:20 }}>"{selectedDeskItem.desc}"</div>
            <div style={{ fontSize:11, color:"#555" }}>Tap anywhere to close.</div>
          </div>
        </div>
      )}

      {/* Drawer modal */}
      {drawerOpen&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.95)", zIndex:996, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }} onClick={()=>setDrawerOpen(false)}>
          <div style={{ background:"#0e0e18", border:"1px solid rgba(255,45,85,0.2)", borderRadius:20, padding:32, maxWidth:320, width:"100%", textAlign:"center", fontFamily:"Georgia,serif" }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🗄️</div>
            <div style={{ fontSize:14, color:"#888", fontStyle:"italic", lineHeight:1.8, marginBottom:12 }}>
              Gerry opens the drawer. There is a screenshot in there. Douglas Pinnacle has endorsed Scott for 'Judgment' on LinkUp. Gerry looks at it. Closes the drawer. The drawer makes a sound.
            </div>
            <div style={{ fontSize:12, color:"#555" }}>Darrell saw you open it once. He said: 'Okay.' He wrote something down.</div>
          </div>
        </div>
      )}

      {/* LinkUp profile modal */}
      {profileCast && LINKUP_PROFILES[profileCast] && (()=>{
        // For JJ, merge rank-aware fields so his profile evolves with Gerry's rise
        const baseProf = LINKUP_PROFILES[profileCast];
        const rankSnapshot = profileCast === "JJ" && baseProf.byRank
          ? { ...baseProf, ...baseProf.byRank[Math.min(rankIdx, baseProf.byRank.length-1)] }
          : baseProf;
        const prof = rankSnapshot;
        return (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.96)", zIndex:996, display:"flex", alignItems:"center", justifyContent:"center", padding:20, overflowY:"auto" }}>
          <div style={{ background:"#0e0e18", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, padding:24, maxWidth:380, width:"100%", fontFamily:"Georgia,serif", maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
              <div style={{ fontSize:36 }}>{CAST.find(x=>x.name===profileCast)?.emoji||"👤"}</div>
              <div>
                <div style={{ fontWeight:"bold", fontSize:16 }}>{profileCast}</div>
                <div style={{ fontSize:12, color:mood.accent }}>{prof.title}</div>
              </div>
            </div>
            {profileCast === "JJ" && rankIdx >= 3 && (
              <div style={{ fontSize:11, color:"#ff9f0a", marginBottom:10, fontStyle:"italic", padding:"6px 10px", background:"rgba(255,159,10,0.05)", borderRadius:8 }}>
                JJ has updated his profile {rankIdx} time{rankIdx!==1?"s":""} since Gerry's first promotion. Casey has the version history.
              </div>
            )}
            <div style={{ fontSize:13, color:"#888", fontStyle:"italic", marginBottom:14, lineHeight:1.6 }}>"{prof.tagline}"</div>
            <div style={{ fontSize:11, letterSpacing:2, color:"#ffd700", textTransform:"uppercase", marginBottom:8 }}>Endorsements</div>
            {(prof.endorsements||[]).map((e,i)=><div key={i} style={{ fontSize:12, color:"#ccc", padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>{e}</div>)}
            <div style={{ marginTop:12, fontSize:11, color:"#555", fontStyle:"italic" }}>Endorsed by: {(Array.isArray(prof.endorsedBy)?prof.endorsedBy:[prof.endorsedBy||""]).join(", ")}</div>
            <div style={{ marginTop:14, padding:10, background:"rgba(255,255,255,0.02)", borderRadius:10 }}>
              <div style={{ fontSize:11, color:mood.accent, marginBottom:4 }}>Featured</div>
              <div style={{ fontSize:12, color:"#aaa", fontStyle:"italic", marginBottom:4 }}>{String(prof.featured||"")}</div>
              {prof.featuredLikes&&<div style={{ fontSize:11, color:"#555" }}>{prof.featuredLikes}</div>}
            </div>
            <div style={{ marginTop:12, fontSize:12, color:"#666", lineHeight:1.6 }}>{prof.openTo||""}</div>
            <div style={{ marginTop:12, fontSize:11, color:"#444", fontStyle:"italic", lineHeight:1.6 }}>{prof.note||""}</div>
            <button onClick={()=>setProfileCast(null)} style={{ marginTop:20, width:"100%", padding:12, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, color:"#888", fontFamily:"Georgia,serif", fontSize:14, cursor:"pointer" }}>Close</button>
          </div>
        </div>
        );
      })()}

      {/* Event modal */}
      {event&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", zIndex:996, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"#0e0e18", border:"1px solid rgba(255,45,85,0.22)", borderRadius:20, padding:28, maxWidth:360, width:"100%", animation:"popIn 0.4s ease", fontFamily:"Georgia,serif", maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ fontSize:38, textAlign:"center", marginBottom:14 }}>{event.emoji}</div>
            <div style={{ fontSize:17, fontWeight:"bold", textAlign:"center", marginBottom:8 }}>{event.text}</div>
            <div style={{ fontSize:14, color:"#777", textAlign:"center", fontStyle:"italic", marginBottom:26, lineHeight:1.6 }}>{event.sub}</div>
            <div style={{ fontSize:11, color:"#444", textAlign:"center", marginBottom:18, letterSpacing:2, textTransform:"uppercase" }}>How does {bossName} respond?</div>
            {event.options.map((opt,i)=>(
              <button key={i} onClick={()=>resolveEvent(i)} style={{ display:"block", width:"100%", marginBottom:10, padding:"14px 18px", borderRadius:12, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"#f0e6d3", fontFamily:"Georgia,serif", fontSize:14, cursor:"pointer", textAlign:"left" }}>
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {notification&&(
        <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:800, background:`rgba(8,8,${rankIdx>=6?6:16},0.97)`, borderTop:`1px solid ${mood.border}`, height:36, overflow:"hidden", display:"flex", alignItems:"center" }}>
          <div style={{ flexShrink:0, padding:"0 8px", fontSize:9, letterSpacing:1, color:mood.accent, textTransform:"uppercase", borderRight:`1px solid ${mood.border}`, height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", lineHeight:1.1, minWidth:36 }}><span>PINNACLE</span><span>NEWS</span></div>
          <div style={{ flex:1, overflow:"hidden", position:"relative", height:"100%" }}>
            {(()=>{
              const duration = Math.max(18, Math.min(40, notification.length * 0.18));
              return <div key={notification} style={{ position:"absolute", left:"100%", top:0, bottom:0, whiteSpace:"nowrap", animation:`tickerScroll ${duration}s linear`, animationPlayState:(activeGame||hustleResult||eventResult||hendersonResult||showCrisisModal||profileCast||showGerryProfile||event||hendersonEvent)?"paused":"running", fontSize:12, color:mood.subtext, display:"flex", alignItems:"center", paddingRight:24 }}>{notification}</div>;
            })()}
          </div>
        </div>
      )}
      {toast&&(<div key={toastKey} style={{ position:"fixed", top:52, left:"50%", transform:"translateX(-50%)", background:`rgba(8,8,${rankIdx>=6?6:16},0.97)`, border:`1px solid ${mood.accent}`, borderRadius:16, padding:"12px 20px", zIndex:999, fontSize:13, fontWeight:"bold", color:mood.accent, animation:"toastIn 0.3s ease", whiteSpace:"normal", maxWidth:"80vw", width:"max-content", textAlign:"center", lineHeight:1.5 }}>{toast}</div>)}

      <div style={{ maxWidth:480, margin:"0 auto", padding:"52px 16px 100px" }}>

        {/* HEADER */}
        <div style={{ background:"linear-gradient(135deg,#0e0e18,#13131f)", border:`1px solid ${mood.border}`, borderRadius:22, padding:20, marginBottom:14, boxShadow:"0 8px 40px rgba(0,0,0,0.5)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
            <div>
              <div style={{ fontSize:24, fontWeight:"bold" }}>{bossName}</div>
              <div style={{ fontSize:15, color:mood.accent, marginTop:4 }}>{rank.icon} {rank.title}</div>
              <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:4 }}>
            <button onClick={()=>{ if(window.confirm("Start a new game? Your progress will be lost.")) { clearSave(); window.location.reload(); } }}
              style={{ fontSize:10, color:"#333", background:"transparent", border:"1px solid #222", borderRadius:99, padding:"3px 10px", cursor:"pointer", fontFamily:"Georgia,serif" }}>
              New Game
            </button>
          </div>
          {prestige>0&&<div style={{ fontSize:13, color:"#ff9f0a", marginTop:3, fontStyle:"italic" }}>{PRESTIGE_TITLES[Math.min(prestige-1,6)]} • Run #{prestige+1}</div>}
              {reorgCount>0&&<div style={{ fontSize:12, color:"#444", marginTop:2 }}>🔀 {reorgCount} reorg{reorgCount!==1?"s":""}</div>}
              <div style={{ fontSize:11, color:HENDERSON_LEVELS[Math.min(hendersonLevel-1,4)].color, marginTop:3, fontStyle:"italic", display:"flex", alignItems:"center", gap:4 }}>
                {HENDERSON_LEVELS[Math.min(hendersonLevel-1,4)].emoji} Henderson: {HENDERSON_LEVELS[Math.min(hendersonLevel-1,4)].label}
                {hendersonAtMax && <span style={{ color:"#ff0040", fontWeight:"bold" }}> — BOARD REVIEW PENDING</span>}
              </div>
  
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:24, fontWeight:"bold", color:mood.accent }}>💀 {souls.toLocaleString()}</div>
              <div style={{ fontSize:11, color:"#555", marginTop:2, letterSpacing:1 }}>CORPORATE SOULS</div>
              {rechargeTimer?<div style={{ fontSize:12, color:"#555", marginTop:3 }}>⚡ {rechargeTimer}</div>:<div style={{ fontSize:12, color:"#30d158", marginTop:3, animation:"rechargeGlow 1.2s infinite" }}>⚡ Recharging...</div>}
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#555", marginBottom:6 }}>
              <span style={{ letterSpacing:1, textTransform:"uppercase" }}>Optics</span>
              {nextRank?<span>{rankOptics.toLocaleString()} / {rankTarget.toLocaleString()}</span>:<span style={{ color:mood.accent }}>Maximum evil achieved</span>}
            </div>
            <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:99, height:8, overflow:"hidden", animation:moraleGated&&xpPct>=94?"gateWarn 1.5s infinite":"none" }}>
              <div style={{ width:`${Math.min(xpPct,100)}%`, height:"100%", borderRadius:99, background:moraleGated?"linear-gradient(90deg,#ff2d55,#ff375f)":rankIdx>=6?"linear-gradient(90deg,#ff2d55,#ff375f)":`linear-gradient(90deg,${mood.accent},#ff9f0a)`, transition:"width 0.6s ease" }} />
            </div>
            {nextRank&&!moraleGated&&<div style={{ display:"flex", justifyContent:"space-between", marginTop:5 }}><div style={{ fontSize:12, color:"#444" }}>Next: {nextRank.icon} {nextRank.title}</div><div style={{ fontSize:12, color:"#ff9f0a" }}>+{RANK_SOUL_REWARDS[rankIdx+1]?.toLocaleString()} 💀 on promotion</div></div>}
            {moraleGated&&<div style={{ marginTop:6, fontSize:12, color:"#ff2d55", fontStyle:"italic" }}>⚠ The Board won't promote you into this. Raise morale above {MORALE_PROMOTION_GATE}% first.</div>}
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            <div style={{ flex:1, background:"rgba(255,255,255,0.02)", border:morale<MORALE_PROMOTION_GATE?"1px solid rgba(255,45,85,0.35)":morale<25?"1px solid rgba(255,45,85,0.25)":"1px solid rgba(255,255,255,0.05)", borderRadius:12, padding:"11px 12px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <div style={{ fontSize:11, color:"#555", letterSpacing:1 }}>TEAM MORALE</div>
                {morale < MORALE_PROMOTION_GATE && <div style={{ fontSize:10, color:"#ff2d55" }}>PROMOTION LOCKED</div>}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ flex:1, background:"rgba(255,255,255,0.05)", borderRadius:99, height:5 }}>
                  <div style={{ width:`${morale}%`, height:"100%", borderRadius:99, background:morale<20?"#ff2d55":morale<MORALE_PROMOTION_GATE?"#ff6b35":morale<50?"#ff9f0a":"#30d158", transition:"width 0.5s ease", animation:morale<20?"moraleFlick 1s infinite":"none" }} />
                </div>
                <span style={{ fontSize:12, color:"#555" }}>{morale}%</span>
              </div>
              {morale < MORALE_PROMOTION_GATE && <div style={{ fontSize:11, color:"#ff6b35", marginTop:4 }}>Linda is in the parking lot. Casey's letter is 14 pages. Fix this.</div>}
            </div>
            <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:12, padding:"11px 14px", textAlign:"center", minWidth:80 }}>
              <div style={{ fontSize:11, color:"#555", marginBottom:4 }}>STREAK</div>
              <div style={{ fontSize:18, color:"#ff9f0a" }}>🔥 {streak}</div>
            </div>
          </div>
          {rankIdx>=7&&(<button onClick={doPrestige} style={{ width:"100%", marginTop:4, padding:15, background:"rgba(255,45,85,0.06)", border:"1px solid rgba(255,45,85,0.3)", borderRadius:14, color:"#ff2d55", fontFamily:"Georgia,serif", fontSize:14, fontWeight:"bold", cursor:"pointer" }}>🪂 Take the Golden Parachute<div style={{ fontSize:12, color:"rgba(255,45,85,0.5)", marginTop:4, fontWeight:"normal" }}>Reset with +{Math.round((prestige+1)*15)}% bonus • +500 💀 severance</div></button>)}
        </div>



        {activeTasks.length>0&&(
          <div style={{ background:"rgba(255,45,85,0.03)", border:"1px solid rgba(255,45,85,0.13)", borderRadius:16, padding:"14px 16px", marginBottom:14 }}>
            <div style={{ fontSize:11, letterSpacing:3, color:"#ff2d55", textTransform:"uppercase", marginBottom:12 }}>In Progress</div>
            {activeTasks.map(t=>{
              const pct=Math.min((t.elapsed/t.duration)*100,100);
              return(<div key={t.id} style={{ marginBottom:10 }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:5 }}><span>{t.emoji} {t.text}</span><span style={{ color:"#555", fontSize:12 }}>{Math.max(0,Math.ceil(t.duration-t.elapsed))}s</span></div><div style={{ background:"rgba(255,255,255,0.05)", borderRadius:99, height:5 }}><div style={{ width:`${pct}%`, height:"100%", borderRadius:99, background:"linear-gradient(90deg,#ff2d55,#ff9f0a)", transition:"width 0.1s linear" }} /></div></div>);
            })}
          </div>
        )}

        {/* TABS */}
        <div style={{ display:"flex", gap:4, marginBottom:14 }}>
          {TABS.map(t=>(
            <button key={t.k} className="tb" onClick={()=>setTab(t.k)} style={{ flex:1, padding:"9px 0", borderRadius:12, cursor:"pointer", border:tab===t.k?`1px solid rgba(255,215,0,0.3)`:"1px solid rgba(255,255,255,0.05)", background:tab===t.k?"rgba(255,215,0,0.07)":"rgba(255,255,255,0.02)", color:tab===t.k?mood.accent:"#666", fontFamily:"Georgia,serif", fontSize:13, fontWeight:tab===t.k?"bold":"normal" }}>
              {t.l}
            </button>
          ))}
        </div>

        {/* ── SCHEMES ── */}
        {tab==="schemes"&&(
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:17, fontWeight:"bold", color:"#f0e6d3", marginBottom:6 }}>Today's Agenda</div>
              <div style={{ fontSize:13, color:"#777", fontStyle:"italic", lineHeight:1.6, marginBottom:14 }}>"{agendaFlavor}"</div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontSize:13, color:souls<50?"#ff2d55":"#666" }}>💀 {souls.toLocaleString()} to drain</div>
                <button onClick={reprioritize} style={{ padding:"8px 16px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:99, color:"#777", fontFamily:"Georgia,serif", fontSize:12, cursor:"pointer" }}>🔀 Reprioritize — {reprioCost} 💀</button>
              </div>
            </div>
            {agenda.length===0&&(<div style={{ textAlign:"center", padding:"40px 20px", color:"#444", fontSize:14 }}>{activeTasks.length>=maxConc?`${bossName} is at capacity. Scott could handle more. Scott is not here.`:"All schemes executed at this level. Get promoted."}</div>)}
            {agenda.slice(0,AGENDA_SIZE).map(s=>{
              const isAI=AI_IDS.includes(s.id);
              const canAfford=souls>=s.cost;
              const tier=opticsBonus(s.cost);
              const adj=Math.round(s.optics*opticsMult*tier*(isAI?aiBonus:1)*(1+prestige*0.15));
              const tierLabel=tier>=2.2?"🔥 Premium":tier>=1.8?"⭐ High yield":tier>=1.5?"↑ Bonus":null;
              return(
                <div key={s.id} className="sc" onClick={()=>startScheme(s)} style={{ background:"#0e0e18", border:canAfford?"1px solid rgba(255,255,255,0.07)":"1px solid rgba(255,45,85,0.12)", borderRadius:16, padding:18, marginBottom:12, opacity:canAfford?1:0.55 }}>
                  <div style={{ display:"flex", gap:14 }}>
                    <div style={{ fontSize:28, lineHeight:1, paddingTop:2 }}>{s.emoji}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
                        <span style={{ fontSize:16, fontWeight:"bold" }}>{s.text}</span>
                        {isAI&&<span style={{ fontSize:10, color:"#ffd700", border:"1px solid rgba(255,215,0,0.3)", borderRadius:4, padding:"2px 6px" }}>AI</span>}
                        {tierLabel&&<span style={{ fontSize:10, color:"#ff9f0a", border:"1px solid rgba(255,159,10,0.3)", borderRadius:4, padding:"2px 6px" }}>{tierLabel}</span>}
                      </div>
                      <div style={{ fontSize:13, color:"#888", fontStyle:"italic", marginBottom:12, lineHeight:1.6 }}>"{s.flavor}"</div>
                      <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                        <span style={{ fontSize:14, color:canAfford?"#ff2d55":"#5a2030", fontWeight:"bold" }}>−{s.cost} 💀</span>
                        <span style={{ fontSize:13, color:"#444" }}>→</span>
                        <span style={{ fontSize:14, color:mood.accent }}>+{adj} Optics</span>
                        <span style={{ fontSize:12, color:"#555" }}>⏱ {Math.ceil(s.time*speedMult)}s</span>
                        <div style={{ marginLeft:"auto", padding:"8px 20px", borderRadius:99, background:canAfford?"linear-gradient(135deg,#ff2d55,#c0392b)":"rgba(255,255,255,0.05)", fontSize:13, fontWeight:"bold", color:canAfford?"white":"#555" }}>
                          {canAfford?"Drain":"Need souls"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── HUSTLES (V12) ── */}
        {tab==="hustles"&&(
          <div>
            <div style={{ fontSize:17, fontWeight:"bold", color:"#f0e6d3", marginBottom:4 }}>Gerry's Side Hustle Empire</div>
            <div style={{ fontSize:13, color:"#777", fontStyle:"italic", lineHeight:1.6, marginBottom:20 }}>
              Gerald Sr. owns the trucks. Full deniability. Henderson will find out. Henderson always finds out.
            </div>
            {SIDE_HUSTLES.filter(h => h.unlockRank <= rankIdx+1).map(h => {
              const canAfford = souls >= h.cost;
              const isActive = hustle?.id === h.id;
              return(
                <div key={h.id} style={{ background:"#0e0e18", border:`1px solid ${isActive?"rgba(255,215,0,0.3)":"rgba(255,255,255,0.06)"}`, borderRadius:16, padding:18, marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                    <div style={{ fontSize:16, fontWeight:"bold" }}>{h.emoji} {h.name}</div>
                    <div style={{ fontSize:12, color:"#555" }}>−{h.cost} 💀 {
                      h.id==="dogwalk" ? "· +morale · net positive" :
                      h.id==="pest"    ? "· Henderson target: 60% drop level, 40% caught · others +Optics" :
                      h.id==="demo"    ? "· +big Optics · high evidence risk" :
                      h.id==="landscape" ? "· +morale · net positive" :
                      h.id==="cleaning"  ? "· Henderson target: 58% drop his level, 42% backfire · others +morale" :
                      h.id==="detail"    ? "· Henderson target: 70% drop level, 30% backfire · others +Optics/Souls" :
                      `· +${h.reward} 💀`
                    }</div>
                  </div>
                  <div style={{ fontSize:13, color:"#888", fontStyle:"italic", marginBottom:12, lineHeight:1.5 }}>{h.desc}</div>
                  {h.hendersonEvidence&&<div style={{ fontSize:11, color:"#ff2d55", marginBottom:10 }}>⚠️ This will generate evidence. Henderson has a filing system.</div>}
                  {!isActive ? (
                    <button onClick={()=>{ setHustle(h); setHustleTarget(null); }} disabled={!canAfford}
                      style={{ padding:"10px 20px", borderRadius:99, background:canAfford?"linear-gradient(135deg,#ff9f0a,#ff6b35)":"rgba(255,255,255,0.04)", border:"none", color:canAfford?"#080810":"#555", fontFamily:"Georgia,serif", fontSize:13, fontWeight:"bold", cursor:canAfford?"pointer":"not-allowed" }}>
                      {canAfford?"Select Target":"Need souls"}
                    </button>
                  ) : (
                    <div>
                      {!hustleTarget ? (<>
                        <div style={{ fontSize:12, color:"#ffd700", marginBottom:10 }}>Select a target:</div>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                          {Object.keys(h.targets).map(name => (
                            <button key={name} onClick={()=>setHustleTarget(name)}
                              style={{ padding:"8px 14px", borderRadius:99, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,215,0,0.2)", color:"#ccc", fontFamily:"Georgia,serif", fontSize:12, cursor:"pointer" }}>
                              {CAST.find(c=>c.name===name)?.emoji||"👤"} {name}
                            </button>
                          ))}
                        </div>
                        <button onClick={()=>setHustle(null)} style={{ marginTop:10, padding:"6px 14px", borderRadius:99, background:"transparent", border:"1px solid #333", color:"#555", fontFamily:"Georgia,serif", fontSize:12, cursor:"pointer" }}>← Back</button>
                      </>) : (<>
                        <div style={{ fontSize:13, color:"#f0e6d3", marginBottom:10 }}>
                          {CAST.find(c=>c.name===hustleTarget)?.emoji||"👤"} Target: <strong>{hustleTarget}</strong>
                        </div>
                        {h.id==="cleaning"&&hustleTarget==="Henderson"&&<div style={{ fontSize:11, color:"#ff9f0a", marginBottom:8, fontStyle:"italic" }}>58% drop his level · 42% backfire</div>}
                        {h.id==="detail"&&hustleTarget==="Henderson"&&<div style={{ fontSize:11, color:"#ff9f0a", marginBottom:8, fontStyle:"italic" }}>70% drop his level · 30% caught</div>}
                        {h.id==="pest"&&hustleTarget==="Henderson"&&<div style={{ fontSize:11, color:"#ff9f0a", marginBottom:8, fontStyle:"italic" }}>60% get evidence · 40% caught</div>}
                        <div style={{ display:"flex", gap:8, marginTop:4 }}>
                          <button onClick={()=>deployHustle(h, hustleTarget)}
                            style={{ flex:1, padding:"10px 0", borderRadius:99, background:"linear-gradient(135deg,#ff9f0a,#ff6b35)", border:"none", color:"#080810", fontFamily:"Georgia,serif", fontSize:13, fontWeight:"bold", cursor:"pointer" }}>
                            Deploy {h.emoji}
                          </button>
                          <button onClick={()=>setHustleTarget(null)}
                            style={{ padding:"10px 16px", borderRadius:99, background:"transparent", border:"1px solid #333", color:"#555", fontFamily:"Georgia,serif", fontSize:12, cursor:"pointer" }}>
                            ← Back
                          </button>
                        </div>
                      </>)}
                    </div>
                  )}
                </div>
              );
            })}
            {SIDE_HUSTLES.filter(h => h.unlockRank > rankIdx+1).length > 0 && (
              <div style={{ fontSize:12, color:"#333", fontStyle:"italic", textAlign:"center", marginTop:8 }}>
                {SIDE_HUSTLES.filter(h => h.unlockRank > rankIdx+1).length} more operations unlock at higher ranks.
              </div>
            )}
          </div>
        )}

        {/* ── GAMES ── */}
        {tab==="games"&&(
          <div>
            <div style={{ fontSize:17, fontWeight:"bold", color:"#f0e6d3", marginBottom:6 }}>Office Games</div>
            <div style={{ fontSize:13, color:"#777", fontStyle:"italic", marginBottom:20, lineHeight:1.6 }}>
              Win Optics faster than passive schemes. Darrell will comment either way. Scott keeps score whether you ask him to or not.
            </div>
            {MINI_GAMES.map(game=>{
              const canAfford=souls>=game.cost;
              const adjWin=Math.round(game.winOptics*opticsMult*(1+prestige*0.15));
              const adjLose=Math.round(game.loseOptics*opticsMult*(1+prestige*0.15));
              return(
                <div key={game.id} className="mg" onClick={()=>canAfford&&playMiniGame(game)} style={{ background:"#0e0e18", border:canAfford?`1px solid rgba(255,215,0,0.12)`:"1px solid rgba(255,45,85,0.12)", borderRadius:16, padding:18, marginBottom:12, opacity:canAfford?1:0.55 }}>
                  <div style={{ display:"flex", alignItems:"flex-start", gap:14 }}>
                    <div style={{ fontSize:32, lineHeight:1 }}>{game.emoji}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:16, fontWeight:"bold", marginBottom:5 }}>{game.name}</div>
                      <div style={{ fontSize:13, color:"#888", fontStyle:"italic", marginBottom:12, lineHeight:1.5 }}>{game.desc}</div>
                      <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                        <span style={{ fontSize:14, color:canAfford?"#ff2d55":"#5a2030", fontWeight:"bold" }}>−{game.cost} 💀</span>
                        <><span style={{ fontSize:12, color:"#30d158" }}>Win: +{adjWin}</span><span style={{ fontSize:12, color:"#555" }}>Lose: +{adjLose}</span></>
                        <div style={{ marginLeft:"auto", padding:"8px 20px", borderRadius:99, background:canAfford?"linear-gradient(135deg,#ffd700,#ff9f0a)":"rgba(255,255,255,0.05)", fontSize:13, fontWeight:"bold", color:canAfford?"#080810":"#555" }}>
                          {canAfford?"Play":"Need souls"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div style={{ marginTop:8, padding:14, background:"rgba(255,255,255,0.02)", borderRadius:14, fontSize:12, color:"#555", fontStyle:"italic", textAlign:"center", lineHeight:1.7 }}>
              Scott has been tracking your game scores since day one. He hasn't shared the data. He will share it eventually. Probably to Henderson.
            </div>
          </div>
        )}

        {/* ── DESK (V12) ── */}
        {tab==="desk"&&(
          <div>
            <div style={{ fontSize:17, fontWeight:"bold", color:"#f0e6d3", marginBottom:4 }}>Gerry's Desk</div>
            <div style={{ fontSize:13, color:"#777", fontStyle:"italic", marginBottom:16, lineHeight:1.6 }}>
              An achievement wall in progress. Tap any unlocked item to read its inscription. {unlockedDesk.length}/{DESK_ITEMS.length} unlocked.
            </div>

            {/* Hidden drawer */}
            <div onClick={()=>setDrawerOpen(true)} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, padding:14, marginBottom:16, cursor:"pointer", display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ fontSize:28 }}>🗄️</div>
              <div>
                <div style={{ fontSize:13, color:"#888" }}>The Locked Drawer</div>
                <div style={{ fontSize:11, color:"#555", fontStyle:"italic" }}>Nobody asks about it. Darrell asked once.</div>
              </div>
            </div>

            {/* Categories */}
            {["Photos","Awards","Objects","Documents"].map(cat => {
              const items = DESK_ITEMS.filter(d => d.cat === cat);
              return (
                <div key={cat} style={{ marginBottom:20 }}>
                  <div style={{ fontSize:10, letterSpacing:3, color:mood.accent, textTransform:"uppercase", marginBottom:10 }}>{cat}</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                    {items.map(item => {
                      const isUnlocked = unlockedDesk.includes(item.id);
                      return (
                        <div key={item.id} onClick={()=>isUnlocked&&item&&setSelectedDeskItem(item)}
                          style={{ background: isUnlocked?"#0e0e18":"#080810", border:`1px solid ${isUnlocked?"rgba(255,215,0,0.15)":"rgba(255,255,255,0.04)"}`, borderRadius:12, padding:12, textAlign:"center", cursor:isUnlocked?"pointer":"default", opacity:isUnlocked?1:0.3 }}>
                          <div style={{ fontSize:26, marginBottom:4 }}>{isUnlocked?item.emoji:"🔒"}</div>
                          <div style={{ fontSize:10, color:isUnlocked?"#888":"#333", lineHeight:1.3 }}>{isUnlocked?item.name:item.unlockNote}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── PERKS ── */}
        {tab==="perks"&&(
          <div>
            <div style={{ fontSize:14, color:"#777", marginBottom:16, lineHeight:1.6 }}>
              Permanent upgrades. Carry through prestige runs. Note: if morale is blocking your promotion, the 🍕 and 🫶 perks can help.
            </div>
            {PERKS.map(p=>{
              const owned=ownedPerks.includes(p.id); const can=souls>=p.cost;
              const isMoralePerk = p.moraleBoost && owned;
              return(
                <div key={p.id} className="pk" style={{ background:owned?"rgba(255,215,0,0.03)":"#0e0e18", border:owned?"1px solid rgba(255,215,0,0.13)":"1px solid rgba(255,255,255,0.05)", borderRadius:16, padding:16, marginBottom:10, opacity:isMoralePerk?0.5:owned?0.6:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ fontSize:28 }}>{p.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:15, fontWeight:"bold", marginBottom:3 }}>{owned&&"✅ "}{p.name}</div>
                      <div style={{ fontSize:13, color:"#777" }}>{p.desc}</div>
                    </div>
                    <button onClick={()=>buyPerk(p)} disabled={owned||!can} style={{ padding:"9px 16px", borderRadius:99, border:"none", cursor:owned||!can?"not-allowed":"pointer", background:owned?"rgba(255,255,255,0.03)":can?"linear-gradient(135deg,#ffd700,#ff9f0a)":"rgba(255,255,255,0.04)", color:owned?"#444":can?"#080810":"#444", fontFamily:"Georgia,serif", fontSize:13, fontWeight:"bold", minWidth:76, textAlign:"center" }}>
                      {owned?"Used":`💀 ${p.cost.toLocaleString()}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── STORE ── */}
        {tab==="store"&&(
          <div>
            <div style={{ fontSize:12, letterSpacing:3, color:mood.accent, textTransform:"uppercase", marginBottom:8 }}>The Company Store</div>
            <div style={{ fontSize:14, color:"#777", marginBottom:22, fontStyle:"italic", lineHeight:1.7 }}>"I owe my soul to the company store."<br/>— Old saying. Newly relevant.<br/>Bitsy has renamed it 'The Soul Exchange.' Darrell: 'Fourth name.'</div>
            {COMPANY_STORE.map(item=>(
              <div key={item.id} style={{ background:"#0e0e18", border:`1px solid ${mood.border}`, borderRadius:16, padding:18, marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:16, fontWeight:"bold", marginBottom:5 }}>{item.name}</div>
                    {item.souls>0&&<div style={{ fontSize:17, color:mood.accent, fontWeight:"bold", marginBottom:5 }}>+{item.souls.toLocaleString()} 💀</div>}
                    {item.special==="recharge"&&<div style={{ fontSize:14, color:"#30d158", marginBottom:5 }}>Instant recharge</div>}
                    <div style={{ fontSize:13, color:"#666", fontStyle:"italic" }}>"{item.flavor}"</div>
                  </div>
                  <button onClick={()=>buyFromStore(item)} style={{ marginLeft:16, padding:"11px 20px", borderRadius:99, background:"linear-gradient(135deg,#ffd700,#ff9f0a)", border:"none", color:"#080810", fontFamily:"Georgia,serif", fontSize:14, fontWeight:"bold", cursor:"pointer", flexShrink:0 }}>
                    {item.price}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── PROFILE ── */}
        {tab==="profile"&&(
          <div>
            {/* LinkUp card - clickable */}
            <div onClick={()=>setShowGerryProfile(true)} style={{ background:"#0e0e18", border:"1px solid rgba(255,255,255,0.06)", borderRadius:16, padding:20, marginBottom:14, cursor:"pointer", transition:"border-color 0.2s" }}
              onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(255,215,0,0.2)"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"}>
              <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
                <div style={{ width:56, height:56, borderRadius:99, background:`linear-gradient(135deg,${mood.accent},#ff9f0a)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>{rank.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:"bold", fontSize:18 }}>{bossName}</div>
                  <div style={{ fontSize:14, color:mood.accent, marginTop:2 }}>{rank.title}</div>
                  <div style={{ fontSize:12, color:"#444", marginTop:2 }}>🔗 LinkUp • Open to Destroying</div>
                </div>
                <div style={{ fontSize:12, color:"#555" }}>View Profile →</div>
              </div>
              <div style={{ fontSize:13, color:"#777", fontStyle:"italic", padding:14, background:"rgba(255,255,255,0.02)", borderRadius:10, lineHeight:1.8 }}>"{getLinkUpBio(rankIdx, bossName, gp)}"</div>
            </div>

            {/* Cast LinkUp profiles (V12) */}
            <div style={{ fontSize:11, letterSpacing:3, color:mood.accent, textTransform:"uppercase", marginBottom:12 }}>The Cast — LinkUp Profiles</div>
            <div style={{ fontSize:12, color:"#555", fontStyle:"italic", marginBottom:14 }}>Tap any name to view their full profile.</div>
            {CAST.filter(c => c.name !== "Tyler" || rankIdx >= 3).map((c,i)=>(
              <div key={i} onClick={()=>LINKUP_PROFILES[c.name]&&setProfileCast(c.name)}
                style={{ background:"#0e0e18", border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, padding:14, marginBottom:10, cursor:"pointer", display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ fontSize:24 }}>{c.emoji}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:"bold" }}>{c.name} <span style={{ fontSize:11, color:"#555", fontWeight:"normal" }}>— {c.role}</span></div>
                  <div style={{ fontSize:11, color:"#666", fontStyle:"italic", marginTop:2 }}>{LINKUP_PROFILES[c.name]?.tagline||c.desc}</div>
                </div>
                <div style={{ fontSize:12, color:"#444" }}>→</div>
              </div>
            ))}

            {/* Henderson Panel - v14 5-level system */}
            {(()=>{
              const hlvl = HENDERSON_LEVELS[Math.min(hendersonLevel-1, 4)];
              const demotionSecsLeft = hendersonAtMax
                ? Math.max(0, HENDERSON_DEMOTION_SECONDS - Math.floor((Date.now()-hendersonAtMax)/1000))
                : null;
              return (
                <div style={{ background:"#0e0e18", border:`1px solid ${hlvl.color}44`, borderRadius:16, padding:20, marginBottom:14, marginTop:8, boxShadow:`0 0 20px ${hlvl.glowColor}`, transition:"all 0.5s ease" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                    <div style={{ fontSize:11, letterSpacing:3, color:hlvl.color, textTransform:"uppercase" }}>The Henderson File</div>
                    <div style={{ fontSize:11, color:hlvl.color, fontWeight:"bold", padding:"3px 10px", borderRadius:99, border:`1px solid ${hlvl.color}55`, background:`${hlvl.color}11` }}>THREAT: {hlvl.threat}</div>
                  </div>

                  {/* Level Meter */}
                  <div style={{ display:"flex", gap:4, marginBottom:12 }}>
                    {HENDERSON_LEVELS.map((l,i) => (
                      <div key={i} style={{ flex:1, height:6, borderRadius:99, background:i < hendersonLevel ? l.color : "rgba(255,255,255,0.06)", transition:"background 0.4s ease" }}/>
                    ))}
                  </div>

                  <div style={{ fontSize:18, fontWeight:"bold", marginBottom:6 }}>{hlvl.emoji} {hlvl.label}</div>
                  <div style={{ fontSize:13, color:"#888", fontStyle:"italic", lineHeight:1.7, marginBottom:12 }}>{hlvl.desc}</div>
                  <div style={{ fontSize:12, color:"#666", lineHeight:1.6, marginBottom:14, padding:"10px 12px", background:"rgba(255,255,255,0.02)", borderRadius:10 }}>
                    <strong style={{ color:hlvl.color }}>Currently: </strong>{hlvl.activity}
                  </div>

                  {/* Demotion clock */}
                  {demotionSecsLeft !== null && (
                    <div style={{ padding:"10px 14px", background:"rgba(255,0,64,0.08)", border:"1px solid rgba(255,0,64,0.3)", borderRadius:10, marginBottom:14, textAlign:"center" }}>
                      <div style={{ fontSize:13, color:"#ff0040", fontWeight:"bold" }}>⚖️ BOARD REVIEW IN: {demotionSecsLeft}s</div>
                      <div style={{ fontSize:11, color:"#cc0030", marginTop:4 }}>Settle or appease Henderson immediately or Gerry gets demoted.</div>
                    </div>
                  )}

                  {/* Damage Control */}
                  <div style={{ fontSize:11, letterSpacing:2, color:"#888", textTransform:"uppercase", marginBottom:6 }}>Damage Control</div>
                  <div style={{ fontSize:11, color:"#555", marginBottom:6, fontStyle:"italic" }}>The hustles are your primary tool — Cleaning Service and Car Detailing can drop Henderson's level if you get the right target. These are the last-resort management decisions.</div>
                  <div style={{ fontSize:11, color:"#555", marginBottom:10 }}>{hlvl.appease}</div>
                  {HENDERSON_APPEASEMENTS.map(a => {
                    const onCooldown = appeaseCooldowns[a.id] && Date.now() < appeaseCooldowns[a.id];
                    const canAfford = souls >= a.cost;
                    return (
                      <button key={a.id} onClick={()=>appeaseHenderson(a)}
                        disabled={onCooldown || !canAfford}
                        style={{ display:"block", width:"100%", marginBottom:8, padding:"10px 14px", borderRadius:10, background:"rgba(255,255,255,0.03)", border:`1px solid ${canAfford&&!onCooldown?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.03)"}`, color:canAfford&&!onCooldown?"#ccc":"#444", fontFamily:"Georgia,serif", fontSize:12, cursor:canAfford&&!onCooldown?"pointer":"not-allowed", textAlign:"left", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span>{a.label} <span style={{ color:"#555", fontSize:11 }}>↓{a.drop} level{a.drop>1?"s":""}</span></span>
                        <span style={{ color:canAfford?"#ffd700":"#555", fontWeight:"bold" }}>{a.cost} 💀</span>
                      </button>
                    );
                  })}
                  <div style={{ fontSize:11, color:"#333", fontStyle:"italic", marginTop:10 }}>Henderson has footnotes. The footnotes have sub-footnotes. Darrell has read them all. He said: 'thorough.' He meant it as a compliment. To Henderson.</div>
                </div>
              );
            })()}

            {/* Office Confessional */}
            <div style={{ background:"#0e0e18", border:"1px solid rgba(255,45,85,0.12)", borderRadius:16, padding:20, marginBottom:14 }}>
              <div style={{ fontSize:11, letterSpacing:3, color:"#ff2d55", textTransform:"uppercase", marginBottom:18 }}>Office Confessional</div>
              {CONFESSIONAL_REVIEWS.slice(0,Math.min(rankIdx+2,CONFESSIONAL_REVIEWS.length)).map((fn,i,arr)=>(
                <div key={i} style={{ marginBottom:16, paddingBottom:16, borderBottom:i<arr.length-1?"1px solid rgba(255,255,255,0.04)":"none" }}>
                  <div style={{ color:"#ff2d55", fontSize:13, marginBottom:5 }}>⭐☆☆☆☆</div>
                  <div style={{ fontSize:13, color:"#777", lineHeight:1.7, fontStyle:"italic" }}>{fn(bossName||'The Boss')}</div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div style={{ background:"#0e0e18", border:"1px solid rgba(255,255,255,0.05)", borderRadius:16, padding:20 }}>
              <div style={{ fontSize:11, letterSpacing:3, color:mood.accent, textTransform:"uppercase", marginBottom:18 }}>Stats</div>
              {[
                {l:"Schemes Executed",       v:`${doneIds.length} of ${SCHEMES.length}`},
                {l:"Henderson Level",         v:`${HENDERSON_LEVELS[Math.min(hendersonLevel-1,4)].emoji} ${HENDERSON_LEVELS[Math.min(hendersonLevel-1,4)].label}`},
                {l:"Reorgs Executed",         v:reorgCount},
                {l:"Prestige Runs",           v:prestige},
                {l:"Total Optics",            v:totalOptics.toLocaleString()},
                {l:"This Rank Optics",        v:`${rankOptics.toLocaleString()} / ${rankTarget.toLocaleString()}`},
                {l:"Promotion Status",        v:moraleGated?`⚠ Blocked — raise morale above ${MORALE_PROMOTION_GATE}%`:"✅ Clear"},
                {l:"Team Morale",             v:`${morale}% ${morale<MORALE_PROMOTION_GATE?"🔴 BLOCKED":morale<40?"💀 Critical":morale<65?"😬 Declining":"😐 Managed"}`},
                {l:"Daily Streak",            v:`🔥 ${streak} day${streak!==1?"s":""}`},
                {l:"Desk Items Unlocked",     v:`${unlockedDesk.length} / ${DESK_ITEMS.length}`},
                {l:"Soul Recharge",           v:rechargeTimer?`⏳ ${rechargeTimer}`:"⚡ Ready"},
              ].map((r,i,arr)=>(
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 0", borderBottom:i<arr.length-1?"1px solid rgba(255,255,255,0.04)":"none" }}>
                  <span style={{ fontSize:14, color:"#666" }}>{r.l}</span>
                  <span style={{ fontSize:13, fontWeight:"bold" }}>{r.v}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop:18, fontSize:13, color:"#1e1e28", fontStyle:"italic", textAlign:"center", lineHeight:1.8 }}>
              ⚠️ Evil Bosses is satirical fiction.<br/>Linda, Casey, Scott, Darrell, Beardogg, Bitsy, JJ, and Henderson are fictional. Gerry is also fictional, deeply committed to the spelling, and uses whatever pronouns you selected.<br/>Scott's one sentence per week is fictional.<br/>If it sounded familiar, that's between you and your therapist.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
