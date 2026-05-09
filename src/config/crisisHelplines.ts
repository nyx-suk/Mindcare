export type Helpline = {
  name: string;
  number: string;
  description: string;
};

export type HelplineConfig = Record<string, Helpline[]>;

export const helplines: HelplineConfig = {
  IN: [
    { name: 'iCall', number: '9152987821', description: 'TISS iCall - Free counselling' },
    { name: 'NIMHANS', number: '080-46110007', description: 'NIMHANS Helpline' },
  ],
  US: [
    { name: '988 Suicide & Crisis Lifeline', number: '988', description: 'Call or text 988' },
  ],
  GB: [
    { name: 'Samaritans', number: '116 123', description: 'Free, 24/7' },
  ],
  AU: [
    { name: 'Lifeline', number: '13 11 14', description: '24/7 crisis support' },
  ],
  DEFAULT: [
    { name: 'Crisis Text Line', number: '741741', description: 'Text HOME to 741741' },
  ],
};
