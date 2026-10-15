/* FixMe renderer. System data and actions come from the preload bridge. */
const TRANSLATIONS = {
    "pt": {
        "statusTitle": "Pronto para analisar",
        "statusSubtitle": "Execute uma análise para verificar o sistema.",
        "scanBtnLabel": "Analisar",
        "hwSectionTitle": "Hardware",
        "hwLiveLabel": "Ao vivo",
        "ramLabel": "Memória RAM",
        "appsSectionTitle": "Apps em execução",
        "appsViewAll": "Atualizar",
        "activitySectionTitle": "Atividade da sessão",
        "aiPanelTitle": "Análise IA",
        "aiPanelSubtitle": "Diagnóstico inteligente",
        "aiIdleText": "Clique em \"Analisar\" para iniciar um diagnóstico completo do seu sistema",
        "aiStep1Title": "Coletando dados",
        "aiStep1Desc": "Informações do sistema",
        "aiStep2Title": "Verificando o sistema",
        "aiStep2Desc": "Diagnóstico do Windows",
        "aiStep3Title": "Consultando modelo local",
        "aiStep3Desc": "Histórico de uso",
        "aiStep4Title": "Diagnóstico IA",
        "aiStep4Desc": "Gerando recomendações",
        "aiActionLabel": "Iniciar análise",
        "mlSectionTitle": "Inteligência local",
        "mlPredLabel": "Recomendações locais",
        "mlModelLabel": "Dados do modelo",
        "mlUsageLabel": "Uso de hoje",
        "mlSamplesLbl": "Amostras reais",
        "mlEffectLbl": "Resultado médio",
        "mlHPerf": "High Performance",
        "mlClearRam": "Limpeza de RAM",
        "mlDiag": "Diagnóstico",
        "mlApplyBtn": "Aplicar recomendação",
        "mlNoData": "O modelo ainda precisa de dados reais de utilização.",
        "mlTraining": "Modelo em treinamento",
        "aiHealthy": "Verificação concluída",
        "aiNoIssues": "O diagnóstico não encontrou problemas nas verificações executadas.",
        "aiOverall": "Avaliação da IA",
        "aiMLPred": "Recomendações do modelo local",
        "aiAnalyzing": "Analisando...",
        "aiNewAnalysis": "Nova análise",
        "aiConfHeader": "Dados da análise",
        "aiIssuesLbl": "Problemas",
        "aiFixedLbl": "Recomendações",
        "su-tagline": "Inicializando análise do sistema...",
        "su-s1-lbl": "Detectando hardware",
        "su-s2-lbl": "Recursos do sistema",
        "su-s3-lbl": "Diagnóstico rápido",
        "su-s4-lbl": "ML Engine",
        "su-enter-lbl": "Abrir Dashboard",
        "su-score-lbl": "Saúde do Sistema",
        "type.high_performance": "Plano High Performance",
        "type.clear_ram": "Limpeza de RAM",
        "type.process_priority": "Prioridade de Processo",
        "type.game_optimization": "Otimização de Jogo",
        "type.diagnostico": "Diagnóstico",
        "mlModelActive": "Modelo ativo",
        "mlModelTraining": "Modelo em treinamento",
        "appsNone": "Nenhum aplicativo em execução encontrado.",
        "appsLoadingTxt": "Carregando apps em execução...",
        "activityNow": "Agora",
        "winoptSectionTitle": "Otimizações do Windows",
        "winoptBundleBtnLabel": "Aplicar ajustes básicos",
        "basicBundleInfo": "O conjunto básico ajusta efeitos visuais e plano de energia. Os demais ajustes são individuais.",
        "wocVisualTitle": "Efeitos Visuais",
        "wocVisualDesc": "Desativa animações e transparências",
        "wocServicesTitle": "Serviços em segundo plano",
        "wocServicesDesc": "Ajusta serviços opcionais do Windows",
        "wocTelemetryTitle": "Telemetria",
        "wocTelemetryDesc": "Ajusta configurações de telemetria do Windows",
        "wocPowerTitle": "Plano de Energia",
        "wocPowerDesc": "Ultimate Performance",
        "wocNetworkTitle": "Rede / TCP",
        "wocNetworkDesc": "Desativa Nagle, otimiza TCP",
        "wocSchedulerTitle": "Scheduler / MMCSS",
        "wocSchedulerDesc": "Timer de alta resolução",
        "wocPoliciesTitle": "Políticas do Windows",
        "wocPoliciesDesc": "Remove atrasos de inicialização",
        "wocGPUTitle": "GPU / HAGS",
        "wocGPUDesc": "Hardware Accelerated GPU Scheduling",
        "wocMemoryTitle": "Memória RAM",
        "wocMemoryDesc": "Limpa somente a memória em espera",
        "winoptKillTitle": "Aplicativos em segundo plano",
        "winoptRefreshLabel": "Atualizar",
        "winoptGameBoostTitle": "Boost para Jogo",
        "winoptGameBoostBtn": "Boost",
        "deepaiSectionTitle": "Análise IA Profunda",
        "deepaiIdleText": "Análise profunda de gargalos, predições e plano de otimização personalizado via Gemini AI.",
        "deepaiBtnRun": "Analisar Profundamente",
        "deepaiBtnBottleneck": "Gargalo Específico",
        "deepaiResultTitle": "Análise Completa",
        "deepaiClearBtn": "Limpar",
        "deepaiRefineBtnLabel": "Perguntar",
        "profileOverlayTitle": "Personalize sua experiência",
        "profileOverlaySubtitle": "Isso ajuda o FixMe a aprender e otimizar melhor para você",
        "profileUsageTypeLabel": "Como você mais usa o PC?",
        "profileUsageGamerLbl": "Jogos",
        "profileUsageTrabalhoLbl": "Trabalho",
        "profileUsageMistoLbl": "Misto",
        "profilePriorityLabel": "O que é mais importante?",
        "profilePriorityPerformanceLbl": "Desempenho máximo",
        "profilePriorityBalancedLbl": "Equilibrado",
        "profilePriorityQuietLbl": "Silêncio / economia",
        "profileFavoriteAppsLabel": "Apps ou jogos favoritos (opcional)",
        "profileFavoriteAppsPlaceholder": "ex: Valorant, VSCode, Chrome",
        "profilePeakHoursLabel": "Quando você mais usa o PC intensamente?",
        "profilePeakMorningLbl": "Manhã",
        "profilePeakAfternoonLbl": "Tarde",
        "profilePeakEveningLbl": "Noite",
        "profilePeakNightLbl": "Madrugada",
        "profileSaveBtnLbl": "Salvar",
        "profileSkipBtn": "Fechar",
        "profileEditBtnTitle": "Editar perfil",
        "profileSavedToast": "Perfil salvo.",
        "profileErrorToast": "Erro ao salvar perfil",
        "profileRequiredToast": "Selecione uma opção em cada campo obrigatório",
        "gpuNativeOn": "Leitura nativa",
        "gpuNativeOff": "Sem sensor de GPU",
        "navOverview": "Visão geral",
        "navOptimize": "Otimizações",
        "navInsights": "Inteligência",
        "navActivity": "Atividade",
        "pageOverview": "Seu PC, sob controle.",
        "pageSubtitle": "Acompanhe os recursos e encontre o que merece atenção.",
        "pageOptimize": "Ajustes que fazem sentido.",
        "pageOptimizeSubtitle": "Aplique cada ajuste separadamente e acompanhe o resultado.",
        "pageInsights": "Entenda seu desempenho.",
        "pageInsightsSubtitle": "Consulte as recomendações com base nos dados do seu PC.",
        "pageActivity": "O que aconteceu no seu PC.",
        "pageActivitySubtitle": "Acompanhe as ações e os resultados desta sessão.",
        "previewMode": "Prévia da interface",
        "monitoringConnecting": "Conectando ao PC",
        "monitoringLive": "Monitoramento ativo",
        "monitoringOffline": "Monitoramento indisponível",
        "statusPreview": "Explore o FixMe",
        "statusPreviewDetail": "Abra o aplicativo desktop para consultar os dados do seu PC.",
        "statusIssueCount": "{count} pontos merecem atenção",
        "statusIssueSingle": "1 ponto merece atenção",
        "primaryNavigation": "Navegação principal",
        "refreshApps": "Atualizar aplicativos",
        "closeDiagnostics": "Fechar diagnóstico",
        "statusChecked": "Análise concluída",
        "lastChecked": "Verificado às {time}",
        "analysisError": "Não foi possível concluir a análise",
        "analysisUnknown": "A análise não retornou um diagnóstico válido.",
        "refreshAction": "Atualizar",
        "guideTitle": "O próximo passo é seu.",
        "guideDescription": "Investigue primeiro. Aplique apenas os ajustes que fizerem sentido para o seu uso.",
        "shortcutOptimize": "Ajustar o Windows",
        "shortcutOptimizeDesc": "Energia, memória e processos",
        "shortcutInsights": "Entender o desempenho",
        "shortcutInsightsDesc": "Modelos locais e análise com IA",
        "manualChanges": "Você decide quando aplicar cada alteração.",
        "footerDescription": "Desempenho com mais clareza.",
        "openDiagnostics": "Abrir diagnóstico",
        "emptyActivityTitle": "Seu histórico começa aqui.",
        "emptyActivityDescription": "As análises e os ajustes realizados nesta sessão aparecerão neste espaço.",
        "optimizeIntro": "Aplique um ajuste por vez para acompanhar o resultado. Efeitos visuais e plano de energia também permitem reversão.",
        "appsUnavailable": "Não foi possível carregar os aplicativos. Tente atualizar.",
        "appsPreview": "Seus aplicativos em execução aparecerão aqui no app desktop.",
        "activityEmpty": "Nenhuma ação nesta sessão.",
        "activityEmptyDetail": "As análises e os ajustes que você executar aparecerão aqui.",
        "activityAnalysis": "Análise concluída",
        "activityAnalysisDetail": "{issues} problemas e {recommendations} recomendações.",
        "activityAnalysisError": "Análise interrompida",
        "activityApplied": "Ajuste aplicado: {name}",
        "activityReverted": "Ajuste revertido: {name}",
        "activityKilled": "Processo encerrado: {name}",
        "activityBoost": "Prioridade ajustada: {name}",
        "applyAction": "Aplicar",
        "revertAction": "Reverter",
        "applyingAction": "Aplicando…",
        "revertingAction": "Revertendo…",
        "appliedAction": "Aplicado",
        "operationFailed": "A operação não foi concluída.",
        "operationApplied": "{name} aplicado.",
        "operationReverted": "{name} revertido.",
        "noRevert": "Este ajuste não possui reversão automática.",
        "desktopRequired": "Abra o FixMe desktop para executar esta ação.",
        "loading": "Carregando…",
        "unavailable": "Indisponível",
        "noReading": "Aguardando leitura",
        "coresCount": "{count} núcleos",
        "memoryUsed": "{value} GB em uso",
        "gpuMemory": "{value} MB de VRAM",
        "processCount": "{count} processos",
        "mlUnavailable": "O modelo local está indisponível no momento.",
        "mlPreview": "Os dados do modelo ficam disponíveis no aplicativo desktop.",
        "mlReviewBtn": "Ver ajustes disponíveis",
        "mlConfLabel": "Confiança do modelo",
        "aiRecommendation": "Recomendação",
        "aiUnavailable": "Análise indisponível",
        "aiNotApplied": "Recomendações não são aplicadas automaticamente.",
        "killAction": "Encerrar",
        "killBusy": "Encerrando…",
        "killNone": "Nenhum aplicativo elegível para encerrar.",
        "killWarning": "Encerrar um aplicativo pode descartar trabalho não salvo.",
        "processUnavailable": "Não foi possível consultar os processos.",
        "bundleBusy": "Aplicando ajustes…",
        "bundleResult": "{done} ajustes aplicados; {failed} falhas.",
        "optimizationPreparing": "Preparando ajuste",
        "optimizationExecuting": "Aplicando ajuste",
        "optimizationFinalizing": "Conferindo resultado",
        "optimizationCompleted": "Ajuste concluído",
        "optimizationFailed": "Não foi possível concluir o ajuste",
        "optimizationBlocked": "Aguardando confirmação do Windows",
        "optimizationPreparingDetail": "A autorização do Windows pode aparecer. Você pode continuar navegando no FixMe.",
        "optimizationRunningDetail": "Aguarde a confirmação antes de iniciar outro ajuste. Você pode continuar navegando.",
        "optimizationBlockedDetail": "O Windows ainda pode estar executando o comando. Novos ajustes ficam bloqueados até a confirmação do resultado.",
        "optimizationBusyMessage": "Já existe um ajuste em andamento. Aguarde a confirmação do resultado.",
        "optimizationStateUnavailable": "Não foi possível confirmar o estado do ajuste. O FixMe tentará consultar novamente.",
        "optimizationElapsedLabel": "Tempo decorrido: {seconds}s",
        "optimizationStepLabel": "Etapa {step} de {total}",
        "optimizationKill": "Encerrar {name}",
        "optimizationBoost": "Ajustar prioridade de {name}",
        "boostPlaceholder": "Nome do processo, como cs2.exe",
        "boostRequired": "Informe o nome de um processo em execução (.exe).",
        "deepLoading": "Coletando dados e consultando a IA…",
        "deepQuestion": "Pergunte sobre o desempenho do PC…",
        "deepQuestionRequired": "Digite uma pergunta.",
        "deepNoResult": "A análise não retornou recomendações.",
        "deepBottlenecks": "Gargalos relatados",
        "deepNone": "Nenhum relatado",
        "deepRootCause": "Causa provável",
        "deepEstimates": "Estimativas da IA; ganhos ainda não medidos neste PC.",
        "deepFps": "FPS estimados",
        "deepLatency": "Latência estimada",
        "deepBoot": "Inicialização estimada",
        "bottleneckChoose": "Qual recurso você quer analisar?",
        "memoryLabel": "Memória",
        "cancelAction": "Cancelar",
        "deepCleared": "Sessão da IA limpa.",
        "gpuSensor": "Sensor de GPU",
        "profileClose": "Fechar perfil"
    },
    "en": {
        "statusTitle": "Ready to analyze",
        "statusSubtitle": "Run an analysis to check your system.",
        "scanBtnLabel": "Analyze",
        "hwSectionTitle": "Hardware",
        "hwLiveLabel": "Live",
        "ramLabel": "RAM Memory",
        "appsSectionTitle": "Running apps",
        "appsViewAll": "Refresh",
        "activitySectionTitle": "Session activity",
        "aiPanelTitle": "AI Analysis",
        "aiPanelSubtitle": "Smart diagnostics",
        "aiIdleText": "Click \"Analyze\" to start a full system diagnostic",
        "aiStep1Title": "Collecting data",
        "aiStep1Desc": "System information",
        "aiStep2Title": "Checking your system",
        "aiStep2Desc": "Windows diagnostics",
        "aiStep3Title": "Querying the local model",
        "aiStep3Desc": "Usage history",
        "aiStep4Title": "AI Diagnostics",
        "aiStep4Desc": "Generating recommendations",
        "aiActionLabel": "Start analysis",
        "mlSectionTitle": "Local intelligence",
        "mlPredLabel": "Local recommendations",
        "mlModelLabel": "Model data",
        "mlUsageLabel": "Today’s usage",
        "mlSamplesLbl": "Real samples",
        "mlEffectLbl": "Average outcome",
        "mlHPerf": "High Performance",
        "mlClearRam": "RAM Cleanup",
        "mlDiag": "Diagnostics",
        "mlApplyBtn": "Apply recommendation",
        "mlNoData": "The model still needs real usage data.",
        "mlTraining": "Model in training",
        "aiHealthy": "Check complete",
        "aiNoIssues": "The diagnostic checks did not find any issues.",
        "aiOverall": "AI assessment",
        "aiMLPred": "Local model recommendations",
        "aiAnalyzing": "Analyzing...",
        "aiNewAnalysis": "New analysis",
        "aiConfHeader": "Analysis data",
        "aiIssuesLbl": "Issues",
        "aiFixedLbl": "Recommendations",
        "su-tagline": "Initializing system analysis...",
        "su-s1-lbl": "Detecting hardware",
        "su-s2-lbl": "System resources",
        "su-s3-lbl": "Quick diagnostics",
        "su-s4-lbl": "ML Engine",
        "su-enter-lbl": "Open Dashboard",
        "su-score-lbl": "System Health",
        "type.high_performance": "High Performance Plan",
        "type.clear_ram": "RAM Cleanup",
        "type.process_priority": "Process Priority",
        "type.game_optimization": "Game Optimization",
        "type.diagnostico": "Diagnostics",
        "mlModelActive": "Model active",
        "mlModelTraining": "Model in training",
        "appsNone": "No running applications found.",
        "appsLoadingTxt": "Loading running apps...",
        "activityNow": "Now",
        "winoptSectionTitle": "Windows Optimizations",
        "winoptBundleBtnLabel": "Apply basic adjustments",
        "basicBundleInfo": "The basic set adjusts visual effects and the power plan. The remaining adjustments are individual.",
        "wocVisualTitle": "Visual Effects",
        "wocVisualDesc": "Disables animations and transparency",
        "wocServicesTitle": "Background services",
        "wocServicesDesc": "Adjusts optional Windows services",
        "wocTelemetryTitle": "Telemetry",
        "wocTelemetryDesc": "Adjusts Windows telemetry settings",
        "wocPowerTitle": "Power Plan",
        "wocPowerDesc": "Ultimate Performance",
        "wocNetworkTitle": "Network / TCP",
        "wocNetworkDesc": "Disables Nagle, tunes TCP",
        "wocSchedulerTitle": "Scheduler / MMCSS",
        "wocSchedulerDesc": "High resolution timer",
        "wocPoliciesTitle": "Windows Policies",
        "wocPoliciesDesc": "Removes startup delays",
        "wocGPUTitle": "GPU / HAGS",
        "wocGPUDesc": "Hardware Accelerated GPU Scheduling",
        "wocMemoryTitle": "RAM Memory",
        "wocMemoryDesc": "Clears standby memory only",
        "winoptKillTitle": "Background applications",
        "winoptRefreshLabel": "Refresh",
        "winoptGameBoostTitle": "Game Boost",
        "winoptGameBoostBtn": "Boost",
        "deepaiSectionTitle": "Deep AI Analysis",
        "deepaiIdleText": "Deep bottleneck analysis, predictions and personalized optimization plan via Gemini AI.",
        "deepaiBtnRun": "Analyze Deeply",
        "deepaiBtnBottleneck": "Specific Bottleneck",
        "deepaiResultTitle": "Full Analysis",
        "deepaiClearBtn": "Clear",
        "deepaiRefineBtnLabel": "Ask",
        "profileOverlayTitle": "Personalize your experience",
        "profileOverlaySubtitle": "This helps FixMe learn and optimize better for you",
        "profileUsageTypeLabel": "How do you mostly use your PC?",
        "profileUsageGamerLbl": "Gaming",
        "profileUsageTrabalhoLbl": "Work",
        "profileUsageMistoLbl": "Mixed",
        "profilePriorityLabel": "What matters most?",
        "profilePriorityPerformanceLbl": "Maximum performance",
        "profilePriorityBalancedLbl": "Balanced",
        "profilePriorityQuietLbl": "Quiet / power saving",
        "profileFavoriteAppsLabel": "Favorite apps or games (optional)",
        "profileFavoriteAppsPlaceholder": "e.g. Valorant, VSCode, Chrome",
        "profilePeakHoursLabel": "When do you use your PC most intensely?",
        "profilePeakMorningLbl": "Morning",
        "profilePeakAfternoonLbl": "Afternoon",
        "profilePeakEveningLbl": "Evening",
        "profilePeakNightLbl": "Late night",
        "profileSaveBtnLbl": "Save",
        "profileSkipBtn": "Close",
        "profileEditBtnTitle": "Edit profile",
        "profileSavedToast": "Profile saved.",
        "profileErrorToast": "Error saving profile",
        "profileRequiredToast": "Please select an option for each required field",
        "gpuNativeOn": "Native reading",
        "gpuNativeOff": "No GPU sensor",
        "navOverview": "Overview",
        "navOptimize": "Optimizations",
        "navInsights": "Intelligence",
        "navActivity": "Activity",
        "pageOverview": "Your PC, under control.",
        "pageSubtitle": "Watch your resources and find what needs attention.",
        "pageOptimize": "Make each adjustment count.",
        "pageOptimizeSubtitle": "Apply adjustments individually and check the result.",
        "pageInsights": "Understand your performance.",
        "pageInsightsSubtitle": "Review recommendations based on your PC data.",
        "pageActivity": "What happened on your PC.",
        "pageActivitySubtitle": "Follow the actions and results from this session.",
        "previewMode": "Interface preview",
        "monitoringConnecting": "Connecting to your PC",
        "monitoringLive": "Monitoring active",
        "monitoringOffline": "Monitoring unavailable",
        "statusPreview": "Explore FixMe",
        "statusPreviewDetail": "Open the desktop app to view your PC data.",
        "statusIssueCount": "{count} items need attention",
        "statusIssueSingle": "1 item needs attention",
        "primaryNavigation": "Main navigation",
        "refreshApps": "Refresh applications",
        "closeDiagnostics": "Close diagnostics",
        "statusChecked": "Analysis complete",
        "lastChecked": "Checked at {time}",
        "analysisError": "Could not complete the analysis",
        "analysisUnknown": "The analysis did not return a valid diagnostic result.",
        "refreshAction": "Refresh",
        "guideTitle": "Your next step is up to you.",
        "guideDescription": "Investigate first. Apply only the adjustments that suit how you use your PC.",
        "shortcutOptimize": "Adjust Windows",
        "shortcutOptimizeDesc": "Power, memory and processes",
        "shortcutInsights": "Understand performance",
        "shortcutInsightsDesc": "Local models and AI analysis",
        "manualChanges": "You decide when to apply each change.",
        "footerDescription": "A clearer view of performance.",
        "openDiagnostics": "Open diagnostics",
        "emptyActivityTitle": "Your history starts here.",
        "emptyActivityDescription": "The analyses and adjustments you run in this session will appear here.",
        "optimizeIntro": "Apply one adjustment at a time to check the result. Visual effects and power plan adjustments can also be reverted.",
        "appsUnavailable": "Could not load applications. Try refreshing.",
        "appsPreview": "Your running applications will appear in the desktop app.",
        "activityEmpty": "No actions in this session.",
        "activityEmptyDetail": "The analyses and adjustments you run will appear here.",
        "activityAnalysis": "Analysis complete",
        "activityAnalysisDetail": "{issues} issues and {recommendations} recommendations.",
        "activityAnalysisError": "Analysis interrupted",
        "activityApplied": "Adjustment applied: {name}",
        "activityReverted": "Adjustment reverted: {name}",
        "activityKilled": "Process ended: {name}",
        "activityBoost": "Priority adjusted: {name}",
        "applyAction": "Apply",
        "revertAction": "Revert",
        "applyingAction": "Applying…",
        "revertingAction": "Reverting…",
        "appliedAction": "Applied",
        "operationFailed": "The operation did not complete.",
        "operationApplied": "{name} applied.",
        "operationReverted": "{name} reverted.",
        "noRevert": "This adjustment has no automatic revert action.",
        "desktopRequired": "Open the FixMe desktop app to run this action.",
        "loading": "Loading…",
        "unavailable": "Unavailable",
        "noReading": "Waiting for data",
        "coresCount": "{count} cores",
        "memoryUsed": "{value} GB in use",
        "gpuMemory": "{value} MB VRAM",
        "processCount": "{count} processes",
        "mlUnavailable": "The local model is currently unavailable.",
        "mlPreview": "Model data is available in the desktop app.",
        "mlReviewBtn": "Review available adjustments",
        "mlConfLabel": "Model confidence",
        "aiRecommendation": "Recommendation",
        "aiUnavailable": "Analysis unavailable",
        "aiNotApplied": "Recommendations are not applied automatically.",
        "killAction": "End process",
        "killBusy": "Ending…",
        "killNone": "No eligible applications to end.",
        "killWarning": "Ending an application can discard unsaved work.",
        "processUnavailable": "Could not load processes.",
        "bundleBusy": "Applying adjustments…",
        "bundleResult": "{done} adjustments applied; {failed} failed.",
        "optimizationPreparing": "Preparing adjustment",
        "optimizationExecuting": "Applying adjustment",
        "optimizationFinalizing": "Checking the result",
        "optimizationCompleted": "Adjustment completed",
        "optimizationFailed": "The adjustment could not be completed",
        "optimizationBlocked": "Waiting for Windows confirmation",
        "optimizationPreparingDetail": "Windows may request permission. You can continue browsing FixMe.",
        "optimizationRunningDetail": "Wait for confirmation before starting another adjustment. You can continue browsing.",
        "optimizationBlockedDetail": "Windows may still be running the command. New adjustments stay locked until the result is confirmed.",
        "optimizationBusyMessage": "Another adjustment is in progress. Wait for its result to be confirmed.",
        "optimizationStateUnavailable": "The adjustment state could not be confirmed. FixMe will check again.",
        "optimizationElapsedLabel": "Elapsed time: {seconds}s",
        "optimizationStepLabel": "Step {step} of {total}",
        "optimizationKill": "Close {name}",
        "optimizationBoost": "Adjust priority for {name}",
        "boostPlaceholder": "Process name, such as cs2.exe",
        "boostRequired": "Enter the name of a running process (.exe).",
        "deepLoading": "Collecting data and querying the AI…",
        "deepQuestion": "Ask about your PC performance…",
        "deepQuestionRequired": "Enter a question.",
        "deepNoResult": "The analysis returned no recommendations.",
        "deepBottlenecks": "Reported bottlenecks",
        "deepNone": "None reported",
        "deepRootCause": "Likely cause",
        "deepEstimates": "AI estimates; gains have not been measured on this PC.",
        "deepFps": "Estimated FPS",
        "deepLatency": "Estimated latency",
        "deepBoot": "Estimated startup",
        "bottleneckChoose": "Which resource do you want to analyze?",
        "memoryLabel": "Memory",
        "cancelAction": "Cancel",
        "deepCleared": "AI session cleared.",
        "gpuSensor": "GPU sensor",
        "profileClose": "Close profile"
    }
};

