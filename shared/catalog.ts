/**
 * Catálogo de demostración y contratos compartidos entre cliente y servidor.
 * Los IDs son claves persistentes: no renombrarlos con datos existentes sin
 * una migración. El orden de lessons define el prerrequisito de cada misión.
 * Este contenido necesita validación docente antes de usarse académicamente.
 */
/** answer es el índice base cero de la opción correcta; no es una nota de Canvas. */
export type Lesson = {
  id: string;
  title: string;
  minutes: number;
  points: number;
  bullets: string[];
  example: string;
  analogy: string;
  question: string;
  options: string[];
  answer: number;
};
/** El orden de lessons controla la progresión secuencial de la materia. */
export type Course = {
  id: string;
  title: string;
  short: string;
  color: string;
  icon: string;
  teacher: string;
  lessons: Lesson[];
};
const business = [
  [
    'Bienvenida al curso',
    'Un proceso convierte entradas en resultados de valor.',
    'Elige un proceso que realizas cada semana en tu trabajo.',
  ],
  [
    'Fundamentos de procesos',
    'Todo proceso tiene un cliente, un responsable y un resultado.',
    'Documenta cómo tu equipo recibe y atiende una solicitud.',
  ],
  [
    'Identifica a tus clientes',
    'El cliente puede estar dentro o fuera de la organización.',
    'Pregunta al equipo de ventas qué necesita del área de operaciones.',
  ],
  [
    'Mapa de procesos',
    'Separa procesos estratégicos, operativos y de apoyo.',
    'Clasifica compras como apoyo y atención al cliente como operación.',
  ],
  [
    'SIPOC',
    'SIPOC conecta proveedores, entradas, proceso, salidas y clientes.',
    'Traza el recorrido de un pedido desde el proveedor hasta el comprador.',
  ],
  [
    'Diagramas de flujo',
    'Usa símbolos consistentes y una dirección de lectura clara.',
    'Representa la aprobación de una factura antes de programar el pago.',
  ],
  [
    'Modelado BPMN',
    'BPMN permite describir procesos con un lenguaje visual compartido.',
    'Modela una solicitud de vacaciones: envío, aprobación y notificación.',
  ],
  [
    'Eventos y actividades',
    'Un evento sucede; una actividad representa trabajo.',
    'La llegada de un correo es un evento; revisar la solicitud es una actividad.',
  ],
  [
    'Compuertas y decisiones',
    'Una compuerta determina qué camino sigue el proceso.',
    'Si la compra supera el presupuesto, solicita una segunda aprobación.',
  ],
  [
    'Roles y responsabilidades',
    'Los carriles hacen visible quién realiza cada actividad.',
    'Separa las tareas de compras, finanzas y dirección en carriles.',
  ],
  [
    'Métricas y KPIs',
    'Un indicador útil tiene una fórmula, una frecuencia y un responsable.',
    'Mide el tiempo entre recibir una solicitud y resolverla.',
  ],
  [
    'Análisis de cuellos de botella',
    'El paso con menor capacidad limita el flujo completo.',
    'Identifica si las aprobaciones se acumulan con una sola persona.',
  ],
  [
    'Automatización',
    'Simplifica el proceso antes de automatizarlo.',
    'Elimina una aprobación duplicada antes de crear una regla automática.',
  ],
  [
    'Mejora continua',
    'Prueba un cambio pequeño, mide y ajusta.',
    'Compara los tiempos de respuesta antes y después de una mejora.',
  ],
  [
    'Proyecto final',
    'Relaciona el problema, el proceso y una mejora medible.',
    'Presenta un mapa actual y una propuesta de mejora para tu equipo.',
  ],
];
const tech = [
  'Define tu proyecto',
  'Problema y oportunidad',
  'Usuarios y necesidades',
  'Alcance del proyecto',
  'Objetivos SMART',
  'Mapa de interesados',
  'Plan de comunicación',
  'Gestión de riesgos',
  'Recursos y presupuesto',
  'Cronograma',
  'Colaboración digital',
  'Prototipo',
  'Validación',
  'Presentación ejecutiva',
  'Entrega de proyecto',
];
const os = [
  'Conoce el sistema',
  'Procesos y programas',
  'Uso de CPU',
  'Memoria principal',
  'Memoria virtual',
  'Planificación',
  'Concurrencia',
  'Sincronización',
  'Sistema de archivos',
  'Permisos',
  'Seguridad',
  'Redes',
  'Diagnóstico',
  'Optimización',
  'Caso integrador',
];
const stats = [
  'Decisiones con datos',
  'Población y muestra',
  'Tipos de variables',
  'Limpieza de datos',
  'Medidas de centro',
  'Dispersión',
  'Probabilidad',
  'Distribuciones',
  'Intervalos de confianza',
  'Pruebas de hipótesis',
  'Correlación',
  'Regresión',
  'Series de tiempo',
  'Pronósticos',
  'Caso de negocio',
];
/** Construye contenido de práctica; reemplazar por material aprobado sin cambiar IDs. */
function lessons(id: string, titles: string[], concept: string, example: string): Lesson[] {
  return titles.map((title, i) => ({
    id: `${id}-${i + 1}`,
    title,
    minutes: 10 + (i % 6),
    points: i === 14 ? 200 : 80,
    bullets: [
      id === 'procesos' ? business[i][1] : `${title}: ${concept}`,
      id === 'procesos'
        ? 'Define el inicio, el resultado esperado y la persona responsable.'
        : 'Identifica la información necesaria antes de tomar una decisión.',
      'Aplica el concepto a un caso pequeño y verifica el resultado con tu equipo.',
    ],
    example:
      id === 'procesos'
        ? business[i][2]
        : `${example} En esta misión enfócate en ${title.toLowerCase()}.`,
    analogy:
      id === 'procesos'
        ? `Piensa en ${title.toLowerCase()} como preparar un pedido en una cafetería: alguien lo solicita, otra persona lo prepara y alguien comprueba que esté listo. El mapa hace visibles esos pasos y evita confusiones.`
        : `Piensa en ${title.toLowerCase()} como organizar una cocina: necesitas saber qué tienes, qué quieres preparar y cómo comprobar que el resultado funciona. ${concept}`,
    question: `Al aplicar «${title}» en tu trabajo, ¿cuál es el mejor primer paso?`,
    options: [
      'Elegir una herramienta sin revisar el problema',
      'Definir el objetivo y reunir información del caso',
      'Cambiar todo el proceso inmediatamente',
    ],
    answer: 1,
  }));
}
export const courses: Course[] = [
  {
    id: 'proyectos',
    title: 'Proyectos de Tecnologías de la Comunicación',
    short: 'Proyectos de tecnología',
    color: 'yellow',
    icon: 'folder',
    teacher: 'Equipo académico MAPS',
    lessons: lessons(
      'proyectos',
      tech,
      'conecta la solución tecnológica con una necesidad verificable.',
      'Tu empresa necesita reducir correos y centralizar solicitudes.',
    ),
  },
  {
    id: 'sistemas',
    title: 'Sistemas operativos',
    short: 'Sistemas operativos',
    color: 'cyan',
    icon: 'monitor',
    teacher: 'Equipo académico MAPS',
    lessons: lessons(
      'sistemas',
      os,
      'comprende cómo el sistema administra recursos de forma segura.',
      'Analiza una computadora de trabajo que se vuelve lenta al abrir varias aplicaciones.',
    ),
  },
  {
    id: 'estadistica',
    title: 'Estadística y pronósticos para la toma de decisiones',
    short: 'Estadística y pronósticos',
    color: 'purple',
    icon: 'chart',
    teacher: 'Equipo académico MAPS',
    lessons: lessons(
      'estadistica',
      stats,
      'usa datos representativos y reconoce la incertidumbre.',
      'Analiza la demanda semanal de tu negocio para planear inventario.',
    ),
  },
  {
    id: 'procesos',
    title: 'Modelación de procesos de negocios',
    short: 'Modelación de procesos',
    color: 'green',
    icon: 'workflow',
    teacher: 'Equipo académico MAPS',
    lessons: lessons(
      'procesos',
      business.map((x) => x[0]),
      '',
      '',
    ),
  },
];
// cost descuenta xp; level se compara con la experiencia histórica acumulada.
export const rewards = [
  {
    id: 'ticket',
    title: 'Boleto Dorado (Sorteo)',
    description: 'Acumula boletos para el gran sorteo de reinscripción. Gana becas del 50% o certificaciones profesionales.',
    cost: 500,
    icon: 'award',
    category: 'Tu carrera',
    level: 1,
  },
  {
    id: 'freeze',
    title: 'Congelador de racha',
    description:
      'Protege una semana con mucha carga laboral. Tu constancia también merece una pausa.',
    cost: 250,
    icon: 'snow',
    category: 'Tu ritmo',
    level: 1,
  },
  {
    id: 'extension',
    title: '48 horas extra',
    description: 'Un pase de prórroga para tu próxima entrega. Sujeto a la política de tu materia.',
    cost: 400,
    icon: 'clock',
    category: 'Flexibilidad',
    level: 1,
  },
  {
    id: 'badge',
    title: 'Insignia de aprendizaje',
    description: 'Solicita la validación de tus habilidades para tu portafolio profesional.',
    cost: 600,
    icon: 'award',
    category: 'Tu carrera',
    level: 2,
  },
  {
    id: 'masterclass',
    title: 'Masterclass privada',
    description: 'Reserva una solicitud de acceso a una sesión con especialistas de tu área.',
    cost: 800,
    icon: 'video',
    category: 'Networking',
    level: 3,
  },
  {
    id: 'mentoring',
    title: 'Mentoría 1 a 1',
    description: 'Solicita una conversación sobre tu siguiente paso profesional.',
    cost: 1200,
    icon: 'users',
    category: 'Networking',
    level: 4,
  },
  {
    id: 'jobs',
    title: 'Oportunidades profesionales',
    description: 'Solicita acceso preferencial a oportunidades de la comunidad.',
    cost: 1500,
    icon: 'briefcase',
    category: 'Tu carrera',
    level: 5,
  },
];
// Personas ficticias del gremio de prueba; no son miembros sincronizados desde Canvas.
export const people = [
  {
    id: 'ana',
    name: 'Ana Martínez',
    initials: 'AM',
    role: 'Analista de datos',
    industry: 'Tecnología',
    goal: 'Busco compartir análisis de datos y aprender de procesos',
    skills: ['Power BI', 'Estadística'],
    contributions: 18,
  },
  {
    id: 'carlos',
    name: 'Carlos Mendoza',
    initials: 'CM',
    role: 'Líder de operaciones',
    industry: 'Manufactura',
    goal: 'Busco mentoría en finanzas y mejorar procesos',
    skills: ['BPMN', 'Liderazgo'],
    contributions: 24,
  },
  {
    id: 'lucia',
    name: 'Lucía Ramírez',
    initials: 'LR',
    role: 'Especialista financiera',
    industry: 'Servicios',
    goal: 'Busco colaborar con proyectos de tecnología',
    skills: ['Finanzas', 'Planeación'],
    contributions: 12,
  },
];
export const initialThreads = [
  {
    id: 't1',
    author: 'ana',
    channel: 'Datos y decisiones',
    title: '¿Cómo pronostican la demanda cuando hay pocos datos?',
    body: 'En mi equipo tenemos seis meses de historial. ¿Qué validarían antes de elegir un modelo?',
    answers: [
      {
        id: 'a1',
        author: 'carlos',
        body: 'Primero revisaría si hay promociones o cambios de operación. Compararía un promedio móvil con un pronóstico sencillo y mediría el error en las últimas semanas.',
      },
    ],
  },
  {
    id: 't2',
    author: 'carlos',
    channel: 'Procesos de negocio',
    title: 'Tres aprobaciones para una compra pequeña',
    body: 'Queremos reducir tiempos sin perder control. ¿Qué criterios usarían para eliminar pasos?',
    answers: [
      {
        id: 'a2',
        author: 'lucia',
        body: 'Separaría las compras por monto y riesgo. Probaría un límite de autorización con auditoría posterior para los casos de bajo riesgo.',
      },
    ],
  },
];
/**
 * Documento persistido por estudiante. xp es saldo gastable; earned nunca disminuye.
 * activity usa semanas como claves; creditedWeeks evita rachas duplicadas.
 * No borrar propiedades o cambiar IDs sin planear migración de SQLite.
 */
export type Progress = {
  completed: string[];
  started: string[];
  xp: number;
  earned: number;
  freezes: number;
  protectedWeeks: string[];
  streak: number;
  creditedWeeks?: string[];
  lastWeek?: string;
  goal: 'days' | 'minutes';
  activity: Record<string, { days: string[]; minutes: number }>;
  profile: {
    name: string;
    role: string;
    industry: string;
    goal: string;
    skills: string;
    portfolio: string;
  };
  redemptions: { id: string; rewardId: string; date: string; status: string }[];
  connections: string[];
  nps: number | null;
  raffleTickets: number;
  rescueActive: boolean;
};
export type Thread = {
  id: string;
  author: string;
  authorName?: string;
  channel: string;
  title: string;
  body: string;
  answers: {
    id: string;
    author: string;
    authorName?: string;
    body: string;
    helpful: number;
    voted: boolean;
  }[];
};
/** Respuesta autenticada de /api/state; csrf debe acompañar cada escritura. */
export type Snapshot = {
  mode: 'demo' | 'lti';
  userId: string;
  progress: Progress;
  week: string;
  threads: Thread[];
  csrf: string;
  aiEnabled: boolean;
};
