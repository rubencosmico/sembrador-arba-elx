/**
 * Catálogo base de protocolos pre-germinativos y utilidades científicas para Open Seed Lab.
 */

export const DORMANCY_TYPES = [
    {
        id: 'physical',
        label: 'Latencia Física (Cubierta impermeable)',
        shortLabel: 'Física'
    },
    {
        id: 'physiological',
        label: 'Latencia Fisiológica (Inhibidores / Embrión)',
        shortLabel: 'Fisiológica'
    },
    {
        id: 'morphophysiological',
        label: 'Latencia Combinada / Morfofisiológica',
        shortLabel: 'Combinada'
    },
    {
        id: 'none',
        label: 'Sin latencia estricta / Recalcitrante',
        shortLabel: 'Sin latencia / Recalcitrante'
    }
];

export const getDormancyInfo = (dormancyType) =>
    DORMANCY_TYPES.find((item) => item.id === dormancyType) || DORMANCY_TYPES[3];

export const SEED_PROTOCOLS_CATALOG = [
    {
        id: 'proto-ceratonia-siliqua',
        scientificName: 'Ceratonia siliqua',
        commonName: 'Algarrobo',
        family: 'Fabaceae',
        dormancyType: 'physical',
        scarification: 'Lijado suave del extremo opuesto al micrópilo o choque térmico breve (agua a 80 °C, retirar del fuego y dejar enfriar).',
        hydrationHours: 24,
        stratification: 'No requiere estratificación fría.',
        inoculation: 'Opcional: rizobios compatibles de algarrobo / tierra de algarrobal sano.',
        pelleting: 'Recomendado pildorizado con arcilla + ceniza si se siembra en terreno descubierto; en nodriza enterrar a 2-3 cm.',
        harvestSeason: 'Agosto – Octubre',
        sowingSeason: 'Octubre – Enero (tras primeras lluvias de otoño)',
        summaryRecipe: 'Escarificación mecánica/térmica + Hidratación 24h',
        workshopTips: 'Descartar siempre semillas que floten tras el remojo. Sembrar inmediatamente cuando muestren turgencia o inicio de radícula (sin dejar secar de nuevo).',
        status: 'verified',
        isBuiltIn: true,
        authorName: 'Laboratorio Botánico ARBA',
        keywords: ['algarrobo', 'garrofer', 'ceratonia', 'ceratonia siliqua']
    },
    {
        id: 'proto-quercus-coccifera',
        scientificName: 'Quercus coccifera',
        commonName: 'Coscoja',
        family: 'Fagaceae',
        dormancyType: 'none',
        scarification: 'No escarificar ni dañar el pericarpio; retirar la cúpula manualmente.',
        hydrationHours: 24,
        stratification: 'Semilla recalcitrante: no desecar. Conservar en sustrato ligeramente húmedo entre 2 y 5 °C hasta la siembra.',
        inoculation: 'Inóculo ligero de suelo forestal de coscojar maduro (ectomicorrizas) mezclado en el hoyo.',
        pelleting: 'Proteger con repelente mineral/piedra plana frente a roedores y jabalí; enterrar horizontal a 3-5 cm.',
        harvestSeason: 'Octubre – Noviembre',
        sowingSeason: 'Noviembre – Enero',
        summaryRecipe: 'Test de flotación + Hidratación 24h + Conservación húmeda fría',
        workshopTips: 'Realizar prueba de flotación 15 minutos antes de sembrar: las bellotas sanas van al fondo. Revisar orificios de gorgojo (Curculio) antes de embolsar.',
        status: 'verified',
        isBuiltIn: true,
        authorName: 'Laboratorio Botánico ARBA',
        keywords: ['coscoja', 'quercus coccifera', 'coscoll']
    },
    {
        id: 'proto-quercus-ilex',
        scientificName: 'Quercus ilex subsp. ballota',
        commonName: 'Encina / Carrasca',
        family: 'Fagaceae',
        dormancyType: 'none',
        scarification: 'Sin escarificación; seleccionar bellotas sanas sin perforaciones ni moho.',
        hydrationHours: 24,
        stratification: 'Pre-germinación controlada en caja con turba/arena húmeda a 4 °C durante 7-15 días para homogeneizar emergencia.',
        inoculation: 'Micorrización con tierra de encinar o esporas de trufa/boletales compatibles.',
        pelleting: 'Siembra profunda (4-5 cm) en posición tumbada, idealmente bajo nodriza arbustiva orientada al norte o levante.',
        harvestSeason: 'Octubre – Diciembre',
        sowingSeason: 'Noviembre – Febrero',
        summaryRecipe: 'Test de flotación + Hidratación 24h + Pre-germinación húmeda',
        workshopTips: 'Las bellotas que ya asoman 2-5 mm de radícula blanca tienen altísima tasa de establecimiento si no se rompe la punta al transportarlas en húmedo.',
        status: 'verified',
        isBuiltIn: true,
        authorName: 'Laboratorio Botánico ARBA',
        keywords: ['encina', 'carrasca', 'quercus ilex', 'bellota']
    },
    {
        id: 'proto-chamaerops-humilis',
        scientificName: 'Chamaerops humilis',
        commonName: 'Palmito',
        family: 'Arecaceae',
        dormancyType: 'morphophysiological',
        scarification: 'Despulpado completo obligatorio (retirar el mesocarpio carnoso y fibroso rico en inhibidores) lavando con agua tibia.',
        hydrationHours: 72,
        stratification: 'Germinación lenta (2-6 meses). Mantenimiento cálido-húmedo o siembra otoñal directa para aprovechar lluvias y calor primaveral.',
        inoculation: 'Micorrizas vesículo-arbusculares (hongos MA) del matorral termomediterráneo.',
        pelleting: 'Pildorizado o envoltura ligera en arcilla con humus seco; enterrar a 2-3 cm junto a rocas que acumulen humedad.',
        harvestSeason: 'Septiembre – Noviembre',
        sowingSeason: 'Octubre – Diciembre',
        summaryRecipe: 'Despulpado total + Remojo 72h con cambio de agua diario',
        workshopTips: 'Usar guantes gruesos al manipular los frutos para evitar dermatitis. Cambiar el agua de remojo cada 24 horas para evitar fermentación.',
        status: 'verified',
        isBuiltIn: true,
        authorName: 'Laboratorio Botánico ARBA',
        keywords: ['palmito', 'margalló', 'margallo', 'chamaerops', 'chamaerops humilis']
    },
    {
        id: 'proto-pistacia-lentiscus',
        scientificName: 'Pistacia lentiscus',
        commonName: 'Lentisco',
        family: 'Anacardiaceae',
        dormancyType: 'physiological',
        scarification: 'Seleccionar únicamente frutos negros (los rojos suelen estar vanos); despulpar suavemente presionando sobre tamiz bajo el grifo.',
        hydrationHours: 24,
        stratification: 'Test de flotación estricto tras limpiar la pulpa; estratificación fría breve (15-20 días a 4 °C) mejora uniformidad en zonas frías.',
        inoculation: 'Inóculo de hongos micorrícicos arbusculares de garriga caliza.',
        pelleting: 'Sembrar a 1-1.5 cm con acolchado de grava o hojarasca bajo planta nodriza (romero, esparto o albaida).',
        harvestSeason: 'Octubre – Diciembre',
        sowingSeason: 'Noviembre – Enero',
        summaryRecipe: 'Selección de frutos negros + Despulpado + Test de flotación + Remojo 24h',
        workshopTips: 'El 50-70 % de las bayas rojas son estériles (partenocárpicas); desechar todas las semillas negras que floten después de limpiar completamente la resina.',
        status: 'verified',
        isBuiltIn: true,
        authorName: 'Laboratorio Botánico ARBA',
        keywords: ['lentisco', 'llentiscle', 'pistacia', 'pistacia lentiscus']
    },
    {
        id: 'proto-pinus-halepensis',
        scientificName: 'Pinus halepensis',
        commonName: 'Pino carrasco',
        family: 'Pinaceae',
        dormancyType: 'none',
        scarification: 'No requiere escarificación. Desalar suavemente tras extraer de piñas maduras.',
        hydrationHours: 24,
        stratification: 'No precisa estratificación fría; basta hidratación en agua limpia a temperatura ambiente.',
        inoculation: 'Ectomicorrizas de pinar mediterráneo (ej. Suillus / Rhizopogon) adheridas en húmedo.',
        pelleting: 'Pildorizado con arcilla mineral y carbón activo/caolín para camuflar del picoteo de hormigas y aves granívoras; siembra muy superficial (0.5-1 cm).',
        harvestSeason: 'Septiembre – Noviembre (piñas cerradas serótinas o maduras)',
        sowingSeason: 'Octubre – Diciembre',
        summaryRecipe: 'Hidratación 24h + Inoculación micorrícica + Protección granívoros',
        workshopTips: 'Si se siembra sin cubrir con piedra o malla protectora, las hormigas recolectoras (Messor) pueden llevarse el lote en horas.',
        status: 'verified',
        isBuiltIn: true,
        authorName: 'Laboratorio Botánico ARBA',
        keywords: ['pino', 'pino carrasco', 'pinus', 'pinus halepensis', 'pi blanco']
    },
    {
        id: 'proto-rhamnus-lycioides',
        scientificName: 'Rhamnus lycioides',
        commonName: 'Espino negro',
        family: 'Rhamnaceae',
        dormancyType: 'physiological',
        scarification: 'Despulpado completo de la drupa y lavado minucioso para eliminar azúcares e inhibidores del pericarpio.',
        hydrationHours: 48,
        stratification: 'Estratificación húmeda en frío (3-5 °C) durante 30 días en arena lavada o perlita.',
        inoculation: 'Micorrizas arbusculares nativas de suelos calizos semiáridos.',
        pelleting: 'Siembra a 1 cm en grietas pedregosas o junto a retamas/espartos con buena insolación invernal.',
        harvestSeason: 'Julio – Septiembre',
        sowingSeason: 'Noviembre – Enero',
        summaryRecipe: 'Despulpado + Remojo 48h + Estratificación fría 30 días',
        workshopTips: 'Excelente especie estructurante y nodriza frente a herbivoría por sus espinas; conviene sembrar 4-5 semillas por golpe tras el tratamiento frío.',
        status: 'verified',
        isBuiltIn: true,
        authorName: 'Laboratorio Botánico ARBA',
        keywords: ['espino negro', 'artos', 'rhamnus', 'rhamnus lycioides']
    },
    {
        id: 'proto-tetraclinis-articulata',
        scientificName: 'Tetraclinis articulata',
        commonName: 'Araar / Ciprés de Cartagena',
        family: 'Cupressaceae',
        dormancyType: 'none',
        scarification: 'No escarificar; retirar restos de escamas y descartar semillas vanas por aventado o presión suave.',
        hydrationHours: 12,
        stratification: 'No requiere frío; muy sensible al encharcamiento prolongado y hongos (damping-off).',
        inoculation: 'Sustrato aireado mineral con micorrizas arbusculares de suelo calcáreo seco.',
        pelleting: 'Cubrir solo 0.5 cm con tierra suelta y grava caliza fina en laderas secas y soleadas libres de heladas severas.',
        harvestSeason: 'Septiembre – Octubre',
        sowingSeason: 'Octubre – Noviembre',
        summaryRecipe: 'Hidratación corta 12h + Siembra superficial en micrositio cálido',
        workshopTips: 'Usar semilla lo más fresca posible del año en curso (pierde viabilidad rápido a temperatura ambiente). Evitar micrositios umbríos y húmedos.',
        status: 'verified',
        isBuiltIn: true,
        authorName: 'Laboratorio Botánico ARBA',
        keywords: ['araar', 'cipres de cartagena', 'tetraclinis', 'tetraclinis articulata', 'sabina de cartagena']
    },
    {
        id: 'proto-olea-europaea-sylvestris',
        scientificName: 'Olea europaea var. sylvestris',
        commonName: 'Acebuche',
        family: 'Oleaceae',
        dormancyType: 'morphophysiological',
        scarification: 'Despulpado completo + lavado desengrasante (agua con bicarbonato o arcilla) + fisurado suave o lijado del ápice del hueso leñoso.',
        hydrationHours: 48,
        stratification: 'Siembra otoñal temprana para que atraviese alternancia natural cálido-frío en suelo, o estratificación mixta 45-60 días.',
        inoculation: 'Suelo vivo de acebuchal o micorrizas arbusculares.',
        pelleting: 'Enterrar 2-3 cm bajo matorral dispersor (imitando el paso por tubo digestivo de aves frugívoras).',
        harvestSeason: 'Octubre – Diciembre',
        sowingSeason: 'Noviembre – Enero',
        summaryRecipe: 'Despulpado + Lavado desengrasante + Fisurado/Lijado de endocarpo + Remojo 48h',
        workshopTips: 'Muchos acebuches germinan en el segundo invierno tras la siembra si no se debilita ligeramente la sutura del endocarpo. No aplastar el embrión interno.',
        status: 'verified',
        isBuiltIn: true,
        authorName: 'Laboratorio Botánico ARBA',
        keywords: ['acebuche', 'ullastre', 'olea', 'olea europaea', 'olivo silvestre']
    },
    {
        id: 'proto-ziziphus-lotus',
        scientificName: 'Ziziphus lotus',
        commonName: 'Azufaifo / Arto',
        family: 'Rhamnaceae',
        dormancyType: 'physical',
        scarification: 'Retirar la pulpa seca y realizar escarificación mecánica controlada del endocarpo leñoso (cascanueces calibrado o lima hasta ver fisura, sin dañar las semillas internas).',
        hydrationHours: 48,
        stratification: 'No precisa frío; requiere suelo cálido al final del invierno o primavera tras las lluvias.',
        inoculation: 'Micorrizas arbusculares adaptadas a suelos áridos y salinos.',
        pelleting: 'Siembra a 2 cm en hoyos amplios que capturen escorrentía en zonas térmicas y semiáridas.',
        harvestSeason: 'Septiembre – Noviembre',
        sowingSeason: 'Noviembre – Febrero',
        summaryRecipe: 'Escarificación mecánica de endocarpo + Hidratación 48h',
        workshopTips: 'Cada hueso contiene de 1 a 2 semillas. Si se extrae la semilla limpia del hueso con cuidado en taller, la germinación supera el 70 % tras 24-48h de hidratación.',
        status: 'verified',
        isBuiltIn: true,
        authorName: 'Laboratorio Botánico ARBA',
        keywords: ['azufaifo', 'arto', 'azofaifo', 'ziziphus', 'ziziphus lotus']
    }
];

