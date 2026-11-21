import { Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';

const TYPES = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
};

const VIBRATION_PATTERNS = {
  success: [0, 70, 60, 120],
  warning: [0, 60, 80, 60],
  error: [0, 140, 70, 160],
};

export function playFeedback(kind = 'error') {
  const type = TYPES[kind] || TYPES.error;
  const fallback = () => {
    try {
      Vibration.vibrate(VIBRATION_PATTERNS[kind] || VIBRATION_PATTERNS.error);
    } catch (error) {
      // Vibration can be unavailable in simulators; the visual overlay remains the cue.
    }
  };

  try {
    const result = Haptics.notificationAsync(type);
    if (result && typeof result.catch === 'function') {
      result.catch(fallback);
    }
  } catch (error) {
    fallback();
  }
}
