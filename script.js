// Dados do planner (serão carregados de um JSON externo)
let plannerData = []; // Esta variável agora conterá os dados mockados se o usuário importar

// Citações motivacionais
const motivationalQuotes = [
    { quote: "A persistência é o caminho do êxito.", author: "Charles Chaplin" },
    { quote: "O único lugar onde o sucesso vem antes do trabalho é no dicionário.", author: "Vidal Sassoon" },
    { quote: "Eu não falhei. Apenas encontrei 10.000 maneiras que não funcionam.", author: "Thomas Edison" },
    { quote: "Acredite em você mesmo e em tudo o que você é. Saiba que há algo dentro de você que é maior do que qualquer obstáculo.", author: "Christian D. Larson" },
    { quote: "O sucesso é a soma de pequenos esforços repetidos dia após dia.", author: "Robert Collier" },
    { quote: "Não espere por oportunidades, crie-as.", author: "Roy T. Bennett" },
    { quote: "A diferença entre o impossível e o possível reside na determinação de uma pessoa.", author: "Tommy Lasorda" },
    { quote: "Se você quer algo que nunca teve, você deve fazer algo que nunca fez.", author: "Desconhecido" },
    { quote: "Comece onde você está. Use o que você tem. Faça o que você pode.", author: "Arthur Ashe" },
    { quote: "A força não vem da capacidade física. Ela vem de uma vontade indomável.", author: "Mahatma Gandhi" }
];

// Configurações do Pomodoro
const POMODORO_SETTINGS = {
    STUDY_DURATION: 25 * 60 * 1000, // 25 minutos
    SHORT_BREAK_DURATION: 5 * 60 * 1000, // 5 minutos
    LONG_BREAK_DURATION: 15 * 60 * 1000, // 15 minutos
    SESSIONS_BEFORE_LONG_BREAK: 4
};

// Estado global da aplicação
let appState = {
    plannerData: [],
    currentDisplayDate: null, // Armazena a data ISO do dia que está sendo exibido
    timerAccumulatedTime: 0, // Tempo acumulado do timer em milissegundos para o dia atual (não usado diretamente para Pomodoro, mas mantido para compatibilidade)
    isTimerRunning: false,
    timerInterval: null,
    timerStartTime: 0, // Timestamp do último início/retomada do timer
    fullPlannerRenderedDays: 0, // Quantidade de dias renderizados no cronograma completo
    // Novos estados para o Pomodoro
    pomodoroPhase: 'stopped', // 'study', 'short-break', 'long-break', 'stopped'
    pomodoroRemainingTime: 0, // Tempo restante na fase atual (em milissegundos)
    pomodoroSessionCount: 0, // Número de sessões de estudo concluídas no ciclo atual
    activeTab: 'today' // Nova propriedade para controlar a aba ativa
};

const DAYS_PER_LOAD = 30; // Quantidade de dias para carregar por vez no cronograma completo
const MIN_DATE = '2025-07-08'; // Data mínima permitida para navegação

// Função para carregar o estado do planner do localStorage
function loadAppState() {
    const savedState = localStorage.getItem('plannerState_v5'); // Usando v5 para evitar conflito
    if (savedState) {
        const parsedState = JSON.parse(savedState);
        // Mescla o estado salvo com os valores padrão para novas propriedades
        appState = {
            ...appState, // Mantém propriedades padrão como timerInterval, timerStartTime
            ...parsedState,
            // Garante que o timer não esteja rodando ao carregar
            isTimerRunning: false,
            timerInterval: null,
            timerStartTime: 0,
            // Inicializa estados do Pomodoro se não existirem no estado salvo
            pomodoroPhase: parsedState.pomodoroPhase !== undefined ? parsedState.pomodoroPhase : 'stopped',
            pomodoroRemainingTime: parsedState.pomodoroRemainingTime !== undefined ? parsedState.pomodoroRemainingTime : 0,
            pomodoroSessionCount: parsedState.pomodoroSessionCount !== undefined ? parsedState.pomodoroSessionCount : 0,
            // Define a aba ativa ao carregar, ou 'today' como padrão
            activeTab: parsedState.activeTab !== undefined ? parsedState.activeTab : 'today',
        };
    } else {
        // Se não houver estado salvo, inicializa com dados vazios
        appState.plannerData = [];
        appState.currentDisplayDate = new Date().toISOString().split('T')[0]; // Define a data atual como padrão
        appState.activeTab = 'today'; // Define a aba inicial
    }

    // Garante que todos os dias no plannerData tenham a propriedade dailyNotes
    appState.plannerData.forEach(day => {
        if (day.dailyNotes === undefined) {
            day.dailyNotes = '';
        }
    });
}

// Função para salvar o estado do planner no localStorage
function saveAppState() {
    localStorage.setItem('plannerState_v5', JSON.stringify(appState));
}

// Função para exibir o modal de confirmação
function showConfirmationModal(title, message, confirmText, confirmClass, onConfirm, onCancel = () => {}) {
    const modalOverlay = document.getElementById('confirmationModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const confirmBtn = document.getElementById('confirmModalBtn');
    const cancelBtn = document.getElementById('cancelModalBtn');

    modalTitle.textContent = title;
    modalMessage.textContent = message;
    confirmBtn.textContent = confirmText;
    confirmBtn.className = `modal-btn ${confirmClass}`; // Aplica classes dinamicamente

    confirmBtn.onclick = () => {
        onConfirm();
        modalOverlay.classList.remove('show');
    };
    cancelBtn.onclick = () => {
        onCancel(); // Chama a função onCancel se fornecida
        modalOverlay.classList.remove('show');
    };

    modalOverlay.classList.add('show');
}

// Função para obter o ícone SVG com base no tipo de tarefa
function getTaskIcon(type) {
    switch (type) {
        case 'study': return `<svg class="task-icon" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"></path></svg>`; // Eye icon
        case 'questions': return `<svg class="task-icon" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.442l-2.577 4.727A1 1 0 007 13h6a1 1 0 00.867-1.442l-2.577-4.727A1 1 0 0010 7z" clip-rule="evenodd"></path></svg>`; // Question mark icon
        case 'discursive': return `<svg class="task-icon" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0113 3.414L16.586 7A2 2 0 0118 8.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 2h2v2H6V6zm4 0h4v2h-4V6zm0 4h4v2h-4v-2z" clip-rule="evenodd"></path></svg>`; // Document icon
        case 'simulado': return `<svg class="task-icon" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>`; // Check circle icon
        case 'revision': return `<svg class="task-icon" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm-5 8a5 5 0 1110 0 5 5 0 01-10 0z"></path><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path></svg>`; // Refresh icon
        case 'rest': return `<svg class="task-icon" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9a1 1 0 000 2h2a1 1 0 100-2H9z" clip-rule="evenodd"></path></svg>`; // Info icon (for rest)
        default: return `<svg class="task-icon" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9a1 1 0 000 2h2a1 1 0 100-2H9z" clip-rule="evenodd"></path></svg>`; // Default info icon
    }
}

// --- Funções do Timer Pomodoro ---

// Função para tocar um som de notificação
function playNotificationSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.value = 440; // Frequência do som (A4)

        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime); // Volume
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.5); // Fade out
        oscillator.stop(audioContext.currentTime + 0.5); // Parar após 0.5 segundos
    } catch (e) {
        console.warn("Navegador não suporta AudioContext ou houve um erro ao tocar o som:", e);
    }
}

