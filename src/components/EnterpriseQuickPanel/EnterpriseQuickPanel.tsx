import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {observer} from 'mobx-react';
import {Button, IconButton, Text} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useTheme} from '../../hooks';
import {
  enterpriseRuntimeStore,
  type EnterpriseEffectiveBackend,
  type EnterpriseRequestedBackend,
  modelStore,
} from '../../store';
import {ModelOrigin, type Theme} from '../../utils/types';
import {Surface} from '../ui';

const requestedBackendLabels: Record<EnterpriseRequestedBackend, string> = {
  auto: 'Automático',
  cpu: 'CPU',
  gpu: 'GPU',
  hybrid: 'Híbrido',
};

const effectiveBackendLabels: Record<EnterpriseEffectiveBackend, string> = {
  idle: 'Sem modelo',
  remote: 'Remoto',
  cpu: 'CPU',
  gpu: 'GPU',
  hybrid: 'Híbrido',
  unverified: 'Acelerador não verificado',
};

const backendOptions: Array<{
  id: EnterpriseRequestedBackend;
  icon: string;
  description: string;
}> = [
  {
    id: 'auto',
    icon: 'auto-fix',
    description: 'Deixa o motor escolher o backend disponível.',
  },
  {
    id: 'cpu',
    icon: 'memory',
    description: 'Caminho estável pelos núcleos ARM.',
  },
  {
    id: 'gpu',
    icon: 'expansion-card-variant',
    description: 'Tenta descarregar o máximo possível na GPU.',
  },
  {
    id: 'hybrid',
    icon: 'swap-horizontal-bold',
    description: 'Divide as camadas entre CPU e GPU.',
  },
];

const backendStatusColor = (
  backend: EnterpriseEffectiveBackend,
  theme: Theme,
): string => {
  switch (backend) {
    case 'gpu':
    case 'hybrid':
      return theme.colors.primary;
    case 'remote':
      return theme.colors.tertiary;
    case 'unverified':
      return theme.colors.error;
    case 'cpu':
      return theme.colors.secondary;
    default:
      return theme.colors.outline;
  }
};

