/* The work list: the P11 Research Labs articles in post-quantum-articles/.
   Each article's text lives in its Markdown file there, and project.html fetches and
   renders it. art names the animated piece in art.js that stands in for its image. */
const ARTICLE_DIR = 'post-quantum-articles/p11-research-labs/';

const PROJECTS = [
  { id: 'state-reuse', md: '02-state-reuse.md', art: 'reuse',   title: 'State Reuse',      when: 'Security · September 8, 2026' },
  { id: 'shrincs',     md: '03-shrincs.md',     art: 'shrincs', title: 'SHRINCS',          when: 'Analysis · August 28, 2026' },
  { id: 'temporary',   md: '04-temporary.md',   art: 'wave',    title: 'Temporary',        when: 'Analysis · August 7, 2026' },
  { id: 'ownership',   md: '05-ownership.md',   art: 'derive',  title: 'After Q-Day',      when: 'Technical · July 15, 2026' },
  { id: 'round3',      md: '06-round3.md',      art: 'rise',    title: 'Round 3',          when: 'Security · May 15, 2026' },
  { id: 'cuts',        md: '07-cuts.md',        art: 'columns', title: 'CUTS',             when: 'Technical · September 28, 2026' },
  { id: 'primer',      md: '08-primer.md',      art: 'curve',   title: 'Signing #1',       when: 'Education · September 24, 2026' },
  { id: 'qday',        md: '09-qday.md',        art: 'sunrise', title: 'Forcing Function', when: 'Education · May 26, 2026' },
  { id: 'advisor',     md: '10-advisor.md',     art: 'orbit',   title: 'Marin Ivezic',     when: 'News · June 3, 2026' },
];
