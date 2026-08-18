import {StyleSheet} from 'react-native';
import {Theme} from '../../utils/types';
import {EdgeInsets} from 'react-native-safe-area-context';

export const createStyles = ({
  theme,
  insets,
  headerHeight,
}: {
  theme: Theme;
  insets: EdgeInsets;
  headerHeight: number;
}) =>
  StyleSheet.create({
    container: {
      height: headerHeight,
      paddingTop: insets.top,
      paddingHorizontal: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flexShrink: 1,
      minWidth: 0,
    },
    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 4,
      flexShrink: 0,
    },
    menuIcon: {
      height: 44,
      width: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerWithoutDivider: {
      elevation: 0,
      shadowOpacity: 0,
      borderBottomWidth: 0,
      borderBottomColor: 'transparent',
      backgroundColor: theme.colors.surface,
    },
    headerWithDivider: {
      elevation: 0,
      shadowOpacity: 0,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline,
      backgroundColor: theme.colors.surface,
    },
  });