// Função para enviar uma notificação do navegador
function sendNotification(title, body) {
    if (Notification.permission === 'granted') {
        new Notification(title, { body: body });
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification(title, { body: body });
            }
        });
    }
}

// Atualiza o display do timer e verifica o fim da fase
function updatePomodoroTimer() {
    if (appState.pomodoroPhase === 'stopped') {
        return;
    }

    const now = Date.now();
    const elapsed = now - appState.timerStartTime;
    appState.pomodoroRemainingTime = Math.max(0, appState.pomodoroRemainingTime - elapsed);
    appState.timerStartTime = now; // Reinicia o tempo de início para o próximo intervalo

    updateTimerDisplay();

    if (appState.pomodoroRemainingTime === 0) {
        clearInterval(appState.timerInterval);
        playNotificationSound();
        sendNotification('Pomodoro Concluído!', `Hora de ${appState.pomodoroPhase === 'study' ? 'uma pausa!' : 'voltar a estudar!'}`);
        nextPomodoroPhase();
    }
}

// Inicia uma sessão Pomodoro (estudo ou pausa)
function startPomodoro() {
    if (appState.pomodoroPhase === 'stopped' || appState.pomodoroRemainingTime === 0) {
        // Inicia uma nova sessão de estudo se estiver parado ou zerado
        appState.pomodoroPhase = 'study';
        appState.pomodoroRemainingTime = POMODORO_SETTINGS.STUDY_DURATION;
    }
    appState.isTimerRunning = true;
    appState.timerStartTime = Date.now();
    appState.timerInterval = setInterval(updatePomodoroTimer, 1000);
    setTimerButtonsState();
    saveAppState();
}

// Pausa a sessão Pomodoro atual
function pausePomodoro() {
    if (appState.isTimerRunning) {
        clearInterval(appState.timerInterval);
        appState.isTimerRunning = false;
        setTimerButtonsState();
        saveAppState();
    }
}

// Para a sessão Pomodoro atual e reseta
function stopPomodoro() {
    if (appState.isTimerRunning) {
        pausePomodoro(); // Pausa o timer antes de parar completamente
    }

    // Acumula o tempo de estudo se a fase atual era de estudo
    if (appState.pomodoroPhase === 'study') {
        const todayData = appState.plannerData.find(day => day.date === appState.currentDisplayDate);
        if (todayData) {
            const timeStudiedThisSession = POMODORO_SETTINGS.STUDY_DURATION - appState.pomodoroRemainingTime;
            todayData.studyHours += timeStudiedThisSession / (1000 * 60 * 60);
            document.getElementById('studyHoursInput').value = todayData.studyHours.toFixed(1);
        }
    }

    appState.pomodoroPhase = 'stopped';
    appState.pomodoroRemainingTime = 0;
    appState.pomodoroSessionCount = 0; // Reseta as sessões no ciclo completo
    clearInterval(appState.timerInterval);
    appState.timerInterval = null;
    appState.timerStartTime = 0;
    setTimerButtonsState();
    updateTimerDisplay(); // Reseta o display para 00:00:00
    saveAppState();
    updateSummary();
    renderFullPlanner(); // Atualiza o planner completo para refletir as horas
}

// Transiciona para a próxima fase do Pomodoro
function nextPomodoroPhase() {
    if (appState.pomodoroPhase === 'study') {
        appState.pomodoroSessionCount++;
        if (appState.pomodoroSessionCount % POMODORO_SETTINGS.SESSIONS_BEFORE_LONG_BREAK === 0) {
            appState.pomodoroPhase = 'long-break';
            appState.pomodoroRemainingTime = POMODORO_SETTINGS.LONG_BREAK_DURATION;
        } else {
            appState.pomodoroPhase = 'short-break';
            appState.pomodoroRemainingTime = POMODORO_SETTINGS.SHORT_BREAK_DURATION;
        }
    } else { // Era uma pausa
        appState.pomodoroPhase = 'study';
        appState.pomodoroRemainingTime = POMODORO_SETTINGS.STUDY_DURATION;
    }
    startPomodoro(); // Inicia automaticamente a próxima fase
}

// Formata o tempo em HH:MM:SS
function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds]
        .map(unit => String(unit).padStart(2, '0'))
        .join(':');
}

// Atualiza o display do timer e o texto da fase
function updateTimerDisplay() {
    const timerDisplay = document.getElementById('timerDisplay');
    const pomodoroPhaseText = document.getElementById('pomodoroPhaseText');

    if (appState.pomodoroPhase === 'stopped') {
        timerDisplay.textContent = '00:00:00';
        pomodoroPhaseText.textContent = 'Parado';
    } else {
        timerDisplay.textContent = formatTime(appState.pomodoroRemainingTime);
        switch (appState.pomodoroPhase) {
            case 'study': pomodoroPhaseText.textContent = 'Estudo'; break;
            case 'short-break': pomodoroPhaseText.textContent = 'Pausa Curta'; break;
            case 'long-break': pomodoroPhaseText.textContent = 'Pausa Longa'; break;
        }
    }
}

// Define o estado dos botões do timer
function setTimerButtonsState() {
    const startBtn = document.getElementById('startTimerBtn');
    const pauseBtn = document.getElementById('pauseTimerBtn');
    const stopBtn = document.getElementById('stopTimerBtn');

    if (appState.isTimerRunning) {
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
    } else {
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = appState.pomodoroPhase === 'stopped' && appState.pomodoroRemainingTime === 0;
    }
}

// --- Fim Funções do Timer Pomodoro ---

// Função para formatar a data de exibição e o título da seção
function getTodaySectionTitle(dateString) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(dateString + 'T00:00:00');
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let titlePrefix = 'Tarefas de';
    let dateSuffix;

    if (diffDays === 0) {
        dateSuffix = 'Hoje';
    } else if (diffDays === 1) {
        dateSuffix = 'Amanhã';
    } else if (diffDays === -1) {
        dateSuffix = 'Ontem';
    } else {
        dateSuffix = targetDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    return `${titlePrefix} ${dateSuffix}`;
}

