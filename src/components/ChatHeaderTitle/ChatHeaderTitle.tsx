import React, {useContext} from 'react';
import {View} from 'react-native';
import {observer} from 'mobx-react';
import {Text} from 'react-native-paper';

import {createStyles} from './styles';
import {
  chatSessionStore,
  enterpriseRuntimeStore,
  modelStore,
  palStore,
} from '../../store';
import {L10nContext} from '../../utils';
import {useTheme} from '../../hooks';

const backendLabel = {
  idle: 'pronto para carregar',
  remote: 'remoto',
  cpu: 'CPU',
  gpu: 'GPU',
  hybrid: 'CPU + GPU',
  unverified: 'acelerador não verificado',
} as const;

export const ChatHeaderTitle: React.FC = observer(() => {
  const l10n = useContext(L10nContext);
  const theme = useTheme();
  const styles = createStyles(theme);
  const activeSessionId = chatSessionStore.activeSessionId;
  const activeSession = chatSessionStore.sessions.find(
    session => session.id === activeSessionId,
  );
  const activeModel = modelStore.activeModel;
  const activePal = chatSessionStore.activePalId
    ? palStore.pals.find(pal => pal.id === chatSessionStore.activePalId)
    : undefined;

  const defaultTitle = l10n.components.chatHeaderTitle.defaultTitle;
  const title = activePal?.name || activeSession?.title || defaultTitle;
  const modelLabel = activeModel?.name ?? 'Nenhum modelo carregado';
  const executionLabel = backendLabel[enterpriseRuntimeStore.effectiveBackend];

  return (
    <View style={styles.container}>
      <Text numberOfLines={1} variant="titleSmall" style={styles.title}>
        {title}
      </Text>
      <View style={styles.subtitleRow}>
        <View style={styles.onlineDot} />
        <Text
          numberOfLines={1}
          variant="bodySmall"
          style={styles.subtitle}>
          {modelLabel} · {executionLabel}
        </Text>
      </View>
    </View>
  );
});
