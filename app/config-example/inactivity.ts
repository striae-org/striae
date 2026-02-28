export const INACTIVITY_CONFIG = {
  TIMEOUT_MINUTES: 60,  
  WARNING_MINUTES: 5, 
  TRACKED_ACTIVITIES: [
    'mousedown',
    'mousemove', 
    'keypress',
    'scroll',
    'touchstart',
    'click',
    'keydown'
  ] as const
};