// Função para renderizar as tarefas do dia atual
function renderTodayTasks() {
    const displayDate = new Date(appState.currentDisplayDate + 'T00:00:00');
    const displayDateString = displayDate.toISOString().split('T')[0];
    let todayData = appState.plannerData.find(day => day.date === displayDateString);

    // Se não houver dados para o dia, cria um objeto básico para ele
    if (!todayData) {
        todayData = { date: displayDateString, studyHours: 0, tasks: [], dailyNotes: '' };
        appState.plannerData.push(todayData);
        appState.plannerData.sort((a, b) => new Date(a.date) - new Date(b.date)); // Mantém ordenado
    }

    const todayTaskList = document.getElementById('todayTaskList');
    todayTaskList.innerHTML = ''; // Limpa a lista antes de renderizar

    // Atualiza o título principal da seção de tarefas do dia
    document.getElementById('todaySectionTitle').textContent = getTodaySectionTitle(displayDateString);

    // Adiciona o campo de input para horas de estudo
    const studyHoursInput = document.getElementById('studyHoursInput');
    if (studyHoursInput) {
        studyHoursInput.value = todayData.studyHours.toFixed(1);
    }

    // Preenche e adiciona listener para anotações diárias
    const dailyNotesInput = document.getElementById('dailyNotesInput');
    if (dailyNotesInput) {
        dailyNotesInput.value = todayData.dailyNotes || '';
        dailyNotesInput.oninput = (event) => {
            todayData.dailyNotes = event.target.value;
            saveAppState();
        };
    }

    if (todayData.tasks.length > 0) {
        todayData.tasks.forEach(task => {
            const listItem = document.createElement('li');
            listItem.className = `today-task-item ${task.completed ? 'completed' : ''}`;
            listItem.innerHTML = `
                <input type="checkbox" id="task-${task.id}" ${task.completed ? 'checked' : ''}>
                ${getTaskIcon(task.type)}
                <label for="task-${task.id}">${task.description}</label>
                <span class="today-task-status ${getTaskStatusClass(task.type)}">${getTaskStatusText(task.type)}</span>
                <div class="task-action-buttons">
                    <button class="action-btn toggle-tips-btn" data-task-id="${task.id}" title="Ver Dica/Bizu">
                        <svg fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>
                    </button>
                    <button class="action-btn toggle-notes-btn" data-task-id="${task.id}" title="Adicionar Anotação">
                        <svg fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M17 12h-2V7h-5V2H7v5H2v5h5v5h5v-5h5v-5z"></path></svg>
                    </button>
                    <button class="action-btn edit-task-btn" data-task-id="${task.id}" data-current-date="${displayDateString}" title="Editar Tarefa">
                        <svg fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M13.586 3.586a2 2 0 112.828 2.828l-7.793 7.793a1 1 0 01-.328.288l-3 1a1 1 0 01-1.244-1.244l1-3a1 1 0 01.288-.328l7.793-7.793zM10 12l-1 1 3 1 1-3-3-1z"></path></svg>
                    </button>
                    <button class="action-btn delete-task-btn" data-task-id="${task.id}" data-current-date="${displayDateString}" title="Excluir Tarefa">
                        <svg fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 11-2 0v6a1 1 0 112 0V8z" clip-rule="evenodd"></path></svg>
                    </button>
                </div>
                <textarea class="notes-textarea ${task.notes ? '' : 'hidden'}" data-task-id="${task.id}" placeholder="Suas anotações...">${task.notes}</textarea>
                <div class="tips-content ${task.tips ? '' : 'hidden'}" data-task-id="${task.id}">
                    <strong>Dica/Bizú:</strong> ${task.tips}
                </div>
            `;
            todayTaskList.appendChild(listItem);

            // Adiciona listeners para checkbox
            listItem.querySelector(`#task-${task.id}`).addEventListener('change', (event) => {
                task.completed = event.target.checked;
                if (task.completed) {
                    listItem.classList.add('completed');
                } else {
                    listItem.classList.remove('completed');
                }
                saveAppState();
                updateSummary();
                // Não chame renderFullPlanner(false) aqui para evitar loops de renderização desnecessários
                // A atualização do full planner será feita quando o usuário trocar para a aba "Cronograma Completo"
            });

            // Adiciona listeners para botão de dicas
            listItem.querySelector(`.toggle-tips-btn`).addEventListener('click', () => {
                const tipsContent = listItem.querySelector(`.tips-content`);
                tipsContent.classList.toggle('hidden');
            });

            // Adiciona listeners para botão de anotações e textarea
            const notesTextarea = listItem.querySelector(`.notes-textarea`);
            listItem.querySelector(`.toggle-notes-btn`).addEventListener('click', () => {
                notesTextarea.classList.toggle('hidden');
                if (!notesTextarea.classList.contains('hidden')) {
                    notesTextarea.focus();
                }
            });
            notesTextarea.addEventListener('input', (event) => {
                task.notes = event.target.value;
                saveAppState();
            });

            // Adiciona listeners para botões de editar e excluir
            listItem.querySelector(`.edit-task-btn`).addEventListener('click', (event) => {
                openEditTaskModal(task.id, displayDateString);
            });
            listItem.querySelector(`.delete-task-btn`).addEventListener('click', (event) => {
                deleteTask(task.id, displayDateString);
            });
        });
    } else {
        todayTaskList.innerHTML = '<p class="text-gray-500 text-center">Nenhuma tarefa agendada para este dia.</p>';
    }
    // Garante que o estado do timer seja refletido no display e botões ao mudar de dia
    updateTimerDisplay();
    setTimerButtonsState();
}

// Função para renderizar o planner completo (com carregamento em lotes)
function renderFullPlanner(reset = true) {
    const fullPlannerDiv = document.getElementById('fullPlanner');
    const loadMoreBtn = document.getElementById('loadMoreDaysBtn');

    if (reset) {
        fullPlannerDiv.innerHTML = ''; // Limpa antes de renderizar
        appState.fullPlannerRenderedDays = 0;
    }

    const startIndex = appState.fullPlannerRenderedDays;
    const endIndex = Math.min(startIndex + DAYS_PER_LOAD, appState.plannerData.length);

    for (let i = startIndex; i < endIndex; i++) {
        const dayData = appState.plannerData[i];
        const dayCard = document.createElement('div');
        dayCard.className = 'day-card';
        dayCard.innerHTML = `
            <h3>
                ${new Date(dayData.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                <span>Estudo: ${dayData.studyHours.toFixed(1)}h</span>
            </h3>
            <ul class="day-task-list">
                ${dayData.tasks.map(task => `
                    <li class="day-task-item ${task.completed ? 'completed' : ''}">
                        <input type="checkbox" id="full-task-${task.id}" data-day-date="${dayData.date}" ${task.completed ? 'checked' : ''}>
                        <label for="full-task-${task.id}">${task.description}</label>
                        <span class="day-task-type ${getTaskTypeClass(task.type)}">${getTaskTypeText(task.type)}</span>
                        <div class="task-action-buttons">
                            <button class="action-btn move-task-btn" data-task-id="${task.id}" data-current-date="${dayData.date}" title="Mover Tarefa">
                                <svg fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM17 14a1 1 0 100-2h-5.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L13.586 14H17z"></path></svg>
                            </button>
                            <button class="action-btn move-to-today-btn" data-task-id="${task.id}" data-current-date="${dayData.date}" title="Trazer para Hoje">
                                <svg fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"></path></svg>
                            </button>
                            <button class="action-btn edit-task-btn" data-task-id="${task.id}" data-current-date="${dayData.date}" title="Editar Tarefa">
                                <svg fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M13.586 3.586a2 2 0 112.828 2.828l-7.793 7.793a1 1 0 01-.328.288l-3 1a1 1 0 01-1.244-1.244l1-3a1 1 0 01.288-.328l7.793-7.793zM10 12l-1 1 3 1 1-3-3-1z"></path></svg>
                            </button>
                            <button class="action-btn delete-task-btn" data-task-id="${task.id}" data-current-date="${dayData.date}" title="Excluir Tarefa">
                                <svg fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 11-2 0v6a1 1 0 112 0V8z" clip-rule="evenodd"></path></svg>
                            </button>
                        </div>
                    </li>
                `).join('')}
            </ul>
        `;
        fullPlannerDiv.appendChild(dayCard);

        // Adiciona listeners para checkboxes do planner completo
        dayCard.querySelectorAll(`input[type="checkbox"]`).forEach(checkbox => {
            checkbox.addEventListener('change', (event) => {
                const taskId = event.target.id.replace('full-task-', '');
                const dayDate = event.target.dataset.dayDate;
                const dayData = appState.plannerData.find(day => day.date === dayDate);
                const task = dayData ? dayData.tasks.find(t => t.id === taskId) : null;

                if (task) {
                    task.completed = event.target.checked;
                    saveAppState();
                    renderTodayTasks(); // Atualiza também as tarefas do dia atual
                    updateSummary();
                    // Atualiza a classe do item no planner completo
                    const fullTaskItem = event.target.closest('.day-task-item');
                    if (task.completed) {
                        fullTaskItem.classList.add('completed');
                    } else {
                        fullTaskItem.classList.remove('completed');
                    }
                }
            });
        });
    }

    appState.fullPlannerRenderedDays = endIndex;

    // Adiciona listeners para os botões "Mover Tarefa", "Trazer para Hoje", "Editar" e "Excluir"
    fullPlannerDiv.querySelectorAll('.move-task-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const taskId = event.currentTarget.dataset.taskId;
            const currentDate = event.currentTarget.dataset.currentDate;
            openMoveTaskModal(taskId, currentDate);
        });
    });

    fullPlannerDiv.querySelectorAll('.move-to-today-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const taskId = event.currentTarget.dataset.taskId;
            const currentDate = event.currentTarget.dataset.currentDate;
            moveTaskToToday(taskId, currentDate);
        });
    });

    fullPlannerDiv.querySelectorAll('.edit-task-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const taskId = event.currentTarget.dataset.taskId;
            const currentDate = event.currentTarget.dataset.currentDate;
            openEditTaskModal(taskId, currentDate);
        });
    });

    fullPlannerDiv.querySelectorAll('.delete-task-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const taskId = event.currentTarget.dataset.taskId;
            const currentDate = event.currentTarget.dataset.currentDate;
            deleteTask(taskId, currentDate);
        });
    });


    // Mostra ou oculta o botão "Carregar Mais Dias"
    if (appState.fullPlannerRenderedDays < appState.plannerData.length) {
        loadMoreBtn.classList.remove('hidden');
    } else {
        loadMoreBtn.classList.add('hidden');
    }

    // Após renderizar o planner completo, verifica por dias vazios
    findEmptyDays();
}