let currentLang = readPreference('fixme_lang') === 'en' ? 'en' : 'pt';
let currentView = 'overview';
let isAnalyzing = false;
let activeAnalysisUI = null;
let lastAnalysis = null;
let lastAnalysisError = '';
let connectionState = window.fixme ? 'connecting' : 'preview';
let lastStatsAt = 0;
let lastApps = null;
let appsState = 'loading';
let appsBusy = false;
let mlBusy = false;
let modelStats = null;
let modelPrediction = null;
let usageStats = null;
let deepAIActive = false;
let toastTimer = null;
let profileReturnFocus = null;
let analysisReturnFocus = null;
let pendingMutation = null;
let optimizationProgress = null;
let optimizationStateLoading = false;
let optimizationStateRequest = false;
let optimizationProgressRevision = 0;
let mutationSequence = 0;
const activity = [];
const timers = [];
const unsubscribe = [];
const appliedOptimizations = new Set();
const hwState = {
    cpu: { current: null, name: '', cores: null },
    memory: { current: null, total: null, used: null },
    gpu: { current: null, name: '', vram: null, source: null },
    processCount: null,
};
const OPTIMIZATIONS = {
    visual: { suffix: 'Visual', title: 'wocVisualTitle', method: 'winOptVisualEffects', args: [true], revert: 'winOptVisualEffects', revertArgs: [false] },
    services: { suffix: 'Services', title: 'wocServicesTitle', method: 'winOptDisableServices' },
    telemetry: { suffix: 'Telemetry', title: 'wocTelemetryTitle', method: 'winOptDisableTelemetry' },
    power: { suffix: 'Power', title: 'wocPowerTitle', method: 'winOptPowerPlan', args: [false], revert: 'winOptPowerPlan', revertArgs: [true] },
    network: { suffix: 'Network', title: 'wocNetworkTitle', method: 'winOptNetwork' },
    scheduler: { suffix: 'Scheduler', title: 'wocSchedulerTitle', method: 'winOptScheduler' },
    policies: { suffix: 'Policies', title: 'wocPoliciesTitle', method: 'winOptRemovePolicies' },
    gpu: { suffix: 'GPU', title: 'wocGPUTitle', method: 'winOptGPU' },
    memory: { suffix: 'Memory', title: 'wocMemoryTitle', method: 'winOptMemory' },
};