const normalizeText = (value) =>
    String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

export const mergeProtocolsWithCommunity = (communityDocs = []) => {
    const mergedMap = new Map();

    SEED_PROTOCOLS_CATALOG.forEach((proto) => {
        mergedMap.set(proto.id, { ...proto });
    });

    (communityDocs || []).forEach((docItem) => {
        if (!docItem || !docItem.id) return;
        const existing = mergedMap.get(docItem.id);
        const generatedKeywords = [
            normalizeText(docItem.commonName),
            normalizeText(docItem.scientificName)
        ].filter(Boolean);

        mergedMap.set(docItem.id, {
            ...(existing || {}),
            ...docItem,
            isBuiltIn: existing ? existing.isBuiltIn : false,
            keywords: existing?.keywords || docItem.keywords || generatedKeywords
        });
    });

    return Array.from(mergedMap.values()).sort((a, b) => {
        const aVerified = a.status === 'verified' ? 0 : 1;
        const bVerified = b.status === 'verified' ? 0 : 1;
        if (aVerified !== bVerified) return aVerified - bVerified;
        return String(a.commonName || '').localeCompare(String(b.commonName || ''), 'es');
    });
};

const matchesProtocolSpecies = (rawSpecies, protocol) => {
    const normalized = normalizeText(rawSpecies);
    if (!normalized) return false;

    const candidates = [
        protocol.commonName,
        protocol.scientificName,
        ...(protocol.keywords || [])
    ]
        .map(normalizeText)
        .filter((term) => term.length >= 4);

    return candidates.some((term) => normalized === term || normalized.includes(term));
};