// Funções auxiliares para classes e textos de status/tipo
function getTaskStatusClass(type) {
    switch (type) {
        case 'study': return 'status-pending';
        case 'questions': return 'status-pending';
        case 'discursive': return 'status-pending';
        case 'simulado': return 'status-pending';
        case 'revision': return 'status-pending';
        case 'rest': return 'status-completed'; // Considerar descanso como "concluído" para status
        default: return '';
    }
}

function getTaskStatusText(type) {
    switch (type) {
        case 'study': return 'Estudo';
        case 'questions': return 'Questões';
        case 'discursive': return 'Discursiva';
        case 'simulado': return 'Simulado';
        case 'revision': return 'Revisão';
        case 'rest': return 'Descanso';
        default: return 'Geral';
    }
}

function getTaskTypeClass(type) {
    switch (type) {
        case 'study': return 'type-study';
        case 'questions': return 'type-questions';
        case 'discursive': return 'type-discursive';
        case 'simulado': return 'type-simulado';
        case 'revision': return 'type-revision';
        case 'rest': return 'type-rest';
        default: return '';
    }
}

function getTaskTypeText(type) {
    switch (type) {
        case 'study': return 'Estudo';
        case 'questions': return 'Questões';
        case 'discursive': return 'Discursiva';
        case 'simulado': return 'Simulado';
        case 'revision': return 'Revisão';
        case 'rest': return 'Descanso';
        default: return 'Geral';
    }
}

// Função para calcular o progresso total do cronograma
function calculateTotalProgress() {
    let totalTasks = 0;
    let totalCompletedTasks = 0;

    appState.plannerData.forEach(day => {
        totalTasks += day.tasks.length;
        day.tasks.forEach(task => {
            if (task.completed) {
                totalCompletedTasks++;
            }
        });
    });

    return { totalTasks, totalCompletedTasks };
}