function byId(id) { return document.getElementById(id); }
function setText(id, text) { const element = byId(id); if (element) element.textContent = text; }
function readPreference(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
function writePreference(key, value) { try { localStorage.setItem(key, value); } catch (_) { /* Preferences are optional. */ } }
function t(key, values = {}) {
    const value = TRANSLATIONS[currentLang]?.[key] ?? TRANSLATIONS.pt[key] ?? key;
    return value.replace(/\{(\w+)\}/g, (match, name) => values[name] === undefined ? match : String(values[name]));
}
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function numberOrNull(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}
function clampPercent(value) { const number = numberOrNull(value); return number === null ? null : Math.min(100, Math.max(0, number)); }
function formatNumber(value, digits = 1) {
    const number = numberOrNull(value);
    return number === null ? '--' : number.toLocaleString(currentLang === 'pt' ? 'pt-BR' : 'en-US', { maximumFractionDigits: digits });
}
function typeLabel(type) { const key = 'type.' + type; return t(key) === key ? String(type || '') : t(key); }
function requireSuccess(result) {
    if (!result || result.success !== true || result.data?.success === false) {
        const failure = result?.data?.success === false ? result.data : result;
        const error = new Error(failure?.error || t('operationFailed'));
        error.code = failure?.code || result?.code;
        throw error;
    }
    return result;
}
async function invoke(method, ...args) {
    if (typeof window.fixme?.[method] !== 'function') throw new Error(t('desktopRequired'));
    return requireSuccess(await window.fixme[method](...args));
}

function switchView(view, moveFocus = false, resetScroll = false) {
    const panels = Array.from(document.querySelectorAll('[data-panel]'));
    if (!['overview', 'optimize', 'insights', 'activity'].includes(view)) view = 'overview';
    currentView = view;
    panels.forEach(panel => { panel.hidden = panel.dataset.panel !== view; });
    document.querySelectorAll('[data-view]').forEach(button => {
        const selected = button.dataset.view === view;
        button.classList.toggle('is-active', selected);
        if (selected) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
    });
    const headings = {
        overview: ['pageOverview', 'pageSubtitle'], optimize: ['pageOptimize', 'pageOptimizeSubtitle'],
        insights: ['pageInsights', 'pageInsightsSubtitle'], activity: ['pageActivity', 'pageActivitySubtitle'],
    };
    setText('pageTitle', t(headings[view][0]));
    setText('pageSubtitle', t(headings[view][1]));
    if (moveFocus && byId('pageTitle')) { byId('pageTitle').tabIndex = -1; byId('pageTitle').focus({ preventScroll: true }); }
    if (resetScroll) window.scrollTo?.({ top: 0, left: 0, behavior: 'instant' });
}

function applyLang() {
    document.documentElement.lang = currentLang === 'pt' ? 'pt-BR' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = t(element.dataset.i18n); });
    Object.keys(TRANSLATIONS.pt).forEach(key => {
        if (['statusTitle', 'statusSubtitle', 'hwLiveLabel', 'aiActionLabel', 'scanBtnLabel'].includes(key)) return;
        const element = byId(key);
        if (element) element.textContent = t(key);
    });
    [['ml-prediction-card', 'mlPredLabel'], ['ml-model-card', 'mlModelLabel'], ['ml-usage-card', 'mlUsageLabel']].forEach(([id, key]) => {
        const label = byId(id)?.querySelector('.ml-card-label');
        if (label) label.textContent = t(key);
    });
    const statLabels = document.querySelectorAll('#ml-model-body .ml-stat-lbl');
    if (statLabels[0]) statLabels[0].textContent = t('mlSamplesLbl');
    if (statLabels[1]) statLabels[1].textContent = t('mlEffectLbl');
    const confidenceTitle = document.querySelector('.ai-confidence-header');
    if (confidenceTitle) confidenceTitle.textContent = t('aiConfHeader');
    const issueLabel = document.querySelector('#aiMetricIssues + .ai-metric-lbl');
    const recLabel = document.querySelector('#aiMetricFixed + .ai-metric-lbl');
    if (issueLabel) issueLabel.textContent = t('aiIssuesLbl');
    if (recLabel) recLabel.textContent = t('aiFixedLbl');
    setText('langLabel', currentLang.toUpperCase());
    setText('langFlag', currentLang === 'pt' ? '🇧🇷' : '🇺🇸');
    if (byId('langToggleBtn')) byId('langToggleBtn').setAttribute('aria-label', currentLang === 'pt' ? 'Change language to English' : 'Mudar idioma para português');
    if (byId('profileEditBtn')) {
        byId('profileEditBtn').title = t('profileEditBtnTitle');
        byId('profileEditBtn').setAttribute('aria-label', t('profileEditBtnTitle'));
    }
    document.querySelector('.primary-nav')?.setAttribute('aria-label', t('primaryNavigation'));
    document.querySelector('#aiPanel .panel-close')?.setAttribute('aria-label', t('closeDiagnostics'));
    document.querySelector('[onclick="loadRunningApps()"]')?.setAttribute('aria-label', t('refreshApps'));
    if (byId('profileSkipBtn')) byId('profileSkipBtn').setAttribute('aria-label', t('profileClose'));
    document.querySelectorAll('[data-panel]').forEach(panel => {
        const label = { overview: 'navOverview', optimize: 'navOptimize', insights: 'navInsights', activity: 'navActivity' }[panel.dataset.panel];
        if (label) panel.setAttribute('aria-label', t(label));
    });
    if (byId('profileFavoriteAppsInput')) byId('profileFavoriteAppsInput').placeholder = t('profileFavoriteAppsPlaceholder');
    if (byId('gameBoostInput')) byId('gameBoostInput').placeholder = t('boostPlaceholder');
    if (byId('deepaiRefineInput')) byId('deepaiRefineInput').placeholder = t('deepQuestion');
    switchView(currentView);
    updateConnectionUI();
    updateHardwareUI();
    renderApps();
    renderMLCards();
    renderActivity();
    renderOptimizationStates();
    syncAnalysisButtons();
    updateStatusBanner();
    if (lastAnalysis && !isAnalyzing) renderAnalysisResult(lastAnalysis);
}
function toggleLang() { currentLang = currentLang === 'pt' ? 'en' : 'pt'; writePreference('fixme_lang', currentLang); applyLang(); }

