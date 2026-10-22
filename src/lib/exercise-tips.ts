/**
 * Dicas curtas de execução de cada exercício da biblioteca global (2 a 3 por exercício):
 * postura, amplitude e o erro mais comum. Aparecem em "Como fazer" na tela de treino.
 * Exercício novo na biblioteca: acrescente as dicas aqui pelo mesmo id.
 */
const EXERCISE_TIPS: Record<string, string[]> = {
  // Abdômen
  abdominal: [
    "Mãos ao lado da cabeça, sem puxar o pescoço.",
    "Enrole a coluna tirando só as escápulas do chão.",
    "Solte o ar ao subir e desça devagar.",
  ],
  "abdominal-bicicleta": [
    "Lombar colada no chão o tempo todo.",
    "Leve o cotovelo em direção ao joelho oposto girando o tronco, não só o braço.",
    "Ritmo controlado: devagar vale mais que rápido.",
  ],
  "abdominal-infra": [
    "Lombar apoiada; se ela sair do chão, dobre um pouco os joelhos.",
    "Suba as pernas e tire o quadril do apoio no fim do movimento.",
    "Desça sem deixar os pés encostarem no chão.",
  ],
  "abdominal-maquina": [
    "Ajuste o banco para o eixo da máquina ficar na altura do umbigo.",
    "Enrole o tronco contraindo o abdômen, sem puxar com os braços.",
    "Volte devagar até sentir o alongamento.",
  ],
  "abdominal-polia": [
    "Ajoelhado, corda ao lado da cabeça e quadril parado.",
    "Enrole a coluna levando os cotovelos em direção aos joelhos.",
    "Não sente nos calcanhares: o movimento é da coluna, não do quadril.",
  ],
  "elevacao-pernas-barra": [
    "Pendurado com ombros ativos, sem balançar.",
    "Suba as pernas enrolando o quadril para frente.",
    "Desça controlando para não embalar a próxima repetição.",
  ],
  pallof: [
    "De lado para a polia, cabo na altura do peito.",
    "Estique os braços à frente sem deixar o tronco girar.",
    "Abdômen e glúteos firmes; segure 1–2 s com os braços esticados.",
  ],
  prancha: [
    "Cotovelos embaixo dos ombros e corpo em linha reta.",
    "Contraia glúteos e abdômen; quadril nem alto nem caído.",
    "Respire normalmente durante o tempo todo.",
  ],
  "prancha-lateral": [
    "Cotovelo embaixo do ombro e pés empilhados (ou um à frente do outro).",
    "Quadril alto, alinhado com ombros e tornozelos.",
    "Não deixe o quadril cair nem girar para frente.",
  ],
  "roda-abdominal": [
    "Comece de joelhos com a roda embaixo dos ombros.",
    "Role à frente só até onde a lombar não arqueia.",
    "Volte puxando com o abdômen, não com os braços.",
  ],
  "rollout-barra": [
    "Joelhos no chão, barra com anilhas redondas embaixo dos ombros.",
    "Estenda devagar mantendo o abdômen firme e a lombar neutra.",
    "Volte contraindo o abdômen; diminua a amplitude se a lombar ceder.",
  ],

  // Bíceps
  "rosca-21": [
    "7 repetições da metade de baixo, 7 da metade de cima e 7 completas.",
    "Cotovelos colados ao corpo do começo ao fim.",
    "Use uma carga menor do que na rosca direta.",
  ],
  "rosca-alternada": [
    "Cotovelos parados ao lado do corpo.",
    "Gire a palma para cima enquanto sobe o halter.",
    "Desça até esticar o braço antes de subir o outro.",
  ],
  "rosca-barra-w": [
    "Pegada nas curvas da barra, cotovelos colados ao corpo.",
    "Suba sem jogar o tronco para trás.",
    "Desça até quase estender os braços.",
  ],
  "rosca-concentrada": [
    "Sentado, cotovelo apoiado na parte interna da coxa.",
    "Suba o halter até o ombro e aperte o bíceps no topo.",
    "Desça devagar até esticar o braço.",
  ],
  "rosca-direta": [
    "Pegada na largura dos ombros, cotovelos colados ao corpo.",
    "Suba sem balançar o tronco e sem levar os cotovelos à frente.",
    "Desça controlando até quase esticar os braços.",
  ],
  "rosca-inclinada": [
    "Costas apoiadas no banco inclinado e braços pendurados para trás.",
    "Suba sem levar os cotovelos para frente.",
    "Desça até alongar bem o bíceps.",
  ],
  "rosca-inversa": [
    "Pegada pronada (dorso das mãos para cima).",
    "Punhos firmes, alinhados com o antebraço.",
    "Use carga menor: o foco é antebraço e braquial.",
  ],
  "rosca-inversa-polia": [
    "Pegada pronada na barra da polia baixa.",
    "Cotovelos colados ao corpo e punhos firmes.",
    "Suba e desça devagar, sem embalo.",
  ],
  "rosca-martelo": [
    "Palmas viradas uma para a outra o tempo todo.",
    "Cotovelos parados ao lado do corpo.",
    "Suba até o antebraço passar da horizontal e desça devagar.",
  ],
  "rosca-martelo-corda": [
    "Corda na polia baixa, pegada neutra (polegares para cima).",
    "Cotovelos colados ao corpo, sem balançar.",
    "Abra levemente a corda no topo e desça devagar.",
  ],
  "rosca-polia": [
    "Fique perto da polia baixa, cotovelos colados ao corpo.",
    "Suba sem levar os cotovelos à frente.",
    "A polia mantém a tensão: desça devagar até esticar.",
  ],
  "rosca-polia-alta": [
    "Braços abertos na altura dos ombros, segurando as polias altas.",
    "Dobre os cotovelos trazendo as mãos para perto da cabeça.",
    "Mantenha os cotovelos parados na mesma altura.",
  ],
  "rosca-polia-atras": [
    "De costas para a polia, braço levemente atrás do corpo.",
    "Suba sem trazer o cotovelo para frente.",
    "Volte até alongar bem o bíceps.",
  ],
  "rosca-polia-unilateral": [
    "Um braço de cada vez, cotovelo colado ao corpo.",
    "Gire a palma para cima ao subir.",
    "Desça devagar até esticar o braço.",
  ],
  "rosca-scott": [
    "Axilas encostadas no topo do banco Scott.",
    "Desça até quase esticar, sem travar o cotovelo.",
    "Suba sem tirar os braços do apoio.",
  ],
  "rosca-scott-halter": [
    "Um braço de cada vez, axila encaixada no apoio.",
    "Desça devagar até quase esticar.",
    "Aperte o bíceps no topo sem tirar o braço do apoio.",
  ],
  "rosca-scott-maquina": [
    "Ajuste o banco para os cotovelos ficarem alinhados ao eixo da máquina.",
    "Suba sem tirar os braços do apoio.",
    "Desça controlando, sem deixar a carga bater.",
  ],
  "rosca-scott-polia": [
    "Banco Scott de frente para a polia baixa.",
    "A polia mantém a tensão embaixo: não relaxe no fim da descida.",
    "Suba sem tirar os braços do apoio.",
  ],
  "rosca-spider": [
    "De bruços no banco inclinado, braços pendurados na vertical.",
    "Suba sem mexer os cotovelos.",
    "Aperte o bíceps no topo e desça devagar.",
  ],
  "rosca-zottman": [
    "Suba com as palmas para cima.",
    "No topo, gire as palmas para baixo.",
    "Desça devagar com a pegada pronada.",
  ],

  // Costas
  "barra-assistida": [
    "Ajuste o contrapeso para conseguir fazer as repetições com amplitude completa.",
    "Desça até esticar os braços e suba até o queixo passar a barra.",
    "Puxe com as costas: peito em direção à barra.",
  ],
  "barra-fixa": [
    "Pegada um pouco mais aberta que os ombros.",
    "Suba levando o peito à barra, sem balançar as pernas.",
    "Desça até esticar os braços.",
  ],
  "barra-fixa-supinada": [
    "Pegada supinada na largura dos ombros.",
    "Suba até o queixo passar a barra, cotovelos perto do corpo.",
    "Desça controlando até esticar os braços.",
  ],
  "encolhimento-barra": [
    "Barra à frente das coxas, braços sempre esticados.",
    "Suba os ombros em direção às orelhas, sem girar.",
    "Segure 1 s no topo e desça devagar.",
  ],
  encolhimento: [
    "Halteres ao lado do corpo, braços esticados.",
    "Suba os ombros reto para cima, sem girar.",
    "Segure 1 s no topo e desça devagar.",
  ],
  hiperextensao: [
    "Apoio na altura do quadril, corpo em linha reta.",
    "Desça dobrando o quadril com a coluna neutra.",
    "Suba até alinhar o corpo, sem arquear a lombar.",
  ],
  "levantamento-terra": [
    "Barra encostada nas canelas e costas retas.",
    "Empurre o chão com os pés e mantenha a barra colada às pernas.",
    "Termine em pé com o quadril estendido, sem jogar o tronco para trás.",
  ],
  "pulldown-corda": [
    "Em pé, braços esticados segurando a corda na polia alta.",
    "Leve a corda até as coxas com os braços quase esticados.",
    "Tronco levemente inclinado e parado.",
  ],
  "puxada-articulada": [
    "Coxas presas no apoio, peito aberto.",
    "Puxe levando os cotovelos para baixo e para trás.",
    "Volte devagar até esticar os braços.",
  ],
  "puxada-frontal": [
    "Pegada aberta, peito aberto e leve inclinação para trás.",
    "Puxe a barra até a parte de cima do peito levando os cotovelos para baixo.",
    "Volte devagar até esticar os braços.",
  ],
  "puxada-neutra": [
    "Pegada neutra (palmas uma para a outra).",
    "Puxe até a parte de cima do peito com os cotovelos colados ao corpo.",
    "Volte controlando até esticar os braços.",
  ],
  "puxada-supinada": [
    "Pegada supinada na largura dos ombros.",
    "Puxe até o peito, cotovelos perto do corpo.",
    "Volte devagar até esticar os braços.",
  ],
  "puxada-unilateral-polia": [
    "Um braço de cada vez na polia alta.",
    "Puxe o cotovelo para baixo, em direção ao quadril.",
    "Deixe a escápula subir na volta para alongar.",
  ],
  "remada-apoiada-halteres": [
    "Peito apoiado no banco inclinado e braços pendurados.",
    "Puxe os halteres levando os cotovelos para trás.",
    "Aperte as escápulas no topo e desça devagar.",
  ],
  "remada-articulada": [
    "Peito no apoio, braços esticados à frente.",
    "Puxe os cotovelos para trás apertando as escápulas.",
    "Volte devagar sem tirar o peito do apoio.",
  ],
  "remada-baixa": [
    "Sentado, coluna reta e joelhos levemente dobrados.",
    "Puxe o triângulo até o abdômen levando os cotovelos para trás.",
    "Volte esticando os braços sem curvar as costas.",
  ],
  "remada-baixa-aberta": [
    "Barra reta com pegada aberta.",
    "Puxe até a parte de baixo do peito, cotovelos abertos.",
    "Aperte as escápulas e volte devagar.",
  ],
  "remada-cavalinho": [
    "Tronco inclinado à frente com as costas retas.",
    "Puxe a barra até o abdômen.",
    "Aperte as escápulas no topo e desça controlando.",
  ],
  "remada-curvada": [
    "Tronco inclinado a uns 45°, costas retas e joelhos levemente dobrados.",
    "Puxe a barra até o umbigo levando os cotovelos para trás.",
    "Desça sem perder a postura do tronco.",
  ],
  "remada-curvada-smith": [
    "Tronco inclinado, costas retas, barra do Smith à frente das canelas.",
    "Puxe até o umbigo levando os cotovelos para trás.",
    "Desça devagar sem curvar a lombar.",
  ],
  "remada-curvada-supinada": [
    "Pegada supinada na largura dos ombros, tronco inclinado.",
    "Puxe até o umbigo com os cotovelos perto do corpo.",
    "Desça sem perder a postura.",
  ],
  "remada-pendlay": [
    "Tronco quase paralelo ao chão, barra parte do chão a cada repetição.",
    "Puxe explosivo até a parte de baixo do peito.",
    "Devolva a barra ao chão e reposicione antes da próxima.",
  ],
  "remada-unilateral": [
    "Joelho e mão do mesmo lado apoiados no banco, costas retas.",
    "Puxe o halter em direção ao quadril, cotovelo perto do corpo.",
    "Desça até esticar o braço, sem girar o tronco.",
  ],
  "serrote-maquina": [
    "Peito no apoio, um braço de cada vez.",
    "Puxe o cotovelo para trás junto ao corpo.",
    "Volte devagar até alongar.",
  ],
  "serrote-polia": [
    "Um braço de cada vez na polia média ou baixa.",
    "Puxe o cotovelo para trás junto ao corpo.",
    "Deixe o ombro ir à frente na volta para alongar.",
  ],

  // Ombros
  "crucifixo-inverso": [
    "Tronco inclinado à frente, costas retas e cotovelos levemente dobrados.",
    "Abra os braços até a linha dos ombros.",
    "Desça devagar sem embalo.",
  ],
  "crucifixo-inverso-maquina": [
    "Peito no apoio, pegadores na altura dos ombros.",
    "Abra os braços para trás até a linha dos ombros.",
    "Volte devagar sem soltar a carga.",
  ],
  "crucifixo-inverso-polia": [
    "Cabos cruzados à frente na altura dos ombros.",
    "Abra os braços para trás com os cotovelos quase esticados.",
    "Volte controlando até as mãos se cruzarem.",
  ],
  desenvolvimento: [
    "Sentado com as costas apoiadas e os halteres na altura das orelhas.",
    "Empurre para cima sem bater os halteres no topo.",
    "Desça até os cotovelos ficarem um pouco abaixo dos ombros.",
  ],
  "desenvolvimento-arnold": [
    "Comece com as palmas viradas para você na altura do queixo.",
    "Gire as palmas para frente enquanto empurra para cima.",
    "Volte girando até a posição inicial.",
  ],
  "desenvolvimento-barra": [
    "Barra apoiada na parte de cima do peito, pegada um pouco mais aberta que os ombros.",
    "Empurre para cima passando a barra perto do rosto.",
    "Abdômen e glúteos firmes, sem arquear a lombar.",
  ],
  "desenvolvimento-landmine": [
    "Ponta da barra presa no canto, segure a outra ponta na altura do ombro.",
    "Empurre para cima e à frente até esticar o braço.",
    "Tronco firme, sem girar.",
  ],
  "desenvolvimento-maquina": [
    "Ajuste o banco para os pegadores ficarem na altura dos ombros.",
    "Empurre sem travar os cotovelos no topo.",
    "Desça controlando até a altura dos ombros.",
  ],
  "desenvolvimento-smith": [
    "Banco embaixo da barra, que desce à frente do rosto.",
    "Empurre sem travar os cotovelos.",
    "Desça até a altura do queixo.",
  ],
  "desenvolvimento-unilateral": [
    "Um braço de cada vez, halter na altura da orelha.",
    "Empurre para cima sem inclinar o tronco para o lado.",
    "Abdômen firme o tempo todo.",
  ],
  "elevacao-frontal": [
    "Halteres à frente das coxas, cotovelos levemente dobrados.",
    "Suba até a altura dos ombros, sem balançar o tronco.",
    "Desça devagar.",
  ],
  "elevacao-frontal-anilha": [
    "Segure a anilha pelas laterais, braços quase esticados.",
    "Suba até a altura dos olhos.",
    "Desça controlando, sem embalo.",
  ],
  "elevacao-frontal-barra": [
    "Pegada na largura dos ombros.",
    "Suba a barra até a altura dos ombros com os braços quase esticados.",
    "Tronco parado; desça devagar.",
  ],
  "elevacao-frontal-polia": [
    "De costas para a polia baixa, cabo entre as pernas.",
    "Suba até a altura dos ombros.",
    "Desça devagar mantendo a tensão.",
  ],
  "elevacao-lateral": [
    "Cotovelos levemente dobrados e tronco parado.",
    "Suba até a linha dos ombros, cotovelos guiando o movimento.",
    "Desça devagar; carga leve e sem embalo.",
  ],
  "elevacao-lateral-maquina": [
    "Ajuste o banco para os ombros ficarem alinhados ao eixo da máquina.",
    "Suba até a linha dos ombros.",
    "Desça controlando, sem deixar a carga bater.",
  ],
  "elevacao-lateral-polia": [
    "De lado para a polia baixa, cabo passando à frente do corpo.",
    "Suba até a linha do ombro com o cotovelo levemente dobrado.",
    "Desça devagar mantendo a tensão.",
  ],
  "elevacao-lateral-sentado": [
    "Sentado na ponta do banco, costas retas.",
    "Suba os halteres até a linha dos ombros.",
    "Sem o embalo das pernas: desça devagar.",
  ],
  "face-pull": [
    "Corda na polia alta, na altura do rosto.",
    "Puxe em direção ao rosto abrindo as mãos e os cotovelos para fora.",
    "Aperte as escápulas e volte devagar.",
  ],
  "remada-alta": [
    "Pegada na largura dos ombros.",
    "Suba a barra até o peito com os cotovelos acima das mãos.",
    "Não passe da altura dos ombros se sentir desconforto.",
  ],
  "remada-alta-polia": [
    "Barra na polia baixa, perto do corpo.",
    "Suba até o peito com os cotovelos altos.",
    "Desça devagar mantendo a tensão.",
  ],

  // Peito
  crossover: [
    "Polias altas, um passo à frente e tronco levemente inclinado.",
    "Junte as mãos à frente do corpo em arco, cotovelos levemente dobrados.",
    "Volte devagar até sentir o peito alongar.",
  ],
  "crossover-polia-baixa": [
    "Polias baixas, braços abertos embaixo.",
    "Suba as mãos em arco até a altura do rosto, juntando à frente.",
    "Volte devagar mantendo os cotovelos levemente dobrados.",
  ],
  "crossover-polia-media": [
    "Polias na altura do peito.",
    "Junte as mãos à frente do peito em arco.",
    "Volte devagar até alongar o peito.",
  ],
  "crossover-unilateral": [
    "Um braço de cada vez, corpo de lado para a polia.",
    "Leve a mão em arco até passar da linha do corpo.",
    "Volte devagar alongando o peito.",
  ],
  crucifixo: [
    "Deitado no banco reto, cotovelos levemente dobrados.",
    "Abra os braços em arco até sentir o peito alongar.",
    "Volte juntando os halteres acima do peito.",
  ],
  "crucifixo-declinado": [
    "Banco declinado com as pernas presas.",
    "Abra os braços em arco, cotovelos levemente dobrados.",
    "Junte os halteres acima do peito, no mesmo ângulo.",
  ],
  "crucifixo-declinado-polia": [
    "Banco declinado entre as polias.",
    "Junte as mãos acima do peito em arco.",
    "Volte devagar mantendo a tensão.",
  ],
  "crucifixo-inclinado": [
    "Banco inclinado a 30–45°.",
    "Abra os braços em arco até alongar o peito.",
    "Junte os halteres acima da parte de cima do peito.",
  ],
  "crucifixo-inclinado-polia": [
    "Banco inclinado entre as polias baixas.",
    "Junte as mãos acima do peito em arco.",
    "Volte devagar até alongar.",
  ],
  "crucifixo-polia": [
    "Banco reto entre as polias, que ficam ao lado do banco.",
    "Junte as mãos acima do peito em arco.",
    "Volte devagar mantendo a tensão do cabo.",
  ],
  flexao: [
    "Mãos um pouco mais abertas que os ombros e corpo em linha reta.",
    "Desça até o peito quase tocar o chão.",
    "Empurre até esticar os braços, sem deixar o quadril cair.",
  ],
  "flexao-joelhos": [
    "Joelhos apoiados e corpo reto dos joelhos aos ombros.",
    "Desça até o peito quase tocar o chão.",
    "Empurre até esticar os braços.",
  ],
  paralelas: [
    "Tronco levemente inclinado à frente para focar no peito.",
    "Desça até os cotovelos formarem 90°.",
    "Suba até esticar os braços, sem balançar.",
  ],
  pullover: [
    "Deitado, halter segurado com as duas mãos acima do peito.",
    "Leve o halter para trás da cabeça com os cotovelos levemente dobrados.",
    "Volte até acima do peito sem dobrar mais os cotovelos.",
  ],
  "pullover-barra": [
    "Deitado, barra acima do peito com os braços quase esticados.",
    "Leve a barra para trás da cabeça até alongar.",
    "Volte até acima do peito.",
  ],
  "supino-reto": [
    "Escápulas para trás e para baixo, pés firmes no chão.",
    "Desça a barra até tocar o meio do peito, cotovelos a uns 45° do corpo.",
    "Empurre até esticar os braços sem tirar o quadril do banco.",
  ],
  "supino-declinado": [
    "Pernas presas no apoio do banco declinado.",
    "Desça a barra até a parte de baixo do peito.",
    "Empurre até esticar os braços.",
  ],
  "supino-declinado-halteres": [
    "Banco declinado com as pernas presas.",
    "Desça os halteres até a linha do peito.",
    "Empurre juntando os halteres acima do peito.",
  ],
  "supino-declinado-smith": [
    "Banco declinado embaixo da barra do Smith.",
    "Desça até a parte de baixo do peito.",
    "Empurre sem travar os cotovelos.",
  ],
  "supino-halteres": [
    "Escápulas para trás e halteres na linha do peito.",
    "Desça até alongar o peito, cotovelos a uns 45°.",
    "Empurre juntando os halteres acima do peito.",
  ],
  "supino-inclinado": [
    "Banco inclinado a 30–45°.",
    "Desça a barra até a parte de cima do peito.",
    "Empurre até esticar os braços, escápulas firmes.",
  ],
  "supino-inclinado-halteres": [
    "Banco a 30–45°, escápulas para trás.",
    "Desça os halteres até a linha da parte de cima do peito.",
    "Empurre juntando os halteres no topo.",
  ],
  "supino-inclinado-maquina": [
    "Ajuste o banco para os pegadores ficarem na altura da parte de cima do peito.",
    "Empurre sem travar os cotovelos.",
    "Volte devagar até alongar.",
  ],
  "supino-inclinado-smith": [
    "Banco inclinado embaixo da barra do Smith.",
    "Desça até a parte de cima do peito.",
    "Empurre até esticar os braços.",
  ],
  "supino-maquina": [
    "Pegadores na altura do meio do peito.",
    "Empurre até esticar os braços sem travar.",
    "Volte devagar até alongar o peito.",
  ],
  "supino-pegada-aberta": [
    "Pegada bem mais aberta que os ombros.",
    "Desça a barra até o peito com controle.",
    "Pare se sentir incômodo no ombro.",
  ],
  "supino-polia": [
    "Em pé, de costas para as polias na altura do peito.",
    "Empurre à frente juntando as mãos.",
    "Volte devagar mantendo a tensão.",
  ],
  "supino-reto-smith": [
    "Banco embaixo da barra, que desce no meio do peito.",
    "Desça até tocar o peito, cotovelos a uns 45°.",
    "Empurre até esticar os braços.",
  ],
  voador: [
    "Ajuste o banco para os pegadores ficarem na altura do peito.",
    "Junte as mãos à frente até os pegadores se tocarem.",
    "Volte devagar até alongar o peito.",
  ],

  // Pernas
  afundo: [
    "Passo longo, tronco reto e halteres ao lado do corpo.",
    "Desça até o joelho de trás quase tocar o chão.",
    "Suba empurrando o chão com o pé da frente.",
  ],
  "afundo-barra": [
    "Barra apoiada no trapézio, tronco reto.",
    "Desça até os dois joelhos formarem 90°.",
    "Suba empurrando com a perna da frente.",
  ],
  agachamento: [
    "Pés na largura dos ombros, pontas levemente para fora.",
    "Desça com o quadril para trás até as coxas ficarem paralelas ao chão ou abaixo.",
    "Joelhos na direção dos pés e coluna neutra.",
  ],
  "agachamento-bulgaro": [
    "Pé de trás apoiado no banco, pé da frente bem à frente.",
    "Desça até a coxa da frente ficar paralela ao chão.",
    "Suba empurrando com o pé da frente.",
  ],
  "agachamento-bulgaro-smith": [
    "Pé de trás no banco, barra do Smith no trapézio.",
    "Desça reto até a coxa da frente ficar paralela.",
    "Suba empurrando com a perna da frente.",
  ],
  "agachamento-frontal": [
    "Barra apoiada na frente dos ombros, cotovelos altos.",
    "Tronco ereto ao descer.",
    "Desça até as coxas ficarem paralelas ou abaixo.",
  ],
  "agachamento-goblet": [
    "Halter na vertical junto ao peito.",
    "Desça com o tronco reto, cotovelos entre os joelhos.",
    "Suba empurrando o chão com os pés inteiros.",
  ],
  "agachamento-smith": [
    "Pés um pouco à frente da barra.",
    "Desça até as coxas ficarem paralelas ao chão.",
    "Suba sem travar os joelhos no topo.",
  ],
  "agachamento-sumo": [
    "Base bem aberta, pontas dos pés para fora.",
    "Desça com o tronco reto e o halter entre as pernas.",
    "Suba apertando os glúteos no topo.",
  ],
  "bom-dia": [
    "Barra no trapézio, joelhos levemente dobrados.",
    "Incline o tronco à frente levando o quadril para trás, coluna neutra.",
    "Volte apertando os glúteos; use carga leve.",
  ],
  "cadeira-abdutora": [
    "Costas no encosto e pés nos apoios.",
    "Abra as pernas o máximo que conseguir.",
    "Volte devagar, sem deixar a carga bater.",
  ],
  "cadeira-adutora": [
    "Costas no encosto, pernas abertas nos apoios.",
    "Feche as pernas até os apoios se tocarem.",
    "Volte devagar até alongar.",
  ],
  "cadeira-extensora": [
    "Joelho alinhado ao eixo da máquina e rolo acima do tornozelo.",
    "Estique as pernas e segure 1 s no topo.",
    "Desça devagar.",
  ],
  "cadeira-flexora": [
    "Calcanhares apoiados em cima do rolo e coxas presas pelo apoio.",
    "Dobre os joelhos o máximo que conseguir.",
    "Volte devagar até quase esticar.",
  ],
  "elevacao-pelvica": [
    "Costas apoiadas no banco na altura das escápulas.",
    "Suba o quadril até alinhar com os joelhos, apertando os glúteos.",
    "Queixo para baixo e costelas fechadas; segure 1 s no topo.",
  ],
  "elevacao-pelvica-smith": [
    "Barra do Smith sobre o quadril (use uma proteção).",
    "Suba até alinhar o quadril com os joelhos.",
    "Aperte os glúteos no topo e desça devagar.",
  ],
  "flexora-em-pe": [
    "Uma perna de cada vez, apoio atrás do tornozelo.",
    "Dobre o joelho levando o calcanhar ao glúteo.",
    "Volte devagar, sem mexer o quadril.",
  ],
  "gluteo-maquina": [
    "Tronco apoiado e quadril parado.",
    "Empurre a perna para trás e para cima apertando o glúteo.",
    "Volte devagar sem arquear a lombar.",
  ],
  "gluteo-polia": [
    "Tornozeleira na polia baixa, mãos firmes no aparelho.",
    "Leve a perna para trás e para cima apertando o glúteo.",
    "Sem arquear a lombar; volte devagar.",
  ],
  hack: [
    "Costas inteiras no encosto e ombros embaixo das ombreiras.",
    "Desça até as coxas ficarem paralelas à plataforma ou abaixo.",
    "Suba sem travar os joelhos.",
  ],
  "leg-press": [
    "Pés na largura do quadril, no meio da plataforma.",
    "Desça até os joelhos formarem uns 90° sem tirar a lombar do encosto.",
    "Empurre sem travar os joelhos no topo.",
  ],
  "levantamento-terra-sumo": [
    "Base bem aberta, pontas dos pés para fora e mãos por dentro das pernas.",
    "Costas retas e barra colada ao corpo.",
    "Suba empurrando o chão com os pés e aperte os glúteos no topo.",
  ],
  "mesa-flexora": [
    "Deitado, joelhos logo após a borda do banco e rolo acima do tornozelo.",
    "Leve os calcanhares em direção aos glúteos.",
    "Desça devagar, sem tirar o quadril do banco.",
  ],
  panturrilha: [
    "Ponta dos pés na borda do degrau.",
    "Desça o calcanhar o máximo que conseguir.",
    "Suba na ponta dos pés e segure 1 s no topo.",
  ],
  "panturrilha-leg-press": [
    "Só a ponta dos pés na parte de baixo da plataforma.",
    "Joelhos esticados (sem travar) o tempo todo.",
    "Empurre com a ponta dos pés e volte até alongar a panturrilha.",
  ],
  "panturrilha-sentado": [
    "Joelhos embaixo do apoio, ponta dos pés na plataforma.",
    "Desça o calcanhar até alongar.",
    "Suba na ponta dos pés o máximo que conseguir.",
  ],
  passada: [
    "Passos longos com o tronco reto.",
    "Desça até o joelho de trás quase tocar o chão.",
    "Empurre com a perna da frente para o próximo passo.",
  ],
  stiff: [
    "Joelhos levemente dobrados e parados.",
    "Desça a barra rente às pernas levando o quadril para trás, costas retas.",
    "Suba apertando os glúteos.",
  ],
  "stiff-halteres": [
    "Joelhos levemente dobrados e halteres à frente das coxas.",
    "Desça levando o quadril para trás, costas retas.",
    "Suba apertando os glúteos.",
  ],
  "subida-banco": [
    "Pé inteiro em cima do banco.",
    "Suba empurrando com a perna de cima, sem impulso da de baixo.",
    "Desça devagar.",
  ],

  // Tríceps
  "flexao-diamante": [
    "Mãos juntas formando um losango embaixo do peito.",
    "Cotovelos perto do corpo ao descer.",
    "Empurre até esticar os braços.",
  ],
  "supino-fechado": [
    "Pegada na largura dos ombros.",
    "Cotovelos perto do corpo ao descer a barra.",
    "Empurre até esticar os braços.",
  ],
  "triceps-banco": [
    "Mãos na borda do banco, logo atrás do quadril.",
    "Desça até os cotovelos formarem 90°.",
    "Suba até esticar os braços.",
  ],
  "triceps-coice": [
    "Tronco inclinado e braço colado ao corpo, paralelo ao chão.",
    "Estique o cotovelo levando o halter para trás.",
    "Só o antebraço se move.",
  ],
  "triceps-coice-polia": [
    "Tronco inclinado, braço colado ao corpo.",
    "Estique o cotovelo para trás.",
    "Volte devagar sem mexer o braço.",
  ],
  "triceps-corda": [
    "Cotovelos colados ao corpo.",
    "Empurre a corda para baixo e abra as mãos no fim.",
    "Volte até os antebraços passarem da horizontal.",
  ],
  "triceps-cruzado-polia": [
    "Um braço de cada vez, puxando o cabo da polia do lado oposto.",
    "Estique o cotovelo cruzando à frente do corpo.",
    "Volte devagar.",
  ],
  "triceps-frances": [
    "Halter atrás da cabeça, segurado com as duas mãos.",
    "Cotovelos apontando para cima e parados.",
    "Estique os braços sem abrir os cotovelos.",
  ],
  "triceps-frances-barra-w": [
    "Barra W atrás da cabeça, cotovelos para cima.",
    "Estique os braços sem abrir os cotovelos.",
    "Desça devagar até alongar.",
  ],
  "triceps-frances-polia-unilateral": [
    "De costas para a polia, um braço de cada vez.",
    "Cotovelo apontado para cima e parado.",
    "Estique o braço e volte devagar.",
  ],
  "triceps-frances-unilateral": [
    "Um braço de cada vez, cotovelo apontado para cima.",
    "Desça o halter atrás da cabeça.",
    "Estique sem mexer o cotovelo.",
  ],
  "triceps-maquina": [
    "Cotovelos alinhados ao eixo da máquina.",
    "Estique os braços completamente.",
    "Volte devagar.",
  ],
  "triceps-polia-acima-cabeca": [
    "De costas para a polia, corda atrás da cabeça.",
    "Cotovelos ao lado da cabeça e parados.",
    "Estique os braços à frente e acima.",
  ],
  "triceps-pulley": [
    "Cotovelos colados ao corpo e parados.",
    "Empurre a barra até esticar os braços.",
    "Volte até os antebraços passarem da horizontal.",
  ],
  "triceps-pulley-barra-v": [
    "Barra V, cotovelos colados ao corpo.",
    "Empurre até esticar os braços.",
    "Volte devagar sem levantar os cotovelos.",
  ],
  "triceps-pulley-inverso": [
    "Pegada supinada (palmas para cima).",
    "Cotovelos colados ao corpo.",
    "Use carga menor e estique até o fim.",
  ],
  "triceps-testa": [
    "Deitado, barra acima do peito.",
    "Desça a barra em direção à testa dobrando só os cotovelos.",
    "Cotovelos apontando para cima, sem abrir.",
  ],
  "triceps-testa-halteres": [
    "Deitado, halteres acima do peito com as palmas viradas uma para a outra.",
    "Desça os halteres ao lado da cabeça.",
    "Estique sem abrir os cotovelos.",
  ],
  "triceps-testa-polia": [
    "Deitado de frente para a polia, barra acima do rosto.",
    "Dobre só os cotovelos.",
    "Estique completamente os braços.",
  ],
  "triceps-unilateral-polia": [
    "Um braço de cada vez, cotovelo colado ao corpo.",
    "Estique completamente o braço.",
    "Volte devagar.",
  ],
};

/** Dicas de execução do exercício, ou null se não houver (ex.: exercícios personalizados) */
export function getExerciseTips(exerciseId: string): string[] | null {
  return EXERCISE_TIPS[exerciseId] ?? null;
}