// Função para atualizar o resumo
function updateSummary() {
    const displayDate = new Date(appState.currentDisplayDate + 'T00:00:00');
    const displayDateString = displayDate.toISOString().split('T')[0];
    const todayData = appState.plannerData.find(day => day.date === displayDateString);

    let todayStudyHours = 0;
    let todayCompletedTasks = 0;
    let totalTodayTasks = 0;

    if (todayData) {
        todayStudyHours = todayData.studyHours;
        totalTodayTasks = todayData.tasks.length;
        todayCompletedTasks = todayData.tasks.filter(task => task.completed).length;
    }

    document.getElementById('todayStudyHours').textContent = `${todayStudyHours.toFixed(1)}h`;
    document.getElementById('todayCompletedTasks').textContent = `${todayCompletedTasks}/${totalTodayTasks}`;

    // Calcula horas estudadas na semana (últimos 7 dias, incluindo o dia exibido)
    let weeklyHours = 0;
    for (let i = 0; i < 7; i++) {
        const date = new Date(displayDate); // Usa displayDate como referência
        date.setDate(displayDate.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        const dayData = appState.plannerData.find(day => day.date === dateString);
        if (dayData && typeof dayData.studyHours === 'number') { // Verifica se é um número
            weeklyHours += dayData.studyHours;
        }
    }
    document.getElementById('weeklyStudyHours').textContent = `${weeklyHours.toFixed(1)}h`;

    // Atualiza o progresso total
    const { totalTasks, totalCompletedTasks } = calculateTotalProgress();
    const totalProgressPercentage = totalTasks > 0 ? ((totalCompletedTasks / totalTasks) * 100).toFixed(1) : 0;
    document.getElementById('totalProgressDisplay').textContent = `${totalProgressPercentage}% (${totalCompletedTasks}/${totalTasks})`;
}

// Função para exibir uma citação motivacional aleatória
function displayMotivationalQuote() {
    const randomIndex = Math.floor(Math.random() * motivationalQuotes.length);
    const quote = motivationalQuotes[randomIndex];
    document.getElementById('motivationalQuote').textContent = `"${quote.quote}"`;
    document.getElementById('quoteAuthor').textContent = `- ${quote.author}`;
}

// Função para navegar entre os dias
function navigateDay(offset) {
    // Se o timer estiver rodando, pausa antes de mudar de dia
    if (appState.isTimerRunning) {
        pausePomodoro();
    }
    const current = new Date(appState.currentDisplayDate + 'T00:00:00');
    current.setDate(current.getDate() + offset);
    const newDateString = current.toISOString().split('T')[0];

    // Restrição para não voltar antes de MIN_DATE
    if (newDateString < MIN_DATE) {
        showConfirmationModal('Atenção', `Não é possível navegar para datas anteriores a ${new Date(MIN_DATE + 'T00:00:00').toLocaleDateString('pt-BR')}.`, 'Ok', 'modal-btn blue', () => {});
        return;
    }

    appState.currentDisplayDate = newDateString;
    saveAppState();
    renderPlanner(); // Re-renderiza tudo afetado pela mudança de data
}

// Função para mover uma tarefa para uma nova data
function moveTask(taskId, fromDate, toDate) {
    const fromDayIndex = appState.plannerData.findIndex(day => day.date === fromDate);
    const toDayIndex = appState.plannerData.findIndex(day => day.date === toDate);

    if (fromDayIndex === -1) {
        console.error('Dia de origem não encontrado:', fromDate);
        showConfirmationModal('Erro', 'O dia de origem da tarefa não foi encontrado.', 'Ok', 'modal-btn red', () => {});
        return;
    }

    const fromDay = appState.plannerData[fromDayIndex];
    const taskIndex = fromDay.tasks.findIndex(task => task.id === taskId);

    if (taskIndex === -1) {
        console.error('Tarefa não encontrada no dia de origem:', taskId, fromDate);
        showConfirmationModal('Erro', 'A tarefa não foi encontrada no dia de origem.', 'Ok', 'modal-btn red', () => {});
        return;
    }

    const taskToMove = fromDay.tasks.splice(taskIndex, 1)[0]; // Remove a tarefa do dia de origem

    let toDay;
    if (toDayIndex === -1) {
        // Se o dia de destino não existe, cria-o
        toDay = { date: toDate, studyHours: 0, tasks: [], dailyNotes: '' }; // Garante dailyNotes para novo dia
        appState.plannerData.push(toDay);
        appState.plannerData.sort((a, b) => new Date(a.date) - new Date(b.date)); // Mantém ordenado
    } else {
        toDay = appState.plannerData[toDayIndex];
    }

    toDay.tasks.push(taskToMove); // Adiciona a tarefa ao dia de destino

    saveAppState();
    renderPlanner(); // Re-renderiza para refletir as mudanças
    showConfirmationModal('Sucesso!', `Tarefa "${taskToMove.description}" movida para ${new Date(toDate + 'T00:00:00').toLocaleDateString('pt-BR')}.`, 'Ok', 'modal-btn green', () => {});
}

// Função para abrir o modal de mover tarefa
function openMoveTaskModal(taskId, currentDate) {
    const moveTaskModal = document.getElementById('moveTaskModal');
    const taskDescriptionToMove = document.getElementById('taskDescriptionToMove');
    const moveTaskDateInput = document.getElementById('moveTaskDateInput');
    const confirmMoveBtn = document.getElementById('confirmMoveBtn');
    const cancelMoveBtn = document.getElementById('cancelMoveBtn');

    const dayData = appState.plannerData.find(day => day.date === currentDate);
    const task = dayData ? dayData.tasks.find(t => t.id === taskId) : null;

    if (!task) {
        showConfirmationModal('Erro', 'Tarefa não encontrada.', 'Ok', 'modal-btn red', () => {});
        return;
    }

    taskDescriptionToMove.textContent = task.description;
    moveTaskDateInput.value = currentDate; // Preenche com a data atual da tarefa

    confirmMoveBtn.onclick = () => {
        const newDate = moveTaskDateInput.value;
        if (newDate && newDate !== currentDate) {
            moveTask(taskId, currentDate, newDate);
        } else {
            showConfirmationModal('Atenção', 'Por favor, selecione uma nova data para mover a tarefa.', 'Ok', 'modal-btn blue', () => {});
        }
        moveTaskModal.classList.remove('show');
    };

    cancelMoveBtn.onclick = () => {
        moveTaskModal.classList.remove('show');
    };

    moveTaskModal.classList.add('show');
}

// Função para mover uma tarefa para o dia de hoje
function moveTaskToToday(taskId, fromDate) {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];

    if (fromDate === todayString) {
        showConfirmationModal('Atenção', 'Esta tarefa já está agendada para hoje!', 'Ok', 'modal-btn blue', () => {});
        return;
    }

    showConfirmationModal(
        'Confirmar Ação',
        'Tem certeza que deseja mover esta tarefa para hoje?',
        'Sim, Mover',
        'confirm-btn green',
        () => {
            moveTask(taskId, fromDate, todayString);
        }
    );
}

// Função para gerar um ID único para novas tarefas
function generateUniqueId() {
    return 't' + Date.now() + Math.floor(Math.random() * 1000);
}

// Função para abrir o modal de adicionar nova tarefa
function openAddTaskModal() {
    const addTaskModal = document.getElementById('addTaskModal');
    const addTaskModalTitle = document.getElementById('addTaskModalTitle');
    const newTaskDescription = document.getElementById('newTaskDescription');
    const newTaskType = document.getElementById('newTaskType');
    const newTaskTips = document.getElementById('newTaskTips');
    const newTaskNotes = document.getElementById('newTaskNotes');
    const confirmAddTaskBtn = document.getElementById('confirmAddTaskBtn');

    // Reseta os campos e configura para adicionar
    addTaskModalTitle.textContent = 'Adicionar Nova Tarefa';
    confirmAddTaskBtn.textContent = 'Adicionar Tarefa';
    confirmAddTaskBtn.classList.remove('blue'); // Remove cor de editar, se houver
    confirmAddTaskBtn.classList.add('green'); // Adiciona cor de adicionar

    newTaskDescription.value = '';
    newTaskType.value = 'study';
    newTaskTips.value = '';
    newTaskNotes.value = '';

    addTaskModal.classList.add('show');

    document.getElementById('confirmAddTaskBtn').onclick = () => {
        const description = newTaskDescription.value.trim();
        const type = newTaskType.value;
        const tips = newTaskTips.value.trim();
        const notes = newTaskNotes.value.trim();

        if (description === '') {
            showConfirmationModal('Erro', 'A descrição da tarefa não pode ser vazia.', 'Ok', 'modal-btn red', () => {});
            return;
        }

        const todayData = appState.plannerData.find(day => day.date === appState.currentDisplayDate);
        if (todayData) {
            todayData.tasks.push({
                id: generateUniqueId(),
                description: description,
                completed: false,
                type: type,
                notes: notes,
                tips: tips
            });
            saveAppState();
            renderPlanner();
            addTaskModal.classList.remove('show');
            showConfirmationModal('Sucesso!', 'Tarefa adicionada com sucesso!', 'Ok', 'modal-btn green', () => {});
        } else {
            showConfirmationModal('Erro', 'Não foi possível encontrar os dados para o dia atual.', 'Ok', 'modal-btn red', () => {});
        }
    };

    document.getElementById('cancelAddTaskBtn').onclick = () => {
        addTaskModal.classList.remove('show');
    };
}