function setConnectionState(state) { connectionState = state; updateConnectionUI(); }
function updateConnectionUI() {
    const key = { preview: 'previewMode', connecting: 'monitoringConnecting', live: 'monitoringLive', offline: 'monitoringOffline' }[connectionState];
    setText('connectionLabel', t(key || 'monitoringOffline'));
    document.querySelectorAll('.connection-status').forEach(element => { element.dataset.state = connectionState; });
    setText('hwLiveLabel', connectionState === 'live' ? t('hwLiveLabel') : t(key || 'monitoringOffline'));
    const badge = document.querySelector('.hw-live-badge');
    if (badge) badge.dataset.state = connectionState;
}

function updateHardwareUI() {
    const circumference = 2 * Math.PI * 18;
    [['cpu', 'cpu'], ['mem', 'memory'], ['gpu', 'gpu']].forEach(([prefix, key]) => {
        updateGauge(prefix + '-gauge', prefix + '-gauge-text', prefix + '-bar', hwState[key].current, circumference);
    });
    setText('hw-cpu-name', hwState.cpu.name || t('noReading'));
    setText('hw-cpu-detail', hwState.cpu.cores === null ? '--' : t('coresCount', { count: hwState.cpu.cores }));
    setText('hw-mem-name', hwState.memory.total === null ? t('noReading') : formatNumber(hwState.memory.total) + ' GB');
    setText('hw-mem-detail', hwState.memory.used === null ? '--' : t('memoryUsed', { value: formatNumber(hwState.memory.used) }));
    setText('hw-gpu-name', hwState.gpu.name || t('noReading'));
    setText('hw-gpu-detail', hwState.gpu.vram === null ? '--' : t('gpuMemory', { value: formatNumber(hwState.gpu.vram, 0) }));
    const gpuBadge = byId('gpuNativeBadge');
    if (gpuBadge && hwState.gpu.source) {
        gpuBadge.textContent = t(hwState.gpu.source === 'native' ? 'gpuNativeOn' : hwState.gpu.current !== null ? 'gpuSensor' : 'gpuNativeOff');
        gpuBadge.classList.toggle('off', hwState.gpu.current === null);
        gpuBadge.style.display = 'inline-block';
    }
    setText('processCount', hwState.processCount === null ? '--' : formatNumber(hwState.processCount, 0));
}
function updateGauge(gaugeId, textId, barId, value, circumference) {
    const percent = clampPercent(value);
    const gauge = byId(gaugeId);
    const bar = byId(barId);
    setText(textId, percent === null ? '--' : Math.round(percent) + '%');
    if (gauge) {
        gauge.style.strokeDashoffset = String(circumference * (1 - (percent ?? 0) / 100));
        gauge.style.stroke = percent === null ? 'var(--text-muted)' : percent < 50 ? 'var(--success)' : percent < 80 ? 'var(--warning)' : '#e27676';
    }
    if (bar) { bar.style.width = (percent ?? 0) + '%'; bar.className = 'hardware-usage-bar ' + (percent === null ? 'unavailable' : percent < 50 ? 'low' : percent < 80 ? 'medium' : 'high'); }
}
function ingestStats(stats) {
    if (!stats || stats.error) { setConnectionState('offline'); return false; }
    ['cpu', 'memory', 'gpu'].forEach(key => { hwState[key].current = clampPercent(stats[key]?.current); });
    hwState.gpu.source = stats.gpu?.source || (hwState.gpu.current === null ? 'unavailable' : 'systeminformation');
    if (stats.memory) {
        hwState.memory.total = numberOrNull(stats.memory.total);
        hwState.memory.used = numberOrNull(stats.memory.used);
    }
    hwState.processCount = numberOrNull(stats.processCount);
    const hasData = ['cpu', 'memory', 'gpu'].some(key => hwState[key].current !== null);
    if (!hasData) { setConnectionState('offline'); return false; }
    lastStatsAt = Date.now();
    setConnectionState('live');
    updateHardwareUI();
    return true;
}
async function loadSystemInfo() {
    try {
        const result = await invoke('getSystemInfo');
        const info = result.data;
        if (!info) return;
        hwState.cpu.name = info.cpuModel || '';
        hwState.cpu.cores = numberOrNull(info.cpuCores);
        hwState.memory.total = numberOrNull(info.totalMemory);
        hwState.gpu.name = info.gpuModel || '';
        hwState.gpu.vram = numberOrNull(info.gpuVram);
        updateHardwareUI();
    } catch (_) { /* A failed hardware description does not invalidate live usage data. */ }
}
async function loadStats() {
    try { const result = await invoke('getHardwareStats'); ingestStats(result.data?.stats ?? result.data); }
    catch (_) { setConnectionState('offline'); }
}

function renderApps() {
    const grid = byId('appsGrid');
    if (!grid) return;
    if (appsState !== 'ready') {
        const key = appsState === 'preview' ? 'appsPreview' : appsState === 'error' ? 'appsUnavailable' : 'appsLoadingTxt';
        grid.innerHTML = '<div class="apps-loading">' + escapeHtml(t(key)) + '</div>';
        return;
    }
    if (!lastApps?.length) { grid.innerHTML = '<div class="apps-loading">' + escapeHtml(t('appsNone')) + '</div>'; return; }
    grid.innerHTML = lastApps.map(app => {
        const cpu = clampPercent(app.cpu);
        const icon = /^data:image\/(?:png|jpeg|webp|gif|bmp|x-icon);base64,[a-z\d+/=]+$/i.test(app.icon || '')
            ? '<img src="' + escapeHtml(app.icon) + '" alt="">'
            : '<div class="app-icon-fallback">' + escapeHtml(String(app.name || '?').slice(0, 2)) + '</div>';
        return '<div class="app-card" title="' + escapeHtml(app.path || app.name) + '"><div class="app-icon">' + icon +
            '</div><div class="app-name">' + escapeHtml(app.name) + '</div><div class="app-time">CPU ' +
            (cpu === null ? '--' : formatNumber(cpu) + '%') + '</div><div class="app-usage-bar"><div class="app-usage-fill" style="width:' +
            (cpu ?? 0) + '%"></div></div></div>';
    }).join('');
}
async function loadRunningApps() {
    if (appsBusy) return;
    if (!window.fixme) { appsState = 'preview'; renderApps(); return; }
    appsBusy = true;
    try {
        const result = await invoke('getRunningApps');
        if (!Array.isArray(result.data)) throw new Error(t('appsUnavailable'));
        lastApps = result.data;
        appsState = 'ready';
    } catch (_) { lastApps = null; appsState = 'error'; }
    finally { appsBusy = false; renderApps(); }
}

