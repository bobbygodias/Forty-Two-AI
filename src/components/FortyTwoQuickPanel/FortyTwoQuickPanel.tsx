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

const requestedLabels: Record<EnterpriseRequestedBackend, string> = {
  auto: 'Automático',
  cpu: 'CPU',
  gpu: 'Vulkan',
  hybrid: 'Híbrido',
};

const effectiveLabels: Record<EnterpriseEffectiveBackend, string> = {
  idle: 'Sem modelo',
  remote: 'Remoto',
  cpu: 'CPU',
  gpu: 'Vulkan',
  hybrid: 'CPU + Vulkan',
  unverified: 'Aceleração não verificada',
};

const options: Array<{
  id: EnterpriseRequestedBackend;
  icon: string;
  description: string;
}> = [
  {
    id: 'auto',
    icon: 'auto-fix',
    description: 'Escolhe o caminho seguro disponível para este modelo.',
  },
  {
    id: 'cpu',
    icon: 'memory',
    description: 'Fallback ARM estável e previsível.',
  },
  {
    id: 'gpu',
    icon: 'expansion-card-variant',
    description: 'Solicita offload Vulkan quando o runtime realmente expõe a GPU.',
  },
  {
    id: 'hybrid',
    icon: 'swap-horizontal-bold',
    description: 'Combina CPU e GPU quando a divisão é suportada.',
  },
];

const statusColor = (backend: EnterpriseEffectiveBackend, theme: Theme) => {
  switch (backend) {
    case 'gpu':
    case 'hybrid':
      return theme.colors.tertiary;
    case 'cpu':
      return theme.colors.secondary;
    case 'remote':
      return theme.colors.primary;
    case 'unverified':
      return theme.colors.error;
    default:
      return theme.colors.outlineVariant;
  }
};