// Função para abrir o modal de editar tarefa
function openEditTaskModal(taskId, currentDate) {
    const addTaskModal = document.getElementById('addTaskModal');
    const addTaskModalTitle = document.getElementById('addTaskModalTitle');
    const newTaskDescription = document.getElementById('newTaskDescription');
    const newTaskType = document.getElementById('newTaskType');
    const newTaskTips = document.getElementById('newTaskTips');
    const newTaskNotes = document.getElementById('newTaskNotes');
    const confirmAddTaskBtn = document.getElementById('confirmAddTaskBtn');

    // Configura para editar
    addTaskModalTitle.textContent = 'Editar Tarefa';
    confirmAddTaskBtn.textContent = 'Salvar Alterações';
    confirmAddTaskBtn.classList.remove('green'); // Remove cor de adicionar
    confirmAddTaskBtn.classList.add('blue'); // Adiciona cor de editar

    const dayData = appState.plannerData.find(day => day.date === currentDate);
    const task = dayData ? dayData.tasks.find(t => t.id === taskId) : null;

    if (!task) {
        showConfirmationModal('Erro', 'Tarefa não encontrada para edição.', 'Ok', 'modal-btn red', () => {});
        return;
    }

    newTaskDescription.value = task.description;
    newTaskType.value = task.type;
    newTaskTips.value = task.tips || '';
    newTaskNotes.value = task.notes || '';

    addTaskModal.classList.add('show');

    confirmAddTaskBtn.onclick = () => {
        task.description = newTaskDescription.value.trim();
        task.type = newTaskType.value;
        task.tips = newTaskTips.value.trim();
        task.notes = newTaskNotes.value.trim();

        if (task.description === '') {
            showConfirmationModal('Erro', 'A descrição da tarefa não pode ser vazia.', 'Ok', 'modal-btn red', () => {});
            return;
        }

        saveAppState();
        renderPlanner();
        addTaskModal.classList.remove('show');
        showConfirmationModal('Sucesso!', 'Tarefa atualizada com sucesso!', 'Ok', 'modal-btn green', () => {});
    };

    document.getElementById('cancelAddTaskBtn').onclick = () => {
        addTaskModal.classList.remove('show');
    };
}

// Função para excluir uma tarefa
function deleteTask(taskId, currentDate) {
    showConfirmationModal(
        'Confirmar Exclusão',
        'Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.',
        'Sim, Excluir',
        'confirm-btn red',
        () => {
            const dayData = appState.plannerData.find(day => day.date === currentDate);
            if (dayData) {
                dayData.tasks = dayData.tasks.filter(task => task.id !== taskId);
                saveAppState();
                renderPlanner();
                showConfirmationModal('Excluído!', 'Tarefa excluída com sucesso.', 'Ok', 'modal-btn green', () => {});
            } else {
                showConfirmationModal('Erro', 'Não foi possível encontrar o dia da tarefa para exclusão.', 'Ok', 'modal-btn red', () => {});
            }
        }
    );
}

// Função para alternar as abas
function switchTab(tabId) {
    // Desativa a aba ativa atual
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        content.classList.add('hidden');
    });

    // Ativa a nova aba
    document.querySelector(`.tab-button[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.remove('hidden');
    document.getElementById(tabId).classList.add('active');

    appState.activeTab = tabId; // Atualiza o estado da aba ativa
    saveAppState(); // Salva o estado da aba ativa

    // Renderiza o conteúdo da aba recém-ativada
    if (tabId === 'today') {
        renderTodayTasks();
    } else if (tabId === 'full-planner') {
        renderFullPlanner(true); // Resetar e carregar do início ao mudar para esta aba
    } else if (tabId === 'summary') {
        updateSummary();
        displayMotivationalQuote();
    }
}

// Função para detectar dias sem tarefas
function findEmptyDays() {
    const emptyDays = appState.plannerData.filter(day => day.tasks.length === 0);
    if (emptyDays.length > 0) {
        const emptyDates = emptyDays.map(day => new Date(day.date + 'T00:00:00').toLocaleDateString('pt-BR')).join(', ');
        // Você pode escolher como alertar o usuário aqui. Por enquanto, um console.warn.
        console.warn(`Dias sem tarefas: ${emptyDates}`);
        // Exemplo de como você poderia mostrar um alerta na UI (descomente se desejar):
        /*
        showConfirmationModal(
            'Dias Vazios Detectados',
            `Os seguintes dias não possuem tarefas agendadas: ${emptyDates}. Considere adicioná-las para um planejamento completo.`,
            'Ok',
            'modal-btn blue',
            () => {}
        );
        */
    }
}

// Funções de importação
function handleReplaceAll(importedData) {
    appState.plannerData = importedData;
    // Garante que dailyNotes exista em todos os dias importados
    appState.plannerData.forEach(day => {
        if (day.dailyNotes === undefined) {
            day.dailyNotes = '';
        }
    });
    saveAppState();
    renderPlanner();
    showConfirmationModal('Importado!', 'Seu planner foi substituído com sucesso.', 'Ok', 'confirm-btn green', () => {});
}

function handleMergeUpdate(importedData) {
    let daysToOverwrite = [];
    let daysToAdd = [];

    // Identifica quais dias serão sobrescritos e quais serão adicionados
    importedData.forEach(importedDay => {
        const existingDayIndex = appState.plannerData.findIndex(day => day.date === importedDay.date);
        if (existingDayIndex !== -1) {
            daysToOverwrite.push(importedDay.date);
        } else {
            daysToAdd.push(importedDay.date);
        }
    });

    const performMerge = () => {
        let newPlannerData = [...appState.plannerData]; // Copia os dados atuais

        importedData.forEach(importedDay => {
            const existingDayIndex = newPlannerData.findIndex(day => day.date === importedDay.date);
            if (existingDayIndex !== -1) {
                // Sobrescreve o dia existente
                newPlannerData[existingDayIndex] = { ...importedDay, dailyNotes: importedDay.dailyNotes || '' }; // Garante dailyNotes
            } else {
                // Adiciona o novo dia
                newPlannerData.push({ ...importedDay, dailyNotes: importedDay.dailyNotes || '' }); // Garante dailyNotes
            }
        });

        // Ordena o plannerData após a mesclagem
        newPlannerData.sort((a, b) => new Date(a.date) - new Date(b.date));

        appState.plannerData = newPlannerData;
        saveAppState();
        renderPlanner();
        showConfirmationModal('Importado!', 'Seu planner foi mesclado e atualizado com sucesso.', 'Ok', 'confirm-btn green', () => {});
    };

    if (daysToOverwrite.length > 0) {
        showConfirmationModal(
            'Confirmar Mesclagem',
            `O arquivo importado contém dados para os seguintes dias que já existem no seu planner: ${daysToOverwrite.map(d => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')).join(', ')}. Deseja substituí-los?`,
            'Sim, Substituir',
            'confirm-btn red',
            performMerge,
            () => {
                showConfirmationModal('Importação Cancelada', 'A mesclagem foi cancelada.', 'Ok', 'modal-btn blue', () => {});
            }
        );
    } else {
        performMerge(); // Se não houver sobrescrita, mescla diretamente
    }
}

// Função para abrir o modal de opções de importação
function openImportOptionsModal(importedData) {
    const importOptionsModal = document.getElementById('importOptionsModal');
    const importReplaceAllBtn = document.getElementById('importReplaceAllBtn');
    const importMergeBtn = document.getElementById('importMergeBtn');
    const cancelImportOptionsBtn = document.getElementById('cancelImportOptionsBtn');

    importReplaceAllBtn.onclick = () => {
        handleReplaceAll(importedData);
        importOptionsModal.classList.remove('show');
    };

    importMergeBtn.onclick = () => {
        handleMergeUpdate(importedData);
        importOptionsModal.classList.remove('show');
    };

    cancelImportOptionsBtn.onclick = () => {
        importOptionsModal.classList.remove('show');
        showConfirmationModal('Importação Cancelada', 'Nenhum dado foi importado.', 'Ok', 'modal-btn blue', () => {});
    };

    importOptionsModal.classList.add('show');
}

