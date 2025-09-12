export const RATING_EMOJIS = {
  6: { emoji: "🤩", label: "Masterpiece" },
  5: { emoji: "😍", label: "Amazing" },
  4: { emoji: "😄", label: "Great" },
  3: { emoji: "🙂", label: "Good" },
  2: { emoji: "😐", label: "Okay" },
  1: { emoji: "😕", label: "Bad" },
  0: { emoji: "🤢", label: "Awful" },
};

export const CONTENT_RATINGS = {
  'E': {
    label: 'Everyone',
    description: 'All ages; may include cartoon violence or comic mischief.'
  },
  'T': {
    label: 'Teen',
    description: 'Age 12+, may include mild violence/language/suggestive content.'
  },
  'T+': {
    label: 'Teen Plus',
    description: 'Age 15+, moderate violence, graphic content.'
  },
  'M': {
    label: 'Mature',
    description: 'Age 17+, intense violence, explicit themes.'
  }
};

export type ContentRating = keyof typeof CONTENT_RATINGS;