export const FortyTwoQuickPanel: React.FC = observer(() => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {width, height} = useWindowDimensions();
  const [visible, setVisible] = React.useState(false);
  const [isApplying, setIsApplying] = React.useState(false);

  React.useEffect(() => {
    enterpriseRuntimeStore.refresh().catch(() => {
      // Diagnostics stay in store state; chat must remain available.
    });
  }, []);

  const styles = React.useMemo(
    () => createStyles(theme, width, height, insets.top, insets.bottom),
    [theme, width, height, insets.top, insets.bottom],
  );

  const activeModel = modelStore.activeModel;
  const isRemoteModel = activeModel?.origin === ModelOrigin.REMOTE;
  const requested = enterpriseRuntimeStore.requestedBackend;
  const effective = enterpriseRuntimeStore.effectiveBackend;
  const color = statusColor(effective, theme);
  const compact = width < 760;

  const applyRequestedBackend = async () => {
    if (!activeModel || isRemoteModel) {
      return;
    }

    setIsApplying(true);
    try {
      await modelStore.releaseContext();
      await modelStore.initContext(activeModel);
      await enterpriseRuntimeStore.refresh();
    } catch (error) {
      console.error('[FortyTwoQuickPanel] Failed to reload model:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const physicalGpu =
    enterpriseRuntimeStore.gpuInfo?.renderer || 'Não identificada';
  const runtimeGpu =
    enterpriseRuntimeStore.gpuBackendDevice?.deviceName ||
    'Não exposta pelo runtime';
  const effectiveLayers = enterpriseRuntimeStore.effectiveGpuLayers;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir painel rápido do Forty-Two AI"
        onPress={() => setVisible(true)}
        style={({pressed}) => [styles.pill, pressed && styles.pressed]}>
        <View style={[styles.dot, {backgroundColor: color}]} />
        {!compact ? (
          <Text numberOfLines={1} style={styles.pillText}>
            {effectiveLabels[effective]}
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
              <View style={styles.titleBlock}>
                <Text variant="titleLarge">Forty-Two AI</Text>
                <Text variant="bodySmall" style={styles.muted}>
                  Painel rápido · execução local
                </Text>
              </View>
              <IconButton
                icon="close"
                accessibilityLabel="Fechar painel rápido"
                onPress={() => setVisible(false)}
              />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.content}>
              <View style={styles.heroCard}>
                <Text variant="labelMedium" style={styles.eyebrow}>
                  MODELO ATIVO
                </Text>
                <Text variant="titleMedium" numberOfLines={2}>
                  {activeModel?.name ?? 'Nenhum modelo carregado'}
                </Text>

                <View style={styles.effectiveBadge}>
                  <View style={[styles.dot, {backgroundColor: color}]} />
                  <Text variant="labelLarge">
                    Efetivo: {effectiveLabels[effective]}
                  </Text>
                </View>

                <View style={styles.metrics}>
                  <Metric label="Contexto" value={modelStore.contextInitParams.n_ctx} />
                  <Metric label="Threads" value={modelStore.contextInitParams.n_threads} />
                  <Metric
                    label="GPU real"
                    value={
                      effectiveLayers === null ? '—' : String(effectiveLayers)
                    }
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text variant="titleMedium">Execução</Text>
                <Text variant="bodySmall" style={styles.muted}>
                  Solicitado e efetivo permanecem separados. A interface não
                  chama uma GPU de ativa só porque ela foi detectada.
                </Text>
              </View>

              <View style={styles.grid}>
                {options.map(option => {
                  const selected = requested === option.id;
                  const needsGpu = option.id === 'gpu' || option.id === 'hybrid';
                  const disabled =
                    needsGpu && !enterpriseRuntimeStore.gpuBackendAvailable;

                  return (
                    <Pressable
                      key={option.id}
                      accessibilityRole="button"
                      accessibilityState={{selected, disabled}}
                      disabled={disabled}
                      onPress={() =>
                        enterpriseRuntimeStore.setRequestedBackend(option.id)
                      }
                      style={({pressed}) => [
                        styles.option,
                        selected && styles.optionSelected,
                        disabled && styles.disabled,
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
                      <Text variant="labelLarge">
                        {requestedLabels[option.id]}
                      </Text>
                      <Text variant="bodySmall" style={styles.muted}>
                        {option.description}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.diagnostics}>
                <View style={styles.diagnosticTitle}>
                  <Icon name="chip" size={20} color={theme.colors.tertiary} />
                  <Text variant="titleMedium">Diagnóstico rápido</Text>
                </View>
                <Diagnostic label="GPU física" value={physicalGpu} />
                <Diagnostic label="GPU do runtime" value={runtimeGpu} />
                <Diagnostic
                  label="Solicitado"
                  value={requestedLabels[requested]}
                />
                <Diagnostic
                  label="Efetivo"
                  value={effectiveLabels[effective]}
                />
                <Diagnostic
                  label="Camadas efetivas"
                  value={
                    effectiveLayers === null
                      ? 'Telemetria pendente'
                      : String(effectiveLayers)
                  }
                />
              </View>

              {enterpriseRuntimeStore.requiresModelReload ? (
                <View style={styles.notice}>
                  <Icon
                    name="reload-alert"
                    size={20}
                    color={theme.colors.onTertiaryContainer}
                  />
                  <Text variant="bodySmall" style={styles.noticeText}>
                    O perfil solicitado mudou. O modelo atual ainda usa a
                    configuração anterior.
                  </Text>
                </View>
              ) : null}

              {enterpriseRuntimeStore.lastError ? (
                <Text variant="bodySmall" style={styles.error}>
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
                onPress={applyRequestedBackend}>
                Recarregar e aplicar
              </Button>

              <Button
                mode="text"
                icon="refresh"
                loading={enterpriseRuntimeStore.isRefreshing}
                disabled={enterpriseRuntimeStore.isRefreshing}
                onPress={() => enterpriseRuntimeStore.refresh().catch(() => {})}>
                Atualizar diagnóstico
              </Button>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
});

const Metric = ({label, value}: {label: string; value: string | number}) => (
  <View style={metricStyles.item}>
    <Text variant="labelSmall" style={metricStyles.label}>
      {label}
    </Text>
    <Text variant="bodyMedium" numberOfLines={1}>
      {String(value)}
    </Text>
  </View>
);

const Diagnostic = ({label, value}: {label: string; value: string}) => (
  <View style={metricStyles.diagnosticRow}>
    <Text variant="bodySmall" style={metricStyles.label}>
      {label}
    </Text>
    <Text variant="bodyMedium" numberOfLines={2} style={metricStyles.value}>
      {value}
    </Text>
  </View>
);

const metricStyles = StyleSheet.create({
  item: {flex: 1, minWidth: 0, gap: 3},
  label: {opacity: 0.62},
  diagnosticRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  value: {flex: 1, textAlign: 'right'},
});

const createStyles = (
  theme: Theme,
  width: number,
  height: number,
  insetTop: number,
  insetBottom: number,
) => {
  const panelWidth = Math.min(
    500,
    Math.max(330, width >= 900 ? width * 0.38 : width * 0.9),
  );

  return StyleSheet.create({
    pill: {
      minHeight: 40,
      maxWidth: 220,
      paddingHorizontal: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    pillText: {color: theme.colors.onSurfaceVariant, flexShrink: 1},
    dot: {width: 8, height: 8, borderRadius: 4},
    pressed: {opacity: 0.72},
    disabled: {opacity: 0.38},
    backdrop: {
      width,
      height,
      backgroundColor: 'rgba(0, 0, 0, 0.72)',
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
      borderLeftWidth: 1,
      borderColor: theme.colors.outlineVariant,
      overflow: 'hidden',
    },
    panelHeader: {
      minHeight: 76,
      paddingLeft: 22,
      paddingRight: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderColor: theme.colors.outlineVariant,
    },
    titleBlock: {flexShrink: 1},
    content: {padding: 20, gap: 18, paddingBottom: 40},
    muted: {color: theme.colors.onSurfaceVariant},
    eyebrow: {
      color: theme.colors.tertiary,
      letterSpacing: 1.1,
    },
    heroCard: {
      padding: 18,
      gap: 12,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surface,
    },
    effectiveBadge: {
      alignSelf: 'flex-start',
      minHeight: 32,
      paddingHorizontal: 11,
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceVariant,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    metrics: {flexDirection: 'row', gap: 14},
    section: {gap: 4},
    grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
    option: {
      width: '48%',
      minHeight: 128,
      padding: 14,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surface,
      gap: 7,
    },
    optionSelected: {
      borderColor: theme.colors.tertiary,
      backgroundColor: theme.colors.primaryContainer,
    },
    diagnostics: {
      padding: 18,
      gap: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surface,
    },
    diagnosticTitle: {flexDirection: 'row', alignItems: 'center', gap: 8},
    notice: {
      padding: 14,
      borderRadius: 16,
      backgroundColor: theme.colors.tertiaryContainer,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    noticeText: {flex: 1, color: theme.colors.onTertiaryContainer},
    error: {color: theme.colors.error},
  });
};