// Função para copiar o planner para a área de transferência
function copyPlannerToClipboard() {
    const dataToCopy = JSON.stringify(appState, null, 2);
    const textarea = document.createElement('textarea');
    textarea.value = dataToCopy;
    // Para que o textarea não apareça na tela, mas ainda seja selecionável
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showConfirmationModal('Copiado!', 'O conteúdo do planner foi copiado para a área de transferência.', 'Ok', 'confirm-btn green', () => {});
        } else {
            throw new Error('Falha ao copiar comando.');
        }
    } catch (err) {
        console.error('Falha ao copiar:', err);
        showConfirmationModal('Erro ao Copiar', 'Não foi possível copiar o conteúdo. Seu navegador pode não suportar esta função diretamente ou pode haver restrições de segurança.', 'Ok', 'confirm-btn red', () => {});
    } finally {
        document.body.removeChild(textarea);
    }
}

// Função para abrir o modal de geração de tarefas com IA
function openGenerateTasksModal() {
    const generateTasksModal = document.getElementById('generateTasksModal');
    const generateTasksPrompt = document.getElementById('generateTasksPrompt');
    const confirmGenerateTasksBtn = document.getElementById('confirmGenerateTasksBtn');
    const cancelGenerateTasksBtn = document.getElementById('cancelGenerateTasksBtn');
    const generateTasksLoading = document.getElementById('generateTasksLoading');

    generateTasksPrompt.value = ''; // Limpa o campo
    generateTasksLoading.classList.add('hidden'); // Oculta o loader
    confirmGenerateTasksBtn.disabled = false; // Habilita o botão

    generateTasksModal.classList.add('show');

    confirmGenerateTasksBtn.onclick = async () => {
        const promptText = generateTasksPrompt.value.trim();
        if (!promptText) {
            showConfirmationModal('Atenção', 'Por favor, descreva o cronograma que deseja gerar.', 'Ok', 'modal-btn blue', () => {});
            return;
        }

        generateTasksLoading.classList.remove('hidden'); // Mostra o loader
        confirmGenerateTasksBtn.disabled = true; // Desabilita o botão
        generateTasksPrompt.disabled = true; // Desabilita o textarea
        cancelGenerateTasksBtn.disabled = true; // Desabilita o botão de cancelar

        try {
            const chatHistory = [];
            const today = new Date().toISOString().split('T')[0];
            chatHistory.push({ role: "user", parts: [{ text: `Gere um cronograma de estudos para um planner, cobrindo com base na seguinte descrição: "${promptText}". As tarefas devem começar a partir de hoje (${today}). Inclua tarefas diárias com descrição, tipo (study, questions, discursive, simulado, revision, rest), e uma dica/bizú relevante para concursos públicos. Gere no formato JSON estritamente seguindo o schema fornecido. Certifique-se de que cada dia tenha uma propriedade 'date' no formato 'YYYY-MM-DD', 'studyHours' como número, 'tasks' como array de objetos, e 'dailyNotes' como string vazia. Para cada tarefa em 'tasks', inclua 'id' (string única), 'description' (string), 'completed' (boolean, sempre false inicialmente), 'type' (string de um dos tipos listados), 'notes' (string vazia), e 'tips' (string).` }] });

            const payload = {
                contents: chatHistory,
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                "date": { "type": "STRING", "format": "date" },
                                "studyHours": { "type": "NUMBER" },
                                "tasks": {
                                    "type": "ARRAY",
                                    "items": {
                                        "type": "OBJECT",
                                        "properties": {
                                            "id": { "type": "STRING" },
                                            "description": { "type": "STRING" },
                                            "completed": { "type": "BOOLEAN" },
                                            "type": { "type": "STRING", "enum": ["study", "questions", "discursive", "simulado", "revision", "rest"] },
                                            "notes": { "type": "STRING" },
                                            "tips": { "type": "STRING" }
                                        },
                                        "required": ["id", "description", "completed", "type", "notes", "tips"]
                                    }
                                },
                                "dailyNotes": { "type": "STRING" }
                            },
                            "required": ["date", "studyHours", "tasks", "dailyNotes"]
                        }
                    }
                }
            };

            const apiKey = ""; // Canvas will automatically provide the API key
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            
            generateTasksLoading.classList.add('hidden'); // Oculta o loader
            confirmGenerateTasksBtn.disabled = false; // Habilita o botão
            generateTasksPrompt.disabled = false; // Habilita o textarea
            cancelGenerateTasksBtn.disabled = false; // Habilita o botão de cancelar

            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const jsonString = result.candidates[0].content.parts[0].text;
                const generatedPlannerData = JSON.parse(jsonString);

                // Adiciona IDs únicos às tarefas geradas, se o LLM não as tiver fornecido
                generatedPlannerData.forEach(day => {
                    day.tasks.forEach(task => {
                        if (!task.id) {
                            task.id = generateUniqueId();
                        }
                        // Garante que 'notes' e 'tips' sejam strings, mesmo que vazias
                        task.notes = task.notes || '';
                        task.tips = task.tips || '';
                        // Garante que 'completed' seja boolean
                        task.completed = !!task.completed;
                    });
                    // Garante que 'dailyNotes' exista
                    day.dailyNotes = day.dailyNotes || '';
                });

                generateTasksModal.classList.remove('show');
                openImportOptionsModal(generatedPlannerData); // Oferece opções de importação/mesclagem
            } else {
                showConfirmationModal('Erro na Geração', 'Não foi possível gerar as tarefas. A IA pode não ter entendido a sua solicitação ou gerou um formato inesperado. Por favor, tente novamente com uma descrição diferente.', 'Ok', 'modal-btn red', () => {});
            }
        } catch (error) {
            console.error("Erro ao chamar a API Gemini:", error);
            generateTasksLoading.classList.add('hidden'); // Oculta o loader
            confirmGenerateTasksBtn.disabled = false; // Habilita o botão
            generateTasksPrompt.disabled = false; // Habilita o textarea
            cancelGenerateTasksBtn.disabled = false; // Habilita o botão de cancelar
            showConfirmationModal('Erro na Conexão', 'Ocorreu um erro ao se comunicar com a IA. Verifique sua conexão com a internet ou tente novamente mais tarde.', 'Ok', 'modal-btn red', () => {});
        }
    };

    cancelGenerateTasksBtn.onclick = () => {
        generateTasksModal.classList.remove('show');
    };
}


// Função principal para renderizar todo o planner
function renderPlanner() {
    updateSummary();
    displayMotivationalQuote();
    switchTab(appState.activeTab);
}