function renderMLCards() {
    const body = byId('ml-prediction-body');
    const predictions = Array.isArray(modelPrediction?.predictions) ? modelPrediction.predictions : [];
    if (body) {
        if (!window.fixme || !modelPrediction) body.innerHTML = '<p class="ml-message">' + escapeHtml(t(window.fixme ? 'mlUnavailable' : 'mlPreview')) + '</p>';
        else if (!predictions.length) body.innerHTML = '<div class="ml-status-pill training">' + escapeHtml(t('mlModelTraining')) + '</div><p class="ml-message">' + escapeHtml(t('mlNoData')) + '</p>';
        else {
            body.innerHTML = '<div class="ml-status-pill active">' + escapeHtml(t('mlModelActive')) + '</div><div class="ml-pred-list">' + predictions.slice(0, 3).map(prediction => {
                const confidence = clampPercent(prediction.confidence);
                return '<div class="ml-pred-item"><div class="ml-pred-row"><span class="ml-pred-type">' + escapeHtml(typeLabel(prediction.type)) +
                    '</span><span class="ml-pred-conf" title="' + escapeHtml(t('mlConfLabel')) + '">' + (confidence === null ? '--' : Math.round(confidence) + '%') +
                    '</span></div><div class="ml-pred-bar-bg"><div class="ml-pred-bar orange" style="width:' + (confidence ?? 0) + '%"></div></div></div>';
            }).join('') + '</div><button class="ml-apply-btn" type="button" onclick="applyMLPrediction()">' + escapeHtml(t('mlReviewBtn')) + '</button>';
        }
    }
    setText('ml-samples', modelStats ? formatNumber(modelStats.totalSamples, 0) : '--');
    const effectiveness = modelStats?.totalSamples > 0 ? numberOrNull(modelStats.avgEffectiveness) : null;
    setText('ml-accuracy', effectiveness === null ? '--' : formatNumber(effectiveness * 100, 0) + '%');
    const usageBody = byId('ml-usage-body');
    if (usageBody) {
        if (!usageStats) usageBody.innerHTML = '<p class="ml-message">' + escapeHtml(t(window.fixme ? 'unavailable' : 'mlPreview')) + '</p>';
        else usageBody.innerHTML = ['high_performance', 'clear_ram', 'diagnostico'].map(type => {
            const item = usageStats[type];
            const today = numberOrNull(item?.todayCount);
            const limit = numberOrNull(item?.limit);
            const percentage = today !== null && limit > 0 ? Math.min(100, today / limit * 100) : 0;
            return '<div class="ml-usage-item"><div class="ml-usage-label"><span class="ml-usage-name">' + escapeHtml(typeLabel(type)) +
                '</span><span class="ml-usage-count">' + (today ?? '--') + '/' + (limit ?? '--') + '</span></div><div class="ml-usage-bar-bg"><div class="ml-usage-bar" style="width:' + percentage + '%"></div></div></div>';
        }).join('');
    }
}
async function updateMLCards() {
    if (mlBusy || !window.fixme) { renderMLCards(); return; }
    mlBusy = true;
    const results = await Promise.allSettled([invoke('getMLModelStats'), invoke('mlPredict'), invoke('getUsageStats')]);
    modelStats = results[0].status === 'fulfilled' ? results[0].value.data : null;
    modelPrediction = results[1].status === 'fulfilled' ? results[1].value.data : null;
    usageStats = results[2].status === 'fulfilled' ? results[2].value.data : null;
    mlBusy = false;
    renderMLCards();
}
function applyMLPrediction() { switchView('optimize', true, true); }

function addActivity(title, detail = '') {
    activity.unshift({ title, detail, timestamp: new Date() });
    if (activity.length > 50) activity.length = 50;
    renderActivity();
}
function renderActivity() {
    const list = byId('activityList');
    if (!list) return;
    if (!activity.length) {
        list.innerHTML = '<div class="empty-state"><h2>' + escapeHtml(t('activityEmpty')) + '</h2><p>' + escapeHtml(t('activityEmptyDetail')) + '</p></div>';
        return;
    }
    list.innerHTML = activity.map(item => '<div class="activity-item"><div class="activity-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5v14"/></svg></div><div class="activity-content"><div class="activity-title">' +
        escapeHtml(item.title) + '</div><div class="activity-time">' + escapeHtml(item.detail) + ' <time datetime="' + item.timestamp.toISOString() + '">' +
        escapeHtml(item.timestamp.toLocaleTimeString(currentLang === 'pt' ? 'pt-BR' : 'en-US', { hour: '2-digit', minute: '2-digit' })) + '</time></div></div></div>').join('');
}
function showToast(message, duration = 4500) {
    const element = byId('winoptToast');
    if (!element) return;
    clearTimeout(toastTimer);
    element.textContent = message;
    element.setAttribute('role', 'status');
    element.classList.add('show');
    toastTimer = setTimeout(() => element.classList.remove('show'), duration);
}

