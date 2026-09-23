/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 *
 * All user-facing copy (es-DO), taken verbatim from the web-home frames in design/pencil.pen.
 */
export const strings = {
  brand: "PROYECTA",
  nav: {
    pantallas: "Pantallas",
    anunciantes: "Anunciantes",
    agencias: "Agencias",
    redesPrivadas: "Redes privadas",
    comoFunciona: "Cómo funciona",
    login: "Iniciar sesión",
    cta: "Publica tu pantalla",
    openMenu: "Abrir menú",
    closeMenu: "Cerrar menú"
  },
  hero: {
    eyebrow: "EN VIVO · SANTO DOMINGO",
    title: "Tu anuncio, en las pantallas de todo el país.",
    sub: "Proyecta conecta a los dueños de pantallas con las marcas que quieren estar ahí. Sin USBs, sin WhatsApp, sin hojas de cálculo.",
    ctaScreens: "Tengo pantallas",
    ctaAdvertise: "Quiero anunciar",
    nowPlaying: {
      live: "REPRODUCIENDO",
      time: "8:42 PM",
      ad: "Tu anuncio aquí",
      place: "Valla LED · Av. 27 de Febrero",
      slot: "Espacio 03 de 12",
      duration: "0:06 / 0:10"
    }
  },
  problem: {
    eyebrow: "EL PROBLEMA",
    title: "Poner un anuncio en una pantalla no debería tomar un mes.",
    aside:
      "Hoy, cada anuncio pasa por llamadas, archivos sueltos y alguien que va hasta la pantalla. Proyecta convierte ese proceso en un flujo digital.",
    todayTitle: "ASÍ SE HACE HOY",
    today: [
      { icon: "call", text: "Negocias el precio por teléfono." },
      { icon: "chat", text: "Envías el video por WhatsApp." },
      { icon: "usb", text: "Alguien lo carga con un USB." },
      { icon: "help", text: "Nadie sabe cuántas veces salió." }
    ],
    withTitle: "ASÍ CON PROYECTA",
    with: [
      { icon: "map", text: "Eliges la pantalla en un mapa." },
      { icon: "upload", text: "Subes tu anuncio una sola vez." },
      { icon: "cast", text: "Llega solo a la pantalla." },
      { icon: "factCheck", text: "Ves cuándo y dónde se reprodujo.", tag: "PRÓXIMAMENTE" }
    ]
  },
  dualPath: {
    eyebrow: "CÓMO FUNCIONA",
    title: "Una plataforma, dos lados de la pantalla.",
    valleros: {
      eyebrow: "PARA VALLEROS",
      title: "Tus pantallas venden solas.",
      steps: [
        { title: "Publica tu pantalla", body: "Ubicación, tipo de lugar y horario de encendido." },
        {
          title: "Vincula el player",
          body: "Escribe el código que aparece en la pantalla y listo."
        },
        {
          title: "Aprueba y genera ingresos",
          body: "Decides qué campañas se reproducen en tu espacio."
        }
      ],
      cta: "Publica tu pantalla"
    },
    anunciantes: {
      eyebrow: "PARA ANUNCIANTES",
      title: "Elige pantallas, sube tu anuncio, míralo al aire.",
      steps: [
        {
          title: "Busca pantallas por zona",
          body: "Filtra por ciudad, tipo de lugar y resolución."
        },
        { title: "Elige las fechas", body: "Define cuándo empieza y termina tu campaña." },
        {
          title: "Sube tu video o imagen",
          body: "Lo adaptamos para que se vea bien en cada pantalla."
        }
      ],
      cta: "Anuncia en pantallas"
    }
  },
  loop: {
    eyebrow: "CÓMO SE CUENTA",
    titleLines: ["10 segundos.", "12 espacios.", "Todo el día."],
    body: "Cada pantalla repite un ciclo de 120 segundos dividido en espacios de 10 segundos. Proyecta calcula cuántas veces sale tu anuncio; nadie tiene que contarlo a mano.",
    rows: [
      { label: "Horario", main: "6:00 a.m. – 12:00 a.m.", sub: "18 horas" },
      { label: "Ciclo", main: "120 segundos", sub: "12 espacios de 10 s" },
      { label: "Ciclos por día", main: "540", sub: "64,800 s ÷ 120 s" }
    ],
    resultLabel: "Un espacio para tu anuncio",
    resultTag: "EJEMPLO",
    resultNum: "540",
    resultUnit: "reproducciones al día",
    note: "Las reproducciones reales dependen del horario y la disponibilidad de cada pantalla.",
    ringNum: "120 s",
    ringLabel: "UN CICLO",
    legend: {
      yours: "Tu anuncio",
      others: "Otros anunciantes",
      owner: "Contenido del vallero"
    },
    ringAria:
      "Ciclo de 120 segundos con 12 espacios: uno para tu anuncio, nueve para otros anunciantes y dos para el contenido del vallero."
  },
  product: {
    eyebrow: "EL PANEL",
    title: "Todo lo que pasa en tus pantallas, en un solo lugar.",
    url: "app.proyecta.do/buscar",
    shotAlt: "Búsqueda de pantallas en el panel de Proyecta",
    features: [
      { title: "Buscar pantallas", body: "Encuentra espacio por zona, tipo de lugar y precio." },
      { title: "Calendario", body: "Qué se reproduce, dónde y cuándo." },
      { title: "Mis pantallas", body: "Disponibilidad y estado de cada pantalla." }
    ]
  },
  compatibility: {
    eyebrow: "EL PLAYER",
    title: "Funciona en la pantalla que ya tienes.",
    caption: "Vincular una pantalla toma un código de 8 caracteres.",
    shotAlt: "Pantalla de vinculación del player de Proyecta",
    devices: [
      { icon: "android", label: "Android TV y Android box" },
      { icon: "desktopWindows", label: "Windows" },
      { icon: "memory", label: "Raspberry Pi" },
      { icon: "tv", label: "Samsung Tizen" },
      { icon: "laptopChromebook", label: "ChromeOS" }
    ],
    offlineTitle: "Sin internet, sigue reproduciendo.",
    offlineBody:
      "Los anuncios se guardan en el equipo. La red solo se usa para sincronizar cambios.",
    formatsLabel: "FORMATOS",
    formats: ["MP4", "WebM", "JPG", "PNG", "WebP"]
  },
  alsoFor: {
    eyebrow: "TAMBIÉN PARA",
    title: "Si manejas muchas marcas o muchas sucursales.",
    agencias: {
      eyebrow: "AGENCIAS",
      title: "Toda la red de pantallas del país en un solo panel.",
      body: "Gestiona varias marcas y campañas sin coordinar operador por operador.",
      points: ["Varias marcas en una cuenta", "Calendario consolidado", "Un solo proveedor"],
      link: "Habla con ventas"
    },
    redes: {
      eyebrow: "REDES PRIVADAS",
      title: "Tus pantallas, tu contenido.",
      body: "Bancos, cadenas y universidades controlan todas sus sucursales desde un lugar, y pueden vender el espacio libre.",
      points: [
        "Control por sucursal",
        "Contenido propio siempre al día",
        "Venta de espacio libre, opcional"
      ],
      link: "Solicita una demo"
    }
  },
  network: {
    eyebrow: "LA RED",
    title: "De Puerto Plata a Punta Cana.",
    body: "Vallas en avenidas, pantallas en plazas, clínicas, restaurantes y gimnasios. Si tiene una pantalla, puede ser parte de la red.",
    types: ["Vallas LED", "Plazas comerciales", "Clínicas", "Restaurantes", "Gimnasios"],
    mapNote: "MAPA ILUSTRATIVO",
    dragHint: "Arrastra para explorar",
    mapAria:
      "Mapa ilustrativo de la red en República Dominicana. Arrastra o usa las flechas para moverlo."
  },
  faq: {
    eyebrow: "PREGUNTAS FRECUENTES",
    title: "Lo que todos preguntan.",
    body: "¿Tienes otra duda? Escríbenos y te respondemos.",
    items: [
      {
        q: "¿Qué necesito para publicar mi pantalla?",
        a: "Una pantalla con un equipo compatible (Android, Windows, Raspberry Pi o Samsung Tizen) y conexión a internet para sincronizar."
      },
      {
        q: "¿Quién decide qué anuncios salen en mi pantalla?",
        a: "Tú. Decides qué campañas se reproducen en tu espacio."
      },
      {
        q: "¿Qué pasa si se cae el internet?",
        a: "Sigue reproduciendo. Los anuncios se guardan en el equipo. La red solo se usa para sincronizar cambios."
      },
      {
        q: "¿Qué formatos acepta?",
        a: "MP4, WebM, JPG, PNG y WebP. Lo adaptamos para que se vea bien en cada pantalla."
      },
      {
        q: "¿Cuánto cuesta?",
        a: "Escríbenos y te contamos."
      }
    ]
  },
  finalCta: {
    eyebrow: "EMPIEZA HOY",
    titleLines: ["Tu pantalla puede estar", "al aire esta semana."],
    ctaScreens: "Publica tu pantalla",
    ctaAdvertise: "Anuncia en pantallas"
  },
  download: {
    title: "Descarga Proyecta",
    metaDescription:
      "Instala Proyecta en tu TV box Android, PC con Linux o Windows. Arranca solo, sigue reproduciendo sin internet y se vincula con un código.",
    eyebrow: "DESCARGAS",
    eyebrowVersion: (version: string) => `DESCARGAS · VERSIÓN ${version}`,
    heading: "Descarga Proyecta.",
    sub: "Instala Proyecta en el equipo de tu pantalla. Arranca solo al encenderlo, sigue reproduciendo sin internet y se vincula con un código de 8 caracteres.",
    versionChip: (version: string, date: string) => `v${version} · ${date}`,
    shotAlt: "Pantalla de Proyecta mostrando el código para vincularla",
    platformsEyebrow: "ELIGE TU EQUIPO",
    platformsTitle: "Un instalador por plataforma.",
    popular: "MÁS USADO",
    platforms: {
      android: {
        name: "Android",
        body: "TV boxes, televisores Android y tabletas.",
        requirements: ["Android 5.0 o más reciente", "Ideal si tu equipo no tiene Play Store"],
        button: "Descargar APK"
      },
      linux: {
        name: "Linux",
        body: "PCs y Raspberry Pi en modo kiosco con Chromium.",
        requirements: [
          "Debian 12, Ubuntu 22.04 o Raspberry Pi OS",
          "Instala todo lo necesario en un paso"
        ],
        button: "Descargar .deb · x64",
        buttonArm: "ARM64 · Raspberry Pi"
      },
      windows: {
        name: "Windows",
        body: "PCs y reproductores de pantallas LED con Edge.",
        requirements: [
          "Windows 10 u 11 de 64 bits",
          "Se abre a pantalla completa al iniciar sesión"
        ],
        button: "Descargar instalador"
      }
    },
    fallbackFile: "Última versión en GitHub",
    nextEyebrow: "DESPUÉS DE INSTALAR",
    nextTitle: "¿Ya lo instalaste? Vincula tu pantalla.",
    nextBody:
      "Al abrir Proyecta, la pantalla muestra un código de 8 caracteres. Escríbelo en tu panel y empieza a reproducir en segundos.",
    openPanel: "Abrir mi panel",
    signUp: "Crear cuenta",
    helpTitle: "¿Tu equipo no aparece aquí?",
    helpBody: "Cuéntanos qué pantalla tienes y te ayudamos a ponerla en la red.",
    helpCta: "Escríbenos"
  },
  footer: {
    tagline: "Plataforma dominicana de publicidad en pantallas digitales.",
    platformHeading: "PLATAFORMA",
    proyectaHeading: "PROYECTA",
    contact: "Contacto",
    copyright: "© 2026 Proyecta · Santo Domingo, República Dominicana",
    domain: "proyecta.do"
  }
} as const;