const REVIEWED_STATUSES = new Set(['alive', 'dormant', 'dead', 'predated', 'not_found']);

export const computeProtocolFieldStats = (protocols = [], seeds = [], logs = []) => {
    const statsById = {};
    const seedsById = new Map();

    (seeds || []).forEach((seed) => {
        if (seed?.id) seedsById.set(seed.id, seed);
    });

    protocols.forEach((protocol) => {
        const linkedSeedIds = new Set();

        (seeds || []).forEach((seed) => {
            if (!seed || seed.deleted) return;
            if (seed.protocolId) {
                if (seed.protocolId === protocol.id) {
                    linkedSeedIds.add(seed.id);
                }
                return;
            }
            if (matchesProtocolSpecies(seed.species, protocol)) {
                linkedSeedIds.add(seed.id);
            }
        });

        const matchedLogs = (logs || []).filter((log) => {
            if (!log) return false;
            if (log.seedId && linkedSeedIds.has(log.seedId)) return true;

            const logSeed = log.seedId ? seedsById.get(log.seedId) : null;
            if (logSeed?.protocolId && logSeed.protocolId !== protocol.id) {
                return false;
            }
            return matchesProtocolSpecies(log.seedName, protocol);
        });

        const reviewed = matchedLogs.filter((log) => REVIEWED_STATUSES.has(log.lastCheckupStatus));
        const alive = reviewed.filter((log) => log.lastCheckupStatus === 'alive');

        statsById[protocol.id] = {
            lotCount: linkedSeedIds.size,
            totalSownLogs: matchedLogs.length,
            reviewedLogs: reviewed.length,
            aliveLogs: alive.length,
            empiricalSuccessRate: reviewed.length > 0 ? Math.round((alive.length / reviewed.length) * 100) : null
        };
    });

    return statsById;
};