function toggleAiPanel(forceOpen) {
    const panel = byId('aiPanel');
    const overlay = byId('aiOverlay');
    if (!panel) return;
    const open = typeof forceOpen === 'boolean' ? forceOpen : !panel.classList.contains('open');
    const wasOpen = panel.classList.contains('open');
    if (open && !wasOpen) analysisReturnFocus = document.activeElement;
    panel.inert = !open;
    panel.classList.toggle('open', open);
    if (overlay) overlay.classList.toggle('active', open);
    const toggle = byId('diagnosticPanelBtn');
    if (toggle) toggle.setAttribute('aria-expanded', String(open));
    syncModalBackground();
    if (open && !wasOpen) panel.querySelector('button')?.focus();
    else if (!open && wasOpen) { analysisReturnFocus?.focus(); analysisReturnFocus = null; }
}
function syncModalBackground() {
    const modalOpen = byId('aiPanel')?.classList.contains('open') || byId('profileOverlay')?.classList.contains('show');
    document.querySelectorAll('.app-shell,.header').forEach(element => { element.inert = Boolean(modalOpen); });
}
function syncAnalysisButtons() {
    ['scanBtn', 'aiActionBtn'].forEach(id => { const button = byId(id); if (button) { button.disabled = isAnalyzing || !window.fixme; button.setAttribute('aria-busy', String(isAnalyzing)); } });
    setText('scanBtnLabel', t(isAnalyzing ? 'aiAnalyzing' : 'scanBtnLabel'));
    setText('aiActionLabel', t(isAnalyzing ? 'aiAnalyzing' : lastAnalysis ? 'aiNewAnalysis' : 'aiActionLabel'));
}
function resetAnalysisUI() {
    const ui = { loading: byId('aiLoading'), results: byId('aiResults'), actionBtn: byId('aiActionBtn'), confidence: byId('aiConfidence'), steps: Array.from(document.querySelectorAll('#aiLoading .ai-step')) };
    if (byId('aiIdle')) byId('aiIdle').style.display = 'none';
    ui.results?.classList.remove('active');
    if (ui.confidence) ui.confidence.style.display = 'none';
    ui.loading?.classList.add('active');
    ui.steps.forEach(step => { step.classList.remove('active', 'completed'); step.classList.add('pending'); });
    syncAnalysisButtons();
    return ui;
}
function setStepActive(step) { if (step) { step.classList.remove('pending'); step.classList.add('active'); } }
function setStepCompleted(step, detail) {
    if (!step) return;
    step.classList.remove('active', 'pending'); step.classList.add('completed');
    if (detail) setStepDetail(step, detail);
}
function setStepDetail(step, detail) { const description = step?.querySelector('.ai-step-desc'); if (description) description.textContent = detail; }
function receiveAnalysisProgress(progress) {
    if (!activeAnalysisUI || !progress) return;
    const index = Number(progress.step) - 1;
    const step = activeAnalysisUI.steps[index];
    if (!step) return;
    if (progress.status === 'active') {
        activeAnalysisUI.steps.slice(0, index).forEach(previous => setStepCompleted(previous));
        setStepActive(step);
    } else if (progress.status === 'completed') setStepCompleted(step);
    if (progress.detail) setStepDetail(step, progress.detail);
}
function resultCard(title, description, state = 'info') {
    return '<div class="ai-result-card"><div class="ai-result-header"><div class="ai-result-icon ' + state + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg></div><div class="ai-result-title">' +
        escapeHtml(title) + '</div></div><div class="ai-result-desc">' + escapeHtml(description) + '</div></div>';
}
function renderAnalysisResult(result) {
    const container = byId('aiResultCards');
    const issues = Array.isArray(result.diagnostics?.issues) ? result.diagnostics.issues : [];
    const recommendations = Array.isArray(result.ai?.recommendations) ? result.ai.recommendations : [];
    let html = issues.map(issue => resultCard(issue.title || t('aiIssuesLbl'), [issue.description, issue.solution].filter(Boolean).join(' '), 'warning')).join('');
    html += recommendations.map(rec => resultCard(rec.type || t('aiRecommendation'), rec.description || rec.expectedImprovement || '')).join('');
    if (result.ai?.overallAssessment) html += resultCard(t('aiOverall'), result.ai.overallAssessment);
    if (!html) html = resultCard(t('aiHealthy'), t('aiNoIssues'), 'success');
    html += '<p class="ai-result-desc">' + escapeHtml(t('aiNotApplied')) + '</p>';
    if (container) container.innerHTML = html;
    byId('aiResults')?.classList.add('active');
    const confidence = byId('aiConfidence');
    if (confidence) confidence.style.display = 'block';
    setText('aiMetricIssues', issues.length);
    setText('aiMetricFixed', recommendations.length);
    const confidenceValue = byId('aiConfValue');
    const confidenceBar = byId('aiConfBar');
    if (confidenceValue) confidenceValue.hidden = true;
    if (confidenceBar?.parentElement) confidenceBar.parentElement.hidden = true;
}
function updateStatusBanner() {
    if (!window.fixme) { setText('statusTitle', t('statusPreview')); setText('statusSubtitle', t('statusPreviewDetail')); return; }
    if (lastAnalysisError) { setText('statusTitle', t('analysisError')); setText('statusSubtitle', lastAnalysisError); return; }
    if (!lastAnalysis) { setText('statusTitle', t('statusTitle')); setText('statusSubtitle', t('statusSubtitle')); return; }
    const issues = lastAnalysis.diagnostics?.issues?.length || 0;
    setText('statusTitle', issues === 1 ? t('statusIssueSingle') : issues ? t('statusIssueCount', { count: issues }) : t('statusChecked'));
    const time = new Date(lastAnalysis.timestamp || Date.now()).toLocaleTimeString(currentLang === 'pt' ? 'pt-BR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    setText('statusSubtitle', t('lastChecked', { time }));
    const banner = document.querySelector('.status-banner');
    if (banner) banner.dataset.state = issues ? 'attention' : 'checked';
}
async function startAnalysis() {
    if (isAnalyzing) return;
    if (!window.fixme) { showToast(t('desktopRequired')); return; }
    isAnalyzing = true;
    lastAnalysisError = '';
    toggleAiPanel(true);
    activeAnalysisUI = resetAnalysisUI();
    try {
        const response = await invoke('runFullAnalysis');
        const result = response.data ?? response;
        if (!result.diagnostics || !Array.isArray(result.diagnostics.issues)) throw new Error(t('analysisUnknown'));
        lastAnalysis = result;
        if (result.hardware?.stats) ingestStats(result.hardware.stats);
        activeAnalysisUI.steps.forEach(step => setStepCompleted(step));
        renderAnalysisResult(result);
        addActivity(t('activityAnalysis'), t('activityAnalysisDetail', { issues: result.diagnostics.issues.length, recommendations: result.ai?.recommendations?.length || 0 }));
    } catch (error) {
        lastAnalysisError = error.message || t('operationFailed');
        if (byId('aiResultCards')) byId('aiResultCards').innerHTML = resultCard(t('analysisError'), lastAnalysisError, 'warning');
        byId('aiResults')?.classList.add('active');
        addActivity(t('activityAnalysisError'), lastAnalysisError);
    } finally {
        activeAnalysisUI?.loading?.classList.remove('active');
        activeAnalysisUI = null;
        isAnalyzing = false;
        syncAnalysisButtons();
        updateStatusBanner();
        updateMLCards();
    }
}

function isMutationBusy() {
    return Boolean(pendingMutation || optimizationStateLoading || ['running', 'blocked'].includes(optimizationProgress?.status));
}
function optimizationName(progress) {
    const config = Object.values(OPTIMIZATIONS).find(item => item.method === progress.operation);
    if (config) return t(config.title);
    if (progress.operation === 'winOptFullBundle') return t('winoptBundleBtnLabel');
    if (progress.operation === 'killProcess') return t('optimizationKill', { name: progress.name || '' }).trim();
    if (progress.operation === 'winOptBoostGame') return t('optimizationBoost', { name: progress.name || '' }).trim();
    return '';
}
function optimizationStepLabel(label) {
    const labels = { visual_effects: 'wocVisualTitle', power: 'wocPowerTitle', services: 'wocServicesTitle',
        telemetry: 'wocTelemetryTitle', network: 'wocNetworkTitle', scheduler: 'wocSchedulerTitle',
        policies: 'wocPoliciesTitle', gpu: 'wocGPUTitle', memory: 'wocMemoryTitle', kill_bg: 'winoptKillTitle' };
    if (labels[label]) return t(labels[label]);
    const config = Object.values(OPTIMIZATIONS).find(item => item.method === label);
    if (config) return t(config.title);
    if (label === 'winOptFullBundle') return t('winoptBundleBtnLabel');
    return /^(winOpt|killProcess$)/.test(label || '') ? '' : label;
}
function renderOptimizationProgress() {
    const panel = byId('optimizationProgress');
    if (!panel) return;
    const progress = optimizationProgress;
    panel.hidden = !progress;
    if (!progress) return;
    const busy = ['running', 'blocked'].includes(progress.status);
    panel.dataset.state = progress.status;
    panel.setAttribute('aria-busy', String(busy));
    const statusKey = { completed: 'optimizationCompleted', failed: 'optimizationFailed', blocked: 'optimizationBlocked' }[progress.status] ||
        { preparing: 'optimizationPreparing', executing: 'optimizationExecuting', finalizing: 'optimizationFinalizing' }[progress.phase] || 'optimizationExecuting';
    const name = optimizationName(progress);
    setText('optimizationProgressTitle', t(statusKey) + (name ? ' · ' + name : ''));
    const total = Math.max(0, numberOrNull(progress.total) || 0);
    const step = Math.min(total, Math.max(0, numberOrNull(progress.step) || 0));
    const parts = [];
    if (total > 1) parts.push(t('optimizationStepLabel', { step: Math.max(1, Math.min(total, step + (busy ? 1 : 0))), total }));
    const label = optimizationStepLabel(progress.label);
    if (label) parts.push(label);
    if (progress.message) parts.push(progress.message);
    if (progress.status === 'blocked') parts.push(t('optimizationBlockedDetail'));
    else if (progress.status === 'running') parts.push(t(progress.phase === 'preparing' ? 'optimizationPreparingDetail' : 'optimizationRunningDetail'));
    setText('optimizationProgressDetail', parts.join(' · '));
    const bar = byId('optimizationProgressBar');
    if (bar) {
        bar.max = total || 1;
        // The backend counts completed steps; a single active command has no measurable percentage.
        if ((!total || total === 1 || numberOrNull(progress.step) === null) && busy) bar.removeAttribute('value');
        else bar.value = progress.status === 'completed' ? total : step;
        bar.setAttribute('aria-label', t(statusKey));
    }
    setText('optimizationElapsed', t('optimizationElapsedLabel', { seconds: Math.floor(Math.max(0, numberOrNull(progress.elapsedMs) || 0) / 1000) }));
}
function receiveOptimizationProgress(progress) {
    if (!progress || !['running', 'completed', 'failed', 'blocked'].includes(progress.status)) return;
    // Ignore a late terminal event for a previous operation while a newer one is running.
    if (optimizationProgress?.operationId && progress.operationId !== optimizationProgress.operationId &&
        ['running', 'blocked'].includes(optimizationProgress.status) && ['completed', 'failed'].includes(progress.status)) return;
    const sameOperation = optimizationProgress?.operationId ? optimizationProgress.operationId === progress.operationId : optimizationProgress?.operation === progress.operation;
    optimizationProgress = { ...(sameOperation ? optimizationProgress : {}), ...progress };
    if (['completed', 'failed'].includes(progress.status) && !progress.message) optimizationProgress.message = '';
    optimizationStateLoading = false;
    optimizationProgressRevision++;
    renderOptimizationStates();
}
async function recoverOptimizationState() {
    if (typeof window.fixme?.getOptimizationState !== 'function' || optimizationStateRequest) return;
    optimizationStateRequest = true;
    const revision = optimizationProgressRevision;
    try {
        const result = await invoke('getOptimizationState');
        // A heartbeat arriving during this read is fresher than its snapshot.
        if (revision !== optimizationProgressRevision) return;
        if (result.data) receiveOptimizationProgress(result.data);
        else { optimizationProgress = null; optimizationStateLoading = false; renderOptimizationStates(); }
    } catch (_) {
        if (revision !== optimizationProgressRevision) return;
        optimizationStateLoading = false;
        optimizationProgress = { ...(optimizationProgress || {}), status: 'blocked', phase: 'preparing', message: t('optimizationStateUnavailable') };
        renderOptimizationStates();
    } finally { optimizationStateRequest = false; }
}
function beginSystemMutation(operation, details = {}) {
    if (isMutationBusy()) return null;
    const mutation = { id: ++mutationSequence, operation, startedAt: Date.now(), ...details };
    pendingMutation = mutation;
    const { button, ...progressDetails } = details;
    optimizationProgress = { operationId: null, operation, status: 'running', phase: 'preparing', step: 0, total: 1, elapsedMs: 0, ...progressDetails };
    optimizationProgressRevision++;
    renderOptimizationStates();
    return mutation;
}
function failSystemMutation(mutation, error) {
    mutation.failed = true;
    const uncertain = ['OPTIMIZATION_BUSY', 'ELEVATION_TIMEOUT', 'ELEVATION_BLOCKED'].includes(error.code);
    if (uncertain) {
        mutation.uncertain = true;
        optimizationProgress = { ...optimizationProgress, status: error.code === 'OPTIMIZATION_BUSY' ? 'running' : 'blocked',
            message: t(error.code === 'OPTIMIZATION_BUSY' ? 'optimizationBusyMessage' : 'optimizationBlocked') };
        optimizationProgressRevision++;
    }
    const message = uncertain ? t(error.code === 'OPTIMIZATION_BUSY' ? 'optimizationBusyMessage' : 'optimizationBlockedDetail') : error.message || t('operationFailed');
    showToast(message, uncertain ? 8500 : 4500);
}
function finishSystemMutation(mutation) {
    if (pendingMutation !== mutation) return;
    pendingMutation = null;
    if (!mutation.uncertain && optimizationProgress && ['running', 'blocked'].includes(optimizationProgress.status)) {
        optimizationProgress = { ...optimizationProgress, status: mutation.failed ? 'failed' : 'completed', phase: 'finalizing',
            elapsedMs: Date.now() - mutation.startedAt, message: mutation.failed ? t('operationFailed') : '' };
        optimizationProgressRevision++;
    }
    renderOptimizationStates();
    if (mutation.button) {
        mutation.button.disabled = isMutationBusy() || typeof window.fixme?.killProcess !== 'function';
        mutation.button.textContent = t('killAction');
    }
    if (mutation.uncertain) recoverOptimizationState();
}
function renderOptimizationStates() {
    const locked = isMutationBusy();
    Object.entries(OPTIMIZATIONS).forEach(([type, config]) => {
        const busy = locked && optimizationProgress?.type === type;
        const apply = byId('tog' + config.suffix);
        const revert = byId('revert' + config.suffix);
        const card = byId('woc-' + type);
        if (apply) { apply.disabled = locked || typeof window.fixme?.[config.method] !== 'function'; apply.textContent = t(busy && optimizationProgress.apply !== false ? 'applyingAction' : 'applyAction'); apply.setAttribute('aria-busy', String(busy && optimizationProgress.apply !== false)); }
        if (revert) { revert.disabled = locked || typeof window.fixme?.[config.revert] !== 'function' || !appliedOptimizations.has(type); revert.textContent = t(busy && optimizationProgress.apply === false ? 'revertingAction' : 'revertAction'); }
        if (card) {
            card.classList.toggle('active', appliedOptimizations.has(type));
            if (busy) card.dataset.state = 'busy';
            else if (card.dataset.state === 'busy') card.dataset.state = appliedOptimizations.has(type) ? 'applied' : 'ready';
        }
    });
    const bundle = byId('winoptBundleBtn');
    if (bundle) bundle.disabled = typeof window.fixme?.winOptFullBundle !== 'function' || locked;
    setText('winoptBundleBtnLabel', t(locked && optimizationProgress?.operation === 'winOptFullBundle' ? 'bundleBusy' : 'winoptBundleBtnLabel'));
    document.querySelectorAll('.winopt-kill-btn').forEach(button => {
        button.disabled = locked || typeof window.fixme?.killProcess !== 'function';
        button.textContent = t(pendingMutation?.name === button.dataset.processName && pendingMutation.operation === 'killProcess' ? 'killBusy' : 'killAction');
    });
    const boost = document.querySelector('#winoptGameBoost .winopt-gameboost-btn');
    if (boost) boost.disabled = locked || typeof window.fixme?.winOptBoostGame !== 'function';
    if (byId('gameBoostInput')) byId('gameBoostInput').disabled = locked || typeof window.fixme?.winOptBoostGame !== 'function';
    renderOptimizationProgress();
}
async function applyWinOpt(type, apply = true) {
    const config = OPTIMIZATIONS[type];
    if (!config || isMutationBusy()) return;
    if (!window.fixme) { showToast(t('desktopRequired')); return; }
    if (!apply && !config.revert) { showToast(t('noRevert')); return; }
    const card = byId('woc-' + type);
    const mutation = beginSystemMutation(apply ? config.method : config.revert, { type, apply });
    if (!mutation) return;
    try {
        await invoke(apply ? config.method : config.revert, ...(apply ? config.args || [] : config.revertArgs || []));
        if (apply) appliedOptimizations.add(type); else appliedOptimizations.delete(type);
        if (card) card.dataset.state = apply ? 'applied' : 'ready';
        const name = t(config.title);
        showToast(t(apply ? 'operationApplied' : 'operationReverted', { name }));
        addActivity(t(apply ? 'activityApplied' : 'activityReverted', { name }));
    } catch (error) { if (card) card.dataset.state = 'error'; failSystemMutation(mutation, error); }
    finally { finishSystemMutation(mutation); updateMLCards(); }
}
async function runFullOptimization() {
    if (isMutationBusy()) return;
    if (!window.fixme?.winOptFullBundle) { showToast(t('desktopRequired')); return; }
    const mutation = beginSystemMutation('winOptFullBundle');
    if (!mutation) return;
    try {
        const result = await window.fixme.winOptFullBundle({ visualEffects: true, power: true, services: false, telemetry: false, network: false, scheduler: false, policies: false, gpu: false, memory: false, killProcesses: false });
        const data = result?.data || {};
        const completed = Array.isArray(data.completed) ? data.completed : Array.isArray(data.applied) ? data.applied : [];
        const failed = Array.isArray(data.failed) ? data.failed : Array.isArray(data.errors) ? data.errors : [];
        const aliases = { visual_effects: 'visual', bloat_services: 'services', services: 'services', telemetry: 'telemetry', power_ultimate: 'power', power_high_tuned: 'power', power_high: 'power', power: 'power', network: 'network', scheduler: 'scheduler', registry_policies: 'policies', policies: 'policies', gpu: 'gpu', memory: 'memory' };
        completed.forEach(item => { const type = aliases[typeof item === 'string' ? item : item.applied]; if (type) { appliedOptimizations.add(type); const card = byId('woc-' + type); if (card) card.dataset.state = 'applied'; } });
        const message = t('bundleResult', { done: completed.length, failed: failed.length });
        if (result?.success !== true && !completed.length && !failed.length) requireSuccess(result);
        if (result?.code && ['OPTIMIZATION_BUSY', 'ELEVATION_TIMEOUT', 'ELEVATION_BLOCKED'].includes(result.code)) {
            const error = new Error(result.error || t('operationFailed')); error.code = result.code; throw error;
        }
        if (failed.length || result?.success !== true) mutation.failed = true;
        showToast(message, 6500);
        addActivity(t('winoptBundleBtnLabel'), message);
    } catch (error) { failSystemMutation(mutation, error); }
    finally {
        finishSystemMutation(mutation);
        updateMLCards();
    }
}

async function refreshKillCandidates() {
    const list = byId('winoptKillList');
    if (!list) return;
    if (!window.fixme) { list.innerHTML = '<div class="winopt-kill-loading">' + escapeHtml(t('desktopRequired')) + '</div>'; return; }
    list.innerHTML = '<div class="winopt-kill-loading">' + escapeHtml(t('loading')) + '</div>';
    const refresh = byId('winoptRefreshKillBtn');
    if (refresh) refresh.disabled = true;
    try {
        const result = await invoke('winOptGetKillCandidates');
        const candidates = result.data;
        if (!Array.isArray(candidates)) throw new Error(t('processUnavailable'));
        if (!candidates.length) { list.innerHTML = '<div class="winopt-kill-loading">' + escapeHtml(t('killNone')) + '</div>'; return; }
        list.innerHTML = '';
        const warning = document.createElement('p'); warning.className = 'winopt-kill-warning'; warning.textContent = t('killWarning'); list.appendChild(warning);
        candidates.forEach(process => {
            const row = document.createElement('div'); row.className = 'winopt-kill-item';
            const name = document.createElement('span'); name.className = 'winopt-kill-name'; name.textContent = process.name || process.exe;
            const exe = document.createElement('span'); exe.className = 'winopt-kill-cpu'; exe.textContent = process.exe || process.name;
            const button = document.createElement('button'); button.type = 'button'; button.className = 'winopt-kill-btn'; button.textContent = t('killAction');
            button.dataset.processName = process.exe || process.name;
            button.disabled = isMutationBusy() || typeof window.fixme.killProcess !== 'function';
            button.addEventListener('click', () => killProcess(process.exe || process.name, button));
            row.append(name, exe, button); list.appendChild(row);
        });
    } catch (error) { list.innerHTML = '<div class="winopt-kill-loading">' + escapeHtml(error.message || t('processUnavailable')) + '</div>'; }
    finally { if (refresh) refresh.disabled = false; }
}
async function killProcess(name, button) {
    if (isMutationBusy()) return;
    if (!window.fixme) { showToast(t('desktopRequired')); return; }
    const mutation = beginSystemMutation('killProcess', { name, button });
    if (!mutation) return;
    if (button) { button.disabled = true; button.textContent = t('killBusy'); }
    try {
        await invoke('killProcess', name);
        addActivity(t('activityKilled', { name }));
        showToast(t('activityKilled', { name }));
        await Promise.allSettled([refreshKillCandidates(), loadRunningApps()]);
    } catch (error) { failSystemMutation(mutation, error); }
    finally { finishSystemMutation(mutation); }
}
async function boostGameProcess() {
    if (isMutationBusy()) return;
    const input = byId('gameBoostInput');
    const name = input?.value.trim() || '';
    if (!/^[\w .()-]+(?:\.exe)?$/i.test(name)) { showToast(t('boostRequired')); return; }
    const mutation = beginSystemMutation('winOptBoostGame', { name });
    if (!mutation) return;
    try { await invoke('winOptBoostGame', name); showToast(t('activityBoost', { name })); addActivity(t('activityBoost', { name })); }
    catch (error) { failSystemMutation(mutation, error); }
    finally { finishSystemMutation(mutation); }
}

function prepareDeepResult() {
    if (byId('deepaiIdle')) byId('deepaiIdle').style.display = 'none';
    if (byId('deepaiResult')) byId('deepaiResult').style.display = 'block';
    const content = byId('deepaiResultContent');
    if (content) content.innerHTML = '<p class="ml-message">' + escapeHtml(t('deepLoading')) + '</p>';
    return content;
}
function deepPlanHTML(plan) {
    return (Array.isArray(plan) ? plan : []).map(item => '<div class="deepai-plan-item"><div class="deepai-plan-header"><span class="deepai-plan-title">' +
        escapeHtml(item.title || '') + '</span></div><div class="deepai-plan-desc">' + escapeHtml(item.description || item.estimatedGain || '') + '</div>' +
        (Array.isArray(item.steps) ? item.steps.map(step => '<p class="deepai-plan-desc">' + escapeHtml(step) + '</p>').join('') : '') + '</div>').join('');
}
function renderDeepAIResult(data, container) {
    if (!container) return;
    if (!data || data.error) { container.innerHTML = resultCard(t('aiUnavailable'), data?.error || t('deepNoResult'), 'warning'); return; }
    const profile = data.systemProfile || {};
    const bottlenecks = [profile.cpuBottleneck && 'CPU', profile.memoryBottleneck && t('memoryLabel'), profile.gpuBottleneck && 'GPU'].filter(Boolean);
    const issues = Array.isArray(profile.topIssues) ? profile.topIssues : [];
    const predictions = data.predictions || {};
    const estimateFields = [['estimatedFpsGain', 'deepFps', ''], ['estimatedLatencyReduction', 'deepLatency', ' ms'], ['estimatedBootImprovement', 'deepBoot', ' s']];
    const estimates = estimateFields.filter(([key]) => numberOrNull(predictions[key]) !== null).map(([key, label, suffix]) => '<div class="deepai-pred-box"><div class="deepai-pred-val">' + escapeHtml(formatNumber(predictions[key]) + suffix) + '</div><div class="deepai-pred-label">' + escapeHtml(t(label)) + '</div></div>').join('');
    container.innerHTML = '<p class="deepai-plan-desc">' + escapeHtml(t('deepBottlenecks')) + ': ' + escapeHtml(bottlenecks.join(', ') || t('deepNone')) + '</p>' +
        issues.map(issue => '<p class="deepai-plan-desc">' + escapeHtml(issue) + '</p>').join('') +
        (estimates ? '<div class="deepai-predictions">' + estimates + '</div><p class="deepai-plan-desc">' + escapeHtml(t('deepEstimates')) + '</p>' : '') +
        deepPlanHTML(data.optimizationPlan) + (Array.isArray(data.insights) ? data.insights.map(insight => '<p class="deepai-plan-desc">' + escapeHtml(insight) + '</p>').join('') : '');
}
async function runDeepAnalysis(userContext = '') {
    if (deepAIActive) return;
    if (!window.fixme) { showToast(t('desktopRequired')); return; }
    deepAIActive = true;
    const content = prepareDeepResult();
    try { const result = await invoke('deepAIAnalyze', typeof userContext === 'string' ? userContext : ''); renderDeepAIResult(result.data, content); }
    catch (error) { if (content) content.innerHTML = resultCard(t('aiUnavailable'), error.message, 'warning'); }
    finally { deepAIActive = false; }
}
async function refineDeepAnalysis() {
    if (deepAIActive) return;
    const input = byId('deepaiRefineInput');
    const question = input?.value.trim() || '';
    if (!question) { showToast(t('deepQuestionRequired')); return; }
    const content = byId('deepaiResultContent');
    deepAIActive = true;
    const button = document.querySelector('.winopt-deepai-refine button');
    if (button) button.disabled = true;
    try {
        const result = await invoke('deepAIRefine', question);
        const data = result.data;
        if (data?.error) throw new Error(data.error);
        if (content) content.insertAdjacentHTML('beforeend', resultCard(question, data?.answer || t('deepNoResult')) + deepPlanHTML(data?.additionalOptimizations));
        if (input) input.value = '';
    } catch (error) { showToast(error.message); }
    finally { deepAIActive = false; if (button) button.disabled = !window.fixme; }
}
async function showBottleneckMenu() {
    if (deepAIActive) return;
    if (!window.fixme) { showToast(t('desktopRequired')); return; }
    const type = await new Promise(resolve => {
        const dialog = document.createElement('dialog'); dialog.className = 'bottleneck-dialog';
        dialog.style.cssText = 'margin:auto;padding:24px;border:1px solid var(--border-color);border-radius:14px;background:var(--bg-secondary);color:var(--text-primary);min-width:270px';
        const title = document.createElement('p'); title.id = 'bottleneckTitle'; title.textContent = t('bottleneckChoose'); dialog.appendChild(title);
        dialog.setAttribute('aria-labelledby', title.id);
        const finish = value => { dialog.close(); dialog.remove(); resolve(value); };
        [['cpu', 'CPU'], ['memory', t('memoryLabel')], ['gpu', 'GPU'], [null, t('cancelAction')]].forEach(([value, label]) => {
            const button = document.createElement('button'); button.type = 'button'; button.className = 'winopt-deepai-btn-secondary'; button.textContent = label;
            button.style.cssText = 'display:block;margin-top:12px;width:100%';
            button.addEventListener('click', () => finish(value)); dialog.appendChild(button);
        });
        dialog.addEventListener('cancel', event => { event.preventDefault(); finish(null); });
        document.body.appendChild(dialog); dialog.showModal();
    });
    if (!type) return;
    deepAIActive = true;
    const content = prepareDeepResult();
    try {
        const result = await invoke('deepAIBottleneck', type);
        const data = result.data || {};
        if (data.error) throw new Error(data.error);
        if (content) content.innerHTML = (data.rootCause ? resultCard(t('deepRootCause'), data.rootCause) : '') + deepPlanHTML(data.optimizations) +
            (Array.isArray(data.warnings) ? data.warnings.map(warning => resultCard(t('aiIssuesLbl'), warning, 'warning')).join('') : '');
    } catch (error) { if (content) content.innerHTML = resultCard(t('aiUnavailable'), error.message, 'warning'); }
    finally { deepAIActive = false; }
}
async function clearDeepAISession() {
    if (deepAIActive) return;
    try {
        await invoke('deepAIClearSession');
        if (byId('deepaiIdle')) byId('deepaiIdle').style.display = 'block';
        if (byId('deepaiResult')) byId('deepaiResult').style.display = 'none';
        if (byId('deepaiResultContent')) byId('deepaiResultContent').textContent = '';
        showToast(t('deepCleared'));
    } catch (error) { showToast(error.message); }
}

function fillProfileForm(profile) {
    document.querySelectorAll('input[name="profileUsageType"]').forEach(input => { input.checked = input.value === profile.usageType; });
    document.querySelectorAll('input[name="profilePriority"]').forEach(input => { input.checked = input.value === profile.priority; });
    if (byId('profileFavoriteAppsInput')) byId('profileFavoriteAppsInput').value = profile.favoriteApps || '';
    document.querySelectorAll('#profilePeakHoursGroup input[type="checkbox"]').forEach(input => { input.checked = Array.isArray(profile.peakHours) && profile.peakHours.includes(input.value); });
}
function openProfileOverlay() {
    const overlay = byId('profileOverlay');
    if (!overlay) return;
    profileReturnFocus = document.activeElement;
    overlay.hidden = false;
    overlay.inert = false;
    overlay.classList.add('show');
    overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-labelledby', 'profileOverlayTitle');
    const skip = byId('profileSkipBtn');
    if (skip) { skip.style.display = 'block'; skip.textContent = t('profileSkipBtn'); }
    overlay.querySelector('input,button')?.focus();
    syncModalBackground();
    if (window.fixme) invoke('getProfile').then(result => { if (result.data) fillProfileForm(result.data); }).catch(() => {});
}
function closeProfileOverlay() {
    const overlay = byId('profileOverlay');
    if (!overlay?.classList.contains('show')) return;
    overlay.classList.remove('show'); overlay.hidden = true; overlay.inert = true;
    syncModalBackground();
    profileReturnFocus?.focus();
    profileReturnFocus = null;
}
function skipProfileOverlay() { closeProfileOverlay(); }
async function saveProfileForm() {
    const usageType = document.querySelector('input[name="profileUsageType"]:checked')?.value;
    const priority = document.querySelector('input[name="profilePriority"]:checked')?.value;
    if (!usageType || !priority) { showToast(t('profileRequiredToast')); return; }
    const button = document.querySelector('.profile-save-btn');
    if (button) button.disabled = true;
    try {
        await invoke('saveProfile', { usageType, priority, favoriteApps: byId('profileFavoriteAppsInput')?.value.trim() || '', peakHours: Array.from(document.querySelectorAll('#profilePeakHoursGroup input:checked')).map(input => input.value) });
        showToast(t('profileSavedToast')); closeProfileOverlay();
    } catch (error) { showToast(error.message); }
    finally { if (button) button.disabled = false; }
}
function dismissStartup() { const overlay = byId('startupOverlay'); if (overlay) { overlay.hidden = true; overlay.style.display = 'none'; } }
async function runStartupSequence() {
    dismissStartup();
    if (!window.fixme) {
        appsState = 'preview'; setConnectionState('preview'); renderApps();
        document.querySelectorAll('.winopt-gameboost-btn,.winopt-deepai-btn-primary,.winopt-deepai-btn-secondary').forEach(button => { button.disabled = true; });
        return;
    }
    setConnectionState('connecting');
    if (typeof window.fixme.getOptimizationState === 'function') {
        optimizationStateLoading = true;
        renderOptimizationStates();
    }
    if (typeof window.fixme.onStatsUpdate === 'function') {
        const stop = window.fixme.onStatsUpdate(data => { if (data?.error) setConnectionState('offline'); else ingestStats(data?.stats ?? data); });
        if (typeof stop === 'function') unsubscribe.push(stop);
    }
    if (typeof window.fixme.onAnalysisProgress === 'function') {
        const stop = window.fixme.onAnalysisProgress(receiveAnalysisProgress);
        if (typeof stop === 'function') unsubscribe.push(stop);
    }
    if (typeof window.fixme.onOptimizationProgress === 'function') {
        const stop = window.fixme.onOptimizationProgress(receiveOptimizationProgress);
        if (typeof stop === 'function') unsubscribe.push(stop);
    }
    recoverOptimizationState();
    // These independent reads run in the background; no startup diagnostic or system action runs here.
    loadSystemInfo(); loadStats(); loadRunningApps(); updateMLCards(); refreshKillCandidates();
    const startedAt = Date.now();
    timers.push(setInterval(() => { if (Date.now() - (lastStatsAt || startedAt) > 15000) setConnectionState('offline'); }, 5000));
    timers.push(setInterval(loadRunningApps, 30000));
    timers.push(setInterval(updateMLCards, 30000));
    if (typeof window.fixme.getOptimizationState === 'function') {
        timers.push(setInterval(() => { if (optimizationProgress?.status === 'blocked') recoverOptimizationState(); }, 5000));
    }
    try { await invoke('startMonitoring', 2000); } catch (_) { setConnectionState('offline'); }
}

document.addEventListener('DOMContentLoaded', () => {
    dismissStartup();
    if (byId('profileOverlay')) byId('profileOverlay').hidden = true;
    document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => switchView(button.dataset.view, false, true)));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') { closeProfileOverlay(); toggleAiPanel(false); }
        const profile = byId('profileOverlay');
        const panel = byId('aiPanel');
        const overlay = profile?.classList.contains('show') ? profile : panel?.classList.contains('open') ? panel : null;
        if (event.key === 'Tab' && overlay) {
            const focusable = Array.from(overlay.querySelectorAll('input,button')).filter(element => !element.disabled && !element.hidden);
            const first = focusable[0], last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
    });
    applyLang();
    runStartupSequence();
});
window.addEventListener('beforeunload', () => { timers.forEach(clearInterval); unsubscribe.forEach(stop => stop()); });
