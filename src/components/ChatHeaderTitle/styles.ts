import {StyleSheet} from 'react-native';

import type {Theme} from '../../utils/types';

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexShrink: 1,
      minWidth: 0,
      gap: 2,
    },
    title: {
      color: theme.colors.onBackground,
    },
    subtitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minWidth: 0,
    },
    onlineDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.primary,
    },
    subtitle: {
      flexShrink: 1,
      color: theme.colors.onSurfaceVariant,
    },
  });
