import fs from 'fs';
import path from 'path';

// Define the paths
const filePath = path.join(process.cwd(), 'src/data/personalityTypes.ts');

const darkMindBreakdowns: Record<string, string> = {
  'TDI': 'The Playette uses her mysterious exterior as a shield against vulnerability. Her "iceberg" persona is a defense mechanism to test a man\'s persistence and emotional intelligence. She secretly fears being understood too quickly, as it removes her power. By remaining aloof, she forces men to project their own fantasies onto her, allowing her to maintain control without revealing her true self.',
  'TJI': 'The Social Butterfly uses constant motion and attention as a distraction from deeper emotional intimacy. Her need to be the center of attention stems from a fear of being ordinary or forgotten. She chases the unattainable because the chase itself is safer than the reality of a committed relationship. Her Justifier nature allows her to rationalize impulsive behavior as "living in the moment," avoiding accountability.',
  'NDI': 'The Hopeful Romantic is addicted to the narrative of love rather than the reality of a partner. She projects her idealized fantasies onto flawed men, ignoring red flags to keep the fairy tale alive. Her Denier trait makes her use sex as a bargaining chip for emotional commitment, while her Investor nature makes her cling tightly once she feels she has secured the "happily ever after," often suffocating the relationship.',
  'NJI': 'The Cinderella uses her sexuality and charm to secure a savior. She views herself as the protagonist of a romantic drama, needing a strong man to rescue her from her circumstances. Her Justifier trait allows her to easily rationalize infidelity or monkey-branching if a "better prince" comes along. She trades her devotion for security and status, often masking her transactional nature with intense romanticism.',
  'TDR': 'The Private Dancer uses her independence and logical nature as a fortress. She views relationships as potential liabilities to her goals and autonomy. Her Tester and Denier traits combine to create an extremely high barrier to entry; she demands a man prove his worth continuously. She secretly fears that relying on a man will lead to disappointment, so she maintains a calculated distance to protect her vulnerability.',
  'TJR': 'The Seductress weaponizes her sexuality and charm to gain power and resources. She is highly transactional and views men as stepping stones or tools for her own advancement. Her Justifier nature allows her to use her body without emotional attachment, while her Realist mindset keeps her focused on tangible benefits. She is the ultimate pragmatist, expertly manipulating male desire to serve her own ends.',
  'NDR': 'The Connoisseur uses her high standards and refined tastes as a way to filter out the unworthy. She views relationships as investments and expects a high return. Her Denier trait means she requires significant proof of a man\'s value (status, wealth, intellect) before committing. She secretly fears settling for less than she deserves, leading to a constant evaluation of her partner\'s performance and potential.',
  'NJR': 'The Modern Woman uses her competence and sexual liberation to dominate her environment. She views traditional relationship roles as restrictive and prefers to dictate the terms of engagement. Her Justifier trait allows her to pursue pleasure without guilt, while her Investor nature means she will commit to a man who enhances her life without threatening her independence. She secretly fears losing her edge or being controlled.'
};

const behavioralBlueprints: Record<string, string> = {
  'TDI': '1. **The Mirror:** Reflect her aloofness. Do not over-invest early. 2. **The Slow Reveal:** Share your depth incrementally, making her work for it. 3. **The Safe Harbor:** Create a judgment-free zone where she can drop the "iceberg" act without feeling exposed. 4. **The Unpredictable Spark:** Introduce spontaneous, low-pressure activities to bypass her analytical mind.',
  'TJI': '1. **The Anchor:** Remain grounded and unaffected by her chaotic energy. 2. **The Challenge:** Be the one guy in the room who isn\'t vying for her attention. 3. **The Novelty Generator:** Keep her engaged with unexpected adventures and bold moves. 4. **The Boundary Setter:** Firmly establish your limits; she respects a man she cannot easily manipulate.',
  'NDI': '1. **The Dream Weaver:** Speak to her romantic ideals and paint a compelling vision of the future. 2. **The Patient Leader:** Guide the physical escalation slowly, respecting her need for emotional connection first. 3. **The Reassuring Presence:** Consistently validate her feelings and the special nature of your bond. 4. **The Reality Check:** Gently ground her when her fantasies become unrealistic, maintaining your frame.',
  'NJI': '1. **The Decisive Captain:** Take charge of interactions and logistics; she wants to be led. 2. **The Passionate Lover:** Escalate physically with confidence and intensity. 3. **The Protector:** Make her feel safe and cherished, fulfilling her need for a savior figure. 4. **The Value Demonstrator:** Continuously show your high value to prevent her from looking for a "better prince."',
  'TDR': '1. **The Respectful Challenger:** Challenge her intellect and opinions without being aggressive. 2. **The Independent Equal:** Demonstrate your own ambition and self-sufficiency; do not be needy. 3. **The Logical Persuader:** Appeal to her rational mind when escalating or making plans. 4. **The Consistent Performer:** Prove your reliability and competence over time to earn her trust.',
  'TJR': '1. **The Unfazed Observer:** Do not be easily seduced or manipulated by her charm. 2. **The Value Extractor:** Ensure the relationship is mutually beneficial; do not give resources without receiving value. 3. **The Bold Escalator:** Match her sexual energy and escalate confidently. 4. **The Frame Holder:** Maintain your own agenda and do not become just another tool in her arsenal.',
  'NDR': '1. **The High-Value Asset:** Showcase your status, ambition, and refined tastes. 2. **The Discerning Evaluator:** Show that you also have high standards and are evaluating her. 3. **The Strategic Investor:** Invest time and resources only when she demonstrates reciprocal value. 4. **The Intellectual Stimulator:** Engage her mind with deep, sophisticated conversations.',
  'NJR': '1. **The Confident Partner:** Support her ambitions without feeling threatened. 2. **The Unapologetic Lover:** Embrace her sexual liberation and match her intensity. 3. **The Boundary Enforcer:** Ensure she respects your time and needs, despite her independence. 4. **The Dynamic Equal:** Keep the relationship exciting and challenging, preventing stagnation.'
};

function main() {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  let content = fs.readFileSync(filePath, 'utf8');

  for (const [id, darkMind] of Object.entries(darkMindBreakdowns)) {
    const blueprint = behavioralBlueprints[id];
    
    // Find the block for this ID
    const regex = new RegExp(`(id:\\s*'${id}'[\\s\\S]*?freakDynamics:\\s*{[\\s\\S]*?worship:\\s*".*?"\\n\\s*})`);
    
    content = content.replace(regex, `$1,\n    darkMindBreakdown: \`${darkMind}\`,\n    behavioralBlueprint: \`${blueprint}\``);
  }

  fs.writeFileSync(filePath, content);
  console.log('Successfully updated personality types.');
}

main();