// Inicializa o planner ao carregar a página
window.onload = async function() {
    loadAppState(); // Carrega o estado completo da aplicação (incluindo dados salvos ou dados vazios)
    renderPlanner(); // Renderiza o planner com a aba ativa carregada

    const menuToggleBtn = document.getElementById('menuToggleBtn');
    const closeMenuBtn = document.getElementById('closeMenuBtn');
    const sideMenu = document.getElementById('sideMenu');

    // Garante que o botão de fechar esteja oculto no carregamento inicial
    closeMenuBtn.style.display = 'none';

    // Event listener para o botão de abrir menu
    menuToggleBtn.addEventListener('click', () => {
        sideMenu.classList.add('open');
        menuToggleBtn.style.display = 'none'; // Oculta o botão de abrir
        closeMenuBtn.style.display = 'flex'; // Mostra o botão de fechar
    });

    // Event listener para o botão de fechar menu
    closeMenuBtn.addEventListener('click', () => {
        sideMenu.classList.remove('open');
        menuToggleBtn.style.display = 'flex'; // Mostra o botão de abrir
        closeMenuBtn.style.display = 'none'; // Oculta o botão de fechar
    });

    // Event listeners para os botões de aba
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (event) => {
            switchTab(event.target.dataset.tab);
        });
    });

    // Event listener para o botão de reset
    document.getElementById('resetPlannerBtn').addEventListener('click', () => {
        showConfirmationModal(
            'Confirmar Reset',
            'Tem certeza que deseja resetar todo o planner? Todos os seus dados serão perdidos.',
            'Sim, Resetar',
            'confirm-btn red',
            () => {
                localStorage.removeItem('plannerState_v5');
                appState.plannerData = []; // Reseta para dados vazios
                appState.currentDisplayDate = new Date().toISOString().split('T')[0]; // Volta para a data atual
                appState.timerAccumulatedTime = 0; // Reseta o timer também
                appState.isTimerRunning = false;
                clearInterval(appState.timerInterval);
                appState.timerInterval = null;
                appState.timerStartTime = 0;
                appState.pomodoroPhase = 'stopped'; // Reseta Pomodoro
                appState.pomodoroRemainingTime = 0;
                appState.pomodoroSessionCount = 0;
                appState.activeTab = 'today'; // Volta para a aba "Hoje"
                renderPlanner();
                // Garante que os botões do menu estejam no estado correto após o reset
                sideMenu.classList.remove('open');
                menuToggleBtn.style.display = 'flex';
                closeMenuBtn.style.display = 'none';
            }
        );
    });

    // Event listener para o botão "Carregar Mais Dias"
    document.getElementById('loadMoreDaysBtn').addEventListener('click', () => {
        renderFullPlanner(false); // Carrega mais dias sem resetar
    });

    // Event listener para o botão de exportar
    document.getElementById('exportPlannerBtn').addEventListener('click', () => {
        const filename = `planner_cnu_bloco7_${new Date().toISOString().split('T')[0]}.json`;
        // Certifica-se de que o appState.plannerData esteja atualizado no appState antes de exportar
        const dataToExport = { ...appState, plannerData: appState.plannerData };
        const dataStr = JSON.stringify(dataToExport, null, 2); // Formata com 2 espaços para legibilidade
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showConfirmationModal('Exportado!', 'Seu planner foi exportado com sucesso como JSON. Você pode salvá-lo em um serviço de nuvem como Google Drive ou Dropbox para acessá-lo em outros dispositivos.', 'Ok', 'confirm-btn green', () => {});
        // Garante que os botões do menu estejam no estado correto após a exportação
        sideMenu.classList.remove('open');
        menuToggleBtn.style.display = 'flex';
        closeMenuBtn.style.display = 'none';
    });

    // Event listener para o botão de copiar planner
    document.getElementById('copyPlannerBtn').addEventListener('click', () => {
        copyPlannerToClipboard();
        sideMenu.classList.remove('open'); // Fecha o menu após a ação
        menuToggleBtn.style.display = 'flex';
        closeMenuBtn.style.display = 'none';
    });


    // Event listener para o botão de importar
    const importFileInput = document.getElementById('importFileInput');
    document.getElementById('importPlannerBtn').addEventListener('click', () => {
        importFileInput.click(); // Abre o seletor de arquivos
    });

    importFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedContent = JSON.parse(e.target.result);
                let dataToProcess = [];

                // Verifica se o conteúdo importado é o appState completo ou apenas o array de plannerData
                if (importedContent.plannerData && Array.isArray(importedContent.plannerData)) {
                    dataToProcess = importedContent.plannerData;
                } else if (Array.isArray(importedContent)) {
                    dataToProcess = importedContent;
                } else {
                    showConfirmationModal('Erro de Importação', 'O arquivo JSON não parece ser um formato de planner válido. Por favor, verifique se é um array de dias ou um objeto com a chave "plannerData".', 'Ok', 'confirm-btn red', () => {});
                    return;
                }

                // Validação básica dos dados importados
                if (!dataToProcess.every(day => day.date && Array.isArray(day.tasks))) {
                    showConfirmationModal('Erro de Importação', 'O arquivo JSON não parece ser um formato de planner válido. Certifique-se de que cada item tem "date" e "tasks".', 'Ok', 'confirm-btn red', () => {});
                    return;
                }

                openImportOptionsModal(dataToProcess); // Oferece opções de importação/mesclagem
                
                // Garante que os botões do menu estejam no estado correto após a importação
                sideMenu.classList.remove('open');
                menuToggleBtn.style.display = 'flex';
                closeMenuBtn.style.display = 'none';

            } catch (error) {
                console.error("Erro ao importar planner:", error);
                showConfirmationModal('Erro de Importação', 'Não foi possível ler o arquivo. Certifique-se de que é um arquivo JSON válido.', 'Ok', 'confirm-btn red', () => {});
            }
        };
        reader.readAsText(file);
        // Limpa o input file para permitir a importação do mesmo arquivo novamente
        event.target.value = '';
    });

    // Event listener para o botão de gerar tarefas com IA
    document.getElementById('generateTasksBtn').addEventListener('click', () => {
        openGenerateTasksModal();
        sideMenu.classList.remove('open'); // Fecha o menu após a ação
        menuToggleBtn.style.display = 'flex';
        closeMenuBtn.style.display = 'none';
    });


    // Event listener para o input de horas de estudo (manual)
    const studyHoursInput = document.getElementById('studyHoursInput');
    if (studyHoursInput) {
        studyHoursInput.addEventListener('change', (event) => {
            const newHours = parseFloat(event.target.value);
            const todayData = appState.plannerData.find(day => day.date === appState.currentDisplayDate);
            if (todayData) {
                todayData.studyHours = isNaN(newHours) ? 0 : newHours;
                saveAppState();
                updateSummary();
                // Não chame renderFullPlanner(false) aqui para evitar loops de renderização desnecessários
                // A atualização do full planner será feita quando o usuário trocar para a aba "Cronograma Completo"
            }
        });
    }

    // Event listeners para os botões de navegação de dia
    document.getElementById('prevDayBtn').addEventListener('click', () => {
        navigateDay(-1);
    });
    document.getElementById('nextDayBtn').addEventListener('click', () => {
        navigateDay(1);
    });

    // Event listeners para os botões do timer (agora Pomodoro)
    document.getElementById('startTimerBtn').addEventListener('click', startPomodoro);
    document.getElementById('pauseTimerBtn').addEventListener('click', pausePomodoro);
    document.getElementById('stopTimerBtn').addEventListener('click', stopPomodoro);

    // Event listener para o botão de adicionar nova tarefa
    document.getElementById('addNewTaskBtn').addEventListener('click', openAddTaskModal);

    // Botão Voltar ao Topo
    const backToTopBtn = document.getElementById('backToTopBtn');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) { // Mostra o botão após rolar 300px
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }
    });

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth' // Rolagem suave
        });
    });
};
