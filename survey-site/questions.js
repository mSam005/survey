/* Shared questionnaire definition + scoring. Used by index.html (survey) and admin.html (analysis). */
(function (g) {
  const A5 = ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'];
  const F5 = ['Never', 'Rarely', 'Sometimes', 'Often', 'Very often'];
  const R5 = ['Always', 'Often', 'Sometimes', 'Rarely', 'Never'];
  const YN = ['Yes', 'No'];
  const YNN = ['Yes', 'No', 'Not sure'];
  const NA = 'Not applicable';

  const sections = [
    {
      id: 'A', title: 'Consent & General Information', questions: [
        { id: 'A1', type: 'radio', short: 'Consent', text: 'Do you agree to participate in this research study?', options: ['Yes, I agree', 'No, I do not agree'] },
        { id: 'A2', type: 'text', short: 'Name', text: 'Name' },
        { id: 'A3', type: 'date', short: 'Date', text: 'Date of Survey' }
      ]
    },
    {
      id: 'B', title: 'Socio-demographic & Living Conditions', questions: [
        { id: 'B1', type: 'radio', short: 'Age group', text: 'Age', options: ['10-20', '21-30', '31-40', '41-50', 'Above 50'] },
        { id: 'B2', type: 'radio', short: 'Gender', text: 'Gender', options: ['Male', 'Female'] },
        { id: 'B3', type: 'radio', short: 'Occupation', text: 'Occupational status', options: ['School/College student', 'University student', 'Employed', 'Self-employed', 'Unemployed', 'Homemaker', 'Other'] },
        { id: 'B4', type: 'radio', short: 'Area of residence', text: 'Area of residence', options: ['Urban', 'Rural'] },
        { id: 'B5', type: 'radio', short: 'Sanitation conditions', text: 'How would you describe the sanitation conditions around your residence?', options: ['Good', 'Fair', 'Poor', 'Very poor'] },
        { id: 'B6', type: 'radio', short: 'Open sewage / stagnant water', text: 'Is there open sewage, stagnant water, or unmanaged waste near your residence?', options: ['Yes', 'No', 'Not sure'] }
      ]
    },
    {
      id: 'C', title: 'Gastrointestinal Symptoms', questions: [
        { id: 'C1', type: 'radio', short: 'GI symptoms (past 3 months)', text: 'Have you experienced any gastrointestinal/digestive symptoms during the past 3 months?', options: YN },
        {
          id: 'C2', type: 'checkbox', short: 'Symptoms experienced', text: 'Which gastrointestinal symptoms have you experienced?', showIf: { q: 'C1', eq: 'Yes' },
          options: ['Abdominal pain', 'Diarrhea', 'Constipation', 'Nausea', 'Vomiting', 'Bloating', 'Abdominal cramps', 'Loss of appetite', 'Excessive gas', 'Mucus in stool', 'Unusual changes in stool', 'Blood in stool', 'Other']
        },
        {
          id: 'C3', type: 'grid', short: 'Symptom frequency', text: 'How frequently do you experience gastrointestinal symptoms?', showIf: { q: 'C1', eq: 'Yes' },
          cols: F5, rows: ['Abdominal pain', 'Diarrhea', 'Constipation', 'Nausea', 'Vomiting', 'Bloating', 'Abdominal cramps', 'Loss of appetite']
        },
        { id: 'C4', type: 'radio', short: 'Symptom duration', text: 'How long have you been experiencing these symptoms?', showIf: { q: 'C1', eq: 'Yes' }, options: ['Less than 1 week', '1-4 weeks', '1-3 months', 'More than 3 months', 'Symptoms occur occasionally'] },
        { id: 'C5', type: 'scale', short: 'Symptom severity (0-10)', text: 'How severe are your gastrointestinal symptoms?', showIf: { q: 'C1', eq: 'Yes' }, min: 0, max: 10, low: '0 = none', high: '10 = worst' },
        { id: 'C6', type: 'radio', short: 'Interference with daily activities', text: 'Do your symptoms interfere with your daily activities?', options: A5 },
        { id: 'C7', type: 'radio', short: 'Unexplained weight loss', text: 'Have you experienced unexplained weight loss along with gastrointestinal symptoms?', options: YNN },
        { id: 'C8', type: 'radio', short: 'Tiredness / weakness', text: 'Have you experienced unusual tiredness or weakness along with digestive symptoms?', options: ['Yes', 'No', 'Sometimes'] },
        { id: 'C9', type: 'radio', short: 'Mucus in stool', text: 'Have you noticed mucus in your stool?', options: YNN },
        { id: 'C10', type: 'radio', short: 'Blood in stool', text: 'Have you noticed blood in your stool?', options: YNN },
        { id: 'C11', type: 'radio', short: 'Unusual stool appearance', text: 'Have you noticed any unusual change in your stool appearance?', options: YNN },
        { id: 'C12', type: 'radio', short: 'Recurrent symptoms', text: 'Have you experienced recurrent gastrointestinal symptoms?', options: YNN },
        { id: 'C13', type: 'radio', short: 'Recurrence frequency', text: 'If yes, how often do these symptoms recur?', options: ['Once a month or less', '2-3 times a month', 'Several times a week', 'Occasionally', NA] },
        { id: 'C14', type: 'radio', short: 'Symptoms come and go', text: 'Do your gastrointestinal symptoms occur repeatedly or come and go?', options: YNN }
      ]
    },
    {
      id: 'D', title: 'Water & Food Exposure', questions: [
        { id: 'D1', type: 'radio', short: 'Main drinking water source', text: 'What is your main source of drinking water?', options: ['Tap water', 'Filtered water', 'Boiled water', 'Bottled water', 'Other'] },
        { id: 'D2', type: 'radio', short: 'Treats drinking water', text: 'Do you treat your drinking water before consumption?', options: ['Always', 'Sometimes', 'Never'] },
        { id: 'D3', type: 'checkbox', short: 'Water treatment method', text: 'What method do you usually use to treat drinking water?', options: ['Boiling', 'Water filter', 'Water purification tablets', 'Bottled water', 'None', 'Other'] },
        { id: 'D4', type: 'radio', short: 'Eats raw / undercooked food', text: 'Do you eat raw or insufficiently cooked food?', options: ['Frequently', 'Sometimes', 'Rarely', 'Never'] },
        { id: 'D5', type: 'checkbox', short: 'Raw / undercooked foods eaten', text: 'Which of the following foods do you commonly consume raw or insufficiently cooked?', showIf: { q: 'D4', neq: 'Never' }, options: ['Raw vegetables/salads', 'Unwashed fruits', 'Undercooked meat', 'Undercooked eggs', 'Street food', 'Other'] },
        { id: 'D6', type: 'radio', short: 'Street food consumption', text: 'How often do you consume food from street vendors?', options: ['Daily', 'Several times a week', 'Once a week', 'Occasionally', 'Never'] },
        { id: 'D7', type: 'grid', short: 'Food safety practices', text: 'How do you usually ensure that food is safe before eating?', cols: A5, rows: ['Wash fruits/vegetables', 'Wash hands before food preparation', 'Keep cooked food covered', 'Refrigerate leftover food', 'Cook meat thoroughly'] }
      ]
    },
    {
      id: 'E', title: 'Personal Hygiene & Food Safety', questions: [
        { id: 'E1', type: 'radio', short: 'Washes fruits & vegetables', text: 'How often do you wash fruits and vegetables before eating?', options: R5 },
        { id: 'E2', type: 'radio', short: 'Washes hands before eating', text: 'How often do you wash your hands before eating?', options: R5 },
        { id: 'E3', type: 'radio', short: 'Washes hands after toilet', text: 'How often do you wash your hands after using the toilet?', options: R5 },
        { id: 'E4', type: 'grid', short: 'Hygiene behaviours', text: 'How frequently do you practice the following food, water and hygiene behaviours?', cols: A5, rows: ['Drink untreated water', 'Consume street food', 'Consume raw/undercooked food', 'Wash fruits and vegetables', 'Wash hands before eating', 'Wash hands after toilet use'] }
      ]
    },
    {
      id: 'F', title: 'Parasitic Infection & Clinical Information', questions: [
        { id: 'F1', type: 'radio', short: 'Diagnosed intestinal/parasitic infection', text: 'Have you ever been diagnosed with an intestinal or parasitic infection?', options: YNN },
        { id: 'F2', type: 'radio', short: 'Stool examination done', text: 'Have you ever undergone a stool examination?', options: YNN },
        { id: 'F3', type: 'radio', short: 'Reason for stool examination', text: 'If you have undergone a stool examination, what was the main reason?', options: ['Diarrhea', 'Abdominal pain', 'Suspected parasitic infection', 'Routine medical investigation', 'Other', NA] },
        { id: 'F4', type: 'radio', short: 'Parasites detected', text: 'Were any intestinal parasites detected in your stool examination?', options: ['Yes', 'No', "Don't know", NA] },
        { id: 'F5', type: 'radio', short: 'Received treatment', text: 'If a parasitic infection was diagnosed, did you receive treatment?', options: ['Yes', 'No', "Don't remember", NA] },
        { id: 'F6', type: 'radio', short: 'Improvement after treatment', text: 'Did your gastrointestinal symptoms improve after treatment?', options: ['Yes', 'No', 'Partially', "Don't remember", NA] }
      ]
    },
    {
      id: 'G', title: 'Environmental & Animal Exposure', questions: [
        { id: 'G1', type: 'radio', short: 'Contact with soil', text: 'How frequently do you come into contact with soil?', options: ['Frequently', 'Sometimes', 'Rarely', 'Never'] },
        { id: 'G2', type: 'radio', short: 'Walks barefoot outdoors', text: 'How often do you walk barefoot outdoors?', options: ['Frequently', 'Sometimes', 'Rarely', 'Never'] },
        { id: 'G3', type: 'radio', short: 'Contact with domestic animals', text: 'Do you regularly come into contact with domestic animals?', options: YN },
        { id: 'G4', type: 'checkbox', short: 'Animals contacted', text: 'If yes, which animals do you commonly come into contact with?', showIf: { q: 'G3', eq: 'Yes' }, options: ['Dogs', 'Cats', 'Cattle', 'Goats', 'Sheep', 'Poultry', 'Other'] }
      ]
    },
    {
      id: 'H', title: 'Medical & Overall Digestive Health', questions: [
        { id: 'H1', type: 'radio', short: 'Other GI disorder diagnosed', text: 'Have you ever been diagnosed with another gastrointestinal disorder?', options: YNN },
        { id: 'H2', type: 'radio', short: 'Used medication/home remedy', text: 'Have you used any medication or home remedy for gastrointestinal symptoms during the past 3 months?', options: ['Yes', 'No', "Don't remember"] },
        { id: 'H3', type: 'checkbox', short: 'Type of treatment used', text: 'If yes, what type of treatment did you use?', showIf: { q: 'H2', eq: 'Yes' }, options: ['Antacid', 'Antibiotic', 'Antiparasitic medicine', 'Antidiarrheal medicine', 'Laxative', 'Herbal/home remedy', 'Other'] },
        { id: 'H4', type: 'scale', short: 'Overall digestive health (0-10)', text: 'How would you rate your overall digestive health?', min: 0, max: 10, low: '0 = very poor', high: '10 = excellent' },
        { id: 'H5', type: 'scale', short: 'Effect on quality of life (0-10)', text: 'How much do gastrointestinal symptoms affect your quality of life?', min: 0, max: 10, low: '0 = not at all', high: '10 = extremely' }
      ]
    },
    {
      id: 'I', title: 'Additional Information', questions: [
        { id: 'I1', type: 'textarea', optional: true, short: 'Additional comments', text: 'Is there any other gastrointestinal symptom or digestive health concern that you would like to mention?' }
      ]
    }
  ];

  /* flat list of [{key,label}] for one question (grids expand to one key per row) */
  function keysOf(q) {
    if (q.type === 'grid') return q.rows.map(r => ({ key: q.id + '.' + r, label: q.text + ' — ' + r }));
    return [{ key: q.id, label: q.text }];
  }

  /* ---------- individual scoring ---------- */
  const POS = { Always: 4, Often: 3, Sometimes: 2, Rarely: 1, Never: 0, 'Very often': 4 };
  const FREQ4 = { Frequently: 1, Sometimes: 0.67, Rarely: 0.33, Never: 0 };
  const STREET = { Daily: 1, 'Several times a week': 0.75, 'Once a week': 0.5, Occasionally: 0.25, Never: 0 };
  const WATER = { Never: 1, Sometimes: 0.5, Always: 0 };

  function arr(v) { return v && v !== NA ? String(v).split('; ').filter(Boolean) : []; }
  function mean(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null; }

  function compute(a) {
    // hygiene index (higher = better practice)
    const h = [];
    ['E1', 'E2', 'E3'].forEach(k => { if (POS[a[k]] !== undefined) h.push(POS[a[k]] / 4); });
    ['Wash fruits/vegetables', 'Wash hands before food preparation', 'Keep cooked food covered', 'Refrigerate leftover food', 'Cook meat thoroughly']
      .forEach(r => { const v = a['D7.' + r]; if (POS[v] !== undefined) h.push(POS[v] / 4); });
    ['Wash fruits and vegetables', 'Wash hands before eating', 'Wash hands after toilet use']
      .forEach(r => { const v = a['E4.' + r]; if (POS[v] !== undefined) h.push(POS[v] / 4); });
    ['Drink untreated water', 'Consume street food', 'Consume raw/undercooked food']
      .forEach(r => { const v = a['E4.' + r]; if (POS[v] !== undefined) h.push(1 - POS[v] / 4); });
    // exposure index (higher = more risk)
    const e = [];
    if (FREQ4[a.D4] !== undefined) e.push(FREQ4[a.D4]);
    if (STREET[a.D6] !== undefined) e.push(STREET[a.D6]);
    if (FREQ4[a.G1] !== undefined) e.push(FREQ4[a.G1]);
    if (FREQ4[a.G2] !== undefined) e.push(FREQ4[a.G2]);
    if (a.G3 === 'Yes') e.push(1); else if (a.G3 === 'No') e.push(0);
    if (WATER[a.D2] !== undefined) e.push(WATER[a.D2]);

    const hyg = h.length ? Math.round(mean(h) * 100) : null;
    const exp = e.length ? Math.round(mean(e) * 100) : null;
    const hygLevel = hyg === null ? '' : hyg >= 75 ? 'Good' : hyg >= 50 ? 'Moderate' : 'Poor';
    const expLevel = exp === null ? '' : exp >= 60 ? 'High' : exp >= 35 ? 'Moderate' : 'Low';

    const symptomatic = a.C1 === 'Yes';
    const syms = arr(a.C2);
    const sev = symptomatic && a.C5 !== undefined && a.C5 !== NA && a.C5 !== '' ? Number(a.C5) : null;

    const flags = [];
    if (a.C10 === 'Yes') flags.push('blood in stool');
    if (a.C7 === 'Yes') flags.push('unexplained weight loss');
    if (a.C4 === 'More than 3 months') flags.push('symptoms lasting more than 3 months');
    if (sev !== null && sev >= 7) flags.push('high symptom severity (' + sev + '/10)');
    if (a.C9 === 'Yes') flags.push('mucus in stool');

    const parts = [];
    if (symptomatic) parts.push('Reported ' + syms.length + ' gastrointestinal symptom(s)' + (syms.length ? ' (' + syms.join(', ') + ')' : '') + ' in the past 3 months' + (sev !== null ? ', self-rated severity ' + sev + '/10' : '') + '.');
    else parts.push('Reported no gastrointestinal symptoms in the past 3 months.');
    if (hyg !== null) parts.push('Hygiene-practice index ' + hyg + '% (' + hygLevel + '); exposure-risk index ' + exp + '% (' + expLevel + ').');
    if (a.F1 === 'Yes') parts.push('Has previously been diagnosed with an intestinal/parasitic infection.');
    if (flags.length) parts.push('Noted warning features: ' + flags.join(', ') + '. Such features are worth discussing with a doctor.');
    parts.push('This is an automated research summary, not a medical diagnosis.');

    return {
      SCORE_Symptomatic: symptomatic ? 'Yes' : 'No',
      SCORE_SymptomCount: syms.length,
      SCORE_Severity: sev === null ? '' : sev,
      SCORE_HygieneIndex: hyg === null ? '' : hyg,
      SCORE_HygieneLevel: hygLevel,
      SCORE_ExposureIndex: exp === null ? '' : exp,
      SCORE_ExposureLevel: expLevel,
      SCORE_RedFlags: flags.join('; '),
      SCORE_Interpretation: parts.join(' ')
    };
  }

  g.SURVEY = { sections: sections, keysOf: keysOf, NA: NA };
  g.Scoring = { compute: compute };
  if (typeof module !== 'undefined') module.exports = { SURVEY: g.SURVEY, Scoring: g.Scoring };
})(typeof window !== 'undefined' ? window : globalThis);