export const EnterpriseQuickPanel: React.FC = observer(() => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {width, height} = useWindowDimensions();
  const [visible, setVisible] = React.useState(false);
  const [isApplying, setIsApplying] = React.useState(false);

  React.useEffect(() => {
    enterpriseRuntimeStore.refresh().catch(() => {
      // The store records diagnostics; the chat header must remain usable.
    });
  }, []);

  const styles = React.useMemo(
    () => createStyles(theme, width, height, insets.top, insets.bottom),
    [theme, width, height, insets.top, insets.bottom],
  );

  const requestedBackend = enterpriseRuntimeStore.requestedBackend;
  const effectiveBackend = enterpriseRuntimeStore.effectiveBackend;
  const activeModel = modelStore.activeModel;
  const isRemoteModel = activeModel?.origin === ModelOrigin.REMOTE;
  const compactHeader = width < 760;
  const statusColor = backendStatusColor(effectiveBackend, theme);

  const handleSelectBackend = (backend: EnterpriseRequestedBackend) => {
    enterpriseRuntimeStore.setRequestedBackend(backend);
  };

  const handleApply = async () => {
    if (!activeModel || isRemoteModel) {
      return;
    }

    setIsApplying(true);
    try {
      // A backend change must create a genuinely new native context.
      // reinitializeContext() currently short-circuits when the same model is
      // already active, so release first and then initialize explicitly.
      await modelStore.releaseContext();
      await modelStore.initContext(activeModel);
      await enterpriseRuntimeStore.refresh();
    } catch (error) {
      console.error('[EnterpriseQuickPanel] Failed to reload model:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const effectiveLayers = enterpriseRuntimeStore.effectiveGpuLayers;
  const backendDeviceName =
    enterpriseRuntimeStore.gpuBackendDevice?.deviceName ??
    'Indisponível nesta build';
  const physicalGpuName =
    enterpriseRuntimeStore.gpuInfo?.renderer || 'Não identificada';

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir painel rápido da Enterprise"
        onPress={() => setVisible(true)}
        style={({pressed}) => [styles.statusPill, pressed && styles.pressed]}>
        <View style={[styles.statusDot, {backgroundColor: statusColor}]} />
        {!compactHeader ? (
          <Text numberOfLines={1} style={styles.statusText}>
            {effectiveBackendLabels[effectiveBackend]}
          </Text>
        ) : null}
        <Icon
          name="tune-variant"
          size={18}
          color={theme.colors.onSurfaceVariant}
        />
      </Pressable>

      <Modal
        animationType="fade"
        transparent
        statusBarTranslucent
        navigationBarTranslucent
        visible={visible}
        onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <Pressable
            style={styles.panel}
            onPress={event => event.stopPropagation()}>
            <View style={styles.panelHeader}>
              <View style={styles.panelTitleBlock}>
                <Text variant="titleLarge">Enterprise</Text>
                <Text variant="bodySmall" style={styles.mutedText}>
                  Controle rápido do MEGA 3
                </Text>
              </View>
              <IconButton
                icon="close"
                accessibilityLabel="Fechar painel"
                onPress={() => setVisible(false)}
              />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.panelContent}>
              <Surface style={styles.summaryCard} elevation={0}>
                <View style={styles.summaryTopRow}>
                  <View style={styles.summaryTextBlock}>
                    <Text variant="labelMedium" style={styles.mutedText}>
                      MODELO ATIVO
                    </Text>
                    <Text variant="titleMedium" numberOfLines={2}>
                      {activeModel?.name ?? 'Nenhum modelo carregado'}
                    </Text>
                  </View>
                  <View style={styles.backendBadge}>
                    <View
                      style={[styles.statusDot, {backgroundColor: statusColor}]}
                    />
                    <Text variant="labelMedium">
                      {effectiveBackendLabels[effectiveBackend]}
                    </Text>
                  </View>
                </View>

                <View style={styles.metricRow}>
                  <View style={styles.metric}>
                    <Text variant="labelSmall" style={styles.mutedText}>
                      Contexto
                    </Text>
                    <Text variant="bodyMedium">
                      {modelStore.contextInitParams.n_ctx}
                    </Text>
                  </View>
                  <View style={styles.metric}>
                    <Text variant="labelSmall" style={styles.mutedText}>
                      Threads
                    </Text>
                    <Text variant="bodyMedium">
                      {modelStore.contextInitParams.n_threads}
                    </Text>
                  </View>
                  <View style={styles.metric}>
                    <Text variant="labelSmall" style={styles.mutedText}>
                      Camadas pedidas
                    </Text>
                    <Text variant="bodyMedium">
                      {enterpriseRuntimeStore.requestedGpuLayers}
                    </Text>
                  </View>
                </View>
              </Surface>

              <View style={styles.sectionHeader}>
                <Text variant="titleMedium">Backend solicitado</Text>
                <Text variant="bodySmall" style={styles.mutedText}>
                  A alteração passa a valer após recarregar o modelo.
                </Text>
              </View>

              <View style={styles.backendGrid}>
                {backendOptions.map(option => {
                  const selected = requestedBackend === option.id;
                  const requiresGpu =
                    option.id === 'gpu' || option.id === 'hybrid';
                  const disabled =
                    requiresGpu && !enterpriseRuntimeStore.gpuBackendAvailable;

                  return (
                    <Pressable
                      key={option.id}
                      accessibilityRole="button"
                      accessibilityState={{selected, disabled}}
                      disabled={disabled}
                      onPress={() => handleSelectBackend(option.id)}
                      style={({pressed}) => [
                        styles.backendOption,
                        selected && styles.backendOptionSelected,
                        disabled && styles.backendOptionDisabled,
                        pressed && !disabled && styles.pressed,
                      ]}>
                      <Icon
                        name={option.icon}
                        size={22}
                        color={
                          selected
                            ? theme.colors.onPrimaryContainer
                            : theme.colors.onSurfaceVariant
                        }
                      />
                      <Text
                        variant="labelLarge"
                        style={
                          selected
                            ? styles.backendOptionSelectedText
                            : undefined
                        }>
                        {requestedBackendLabels[option.id]}
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={[
                          styles.backendDescription,
                          selected && styles.backendOptionSelectedText,
                        ]}>
                        {option.description}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Surface style={styles.diagnosticCard} elevation={0}>
                <View style={styles.diagnosticTitleRow}>
                  <Icon name="chip" size={22} color={theme.colors.primary} />
                  <Text variant="titleMedium">Diagnóstico do acelerador</Text>
                </View>

                <View style={styles.diagnosticRow}>
                  <Text variant="bodySmall" style={styles.mutedText}>
                    GPU física detectada
                  </Text>
                  <Text variant="bodyMedium" style={styles.diagnosticValue}>
                    {physicalGpuName}
                  </Text>
                </View>
                <View style={styles.diagnosticRow}>
                  <Text variant="bodySmall" style={styles.mutedText}>
                    Backend de inferência GPU
                  </Text>
                  <Text variant="bodyMedium" style={styles.diagnosticValue}>
                    {backendDeviceName}
                  </Text>
                </View>
                <View style={styles.diagnosticRow}>
                  <Text variant="bodySmall" style={styles.mutedText}>
                    Backend solicitado
                  </Text>
                  <Text variant="bodyMedium" style={styles.diagnosticValue}>
                    {requestedBackendLabels[requestedBackend]}
                  </Text>
                </View>
                <View style={styles.diagnosticRow}>
                  <Text variant="bodySmall" style={styles.mutedText}>
                    Backend efetivo
                  </Text>
                  <Text variant="bodyMedium" style={styles.diagnosticValue}>
                    {effectiveBackendLabels[effectiveBackend]}
                  </Text>
                </View>
                <View style={styles.diagnosticRow}>
                  <Text variant="bodySmall" style={styles.mutedText}>
                    Camadas efetivamente descarregadas
                  </Text>
                  <Text variant="bodyMedium" style={styles.diagnosticValue}>
                    {effectiveLayers === null
                      ? 'Telemetria nativa pendente'
                      : effectiveLayers}
                  </Text>
                </View>
              </Surface>

              {enterpriseRuntimeStore.requiresModelReload ? (
                <Surface style={styles.reloadNotice} elevation={0}>
                  <Icon
                    name="reload-alert"
                    size={20}
                    color={theme.colors.onTertiaryContainer}
                  />
                  <Text variant="bodySmall" style={styles.reloadNoticeText}>
                    O preset foi alterado, mas o modelo atual ainda usa as
                    configurações anteriores.
                  </Text>
                </Surface>
              ) : null}

              {enterpriseRuntimeStore.lastError ? (
                <Text variant="bodySmall" style={styles.errorText}>
                  {enterpriseRuntimeStore.lastError}
                </Text>
              ) : null}

              <Button
                mode="contained"
                icon="reload"
                loading={isApplying || modelStore.isContextLoading}
                disabled={
                  !activeModel ||
                  isRemoteModel ||
                  !enterpriseRuntimeStore.requiresModelReload ||
                  isApplying ||
                  modelStore.isContextLoading
                }
                onPress={handleApply}>
                Recarregar modelo e aplicar
              </Button>

              <Button
                mode="text"
                icon="refresh"
                loading={enterpriseRuntimeStore.isRefreshing}
                disabled={enterpriseRuntimeStore.isRefreshing}
                onPress={() => {
                  enterpriseRuntimeStore.refresh().catch(() => {
                    // Diagnostics are rendered from store state.
                  });
                }}>
                Atualizar diagnóstico
              </Button>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
});

const createStyles = (
  theme: Theme,
  width: number,
  height: number,
  insetTop: number,
  insetBottom: number,
) => {
  const panelWidth = Math.min(
    480,
    Math.max(320, width >= 900 ? width * 0.36 : width * 0.88),
  );

  return StyleSheet.create({
    statusPill: {
      minHeight: 36,
      maxWidth: 220,
      paddingHorizontal: 12,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surfaceVariant,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusText: {
      color: theme.colors.onSurfaceVariant,
      flexShrink: 1,
    },
    pressed: {
      opacity: 0.72,
    },
    backdrop: {
      width,
      height,
      backgroundColor: 'rgba(0, 0, 0, 0.68)',
      alignItems: 'flex-end',
    },
    panel: {
      width: panelWidth,
      height,
      paddingTop: insetTop,
      paddingBottom: insetBottom,
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 28,
      borderBottomLeftRadius: 28,
      overflow: 'hidden',
      borderLeftWidth: 1,
      borderColor: theme.colors.outlineVariant,
    },
    panelHeader: {
      minHeight: 72,
      paddingLeft: 22,
      paddingRight: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderColor: theme.colors.outlineVariant,
    },
    panelTitleBlock: {
      flexShrink: 1,
    },
    panelContent: {
      padding: 20,
      gap: 18,
      paddingBottom: 36,
    },
    mutedText: {
      color: theme.colors.onSurfaceVariant,
    },
    summaryCard: {
      borderRadius: 22,
      padding: 18,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      gap: 18,
    },
    summaryTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    summaryTextBlock: {
      flex: 1,
      gap: 4,
    },
    backendBadge: {
      minHeight: 32,
      paddingHorizontal: 10,
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceVariant,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    metricRow: {
      flexDirection: 'row',
      gap: 10,
    },
    metric: {
      flex: 1,
      minWidth: 0,
      padding: 12,
      borderRadius: 14,
      backgroundColor: theme.colors.surfaceVariant,
      gap: 3,
    },
    sectionHeader: {
      gap: 4,
    },
    backendGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    backendOption: {
      width: '48%',
      minHeight: 128,
      padding: 14,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surface,
      gap: 7,
    },
    backendOptionSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primaryContainer,
    },
    backendOptionSelectedText: {
      color: theme.colors.onPrimaryContainer,
    },
    backendOptionDisabled: {
      opacity: 0.38,
    },
    backendDescription: {
      color: theme.colors.onSurfaceVariant,
      lineHeight: 17,
    },
    diagnosticCard: {
      padding: 18,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      gap: 13,
    },
    diagnosticTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      marginBottom: 3,
    },
    diagnosticRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 16,
    },
    diagnosticValue: {
      flex: 1,
      textAlign: 'right',
    },
    reloadNotice: {
      padding: 14,
      borderRadius: 16,
      backgroundColor: theme.colors.tertiaryContainer,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    reloadNoticeText: {
      flex: 1,
      color: theme.colors.onTertiaryContainer,
    },
    errorText: {
      color: theme.colors.error,
    },
  });
};
